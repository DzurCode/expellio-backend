import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    scheduleDeletion: jest.fn(),
    cancelDeletion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { email: 'test@test.com', passwordHash: 'hash', displayName: 'Test', locale: 'en', timezone: 'UTC' };
      mockUsersService.create.mockResolvedValue('created');
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe('created');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockUsersService.findAll.mockResolvedValue(['u1']);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(['u1']);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockUsersService.findOne.mockResolvedValue('u1');
      const result = await controller.findOne({ id: '1' });
      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result).toBe('u1');
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { displayName: 'Updated' };
      mockUsersService.update.mockResolvedValue('updated');
      const result = await controller.update({ id: '1' }, dto);
      expect(service.update).toHaveBeenCalledWith('1', dto);
      expect(result).toBe('updated');
    });
  });

  describe('scheduleDeletion', () => {
    it('should call service.scheduleDeletion', async () => {
      mockUsersService.scheduleDeletion.mockResolvedValue('scheduled');
      const result = await controller.scheduleDeletion({ id: '1' });
      expect(service.scheduleDeletion).toHaveBeenCalledWith('1');
      expect(result).toBe('scheduled');
    });
  });

  describe('cancelDeletion', () => {
    it('should call service.cancelDeletion', async () => {
      mockUsersService.cancelDeletion.mockResolvedValue('canceled');
      const result = await controller.cancelDeletion({ id: '1' });
      expect(service.cancelDeletion).toHaveBeenCalledWith('1');
      expect(result).toBe('canceled');
    });
  });
});
