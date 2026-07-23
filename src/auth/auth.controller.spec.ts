import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
  };

  const mockThrottlerGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(mockThrottlerGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call authService.login, set cookies and return success message', async () => {
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      mockAuthService.login.mockResolvedValue(tokens);

      const dto = { email: 'test@example.com', password: 'password123' };
      const result = await controller.login(dto, mockResponse);

      expect(service.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'access', expect.any(Object));
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'refresh', expect.any(Object));
      expect(result).toEqual({ message: 'Logged in successfully' });
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh, set new cookies and return success message', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockAuthService.refresh.mockResolvedValue(tokens);

      const mockRequest = {
        cookies: {
          refresh_token: 'old-refresh',
        },
      } as unknown as Request;

      const result = await controller.refresh(mockRequest, mockResponse);

      expect(service.refresh).toHaveBeenCalledWith('old-refresh');
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'new-access', expect.any(Object));
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh', expect.any(Object));
      expect(result).toEqual({ message: 'Token refreshed successfully' });
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      await expect(controller.refresh(mockRequest, mockResponse)).rejects.toThrow('Refresh token missing');
    });
  });

  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      const result = await controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
