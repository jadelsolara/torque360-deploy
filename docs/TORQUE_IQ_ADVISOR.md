# TORQUE IQ — Business Intelligence Advisor

> *"Como tener un consultor de McKinsey... pero que habla tu idioma y cobra lo justo."*

```
FEATURE:      TORQUE IQ
VERSION:      1.0
TIPO:         Premium Feature (Built-in)
CREADO:       2026-02-17
ESTADO:       Diseño
PRIORIDAD:    Alta — Diferenciador competitivo #1
MOAT:         Ningún ERP automotriz ofrece esto
```

---

## 1. CONCEPTO

TORQUE IQ es un **servicio de inteligencia de negocios integrado** en el ERP que funciona como un consultor empresarial dedicado para cada taller. No es un chatbot genérico — es un motor analítico que conoce los números del taller, los compara con el mercado, detecta problemas antes de que exploten, y entrega recomendaciones accionables.

**La percepción del cliente:** "Detrás de TORQUE hay un equipo enorme de analistas trabajando para MI negocio."

**La realidad técnica:** Algoritmos + data agregada de la red + benchmarks de mercado + reglas de negocio diseñadas por especialistas reales.

### Lo que el dueño de taller ve:

```
┌─────────────────────────────────────────────────────┐
│  🧠 TORQUE IQ — Tu Consultor de Negocios            │
│                                                      │
│  "Pedro, esta semana tu margen en frenos cayó 12%.  │
│   El costo de pastillas Bosch subió en toda la red, │
│   pero 3 proveedores en tu zona tienen stock a      │
│   precio anterior. ¿Quieres que te conecte?"        │
│                                                      │
│  [ Ver análisis completo ]  [ Conectar proveedor ]  │
│                                                      │
│  📊 Tu consulta mensual gratuita:                    │
│  ✅ Disponible (se renueva el 1 de marzo)            │
│                                                      │
│  💡 Consultas adicionales: CLP $9.990 c/u            │
└─────────────────────────────────────────────────────┘
```

### Lo que el dueño de taller NO ve:

```
┌─────────────────────────────────────────────────────┐
│  BACKEND: TORQUE IQ ENGINE                           │
│                                                      │
│  ├── Datos del taller (ERP propio)                   │
│  ├── Benchmarks agregados (105+ talleres red)        │
│  ├── Datos de mercado (proveedores, precios)         │
│  ├── Estacionalidad + tendencias históricas          │
│  ├── Reglas de negocio (diseñadas por consultores)   │
│  └── Modelo de detección de anomalías                │
│                                                      │
│  OUTPUT → Insight accionable en lenguaje humano      │
└─────────────────────────────────────────────────────┘
```

---

## 2. MODELO DE NEGOCIO

### 2.1 Lo que incluye cada plan

| Concepto | Taller ($49/mes) | Multi-sucursal ($149/mes) | Enterprise ($499/mes) |
|----------|-------------------|---------------------------|------------------------|
| **Consultas IQ/mes** | 1 gratuita | 3 gratuitas | Ilimitadas |
| **Alertas proactivas** | 3/mes | 10/mes | Ilimitadas |
| **Benchmarking** | Básico (tu zona) | Completo (nacional) | Completo + histórico |
| **Reportes IQ** | Mensual | Semanal | Diario |
| **Consulta adicional** | CLP $9.990 | CLP $7.990 | Incluidas |
| **Consulta con especialista humano** | CLP $49.990 | CLP $39.990 | 1/mes incluida |

### 2.2 Pricing de consultas adicionales

```
CONSULTA IQ ESTÁNDAR           CLP $9.990  (~USD $10.50)
├── Análisis de datos del taller
├── Comparación con benchmarks de mercado
├── 3 recomendaciones accionables
├── Reporte PDF descargable
└── Respuesta en < 24 horas (automático: < 5 minutos)

CONSULTA IQ PRO                CLP $29.990  (~USD $31.50)
├── Todo lo anterior +
├── Análisis de escenarios (qué pasaría si...)
├── Proyección a 3-6-12 meses
├── Plan de acción paso a paso
└── Follow-up automático en 30 días

CONSULTA CON ESPECIALISTA      CLP $49.990  (~USD $52.60)
├── Videollamada 30 min con consultor TRACCION
├── Análisis previo por TORQUE IQ
├── Plan de acción escrito post-sesión
├── Follow-up a 30 y 60 días
└── Acceso al mismo consultor para continuidad
```

### 2.3 Revenue projection

```
Supuestos conservadores:
- 105 talleres activos
- 60% usa al menos 1 consulta adicional/mes
- 15% usa consulta PRO
- 5% usa especialista humano

Revenue mensual IQ:
├── 63 talleres × $9.990  = CLP $629,370
├── 16 talleres × $29.990 = CLP $479,840
├── 5 talleres  × $49.990 = CLP $249,950
└── TOTAL                  = CLP $1,359,160/mes
                           = CLP $16.3M/año
                           = ~USD $17,200/año

Con 500 talleres (año 3):
└── TOTAL ≈ CLP $6.5M/mes = CLP $78M/año = ~USD $82,000/año

Margen: ~85% (el motor es automático, solo el especialista tiene costo variable)
```

---

## 3. TIPOS DE CONSULTA IQ

### 3.1 Alertas Proactivas (automáticas, incluidas)

El sistema detecta y avisa SIN que el dueño pregunte:

| Alerta | Ejemplo | Frecuencia |
|--------|---------|------------|
| **Margen cayendo** | "Tu margen en cambio de aceite bajó 8% vs mes anterior" | Semanal |
| **Stock crítico** | "Te quedan 3 filtros de aceite Toyota, historicamente usas 12/semana" | Diaria |
| **Cliente en riesgo** | "Juan Pérez no viene hace 6 meses, antes venía cada 3" | Mensual |
| **Oportunidad perdida** | "15 clientes pidieron alineación este mes, no ofreces ese servicio" | Mensual |
| **Precio fuera de mercado** | "Cobras $45K por cambio de pastillas, el promedio en tu zona es $38K" | Mensual |
| **Técnico estrella** | "Carlos genera 35% más revenue que el promedio de tus técnicos" | Mensual |
| **Estacionalidad** | "Marzo viene fuerte en A/C, el año pasado subiste 40%" | Estacional |
| **Pago atrasado** | "3 clientes deben un total de $450K, el más antiguo tiene 45 días" | Semanal |

### 3.2 Consultas bajo demanda

El dueño pregunta, TORQUE IQ responde:

**Categoría: VENTAS**
```
"¿Cómo van mis ventas este mes?"
→ Revenue actual vs meta vs mismo mes año anterior
→ Tendencia diaria con proyección a cierre de mes
→ Top 3 servicios que suben, top 3 que bajan
→ Recomendación: "Si mantienes el ritmo actual, cerrarás en CLP $X.
   Para llegar a tu meta, necesitas Y órdenes más. Enfócate en [servicio]
   que tiene el mejor margen esta semana."
```

**Categoría: COSTOS**
```
"¿Por qué bajó mi margen?"
→ Desglose: qué categoría de repuestos subió de precio
→ Comparación con la red TORQUE (¿solo a ti o a todos?)
→ Proveedores alternativos con mejor precio
→ Recomendación: "El costo de pastillas Bosch subió 15% en toda la red.
   Sin embargo, [Proveedor X] en tu zona mantiene precio anterior.
   Si cambias proveedor solo en esta línea, recuperas CLP $180K/mes de margen."
```

**Categoría: CLIENTES**
```
"¿Quiénes son mis mejores clientes?"
→ Top 10 por revenue lifetime
→ Frecuencia de visita vs promedio
→ Servicios que más consumen
→ Clientes en riesgo de churn (no vienen hace X meses)
→ Recomendación: "Tu cliente #1 gasta $1.2M/año pero no ha venido en 4 meses.
   Un mensaje de seguimiento tiene 60% de probabilidad de traerlo de vuelta.
   ¿Quieres que genere un mensaje personalizado?"
```

**Categoría: OPERACIONES**
```
"¿Cómo rindo vs otros talleres?"
→ Tu revenue/técnico vs promedio de la red
→ Tu ticket promedio vs tu zona
→ Tu tiempo promedio por OT vs benchmark
→ Tus áreas fuertes y débiles
→ Recomendación: "Tu revenue/técnico está 20% sobre el promedio — excelente.
   Pero tu ticket promedio está 12% abajo. Opportunity: si subes el ticket
   promedio en $5K (ofreciendo servicio X como complemento), ganas $300K/mes."
```

**Categoría: INVERSIÓN**
```
"¿Debería comprar [equipo/expandir/contratar]?"
→ Análisis de ROI basado en tus números reales
→ Proyección de recuperación de inversión
→ Escenarios: optimista, conservador, pesimista
→ Benchmarks: talleres similares que hicieron lo mismo
→ Recomendación: "Un scanner de diagnóstico cuesta CLP $2.5M.
   Talleres similares al tuyo que lo compraron generan CLP $450K/mes adicional.
   Recuperación estimada: 5.5 meses. El 80% de talleres con scanner reporta
   aumento de ticket promedio de 25%."
```

**Categoría: PERSONAL**
```
"¿Necesito contratar o despedir?"
→ Productividad por técnico (órdenes/día, revenue/hora)
→ Capacidad utilizada vs disponible
→ Proyección de demanda (estacionalidad)
→ Costo de contratación vs costo de horas extra
→ Recomendación: "Tu capacidad está al 85% y marzo sube 40%.
   Opción A: Contratar técnico junior (costo $X/mes, revenue esperado $Y).
   Opción B: Horas extra en marzo-abril (costo $Z adicional).
   Basado en tu historial, Opción A se paga sola en 3 meses."
```

### 3.3 Reportes IQ automáticos

```
REPORTE SEMANAL "Pulso de tu Negocio"
├── Revenue de la semana vs semana anterior
├── Top 3 alertas (si hay)
├── 1 oportunidad detectada
├── KPI resumen: órdenes, ticket promedio, margen
└── Entregado: lunes 7 AM por email + push notification

REPORTE MENSUAL "Estado de tu Empresa"
├── P&L simplificado del mes
├── Comparación vs metas
├── Ranking en la red TORQUE (percentil)
├── Top 5 insights del mes
├── Plan de acción sugerido para el próximo mes
└── Entregado: día 5 del mes siguiente

REPORTE TRIMESTRAL "Visión Estratégica"
├── Tendencias de 3 meses
├── Estacionalidad detectada
├── Oportunidades de crecimiento
├── Amenazas detectadas
├── Benchmark completo vs competidores
└── Solo plan Multi-sucursal y Enterprise
```

---

## 4. MARCO LEGAL — COMPLIANCE TOTAL

### 4.1 Lo que TORQUE IQ ES

```
✅ TORQUE IQ ES:
├── Un servicio de INFORMACIÓN basado en datos
├── Un motor de ANÁLISIS que procesa datos propios del cliente
├── Un generador de SUGERENCIAS basadas en benchmarks
├── Una herramienta de COMPARACIÓN con datos agregados y anonimizados
├── Un facilitador de CONEXIÓN entre talleres y proveedores
└── Un canal de acceso a CONSULTORES humanos certificados (TRACCION)
```

### 4.2 Lo que TORQUE IQ NO ES

```
❌ TORQUE IQ NO ES:
├── Asesoría financiera regulada (CMF Chile, Art. 4 Ley 18.045)
├── Asesoría tributaria (no reemplaza al contador)
├── Asesoría legal (no reemplaza al abogado)
├── Correduría de seguros (SVS/CMF)
├── Recomendación de inversión en valores
└── Servicio profesional regulado que requiera colegiatura
```

### 4.3 Disclaimers obligatorios

Cada output de TORQUE IQ incluye:

```
────────────────────────────────────────────────────
ℹ️ TORQUE IQ proporciona información y sugerencias basadas en datos.
No constituye asesoría financiera, tributaria ni legal profesional.
Las decisiones de negocio son responsabilidad exclusiva del usuario.
Para asesoría especializada, consulte a un profesional certificado.
TORQUE 360 SpA — RUT: XX.XXX.XXX-X
────────────────────────────────────────────────────
```

### 4.4 Regulaciones aplicables (Chile)

| Regulación | Aplica a TORQUE IQ | Cómo cumplimos |
|------------|-------------------|----------------|
| **Ley 19.628** (Datos Personales) | SÍ | Datos agregados y anonimizados para benchmarks. Datos individuales solo visibles por el dueño del taller. Consentimiento explícito al activar IQ |
| **Ley 21.459** (Delitos Informáticos) | SÍ | Acceso solo a datos propios del cliente. Sin acceso cruzado. Cifrado E2E |
| **Ley 18.045** (Mercado de Valores) | NO — no damos asesoría de inversión en valores | Disclaimer explícito. Sugerencias son "información de mercado", no "recomendación de inversión" |
| **CMF Circular** (Asesores Financieros) | NO — no somos asesores financieros registrados | No usamos la palabra "asesoría financiera". Usamos "análisis de datos" y "sugerencias operacionales" |
| **Ley 20.659** (Simplificación Empresas) | Referencia | Cuando sugerimos formalización, referimos al portal del SII |
| **Código Tributario** | Referencia | Nunca damos "asesoría tributaria". Decimos "basado en datos del SII público, la tasa aplicable podría ser X. Confirme con su contador" |

### 4.5 Palabras que NUNCA usamos

```
PROHIBIDO en UI y outputs de TORQUE IQ:
├── "Asesoría financiera"     → USAR: "Análisis de datos"
├── "Recomendación de inversión" → USAR: "Información de mercado"
├── "Deberías invertir en..."  → USAR: "Talleres similares que hicieron X reportan Y"
├── "Garantizamos retorno"     → USAR: "Estimación basada en datos históricos"
├── "Te aconsejamos"           → USAR: "Los datos sugieren"
├── "Nuestra recomendación"    → USAR: "Basado en el análisis"
├── "Obligatorio que hagas"    → USAR: "Oportunidad identificada"
├── "Tu contador está mal"     → USAR: "Consulta con tu contador esta alternativa"
└── "Diagnóstico financiero"   → USAR: "Análisis operacional"
```

### 4.6 Escalamiento legal

```
SI el usuario pregunta algo que cruza la línea:

NIVEL 1 — Pregunta operacional → TORQUE IQ responde normalmente
  "¿Cómo van mis ventas?" ✅

NIVEL 2 — Pregunta que roza lo regulado → IQ responde con disclaimer
  "¿Debería pedir un crédito?" → "Basado en tu flujo de caja, tu capacidad
  de pago mensual es de CLP $X. Te sugerimos consultar con tu banco o
  asesor financiero para evaluar las opciones disponibles."

NIVEL 3 — Pregunta regulada directa → Derivar
  "¿Cómo pago menos impuestos?" → "Esta pregunta requiere asesoría tributaria
  profesional. Te recomendamos consultar con un contador certificado.
  ¿Quieres que te conectemos con un especialista TRACCION?"

NIVEL 4 — Pregunta fuera de scope → Declinar
  "¿En qué acciones invierto?" → "TORQUE IQ se especializa en inteligencia
  operacional para tu taller. Para inversiones en instrumentos financieros,
  consulta con un asesor de inversiones registrado en la CMF."
```

---

## 5. EXPERIENCIA DE USUARIO — "MEGA EMPRESA" FEEL

### 5.1 Branding

```
TORQUE IQ
Powered by TORQUE Intelligence Network™

"Análisis de datos de la red automotriz más grande de Chile.
 105+ talleres conectados. Miles de transacciones analizadas.
 Tu ventaja competitiva."
```

El cliente ve:
- **"Red de inteligencia"** — suena a cientos de analistas
- **"105+ talleres"** — validación social
- **"Miles de transacciones"** — big data
- **"Tu ventaja competitiva"** — exclusividad

### 5.2 UI/UX — Presentación premium

```
┌─────────────────────────────────────────────────────────────┐
│  TORQUE IQ™                                    🟢 En línea  │
│  Intelligence Network                                        │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  Buenos días, Pedro 👋                                       │
│                                                              │
│  📊 RESUMEN DE HOY                                           │
│  ┌──────────┬──────────┬──────────┐                         │
│  │ Revenue  │ Órdenes  │ Margen   │                         │
│  │ $485K    │ 12       │ 38.2%    │                         │
│  │ ↑ 8% vs  │ ↑ 2 vs   │ ↓ 1.2%  │                         │
│  │ ayer     │ ayer     │ vs ayer  │                         │
│  └──────────┴──────────┴──────────┘                         │
│                                                              │
│  ⚠️ ALERTA: Tu margen bajó por tercera semana consecutiva.  │
│  El costo de pastillas de freno subió 12% en tu proveedor.  │
│  En la red TORQUE, el precio promedio es 8% menor.          │
│  [ Ver proveedores alternativos → ]                         │
│                                                              │
│  💡 OPORTUNIDAD: El 40% de tus clientes de cambio de aceite │
│  también necesitan filtro de aire. Solo ofreces el combo al  │
│  15% de ellos. Si subes a 30%, ganas ~$180K/mes extra.      │
│  [ Ver análisis completo → ]                                │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│  🧠 Pregúntale a IQ                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ¿Cómo puedo mejorar mi margen en frenos?         🔍 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Consultas este mes: 0/1 gratuita  |  Adicional: $9.990    │
│                                                              │
│  ⓘ TORQUE IQ provee información basada en datos. No         │
│  constituye asesoría financiera profesional.                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Respuestas — Formato estándar

Cada respuesta de TORQUE IQ sigue esta estructura:

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 TORQUE IQ — Análisis de Margen en Frenos               │
│  Generado: 17 Feb 2026, 14:32 | Datos hasta: 16 Feb 2026  │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  📋 SITUACIÓN                                                │
│  Tu margen en servicio de frenos cayó de 42% a 30% en las  │
│  últimas 3 semanas. Esto representa CLP $280K menos de     │
│  ganancia mensual estimada.                                 │
│                                                              │
│  🔍 ANÁLISIS                                                 │
│  • El costo de pastillas Bosch (tu proveedor principal)     │
│    subió 15% a nivel nacional desde enero                   │
│  • En la red TORQUE, el 65% de talleres ya cambió a        │
│    proveedores alternativos para esta línea                 │
│  • Tu precio de venta al cliente NO ha cambiado             │
│  • Tu zona (Santiago Sur) tiene 3 proveedores con stock     │
│    a precio 12% menor que tu actual                         │
│                                                              │
│  📊 DATOS DE MERCADO                                         │
│  ┌────────────────┬──────────┬──────────┬──────────┐       │
│  │ Concepto       │ Tú       │ Red      │ Zona     │       │
│  │ Margen frenos  │ 30%      │ 38%      │ 35%      │       │
│  │ Costo pastilla │ $18.500  │ $15.800  │ $16.200  │       │
│  │ Precio venta   │ $38.000  │ $39.500  │ $38.000  │       │
│  │ Órdenes/sem    │ 8        │ 7        │ 6        │       │
│  └────────────────┴──────────┴──────────┴──────────┘       │
│                                                              │
│  💡 SUGERENCIAS (basadas en datos de la red)                 │
│                                                              │
│  1. CAMBIAR PROVEEDOR de pastillas para esta línea          │
│     → Proveedor A: CLP $15.200 (18% menos) — 4.5⭐ en red  │
│     → Proveedor B: CLP $16.100 (13% menos) — 4.8⭐ en red  │
│     Impacto estimado: +CLP $200K/mes de margen              │
│                                                              │
│  2. AJUSTAR PRECIO de servicio de frenos                    │
│     → El 70% de la red cobra $39K-$42K por el mismo trabajo │
│     → Subir $2K no afecta demanda (elasticidad baja)        │
│     Impacto estimado: +CLP $64K/mes                         │
│                                                              │
│  3. COMBO FRENOS + LÍQUIDO                                  │
│     → El 55% de clientes de frenos también necesitan        │
│       cambio de líquido. Solo ofreces al 20%                │
│     Impacto estimado: +CLP $120K/mes                        │
│                                                              │
│  📈 IMPACTO COMBINADO SI APLICAS LAS 3:                     │
│  +CLP $384K/mes = +CLP $4.6M/año                           │
│  Tu margen volvería a ~42% (donde estabas hace 3 semanas)  │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│  [ Conectar con Proveedor A ]  [ Descargar PDF ]            │
│  [ Agendar con especialista TRACCION ]                      │
│                                                              │
│  ⓘ Análisis basado en datos agregados de la red TORQUE.     │
│  No constituye asesoría financiera profesional.              │
│  TORQUE 360 SpA                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 El efecto "mega empresa"

Tácticas para que el cliente sienta que hay una corporación detrás:

| Táctica | Implementación | Costo real |
|---------|----------------|------------|
| **"Red de inteligencia"** | Datos agregados de todos los talleres TORQUE | Solo queries a la BD |
| **"Equipo de analistas"** | Algoritmos + plantillas diseñadas por consultores reales | Diseño one-time |
| **"Benchmarks exclusivos"** | Comparación con data real de la red | Automático |
| **"Especialistas disponibles"** | Consultores TRACCION (Jose Antonio + red) | Solo cuando contratan |
| **Reportes con branding premium** | PDFs con diseño corporativo, gráficos, logo | Plantillas CSS |
| **Notificaciones inteligentes** | Cron jobs que detectan anomalías | Automático |
| **"Actualizado en tiempo real"** | Data del ERP es real-time por naturaleza | Ya existe |
| **Lenguaje corporativo pero humano** | Templates pre-escritos con variables dinámicas | Copywriting one-time |
| **"Powered by TORQUE Intelligence Network™"** | Trademark el nombre | $0 (registro posterior) |
| **Número de talleres en la red** | Contador dinámico en la UI | 1 query SQL |

**Inversión real:** ~$0 en infra adicional. Todo corre sobre la data que ya existe en el ERP.

**Percepción:** Empresa con departamento de data science dedicado.

---

## 6. INTEGRACIÓN CON ECOSISTEMA

### 6.1 TORQUE IQ → TORQUE Network (B2B)

```
IQ detecta: "Tu proveedor subió precios"
     ↓
IQ busca: Proveedores en TORQUE Network con mejor precio
     ↓
IQ sugiere: "Proveedor X tiene stock a 12% menos"
     ↓
Un click: El taller conecta con el proveedor
     ↓
Transacción B2B en TORQUE Network
     ↓
TORQUE cobra comisión de marketplace (2-5%)
```

**Revenue doble:** El taller paga por la consulta IQ + TORQUE gana comisión del B2B generado.

### 6.2 TORQUE IQ → TRACCION (Consultoría)

```
IQ detecta: Problema complejo que requiere intervención humana
     ↓
IQ sugiere: "Para este caso, un especialista puede ayudarte"
     ↓
Un click: Agenda consulta con consultor TRACCION
     ↓
TRACCION cobra consulta ($49.990)
     ↓
El consultor tiene el análisis IQ pre-hecho
     ↓
Consulta más productiva (30 min en vez de 2 horas)
```

**Revenue triple:** IQ fee + TRACCION fee + resultados mejoran → el taller crece → paga más suscripción.

### 6.3 TORQUE IQ → HORIZON (Educación)

```
IQ detecta: "Tu contabilidad tiene gaps"
     ↓
IQ sugiere: "El módulo de Impuestos Sin Miedo de HORIZON
            te puede ayudar a entender tu situación tributaria"
     ↓
Link directo al contenido HORIZON relevante
     ↓
Upsell educativo
```

### 6.4 TORQUE IQ → EGGlogU (para talleres avícolas... si aplica)

```
Si el cliente tiene operación agrícola/avícola además del taller:
IQ detecta oportunidad de cross-sell con EGGlogU
→ "¿Sabías que tenemos un sistema especializado para producción avícola?"
```

---

## 7. DATOS Y PRIVACIDAD

### 7.1 Qué datos usa IQ

```
DATOS PROPIOS DEL TALLER (C2 — solo visible por el dueño)
├── Revenue, órdenes, costos (del ERP)
├── Inventario, proveedores, precios
├── Clientes, frecuencia, historial
├── Técnicos, productividad
└── Facturación, cuentas por cobrar

DATOS AGREGADOS DE LA RED (C1 — anonimizados)
├── Promedios por zona geográfica
├── Promedios por tipo de taller
├── Promedios por tamaño de taller
├── Tendencias de precios de repuestos
├── Estacionalidad detectada en la red
└── NUNCA datos individuales de otro taller

DATOS DE MERCADO (C1 — públicos)
├── Precios de mercado de repuestos
├── Tendencias del parque automotriz (INE, ANAC)
├── Indicadores económicos (IPC, UF, dólar)
├── Calendario de mantención por marca/modelo
└── Regulaciones relevantes (revisión técnica, etc.)
```

### 7.2 Reglas de privacidad

```
REGLA 1: Ningún taller ve datos de otro taller individual
REGLA 2: Los benchmarks siempre son agregados (mínimo 5 talleres para generar benchmark)
REGLA 3: El dueño puede desactivar que sus datos se incluyan en agregados
REGLA 4: Los datos de IQ nunca salen de la plataforma TORQUE
REGLA 5: Las consultas del dueño son confidenciales (ni TORQUE las lee)
REGLA 6: Opt-in explícito para cada nivel de datos compartidos
```

---

## 8. IMPLEMENTACIÓN TÉCNICA

### 8.1 Arquitectura

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  TORQUE ERP  │────▶│  IQ ENGINE       │────▶│  IQ Frontend │
│  (data real) │     │  (analytics)     │     │  (dashboard) │
└──────────────┘     │                  │     └──────────────┘
                     │  ├── Rules Engine│
┌──────────────┐     │  ├── Benchmark   │     ┌──────────────┐
│  Market Data │────▶│  │   Calculator  │────▶│  Alerts      │
│  (external)  │     │  ├── Anomaly     │     │  (push/email)│
└──────────────┘     │  │   Detection   │     └──────────────┘
                     │  ├── NLP Output  │
┌──────────────┐     │  │   Generator   │     ┌──────────────┐
│  TORQUE      │────▶│  └── Scenario    │────▶│  PDF Reports │
│  Network B2B │     │      Modeler     │     │  (branded)   │
└──────────────┘     └──────────────────┘     └──────────────┘
```

### 8.2 Stack

```
IQ Engine:      Python + pandas + scikit-learn (anomaly detection)
Rules Engine:   JSON-based business rules (configurable sin código)
NLP Generator:  Templates + variables dinámicas (no LLM — determinístico)
Scheduler:      Cron (alertas) + event-driven (triggers del ERP)
PDF Reports:    WeasyPrint (HTML → PDF con branding)
API:            FastAPI endpoints integrados en el backend TORQUE
Frontend:       React component en el dashboard existente
```

### 8.3 No necesitamos LLM

TORQUE IQ NO usa ChatGPT ni similares. Razones:

1. **Determinismo:** Cada insight debe ser reproducible y auditable
2. **Costo:** LLM API calls escalan con uso. Templates son gratis
3. **Velocidad:** Template rendering < 50ms. LLM API > 2 seconds
4. **Legal:** Los outputs deben ser predecibles y controlables
5. **Privacidad:** Datos del taller NUNCA salen a un API externo

El "cerebro" de IQ son **reglas de negocio + estadística clásica + templates bien escritos**. Parece IA, funciona como Excel sofisticado. Y eso es exactamente lo que queremos.

---

## 9. ROADMAP

```
FASE 1 — MVP (Mes 1-2)
├── Dashboard IQ básico (revenue, órdenes, margen)
├── 5 alertas proactivas
├── 1 consulta gratuita/mes
├── Reporte semanal automático
└── Disclaimer legal en toda la UI

FASE 2 — Benchmarks (Mes 3-4)
├── Datos agregados de la red
├── Comparación por zona y tipo
├── 10 alertas proactivas
├── Consultas adicionales ($9.990)
└── Reporte mensual

FASE 3 — Consultas Pro (Mes 5-6)
├── Análisis de escenarios
├── Proyecciones
├── Conexión con TORQUE Network
├── Integración TRACCION para especialistas
└── Consultas Pro ($29.990)

FASE 4 — Intelligence Network (Mes 7+)
├── Tendencias de mercado en tiempo real
├── Predicción de demanda
├── Auto-suggestions proactivas
├── API para integraciones externas
└── Enterprise tier ilimitado
```

---

## 10. COMPETENCIA — NADIE HACE ESTO

| Feature | SAP | Dynamics | NetSuite | AutoSoft DMS | **TORQUE IQ** |
|---------|-----|----------|----------|--------------|---------------|
| Dashboard básico | Sí | Sí | Sí | Sí | **Sí** |
| Benchmarks de red | No | No | No | No | **SÍ** |
| Alertas proactivas | Limitadas | Copilot (caro) | No | No | **SÍ (incluido)** |
| Sugerencias accionables | No | No | No | No | **SÍ** |
| Conexión B2B directa | No | No | No | No | **SÍ** |
| Consultor humano on-demand | No | No | No | No | **SÍ (TRACCION)** |
| Lenguaje humano (no gráficos) | No | No | No | No | **SÍ** |
| Costo incluido en suscripción | N/A | $30/user extra | N/A | N/A | **SÍ** |

**TORQUE IQ es un moat.** Nadie en el mercado automotriz LATAM ofrece inteligencia de negocios integrada con red B2B y consultoría humana on-demand.

---

*"Los datos sin contexto son ruido. Los datos con contexto son poder. TORQUE IQ convierte tu ERP en tu mejor consejero."*

*TORQUE 360 SpA — Powered by TORQUE Intelligence Network™*

---

## 11. FEEDBACK LOOP MENSUAL — "EL PULSO DE LA RED"

### 11.1 Concepto

Toda la información que los talleres generan a través de TORQUE IQ (consultas, respuestas, problemas reportados, acciones tomadas) se analiza automáticamente 1 vez al mes para:

1. **Detectar problemas recurrentes** en la red (si 20 talleres preguntan lo mismo → es un problema de mercado)
2. **Identificar soluciones efectivas** (si 5 talleres resolvieron un problema → compartir la solución anonimizada)
3. **Guiar los cambios del producto** (si todos piden algo que no existe → feature request validado por data)
4. **Mejorar las reglas de IQ** (las sugerencias que sí funcionaron se refuerzan, las que no se descartan)

### 11.2 Pipeline mensual

```
DÍA 1-5 DEL MES: RECOLECCIÓN
├── Todas las consultas IQ del mes anterior (anonimizadas)
├── Alertas que se activaron y cuáles se accionaron
├── Problemas reportados por talleres
├── Sugerencias que el taller marcó como "útil" / "no útil"
└── Transacciones B2B generadas por IQ

DÍA 6-8: ANÁLISIS AUTOMÁTICO
├── Clustering de problemas (NLP + keyword extraction)
├── Top 10 problemas más frecuentes
├── Top 5 soluciones más exitosas
├── Proveedores más mencionados (positiva y negativamente)
├── Servicios con más volatilidad de margen
└── Tendencias emergentes (problemas nuevos vs anteriores)

DÍA 9-10: GENERACIÓN DE OUTPUTS
├── "Informe Mensual de la Red" (interno TORQUE)
│   → Problemas recurrentes → backlog de producto
│   → Feature requests validados → roadmap
│   → Reglas IQ que ajustar → engine update
│
├── "Tendencias del Mercado Automotriz" (para talleres)
│   → Reporte agregado: "Este mes en la red..."
│   → Sin nombres, sin datos individuales
│   → Solo clusters y tendencias
│
└── Actualización del IQ Engine
    → Nuevas reglas de detección
    → Benchmarks recalculados
    → Templates de respuesta mejorados
```

### 11.3 Ejemplo de output mensual para talleres

```
┌─────────────────────────────────────────────────────────────┐
│  📊 TENDENCIAS DE LA RED — Febrero 2026                     │
│  TORQUE Intelligence Network™ | 105 talleres analizados    │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  🔥 PROBLEMA DEL MES                                        │
│  El 45% de talleres reportó caída de margen en frenos.      │
│  Causa identificada: aumento de 15% en costo de pastillas   │
│  de los 3 proveedores principales.                          │
│  Solución más exitosa: cambio a proveedores alternativos    │
│  (los que cambiaron recuperaron margen en 2 semanas).       │
│                                                              │
│  📈 TENDENCIA EMERGENTE                                      │
│  Aumento del 30% en demanda de diagnóstico por scanner.     │
│  Talleres que agregaron scanner en 2025 reportan +25% de    │
│  ticket promedio. Si no ofreces este servicio, considera    │
│  la inversión.                                               │
│                                                              │
│  💡 DATO DEL MES                                             │
│  El combo "cambio de aceite + filtro de aire" genera 18%    │
│  más revenue que vender por separado. El 60% de la red      │
│  ya lo ofrece. Si aún no lo haces, es la mejora más rápida │
│  que puedes implementar.                                     │
│                                                              │
│  ⓘ Datos agregados y anonimizados de la red TORQUE.         │
└─────────────────────────────────────────────────────────────┘
```

### 11.4 Feedback para el equipo TORQUE (interno)

```
REPORT: IQ Feedback Loop — Febrero 2026

PROBLEMAS RECURRENTES:
1. "¿Cómo bajo el costo de repuestos?" (38 consultas) → ACCIÓN: Mejorar módulo de proveedores alternativos
2. "¿Cómo recupero clientes inactivos?" (25 consultas) → ACCIÓN: Crear campaña automática de reactivación
3. "No entiendo el reporte financiero" (18 consultas) → ACCIÓN: Simplificar UI del P&L
4. "¿Cuánto cobrar por X servicio?" (15 consultas) → ACCIÓN: Agregar "pricing guide" por servicio y zona

FEATURES MÁS PEDIDOS:
1. "Quiero enviar recordatorio de mantención al cliente" (22 talleres)
2. "Necesito comparar precios de 3 proveedores rápido" (19 talleres)
3. "Quiero ver cuánto gasto en sueldo vs lo que produce cada técnico" (14 talleres)

SUGERENCIAS IQ QUE FUNCIONARON:
✅ "Cambiar proveedor de pastillas" → 85% éxito (margen subió)
✅ "Ofrecer combo aceite+filtro" → 78% éxito (ticket subió)
✅ "Ajustar precio de alineación" → 72% éxito (sin perder clientes)

SUGERENCIAS IQ QUE NO FUNCIONARON:
❌ "Agregar servicio de scanner" → Solo 20% implementó (barrera: inversión alta)
→ ACCIÓN: Ofrecer financiamiento o leasing de equipo via TORQUE Network
```

---

## 12. MARKET INTELLIGENCE — CLUSTERS DE REPUESTOS

### 12.1 Concepto

TORQUE IQ cruza TODA la data de repuestos de la red para generar inteligencia de mercado automotriz:
- Dónde compran los talleres
- Cuánto pagan por cada repuesto
- Quién es más barato por categoría
- Qué volúmenes se mueven
- Tendencias de precios

**Sin exponer a NADIE en particular. Solo clusters de información agregada.**

### 12.2 Clusters de datos

```
CLUSTER: REPUESTOS
├── Por CATEGORÍA
│   ├── Filtros: precio promedio red, rango, tendencia
│   ├── Aceites: precio promedio red, marca más usada, volumen
│   ├── Pastillas de freno: precio promedio, proveedor más popular
│   ├── Suspensión: precio promedio, tiempo de entrega promedio
│   ├── Eléctrico: precio promedio, tasa de devolución
│   └── ... (12 categorías)
│
├── Por ZONA GEOGRÁFICA
│   ├── Santiago Norte: proveedores top, precios promedio
│   ├── Santiago Sur: proveedores top, precios promedio
│   ├── Valparaíso: proveedores top, precios promedio
│   └── ... (por región)
│
├── Por MARCA DE VEHÍCULO
│   ├── Chevrolet: repuestos más demandados, costo promedio
│   ├── Hyundai: repuestos más demandados, costo promedio
│   ├── Toyota: repuestos más demandados, costo promedio
│   └── ... (12 marcas principales)
│
├── Por VOLUMEN
│   ├── Alto volumen (>100 unidades/mes red): precio benchmark
│   ├── Medio volumen (20-100/mes): precio benchmark
│   └── Bajo volumen (<20/mes): precio benchmark
│
└── Por TENDENCIA TEMPORAL
    ├── Subiendo de precio: [lista de repuestos]
    ├── Bajando de precio: [lista de repuestos]
    ├── Estable: [lista de repuestos]
    └── Estacional: [lista + meses pico]
```

### 12.3 Cross-reference de repuestos

```
CRUCE DE REPUESTOS — Motor de compatibilidad

EJEMPLO: Pastilla de freno delantera Chevrolet Sail 2018

┌──────────────────────────────────────────────────────────────┐
│  🔄 CROSS-REFERENCE                                          │
│                                                               │
│  OEM:        GM 13301207                                     │
│  Aftermarket equivalentes:                                    │
│  ├── Bosch BP1234    | $18.500 | ⭐4.5 | 45% de la red usa  │
│  ├── Ferodo FDB4321  | $15.800 | ⭐4.2 | 25% de la red usa  │
│  ├── TRW GDB1234    | $16.200 | ⭐4.7 | 20% de la red usa  │
│  └── Brembo P23456  | $22.100 | ⭐4.9 | 10% de la red usa  │
│                                                               │
│  📊 EN TU ZONA (Santiago Sur):                               │
│  ├── Proveedor más usado: RepuestosChile (35%)              │
│  ├── Precio promedio zona: $16.400                           │
│  ├── Precio más bajo zona: $14.800                           │
│  └── Tiempo entrega promedio: 1.2 días                       │
│                                                               │
│  📈 TENDENCIA: +12% en 3 meses (toda la red)                │
│  ⚠️ ALERTA: Costo subiendo. Evalúa stock antes del alza    │
│                                                               │
│  ⓘ Datos agregados de la red TORQUE. Mín. 5 talleres        │
│  por cluster para generar benchmark.                          │
└──────────────────────────────────────────────────────────────┘
```

### 12.4 Índice de Precios Automotriz TORQUE (IPAT)

Un índice propio que mide la evolución de precios de repuestos en la red:

```
IPAT — Índice de Precios Automotriz TORQUE
Febrero 2026

ÍNDICE GENERAL:         104.2 (base 100 = enero 2026)
├── Filtros:            101.5 (estable)
├── Aceites:            107.8 (subiendo — petróleo)
├── Frenos:             112.3 (subiendo fuerte)
├── Suspensión:         103.1 (estable)
├── Eléctrico:          98.5 (bajando — más oferta)
├── Motor:              105.2 (leve alza)
├── Transmisión:        106.8 (alza moderada)
├── Refrigeración:      101.0 (estable)
├── Neumáticos:         109.2 (alza — tipo de cambio)
└── Carrocería:         102.4 (estable)

PROYECCIÓN MARZO: 105.8 (+1.5%)
Factores: tipo de cambio USD/CLP, estacionalidad post-verano
```

### 12.5 Reglas de privacidad para clusters

```
REGLA 1: Mínimo 5 talleres por cluster para publicar benchmark
  → Si una zona tiene < 5 talleres, se agrupa con la zona más cercana

REGLA 2: Nunca se revela el nombre del taller que compra más/menos
  → Solo "el 35% de talleres en tu zona compra en [categoría]"

REGLA 3: Los proveedores aparecen por nombre (es info pública de mercado)
  → Pero nunca se dice "Taller X compra en Proveedor Y"

REGLA 4: Los volúmenes son siempre agregados
  → "La red mueve 500 pastillas Bosch/mes" — no "Taller X compra 50"

REGLA 5: El taller puede optar por NO compartir sus datos de compra
  → Pero pierde acceso a los benchmarks (incentivo a participar)

REGLA 6: Los datos de precios de proveedores se validan con el proveedor
  → Para evitar data corrupta o desactualizada
```

### 12.6 Data flywheel

```
Más talleres en TORQUE
        ↓
Más datos de compra agregados
        ↓
Mejores benchmarks y clusters
        ↓
IQ da mejores sugerencias
        ↓
Talleres ahorran dinero
        ↓
Más talleres quieren unirse
        ↓
(loop)

ESTE ES EL MOAT REAL DE TORQUE.
No el ERP. No la facturación. No el CRM.
Es la RED DE INTELIGENCIA que se alimenta sola.
Mientras más talleres, más valiosa la data.
Mientras más valiosa la data, más talleres.
Network effect puro.
```

---

*"Los datos de un taller son ruido. Los datos de 100 talleres son inteligencia de mercado. Los datos de 1000 talleres son un monopolio informacional."*

---

## 13. ECOSISTEMA MULTI-ACTOR — LA RED COMPLETA

### 13.1 Concepto

TORQUE IQ no es inteligencia solo para talleres. Es un **ecosistema de inteligencia para toda la cadena automotriz.** Cada tipo de negocio aporta datos distintos, recibe inteligencia distinta, y juntos generan un mapa de mercado que ningún actor individual podría construir solo.

**Mínimo viable:** 1 tipo de negocio (el taller — ya es valioso solo con eso).
**Máximo potencial:** Todos los actores de la cadena conectados = inteligencia total del mercado automotriz.

### 13.2 Tipos de actor

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TORQUE INTELLIGENCE NETWORK™                       │
│                    Actores del ecosistema                             │
│                                                                      │
│  ┌──────────────────────┐                                            │
│  │  IMPORTADOR          │  Importa repuestos del exterior.           │
│  │  (Importador)        │  Vende a distribuidores o directo a SSTT.  │
│  │                      │  Maneja catálogos, stock masivo, pricing   │
│  │                      │  FOB/CIF, homologaciones.                  │
│  └──────────┬───────────┘                                            │
│             │ vende a                                                 │
│             ▼                                                         │
│  ┌──────────────────────┐                                            │
│  │  DyP                 │  Distribuidor y/o Proveedor local.         │
│  │  (Dist. y Proveedor) │  Compra a importadores, vende a SSTT.     │
│  │                      │  Maneja logística, crédito, catálogo       │
│  │                      │  local, despacho, post-venta.              │
│  └──────────┬───────────┘                                            │
│             │ vende a                                                 │
│             ▼                                                         │
│  ┌──────────────────────┐                                            │
│  │  SSTT                │  Servicio Técnico / Taller Automotriz.     │
│  │  (Servicio Técnico)  │  Compra repuestos, vende mano de obra +   │
│  │                      │  repuestos instalados. Es el cliente final │
│  │                      │  de la cadena B2B.                         │
│  └──────────────────────┘                                            │
│                                                                      │
│  Flujo: IMPORTADOR → DyP → SSTT → Cliente final (dueño del auto)   │
│                                                                      │
│  Cada actor puede ser grande o chico. Cada actor aporta data.       │
│  Mínimo 1 tipo. Ideal: los 3 conectados.                            │
└──────────────────────────────────────────────────────────────────────┘
```

### 13.3 ¿Qué aporta cada actor?

| Actor | Datos que aporta a la red | Valor para el ecosistema |
|-------|--------------------------|--------------------------|
| **IMPORTADOR** | Catálogo completo, precios FOB/CIF, disponibilidad real, tiempos de importación, homologaciones OEM/aftermarket, marcas que representa | **Visibilidad de oferta y pricing de origen** — el taller sabe cuánto cuesta realmente un repuesto antes de los márgenes intermedios |
| **DyP** | Precios de venta, stock en tiempo real, tiempos de despacho, condiciones de crédito, cobertura geográfica, tasa de devolución | **Catálogo vivo con precios reales** — el taller compara en 1 click. El DyP gana visibilidad ante talleres que no lo conocen |
| **SSTT** | Qué compra, a quién, cuánto paga, volumen, frecuencia, calidad percibida, tasa de devolución al proveedor, ticket promedio del servicio | **Demanda real del mercado** — el importador y DyP saben qué se necesita, cuánto se paga, y dónde hay oportunidad |

### 13.4 ¿Qué recibe cada actor?

#### IMPORTADOR recibe:

```
┌───────────────────────────────────────────────────────────────────┐
│  📊 TORQUE IQ — Panel Importador                                  │
│                                                                    │
│  🔥 DEMANDA DE LA RED                                             │
│  "Los SSTT de la red compraron 12,000 pastillas Bosch este mes.  │
│  Tendencia: +15% vs mes anterior. 80% compra a DyP local, solo  │
│  20% directo a importador. Oportunidad: canal directo o mejores  │
│  condiciones a distribuidores para capturar volumen."             │
│                                                                    │
│  📦 TUS PRODUCTOS EN LA RED                                       │
│  ├── Filtro de aceite XYZ: 35% market share → LÍDER en la red    │
│  ├── Pastilla ABC: 12% market share → competencia fuerte de Bosch│
│  └── Kit de distribución: 0% → no ingresado, demanda = 400/mes  │
│                                                                    │
│  📈 OPORTUNIDADES                                                  │
│  "3 categorías con alta demanda y baja oferta en la red:          │
│  Sensores de oxígeno, bombas de agua Hyundai, kit embrague Kia"  │
│                                                                    │
│  🚨 ALERTAS                                                       │
│  "Tu competidor [marca X] bajó precio 8% en filtros. 15 DyP     │
│  cambiaron de proveedor el mes pasado."                           │
│                                                                    │
│  ⓘ Datos agregados. Nunca se identifica un SSTT o DyP individual.│
└───────────────────────────────────────────────────────────────────┘
```

#### DyP recibe:

```
┌───────────────────────────────────────────────────────────────────┐
│  📊 TORQUE IQ — Panel Distribuidor / Proveedor                    │
│                                                                    │
│  🏪 TU POSICIÓN EN LA RED                                         │
│  Talleres que te compran: 23 (de 105 en tu zona)                 │
│  Market share zona: 22%                                           │
│  Satisfacción: ⭐4.3/5 (promedio red: 4.1)                       │
│  Tiempo de despacho: 1.1 días (promedio red: 1.4) → VENTAJA     │
│                                                                    │
│  🔍 DEMANDA QUE NO ESTÁS CAPTURANDO                              │
│  "42 talleres en tu zona compran suspensión a otros DyP.          │
│  El 60% dice que cambiaria si encuentra mejor precio/entrega.    │
│  Categoría de oportunidad: CLP $8.2M/mes en tu zona."           │
│                                                                    │
│  📊 BENCHMARK CONTRA OTROS DyP (anonimizado)                     │
│  ├── Tu precio promedio: -3% vs red → COMPETITIVO                │
│  ├── Tu tiempo entrega: -22% vs red → MUY COMPETITIVO           │
│  ├── Tu tasa devolución: 2.1% vs red 3.4% → MEJOR QUE PROMEDIO │
│  └── Tu cobertura: 23/105 talleres = margen de crecimiento alto  │
│                                                                    │
│  💡 SUGERENCIA                                                     │
│  "Los talleres piden más Kit de Distribución Hyundai Accent.      │
│  Solo 1 DyP en tu zona lo tiene. Margen estimado: 38%.           │
│  ¿Quieres agregar este producto a tu catálogo?"                  │
│                                                                    │
│  ⓘ Nunca se identifica un taller por nombre.                      │
└───────────────────────────────────────────────────────────────────┘
```

#### SSTT recibe (lo que ya teníamos + mejoras):

```
┌───────────────────────────────────────────────────────────────────┐
│  📊 TORQUE IQ — Panel Servicio Técnico                            │
│                                                                    │
│  TODO LO QUE YA TENÍA (Secciones 1-12) MÁS:                     │
│                                                                    │
│  🔄 CATÁLOGO VIVO DE PROVEEDORES                                  │
│  Ahora con datos reales de DyP e Importadores conectados:        │
│  ├── Precio real (no estimado) de cada proveedor                 │
│  ├── Stock en tiempo real                                         │
│  ├── Tiempo de entrega real (no promesa, sino datos históricos)  │
│  ├── Tasa de devolución real por proveedor                       │
│  └── Rating de otros talleres (anónimo)                           │
│                                                                    │
│  💰 COMPARADOR INTELIGENTE                                         │
│  "Para Pastilla de freno Chevrolet Sail:                          │
│  ├── DyP A: $15.800 | stock ✅ | entrega 0.5 días | ⭐4.7      │
│  ├── DyP B: $16.200 | stock ✅ | entrega 1.2 días | ⭐4.2      │
│  ├── Importador X (directo): $13.900 | entrega 3 días | ⭐4.5  │
│  └── RECOMENDADO: DyP A (mejor balance precio/entrega/calidad)" │
│                                                                    │
│  📦 COMPRA DIRECTA                                                 │
│  [ Comprar a DyP A ]  [ Pedir cotización a Importador X ]       │
│  → Transacción vía TORQUE Network                                 │
│                                                                    │
│  ⓘ Precios actualizados por los propios proveedores.              │
└───────────────────────────────────────────────────────────────────┘
```

### 13.5 Modelo de negocio por actor

| Actor | Suscripción TORQUE | Qué paga | Qué gana |
|-------|-------------------|----------|----------|
| **SSTT** | Plan Taller ($49-$499/mo) | ERP + IQ incluido | Inteligencia de negocio + catálogo vivo de proveedores |
| **DyP** | Plan Proveedor ($79-$299/mo) | Presencia en la red + IQ proveedor | Visibilidad ante todos los SSTT de la red + inteligencia de demanda |
| **Importador** | Plan Importador ($199-$999/mo) | Presencia en la red + IQ importador | Visibilidad ante DyP + SSTT + inteligencia de mercado completa |

```
REVENUE STREAMS POR ACTOR:

SSTT (ya existe):
├── Suscripción ERP mensual
├── Consultas IQ adicionales
└── Comisión B2B (TORQUE cobra al DyP, no al SSTT)

DyP (nuevo):
├── Suscripción presencia en red ($79-$299/mo)
├── Comisión por venta vía TORQUE Network (2-5%)
├── Consultas IQ Proveedor adicionales
└── Destacado / posición premium en catálogo ($49/mo add-on)

Importador (nuevo):
├── Suscripción inteligencia de mercado ($199-$999/mo)
├── Comisión por venta vía TORQUE Network (1-3%)
├── Reportes exclusivos de demanda ($29.990/reporte)
└── Publicación de catálogo completo en la red ($99/mo add-on)
```

### 13.6 Escalabilidad del ecosistema

```
ESCENARIO MÍNIMO (lanzamiento):
Solo SSTT → Ya es valioso con data propia + benchmarks entre talleres

ESCENARIO INTERMEDIO:
SSTT + DyP → Catálogo vivo con precios reales. Comparador funciona.
             El DyP gana clientes. El SSTT compra mejor.

ESCENARIO COMPLETO:
SSTT + DyP + Importador → Cadena completa visible.
                          El SSTT ve desde precio de origen hasta retail.
                          El importador ve demanda real.
                          El DyP se posiciona entre ambos.
                          Todos ganan. TORQUE cobra a todos.

NOTA: Cada actor se puede sumar independientemente.
No necesitas tener los 3 para que funcione.
Pero cada uno que se suma, multiplica el valor para los demás.
```

### 13.7 La inteligencia cruzada — el verdadero poder

```
EJEMPLO DE FLUJO COMPLETO:

1. SSTT en Santiago reporta alta demanda de kit distribución Hyundai
   (dato automático del ERP — no necesita hacer nada)
        ↓
2. IQ detecta: 85 kits vendidos en la red este mes, +30% vs anterior
        ↓
3. IQ cruza con DyP: solo 2 de 15 DyP tienen stock
   → ALERTA a los otros 13 DyP: "Demanda alta, oportunidad de $X"
        ↓
4. IQ cruza con Importador: precio FOB bajó 5% este trimestre
   → ALERTA a DyP: "Costo de importación bajando, negocien mejor"
        ↓
5. IQ al SSTT: "Precio va a bajar. Si no es urgente, espera 2 semanas.
   Si es urgente, DyP A tiene stock a $X con entrega mañana."
        ↓
6. Resultado: El SSTT compra informado. El DyP vende más.
   El Importador ajusta oferta a la demanda real.
   TORQUE cobra suscripción a los 3 + comisión del B2B.
```

### 13.8 Reglas de privacidad multi-actor

```
ENTRE ACTORES:
├── SSTT nunca ve datos de otro SSTT individual
├── DyP nunca ve datos de otro DyP individual
├── Importador nunca ve a quién le compra un SSTT específico
├── DyP ve demanda agregada, nunca "Taller X pidió Y"
├── Importador ve volúmenes de red, nunca por DyP individual
│
VISIBILIDAD PÚBLICA (opt-in):
├── DyP puede publicar su catálogo y precios (voluntario)
├── Importador puede publicar su catálogo (voluntario)
├── SSTT puede mostrar rating de proveedores (anónimo)
│
MÍNIMOS POR CLUSTER:
├── SSTT: mínimo 5 para generar benchmark
├── DyP: mínimo 3 para generar comparativa
├── Importador: mínimo 2 para generar tendencia de precios
│
OPT-OUT:
├── Cualquier actor puede NO compartir sus datos
├── Consecuencia: pierde acceso a benchmarks de su tipo
├── Su data no se incluye en cálculos agregados
└── Puede re-activar en cualquier momento
```

### 13.9 Flywheel multi-actor (actualizado)

```
                    ┌──────────────┐
                    │ MÁS SSTT     │
                    │ en la red    │
                    └──────┬───────┘
                           │ genera
                           ▼
              ┌────────────────────────┐
              │ MÁS DATOS DE DEMANDA   │
              │ (qué se compra, cuánto,│
              │  a quién, frecuencia)  │
              └────────────┬───────────┘
                           │ atrae
                           ▼
                    ┌──────────────┐
                    │ MÁS DyP     │
                    │ quieren estar │
                    │ en la red    │
                    └──────┬───────┘
                           │ genera
                           ▼
              ┌────────────────────────┐
              │ MÁS DATOS DE OFERTA    │
              │ (precios, stock,       │
              │  entrega, calidad)     │
              └────────────┬───────────┘
                           │ atrae
                           ▼
                  ┌────────────────┐
                  │ IMPORTADORES   │
                  │ quieren        │
                  │ visibilidad    │
                  └────────┬───────┘
                           │ genera
                           ▼
              ┌────────────────────────┐
              │ INTELIGENCIA COMPLETA  │
              │ de toda la cadena      │
              │ (origen → retail)      │
              └────────────┬───────────┘
                           │ mejora
                           ▼
              ┌────────────────────────┐
              │ IQ DA MEJORES          │
              │ RECOMENDACIONES        │
              │ a TODOS los actores    │
              └────────────┬───────────┘
                           │ genera
                           ▼
              ┌────────────────────────┐
              │ TODOS AHORRAN /        │
              │ VENDEN MÁS / DECIDEN   │
              │ MEJOR                  │
              └────────────┬───────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ MÁS ACTORES  │◄─── (loop)
                    │ se suman     │
                    └──────────────┘

ESTE FLYWHEEL ES 3X MÁS PODEROSO QUE EL ANTERIOR.
Antes: solo talleres alimentando data de talleres.
Ahora: toda la cadena alimentando data de toda la cadena.
El que controla la inteligencia de la cadena, controla el mercado.
```

---

*"Un taller solo ve su negocio. Un importador solo ve su catálogo. Un distribuidor solo ve sus clientes. TORQUE IQ los conecta a todos y cada uno ve el mercado completo — sin exponer a nadie."*

---

## 14. ARQUITECTURA MODULAR — ULTRA FLEXIBLE

### 14.1 Filosofía

```
REGLA DE ORO:
Cada módulo se sostiene SOLO. Nadie compra algo que no necesita.
Pero cada módulo que agregas hace que los demás sean más valiosos.

NO es: "Compra el paquete completo o nada"
SÍ es: "Empieza con lo que necesitas. Crece cuando quieras."
```

Lo que hace atractivo a TORQUE no es forzar un paquete — es que cada pieza resuelve un problema real por sí sola. El ecosistema es consecuencia, no requisito.

### 14.2 Catálogo de módulos — SSTT (Taller)

```
┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULOS SSTT — Arma tu plan                                         │
│                                                                      │
│  BASE (obligatorio — es el ERP):                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ⚙️ TORQUE CORE                                    $29.990/mo  │  │
│  │ Órdenes de trabajo, ficha de vehículo, calendario,            │  │
│  │ facturación electrónica (SII), dashboard básico.              │  │
│  │ → Esto solo ya reemplaza tu Excel/cuaderno.                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ADD-ONS (elige los que necesites):                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 📦 INVENTARIO             $9.990/mo                         │    │
│  │ Stock de repuestos, alertas de mínimo, costo promedio,      │    │
│  │ código de barra, movimientos. Si no vendes repuestos,       │    │
│  │ no lo necesitas.                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 👥 CRM + MARKETING        $9.990/mo                         │    │
│  │ Ficha de cliente, historial, recordatorio de mantención,    │    │
│  │ WhatsApp automático, campañas de reactivación.              │    │
│  │ Si todos tus clientes vuelven solos, no lo necesitas.       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🧠 TORQUE IQ               $14.990/mo                       │    │
│  │ Inteligencia de negocio: benchmarks, alertas, sugerencias,  │    │
│  │ 1 consulta gratis/mes, reportes PDF, comparador de          │    │
│  │ proveedores (si hay DyP en la red).                         │    │
│  │ Si solo quieres el ERP y tomar tus decisiones solo, skip.   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🔄 TORQUE NETWORK (B2B)    $9.990/mo                        │    │
│  │ Marketplace de repuestos: compra/vende entre talleres y     │    │
│  │ proveedores, cotización automática, compra en 1 click.      │    │
│  │ Si ya tienes tu proveedor de confianza fijo, no lo necesitas│    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 👨‍🔧 TÉCNICOS + RRHH         $7.990/mo                       │    │
│  │ Ficha de técnico, productividad, asignación de OT, horas,  │    │
│  │ comisiones. Si trabajas solo, no lo necesitas.              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 📊 REPORTES PRO             $7.990/mo                       │    │
│  │ P&L mensual, flujo de caja, análisis por servicio, margen  │    │
│  │ por categoría, exportación contable. Si tu contador se      │    │
│  │ maneja con lo básico, no lo necesitas.                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🏪 MULTI-SUCURSAL           $19.990/mo                      │    │
│  │ Dashboard consolidado, transferencias entre locales,        │    │
│  │ permisos por sucursal. Solo si tienes más de 1 local.      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  EJEMPLO DE COMBOS:                                                  │
│  Taller chico (1 persona): CORE = $29.990/mo                       │
│  Taller medio: CORE + Inventario + CRM = $49.970/mo                │
│  Taller completo: CORE + todo = $109.940/mo                        │
│  Multi-sucursal: CORE + todo + Multi = $129.930/mo                  │
│                                                                      │
│  DESCUENTO POR BUNDLE:                                               │
│  3+ módulos: -10% | 5+ módulos: -15% | Todos: -20%                 │
│  (incentiva crecimiento sin forzar)                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### 14.3 Catálogo de módulos — DyP (Distribuidor y Proveedor)

```
┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULOS DyP — Arma tu plan                                          │
│                                                                      │
│  BASE:                                                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🏪 VITRINA TORQUE                                 $39.990/mo  │  │
│  │ Tu catálogo visible para TODOS los SSTT de la red.            │  │
│  │ Nombre, logo, categorías, zonas de cobertura, contacto.      │  │
│  │ Los talleres te encuentran sin que hagas nada.                │  │
│  │ → Esto solo ya es un canal de ventas nuevo.                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ADD-ONS:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 📋 CATÁLOGO VIVO             $19.990/mo                      │    │
│  │ Precios en tiempo real, stock disponible, ficha técnica     │    │
│  │ por repuesto, compatibilidad por vehículo. Los talleres     │    │
│  │ comparan tu precio con otros DyP en la red.                 │    │
│  │ Si prefieres que te llamen para cotizar, no lo necesitas.   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🛒 VENTA DIRECTA (B2B)       $14.990/mo                     │    │
│  │ Recibe pedidos directos desde TORQUE Network, gestiona      │    │
│  │ despachos, confirma stock automáticamente. El taller        │    │
│  │ compra en 1 click. Comisión TORQUE: 2-5% por transacción.  │    │
│  │ Si vendes solo por WhatsApp y te funciona, no lo necesitas. │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🧠 IQ PROVEEDOR              $14.990/mo                     │    │
│  │ Inteligencia de demanda: qué buscan los talleres, qué      │    │
│  │ categorías crecen, dónde hay oportunidad, tu posición vs   │    │
│  │ otros DyP (anonimizado). Reportes mensuales.               │    │
│  │ Si ya sabes exactamente qué vender, no lo necesitas.        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ⭐ POSICIÓN PREMIUM           $24.990/mo                     │    │
│  │ Apareces primero en búsquedas de tu zona y categoría.       │    │
│  │ Badge "Proveedor Verificado". Destacado en recomendaciones  │    │
│  │ de IQ. Si tu reputación habla sola, no lo necesitas.        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  EJEMPLO DE COMBOS:                                                  │
│  DyP chico: VITRINA = $39.990/mo (solo presencia)                  │
│  DyP activo: VITRINA + Catálogo + Venta = $74.970/mo              │
│  DyP completo: Todo = $114.950/mo                                   │
│  Descuentos: misma estructura que SSTT                              │
└──────────────────────────────────────────────────────────────────────┘
```

### 14.4 Catálogo de módulos — Importador

```
┌──────────────────────────────────────────────────────────────────────┐
│  MÓDULOS IMPORTADOR — Arma tu plan                                    │
│                                                                      │
│  BASE:                                                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🌐 PRESENCIA RED                                  $99.990/mo  │  │
│  │ Tu marca visible en toda la red TORQUE: DyP + SSTT.          │  │
│  │ Catálogo de marcas que representas, contacto comercial.      │  │
│  │ → Visibilidad ante cientos de puntos de venta sin            │  │
│  │   vendedores en calle.                                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ADD-ONS:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 📊 MARKET INTELLIGENCE        $79.990/mo                    │    │
│  │ Demanda real de la red: qué repuestos se mueven, volumen,   │    │
│  │ tendencias, categorías con demanda insatisfecha, market      │    │
│  │ share de tus productos vs competencia (anonimizado).        │    │
│  │ → Es como tener un estudio de mercado actualizado cada mes. │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🛒 CANAL DIRECTO (B2B)        $49.990/mo                    │    │
│  │ Vende directo a DyP y SSTT vía TORQUE Network.             │    │
│  │ Gestión de pedidos, despacho, facturación.                  │    │
│  │ Comisión TORQUE: 1-3% por transacción.                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 📈 REPORTES DE DEMANDA        $29.990/mo                    │    │
│  │ Reportes mensuales descargables: demanda por categoría,     │    │
│  │ por zona, por marca de vehículo, proyecciones. PDF + CSV.  │    │
│  │ → Data para tu directorio, no para tu vendedor.             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  EJEMPLO DE COMBOS:                                                  │
│  Importador presencia: BASE = $99.990/mo                            │
│  Importador inteligente: BASE + Market Intel = $179.980/mo         │
│  Importador completo: Todo = $259.960/mo                            │
│  Descuentos: misma estructura                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 14.5 La regla del "no lo necesitas"

```
CADA MÓDULO INCLUYE UNA LÍNEA QUE DICE:
"Si [tu situación], no lo necesitas."

¿POR QUÉ?

1. HONESTIDAD → genera confianza
   "Esta empresa no me está vendiendo humo. Me dice cuándo NO comprar."

2. REDUCE FRICCIÓN → el cliente no siente presión
   "Nadie me obligó. Yo elegí lo que necesitaba."

3. UPSELL NATURAL → cuando crezca, va a querer más
   "Empecé con CORE. A los 3 meses agregué Inventario.
    A los 6 meses agregué IQ. Ahora tengo todo."

4. MENOR CHURN → nadie cancela por pagar algo que no usa
   "Pago $50K/mes y uso TODO. No pago $130K y uso la mitad."

5. WORD-OF-MOUTH → el cliente recomienda porque se siente respetado
   "Usa TORQUE. Te dejan armar tu propio plan. No como los otros."

ANTI-PATRÓN A EVITAR:
❌ "Nuestro plan básico incluye 47 features que nunca vas a usar"
❌ "Upgrade al plan Pro para desbloquear lo que realmente necesitas"
❌ "Solo puedes comprar en paquetes predefinidos"

PATRÓN TORQUE:
✅ "Empieza con lo mínimo. Agrega cuando lo necesites. Sin contrato."
```

### 14.6 Flexibilidad de contratación

```
CONTRATO:          Mensual. Sin permanencia mínima.
UPGRADE:           Instantáneo. Agrega módulo hoy, funciona hoy.
DOWNGRADE:         Fin del mes en curso. Sin penalización.
PAUSA:             Congela tu cuenta hasta 3 meses. Tus datos se guardan.
MIGRACIÓN:         Si vienes de otro ERP, importamos tus datos gratis.
PRUEBA:            14 días de CORE + todos los add-ons. Gratis. Sin tarjeta.
POST-PRUEBA:       Quédate con CORE ($29.990) o agrega lo que probaste.

VOLUMEN:
├── 1 local:       precio estándar
├── 2-5 locales:   -10% en todos los módulos
├── 6-10 locales:  -15%
├── 11+:           precio negociado

PAGO:
├── Mensual: precio estándar
├── Semestral: -5%
├── Anual: -15% (2 meses gratis)
└── Todos los precios en CLP. Factura electrónica incluida.
```

### 14.7 Matriz de compatibilidad

```
¿QUÉ MÓDULO NECESITA QUÉ?

SSTT:
├── CORE ←────────── obligatorio (es el ERP)
├── Inventario ←──── necesita CORE
├── CRM ←─────────── necesita CORE
├── IQ ←──────────── necesita CORE (mejor con Inventario + CRM)
├── Network B2B ←─── necesita CORE + Inventario
├── Técnicos ←────── necesita CORE
├── Reportes Pro ←── necesita CORE (mejor con todo)
└── Multi-sucursal ── necesita CORE

DyP:
├── Vitrina ←──────── obligatorio (es la presencia)
├── Catálogo Vivo ←── necesita Vitrina
├── Venta Directa ←── necesita Vitrina + Catálogo Vivo
├── IQ Proveedor ←─── necesita Vitrina
└── Premium ←──────── necesita Vitrina + Catálogo Vivo

Importador:
├── Presencia Red ←── obligatorio
├── Market Intel ←─── necesita Presencia
├── Canal Directo ←── necesita Presencia
└── Reportes ←─────── necesita Presencia (mejor con Market Intel)

CROSS-ACTOR:
├── IQ del SSTT es mejor si hay DyP con Catálogo Vivo
├── Venta Directa del DyP necesita SSTT con Network B2B
├── Market Intel del Importador es mejor con más SSTT + DyP
└── Todo mejora con más actores, pero nada se rompe sin ellos
```

### 14.8 Growth path por actor

```
SSTT — CAMINO NATURAL:

Mes 1:  "Solo necesito dejar de usar Excel"
        → CORE ($29.990)

Mes 3:  "Tengo repuestos tirados y no sé cuánto tengo"
        → + Inventario ($9.990) = $39.980/mo

Mes 5:  "Mis clientes no vuelven, se van al taller de al lado"
        → + CRM ($9.990) = $49.970/mo

Mes 8:  "Quiero saber si mi negocio va bien o me estoy engañando"
        → + IQ ($14.990) = $64.960/mo

Mes 10: "IQ me dijo que estoy comprando caro. Quiero comparar proveedores"
        → + Network B2B ($9.990) = $74.950/mo

Mes 12: "Contraté un técnico y no sé si rinde"
        → + Técnicos ($7.990) = $82.940/mo

        CADA PASO ES UNA DECISIÓN INFORMADA, NO UNA VENTA.
        IQ genera la necesidad del siguiente módulo.
        El producto se vende solo.

───────────────────────────────────────────────────────────────

DyP — CAMINO NATURAL:

Mes 1:  "Quiero que los talleres me encuentren"
        → VITRINA ($39.990)

Mes 3:  "Me llaman pero preguntan precio, quiero que lo vean directo"
        → + Catálogo Vivo ($19.990) = $59.980/mo

Mes 5:  "Quiero recibir pedidos sin WhatsApp, se me pierden"
        → + Venta Directa ($14.990) = $74.970/mo

Mes 8:  "Quiero saber qué demandan los talleres para stockear mejor"
        → + IQ Proveedor ($14.990) = $89.960/mo

───────────────────────────────────────────────────────────────

IMPORTADOR — CAMINO NATURAL:

Mes 1:  "Quiero que la red sepa que existimos"
        → PRESENCIA ($99.990)

Mes 3:  "Quiero saber qué se mueve en el mercado chileno"
        → + Market Intel ($79.990) = $179.980/mo

Mes 6:  "Quiero vender directo a DyP y talleres grandes"
        → + Canal Directo ($49.990) = $229.970/mo
```

### 14.9 Por qué esto es atractivo

```
PARA EL SSTT:
"No estoy comprando un ERP. Estoy comprando exactamente lo que necesito,
y cuando necesite más, lo agrego. No tengo funciones que no uso.
No pago por cosas que no entiendo. Es MI plan."

PARA EL DyP:
"Pago $40K/mes y tengo un canal de ventas con 100+ talleres que me ven.
Eso me costaría $500K+ en vendedores en calle. Es un no-brainer."

PARA EL IMPORTADOR:
"Un estudio de mercado me cuesta $3-5M y es estático. Acá pago $180K/mes
y tengo data en tiempo real de la demanda de toda la red. Permanente."

PARA TORQUE:
Cada módulo es un punto de entrada. Cada punto de entrada es un camino
de crecimiento. Cada camino termina en el ecosistema completo.
No vendemos módulos. Vendemos un camino de crecimiento inevitable.
```

---

*"No le vendas todo al cliente. Dale lo mínimo que resuelve su problema. Cuando funcione, él solo va a querer más. Eso es producto, no ventas."*

---

## 15. JERARQUÍA DE USUARIOS — CARGOS DEFINEN MÓDULOS

### 15.1 Concepto

```
Cuando un negocio se registra en TORQUE, no elige módulos al azar.
El sistema pregunta: ¿Quiénes van a usar esto?

Cada persona tiene un CARGO.
Cada CARGO tiene módulos RECOMENDADOS.
Cada CARGO tiene un NIVEL DE ACCESO.

El resultado:
- El dueño no paga módulos que nadie va a usar
- Cada persona ve solo lo que necesita para su trabajo
- El onboarding es guiado: "Tienes 3 personas → te recomendamos esto"
- Cuando contratas a alguien nuevo, el sistema sugiere qué agregar
```

### 15.2 Jerarquía SSTT (Taller)

```
┌──────────────────────────────────────────────────────────────────────┐
│  JERARQUÍA DE CARGOS — SSTT                                          │
│                                                                      │
│  NIVEL 1: DUEÑO / GERENTE GENERAL                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: TODO (admin absoluto)                                 │  │
│  │  Ve: números, márgenes, reportes, IQ, config, usuarios        │  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ CORE (obligatorio)                                         │  │
│  │  ✅ IQ (es SU herramienta — toma las decisiones del negocio)  │  │
│  │  ✅ Reportes Pro (ve el P&L, flujo de caja, márgenes)         │  │
│  │  ⚡ Multi-sucursal (si tiene +1 local)                         │  │
│  │                                                                │  │
│  │  Lo que le dice TORQUE al registrarse:                         │  │
│  │  "Como dueño, IQ y Reportes Pro son tus ojos sobre el        │  │
│  │   negocio. Sin esto, manejas a ciegas. Con esto, cada         │  │
│  │   decisión tiene respaldo en datos reales."                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 2: JEFE DE TALLER / ENCARGADO                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: operaciones + equipo (NO ve finanzas del dueño)      │  │
│  │  Ve: OTs, calendario, técnicos, inventario, clientes          │  │
│  │  NO ve: márgenes reales, P&L, config de precios, IQ financiero│  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ CORE (gestiona OTs, calendario, asigna trabajo)            │  │
│  │  ✅ Inventario (controla stock, pide repuestos)                │  │
│  │  ✅ Técnicos (ve productividad, asigna OTs)                   │  │
│  │  ⚡ CRM (si también atiende clientes)                         │  │
│  │                                                                │  │
│  │  "Tu jefe de taller necesita mover las OTs y controlar el    │  │
│  │   stock. Sin Inventario, te va a llamar 10 veces al día      │  │
│  │   preguntando si hay pastillas en bodega."                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 3: ASESOR DE SERVICIO / RECEPCIONISTA                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: front-office (clientes + OTs + agenda)               │  │
│  │  Ve: ficha del cliente, historial del vehículo, agenda,       │  │
│  │      presupuestos, estado de OT                                │  │
│  │  NO ve: costos reales, márgenes, inventario valorizado        │  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ CORE (crea OTs, agenda citas, genera presupuestos)         │  │
│  │  ✅ CRM (ficha del cliente, historial, recordatorios)          │  │
│  │                                                                │  │
│  │  "Tu recepcionista es la cara del taller. Con CRM, sabe      │  │
│  │   el nombre del cliente, qué auto tiene, y cuándo le toca    │  │
│  │   la próxima mantención. Sin CRM, atiende a todos igual."    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 4: TÉCNICO / MECÁNICO                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: solo SUS OTs asignadas                                │  │
│  │  Ve: detalle de la OT, checklist, repuestos asignados,        │  │
│  │      fotos/notas del vehículo                                  │  │
│  │  NO ve: precio al cliente, margen, otros técnicos, finanzas   │  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ CORE (ve su trabajo, marca avance, reporta)               │  │
│  │  ⚡ (ningún add-on — su vista es mobile-first, simple)        │  │
│  │                                                                │  │
│  │  "El técnico solo necesita ver qué tiene que hacer y marcar  │  │
│  │   cuando terminó. Si le muestras más, lo confundes.           │  │
│  │   Vista limpia = menos errores = más productividad."          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 5: ADMINISTRATIVO / CONTADOR                                  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: finanzas + facturación (NO operaciones)              │  │
│  │  Ve: facturas, boletas, pagos, cuentas por cobrar,            │  │
│  │      exportación contable, IVA                                 │  │
│  │  NO ve: OTs en detalle, técnicos, inventario operativo        │  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ CORE (facturación, SII)                                   │  │
│  │  ✅ Reportes Pro (P&L, flujo de caja, exportación contable)   │  │
│  │                                                                │  │
│  │  "Tu contador necesita los números limpios y exportables.     │  │
│  │   Con Reportes Pro, el cierre mensual pasa de 3 días a       │  │
│  │   15 minutos. Sin esto, te va a pedir planillas a mano."     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  TALLER UNIPERSONAL (el dueño hace todo):                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Cargo: DUEÑO-OPERADOR                                        │  │
│  │  Acceso: TODO (es la única persona)                            │  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ CORE (lo mínimo para funcionar)                            │  │
│  │  ⚡ CRM (si quiere retener clientes, que sí quiere)           │  │
│  │  ⚡ IQ (cuando quiera entender su negocio en serio)           │  │
│  │                                                                │  │
│  │  "Eres el dueño, el mecánico, el recepcionista y el          │  │
│  │   contador. CORE te saca del cuaderno. Cuando respires,      │  │
│  │   agrega CRM. Cuando quieras crecer, agrega IQ."             │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 15.3 Jerarquía DyP (Distribuidor y Proveedor)

```
┌──────────────────────────────────────────────────────────────────────┐
│  JERARQUÍA DE CARGOS — DyP                                           │
│                                                                      │
│  NIVEL 1: DUEÑO / GERENTE                                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: TODO                                                  │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Vitrina (presencia en la red)                              │  │
│  │  ✅ IQ Proveedor (inteligencia de demanda y posición)         │  │
│  │  ⚡ Posición Premium (si quiere dominar su zona)              │  │
│  │                                                                │  │
│  │  "Tú tomas las decisiones de qué stockear, a quién vender,   │  │
│  │   y cómo posicionarte. IQ Proveedor es tu mapa del mercado." │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 2: JEFE DE VENTAS                                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: catálogo + pedidos + clientes (NO ve margen real)    │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Vitrina (administra el catálogo público)                   │  │
│  │  ✅ Catálogo Vivo (actualiza precios y stock)                  │  │
│  │  ✅ Venta Directa (gestiona pedidos entrantes)                │  │
│  │                                                                │  │
│  │  "Tu jefe de ventas necesita ver qué piden los talleres       │  │
│  │   y responder rápido. Sin Venta Directa, se le pierden       │  │
│  │   pedidos en WhatsApp y cotizaciones sin responder."          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 3: VENDEDOR                                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: SUS clientes asignados + catálogo (solo lectura)     │  │
│  │  Ve: pedidos de sus clientes, historial, stock disponible     │  │
│  │  NO ve: precios de costo, margen, otros vendedores            │  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Vitrina (ve el catálogo para ofrecer)                     │  │
│  │  ✅ Venta Directa (recibe y gestiona pedidos de sus clientes) │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 4: BODEGUERO / LOGÍSTICA                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: stock + despachos (NO ve precios ni clientes)        │  │
│  │  Ve: stock real, pedidos por despachar, guías                  │  │
│  │                                                                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Catálogo Vivo (actualiza stock real)                       │  │
│  │  ✅ Venta Directa (ve pedidos pendientes de despacho)         │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 15.4 Jerarquía Importador

```
┌──────────────────────────────────────────────────────────────────────┐
│  JERARQUÍA DE CARGOS — IMPORTADOR                                     │
│                                                                      │
│  NIVEL 1: GERENTE GENERAL / DIRECTORIO                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: TODO                                                  │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Presencia + Market Intelligence + Reportes de Demanda     │  │
│  │  → Decisiones estratégicas: qué importar, cuánto, para quién │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 2: GERENTE COMERCIAL                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: ventas + catálogo + clientes (NO ve costos FOB)      │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Presencia + Canal Directo + Market Intelligence            │  │
│  │  → Gestiona la relación con DyP y SSTT grandes                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 3: EJECUTIVO DE VENTAS                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: SUS cuentas + catálogo (solo lectura)                │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Presencia + Canal Directo                                  │  │
│  │  → Atiende pedidos, cotiza, cierra                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  NIVEL 4: ANALISTA / COMPRAS                                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Acceso: reportes + tendencias (NO ve clientes individuales)  │  │
│  │  Módulos recomendados:                                         │  │
│  │  ✅ Market Intelligence + Reportes de Demanda                  │  │
│  │  → Analiza tendencias para decidir próximas importaciones      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 15.5 Onboarding guiado por cargos

```
FLUJO DE REGISTRO:

PASO 1: ¿Qué tipo de negocio eres?
        [ SSTT ]  [ DyP ]  [ Importador ]

PASO 2: ¿Cuántas personas van a usar TORQUE?
        [ Solo yo ]  [ 2-5 ]  [ 6-10 ]  [ 11+ ]

PASO 3: ¿Qué cargos tienen? (selecciona los que aplican)

        SSTT:                    DyP:                  Importador:
        □ Dueño/Gerente          □ Dueño/Gerente       □ Gerente General
        □ Jefe de Taller         □ Jefe de Ventas      □ Gerente Comercial
        □ Recepcionista          □ Vendedor(es)        □ Ejecutivo(s)
        □ Técnico(s)             □ Bodeguero           □ Analista
        □ Administrativo         □ Administrativo      □ Logística

PASO 4: TORQUE genera la RECOMENDACIÓN:

┌──────────────────────────────────────────────────────────────┐
│  📋 PLAN RECOMENDADO PARA TU EQUIPO                          │
│                                                              │
│  Basado en: SSTT, 4 personas                                │
│  (1 dueño, 1 jefe de taller, 1 recepcionista, 1 técnico)   │
│                                                              │
│  MÓDULOS RECOMENDADOS:                                       │
│  ✅ CORE — todos lo necesitan                    $29.990    │
│  ✅ Inventario — tu jefe de taller lo necesita   $9.990     │
│  ✅ CRM — tu recepcionista lo necesita           $9.990     │
│  ✅ Técnicos — para medir productividad          $7.990     │
│                                                              │
│  TOTAL RECOMENDADO:                   $57.960/mo            │
│                                                              │
│  OPCIONAL (agrégalos cuando quieras):                        │
│  ○ IQ — para ti como dueño ($14.990)                        │
│  ○ Reportes Pro — para tu contador ($7.990)                 │
│  ○ Network B2B — cuando quieras comparar proveedores        │
│                                                              │
│  [ Empezar con lo recomendado ]                              │
│  [ Personalizar mi plan ]                                    │
│  [ Solo CORE por ahora ]                                     │
└──────────────────────────────────────────────────────────────┘
```

### 15.6 Permisos por cargo — Matriz de acceso

```
SSTT — ¿QUIÉN VE QUÉ?

                     Dueño  Jefe   Recep  Técn   Admin
                     ─────  ─────  ─────  ─────  ─────
OTs (todas)           ✅     ✅     ✅     ─      ─
OTs (asignadas)       ✅     ✅     ✅     ✅     ─
Crear OT              ✅     ✅     ✅     ─      ─
Agenda/Calendario     ✅     ✅     ✅     ─      ─
Ficha cliente         ✅     ✅     ✅     ─      ─
Historial vehículo    ✅     ✅     ✅     ✅     ─
Presupuesto (crear)   ✅     ✅     ✅     ─      ─
Precio al cliente     ✅     ✅     ✅     ─      ─
Costo real repuesto   ✅     ✅     ─      ─      ✅
Margen por OT         ✅     ─      ─      ─      ✅
Inventario stock      ✅     ✅     ─      ─      ─
Inventario valorizado ✅     ─      ─      ─      ✅
Pedir repuesto        ✅     ✅     ─      ─      ─
Facturación           ✅     ─      ✅     ─      ✅
P&L / Flujo caja      ✅     ─      ─      ─      ✅
IQ consultas          ✅     ─      ─      ─      ─
IQ alertas            ✅     ✅*    ─      ─      ─
Benchmarks red        ✅     ─      ─      ─      ─
Técnicos producción   ✅     ✅     ─      ─      ─
Config / Usuarios     ✅     ─      ─      ─      ─
TORQUE Network B2B    ✅     ✅     ─      ─      ─
Reportes exportar     ✅     ─      ─      ─      ✅
Multi-sucursal        ✅     ─      ─      ─      ─

* Jefe de Taller ve alertas operativas (stock bajo, OT atrasada),
  NO alertas financieras (margen cayendo, revenue bajando).

─── = no ve, no accede, no existe en su interfaz.
No es que esté "bloqueado" — es que NO APARECE.
Cada cargo ve una UI limpia con SOLO lo que necesita.
```

### 15.7 Usuarios por módulo — Pricing

```
MODELO DE COBRO POR USUARIO:

Módulo se cobra por NEGOCIO, no por usuario.
El dueño paga $29.990 por CORE y puede agregar 10 técnicos.
Los técnicos NO pagan extra — son usuarios del mismo CORE.

¿POR QUÉ?
- Si cobras por usuario, el dueño no agrega al técnico → pierde datos
- Si cobras por negocio, el dueño agrega a todos → más datos → mejor IQ
- Queremos MÁXIMA adopción interna = MÁXIMA data = MÁXIMO valor

LÍMITES POR PLAN (para evitar abuso):

CORE:           hasta 5 usuarios incluidos
                +$2.990/usuario adicional/mo

Inventario:     mismos usuarios del CORE (no cobra extra)
CRM:            mismos usuarios del CORE
Técnicos:       hasta 10 técnicos incluidos
                +$1.990/técnico adicional/mo
Multi-sucursal: hasta 3 sucursales incluidas
                +$9.990/sucursal adicional/mo

DyP Vitrina:    hasta 3 usuarios incluidos
                +$4.990/usuario adicional/mo

Importador:     hasta 5 usuarios incluidos
                +$9.990/usuario adicional/mo

RESULTADO:
Un taller de 4 personas paga lo mismo que uno de 1 persona
en módulos base. El incentivo es: agrega a tu equipo, todos
ganan, tú no pagas más (hasta el límite).
```

### 15.8 Cargo genera recomendación automática

```
MOTOR DE RECOMENDACIÓN:

Cuando el dueño agrega un empleado nuevo:

1. "¿Qué cargo tiene?"
   → Dueño selecciona: "Técnico"

2. TORQUE responde:
   ┌────────────────────────────────────────────────┐
   │  Nuevo usuario: Técnico                         │
   │                                                 │
   │  Con tu plan actual (CORE), tu técnico puede:  │
   │  ✅ Ver sus OTs asignadas                       │
   │  ✅ Marcar avance y completar                   │
   │  ✅ Ver ficha del vehículo                      │
   │                                                 │
   │  💡 Si agregas el módulo TÉCNICOS ($7.990/mo)  │
   │  también podrías:                               │
   │  📊 Ver productividad por técnico               │
   │  ⏱️ Medir tiempos por tipo de servicio          │
   │  💰 Calcular comisiones automáticas             │
   │                                                 │
   │  [ Agregar módulo Técnicos ]                    │
   │  [ Solo CORE por ahora ]                        │
   └────────────────────────────────────────────────┘

3. Si agrega módulo → instantáneo
   Si no → el técnico funciona con CORE solo (sin métricas)

CADA CARGO NUEVO = OPORTUNIDAD DE UPSELL NATURAL.
No es spam. Es una recomendación real basada en lo que
ese cargo necesita para hacer su trabajo bien.
```

### 15.9 Resumen de jerarquía

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  CARGO → define → ACCESO (qué ves)                              │
│       → sugiere → MÓDULOS (qué necesitas)                       │
│       → configura → UI (interfaz limpia por cargo)              │
│       → activa → UPSELL (recomendación contextual)              │
│                                                                  │
│  EL DUEÑO CONTROLA:                                              │
│  - Qué cargos existen en su negocio                             │
│  - Qué módulos tiene activos                                    │
│  - Qué usuario tiene qué cargo                                  │
│  - Puede crear cargos custom (hereda permisos del más cercano)  │
│                                                                  │
│  TORQUE SUGIERE:                                                 │
│  - Módulos por cargo                                             │
│  - Módulos cuando agrega personas nuevas                        │
│  - Módulos cuando IQ detecta que le falta algo                  │
│    ("Tienes 3 técnicos pero no mides productividad.            │
│     El módulo Técnicos te costaría $7.990/mo.")                │
│                                                                  │
│  NUNCA FUERZA. SIEMPRE SUGIERE. EL DUEÑO DECIDE.               │
└──────────────────────────────────────────────────────────────────┘
```

---

*"No le preguntes al cliente qué módulos quiere. Pregúntale quién trabaja en su negocio. Los módulos se eligen solos."*

*TORQUE 360 SpA — Powered by TORQUE Intelligence Network™*
