import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company } from '../../database/entities/company.entity';
import { ClientContact } from '../../database/entities/client-contact.entity';
import { Client } from '../../database/entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, ClientContact, Client])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
