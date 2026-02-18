# SII Integration Status — TORQUE 360

Last updated: 2026-02-17

## Overview

The SII (Servicio de Impuestos Internos) module handles Chile's electronic invoicing (DTE) system.
Located in: `apps/api/src/modules/facturacion/`

## Fully Implemented

| Component | File | Notes |
|-----------|------|-------|
| DTE XML generation | `sii.service.ts` `buildDteXml()` | Full XML structure following SII schema (Encabezado, Detalle, Referencia, TED) |
| RUT validation | `sii.service.ts` `validateRut()` | Modulo 11 algorithm, fully functional |
| RUT formatting | `sii.service.ts` `formatRut()`, `cleanRut()` | Dot-dash formatting and cleaning |
| DTE type mapping | `sii.service.ts` `getDteTypeName()` | Types 33, 34, 39, 41, 52, 56, 61 |
| Payment condition mapping | `sii.service.ts` `mapPaymentCondition()` | Contado, 30/60/90 dias |
| XML escaping | `sii.service.ts` `escapeXml()` | Standard 5 XML entities |
| Invoice CRUD | `facturacion.service.ts` | Create, read, list (paginated + filtered), void, mark paid |
| Invoice from Work Order | `facturacion.service.ts` `createFromWorkOrder()` | Auto-builds items from parts + labor |
| Invoice from Quotation | `facturacion.service.ts` `createFromQuotation()` | Converts quotation items |
| Credit Notes (DTE 61) | `facturacion.service.ts` `createCreditNote()` | Anulacion (code 1), correction texto (2), correction monto (3) |
| CAF upload and parsing | `facturacion.service.ts` `uploadCaf()` | Parses XML for folio range, private key, expiration |
| CAF folio management | `facturacion.service.ts` `getNextFolio()` | Atomic increment, auto-exhaust detection |
| CAF status dashboard | `facturacion.service.ts` `getCafStatus()` | Remaining folios, percent used |
| Monthly totals | `facturacion.service.ts` `getMonthlyTotals()` | Aggregated by DTE type, excludes void/draft |
| DTOs with validation | `facturacion.dto.ts` | class-validator decorators, RUT regex, DTE type whitelist |
| Role-based access | `facturacion.controller.ts` | OPERATOR for basic ops, MANAGER for credit notes/SII/void, ADMIN for CAF |
| SII environment URLs | `sii.service.ts` | Testing (maullin) and production (palena) endpoints configured |

## Stubbed (Returns Mock Data) — BLOCKS PRODUCTION

| Component | File | TODO Location | What's Needed |
|-----------|------|---------------|---------------|
| DTE digital signature | `sii.service.ts` `signDte()` | Lines 126-138 | RSA-SHA1 XMLDSig: C14N canonicalization, SHA-1 digest of Documento element, RSA signing with private key, `<Signature>` element insertion |
| TED generation (Timbre) | `sii.service.ts` `buildTimbre()` | Lines 147-173 | Sign DD content with CAF private key, populate `<FRMA>` element. Required for PDF417 barcode on printed DTEs |
| SII submission | `sii.service.ts` `submitToSii()` | Lines 189-217 | Full auth flow: (1) get seed from CrSeed.jws, (2) sign seed for token via GetTokenFromSeed.jws, (3) multipart form upload to DTEUpload, (4) parse response XML for trackId |
| SII status check | `sii.service.ts` `checkStatus()` | Lines 225-250 | Authenticate with token, query consultaDte endpoint, parse response XML for acceptance/rejection status |

## Missing for Production

| Item | Priority | Details |
|------|----------|---------|
| Certificate management | CRITICAL | Load `.pfx` digital certificate from SII per-tenant. Currently `SII_CERT_PATH` and `SII_CERT_PASSWORD` env vars exist but are unused |
| Tenant-based emisor data | HIGH | `facturacion.service.ts` uses hardcoded `DEFAULT_EMISOR` (lines 27-35). Must pull from tenant settings table |
| Private key retrieval for signing | CRITICAL | `sendToSii()` passes empty string as private key (line 638). Must retrieve from CAF or tenant certificate |
| XML C14N library | HIGH | Need `xml-c14n` or equivalent for canonical XML before signing |
| PDF417 barcode generation | MEDIUM | TED must produce a barcode for printed DTE copies |
| DTE PDF generation | MEDIUM | Render invoice as PDF with barcode for email/download |
| SII token caching | LOW | Token can be reused for multiple uploads within its TTL |
| Retry/circuit-breaker for SII calls | MEDIUM | SII API can be slow/unreliable, especially in peak periods |
| Folio near-exhaustion alerts | LOW | Notify admin when CAF folios are running low |
| Libro de Compras/Ventas | MEDIUM | Monthly electronic book submission to SII (not yet started) |
