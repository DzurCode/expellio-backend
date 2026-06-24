import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  async create(createCurrencyDto: CreateCurrencyDto) {
    try {
      return await this.prisma.currency.create({
        data: createCurrencyDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Duplicate currency');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll() {
    try {
      return await this.prisma.currency.findMany({
        where: { deletedAt: null, isActive: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(id: string) {
    try {
      const currency = await this.prisma.currency.findFirst({
        where: { id, deletedAt: null },
      });
      if (!currency) {
        throw new NotFoundException(`Currency with ID ${id} not found`);
      }
      return currency;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(id: string, updateCurrencyDto: UpdateCurrencyDto) {
    try {
      await this.findOne(id); // Check if exists
      return await this.prisma.currency.update({
        where: { id },
        data: updateCurrencyDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Duplicate currency');
        if (error.code === 'P2025') throw new NotFoundException(`Currency with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.currency.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException(`Currency with ID ${id} not found`);
      throw new InternalServerErrorException('Database error');
    }
  }
}
