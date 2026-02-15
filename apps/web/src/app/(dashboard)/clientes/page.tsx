'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Client {
  id: string;
  rut: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  type: string;
}

const typeBadgeVariant: Record<string, 'primary' | 'info'> = {
  persona: 'primary',
  empresa: 'info',
};

const typeLabel: Record<string, string> = {
  persona: 'Persona',
  empresa: 'Empresa',
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchClients() {
      try {
        const data = await api.get<Client[]>('/clients');
        setClients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar clientes');
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.rut.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const columns: Column<Client>[] = [
    { key: 'rut', header: 'RUT', render: (c) => <span className="font-medium text-slate-800">{c.rut}</span> },
    { key: 'name', header: 'Nombre / Empresa' },
    { key: 'email', header: 'Email', className: 'hidden md:table-cell' },
    { key: 'phone', header: 'Telefono', className: 'hidden md:table-cell' },
    { key: 'city', header: 'Ciudad', className: 'hidden lg:table-cell' },
    {
      key: 'type',
      header: 'Tipo',
      render: (c) => (
        <Badge variant={typeBadgeVariant[c.type] || 'default'}>
          {typeLabel[c.type] || c.type}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <Button>+ Nuevo Cliente</Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar por nombre, RUT o email..."
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
          keyExtractor={(c) => c.id}
          loading={loading}
          emptyMessage="No se encontraron clientes"
        />
      </Card>
    </div>
  );
}
