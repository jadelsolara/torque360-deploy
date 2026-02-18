import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

export interface PdfTableColumn {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // ── Generic PDF from HTML-like structure ──────────────────────────────

  async generateDocument(options: {
    title: string;
    subtitle?: string;
    companyName?: string;
    content: Array<{
      type: 'heading' | 'text' | 'table' | 'separator';
      value?: string;
      columns?: PdfTableColumn[];
      rows?: Record<string, string | number>[];
    }>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text(options.title, { align: 'center' });
      if (options.subtitle) {
        doc.fontSize(10).font('Helvetica').text(options.subtitle, { align: 'center' });
      }
      if (options.companyName) {
        doc.fontSize(9).text(options.companyName, { align: 'center' });
      }
      doc.moveDown(1.5);

      // Content blocks
      for (const block of options.content) {
        switch (block.type) {
          case 'heading':
            doc.fontSize(13).font('Helvetica-Bold').text(block.value || '');
            doc.moveDown(0.5);
            break;

          case 'text':
            doc.fontSize(10).font('Helvetica').text(block.value || '');
            doc.moveDown(0.3);
            break;

          case 'separator':
            doc
              .moveTo(50, doc.y)
              .lineTo(doc.page.width - 50, doc.y)
              .stroke();
            doc.moveDown(0.5);
            break;

          case 'table':
            if (block.columns && block.rows) {
              this.drawTable(doc, block.columns, block.rows);
            }
            break;
        }
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            `TORQUE 360 — Página ${i + 1} de ${pages.count}`,
            50,
            doc.page.height - 40,
            { align: 'center' },
          );
      }

      doc.end();
    });
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    columns: PdfTableColumn[],
    rows: Record<string, string | number>[],
  ) {
    const startX = 50;
    let y = doc.y;
    const rowHeight = 20;

    // Header row
    doc.fontSize(9).font('Helvetica-Bold');
    let x = startX;
    for (const col of columns) {
      doc.text(col.header, x, y, {
        width: col.width,
        align: col.align || 'left',
      });
      x += col.width;
    }
    y += rowHeight;
    doc.moveTo(startX, y - 4).lineTo(x, y - 4).stroke();

    // Data rows
    doc.font('Helvetica').fontSize(9);
    for (const row of rows) {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      x = startX;
      for (const col of columns) {
        const val = String(row[col.key] ?? '');
        doc.text(val, x, y, {
          width: col.width,
          align: col.align || 'left',
        });
        x += col.width;
      }
      y += rowHeight;
    }

    doc.y = y + 10;
  }

  // ── Pre-built Templates ───────────────────────────────────────────────

  async generateInvoicePdf(data: {
    invoiceNumber: string;
    date: string;
    clientName: string;
    clientRut: string;
    items: Array<{ description: string; qty: number; unitPrice: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    companyName: string;
  }): Promise<Buffer> {
    return this.generateDocument({
      title: `Factura Electrónica N° ${data.invoiceNumber}`,
      subtitle: `Fecha: ${data.date}`,
      companyName: data.companyName,
      content: [
        { type: 'heading', value: 'Datos del Cliente' },
        { type: 'text', value: `Razón Social: ${data.clientName}` },
        { type: 'text', value: `RUT: ${data.clientRut}` },
        { type: 'separator' },
        { type: 'heading', value: 'Detalle' },
        {
          type: 'table',
          columns: [
            { header: 'Descripción', key: 'description', width: 250 },
            { header: 'Cant.', key: 'qty', width: 50, align: 'center' },
            { header: 'P. Unit.', key: 'unitPrice', width: 80, align: 'right' },
            { header: 'Total', key: 'total', width: 80, align: 'right' },
          ],
          rows: data.items.map((i) => ({
            description: i.description,
            qty: i.qty,
            unitPrice: `$${i.unitPrice.toLocaleString('es-CL')}`,
            total: `$${i.total.toLocaleString('es-CL')}`,
          })),
        },
        { type: 'separator' },
        { type: 'text', value: `Subtotal: $${data.subtotal.toLocaleString('es-CL')}` },
        { type: 'text', value: `IVA (19%): $${data.tax.toLocaleString('es-CL')}` },
        { type: 'heading', value: `TOTAL: $${data.total.toLocaleString('es-CL')}` },
      ],
    });
  }

  async generatePayrollSlipPdf(data: {
    employeeName: string;
    rut: string;
    period: string;
    baseSalary: number;
    overtime: number;
    bonuses: number;
    grossSalary: number;
    afp: number;
    health: number;
    tax: number;
    totalDeductions: number;
    netSalary: number;
    companyName: string;
  }): Promise<Buffer> {
    return this.generateDocument({
      title: 'Liquidación de Sueldo',
      subtitle: `Período: ${data.period}`,
      companyName: data.companyName,
      content: [
        { type: 'heading', value: 'Datos del Trabajador' },
        { type: 'text', value: `Nombre: ${data.employeeName}` },
        { type: 'text', value: `RUT: ${data.rut}` },
        { type: 'separator' },
        { type: 'heading', value: 'Haberes' },
        { type: 'text', value: `Sueldo Base: $${data.baseSalary.toLocaleString('es-CL')}` },
        { type: 'text', value: `Horas Extra: $${data.overtime.toLocaleString('es-CL')}` },
        { type: 'text', value: `Bonos: $${data.bonuses.toLocaleString('es-CL')}` },
        { type: 'text', value: `Total Imponible: $${data.grossSalary.toLocaleString('es-CL')}` },
        { type: 'separator' },
        { type: 'heading', value: 'Descuentos' },
        { type: 'text', value: `AFP: $${data.afp.toLocaleString('es-CL')}` },
        { type: 'text', value: `Salud: $${data.health.toLocaleString('es-CL')}` },
        { type: 'text', value: `Impuesto: $${data.tax.toLocaleString('es-CL')}` },
        { type: 'text', value: `Total Descuentos: $${data.totalDeductions.toLocaleString('es-CL')}` },
        { type: 'separator' },
        { type: 'heading', value: `SUELDO LÍQUIDO: $${data.netSalary.toLocaleString('es-CL')}` },
      ],
    });
  }

  async generateWorkOrderPdf(data: {
    orderNumber: string;
    date: string;
    clientName: string;
    vehicleInfo: string;
    plate: string;
    km: number;
    items: Array<{ description: string; qty: number; unitPrice: number; total: number }>;
    laborTotal: number;
    partsTotal: number;
    total: number;
    technician: string;
    companyName: string;
  }): Promise<Buffer> {
    return this.generateDocument({
      title: `Orden de Trabajo N° ${data.orderNumber}`,
      subtitle: `Fecha: ${data.date}`,
      companyName: data.companyName,
      content: [
        { type: 'heading', value: 'Datos del Vehículo' },
        { type: 'text', value: `Cliente: ${data.clientName}` },
        { type: 'text', value: `Vehículo: ${data.vehicleInfo}` },
        { type: 'text', value: `Patente: ${data.plate} | Km: ${data.km.toLocaleString('es-CL')}` },
        { type: 'text', value: `Técnico: ${data.technician}` },
        { type: 'separator' },
        { type: 'heading', value: 'Detalle de Trabajos y Repuestos' },
        {
          type: 'table',
          columns: [
            { header: 'Descripción', key: 'description', width: 250 },
            { header: 'Cant.', key: 'qty', width: 50, align: 'center' },
            { header: 'P. Unit.', key: 'unitPrice', width: 80, align: 'right' },
            { header: 'Total', key: 'total', width: 80, align: 'right' },
          ],
          rows: data.items.map((i) => ({
            description: i.description,
            qty: i.qty,
            unitPrice: `$${i.unitPrice.toLocaleString('es-CL')}`,
            total: `$${i.total.toLocaleString('es-CL')}`,
          })),
        },
        { type: 'separator' },
        { type: 'text', value: `Mano de Obra: $${data.laborTotal.toLocaleString('es-CL')}` },
        { type: 'text', value: `Repuestos: $${data.partsTotal.toLocaleString('es-CL')}` },
        { type: 'heading', value: `TOTAL: $${data.total.toLocaleString('es-CL')}` },
      ],
    });
  }
}
