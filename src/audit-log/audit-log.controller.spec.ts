import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let service: AuditLogService;

  const mockAuditLogService = {
    create: jest.fn(),
    findAllByHousehold: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAllByHousehold on service', async () => {
    mockAuditLogService.findAllByHousehold.mockResolvedValue([{ id: 'al1' }]);
    const result = await controller.findAllByHousehold('h1');
    expect(service.findAllByHousehold).toHaveBeenCalledWith('h1');
    expect(result).toHaveLength(1);
  });
});
