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
    getSummary: jest.fn(),
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

  afterEach(() => {
    jest.clearAllMocks();
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

  it('should call getSummary on service', async () => {
    mockTransactionsService.getSummary.mockResolvedValue({ streakDays: 0 });
    const result = await controller.getSummary('h1', { id: 'u1' });
    expect(service.getSummary).toHaveBeenCalledWith('h1', 'u1');
    expect(result).toEqual({ streakDays: 0 });
  });

  it('should call findAll on service', async () => {
    mockTransactionsService.findAll.mockResolvedValue([{ id: 't1' }]);
    const result = await controller.findAll('h1');
    expect(service.findAll).toHaveBeenCalledWith('h1');
    expect(result).toEqual([{ id: 't1' }]);
  });

  it('should call findOne on service', async () => {
    mockTransactionsService.findOne.mockResolvedValue({ id: 't1' });
    const result = await controller.findOne('h1', 't1');
    expect(service.findOne).toHaveBeenCalledWith('h1', 't1');
    expect(result).toEqual({ id: 't1' });
  });

  it('should call update on service', async () => {
    const dto = { amount: 200 };
    mockTransactionsService.update.mockResolvedValue({ id: 't1', amount: 200 });
    const result = await controller.update('h1', 't1', dto as any);
    expect(service.update).toHaveBeenCalledWith('h1', 't1', dto);
    expect(result).toEqual({ id: 't1', amount: 200 });
  });

  it('should call remove on service', async () => {
    mockTransactionsService.remove.mockResolvedValue({ id: 't1', deletedAt: new Date() });
    const result = await controller.remove('h1', 't1');
    expect(service.remove).toHaveBeenCalledWith('h1', 't1');
    expect(result).toHaveProperty('id', 't1');
  });
});
