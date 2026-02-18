import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');
    this.fromAddress = this.config.get(
      'SMTP_FROM',
      'TORQUE 360 <noreply@torque360.cl>',
    );

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Mail transport configured (${host}:${port})`);
    } else {
      this.logger.warn('SMTP not configured. Emails will be logged only.');
    }
  }

  async send(options: MailOptions): Promise<boolean> {
    const recipients = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;

    if (!this.transporter) {
      this.logger.log(
        `[DRY-RUN] Email to: ${recipients} | Subject: ${options.subject}`,
      );
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
      this.logger.log(`Email sent to ${recipients}: ${options.subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Email failed: ${(err as Error).message}`);
      return false;
    }
  }

  // ── Template Helpers ──────────────────────────────────────────────────

  async sendWorkOrderNotification(
    to: string,
    workOrderNumber: string,
    status: string,
    vehicleInfo: string,
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `Orden de Trabajo ${workOrderNumber} - ${status}`,
      html: `
        <h2>Actualización de Orden de Trabajo</h2>
        <p><strong>OT:</strong> ${workOrderNumber}</p>
        <p><strong>Vehículo:</strong> ${vehicleInfo}</p>
        <p><strong>Estado:</strong> ${status}</p>
        <p>Ingrese a TORQUE 360 para más detalles.</p>
      `,
    });
  }

  async sendInvoiceEmail(
    to: string,
    invoiceNumber: string,
    amount: string,
    pdfBuffer?: Buffer,
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `Factura Electrónica ${invoiceNumber} - TORQUE 360`,
      html: `
        <h2>Factura Electrónica</h2>
        <p><strong>N°:</strong> ${invoiceNumber}</p>
        <p><strong>Monto:</strong> ${amount}</p>
        <p>Adjunto encontrará el documento tributario electrónico.</p>
      `,
      attachments: pdfBuffer
        ? [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        : undefined,
    });
  }

  async sendPayrollSlip(
    to: string,
    employeeName: string,
    period: string,
    pdfBuffer?: Buffer,
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `Liquidación de Sueldo ${period} - TORQUE 360`,
      html: `
        <h2>Liquidación de Sueldo</h2>
        <p><strong>Colaborador:</strong> ${employeeName}</p>
        <p><strong>Período:</strong> ${period}</p>
      `,
      attachments: pdfBuffer
        ? [{ filename: `liquidacion-${period}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        : undefined,
    });
  }
}
