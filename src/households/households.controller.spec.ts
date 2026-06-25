import { Test, TestingModule } from '@nestjs/testing';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';

describe('HouseholdsController', () => {
  let controller: HouseholdsController;
  let service: HouseholdsService;

  const mockHouseholdsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    generateInvite: jest.fn(),
    join: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HouseholdsController],
      providers: [
        {
          provide: HouseholdsService,
          useValue: mockHouseholdsService,
        },
      ],
    }).compile();

    controller = module.get<HouseholdsController>(HouseholdsController);
    service = module.get<HouseholdsService>(HouseholdsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { name: 'My Home', mode: 'couple', ownerId: 'user1' };
      mockHouseholdsService.create.mockResolvedValue('created');
      const result = await controller.create({ id: 'u1' }, dto as any);
      expect(service.create).toHaveBeenCalledWith('u1', dto);
      expect(result).toBe('created');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockHouseholdsService.findAll.mockResolvedValue(['h1']);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(['h1']);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockHouseholdsService.findOne.mockResolvedValue('h1');
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result).toBe('h1');
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' };
      mockHouseholdsService.update.mockResolvedValue('updated');
      const result = await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith('1', dto);
      expect(result).toBe('updated');
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockHouseholdsService.remove.mockResolvedValue('removed');
      const result = await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith('1');
      expect(result).toBe('removed');
    });
  });

  describe('generateInvite', () => {
    it('should call service.generateInvite', async () => {
      mockHouseholdsService.generateInvite.mockResolvedValue('invite');
      const result = await controller.generateInvite('1');
      expect(service.generateInvite).toHaveBeenCalledWith('1');
      expect(result).toBe('invite');
    });
  });

  describe('join', () => {
    it('should call service.join', async () => {
      const dto = { inviteCode: 'code123', userId: 'user2' };
      mockHouseholdsService.join.mockResolvedValue('joined');
      const result = await controller.join({ id: 'user2' }, dto as any);
      expect(service.join).toHaveBeenCalledWith('user2', dto);
      expect(result).toBe('joined');
    });
  });
});
