import { Test, TestingModule } from '@nestjs/testing';
import { RecurringConfigsController } from './recurring-configs.controller';
import { RecurringConfigsService } from './recurring-configs.service';
import { TransactionType, RecurringFrequency } from '@prisma/client';

describe('RecurringConfigsController', () => {
  let controller: RecurringConfigsController;
  let service: RecurringConfigsService;

  const mockRecurringConfigsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringConfigsController],
      providers: [
        { provide: RecurringConfigsService, useValue: mockRecurringConfigsService },
      ],
    }).compile();

    controller = module.get<RecurringConfigsController>(RecurringConfigsController);
    service = module.get<RecurringConfigsService>(RecurringConfigsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call update on service', async () => {
    const dto = { amount: 500 };
    mockRecurringConfigsService.update.mockResolvedValue({ id: 'r1', amount: 500 });

    await controller.update('h1', 'r1', dto);
    expect(service.update).toHaveBeenCalledWith('h1', 'r1', dto);
  });
});
