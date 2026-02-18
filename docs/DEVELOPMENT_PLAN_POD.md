# TORQUE 360 — Plan de Desarrollo en Pod

```
DOCUMENTO:    Development Plan (Pod-First)
VERSION:      1.0
FECHA:        2026-02-17
POD:          RTX PRO 6000 Blackwell 98GB | 393TB libres
ESTADO:       Pendiente ejecución
CODEBASE:     70-80% construido (27 módulos, 43 entidades, 26 páginas)
PRESUPUESTO:  ~$20 USD (~8h pod a $2.49/h)
```

---

## POR QUÉ TODO EN EL POD

1. **RTX PRO 6000 Blackwell 98GB** — Desperdiciado si solo hace embeddings de GenieOS
2. **393TB storage** — El local tiene limitaciones de disco
3. **Entorno aislado** — No ensucia la máquina local
4. **PostgreSQL + Redis + Node** — Todo corre en el pod como staging real
5. **Entrenamiento AI** — TORQUE IQ necesita fine-tuning que solo el GPU puede hacer rápido
6. **Acceso remoto** — Se puede trabajar desde cualquier lado vía SSH

---

## ESTADO ACTUAL DEL CODEBASE

### Lo que YA ESTÁ CONSTRUIDO (15 módulos production-ready)

| Módulo | LOC Service | Estado |
|--------|-------------|--------|
| Auth (JWT + MFA) | ~300 | ✅ Completo |
| Work Orders (OT) | 607 | ✅ Completo — CRUD + workflow + stats |
| Inventario + CPP | 228 | ✅ Completo — Cost tracking integrado |
| Facturación SII | 920 | ✅ Completo — DTE, CAF, XML, notas crédito |
| WMS (Bodega) | 502 | ✅ Completo — Ubicaciones + movimientos |
| Cotizaciones | ~250 | ✅ Completo — Pipeline + conversión |
| Sales Pipeline | ~300 | ✅ Cotización → OT → Despacho → Factura |
| Clientes | ~200 | ✅ CRUD + cuentas por cobrar |
| RRHH + Nómina | ~350 | ✅ AFP, previsión, impuestos chilenos |
| Importaciones | ~400 | ✅ Landed cost (FOB→CIF→Arancel→Final) |
| Dashboard | 167 | ✅ KPIs real-time + notificaciones |
| Audit Trail | ~150 | ✅ SHA-256 hash chain |
| Trazabilidad | ~150 | ✅ Hash chain anti-falsificación |
| Automation | ~200 | ✅ Motor de reglas + triggers |
| Portal Clientes | ~250 | ✅ JWT + tickets + tracking OT |

### Lo que NECESITA PULIR (10 módulos parciales)

| Módulo | Qué falta |
|--------|-----------|
| Vehículos | Historial servicio enriquecido, alertas mantención |
| Proveedores | Workflow pagos completo, aging report |
| Tenants | Gestión planes, límites uso, billing |
| Users | Invitaciones, reset password, roles granulares |
| Aprobaciones | UI integration, notificaciones push |
| Command Center | Cross-tenant analytics, alertas admin |
| Companies/360 | Vista consolidada holding |
| Onboarding | Wizard UI, datos demo auto-seed |
| Reportes | Generadores PDF reales (no solo queue) |
| Backup | Automatización + upload R2 |

### Lo que FALTA CONSTRUIR

| Feature | Prioridad | Descripción |
|---------|-----------|-------------|
| **TORQUE IQ** | ALTA | Motor AI de inteligencia de negocios |
| **TORQUE Network** | ALTA | Marketplace B2B entre actores |
| **Tests** | ALTA | Unit + integration tests |
| **SII XML Signing** | ALTA | Firma digital real (actualmente stub) |
| **Meilisearch** | MEDIA | Full-text search conectado |
| **Email** | MEDIA | SMTP notificaciones automáticas |
| **File Uploads** | MEDIA | R2/S3 para documentos, fotos, PDFs |
| **Multi-actor** | MEDIA | Módulos DyP + Importador (Secciones 13-15 del IQ spec) |

---

## FASE 0: BOOTSTRAP POD (30 min)

### 0.1 Instalar dependencias sistema

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# pnpm
npm install -g pnpm@9.15.0

# PostgreSQL 17
apt-get install -y postgresql-17 postgresql-client-17
pg_ctlcluster 17 main start

# Redis 7
apt-get install -y redis-server
redis-server --daemonize yes

# Meilisearch
curl -L https://install.meilisearch.com | sh
./meilisearch --master-key="torque360_dev" --env="development" &

# Herramientas
apt-get install -y git jq curl
```

### 0.2 Configurar PostgreSQL

```bash
sudo -u postgres psql <<EOF
CREATE USER torque360 WITH PASSWORD 'torque360_dev';
CREATE DATABASE torque360 OWNER torque360;
CREATE DATABASE torque360_test OWNER torque360;
ALTER USER torque360 CREATEDB;
\c torque360
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF
```

### 0.3 Subir codebase + instalar

```bash
# Desde local
rsync -avz --exclude node_modules --exclude .next --exclude dist \
  -e "ssh -p 18379 -i ~/.ssh/id_ed25519" \
  ~/Desktop/Proyectos/Torque360/ \
  root@216.81.151.42:/workspace/torque360/

# En el pod
cd /workspace/torque360
pnpm install
```

### 0.4 Configurar .env

```bash
cp .env.example .env
# Editar con valores del pod:
# DATABASE_URL=postgresql://torque360:torque360_dev@localhost:5432/torque360
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=$(openssl rand -hex 32)
# JWT_REFRESH_SECRET=$(openssl rand -hex 32)
# MEILISEARCH_URL=http://localhost:7700
# MEILISEARCH_KEY=torque360_dev
# API_PORT=3001
# CORS_ORIGIN=http://localhost:3000
```

### 0.5 Inicializar DB + levantar

```bash
# Ejecutar schema
psql -U torque360 -d torque360 -f apps/api/src/database/init.sql
psql -U torque360 -d torque360 -f apps/api/src/database/migrations/001_expanded_modules.sql

# Levantar API + Web
pnpm dev  # Turborepo levanta ambos
```

**Verificación:** `curl http://localhost:3001/api/health` → 200 OK

---

## FASE 1: TESTS + ESTABILIZACIÓN (2h)

### 1.1 Tests unitarios servicios críticos

```
tests/
├── auth.service.spec.ts          — Register, login, JWT, refresh
├── work-orders.service.spec.ts   — CRUD, status transitions, stats
├── inventory.service.spec.ts     — Stock, CPP, ajustes
├── facturacion.service.spec.ts   — DTE generation, XML, CAF
├── wms.service.spec.ts           — Movimientos, stock por bodega
├── sales-pipeline.service.spec.ts — Flujo completo cotización→factura
├── imports.service.spec.ts       — Landed cost calculation
└── rrhh.service.spec.ts          — Nómina chilena (AFP, impuestos)
```

**Patrón por test:**
- Mock de TypeORM repository
- Test happy path + edge cases
- Validar cálculos financieros (IVA 19%, AFP, landed cost)

### 1.2 Tests de integración (E2E)

```
tests/e2e/
├── auth.e2e.ts           — Register tenant → login → get profile
├── work-order-flow.e2e.ts — Crear cliente → vehículo → OT → completar
├── sales-pipeline.e2e.ts  — Cotización → aprobar → OT → despacho → factura
├── inventory-wms.e2e.ts   — Recibir stock → mover → despachar a OT
└── import-flow.e2e.ts     — Crear importación → calcular landed cost → recibir
```

### 1.3 Completar módulos parciales

**Prioridad por impacto:**

1. **Users** — Password reset + invitaciones email
2. **Tenants** — Planes (starter/professional/enterprise), límites, upgrade flow
3. **Vehículos** — Alertas mantención por km, historial servicio enriquecido
4. **Proveedores** — Aging report cuentas por pagar, workflow pago parcial
5. **Reportes** — Generador PDF real (factura, OT, cotización, estado cuenta)
6. **Onboarding** — Wizard con datos demo (10 clientes, 20 vehículos, 5 OTs, inventario base)

---

## FASE 2: TORQUE IQ — AI ENGINE (3h)

### 2.1 Arquitectura en el Pod

```
/workspace/torque360/
├── apps/
│   ├── api/          ← NestJS (ya existe)
│   └── iq/           ← NUEVO: TORQUE IQ Service
│       ├── main.py           — FastAPI server (puerto 8500)
│       ├── engine/
│       │   ├── advisor.py    — Motor principal de recomendaciones
│       │   ├── benchmarks.py — Comparación con red/industria
│       │   ├── predictor.py  — Predicciones (demanda, flujo caja, estacionalidad)
│       │   ├── alerts.py     — Detección anomalías
│       │   └── ipat.py       — Índice Precios Automotriz TORQUE
│       ├── models/
│       │   ├── torque-iq-lora/  — Fine-tuned model
│       │   └── embeddings/      — Vector store
│       ├── training/
│       │   ├── generate_training_data.py  — Genera pares pregunta/respuesta
│       │   ├── finetune.py                — LoRA fine-tune en GPU
│       │   └── evaluate.py                — Benchmark del modelo
│       └── requirements.txt
```

### 2.2 Datos de entrenamiento TORQUE IQ

**Fuentes:**
1. `docs/TORQUE_IQ_ADVISOR.md` (117KB) — 15 secciones de spec
2. `docs/ARCHITECTURE.md` (72KB) — Arquitectura completa
3. `docs/COMPETITIVE_LANDSCAPE.md` (15KB) — Posicionamiento
4. `docs/TORQUE360_AI_TRAINING.md` (15KB) — Training data existente
5. `docs/TORQUE_FINANCIALS.md` — Modelo de negocio
6. `packages/shared/src/types/` — Esquema de datos
7. `apps/api/src/database/init.sql` + `001_expanded_modules.sql` — Schema DB completo

**Categorías de training:**

| Categoría | Ejemplos | Pares Q&A |
|-----------|----------|-----------|
| Diagnóstico de negocio | "Tu margen cayó 12% esta semana" | ~200 |
| Recomendaciones pricing | "3 proveedores tienen stock más barato" | ~150 |
| Predicción demanda | "Frenos suben 30% en marzo-abril" | ~100 |
| Benchmark red | "Tu taller factura 15% bajo el promedio" | ~100 |
| Alertas inventario | "Stock crítico: 3 items bajo mínimo" | ~80 |
| Gestión importaciones | "El landed cost subió por flete +20%" | ~80 |
| Flujo caja | "En 15 días necesitas $2M para nómina" | ~80 |
| Análisis clientes | "Pedro Muñoz no viene hace 4 meses" | ~60 |
| IPAT (índice precios) | "Pastillas Bosch subieron 8% en la red" | ~60 |
| Multi-actor (DyP) | "Distribuidor X tiene mejor precio FOB" | ~50 |
| Multi-actor (Importador) | "Demanda de filtros creció 25% en zona" | ~50 |
| Onboarding IQ | "Para tu taller de 3 técnicos, recomiendo..." | ~40 |
| Modular sales | "No necesitas el módulo WMS si tienes <50 SKUs" | ~40 |
| Jerarquía roles | "Como Jefe de Taller, tu foco debería ser..." | ~40 |

**Total estimado: ~1,130 pares de entrenamiento**

### 2.3 Pipeline de entrenamiento

```python
# Paso 1: Generar datos desde docs + schema
python3 training/generate_training_data.py \
  --docs /workspace/torque360/docs/ \
  --schema /workspace/torque360/apps/api/src/database/ \
  --output /workspace/torque360/apps/iq/training/data/torque_iq_training.jsonl

# Paso 2: Fine-tune LoRA en GPU (RTX PRO 6000 = ~15 min)
python3 training/finetune.py \
  --base-model meta-llama/Llama-3.2-3B-Instruct \
  --data training/data/torque_iq_training.jsonl \
  --output models/torque-iq-lora/ \
  --epochs 3 \
  --batch-size 8 \
  --lora-r 16 \
  --lora-alpha 32

# Paso 3: Evaluar
python3 training/evaluate.py \
  --model models/torque-iq-lora/ \
  --test-set training/data/test_set.jsonl
```

### 2.4 API de TORQUE IQ

```python
# FastAPI endpoints (puerto 8500)
POST /iq/analyze          — Análisis de datos del taller
POST /iq/recommend        — Recomendación accionable
POST /iq/predict          — Predicción (demanda, flujo, etc.)
POST /iq/benchmark        — Comparar con red/industria
POST /iq/alert            — Verificar anomalías
GET  /iq/ipat             — Índice de precios actual
POST /iq/chat             — Chat conversacional con IQ
```

**Integración con NestJS API:**
```typescript
// apps/api/src/modules/iq/iq.service.ts
// Llama a FastAPI IQ service vía HTTP interno
// NestJS maneja auth + tenant isolation
// IQ service solo recibe datos ya filtrados por tenant
```

---

## FASE 3: TORQUE NETWORK — B2B MARKETPLACE (2h)

### 3.1 Schema adicional

```sql
-- Catálogo compartido (lo que cada actor publica en la red)
CREATE TABLE network_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_type VARCHAR(20) NOT NULL, -- 'sstt', 'dyp', 'importador'
  item_type VARCHAR(50) NOT NULL, -- 'part', 'service', 'import_offer'
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  brand VARCHAR(100),
  part_number VARCHAR(100),
  oem_number VARCHAR(100),
  price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'CLP',
  min_quantity DECIMAL(10,2) DEFAULT 1,
  stock_available DECIMAL(10,2),
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solicitudes de cotización en red
CREATE TABLE network_rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_tenant_id UUID NOT NULL REFERENCES tenants(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  target_actor_types VARCHAR(20)[] DEFAULT '{}',
  target_regions VARCHAR(100)[] DEFAULT '{}',
  deadline TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'open',
  responses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Respuestas a RFQs
CREATE TABLE network_rfq_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES network_rfqs(id),
  responder_tenant_id UUID NOT NULL REFERENCES tenants(id),
  items JSONB NOT NULL DEFAULT '[]',
  total_price DECIMAL(14,2),
  delivery_days INTEGER,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transacciones entre actores
CREATE TABLE network_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_tenant_id UUID NOT NULL REFERENCES tenants(id),
  seller_tenant_id UUID NOT NULL REFERENCES tenants(id),
  listing_id UUID REFERENCES network_listings(id),
  rfq_response_id UUID REFERENCES network_rfq_responses(id),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(14,2),
  commission_rate DECIMAL(5,4) DEFAULT 0.03,
  commission_amount DECIMAL(12,2),
  total DECIMAL(14,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reputación actores
CREATE TABLE network_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES network_transactions(id),
  rater_tenant_id UUID NOT NULL REFERENCES tenants(id),
  rated_tenant_id UUID NOT NULL REFERENCES tenants(id),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  delivery_score INTEGER CHECK (delivery_score BETWEEN 1 AND 5),
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Módulo NestJS

```
apps/api/src/modules/network/
├── network.module.ts
├── network.controller.ts      — Endpoints CRUD listings, RFQs, transactions
├── network.service.ts          — Lógica de marketplace
├── network-search.service.ts   — Búsqueda en Meilisearch
├── network.dto.ts              — Validaciones
└── network.gateway.ts          — WebSocket para notificaciones real-time
```

**Endpoints:**
```
# Listings
POST   /api/network/listings          — Publicar repuesto/servicio
GET    /api/network/listings          — Buscar en marketplace (con filtros)
GET    /api/network/listings/:id      — Detalle listing
PATCH  /api/network/listings/:id      — Actualizar

# RFQs
POST   /api/network/rfqs              — Crear solicitud de cotización
GET    /api/network/rfqs              — Listar RFQs activos
POST   /api/network/rfqs/:id/respond  — Responder a RFQ
GET    /api/network/rfqs/:id/responses — Ver respuestas

# Transactions
POST   /api/network/transactions      — Iniciar transacción
PATCH  /api/network/transactions/:id  — Actualizar estado
POST   /api/network/transactions/:id/rate — Calificar

# Analytics
GET    /api/network/stats             — Estadísticas de la red
GET    /api/network/ipat              — Índice precios (via IQ service)
```

---

## FASE 4: FRONTEND COMPLETO (2h)

### 4.1 Páginas que necesitan completar

| Página | Estado | Qué falta |
|--------|--------|-----------|
| `/dashboard` | 80% | Conectar KPIs reales, gráficos |
| `/ordenes` | 70% | Workflow visual, asignar técnico drag&drop |
| `/cotizaciones` | 70% | Preview PDF, envío email |
| `/facturacion` | 60% | Vista DTE, preview XML, tracking SII |
| `/inventario` | 70% | Alertas stock bajo, gráfico rotación |
| `/bodega` | 60% | Mapa visual ubicaciones, picking list |
| `/clientes` | 70% | Timeline interacciones, saldo cuenta |
| `/vehiculos` | 60% | Historial servicio, alertas km |
| `/importaciones` | 60% | Timeline embarque, cálculo landed cost visual |
| `/rrhh` | 50% | Liquidación de sueldo, calendario |
| `/trazabilidad` | 50% | Visualización cadena hash |
| `/command-center` | 40% | Gráficos cross-tenant, mapa calor |
| **`/network`** | **0%** | **NUEVO — Marketplace B2B completo** |
| **`/iq`** | **0%** | **NUEVO — Dashboard TORQUE IQ** |

### 4.2 Componentes nuevos críticos

```
apps/web/src/components/
├── network/
│   ├── ListingCard.tsx        — Card de repuesto en marketplace
│   ├── RFQForm.tsx            — Formulario solicitud cotización red
│   ├── NetworkSearch.tsx      — Buscador con filtros
│   └── TransactionTimeline.tsx — Estado transacción
├── iq/
│   ├── IQDashboard.tsx        — Panel principal IQ
│   ├── IQChat.tsx             — Chat con TORQUE IQ
│   ├── IQAlert.tsx            — Tarjeta de alerta
│   ├── IQBenchmark.tsx        — Comparativo con red
│   └── IPATChart.tsx          — Gráfico índice precios
├── reports/
│   ├── InvoicePDF.tsx         — Preview factura
│   ├── WorkOrderPDF.tsx       — Preview OT
│   └── QuotationPDF.tsx       — Preview cotización
└── shared/
    ├── DataTable.tsx          — Tabla reutilizable con paginación
    ├── StatusBadge.tsx        — Badge de estado (OT, cotización, etc.)
    ├── CurrencyDisplay.tsx    — Formato CLP/USD
    └── DateRangePicker.tsx    — Selector rango fechas
```

---

## FASE 5: ENTRENAMIENTO TORQUE IQ (1h GPU)

### 5.1 Generación de datos

**Script:** `apps/iq/training/generate_training_data.py`

**Proceso:**
1. Parsear TORQUE_IQ_ADVISOR.md → extraer escenarios de las 15 secciones
2. Parsear COMPETITIVE_LANDSCAPE.md → datos de posicionamiento
3. Parsear schema SQL → entender estructura de datos
4. Generar pares instruction/response en formato:

```jsonl
{"instruction": "Mi margen en frenos bajó esta semana. ¿Qué está pasando?", "input": "Margen frenos semana actual: 28%. Semana anterior: 40%. Costo pastillas Bosch: +15%. 3 proveedores en zona con stock anterior.", "output": "Tu margen en frenos cayó 12 puntos (de 40% a 28%). La causa: el costo de pastillas Bosch subió 15% esta semana en toda la red. Pero hay buenas noticias — detecté 3 proveedores en tu zona que todavía tienen stock al precio anterior. Recomendación: (1) Cotiza con estos proveedores antes de que actualicen precios, (2) Ajusta tu precio de venta un 5% para proteger margen sin perder clientes, (3) Considera alternativas Brembo que están 8% más baratas este mes."}

{"instruction": "¿Cuántos técnicos necesito para mi volumen?", "input": "OTs mensuales: 120. Horas promedio por OT: 3.2. Días hábiles: 22. Técnicos actuales: 3.", "output": "Con 120 OTs/mes × 3.2h = 384 horas de trabajo. Tus 3 técnicos dan 22 días × 8h × 3 = 528 horas disponibles. Estás al 73% de capacidad — zona sana. Si creces a 150 OTs/mes (25% más), necesitarás un 4to técnico. Talleres similares en la red contratan el 4to técnico al llegar a 80% de capacidad para no perder calidad. Mi recomendación: empieza a buscar cuando llegues a 135 OTs/mes (90% capacidad)."}
```

**Categorías expandidas (con entrenamiento incluido):**

| Categoría | Subcategorías | Pares |
|-----------|---------------|-------|
| Diagnóstico negocio | Margen, revenue, horas, eficiencia | 200 |
| Pricing intelligence | Comparar precios red, sugerir ajustes | 150 |
| Predicción demanda | Estacional, tendencia, evento | 100 |
| Benchmark red | Comparar con talleres similares | 100 |
| Inventario inteligente | Stock óptimo, rotación, obsolescencia | 80 |
| Importaciones | Landed cost, timing, alternativas | 80 |
| Flujo de caja | Proyección, alertas, recomendaciones | 80 |
| CRM inteligente | Clientes inactivos, retención, upsell | 60 |
| IPAT | Índice precios, tendencias, alertas | 60 |
| Multi-actor DyP | Pricing red, stock distribuidores | 50 |
| Multi-actor Importador | Demanda agregada, FOB negociación | 50 |
| Onboarding | Recomendaciones setup por tipo taller | 40 |
| Modular | Qué módulo necesitas / no necesitas | 40 |
| Jerarquía roles | Recomendaciones por cargo | 40 |
| **Capacitación ERP** | **Cómo usar cada módulo, tips, atajos** | **100** |
| **Troubleshooting** | **Errores comunes, soluciones paso a paso** | **80** |
| **Regulatorio Chile** | **SII, IVA, boletas, DTE, normativa laboral** | **60** |
| **Industria automotriz** | **Tendencias, marcas, repuestos, técnicas** | **60** |

**Total: ~1,430 pares de entrenamiento**

### 5.2 Fine-tune config

```yaml
# LoRA Config para RTX PRO 6000 Blackwell (98GB)
base_model: meta-llama/Llama-3.2-3B-Instruct
method: qlora
quantization: 4bit (bitsandbytes)
lora:
  r: 32            # Más capacidad que GenieOS (16)
  alpha: 64
  target_modules: [q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj]
  dropout: 0.05
training:
  epochs: 3
  batch_size: 16   # GPU tiene 98GB, podemos ir agresivos
  gradient_accumulation: 2
  learning_rate: 2e-4
  warmup_ratio: 0.1
  max_seq_length: 2048
  optimizer: paged_adamw_8bit
evaluation:
  eval_split: 0.1
  eval_strategy: epoch
output: /workspace/torque360/apps/iq/models/torque-iq-lora/
```

**Tiempo estimado:** ~15-20 min con 1,430 pares en RTX PRO 6000

### 5.3 Embeddings para RAG

```python
# Embeder docs TORQUE para búsqueda semántica
# Modelo: nomic-embed-text (ya en el pod para GenieOS)
# Chunks: ~5,000 (docs + schema + tipos)
# Tiempo: ~5 min en GPU

# Vector store: ChromaDB local en el pod
# Path: /workspace/torque360/apps/iq/models/embeddings/
```

---

## CRONOGRAMA DE EJECUCIÓN

```
┌─────────────────────────────────────────────────────────┐
│  TORQUE 360 — Pod Execution Timeline                     │
│  Budget: ~$20 USD (~8h @ $2.49/h)                       │
│                                                          │
│  HORA 0-0.5  │ Fase 0: Bootstrap pod                    │
│              │ Node 22 + pnpm + PostgreSQL + Redis       │
│              │ Upload code + install + init DB            │
│              │ Verificar: API health check OK             │
│              │                                           │
│  HORA 0.5-2.5│ Fase 1: Tests + Estabilización           │
│              │ 8 unit test suites servicios críticos     │
│              │ 5 E2E test flows                          │
│              │ Completar 6 módulos parciales             │
│              │ Verificar: pnpm test → all pass           │
│              │                                           │
│  HORA 2.5-4  │ Fase 2: TORQUE IQ Engine                 │
│              │ FastAPI service + motor recomendaciones   │
│              │ Integración con NestJS API                │
│              │ Verificar: POST /iq/analyze → response    │
│              │                                           │
│  HORA 4-4.5  │ Fase 5: Training TORQUE IQ               │
│              │ Generar 1,430 pares entrenamiento         │
│              │ LoRA fine-tune (~20 min GPU)              │
│              │ Embeddings RAG (~5 min GPU)               │
│              │ Verificar: modelo responde consultas      │
│              │                                           │
│  HORA 4.5-6.5│ Fase 3: TORQUE Network                   │
│              │ Schema marketplace + módulo NestJS        │
│              │ CRUD listings, RFQs, transactions         │
│              │ Meilisearch para búsqueda                 │
│              │ Verificar: marketplace flow funcional     │
│              │                                           │
│  HORA 6.5-8  │ Fase 4: Frontend                         │
│              │ Conectar páginas existentes con API       │
│              │ Páginas nuevas: /network, /iq             │
│              │ Componentes: DataTable, PDF previews      │
│              │ Verificar: UI navegable end-to-end        │
│              │                                           │
│  HORA 8      │ Download resultados a local               │
│              │ Modelo IQ + code actualizado + DB dump    │
└─────────────────────────────────────────────────────────┘
```

---

## ENTREGABLES AL FINAL DEL POD

### Código
- [ ] API funcionando con 27+ módulos (todos los parciales completados)
- [ ] Tests: 8 unit suites + 5 E2E flows passing
- [ ] TORQUE Network módulo completo (marketplace B2B)
- [ ] TORQUE IQ FastAPI service integrado
- [ ] Frontend: 26+ páginas conectadas a API

### AI / Modelos
- [ ] Training data: `torque_iq_training.jsonl` (~1,430 pares)
- [ ] LoRA model: `torque-iq-lora/` fine-tuned
- [ ] Embeddings: ChromaDB con docs TORQUE vectorizados
- [ ] Evaluación: benchmark con métricas del modelo

### Datos
- [ ] PostgreSQL dump con schema completo + datos demo
- [ ] Seed data: 1 tenant demo, 10 clientes, 20 vehículos, 50 OTs, inventario base

### Documentación
- [ ] API actualizada (OpenAPI spec)
- [ ] Training report con métricas
- [ ] Deployment guide actualizado

---

## DOWNLOAD AL FINAL

```bash
# Desde local — traer todo del pod
rsync -avz -e "ssh -p 18379 -i ~/.ssh/id_ed25519" \
  root@216.81.151.42:/workspace/torque360/ \
  ~/Desktop/Proyectos/Torque360/ \
  --exclude node_modules --exclude .next

# Traer modelo IQ
rsync -avz -e "ssh -p 18379 -i ~/.ssh/id_ed25519" \
  root@216.81.151.42:/workspace/torque360/apps/iq/models/ \
  ~/Desktop/Proyectos/Torque360/apps/iq/models/

# Traer DB dump
ssh -p 18379 -i ~/.ssh/id_ed25519 root@216.81.151.42 \
  "pg_dump -U torque360 torque360 > /workspace/torque360_dump.sql"
rsync -avz -e "ssh -p 18379 -i ~/.ssh/id_ed25519" \
  root@216.81.151.42:/workspace/torque360_dump.sql \
  ~/Desktop/Proyectos/Torque360/
```

---

## RIESGO Y MITIGACIÓN

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Pod se desconecta | Baja | tmux/screen para sesiones persistentes |
| npm install lento | Media | --prefer-offline, cache en /workspace |
| PostgreSQL falla | Baja | Docker fallback disponible |
| Se acaba el budget | Media | Priorizar: Fase 0→5→1→2→3→4 (AI primero) |
| Modelo no converge | Baja | 98GB VRAM, batch 16, datos curados |

**Si solo quedan 4 horas ($10):**
Priorizar → Fase 0 (bootstrap) → Fase 5 (training IQ) → Fase 2 (IQ engine) → Download

**El modelo entrenado es el activo más valioso** — se trae a local y funciona sin pod.

---

*Plan creado: 2026-02-17 | Pod: RTX PRO 6000 Blackwell 98GB | Target: 8h de ejecución*
