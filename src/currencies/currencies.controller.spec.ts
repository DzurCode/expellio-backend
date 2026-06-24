import { Test, TestingModule } from '@nestjs/testing';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';

describe('CurrenciesController', () => {
  let controller: CurrenciesController;
  let service: CurrenciesService;

  const mockCurrenciesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrenciesController],
      providers: [
        {
          provide: CurrenciesService,
          useValue: mockCurrenciesService,
        },
      ],
    }).compile();

    controller = module.get<CurrenciesController>(CurrenciesController);
    service = module.get<CurrenciesService>(CurrenciesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { code: 'USD', symbol: '$', name: 'US Dollar', isActive: true };
      mockCurrenciesService.create.mockResolvedValue('created');
      const result = await controller.create(dto as any);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe('created');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockCurrenciesService.findAll.mockResolvedValue(['cur1']);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(['cur1']);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockCurrenciesService.findOne.mockResolvedValue('cur1');
      const result = await controller.findOne('123');
      expect(service.findOne).toHaveBeenCalledWith('123');
      expect(result).toBe('cur1');
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' };
      mockCurrenciesService.update.mockResolvedValue('updated');
      const result = await controller.update('123', dto);
      expect(service.update).toHaveBeenCalledWith('123', dto);
      expect(result).toBe('updated');
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockCurrenciesService.remove.mockResolvedValue('removed');
      const result = await controller.remove('123');
      expect(service.remove).toHaveBeenCalledWith('123');
      expect(result).toBe('removed');
    });
  });
});
