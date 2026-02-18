import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NetworkService } from './network.service';
import {
  CreateListingDto,
  UpdateListingDto,
  ListListingsQueryDto,
  CreateRfqDto,
  CreateRfqResponseDto,
  ListRfqsQueryDto,
  CreateTransactionDto,
  UpdateTransactionStatusDto,
  CreateRatingDto,
} from './dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('network')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('OPERATOR')
export class NetworkController {
  constructor(private networkService: NetworkService) {}

  // ═══════════════════════════════════════════════════════════════════
  //  LISTINGS
  // ═══════════════════════════════════════════════════════════════════

  @Post('listings')
  createListing(
    @Tenant() tenantId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.networkService.createListing(tenantId, dto);
  }

  @Get('listings')
  findAllListings(@Query() query: ListListingsQueryDto) {
    return this.networkService.findAllListings(query);
  }

  @Get('listings/mine')
  getMyListings(
    @Tenant() tenantId: string,
    @Query() query: ListListingsQueryDto,
  ) {
    return this.networkService.getMyListings(tenantId, query);
  }

  @Get('listings/:id')
  findListingById(@Param('id') id: string) {
    return this.networkService.findListingById(id);
  }

  @Patch('listings/:id')
  updateListing(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.networkService.updateListing(tenantId, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RFQs
  // ═══════════════════════════════════════════════════════════════════

  @Post('rfqs')
  createRfq(
    @Tenant() tenantId: string,
    @Body() dto: CreateRfqDto,
  ) {
    return this.networkService.createRfq(tenantId, dto);
  }

  @Get('rfqs')
  findAllRfqs(@Query() query: ListRfqsQueryDto) {
    return this.networkService.findAllRfqs(query);
  }

  @Get('rfqs/:id')
  findRfqById(@Param('id') id: string) {
    return this.networkService.findRfqById(id);
  }

  @Post('rfqs/:id/respond')
  respondToRfq(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateRfqResponseDto,
  ) {
    return this.networkService.respondToRfq(tenantId, id, dto);
  }

  @Get('rfqs/:id/responses')
  getRfqResponses(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.networkService.getRfqResponses(tenantId, id);
  }

  @Post('rfqs/:id/accept/:responseId')
  acceptRfqResponse(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('responseId') responseId: string,
  ) {
    return this.networkService.acceptRfqResponse(tenantId, id, responseId);
  }

  @Patch('rfqs/:id/cancel')
  cancelRfq(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.networkService.cancelRfq(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════

  @Post('transactions')
  createTransaction(
    @Tenant() tenantId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.networkService.createTransaction(tenantId, dto);
  }

  @Get('transactions')
  getMyTransactions(
    @Tenant() tenantId: string,
    @Query('role') role?: 'buyer' | 'seller',
  ) {
    return this.networkService.getMyTransactions(tenantId, role);
  }

  @Get('transactions/:id')
  findTransactionById(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.networkService.findTransactionById(tenantId, id);
  }

  @Patch('transactions/:id')
  updateTransactionStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionStatusDto,
  ) {
    return this.networkService.updateTransactionStatus(tenantId, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RATINGS
  // ═══════════════════════════════════════════════════════════════════

  @Post('transactions/:id/rate')
  rateTransaction(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.networkService.rateTransaction(tenantId, id, dto);
  }

  @Get('ratings/:tenantId')
  getTenantRating(@Param('tenantId') tenantId: string) {
    return this.networkService.getTenantRating(tenantId);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STATS
  // ═══════════════════════════════════════════════════════════════════

  @Get('stats')
  getNetworkStats() {
    return this.networkService.getNetworkStats();
  }

  @Get('stats/mine')
  getMyNetworkStats(@Tenant() tenantId: string) {
    return this.networkService.getMyNetworkStats(tenantId);
  }
}
