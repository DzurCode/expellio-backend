import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { UsersModule } from './users/users.module';
import { HouseholdsModule } from './households/households.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RecurringConfigsModule } from './recurring-configs/recurring-configs.module';
import { BudgetsModule } from './budgets/budgets.module';
import { SavingsGoalsModule } from './savings-goals/savings-goals.module';

@Module({
  imports: [PrismaModule, CurrenciesModule, UsersModule, HouseholdsModule, CategoriesModule, TransactionsModule, RecurringConfigsModule, BudgetsModule, SavingsGoalsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
