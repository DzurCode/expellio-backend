import { Test, TestingModule } from '@nestjs/testing';
import { AiJobsController } from './ai-jobs.controller';
import { AiJobsService } from './ai-jobs.service';

describe('AiJobsController', () => {
  let controller: AiJobsController;
  let service: AiJobsService;

  const mockAiJobsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiJobsController],
      providers: [
        { provide: AiJobsService, useValue: mockAiJobsService },
      ],
    }).compile();

    controller = module.get<AiJobsController>(AiJobsController);
    service = module.get<AiJobsService>(AiJobsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAll on service', async () => {
    mockAiJobsService.findAll.mockResolvedValue([{ id: 'a1' }]);
    const result = await controller.findAll('h1');
    expect(service.findAll).toHaveBeenCalledWith('h1');
    expect(result).toHaveLength(1);
  });
});
