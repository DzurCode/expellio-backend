import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  } as unknown as ConfigService;

  const mockClsService = {
    set: jest.fn(),
    get: jest.fn(),
  } as unknown as ClsService;

  const mockReq = {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    get: jest.fn().mockReturnValue('test-agent'),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(mockConfigService, mockClsService);
  });

  describe('validate', () => {
    it('should set cls context and return user object if payload is valid', async () => {
      const payload = { sub: 'u1', email: 'test@example.com' };
      const result = await strategy.validate(mockReq, payload);
      
      expect(mockClsService.set).toHaveBeenCalledWith('user', { id: 'u1', email: 'test@example.com' });
      expect(mockClsService.set).toHaveBeenCalledWith('ipAddress', '127.0.0.1');
      expect(mockClsService.set).toHaveBeenCalledWith('userAgent', 'test-agent');
      
      expect(result).toEqual({ id: 'u1', email: 'test@example.com' });
    });

    it('should throw UnauthorizedException if sub is missing', async () => {
      const payload = { sub: '', email: 'test@example.com' };
      await expect(strategy.validate(mockReq, payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email is missing', async () => {
      const payload = { sub: 'u1', email: '' };
      await expect(strategy.validate(mockReq, payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
