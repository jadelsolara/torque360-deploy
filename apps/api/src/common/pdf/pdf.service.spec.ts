import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Generic Document ──────────────────────────────────────────────────

  describe('generateDocument', () => {
    it('should generate a PDF buffer', async () => {
      const buffer = await service.generateDocument({
        title: 'Test Document',
        subtitle: 'Unit Test',
        content: [
          { type: 'heading', value: 'Section 1' },
          { type: 'text', value: 'This is test content' },
          { type: 'separator' },
        ],
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF magic bytes: %PDF
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });

    it('should include tables', async () => {
      const buffer = await service.generateDocument({
        title: 'Table Test',
        content: [
          {
            type: 'table',
            columns: [
              { header: 'Name', key: 'name', width: 200 },
              { header: 'Price', key: 'price', width: 100, align: 'right' },
            ],
            rows: [
              { name: 'Filtro aceite', price: '$5.000' },
              { name: 'Pastillas freno', price: '$25.000' },
            ],
          },
        ],
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it('should handle empty content', async () => {
      const buffer = await service.generateDocument({
        title: 'Empty',
        content: [],
      });
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  // ── Invoice Template ──────────────────────────────────────────────────

  describe('generateInvoicePdf', () => {
    it('should generate invoice PDF', async () => {
      const buffer = await service.generateInvoicePdf({
        invoiceNumber: 'F-001',
        date: '2025-01-15',
        clientName: 'Taller El Rápido SpA',
        clientRut: '76.123.456-7',
        items: [
          { description: 'Cambio de aceite', qty: 1, unitPrice: 25000, total: 25000 },
          { description: 'Filtro aceite Toyota', qty: 1, unitPrice: 8000, total: 8000 },
        ],
        subtotal: 33000,
        tax: 6270,
        total: 39270,
        companyName: 'AutoService Chile SpA',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });
  });

  // ── Payroll Slip Template ─────────────────────────────────────────────

  describe('generatePayrollSlipPdf', () => {
    it('should generate payroll slip PDF', async () => {
      const buffer = await service.generatePayrollSlipPdf({
        employeeName: 'Juan Pérez González',
        rut: '12.345.678-9',
        period: '2025-01',
        baseSalary: 800000,
        overtime: 50000,
        bonuses: 30000,
        grossSalary: 880000,
        afp: 110704,
        health: 61600,
        tax: 0,
        totalDeductions: 172304,
        netSalary: 707696,
        companyName: 'Taller Los Campeones Ltda',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(500);
    });
  });

  // ── Work Order Template ───────────────────────────────────────────────

  describe('generateWorkOrderPdf', () => {
    it('should generate work order PDF', async () => {
      const buffer = await service.generateWorkOrderPdf({
        orderNumber: 'OT-2025-0042',
        date: '2025-01-20',
        clientName: 'María López',
        vehicleInfo: 'Toyota Hilux 2022',
        plate: 'ABCD-12',
        km: 45000,
        items: [
          { description: 'Alineación y balanceo', qty: 1, unitPrice: 35000, total: 35000 },
          { description: 'Pastillas freno delantero', qty: 2, unitPrice: 22000, total: 44000 },
        ],
        laborTotal: 35000,
        partsTotal: 44000,
        total: 79000,
        technician: 'Carlos Muñoz',
        companyName: 'AutoPro Services SpA',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });
  });
});
