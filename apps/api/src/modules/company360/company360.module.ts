import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company360Controller } from './company360.controller';
import { Company360Service } from './company360.service';
import { Invoice } from '../../database/entities/invoice.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Payroll } from '../../database/entities/payroll.entity';
import { PayrollDetail } from '../../database/entities/payroll-detail.entity';
import { Client } from '../../database/entities/client.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { SupplierInvoice } from '../../database/entities/supplier-invoice.entity';
import { SupplierPayment } from '../../database/entities/supplier-payment.entity';
import { ImportOrder } from '../../database/entities/import-order.entity';
import { Attendance } from '../../database/entities/attendance.entity';
import { ExchangeRate } from '../../database/entities/exchange-rate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      WorkOrder,
      Quotation,
      InventoryItem,
      StockMovement,
      Employee,
      Payroll,
      PayrollDetail,
      Client,
      Supplier,
      SupplierInvoice,
      SupplierPayment,
      ImportOrder,
      Attendance,
      ExchangeRate,
    ]),
  ],
  controllers: [Company360Controller],
  providers: [Company360Service],
})
export class Company360Module {}
