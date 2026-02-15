import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierAccountsController } from './supplier-accounts.controller';
import { SupplierAccountsService } from './supplier-accounts.service';
import { Supplier } from '../../database/entities/supplier.entity';
import { SupplierInvoice } from '../../database/entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from '../../database/entities/supplier-invoice-item.entity';
import { SupplierPayment } from '../../database/entities/supplier-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      SupplierInvoice,
      SupplierInvoiceItem,
      SupplierPayment,
    ]),
  ],
  controllers: [SuppliersController, SupplierAccountsController],
  providers: [SuppliersService, SupplierAccountsService],
  exports: [SuppliersService, SupplierAccountsService],
})
export class SuppliersModule {}
