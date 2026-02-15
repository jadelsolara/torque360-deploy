import { Injectable, Logger } from '@nestjs/common';
import { Invoice } from '../../database/entities/invoice.entity';
import { InvoiceItem } from '../../database/entities/invoice-item.entity';

/**
 * SII (Servicio de Impuestos Internos) integration service.
 *
 * Handles DTE XML generation, digital signing, and communication
 * with Chile's electronic invoicing system.
 *
 * SII Environments:
 *   - Testing:    https://maullin.sii.cl
 *   - Production: https://palena.sii.cl
 */
@Injectable()
export class SiiService {
  private readonly logger = new Logger(SiiService.name);

  // SII environment URLs
  private readonly SII_URLS = {
    testing: {
      upload: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload',
      query: 'https://maullin.sii.cl/cgi_dte/consultaDte',
      token: 'https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws',
      seed: 'https://maullin.sii.cl/DTEWS/CrSeed.jws',
    },
    production: {
      upload: 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload',
      query: 'https://palena.sii.cl/cgi_dte/consultaDte',
      token: 'https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws',
      seed: 'https://palena.sii.cl/DTEWS/CrSeed.jws',
    },
  };

  /**
   * Build full DTE XML following SII schema.
   * Structure: DTE > Documento > Encabezado + Detalle[] + Referencia[]
   */
  buildDteXml(invoice: Invoice, items: InvoiceItem[]): string {
    const dteName = this.getDteTypeName(invoice.dteType);
    const detalleXml = items
      .map(
        (item) => `
      <Detalle>
        <NroLinDet>${item.lineNumber}</NroLinDet>
        ${item.itemCode ? `<CdgItem><TpoCdg>INT1</TpoCdg><VlrCdg>${this.escapeXml(item.itemCode)}</VlrCdg></CdgItem>` : ''}
        ${item.isExempt ? '<IndExe>1</IndExe>' : ''}
        <NmbItem>${this.escapeXml(item.itemName)}</NmbItem>
        ${item.itemDescription ? `<DscItem>${this.escapeXml(item.itemDescription)}</DscItem>` : ''}
        <QtyItem>${item.quantity}</QtyItem>
        ${item.unitMeasure ? `<UnmdItem>${this.escapeXml(item.unitMeasure)}</UnmdItem>` : ''}
        <PrcItem>${item.unitPrice}</PrcItem>
        ${Number(item.discountPct) > 0 ? `<DescuentoPct>${item.discountPct}</DescuentoPct><DescuentoMonto>${item.discountAmount}</DescuentoMonto>` : ''}
        ${Number(item.surchargePct) > 0 ? `<RecargoPct>${item.surchargePct}</RecargoPct><RecargoMonto>${item.surchargeAmount}</RecargoMonto>` : ''}
        <MontoItem>${item.totalLine}</MontoItem>
      </Detalle>`,
      )
      .join('');

    // Build reference section (for Notas de Crédito/Débito)
    let referenciaXml = '';
    if (invoice.refDteType) {
      referenciaXml = `
      <Referencia>
        <NroLinRef>1</NroLinRef>
        <TpoDocRef>${invoice.refDteType}</TpoDocRef>
        <FolioRef>${invoice.refFolio}</FolioRef>
        <FchRef>${invoice.refFecha}</FchRef>
        ${invoice.refCodigo ? `<CodRef>${invoice.refCodigo}</CodRef>` : ''}
        ${invoice.refRazon ? `<RazonRef>${this.escapeXml(invoice.refRazon)}</RazonRef>` : ''}
      </Referencia>`;
    }

    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
  <Documento ID="T${invoice.dteType}F${invoice.folio}">
    <Encabezado>
      <IdDoc>
        <TipoDTE>${invoice.dteType}</TipoDTE>
        <Folio>${invoice.folio}</Folio>
        <FchEmis>${invoice.issueDate}</FchEmis>
        ${invoice.paymentCondition ? `<FmaPago>${this.mapPaymentCondition(invoice.paymentCondition)}</FmaPago>` : ''}
        ${invoice.dueDate ? `<FchVenc>${invoice.dueDate}</FchVenc>` : ''}
      </IdDoc>
      <Emisor>
        <RUTEmisor>${this.formatRut(invoice.emisorRut)}</RUTEmisor>
        <RznSoc>${this.escapeXml(invoice.emisorRazonSocial)}</RznSoc>
        <GiroEmis>${this.escapeXml(invoice.emisorGiro)}</GiroEmis>
        ${invoice.emisorActividadEconomica ? `<Acteco>${invoice.emisorActividadEconomica}</Acteco>` : ''}
        <DirOrigen>${this.escapeXml(invoice.emisorDireccion)}</DirOrigen>
        <CmnaOrigen>${this.escapeXml(invoice.emisorComuna)}</CmnaOrigen>
        <CiudadOrigen>${this.escapeXml(invoice.emisorCiudad)}</CiudadOrigen>
      </Emisor>
      <Receptor>
        <RUTRecep>${this.formatRut(invoice.receptorRut)}</RUTRecep>
        <RznSocRecep>${this.escapeXml(invoice.receptorRazonSocial)}</RznSocRecep>
        ${invoice.receptorGiro ? `<GiroRecep>${this.escapeXml(invoice.receptorGiro)}</GiroRecep>` : ''}
        ${invoice.receptorContacto ? `<Contacto>${this.escapeXml(invoice.receptorContacto)}</Contacto>` : ''}
        ${invoice.receptorDireccion ? `<DirRecep>${this.escapeXml(invoice.receptorDireccion)}</DirRecep>` : ''}
        ${invoice.receptorComuna ? `<CmnaRecep>${this.escapeXml(invoice.receptorComuna)}</CmnaRecep>` : ''}
        ${invoice.receptorCiudad ? `<CiudadRecep>${this.escapeXml(invoice.receptorCiudad)}</CiudadRecep>` : ''}
      </Receptor>
      <Totales>
        <MntNeto>${Math.round(Number(invoice.montoNeto))}</MntNeto>
        ${Number(invoice.montoExento) > 0 ? `<MntExe>${Math.round(Number(invoice.montoExento))}</MntExe>` : ''}
        <TasaIVA>${Number(invoice.tasaIva)}</TasaIVA>
        <IVA>${Math.round(Number(invoice.iva))}</IVA>
        <MntTotal>${Math.round(Number(invoice.montoTotal))}</MntTotal>
      </Totales>
    </Encabezado>
    ${detalleXml}
    ${referenciaXml}
    <TED version="1.0">
      <!-- Timbre Electronico Digital - populated after signing -->
    </TED>
    <TmstFirma>${new Date().toISOString().replace('Z', '')}</TmstFirma>
  </Documento>
</DTE>`;

    return xml;
  }

  /**
   * Sign the DTE XML with the tenant's RSA private key.
   *
   * TODO: Implement full RSA-SHA1 XML digital signature using node:crypto.
   * The signature must follow the XMLDSig standard required by SII.
   * Steps:
   *   1. Canonicalize the XML (C14N)
   *   2. Compute SHA-1 digest of the Documento element
   *   3. Sign the digest with RSA private key
   *   4. Insert <Signature> element into the DTE
   */
  signDte(xml: string, privateKey: string): string {
    // TODO: Implement RSA-SHA1 XML digital signature
    // For now, return the unsigned XML
    this.logger.warn('DTE signing not yet implemented — returning unsigned XML');
    return xml;
  }

  /**
   * Build TED (Timbre Electrónico Digital) structure.
   *
   * The TED contains a subset of document data signed with the CAF private key.
   * It's used to generate the PDF417 barcode on printed DTEs.
   *
   * TODO: Implement full TED generation with RSA signature using CAF private key.
   */
  buildTimbre(
    invoice: Invoice,
    items: InvoiceItem[],
    cafXml: string,
  ): string {
    const firstItemName = items.length > 0 ? items[0].itemName : '';

    const ted = `<TED version="1.0">
  <DD>
    <RE>${this.cleanRut(invoice.emisorRut)}</RE>
    <TD>${invoice.dteType}</TD>
    <F>${invoice.folio}</F>
    <FE>${invoice.issueDate}</FE>
    <RR>${this.cleanRut(invoice.receptorRut)}</RR>
    <RSR>${this.escapeXml(invoice.receptorRazonSocial.substring(0, 40))}</RSR>
    <MNT>${Math.round(Number(invoice.montoTotal))}</MNT>
    <IT1>${this.escapeXml(firstItemName.substring(0, 40))}</IT1>
    <FRMA algoritmo="SHA1withRSA"><!-- TODO: RSA signature --></FRMA>
  </DD>
</TED>`;

    // TODO: Sign DD content with CAF private key and populate FRMA
    this.logger.warn('TED signing not yet implemented');
    return ted;
  }

  /**
   * Submit signed DTE XML to SII.
   *
   * Flow:
   *   1. Get seed (semilla) from SII
   *   2. Sign seed to get authentication token
   *   3. Upload DTE using the token
   *   4. Return trackId for status checking
   *
   * TODO: Implement real SII API calls with certificate authentication.
   * Requires:
   *   - Digital certificate (.pfx) from SII
   *   - Token-based authentication flow
   *   - Multipart form upload for DTE XML
   */
  async submitToSii(
    signedXml: string,
    tenantRut: string,
    environment: 'testing' | 'production' = 'testing',
  ): Promise<{ trackId: string; success: boolean }> {
    const urls = this.SII_URLS[environment];
    this.logger.log(
      `[SII] Submitting DTE to ${environment} environment: ${urls.upload}`,
    );
    this.logger.log(`[SII] Tenant RUT: ${tenantRut}`);

    // TODO: Implement real SII submission flow:
    // 1. const seed = await this.getSeed(urls.seed);
    // 2. const token = await this.getToken(urls.token, seed, certificate);
    // 3. const response = await this.uploadDte(urls.upload, signedXml, token, tenantRut);
    // 4. Parse response XML for trackId

    // Mock response for development
    const mockTrackId = `MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.logger.warn(
      `[SII] Using mock trackId: ${mockTrackId} — implement real SII submission`,
    );

    return {
      trackId: mockTrackId,
      success: true,
    };
  }

  /**
   * Check the status of a previously submitted DTE.
   *
   * TODO: Implement real SII status check API call.
   * The response includes acceptance/rejection status and any error details.
   */
  async checkStatus(
    trackId: string,
    tenantRut: string,
    environment: 'testing' | 'production' = 'testing',
  ): Promise<{ status: string; detail: string; glosa: string }> {
    const urls = this.SII_URLS[environment];
    this.logger.log(
      `[SII] Checking status for trackId: ${trackId} at ${urls.query}`,
    );

    // TODO: Implement real SII status check:
    // 1. Authenticate with token
    // 2. Query consultaDte endpoint with trackId and RUT
    // 3. Parse response XML for status

    // Mock response for development
    this.logger.warn(
      `[SII] Using mock status response — implement real SII status check`,
    );

    return {
      status: 'DOK',
      detail: 'Documento recibido y aceptado por SII',
      glosa: 'Aceptado',
    };
  }

  /**
   * Validate a Chilean RUT using the modulo 11 algorithm.
   * Fully implemented — not mocked.
   *
   * @param rut - RUT string in any format (12.345.678-9, 12345678-9, 123456789)
   * @returns true if the RUT is valid
   */
  validateRut(rut: string): boolean {
    if (!rut || typeof rut !== 'string') return false;

    // Clean the RUT: remove dots, dashes, spaces
    const cleaned = rut.replace(/[\.\-\s]/g, '').toUpperCase();

    if (cleaned.length < 2) return false;

    // Split into body and verifier
    const body = cleaned.slice(0, -1);
    const providedVerifier = cleaned.slice(-1);

    // Body must be all digits
    if (!/^\d+$/.test(body)) return false;

    // Calculate the verification digit using modulo 11
    let sum = 0;
    let multiplier = 2;

    // Iterate body digits from right to left
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i], 10) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = 11 - (sum % 11);
    let expectedVerifier: string;

    if (remainder === 11) {
      expectedVerifier = '0';
    } else if (remainder === 10) {
      expectedVerifier = 'K';
    } else {
      expectedVerifier = remainder.toString();
    }

    return providedVerifier === expectedVerifier;
  }

  /**
   * Format a RUT with dots and dash: 12.345.678-9
   */
  formatRut(rut: string): string {
    const cleaned = this.cleanRut(rut);
    if (cleaned.length < 2) return rut;

    const body = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1);

    // Add dots from right to left every 3 digits
    let formatted = '';
    for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
      if (count > 0 && count % 3 === 0) {
        formatted = '.' + formatted;
      }
      formatted = body[i] + formatted;
    }

    return `${formatted}-${verifier}`;
  }

  /**
   * Clean RUT removing all formatting (dots, dashes, spaces).
   */
  cleanRut(rut: string): string {
    return rut.replace(/[\.\-\s]/g, '').toUpperCase();
  }

  /**
   * Get human-readable DTE type name in Spanish.
   */
  getDteTypeName(dteType: number): string {
    const names: Record<number, string> = {
      33: 'Factura Electrónica',
      34: 'Factura Exenta Electrónica',
      39: 'Boleta Electrónica',
      41: 'Boleta Exenta Electrónica',
      52: 'Guía de Despacho Electrónica',
      56: 'Nota de Débito Electrónica',
      61: 'Nota de Crédito Electrónica',
    };
    return names[dteType] || `DTE Tipo ${dteType}`;
  }

  /**
   * Map internal payment condition to SII FmaPago code.
   * 1 = Contado, 2 = Crédito, 3 = Sin costo
   */
  private mapPaymentCondition(condition: string): number {
    switch (condition) {
      case 'contado':
        return 1;
      case '30dias':
      case '60dias':
      case '90dias':
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Escape special XML characters.
   */
  private escapeXml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
