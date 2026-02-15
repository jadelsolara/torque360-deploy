-- =====================================================
-- TORQUE 360 — Seed Data para Demo/Training
-- Industria automotriz chilena realista
-- =====================================================
-- All UUIDs use hex-only chars (0-9, a-f)
-- Tenant A (taller-demo): a0000000-...-000000000001 (pre-exists)
-- Tenant B (auto-prov):   b0000000-...-000000000002
-- Tenant C (importadora): c0000000-...-000000000003
-- Tenant SYS (system):    d0000000-...-000000000004

BEGIN;

-- =====================================================
-- 1. TENANTS
-- =====================================================
INSERT INTO tenants (id, name, slug, plan, settings, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Automotriz Providencia', 'auto-providencia', 'enterprise', '{"currency":"CLP","timezone":"America/Santiago","rut":"76.543.210-1"}', true),
  ('c0000000-0000-0000-0000-000000000003', 'Importadora del Pacifico', 'importadora-pacifico', 'professional', '{"currency":"CLP","timezone":"America/Santiago","rut":"77.888.999-0"}', true),
  ('d0000000-0000-0000-0000-000000000004', 'TORQUE 360 System', 'torque360-system', 'enterprise', '{"system":true}', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. USUARIOS (bcrypt hash de 'Demo2024!')
-- =====================================================
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active) VALUES
  -- Tenant A: Taller Demo Santiago
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin@tallerdemo.cl',    '$2b$10$rKN8h3Vf2xqX6YjM5Z8wOeKjL.0nWh/qV6iM3Uy4DvHJ7xCzK', 'Carlos',  'Mendoza', 'OWNER',    true),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'jefe@tallerdemo.cl',     '$2b$10$rKN8h3Vf2xqX6YjM5Z8wOeKjL.0nWh/qV6iM3Uy4DvHJ7xCzK', 'Maria',   'Gonzalez', 'ADMIN',   true),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'mecanico@tallerdemo.cl', '$2b$10$rKN8h3Vf2xqX6YjM5Z8wOeKjL.0nWh/qV6iM3Uy4DvHJ7xCzK', 'Pedro',   'Soto',     'OPERATOR', true),
  ('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'recepcion@tallerdemo.cl','$2b$10$rKN8h3Vf2xqX6YjM5Z8wOeKjL.0nWh/qV6iM3Uy4DvHJ7xCzK', 'Ana',     'Munoz',    'MANAGER',  true),
  ('a1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'viewer@tallerdemo.cl',   '$2b$10$rKN8h3Vf2xqX6YjM5Z8wOeKjL.0nWh/qV6iM3Uy4DvHJ7xCzK', 'Luis',    'Vargas',   'VIEWER',   true),
  -- Tenant B: Automotriz Providencia
  ('a1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'gerente@autoprov.cl',    '$2b$10$rKN8h3Vf2xqX6YjM5Z8wOeKjL.0nWh/qV6iM3Uy4DvHJ7xCzK', 'Roberto', 'Silva',    'OWNER',    true),
  -- SUPER_ADMIN (system tenant)
  ('a1000000-0000-0000-0000-000000000099', 'd0000000-0000-0000-0000-000000000004', 'superadmin@torque360.cl','$2b$10$rKN8h3Vf2xqX6YjM5Z8wOeKjL.0nWh/qV6iM3Uy4DvHJ7xCzK', 'Jose',    'Admin',    'SUPER_ADMIN', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. EMPRESAS
-- =====================================================
INSERT INTO companies (id, tenant_id, rut, business_name, trade_name, industry, address, city, region, phone, email, is_active) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '76.123.456-7', 'Taller Demo Santiago SpA', 'Taller Demo', 'automotive_workshop', 'Av. Libertador Bernardo OHiggins 1234', 'Santiago', 'Metropolitana', '+56 2 2345 6789', 'contacto@tallerdemo.cl', true),
  ('a2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '76.543.210-1', 'Automotriz Providencia S.A.', 'Auto Providencia', 'dealership', 'Av. Providencia 2345', 'Providencia', 'Metropolitana', '+56 2 2987 6543', 'ventas@autoprov.cl', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. CLIENTES (first_name, last_name for PERSON; company_name for COMPANY)
-- =====================================================
INSERT INTO clients (id, tenant_id, type, rut, first_name, last_name, company_name, email, phone, address, city) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'individual', '12.345.678-9', 'Juan', 'Perez Rojas', NULL, 'jperez@gmail.com', '+56 9 1234 5678', 'Los Leones 456, Depto 302', 'Providencia'),
  ('a3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'individual', '13.456.789-0', 'Andrea', 'Fuentes Silva', NULL, 'afuentes@gmail.com', '+56 9 8765 4321', 'Av. Apoquindo 7890', 'Las Condes'),
  ('a3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'company', '78.901.234-5', NULL, NULL, 'Transportes del Valle Ltda.', 'flota@transportesvalle.cl', '+56 2 2111 2222', 'Camino a Melipilla Km 15', 'Maipu'),
  ('a3000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'individual', '14.567.890-1', 'Miguel Angel', 'Torres', NULL, 'mtorres@outlook.com', '+56 9 5555 1234', 'Av. Matta 234', 'Santiago'),
  ('a3000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'company', '79.012.345-6', NULL, NULL, 'Constructora Andes S.A.', 'vehiculos@construandes.cl', '+56 2 2333 4444', 'Lo Espejo 890', 'San Bernardo'),
  ('a3000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'individual', '15.678.901-2', 'Carolina', 'Lagos Bravo', NULL, 'clagos@gmail.com', '+56 9 7777 8888', 'Av. Vitacura 3456', 'Vitacura')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. CONTACTOS DE CLIENTES (first_name, last_name, position)
-- =====================================================
INSERT INTO client_contacts (id, tenant_id, client_id, first_name, last_name, position, role, email, phone, is_primary) VALUES
  ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'Pablo', 'Herrera', 'Jefe de Flota', 'contact', 'pherrera@transportesvalle.cl', '+56 9 3333 4444', true),
  ('a4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000005', 'Fernando', 'Diaz', 'Encargado Vehiculos', 'contact', 'fdiaz@construandes.cl', '+56 9 2222 3333', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. VEHICULOS
-- =====================================================
INSERT INTO vehicles (id, tenant_id, client_id, plate, vin, brand, model, year, color, engine_type, mileage) VALUES
  ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'ABCD12', 'WBA3A5C55FK12345', 'Toyota', 'Corolla', 2022, 'Blanco', 'gasoline', 45000),
  ('a5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'EFGH34', 'WVWZZZ3CZWE65432', 'Hyundai', 'Tucson', 2023, 'Gris', 'gasoline', 18000),
  ('a5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'IJKL56', 'AAAA0000000011111', 'Chevrolet', 'N300 MAX', 2021, 'Blanco', 'gasoline', 89000),
  ('a5000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'MNOP78', 'AAAA0000000022222', 'Chevrolet', 'N300 MAX', 2020, 'Blanco', 'gasoline', 125000),
  ('a5000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'QRST90', 'BBBB0000000033333', 'Ford', 'Transit', 2022, 'Azul', 'diesel', 67000),
  ('a5000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000004', 'UVWX11', 'CCCC0000000044444', 'Kia', 'Sportage', 2019, 'Rojo', 'diesel', 78000),
  ('a5000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000005', 'YZAB22', 'DDDD0000000055555', 'Toyota', 'Hilux', 2023, 'Gris', 'diesel', 32000),
  ('a5000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000005', 'CDEF33', 'DDDD0000000066666', 'Toyota', 'Hilux', 2022, 'Negro', 'diesel', 55000),
  ('a5000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000006', 'GHIJ44', 'EEEE0000000077777', 'Mercedes-Benz', 'GLC 300', 2024, 'Negro', 'gasoline', 5000)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. INVENTARIO DE REPUESTOS
-- =====================================================
INSERT INTO inventory_items (id, tenant_id, sku, name, description, category, brand, oem_number, stock_quantity, min_stock, cost_price, sell_price, location) VALUES
  ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'FIL-ACE-001', 'Filtro de Aceite Toyota', 'Filtro aceite original Toyota Corolla/Yaris', 'filtros', 'Toyota', '04152-YZZA1', 25, 5, 4500, 8900, 'A-01-01'),
  ('a6000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'FIL-AIR-001', 'Filtro de Aire Toyota', 'Filtro aire motor Toyota Corolla 2019+', 'filtros', 'Toyota', '17801-21060', 15, 3, 6800, 13500, 'A-01-02'),
  ('a6000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ACE-MOT-001', 'Aceite Motor 5W-30 Mobil 1', 'Aceite sintetico Mobil 1 5W-30 (4L)', 'lubricantes', 'Mobil', 'MOB-5W30-4L', 40, 10, 18500, 32900, 'B-02-01'),
  ('a6000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'PAS-FRE-001', 'Pastillas de Freno Delanteras', 'Pastillas freno Brembo Toyota Corolla/Yaris', 'frenos', 'Brembo', 'P83024', 12, 4, 22000, 39900, 'C-01-01'),
  ('a6000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'BAT-MOT-001', 'Bateria Bosch S4 60Ah', 'Bateria Bosch S4 12V 60Ah 540CCA', 'electrico', 'Bosch', '0092S40050', 8, 2, 65000, 99900, 'D-01-01'),
  ('a6000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'AMO-DEL-001', 'Amortiguador Delantero KYB', 'Amortiguador KYB Excel-G Toyota Corolla', 'suspension', 'KYB', '334323', 6, 2, 35000, 59900, 'C-02-01'),
  ('a6000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'BUJ-ENC-001', 'Bujia Iridium NGK', 'Bujia NGK Iridium IX (unidad)', 'encendido', 'NGK', 'ILZKR7B11', 30, 8, 5500, 9900, 'A-02-01'),
  ('a6000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'COR-DIS-001', 'Correa de Distribucion Gates', 'Kit correa distribucion Gates Toyota 1.8L', 'motor', 'Gates', 'TCK328', 4, 2, 45000, 79900, 'C-03-01'),
  ('a6000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'LIQ-FRE-001', 'Liquido de Frenos DOT4', 'Liquido frenos Bosch DOT4 (1L)', 'frenos', 'Bosch', '1987479107', 20, 5, 5200, 8900, 'B-01-01'),
  ('a6000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'FIL-COM-001', 'Filtro de Combustible', 'Filtro combustible Hyundai Tucson', 'filtros', 'Hyundai', '31112-D3000', 10, 3, 12000, 21900, 'A-01-03')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. ORDENES DE TRABAJO (order_number is auto-serial)
-- =====================================================
INSERT INTO work_orders (id, tenant_id, vehicle_id, client_id, assigned_to, status, type, priority, description, diagnosis, estimated_hours, actual_hours, labor_cost, parts_cost, total_cost, created_at) VALUES
  ('a7000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'completed', 'repair', 'normal', 'Mantencion 45.000 km', 'Cambio aceite, filtros, revision frenos', 2.5, 2.5, 62500, 31300, 112336, '2024-12-15 09:00:00'),
  ('a7000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000006', 'a3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'in_progress', 'repair', 'high', 'Ruido en suspension delantera', 'Amortiguadores delanteros gastados, bases con holgura', 4.0, 2.0, 100000, 119800, 261524, '2025-01-20 10:30:00'),
  ('a7000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000007', 'a3000000-0000-0000-0000-000000000005', NULL, 'pending', 'maintenance', 'normal', 'Mantencion 30.000 km Toyota Hilux', NULL, 3.0, 0, 0, 0, 0, '2025-02-01 08:00:00'),
  ('a7000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'pending', 'repair', 'low', 'Cambio correa distribucion N300', 'Correa con desgaste, tensor debil', 6.0, 0, 150000, 79900, 273571, '2025-01-28 14:00:00'),
  ('a7000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', NULL, 'pending', 'maintenance', 'normal', 'Mantencion 20.000 km Tucson', 'Cambio aceite, filtro aire, filtro combustible, revision general', 3.0, 0, 75000, 68300, 170513, '2025-02-10 11:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. PARTES DE ORDENES DE TRABAJO (name is required)
-- =====================================================
INSERT INTO work_order_parts (id, tenant_id, work_order_id, inventory_item_id, name, quantity, unit_price, total_price) VALUES
  ('a8000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'Filtro de Aceite Toyota', 1, 8900, 8900),
  ('a8000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000002', 'Filtro de Aire Toyota', 1, 13500, 13500),
  ('a8000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000009', 'Liquido de Frenos DOT4', 1, 8900, 8900),
  ('a8000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000006', 'Amortiguador Delantero KYB', 2, 59900, 119800),
  ('a8000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000008', 'Correa de Distribucion Gates', 1, 79900, 79900),
  ('a8000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000005', 'a6000000-0000-0000-0000-000000000003', 'Aceite Motor 5W-30 Mobil 1', 1, 32900, 32900),
  ('a8000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000005', 'a6000000-0000-0000-0000-000000000002', 'Filtro de Aire Toyota', 1, 13500, 13500),
  ('a8000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000005', 'a6000000-0000-0000-0000-00000000000a', 'Filtro de Combustible', 1, 21900, 21900)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. COTIZACIONES (quote_number is auto-serial, created_by required)
-- =====================================================
INSERT INTO quotations (id, tenant_id, vehicle_id, client_id, created_by, status, items, subtotal, tax, total, valid_until, notes) VALUES
  ('a9000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'draft',
    '[{"description":"Mantencion 20.000 km","quantity":1,"unitPrice":75000,"total":75000},{"description":"Filtro aceite + aire + combustible","quantity":1,"unitPrice":68300,"total":68300}]',
    143300, 27227, 170527, '2025-03-10 00:00:00-03', 'Incluye revision multipunto de 25 puntos'),
  ('a9000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000008', 'a3000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000004', 'draft',
    '[{"description":"Cambio kit embrague completo","quantity":1,"unitPrice":289000,"total":289000},{"description":"Mano de obra embrague","quantity":1,"unitPrice":180000,"total":180000}]',
    469000, 89110, 558110, '2025-03-15 00:00:00-03', 'Garantia 12 meses o 20.000 km en repuestos'),
  ('a9000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'draft',
    '[{"description":"Reparacion motor N300 MAX","quantity":1,"unitPrice":650000,"total":650000},{"description":"Repuestos motor","quantity":1,"unitPrice":380000,"total":380000}]',
    1030000, 195700, 1225700, '2025-02-28 00:00:00-03', 'Presupuesto sujeto a revision del motor')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 11. PROVEEDORES (only columns that exist in schema)
-- =====================================================
INSERT INTO suppliers (id, tenant_id, name, rut, country, contact_name, contact_email, contact_phone, payment_terms, currency, is_active) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Derco Center S.A.', '96.123.456-7', 'CL', 'Patricio Navarro', 'pnavarro@derco.cl', '+56 2 2600 1000', '30 dias', 'CLP', true),
  ('aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Repuestos Magna Ltda.', '97.234.567-8', 'CL', 'Claudia Rojas', 'crojas@magna.cl', '+56 2 2345 0000', '45 dias', 'CLP', true),
  ('aa000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Guangzhou Auto Parts Co.', NULL, 'CN', 'Li Wei', 'liwei@gzap.cn', '+86 20 8888 9999', '90 dias LC', 'USD', true),
  ('aa000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Lubricantes Chile S.A.', '98.345.678-9', 'CL', 'Mario Espinoza', 'mespinoza@lubrichile.cl', '+56 2 2111 0000', '30 dias', 'CLP', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 12. BODEGAS (WMS)
-- =====================================================
INSERT INTO warehouses (id, tenant_id, code, name, address, type, is_active) VALUES
  ('ab000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'BOD-PRINCIPAL', 'Bodega Principal', 'Av. Libertador Bernardo OHiggins 1234', 'main', true),
  ('ab000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'BOD-TALLER', 'Bodega Taller', 'Interior taller, pasillo central', 'workshop', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 13. UBICACIONES DE BODEGA (capacity not max_capacity)
-- =====================================================
INSERT INTO warehouse_locations (id, tenant_id, warehouse_id, code, name, zone, aisle, shelf, bin, capacity) VALUES
  ('ac000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'A-01-01', 'Filtros Aceite', 'A', '01', '01', NULL, 100),
  ('ac000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'A-01-02', 'Filtros Aire', 'A', '01', '02', NULL, 80),
  ('ac000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'B-02-01', 'Lubricantes', 'B', '02', '01', NULL, 60),
  ('ac000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'C-01-01', 'Frenos', 'C', '01', '01', NULL, 50),
  ('ac000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'D-01-01', 'Baterias', 'D', '01', '01', NULL, 20)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 14. EMPLEADOS (personal_email, afp_name, fonasa_tramo, isapre)
-- =====================================================
INSERT INTO employees (id, tenant_id, user_id, rut, first_name, last_name, personal_email, phone, birth_date, hire_date, position, department, contract_type, work_schedule, base_salary, gratification_type, health_system, fonasa_tramo, isapre, afp_name, is_active) VALUES
  ('ad000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', '16.789.012-3', 'Pedro', 'Soto Alarcon', 'psoto@tallerdemo.cl', '+56 9 4444 5555', '1990-03-15', '2021-06-01', 'Mecanico Senior', 'TALLER', 'INDEFINIDO', 'FULL_TIME', 950000, 'ARTICULO_47', 'FONASA', 'C', NULL, 'HABITAT', true),
  ('ad000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', '17.890.123-4', 'Ana', 'Munoz Pizarro', 'amunoz@tallerdemo.cl', '+56 9 6666 7777', '1988-08-22', '2020-03-15', 'Jefa de Recepcion', 'ADMINISTRACION', 'INDEFINIDO', 'FULL_TIME', 850000, 'ARTICULO_47', 'ISAPRE', NULL, 'COLMENA', 'PROVIDA', true),
  ('ad000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', NULL, '18.901.234-5', 'Diego', 'Ramirez Vega', 'dramirez@tallerdemo.cl', '+56 9 8888 9999', '1995-11-10', '2023-01-10', 'Mecanico Junior', 'TALLER', 'PLAZO_FIJO', 'FULL_TIME', 650000, 'ARTICULO_47', 'FONASA', 'B', NULL, 'MODELO', true),
  ('ad000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', NULL, '19.012.345-6', 'Valentina', 'Castro Herrera', 'vcastro@tallerdemo.cl', '+56 9 1111 2222', '1997-05-30', '2024-07-01', 'Asistente Administrativo', 'ADMINISTRACION', 'PLAZO_FIJO', 'FULL_TIME', 550000, 'ARTICULO_47', 'FONASA', 'B', NULL, 'CUPRUM', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 15. FACTURAS (issue_date, iva, due_date, is_paid, created_by required)
-- =====================================================
INSERT INTO invoices (id, tenant_id, dte_type, folio, issue_date, status,
  emisor_rut, emisor_razon_social, emisor_giro, emisor_direccion, emisor_comuna, emisor_ciudad,
  receptor_rut, receptor_razon_social, receptor_giro, receptor_direccion, receptor_comuna, receptor_ciudad,
  monto_neto, iva, monto_total, due_date, is_paid, paid_amount,
  work_order_id, client_id, created_by) VALUES
  ('ae000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 33, 1, '2024-12-16', 'emitted',
    '76.123.456-7', 'Taller Demo Santiago SpA', 'Taller Mecanico Automotriz', 'Av. Libertador Bernardo OHiggins 1234', 'Santiago', 'Santiago',
    '12.345.678-9', 'Juan Perez Rojas', 'Particular', 'Los Leones 456, Depto 302', 'Providencia', 'Santiago',
    94400, 17936, 112336, '2025-01-15', true, 112336,
    'a7000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 16. ITEMS DE FACTURA
-- =====================================================
INSERT INTO invoice_items (id, tenant_id, invoice_id, line_number, item_name, quantity, unit_price, total_line) VALUES
  ('af000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 1, 'Mantencion 45.000 km - Mano de obra', 1, 62500, 62500),
  ('af000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 2, 'Filtro de Aceite Toyota 04152-YZZA1', 1, 8900, 8900),
  ('af000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 3, 'Filtro de Aire Toyota 17801-21060', 1, 13500, 13500),
  ('af000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 4, 'Liquido Frenos Bosch DOT4', 1, 8900, 8900)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 17. PAGOS DE CLIENTES (payment_number required, transaction_ref)
-- =====================================================
INSERT INTO client_payments (id, tenant_id, invoice_id, client_id, payment_number, amount, payment_method, payment_date, transaction_ref, status) VALUES
  ('ba000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'PAG-0001', 112336, 'TRANSFERENCIA', '2024-12-20', 'TRF-20241220-001', 'CONFIRMED')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 18. AUDIT LOG (ip_address goes in metadata jsonb)
-- =====================================================
INSERT INTO audit_logs (id, tenant_id, user_id, entity_type, entity_id, action, changes, metadata) VALUES
  ('bb000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'WORK_ORDER', 'a7000000-0000-0000-0000-000000000001', 'CREATE', '{"status":"PENDING"}', '{"ip":"192.168.1.100"}'),
  ('bb000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'WORK_ORDER', 'a7000000-0000-0000-0000-000000000001', 'UPDATE', '{"status":{"from":"PENDING","to":"IN_PROGRESS"}}', '{"ip":"192.168.1.101"}'),
  ('bb000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'WORK_ORDER', 'a7000000-0000-0000-0000-000000000001', 'UPDATE', '{"status":{"from":"IN_PROGRESS","to":"COMPLETED"}}', '{"ip":"192.168.1.101"}'),
  ('bb000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'QUOTATION', 'a9000000-0000-0000-0000-000000000001', 'CREATE', '{"status":"DRAFT"}', '{"ip":"192.168.1.102"}'),
  ('bb000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'INVOICE', 'ae000000-0000-0000-0000-000000000001', 'CREATE', '{"dte_type":33,"folio":1}', '{"ip":"192.168.1.100"}')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 19. NOTIFICACIONES
-- =====================================================
INSERT INTO notifications (id, tenant_id, user_id, type, channel, title, message, entity_type, entity_id, is_read) VALUES
  ('bc000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'WORK_ORDER_ASSIGNED', 'IN_APP', 'Nueva OT asignada', 'Se te ha asignado la OT: Ruido en suspension delantera', 'WORK_ORDER', 'a7000000-0000-0000-0000-000000000002', false),
  ('bc000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'LOW_STOCK', 'IN_APP', 'Stock bajo: Correa Distribucion', 'El item COR-DIS-001 tiene solo 4 unidades (minimo: 2)', 'INVENTORY', 'a6000000-0000-0000-0000-000000000008', false),
  ('bc000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'QUOTATION_APPROVED', 'IN_APP', 'Cotizacion aprobada', 'La cotizacion COT-2025-0002 fue aprobada por el cliente', 'QUOTATION', 'a9000000-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 20. TIPOS DE CAMBIO (tenant_id nullable here)
-- =====================================================
INSERT INTO exchange_rates (id, tenant_id, currency, date, buy_rate, sell_rate, observed_rate, source) VALUES
  ('bd000000-0000-0000-0000-000000000001', NULL, 'USD', '2025-02-14', 920.50, 925.80, 923.15, 'BANCO_CENTRAL'),
  ('bd000000-0000-0000-0000-000000000002', NULL, 'EUR', '2025-02-14', 995.30, 1001.20, 998.25, 'BANCO_CENTRAL'),
  ('bd000000-0000-0000-0000-000000000003', NULL, 'CNY', '2025-02-14', 126.40, 129.80, 128.10, 'BANCO_CENTRAL'),
  ('bd000000-0000-0000-0000-000000000004', NULL, 'USD', '2025-02-13', 919.80, 925.10, 922.45, 'BANCO_CENTRAL'),
  ('bd000000-0000-0000-0000-000000000005', NULL, 'USD', '2025-02-12', 921.20, 926.50, 923.85, 'BANCO_CENTRAL')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 21. ORDENES DE IMPORTACION (order_number is auto-serial)
-- =====================================================
INSERT INTO import_orders (id, tenant_id, supplier_id, status, incoterm, origin_country, currency, exchange_rate, fob_total, freight_cost, insurance_cost, cif_total, customs_duty, landed_cost_total, eta, notes, created_by) VALUES
  ('be000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000003', 'in_transit', 'FOB', 'CN', 'USD', 923.15, 12500.00, 2800000, 350000, 15650000, 690000, 15379375, '2025-03-15', 'Lote filtros y pastillas freno alternativas China', 'a1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 22. ITEMS DE IMPORTACION
-- =====================================================
INSERT INTO import_order_items (id, tenant_id, import_order_id, description, hs_code, quantity, unit_price, total_price) VALUES
  ('bf000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'be000000-0000-0000-0000-000000000001', 'Filtro aceite universal (lote 500)', '8421.23', 500, 5.00, 2500.00),
  ('bf000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'be000000-0000-0000-0000-000000000001', 'Pastillas freno ceramicas (lote 200)', '6813.20', 200, 12.50, 2500.00),
  ('bf000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'be000000-0000-0000-0000-000000000001', 'Filtro aire universal (lote 300)', '8421.39', 300, 8.33, 2499.00)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 23. ONBOARDING PROGRESS (module_id, step_id, no title)
-- =====================================================
INSERT INTO onboarding_progress (id, tenant_id, user_id, module_id, step_id, completed, skipped) VALUES
  ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'general', 'welcome', true, false),
  ('ca000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'general', 'company_setup', true, false),
  ('ca000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'work_orders', 'create_first', true, false),
  ('ca000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'inventory', 'add_items', true, false),
  ('ca000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'invoicing', 'first_invoice', false, false),
  ('ca000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'rrhh', 'add_employees', false, false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 24. STORAGE METRICS (measured_at required)
-- =====================================================
INSERT INTO storage_metrics (id, tenant_id, measured_at, db_size_bytes, file_size_bytes, backup_size_bytes, total_size_bytes, row_count_total, quota_bytes, usage_percent, alert_level) VALUES
  ('cb000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NOW(), 52428800, 10485760, 26214400, 89128960, 1250, 5368709120, 1.66, 'NORMAL')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- RESUMEN DE SEED DATA
-- =====================================================
-- 4 tenants (taller, concesionario, importadora, system)
-- 7 usuarios (OWNER, ADMIN, MANAGER, OPERATOR, VIEWER, + tenant B owner, + SUPER_ADMIN)
-- 2 empresas con datos SII
-- 6 clientes (personas + empresas)
-- 2 contactos de clientes
-- 9 vehiculos (marcas chilenas populares)
-- 10 items de inventario (repuestos reales con OEM codes)
-- 5 ordenes de trabajo (distintos estados)
-- 8 partes de OT
-- 3 cotizaciones
-- 4 proveedores (nacional + China)
-- 2 bodegas + 5 ubicaciones
-- 4 empleados (con datos laborales chilenos)
-- 1 factura electronica (DTE tipo 33)
-- 4 items de factura
-- 1 pago de cliente
-- 5 registros audit log
-- 3 notificaciones
-- 5 tipos de cambio (USD, EUR, CNY)
-- 1 orden de importacion + 3 items
-- 6 pasos de onboarding
-- 1 metrica de storage
-- PASSWORD DEMO: Demo2024! (para todos los usuarios)
