import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    findAllByUser: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    deleteAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to findAllByUser with userId', async () => {
    mockNotificationsService.findAllByUser.mockResolvedValue([{ id: 'n1' }]);
    const result = await controller.findAll({ id: 'u1' });
    expect(service.findAllByUser).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(1);
  });

  it('remove delegates to remove with id and userId', async () => {
    mockNotificationsService.remove.mockResolvedValue(undefined);
    await controller.remove('n1', { id: 'u1' });
    expect(service.remove).toHaveBeenCalledWith('n1', 'u1');
  });

  it('deleteAll delegates to deleteAll with userId', async () => {
    mockNotificationsService.deleteAll.mockResolvedValue({ count: 2 });
    await controller.deleteAll({ id: 'u1' });
    expect(service.deleteAll).toHaveBeenCalledWith('u1');
  });
});

