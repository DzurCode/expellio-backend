import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    replaceAndRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct parameters', async () => {
      const dto = { name: 'Food', color: '#ff0000', icon: 'burger', sortOrder: 1 };
      mockCategoriesService.create.mockResolvedValue('created');
      const result = await controller.create('hh1', dto as any);
      expect(service.create).toHaveBeenCalledWith('hh1', dto);
      expect(result).toBe('created');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockCategoriesService.findAll.mockResolvedValue(['cat1', 'cat2']);
      const result = await controller.findAll('hh1');
      expect(service.findAll).toHaveBeenCalledWith('hh1');
      expect(result).toEqual(['cat1', 'cat2']);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockCategoriesService.findOne.mockResolvedValue('cat');
      const result = await controller.findOne('hh1', 'cat1');
      expect(service.findOne).toHaveBeenCalledWith('hh1', 'cat1');
      expect(result).toBe('cat');
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' };
      mockCategoriesService.update.mockResolvedValue('updated');
      const result = await controller.update('hh1', 'cat1', dto);
      expect(service.update).toHaveBeenCalledWith('hh1', 'cat1', dto);
      expect(result).toBe('updated');
    });
  });

  describe('replaceAndRemove', () => {
    it('should call service.replaceAndRemove', async () => {
      const dto = { replacementCategoryId: 'cat2' };
      mockCategoriesService.replaceAndRemove.mockResolvedValue('removed');
      const result = await controller.replaceAndRemove('hh1', 'cat1', dto);
      expect(service.replaceAndRemove).toHaveBeenCalledWith('hh1', 'cat1', dto);
      expect(result).toBe('removed');
    });
  });
});
