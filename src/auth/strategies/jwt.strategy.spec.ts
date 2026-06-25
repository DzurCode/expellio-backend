import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  };

  beforeEach(() => {
    configService = mockConfigService as any;
    strategy = new JwtStrategy(configService);
  });

  describe('validate', () => {
    it('should return user object if payload is valid', async () => {
      const payload = { sub: 'u1', email: 'test@example.com' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({ id: 'u1', email: 'test@example.com' });
    });

    it('should throw UnauthorizedException if sub is missing', async () => {
      const payload = { sub: '', email: 'test@example.com' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email is missing', async () => {
      const payload = { sub: 'u1', email: '' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
