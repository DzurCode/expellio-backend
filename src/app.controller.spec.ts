import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const mockAppService = {
      getHello: jest.fn().mockReturnValue('Mocked Hello!'),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should correctly delegate to AppService.getHello and return its result', () => {
      const result = appController.getHello();
      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBe('Mocked Hello!');
    });

    it('should handle failure or edge case if service throws (mocked)', () => {
      jest.spyOn(appService, 'getHello').mockImplementationOnce(() => {
        throw new Error('Test Error');
      });
      expect(() => appController.getHello()).toThrow('Test Error');
    });
  });
});
