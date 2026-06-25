import { Injectable, UnauthorizedException, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly maxFailedAttempts: number;
  private readonly lockoutDurationMs: number;
  private readonly dummyHash: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.maxFailedAttempts = this.configService.getOrThrow<number>('auth.maxFailedAttempts');
    this.lockoutDurationMs = this.configService.getOrThrow<number>('auth.lockoutDurationMinutes') * 60 * 1000;
    this.dummyHash = this.configService.getOrThrow<string>('auth.dummyHash');
  }

  async login(email: string, password: string) {
    try {
      const user = await this.usersService.findByEmailForAuth(email);

      if (user) {
        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new HttpException('Too many attempts', HttpStatus.TOO_MANY_REQUESTS);
        }

        // Compare password hash
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
          // Increment attempts and lock if threshold met
          let lockedUntil: Date | null = null;
          const failedAttempts = user.failedLoginAttempts + 1;
          
          if (failedAttempts >= this.maxFailedAttempts) {
            lockedUntil = new Date(Date.now() + this.lockoutDurationMs);
          }

          await this.usersService.incrementFailedLoginAttempts(user.id, lockedUntil);
          throw new UnauthorizedException('Invalid credentials');
        }

        // Login succeeded, reset attempt counter
        await this.usersService.resetFailedLoginAttempts(user.id);

        return await this.generateTokens(user.id, user.email);
      } else {
        // Prevent timing attacks by executing a dummy bcrypt comparison
        await bcrypt.compare(password, this.dummyHash);
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async refresh(refreshToken: string) {
    try {
      let payload: { sub: string; email: string; jti: string; exp: number };
      const secret = this.configService.getOrThrow<string>('auth.refreshSecret');

      try {
        payload = await this.jwtService.verifyAsync(refreshToken, { secret });
      } catch {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      if (!payload.sub || !payload.email || !payload.jti) {
        throw new UnauthorizedException('Invalid token payload');
      }

      /*
       * Trade-off: Stateful Refresh Token Rotation
       * We track used refresh tokens using a 'UsedRefreshToken' table in the database (stateful).
       * Pros: Prevents replay attacks (token reuse detection). If a refresh token is stolen and used,
       * the original user's attempt to use it will fail, and we block both. It also allows revoking
       * tokens early by marking their JTI as used, or by invalidating them.
       * Cons: Requires a database write on every refresh operation, which adds minor latency.
       * Alternative (Stateless): We could use stateless tokens, but we would lose the ability to detect
       * token reuse or revoke specific tokens before expiration.
       */
      const isUsed = await this.prisma.usedRefreshToken.findUnique({
        where: { jti: payload.jti },
      });

      if (isUsed) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Mark the incoming token as used
      const expiresAt = new Date(payload.exp * 1000);
      await this.prisma.usedRefreshToken.create({
        data: {
          jti: payload.jti,
          expiresAt,
        },
      });

      // Verify user still exists
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return await this.generateTokens(user.id, user.email);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new UnauthorizedException('Invalid or expired refresh token');
        }
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  private async generateTokens(userId: string, email: string) {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          { sub: userId, email },
          {
            secret: this.configService.getOrThrow<string>('auth.accessSecret'),
            expiresIn: this.configService.getOrThrow<string>('auth.accessExpiration') as unknown as number,
          },
        ),
        this.jwtService.signAsync(
          { sub: userId, email, jti: randomUUID() },
          {
            secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
            expiresIn: this.configService.getOrThrow<string>('auth.refreshExpiration') as unknown as number,
          },
        ),
      ]);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error generating tokens');
    }
  }
}
