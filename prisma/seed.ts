import { PrismaClient, CategoryType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const defaultCategories = [
  // Expenses
  { name: 'Vivienda', icon: '🏠', type: CategoryType.expense, color: '#4B5563' },
  { name: 'Servicios', icon: '⚡', type: CategoryType.expense, color: '#FBBF24' },
  { name: 'Alimentación / Supermercado', icon: '🛒', type: CategoryType.expense, color: '#10B981' },
  { name: 'Transporte', icon: '🚗', type: CategoryType.expense, color: '#3B82F6' },
  { name: 'Salud', icon: '🏥', type: CategoryType.expense, color: '#EF4444' },
  { name: 'Educación', icon: '🎓', type: CategoryType.expense, color: '#8B5CF6' },
  { name: 'Restaurantes / Comida fuera', icon: '🍔', type: CategoryType.expense, color: '#F97316' },
  { name: 'Entretenimiento', icon: '🎬', type: CategoryType.expense, color: '#EC4899' },
  { name: 'Ropa y accesorios', icon: '👕', type: CategoryType.expense, color: '#D946EF' },
  { name: 'Viajes', icon: '✈️', type: CategoryType.expense, color: '#06B6D4' },
  { name: 'Gimnasio / Deporte', icon: '💪', type: CategoryType.expense, color: '#6366F1' },
  { name: 'Regalos', icon: '🎁', type: CategoryType.expense, color: '#14B8A6' },
  { name: 'Deudas / Préstamos', icon: '💸', type: CategoryType.expense, color: '#84CC16' },
  { name: 'Ahorro / Inversión', icon: '🏦', type: CategoryType.expense, color: '#059669' },
  { name: 'Mascotas', icon: '🐾', type: CategoryType.expense, color: '#78350F' },
  { name: 'Impuestos', icon: '📄', type: CategoryType.expense, color: '#374151' },
  { name: 'Varios / Sin categorizar', icon: '🏷️', type: CategoryType.expense, color: '#6B7280' },

  // Income
  { name: 'Salario / Sueldo', icon: '💼', type: CategoryType.income, color: '#059669' },
  { name: 'Freelance / Trabajo independiente', icon: '💻', type: CategoryType.income, color: '#2563EB' },
  { name: 'Inversiones', icon: '📈', type: CategoryType.income, color: '#7C3AED' },
  { name: 'Rentas', icon: '🔑', type: CategoryType.income, color: '#D97706' },
  { name: 'Regalos / Bonos', icon: '✉️', type: CategoryType.income, color: '#DB2777' },
  { name: 'Reembolsos', icon: '🔄', type: CategoryType.income, color: '#0891B2' },
  { name: 'Otro ingreso', icon: '💰', type: CategoryType.income, color: '#4B5563' }
];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function main() {
  try {
    const existingCategories = await prisma.category.findMany({
      where: { householdId: null, deletedAt: null },
    });

    const existingNormalizedNames = new Set(
      existingCategories.map(c => normalizeName(c.name))
    );

    let seededCount = 0;
    let skippedCount = 0;

    for (const cat of defaultCategories) {
      const norm = normalizeName(cat.name);
      if (existingNormalizedNames.has(norm)) {
        skippedCount++;
        continue;
      }

      await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          isSystem: true,
          householdId: null,
        },
      });
      seededCount++;
    }

    console.log(`Seeding completed. Seeded: ${seededCount}, Skipped: ${skippedCount}`);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

main();
