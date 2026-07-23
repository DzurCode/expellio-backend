import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockUsersService = {
    findByEmailForAuth: jest.fn(),
    incrementFailedLoginAttempts: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'auth.maxFailedAttempts') return 5;
      if (key === 'auth.lockoutDurationMinutes') return 15;
      if (key === 'auth.accessSecret') return 'access-secret';
      if (key === 'auth.refreshSecret') return 'refresh-secret';
      if (key === 'auth.accessExpiration') return '15m';
      if (key === 'auth.refreshExpiration') return '7d';
      if (key === 'auth.dummyHash') return '$2b$10$3yF.6RkG5CqM7lX/E9e0mOz5g2R3v4w5x6y7z8a9b0c1d2e3f4g5h';
    }),
  };

  const mockPrismaService = {
    usedRefreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should throw UnauthorizedException on non-existent user and run dummy compare', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('notfound@test.com', 'password')).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', expect.stringContaining('$2b$'));
    });

    it('should throw HttpException 429 when user is locked', async () => {
      const lockedUntil = new Date(Date.now() + 100000);
      mockUsersService.findByEmailForAuth.mockResolvedValue({
        id: 'u1',
        email: 'locked@test.com',
        lockedUntil,
      });

      await expect(service.login('locked@test.com', 'password')).rejects.toThrow(HttpException);
      try {
        await service.login('locked@test.com', 'password');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('should throw UnauthorizedException on wrong password and increment failed attempts', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: 'hash',
        failedLoginAttempts: 2,
        lockedUntil: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockUsersService.incrementFailedLoginAttempts.mockResolvedValue(null);

      await expect(service.login('user@test.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.incrementFailedLoginAttempts).toHaveBeenCalledWith('u1', null);
    });

    it('should trigger lockout if failed attempts exceed max limit', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: 'hash',
        failedLoginAttempts: 4,
        lockedUntil: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockUsersService.incrementFailedLoginAttempts.mockResolvedValue(null);

      await expect(service.login('user@test.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.incrementFailedLoginAttempts).toHaveBeenCalledWith('u1', expect.any(Date));
    });

    it('should reset failed login attempts and return tokens on success', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: 'hash',
        failedLoginAttempts: 3,
        lockedUntil: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.resetFailedLoginAttempts.mockResolvedValue(null);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.login('user@test.com', 'correctpassword');

      expect(mockUsersService.resetFailedLoginAttempts).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });

    it('should throw InternalServerErrorException on unexpected database error', async () => {
      mockUsersService.findByEmailForAuth.mockRejectedValue(new Error('Unexpected DB error'));

      await expect(service.login('user@test.com', 'password')).rejects.toThrow(
        require('@nestjs/common').InternalServerErrorException,
      );
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refresh token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if payload is invalid', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: null });
      await expect(service.refresh('bad-payload-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token JTI is already marked as used', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        email: 'user@test.com',
        jti: 'jti-1',
        exp: Math.floor(Date.now() / 1000) + 100,
      });
      mockPrismaService.usedRefreshToken.findUnique.mockResolvedValue({ id: '1', jti: 'jti-1' });

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should mark JTI as used, fetch user, and issue new tokens on success', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        email: 'user@test.com',
        jti: 'jti-2',
        exp: Math.floor(Date.now() / 1000) + 100,
      });
      mockPrismaService.usedRefreshToken.findUnique.mockResolvedValue(null);
      mockPrismaService.usedRefreshToken.create.mockResolvedValue({});
      mockUsersService.findOne.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
      mockJwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refresh('token');

      expect(mockPrismaService.usedRefreshToken.create).toHaveBeenCalledWith({
        data: {
          jti: 'jti-2',
          expiresAt: expect.any(Date),
        },
      });
      expect(mockUsersService.findOne).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        accessToken: 'new-token',
        refreshToken: 'new-token',
      });
    });

    it('should throw UnauthorizedException if user is not found during refresh', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        email: 'user@test.com',
        jti: 'jti-3',
        exp: Math.floor(Date.now() / 1000) + 100,
      });
      mockPrismaService.usedRefreshToken.findUnique.mockResolvedValue(null);
      mockPrismaService.usedRefreshToken.create.mockResolvedValue({});
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on Prisma P2002 error', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        email: 'user@test.com',
        jti: 'jti-4',
        exp: Math.floor(Date.now() / 1000) + 100,
      });
      mockPrismaService.usedRefreshToken.findUnique.mockResolvedValue(null);
      const { Prisma } = require('@prisma/client');
      mockPrismaService.usedRefreshToken.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'x.x.x',
        }),
      );

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw InternalServerErrorException on unexpected database error', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        email: 'user@test.com',
        jti: 'jti-5',
        exp: Math.floor(Date.now() / 1000) + 100,
      });
      mockPrismaService.usedRefreshToken.findUnique.mockRejectedValue(new Error('Unexpected DB error'));

      await expect(service.refresh('token')).rejects.toThrow(
        require('@nestjs/common').InternalServerErrorException,
      );
    });
  });
});
