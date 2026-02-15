'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Vehicle {
  id: string;
  plate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: string;
  clientName: string;
}

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  in_service: 'warning',
  inactive: 'error',
};

const statusLabel: Record<string, string> = {
  active: 'Activo',
  in_service: 'En Servicio',
  inactive: 'Inactivo',
};

export default function VehiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchVehicles() {
      try {
        const data = await api.get<Vehicle[]>('/vehicles');
        setVehicles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar vehiculos');
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const columns: Column<Vehicle>[] = [
    { key: 'plate', header: 'Patente', render: (v) => <span className="font-medium text-slate-800">{v.plate}</span> },
    { key: 'vin', header: 'VIN', className: 'hidden md:table-cell' },
    { key: 'brand', header: 'Marca' },
    { key: 'model', header: 'Modelo' },
    { key: 'year', header: 'Ano', className: 'hidden sm:table-cell' },
    { key: 'color', header: 'Color', className: 'hidden lg:table-cell' },
    {
      key: 'status',
      header: 'Estado',
      render: (v) => (
        <Badge variant={statusBadgeVariant[v.status] || 'default'}>
          {statusLabel[v.status] || v.status}
        </Badge>
      ),
    },
    { key: 'clientName', header: 'Cliente', className: 'hidden lg:table-cell' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Vehiculos</h1>
        <Button>+ Nuevo Vehiculo</Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar por patente, VIN, marca o modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(v) => v.id}
          loading={loading}
          emptyMessage="No se encontraron vehiculos"
        />
      </Card>
    </div>
  );
}
