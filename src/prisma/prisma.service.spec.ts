import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

// Mock @prisma/client including Prisma.defineExtension used by prisma-audit.extension.ts
jest.mock('@prisma/client', () => {
  const mockClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $extends: jest.fn().mockReturnThis(),
  };
  class MockPrismaClient {
    $connect = jest.fn();
    $disconnect = jest.fn();
    $extends = jest.fn().mockReturnThis();
  }
  return {
    PrismaClient: MockPrismaClient,
    Prisma: {
      defineExtension: jest.fn((fn: (client: any) => any) => fn(mockClient)),
    },
  };
});

// Mock pg and adapter to prevent real DB connections
jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn() }));

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call $connect on initialization', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect on destruction', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalled();
    });
  });
});
