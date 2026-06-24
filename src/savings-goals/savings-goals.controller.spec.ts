import { Test, TestingModule } from '@nestjs/testing';
import { SavingsGoalsController } from './savings-goals.controller';
import { SavingsGoalsService } from './savings-goals.service';

describe('SavingsGoalsController', () => {
  let controller: SavingsGoalsController;
  let service: SavingsGoalsService;

  const mockSavingsGoalsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavingsGoalsController],
      providers: [
        { provide: SavingsGoalsService, useValue: mockSavingsGoalsService },
      ],
    }).compile();

    controller = module.get<SavingsGoalsController>(SavingsGoalsController);
    service = module.get<SavingsGoalsService>(SavingsGoalsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAll on service', async () => {
    mockSavingsGoalsService.findAll.mockResolvedValue([{ id: 's1' }]);
    const result = await controller.findAll('h1');
    expect(service.findAll).toHaveBeenCalledWith('h1');
    expect(result).toHaveLength(1);
  });
});
