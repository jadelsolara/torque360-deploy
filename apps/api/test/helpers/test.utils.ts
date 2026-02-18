import { v4 as uuid } from 'uuid';

// ─── Mock Repository Factory ────────────────────────────────────────────────
// Creates a mock TypeORM repository with all standard methods stubbed.
export function createMockRepository<T = any>() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((entity: Partial<T>) => entity as T),
    save: jest.fn((entity: T) => Promise.resolve(entity)),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  };
}

// ─── Mock QueryBuilder ──────────────────────────────────────────────────────
export function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'select', 'addSelect', 'where', 'andWhere', 'orWhere',
    'leftJoinAndSelect', 'innerJoinAndSelect', 'leftJoin', 'innerJoin',
    'orderBy', 'addOrderBy', 'groupBy', 'addGroupBy',
    'skip', 'take', 'limit', 'offset',
    'having', 'setParameter', 'setParameters',
  ];
  for (const method of chainable) {
    qb[method] = jest.fn().mockReturnThis();
  }
  qb.getMany = jest.fn().mockResolvedValue([]);
  qb.getOne = jest.fn().mockResolvedValue(null);
  qb.getCount = jest.fn().mockResolvedValue(0);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getRawOne = jest.fn().mockResolvedValue(null);
  qb.execute = jest.fn().mockResolvedValue({ affected: 0 });
  return qb;
}

// ─── Entity Factories ───────────────────────────────────────────────────────

export function createTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    name: 'Test Tenant',
    slug: 'test-tenant',
    plan: 'starter',
    isActive: true,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createUser(overrides: Record<string, unknown> = {}) {
  const tenantId = (overrides.tenantId as string) || uuid();
  return {
    id: uuid(),
    tenantId,
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'OPERATOR',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createWorkOrder(overrides: Record<string, unknown> = {}) {
  const tenantId = (overrides.tenantId as string) || uuid();
  return {
    id: uuid(),
    tenantId,
    orderNumber: 1001,
    vehicleId: uuid(),
    clientId: uuid(),
    assignedTo: null,
    status: 'pending',
    type: 'repair',
    priority: 'normal',
    description: 'Test work order',
    diagnosis: null,
    internalNotes: null,
    estimatedHours: 2,
    actualHours: null,
    laborCost: 50000,
    partsCost: 0,
    totalCost: 50000,
    parts: [],
    startedAt: null,
    completedAt: null,
    pipelineStage: 'work_order',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createInventoryItem(overrides: Record<string, unknown> = {}) {
  const tenantId = (overrides.tenantId as string) || uuid();
  return {
    id: uuid(),
    tenantId,
    sku: 'SKU-001',
    name: 'Brake Pad Set',
    description: 'Front brake pads',
    category: 'brakes',
    brand: 'Bosch',
    partNumber: 'BP-1234',
    oemNumber: 'OEM-5678',
    unit: 'unit',
    costPrice: 15000,
    sellPrice: 25000,
    stockQuantity: 50,
    minStock: 10,
    location: 'A1-01',
    supplierId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createEmployee(overrides: Record<string, unknown> = {}) {
  const tenantId = (overrides.tenantId as string) || uuid();
  return {
    id: uuid(),
    tenantId,
    firstName: 'Juan',
    lastName: 'Perez',
    rut: '12345678-9',
    email: 'juan@test.com',
    baseSalary: 600000,
    contractType: 'INDEFINIDO',
    gratificationType: 'ARTICULO_47',
    colacionAmount: 50000,
    movilizacionAmount: 30000,
    healthSystem: 'FONASA',
    isaprePlanUf: 0,
    afpRate: 11.44,
    weeklyHours: 45,
    apvAmount: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createAuditLog(overrides: Record<string, unknown> = {}) {
  const tenantId = (overrides.tenantId as string) || uuid();
  return {
    id: uuid(),
    tenantId,
    userId: uuid(),
    entityType: 'work_order',
    entityId: uuid(),
    action: 'create',
    changes: {},
    metadata: {},
    prevHash: null,
    hash: 'abc123',
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Mock DataSource (for transactions) ─────────────────────────────────────
export function createMockDataSource() {
  const mockManager = {
    create: jest.fn((_EntityClass: any, data: any) => ({ ...data })),
    save: jest.fn((_EntityClass: any, entity: any) => Promise.resolve({ id: uuid(), ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    remove: jest.fn((_EntityClass: any, entity: any) => Promise.resolve(entity)),
    update: jest.fn(() => Promise.resolve({ affected: 1 })),
    query: jest.fn(),
  };
  return {
    transaction: jest.fn((cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager)),
    query: jest.fn(),
    _mockManager: mockManager,
  };
}

// ─── Mock JwtService ────────────────────────────────────────────────────────
export function createMockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn().mockReturnValue({ sub: uuid(), email: 'test@test.com', tenantId: uuid(), role: 'OPERATOR' }),
    signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    verifyAsync: jest.fn(),
  };
}
