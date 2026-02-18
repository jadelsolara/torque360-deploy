import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('MailService', () => {
  let service: MailService;

  const mockConfig = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        SMTP_HOST: 'smtp.test.cl',
        SMTP_PORT: 587,
        SMTP_USER: 'user@test.cl',
        SMTP_PASS: 'secret',
        SMTP_FROM: 'Test <test@test.cl>',
      };
      return map[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Send ──────────────────────────────────────────────────────────────

  describe('send', () => {
    it('should send an email successfully', async () => {
      mockSendMail.mockResolvedValue({ messageId: '<abc>' });
      const result = await service.send({
        to: 'client@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'Test <test@test.cl>',
        to: 'client@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        text: undefined,
        attachments: undefined,
      });
    });

    it('should handle array of recipients', async () => {
      mockSendMail.mockResolvedValue({ messageId: '<def>' });
      const result = await service.send({
        to: ['a@b.com', 'c@d.com'],
        subject: 'Multi',
        html: '<p>Hi all</p>',
      });
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@b.com, c@d.com' }),
      );
    });

    it('should return false on send failure', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP timeout'));
      const result = await service.send({
        to: 'fail@test.com',
        subject: 'Fail',
        html: '<p>error</p>',
      });
      expect(result).toBe(false);
    });
  });

  // ── Template: Work Order ──────────────────────────────────────────────

  describe('sendWorkOrderNotification', () => {
    it('should send work order email with correct subject', async () => {
      mockSendMail.mockResolvedValue({ messageId: '<wo>' });
      await service.sendWorkOrderNotification(
        'owner@shop.cl',
        'OT-001',
        'En Progreso',
        'Toyota Hilux 2020',
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Orden de Trabajo OT-001 - En Progreso',
          to: 'owner@shop.cl',
        }),
      );
    });
  });

  // ── Template: Invoice ─────────────────────────────────────────────────

  describe('sendInvoiceEmail', () => {
    it('should send invoice email without attachment', async () => {
      mockSendMail.mockResolvedValue({ messageId: '<inv>' });
      await service.sendInvoiceEmail('client@shop.cl', 'F-1234', '$150.000');
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Factura Electrónica F-1234 - TORQUE 360',
          attachments: undefined,
        }),
      );
    });

    it('should attach PDF when provided', async () => {
      mockSendMail.mockResolvedValue({ messageId: '<inv2>' });
      const pdf = Buffer.from('fake-pdf');
      await service.sendInvoiceEmail('cl@x.cl', 'F-5678', '$200.000', pdf);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [{
            filename: 'F-5678.pdf',
            content: pdf,
            contentType: 'application/pdf',
          }],
        }),
      );
    });
  });

  // ── Template: Payroll Slip ────────────────────────────────────────────

  describe('sendPayrollSlip', () => {
    it('should send payroll slip', async () => {
      mockSendMail.mockResolvedValue({ messageId: '<pay>' });
      await service.sendPayrollSlip('emp@shop.cl', 'Juan Pérez', '2025-01');
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Liquidación de Sueldo 2025-01 - TORQUE 360',
        }),
      );
    });
  });
});

// ── Dry Run Mode (no SMTP) ──────────────────────────────────────────────

describe('MailService (no SMTP)', () => {
  let service: MailService;

  const noSmtpConfig = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        SMTP_HOST: undefined,
        SMTP_PORT: 587,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
        SMTP_FROM: 'TORQUE 360 <noreply@torque360.cl>',
      };
      return map[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: noSmtpConfig },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should log instead of sending when SMTP not configured', async () => {
    const result = await service.send({
      to: 'test@test.com',
      subject: 'Dry Run',
      html: '<p>Test</p>',
    });
    expect(result).toBe(true);
  });
});
