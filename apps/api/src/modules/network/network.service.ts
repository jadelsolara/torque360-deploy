import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { NetworkListing } from './entities/network-listing.entity';
import { NetworkRfq } from './entities/network-rfq.entity';
import { NetworkRfqResponse } from './entities/network-rfq-response.entity';
import { NetworkTransaction } from './entities/network-transaction.entity';
import { NetworkRating } from './entities/network-rating.entity';
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

// ── Transaction status transitions ──
const VALID_TX_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
};

// ── Interfaces ──

export interface PaginatedListings {
  data: NetworkListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedRfqs {
  data: NetworkRfq[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TenantRating {
  tenantId: string;
  averageScore: number;
  averageDeliveryScore: number;
  averageQualityScore: number;
  averageCommunicationScore: number;
  totalRatings: number;
}

export interface NetworkStats {
  totalActiveListings: number;
  totalOpenRfqs: number;
  totalTransactions: number;
  transactionVolume: number;
  listingsByActorType: Record<string, number>;
  listingsByItemType: Record<string, number>;
  transactionsByStatus: Record<string, number>;
}

@Injectable()
export class NetworkService {
  constructor(
    @InjectRepository(NetworkListing)
    private listingRepo: Repository<NetworkListing>,
    @InjectRepository(NetworkRfq)
    private rfqRepo: Repository<NetworkRfq>,
    @InjectRepository(NetworkRfqResponse)
    private rfqResponseRepo: Repository<NetworkRfqResponse>,
    @InjectRepository(NetworkTransaction)
    private transactionRepo: Repository<NetworkTransaction>,
    @InjectRepository(NetworkRating)
    private ratingRepo: Repository<NetworkRating>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  LISTINGS — CRUD + Search
  // ═══════════════════════════════════════════════════════════════════

  async createListing(
    tenantId: string,
    dto: CreateListingDto,
  ): Promise<NetworkListing> {
    const listing = this.listingRepo.create({
      tenantId,
      actorType: dto.actorType,
      itemType: dto.itemType,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      brand: dto.brand,
      partNumber: dto.partNumber,
      oemNumber: dto.oemNumber,
      price: dto.price,
      currency: dto.currency || 'CLP',
      minQuantity: dto.minQuantity || 1,
      stockAvailable: dto.stockAvailable || 0,
      locationCity: dto.locationCity,
      locationRegion: dto.locationRegion,
    });

    return this.listingRepo.save(listing);
  }

  async findAllListings(
    query: ListListingsQueryDto,
  ): Promise<PaginatedListings> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .where('l.is_active = true');

    // ── Text search across title, description, part_number, oem_number ──
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(l.title) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(l.description) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(l.part_number) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(l.oem_number) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(l.brand) LIKE :search', { search: searchTerm });
        }),
      );
    }

    if (query.actorType) {
      qb.andWhere('l.actor_type = :actorType', { actorType: query.actorType });
    }

    if (query.itemType) {
      qb.andWhere('l.item_type = :itemType', { itemType: query.itemType });
    }

    if (query.category) {
      qb.andWhere('l.category = :category', { category: query.category });
    }

    if (query.brand) {
      qb.andWhere('LOWER(l.brand) = LOWER(:brand)', { brand: query.brand });
    }

    if (query.partNumber) {
      qb.andWhere('LOWER(l.part_number) LIKE LOWER(:partNumber)', {
        partNumber: `%${query.partNumber}%`,
      });
    }

    if (query.locationRegion) {
      qb.andWhere('l.location_region = :locationRegion', {
        locationRegion: query.locationRegion,
      });
    }

    if (query.priceMin !== undefined) {
      qb.andWhere('l.price >= :priceMin', { priceMin: query.priceMin });
    }

    if (query.priceMax !== undefined) {
      qb.andWhere('l.price <= :priceMax', { priceMax: query.priceMax });
    }

    // ── Sorting ──
    const sortOrder = query.sortOrder || 'DESC';
    if (query.sortBy === 'price') {
      qb.orderBy('l.price', sortOrder);
    } else if (query.sortBy === 'views_count') {
      qb.orderBy('l.views_count', sortOrder);
    } else {
      qb.orderBy('l.created_at', sortOrder);
    }

    const total = await qb.getCount();

    qb.skip(offset).take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findListingById(listingId: string): Promise<NetworkListing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Increment view count
    await this.listingRepo.increment({ id: listingId }, 'viewsCount', 1);

    return listing;
  }

  async updateListing(
    tenantId: string,
    listingId: string,
    dto: UpdateListingDto,
  ): Promise<NetworkListing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, tenantId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found or not owned by your tenant');
    }

    Object.assign(listing, dto);

    return this.listingRepo.save(listing);
  }

  async getMyListings(
    tenantId: string,
    query: ListListingsQueryDto,
  ): Promise<PaginatedListings> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId });

    if (query.search) {
      const searchTerm = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere('LOWER(l.title) LIKE :search', { search: searchTerm });
    }

    if (query.itemType) {
      qb.andWhere('l.item_type = :itemType', { itemType: query.itemType });
    }

    qb.orderBy('l.created_at', 'DESC');

    const total = await qb.getCount();
    qb.skip(offset).take(limit);
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RFQs — Request for Quotation lifecycle
  // ═══════════════════════════════════════════════════════════════════

  async createRfq(
    tenantId: string,
    dto: CreateRfqDto,
  ): Promise<NetworkRfq> {
    const rfq = this.rfqRepo.create({
      requesterTenantId: tenantId,
      title: dto.title,
      description: dto.description,
      items: dto.items,
      targetActorTypes: dto.targetActorTypes || [],
      targetRegions: dto.targetRegions || [],
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      status: 'open',
    });

    return this.rfqRepo.save(rfq);
  }

  async findAllRfqs(
    query: ListRfqsQueryDto,
  ): Promise<PaginatedRfqs> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    const qb = this.rfqRepo.createQueryBuilder('r');

    if (query.status) {
      qb.where('r.status = :status', { status: query.status });
    } else {
      // Default: show open RFQs
      qb.where('r.status = :status', { status: 'open' });
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(r.title) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(r.description) LIKE :search', { search: searchTerm });
        }),
      );
    }

    const sortOrder = query.sortOrder || 'DESC';
    if (query.sortBy === 'deadline') {
      qb.orderBy('r.deadline', sortOrder);
    } else if (query.sortBy === 'responses_count') {
      qb.orderBy('r.responses_count', sortOrder);
    } else {
      qb.orderBy('r.created_at', sortOrder);
    }

    const total = await qb.getCount();
    qb.skip(offset).take(limit);
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRfqById(rfqId: string): Promise<NetworkRfq> {
    const rfq = await this.rfqRepo.findOne({
      where: { id: rfqId },
      relations: ['responses'],
    });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    return rfq;
  }

  async respondToRfq(
    tenantId: string,
    rfqId: string,
    dto: CreateRfqResponseDto,
  ): Promise<NetworkRfqResponse> {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.status !== 'open') {
      throw new BadRequestException('This RFQ is no longer accepting responses');
    }

    if (rfq.requesterTenantId === tenantId) {
      throw new BadRequestException('Cannot respond to your own RFQ');
    }

    if (rfq.deadline && new Date(rfq.deadline) < new Date()) {
      throw new BadRequestException('RFQ deadline has passed');
    }

    // Check for duplicate response from the same tenant
    const existing = await this.rfqResponseRepo.findOne({
      where: { rfqId, responderTenantId: tenantId },
    });
    if (existing) {
      throw new BadRequestException('You have already responded to this RFQ');
    }

    const response = this.rfqResponseRepo.create({
      rfqId,
      responderTenantId: tenantId,
      items: dto.items,
      totalPrice: dto.totalPrice,
      deliveryDays: dto.deliveryDays,
      notes: dto.notes,
      status: 'pending',
    });

    const saved = await this.rfqResponseRepo.save(response);

    // Update response count
    await this.rfqRepo.increment({ id: rfqId }, 'responsesCount', 1);

    return saved;
  }

  async getRfqResponses(
    tenantId: string,
    rfqId: string,
  ): Promise<NetworkRfqResponse[]> {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Only the RFQ owner can view all responses
    if (rfq.requesterTenantId !== tenantId) {
      throw new ForbiddenException('Only the RFQ requester can view all responses');
    }

    return this.rfqResponseRepo.find({
      where: { rfqId },
      order: { totalPrice: 'ASC' },
    });
  }

  async acceptRfqResponse(
    tenantId: string,
    rfqId: string,
    responseId: string,
  ): Promise<NetworkRfqResponse> {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.requesterTenantId !== tenantId) {
      throw new ForbiddenException('Only the RFQ requester can accept responses');
    }

    if (rfq.status !== 'open') {
      throw new BadRequestException('This RFQ is no longer open');
    }

    const response = await this.rfqResponseRepo.findOne({
      where: { id: responseId, rfqId },
    });
    if (!response) {
      throw new NotFoundException('Response not found for this RFQ');
    }

    // Accept this response
    response.status = 'accepted';
    await this.rfqResponseRepo.save(response);

    // Reject all other responses
    await this.rfqResponseRepo
      .createQueryBuilder()
      .update(NetworkRfqResponse)
      .set({ status: 'rejected' })
      .where('rfq_id = :rfqId', { rfqId })
      .andWhere('id != :responseId', { responseId })
      .andWhere('status = :status', { status: 'pending' })
      .execute();

    // Close the RFQ
    rfq.status = 'awarded';
    await this.rfqRepo.save(rfq);

    return response;
  }

  async cancelRfq(
    tenantId: string,
    rfqId: string,
  ): Promise<NetworkRfq> {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId } });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.requesterTenantId !== tenantId) {
      throw new ForbiddenException('Only the RFQ requester can cancel it');
    }

    if (rfq.status !== 'open') {
      throw new BadRequestException('Only open RFQs can be cancelled');
    }

    rfq.status = 'cancelled';
    return this.rfqRepo.save(rfq);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TRANSACTIONS — Lifecycle
  // ═══════════════════════════════════════════════════════════════════

  async createTransaction(
    tenantId: string,
    dto: CreateTransactionDto,
  ): Promise<NetworkTransaction> {
    if (dto.sellerTenantId === tenantId) {
      throw new BadRequestException('Cannot create a transaction with yourself');
    }

    const commissionRate = 0.03; // 3% platform commission
    const commissionAmount = Number((dto.subtotal * commissionRate).toFixed(2));
    const total = Number((dto.subtotal + commissionAmount).toFixed(2));

    const tx = this.transactionRepo.create({
      buyerTenantId: tenantId,
      sellerTenantId: dto.sellerTenantId,
      listingId: dto.listingId || null,
      rfqResponseId: dto.rfqResponseId || null,
      items: dto.items,
      subtotal: dto.subtotal,
      commissionRate,
      commissionAmount,
      total,
      status: 'pending',
    });

    const saved = await this.transactionRepo.save(tx);

    // Increment inquiries count on the listing if applicable
    if (dto.listingId) {
      await this.listingRepo.increment(
        { id: dto.listingId },
        'inquiriesCount',
        1,
      );
    }

    return saved;
  }

  async updateTransactionStatus(
    tenantId: string,
    transactionId: string,
    dto: UpdateTransactionStatusDto,
  ): Promise<NetworkTransaction> {
    const tx = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    // Only buyer or seller can update
    if (tx.buyerTenantId !== tenantId && tx.sellerTenantId !== tenantId) {
      throw new ForbiddenException('Not authorized to update this transaction');
    }

    // Validate transition
    const allowed = VALID_TX_TRANSITIONS[tx.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${tx.status}' to '${dto.status}'. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    // Role-based status enforcement
    if (dto.status === 'confirmed' && tx.sellerTenantId !== tenantId) {
      throw new ForbiddenException('Only the seller can confirm a transaction');
    }
    if (dto.status === 'shipped' && tx.sellerTenantId !== tenantId) {
      throw new ForbiddenException('Only the seller can mark a transaction as shipped');
    }
    if (dto.status === 'delivered' && tx.buyerTenantId !== tenantId) {
      throw new ForbiddenException('Only the buyer can confirm delivery');
    }

    tx.status = dto.status;

    return this.transactionRepo.save(tx);
  }

  async findTransactionById(
    tenantId: string,
    transactionId: string,
  ): Promise<NetworkTransaction> {
    const tx = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: ['listing', 'ratings'],
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    if (tx.buyerTenantId !== tenantId && tx.sellerTenantId !== tenantId) {
      throw new ForbiddenException('Not authorized to view this transaction');
    }

    return tx;
  }

  async getMyTransactions(
    tenantId: string,
    role?: 'buyer' | 'seller',
  ): Promise<NetworkTransaction[]> {
    const qb = this.transactionRepo.createQueryBuilder('t');

    if (role === 'buyer') {
      qb.where('t.buyer_tenant_id = :tenantId', { tenantId });
    } else if (role === 'seller') {
      qb.where('t.seller_tenant_id = :tenantId', { tenantId });
    } else {
      qb.where(
        new Brackets((sub) => {
          sub
            .where('t.buyer_tenant_id = :tenantId', { tenantId })
            .orWhere('t.seller_tenant_id = :tenantId', { tenantId });
        }),
      );
    }

    qb.orderBy('t.created_at', 'DESC');

    return qb.getMany();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RATINGS
  // ═══════════════════════════════════════════════════════════════════

  async rateTransaction(
    tenantId: string,
    transactionId: string,
    dto: CreateRatingDto,
  ): Promise<NetworkRating> {
    const tx = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    // Only buyer or seller can rate
    if (tx.buyerTenantId !== tenantId && tx.sellerTenantId !== tenantId) {
      throw new ForbiddenException('Not authorized to rate this transaction');
    }

    // Transaction must be delivered or completed
    if (!['delivered', 'completed'].includes(tx.status)) {
      throw new BadRequestException(
        'Transaction must be delivered or completed before rating',
      );
    }

    // Determine who is being rated
    const ratedTenantId =
      tx.buyerTenantId === tenantId ? tx.sellerTenantId : tx.buyerTenantId;

    // Check for duplicate rating
    const existing = await this.ratingRepo.findOne({
      where: { transactionId, raterTenantId: tenantId },
    });
    if (existing) {
      throw new BadRequestException('You have already rated this transaction');
    }

    const rating = this.ratingRepo.create({
      transactionId,
      raterTenantId: tenantId,
      ratedTenantId: ratedTenantId,
      score: dto.score,
      deliveryScore: dto.deliveryScore,
      qualityScore: dto.qualityScore,
      communicationScore: dto.communicationScore,
      comment: dto.comment,
    });

    return this.ratingRepo.save(rating);
  }

  async getTenantRating(tenantId: string): Promise<TenantRating> {
    const result = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.rated_tenant_id', 'tenantId')
      .addSelect('AVG(r.score)', 'averageScore')
      .addSelect('AVG(r.delivery_score)', 'averageDeliveryScore')
      .addSelect('AVG(r.quality_score)', 'averageQualityScore')
      .addSelect('AVG(r.communication_score)', 'averageCommunicationScore')
      .addSelect('COUNT(*)::int', 'totalRatings')
      .where('r.rated_tenant_id = :tenantId', { tenantId })
      .groupBy('r.rated_tenant_id')
      .getRawOne();

    if (!result) {
      return {
        tenantId,
        averageScore: 0,
        averageDeliveryScore: 0,
        averageQualityScore: 0,
        averageCommunicationScore: 0,
        totalRatings: 0,
      };
    }

    return {
      tenantId: result.tenantId,
      averageScore: Number(Number(result.averageScore).toFixed(2)),
      averageDeliveryScore: Number(Number(result.averageDeliveryScore || 0).toFixed(2)),
      averageQualityScore: Number(Number(result.averageQualityScore || 0).toFixed(2)),
      averageCommunicationScore: Number(Number(result.averageCommunicationScore || 0).toFixed(2)),
      totalRatings: Number(result.totalRatings),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  NETWORK STATS
  // ═══════════════════════════════════════════════════════════════════

  async getNetworkStats(): Promise<NetworkStats> {
    // Active listings count
    const totalActiveListings = await this.listingRepo.count({
      where: { isActive: true },
    });

    // Open RFQs count
    const totalOpenRfqs = await this.rfqRepo.count({
      where: { status: 'open' },
    });

    // Total transactions
    const totalTransactions = await this.transactionRepo.count();

    // Transaction volume (sum of all totals)
    const volumeResult = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'volume')
      .where('t.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'disputed'],
      })
      .getRawOne();
    const transactionVolume = Number(volumeResult?.volume || 0);

    // Listings by actor type
    const actorTypeRows = await this.listingRepo
      .createQueryBuilder('l')
      .select('l.actor_type', 'actorType')
      .addSelect('COUNT(*)::int', 'count')
      .where('l.is_active = true')
      .groupBy('l.actor_type')
      .getRawMany();
    const listingsByActorType: Record<string, number> = {};
    for (const row of actorTypeRows) {
      listingsByActorType[row.actorType] = Number(row.count);
    }

    // Listings by item type
    const itemTypeRows = await this.listingRepo
      .createQueryBuilder('l')
      .select('l.item_type', 'itemType')
      .addSelect('COUNT(*)::int', 'count')
      .where('l.is_active = true')
      .groupBy('l.item_type')
      .getRawMany();
    const listingsByItemType: Record<string, number> = {};
    for (const row of itemTypeRows) {
      listingsByItemType[row.itemType] = Number(row.count);
    }

    // Transactions by status
    const txStatusRows = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('t.status')
      .getRawMany();
    const transactionsByStatus: Record<string, number> = {};
    for (const row of txStatusRows) {
      transactionsByStatus[row.status] = Number(row.count);
    }

    return {
      totalActiveListings,
      totalOpenRfqs,
      totalTransactions,
      transactionVolume,
      listingsByActorType,
      listingsByItemType,
      transactionsByStatus,
    };
  }

  async getMyNetworkStats(tenantId: string): Promise<{
    myListings: number;
    myActiveListings: number;
    myOpenRfqs: number;
    myTransactionsAsBuyer: number;
    myTransactionsAsSeller: number;
    myTotalVolume: number;
    myRating: TenantRating;
  }> {
    const myListings = await this.listingRepo.count({
      where: { tenantId },
    });

    const myActiveListings = await this.listingRepo.count({
      where: { tenantId, isActive: true },
    });

    const myOpenRfqs = await this.rfqRepo.count({
      where: { requesterTenantId: tenantId, status: 'open' },
    });

    const myTransactionsAsBuyer = await this.transactionRepo.count({
      where: { buyerTenantId: tenantId },
    });

    const myTransactionsAsSeller = await this.transactionRepo.count({
      where: { sellerTenantId: tenantId },
    });

    const volumeResult = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'volume')
      .where(
        new Brackets((sub) => {
          sub
            .where('t.buyer_tenant_id = :tenantId', { tenantId })
            .orWhere('t.seller_tenant_id = :tenantId', { tenantId });
        }),
      )
      .andWhere('t.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'disputed'],
      })
      .getRawOne();
    const myTotalVolume = Number(volumeResult?.volume || 0);

    const myRating = await this.getTenantRating(tenantId);

    return {
      myListings,
      myActiveListings,
      myOpenRfqs,
      myTransactionsAsBuyer,
      myTransactionsAsSeller,
      myTotalVolume,
      myRating,
    };
  }
}
