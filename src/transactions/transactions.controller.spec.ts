import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionType } from '@prisma/client';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call create on service', async () => {
    const dto = { categoryId: 'cat1', amount: 100, transactionDate: '2023-01-01', type: TransactionType.expense };
    mockTransactionsService.create.mockResolvedValue({ id: 't1' });
    
    const result = await controller.create('h1', { id: 'u1' }, dto as any);
    expect(service.create).toHaveBeenCalledWith('h1', 'u1', dto);
    expect(result.id).toBe('t1');
  });
});
