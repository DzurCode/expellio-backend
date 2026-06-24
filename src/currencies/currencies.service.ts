import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  async create(createCurrencyDto: CreateCurrencyDto) {
    return this.prisma.currency.create({
      data: createCurrencyDto,
    });
  }

  async findAll() {
    return this.prisma.currency.findMany({
      where: { deletedAt: null, isActive: true },
    });
  }

  async findOne(id: string) {
    const currency = await this.prisma.currency.findFirst({
      where: { id, deletedAt: null },
    });
    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }
    return currency;
  }

  async update(id: string, updateCurrencyDto: UpdateCurrencyDto) {
    await this.findOne(id); // Check if exists
    return this.prisma.currency.update({
      where: { id },
      data: updateCurrencyDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.currency.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
