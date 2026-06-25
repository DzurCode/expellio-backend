import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';

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
    it('should call authService.login and return token pair', async () => {
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      mockAuthService.login.mockResolvedValue(tokens);

      const dto = { email: 'test@example.com', password: 'password123' };
      const result = await controller.login(dto);

      expect(service.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toBe(tokens);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and return new token pair', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockAuthService.refresh.mockResolvedValue(tokens);

      const dto = { refreshToken: 'old-refresh' };
      const result = await controller.refresh(dto);

      expect(service.refresh).toHaveBeenCalledWith('old-refresh');
      expect(result).toBe(tokens);
    });
  });
});
