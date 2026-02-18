import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
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

  constructor(private readonly config: ConfigService) {}

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
   * Implements XMLDSig (RSA-SHA1) as required by SII:
   *   1. Canonicalizes the XML (C14N)
   *   2. Computes SHA-1 digest of the Documento element
   *   3. Signs the digest with RSA private key
   *   4. Inserts <Signature> element into the DTE
   */
  signDte(xml: string, privateKey: string): string {
    // Load private key from config if not provided directly
    let keyPem = privateKey;
    if (!keyPem) {
      const keyPath = this.config.get<string>('SII_PRIVATE_KEY_PATH', '');
      if (keyPath && fs.existsSync(keyPath)) {
        keyPem = fs.readFileSync(keyPath, 'utf8');
      } else {
        this.logger.error('No private key provided and SII_PRIVATE_KEY_PATH not configured');
        return xml;
      }
    }

    try {
      // Extract Documento element and its ID for the Reference URI
      const docIdMatch = xml.match(/<Documento\s+ID="([^"]+)"/);
      const docId = docIdMatch ? docIdMatch[1] : '';
      const docMatch = xml.match(/<Documento[^>]*>[\s\S]*?<\/Documento>/);
      if (!docMatch) {
        this.logger.error('No <Documento> element found in DTE XML');
        return xml;
      }

      // Canonicalize Documento and compute SHA-1 digest
      const canonDoc = this.canonicalizeXml(docMatch[0]);
      const digest = crypto
        .createHash('sha1')
        .update(canonDoc, 'latin1')
        .digest('base64');

      // Build SignedInfo
      const signedInfo =
        '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">' +
        '<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>' +
        '<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>' +
        `<Reference URI="#${docId}">` +
        '<Transforms><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms>' +
        '<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>' +
        `<DigestValue>${digest}</DigestValue>` +
        '</Reference></SignedInfo>';

      // RSA-SHA1 sign the canonicalized SignedInfo
      const signer = crypto.createSign('SHA1');
      signer.update(this.canonicalizeXml(signedInfo), 'latin1');
      const signatureValue = signer.sign(keyPem, 'base64');

      // Extract RSA components for KeyInfo
      const { modulus, exponent } = this.extractRsaComponents(keyPem);

      // Assemble XMLDSig Signature element
      const signatureXml =
        '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">' +
        signedInfo +
        `<SignatureValue>\n${signatureValue}\n</SignatureValue>` +
        '<KeyInfo><KeyValue><RSAKeyValue>' +
        `<Modulus>\n${modulus}\n</Modulus>` +
        `<Exponent>${exponent}</Exponent>` +
        '</RSAKeyValue></KeyValue></KeyInfo>' +
        '</Signature>';

      // Insert Signature before closing </DTE>
      return xml.replace('</DTE>', `${signatureXml}\n</DTE>`);
    } catch (error) {
      this.logger.error(`DTE signing failed: ${error.message}`);
      return xml;
    }
  }

  /**
   * Build TED (Timbre Electrónico Digital) structure.
   *
   * The TED contains a subset of document data signed with the CAF private key.
   * It's used to generate the PDF417 barcode on printed DTEs.
   * Builds the DD element and signs it with the CAF RSA private key.
   */
  buildTimbre(
    invoice: Invoice,
    items: InvoiceItem[],
    cafXml: string,
  ): string {
    const firstItemName = items.length > 0 ? items[0].itemName : '';
    const timestamp = new Date().toISOString().replace('Z', '');

    // Extract CAF inner content (DA element with authorization data)
    const cafContent = this.extractCafContent(cafXml);

    // Build DD (Datos del Documento) — the content that gets signed
    const dd =
      '<DD>' +
      `<RE>${this.cleanRut(invoice.emisorRut)}</RE>` +
      `<TD>${invoice.dteType}</TD>` +
      `<F>${invoice.folio}</F>` +
      `<FE>${invoice.issueDate}</FE>` +
      `<RR>${this.cleanRut(invoice.receptorRut)}</RR>` +
      `<RSR>${this.escapeXml(invoice.receptorRazonSocial.substring(0, 40))}</RSR>` +
      `<MNT>${Math.round(Number(invoice.montoTotal))}</MNT>` +
      `<IT1>${this.escapeXml(firstItemName.substring(0, 40))}</IT1>` +
      `<CAF version="1.0">${cafContent}</CAF>` +
      `<TSTED>${timestamp}</TSTED>` +
      '</DD>';

    // Sign DD with CAF private key (RSA-SHA1)
    let frmaValue = '';
    try {
      const cafPrivateKey = this.extractCafPrivateKey(cafXml);
      if (cafPrivateKey) {
        const signer = crypto.createSign('SHA1');
        signer.update(dd, 'latin1');
        frmaValue = signer.sign(cafPrivateKey, 'base64');
      } else {
        this.logger.warn('CAF private key not found in CAF XML');
      }
    } catch (error) {
      this.logger.error(`TED signing failed: ${error.message}`);
    }

    return (
      '<TED version="1.0">' +
      dd +
      `<FRMA algoritmo="SHA1withRSA">${frmaValue}</FRMA>` +
      '</TED>'
    );
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
   * Authenticates via digital certificate (.pfx) using the SII token flow:
   *   - Requests a seed from SII
   *   - Exchanges seed for auth token
   *   - Uploads DTE XML via multipart form
   */
  async submitToSii(
    signedXml: string,
    tenantRut: string,
    environment: 'testing' | 'production' = 'testing',
  ): Promise<{ trackId: string; success: boolean }> {
    const urls = this.SII_URLS[environment];
    this.logger.log(
      `[SII] Submitting DTE to ${environment}: ${urls.upload}`,
    );

    try {
      // Step 1: Get seed (semilla) from SII
      const seed = await this.getSeed(urls.seed);
      this.logger.log(`[SII] Obtained seed`);

      // Step 2: Get authentication token
      const keyPath = this.config.get<string>('SII_PRIVATE_KEY_PATH', '');
      if (!keyPath || !fs.existsSync(keyPath)) {
        throw new Error(
          'SII_PRIVATE_KEY_PATH not configured or file not found',
        );
      }
      const privateKey = fs.readFileSync(keyPath, 'utf8');
      const token = await this.getToken(urls.token, seed, privateKey);
      this.logger.log(`[SII] Obtained auth token`);

      // Step 3: Upload DTE with multipart form
      const cleanRut = this.cleanRut(tenantRut);
      const rutNum = cleanRut.slice(0, -1);
      const rutDv = cleanRut.slice(-1);

      const boundary = `----SIIBoundary${Date.now()}`;
      const body =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="rutSender"\r\n\r\n${rutNum}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="dvSender"\r\n\r\n${rutDv}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="rutCompany"\r\n\r\n${rutNum}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="dvCompany"\r\n\r\n${rutDv}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="archivo"; filename="dte.xml"\r\n` +
        `Content-Type: text/xml\r\n\r\n${signedXml}\r\n` +
        `--${boundary}--\r\n`;

      const response = await this.siiHttpPost(urls.upload, body, {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Cookie: `TOKEN=${token}`,
      });

      // Parse trackId from SII response XML
      const trackIdMatch = response.match(/<TRACKID>(\d+)<\/TRACKID>/i);
      if (trackIdMatch) {
        this.logger.log(`[SII] Received trackId: ${trackIdMatch[1]}`);
        return { trackId: trackIdMatch[1], success: true };
      }

      const errorMatch = response.match(/<ERROR>([^<]+)<\/ERROR>/i);
      const errorMsg = errorMatch?.[1] || response.substring(0, 300);
      this.logger.error(`[SII] Upload rejected: ${errorMsg}`);
      return { trackId: '', success: false };
    } catch (error) {
      this.logger.error(`[SII] Submission error: ${error.message}`);
      return { trackId: '', success: false };
    }
  }

  /**
   * Check the status of a previously submitted DTE.
   *
   * Queries the SII API with the trackId and parses the response
   * to extract acceptance/rejection status and error details.
   */
  async checkStatus(
    trackId: string,
    tenantRut: string,
    environment: 'testing' | 'production' = 'testing',
  ): Promise<{ status: string; detail: string; glosa: string }> {
    const urls = this.SII_URLS[environment];
    this.logger.log(`[SII] Checking status for trackId: ${trackId}`);

    // SII status code descriptions
    const statusDescriptions: Record<string, string> = {
      DOK: 'Documento recibido y aceptado por SII',
      SOK: 'Schema validado correctamente',
      DNK: 'Documento rechazado por SII',
      FAU: 'Error de autenticación',
      FAN: 'Archivo no encontrado',
      RSC: 'Rechazado por error de schema',
      RFR: 'Rechazado por error de firma',
      RPR: 'Aceptado con reparos',
      RCT: 'Rechazado por error en contenido',
      RCH: 'Rechazado por el receptor',
      '-11': 'En proceso de validación',
    };

    try {
      // Authenticate
      const seed = await this.getSeed(urls.seed);
      const keyPath = this.config.get<string>('SII_PRIVATE_KEY_PATH', '');
      if (!keyPath || !fs.existsSync(keyPath)) {
        throw new Error('SII_PRIVATE_KEY_PATH not configured');
      }
      const privateKey = fs.readFileSync(keyPath, 'utf8');
      const token = await this.getToken(urls.token, seed, privateKey);

      // Query status
      const cleanRut = this.cleanRut(tenantRut);
      const rutNum = cleanRut.slice(0, -1);
      const rutDv = cleanRut.slice(-1);

      const queryUrl =
        `${urls.query}?RutConsulta=${rutNum}&DvConsulta=${rutDv}` +
        `&TrackId=${trackId}`;

      const response = await this.siiHttpGet(queryUrl, {
        Cookie: `TOKEN=${token}`,
      });

      // Parse SII response
      const statusMatch = response.match(/<ESTADO>([^<]+)<\/ESTADO>/i);
      const glosaMatch = response.match(/<GLOSA>([^<]+)<\/GLOSA>/i);

      const status = statusMatch?.[1]?.trim() || 'UNKNOWN';
      const glosa = glosaMatch?.[1]?.trim() || '';

      return {
        status,
        detail: statusDescriptions[status] || `Estado SII: ${status}`,
        glosa: glosa || statusDescriptions[status] || '',
      };
    } catch (error) {
      this.logger.error(`[SII] Status check error: ${error.message}`);
      return {
        status: 'ERROR',
        detail: `Error de conexión: ${error.message}`,
        glosa: 'Error al consultar estado en SII',
      };
    }
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
    const cleaned = rut.replace(/[.\-\s]/g, '').toUpperCase();

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
    return rut.replace(/[.\-\s]/g, '').toUpperCase();
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

  // ===========================================================================
  // Private helpers — crypto, HTTP, XML parsing for SII integration
  // ===========================================================================

  /**
   * Simplified XML canonicalization (C14N) for SII.
   * Removes XML declarations, normalizes whitespace between tags.
   */
  private canonicalizeXml(xml: string): string {
    return xml
      .replace(/<\?xml[^?]*\?>/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  /**
   * Extract RSA modulus and exponent from a PEM private key.
   */
  private extractRsaComponents(
    privateKeyPem: string,
  ): { modulus: string; exponent: string } {
    try {
      const publicKey = crypto.createPublicKey(privateKeyPem);
      const jwk = publicKey.export({ format: 'jwk' }) as crypto.JsonWebKey;
      return {
        modulus: Buffer.from(jwk.n!, 'base64url').toString('base64'),
        exponent: Buffer.from(jwk.e!, 'base64url').toString('base64'),
      };
    } catch {
      this.logger.warn('Could not extract RSA components from private key');
      return { modulus: '', exponent: '' };
    }
  }

  /**
   * Extract CAF private key (RSASK) from CAF XML provided by SII.
   */
  private extractCafPrivateKey(cafXml: string): string | null {
    const match = cafXml.match(/<RSASK>([\s\S]*?)<\/RSASK>/);
    if (!match) return null;
    const key = match[1].trim();
    if (key.includes('-----BEGIN')) return key;
    return (
      '-----BEGIN RSA PRIVATE KEY-----\n' +
      key +
      '\n-----END RSA PRIVATE KEY-----'
    );
  }

  /**
   * Extract inner CAF content (DA authorization data) from CAF XML.
   */
  private extractCafContent(cafXml: string): string {
    const match = cafXml.match(/<CAF[^>]*>([\s\S]*?)<\/CAF>/);
    return match ? match[1].trim() : '';
  }

  /**
   * Get SII seed (semilla) for authentication.
   */
  private async getSeed(seedUrl: string): Promise<string> {
    const response = await this.siiHttpGet(seedUrl, {});
    const match = response.match(/<SEMILLA>(\d+)<\/SEMILLA>/);
    if (!match) {
      throw new Error(
        `Failed to get SII seed: ${response.substring(0, 200)}`,
      );
    }
    return match[1];
  }

  /**
   * Get SII authentication token by signing the seed.
   */
  private async getToken(
    tokenUrl: string,
    seed: string,
    privateKeyPem: string,
  ): Promise<string> {
    // Build getToken request XML with signed seed
    const seedXml =
      '<getToken><item><Semilla>' + seed + '</Semilla></item></getToken>';

    const digest = crypto
      .createHash('sha1')
      .update(seedXml, 'latin1')
      .digest('base64');

    const signer = crypto.createSign('SHA1');
    signer.update(seedXml, 'latin1');
    const signature = signer.sign(privateKeyPem, 'base64');

    const tokenRequest =
      '<?xml version="1.0"?>' +
      '<getToken>' +
      '<item><Semilla>' +
      seed +
      '</Semilla></item>' +
      '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">' +
      '<SignedInfo>' +
      '<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>' +
      '<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>' +
      '<Reference URI="">' +
      '<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>' +
      '<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>' +
      `<DigestValue>${digest}</DigestValue>` +
      '</Reference></SignedInfo>' +
      `<SignatureValue>${signature}</SignatureValue>` +
      '</Signature></getToken>';

    const response = await this.siiHttpPost(tokenUrl, tokenRequest, {
      'Content-Type': 'text/xml',
    });

    const tokenMatch = response.match(/<TOKEN>([^<]+)<\/TOKEN>/);
    if (!tokenMatch) {
      throw new Error(
        `Failed to get SII token: ${response.substring(0, 200)}`,
      );
    }
    return tokenMatch[1];
  }

  /**
   * HTTPS GET request to SII endpoints.
   */
  private async siiHttpGet(
    url: string,
    headers: Record<string, string>,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * HTTPS POST request to SII endpoints.
   */
  private async siiHttpPost(
    url: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}
