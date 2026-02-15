'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BackupRecord {
  id: string;
  tenantId: string;
  backupType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  storageTarget: 'LOCAL' | 'R2_CLOUD' | 'BOTH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  localPath: string | null;
  cloudUrl: string | null;
  sizeBytes: number;
  tablesIncluded: string[];
  rowCounts: Record<string, number>;
  checksumSha256: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  errorMessage: string | null;
  triggeredBy: 'SCHEDULED' | 'MANUAL' | 'AUTO_SCALE';
  createdAt: string;
}

interface StorageMetric {
  id: string;
  tenantId: string;
  measuredAt: string;
  dbSizeBytes: number;
  fileSizeBytes: number;
  backupSizeBytes: number;
  totalSizeBytes: number;
  rowCountTotal: number;
  quotaBytes: number;
  usagePercent: number;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';
}

interface BackupSchedule {
  fullBackupCron: string;
  incrementalBackupCron: string;
  retentionDays: number;
  localRetentionDays: number;
  cloudRetentionDays: number;
  maxBackupsPerTenant: number;
  defaultQuotaBytes: number;
  autoScaleEnabled: boolean;
  autoScaleThreshold: number;
  autoScaleIncrementPercent: number;
}

interface ScaleEvent {
  id: string;
  tenantId: string;
  eventType: 'SCALE_UP' | 'SCALE_DOWN_SUGGESTED';
  previousQuota: number;
  newQuota: number;
  usagePercent: number;
  reason: string;
  createdAt: string;
}

type ActiveTab = 'estado' | 'respaldos' | 'configuracion';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const idx = Math.min(i, units.length - 1);
  return `${(bytes / Math.pow(k, idx)).toFixed(idx > 0 ? 2 : 0)} ${units[idx]}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startStr: string | null, endStr: string | null): string {
  if (!startStr || !endStr) return '-';
  const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  EXPIRED: 'Expirado',
};

const statusVariants: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  EXPIRED: 'default',
};

const typeLabels: Record<string, string> = {
  FULL: 'Completo',
  INCREMENTAL: 'Incremental',
  DIFFERENTIAL: 'Diferencial',
};

const targetLabels: Record<string, string> = {
  LOCAL: 'Local',
  R2_CLOUD: 'Nube R2',
  BOTH: 'Local + Nube',
};

const triggerLabels: Record<string, string> = {
  SCHEDULED: 'Programado',
  MANUAL: 'Manual',
  AUTO_SCALE: 'Auto-Scale',
};

const alertColors: Record<string, string> = {
  NORMAL: '#10b981',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
  EXCEEDED: '#dc2626',
};

const alertLabels: Record<string, string> = {
  NORMAL: 'Normal',
  WARNING: 'Advertencia',
  CRITICAL: 'Critico',
  EXCEEDED: 'Excedido',
};

const alertVariants: Record<string, 'success' | 'warning' | 'error'> = {
  NORMAL: 'success',
  WARNING: 'warning',
  CRITICAL: 'error',
  EXCEEDED: 'error',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function RespaldosPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('estado');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Storage state
  const [currentStorage, setCurrentStorage] = useState<StorageMetric | null>(null);
  const [storageHistory, setStorageHistory] = useState<StorageMetric[]>([]);

  // Backup state
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupTotal, setBackupTotal] = useState(0);
  const [backupLoading, setBackupLoading] = useState(false);

  // Config state
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [scaleHistory, setScaleHistory] = useState<ScaleEvent[]>([]);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'FULL' | 'INCREMENTAL'>('FULL');
  const [createTarget, setCreateTarget] = useState<'LOCAL' | 'R2_CLOUD' | 'BOTH'>('BOTH');
  const [creating, setCreating] = useState(false);

  // Restore confirmation
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Config edit state
  const [editAutoScale, setEditAutoScale] = useState(true);
  const [editThreshold, setEditThreshold] = useState(85);
  const [editRetention, setEditRetention] = useState(90);
  const [editQuota, setEditQuota] = useState(10);
  const [savingConfig, setSavingConfig] = useState(false);

  // ─── Data Fetchers ──────────────────────────────────────────────────────

  const fetchStorage = useCallback(async () => {
    try {
      const [current, history] = await Promise.all([
        api.get<StorageMetric>('/backup/storage'),
        api.get<StorageMetric[]>('/backup/storage/history?days=30'),
      ]);
      setCurrentStorage(current);
      setStorageHistory(history);
    } catch {
      // Storage may not be measured yet
    }
  }, []);

  const fetchBackups = useCallback(async () => {
    setBackupLoading(true);
    try {
      const result = await api.get<{ data: BackupRecord[]; total: number }>('/backup');
      setBackups(result.data);
      setBackupTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar respaldos');
    } finally {
      setBackupLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const [sched, scale] = await Promise.all([
        api.get<BackupSchedule>('/backup/schedule'),
        api.get<ScaleEvent[]>('/backup/storage/scale-history'),
      ]);
      setSchedule(sched);
      setScaleHistory(scale);
      setEditAutoScale(sched.autoScaleEnabled);
      setEditThreshold(sched.autoScaleThreshold);
      setEditRetention(sched.retentionDays);
      setEditQuota(Math.round(sched.defaultQuotaBytes / (1024 * 1024 * 1024)));
    } catch {
      // Config may not exist yet
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchStorage(), fetchBackups(), fetchConfig()]);
      setLoading(false);
    }
    init();
  }, [fetchStorage, fetchBackups, fetchConfig]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleCreateBackup = async () => {
    setCreating(true);
    setError('');
    try {
      await api.post('/backup', {
        backupType: createType,
        storageTarget: createTarget,
      });
      setSuccess('Respaldo creado exitosamente');
      setShowCreateModal(false);
      await fetchBackups();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear respaldo');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    setRestoring(true);
    setError('');
    try {
      const result = await api.post<{ message: string }>(`/backup/${backupId}/restore`);
      setSuccess(result.message);
      setRestoreId(null);
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar respaldo');
    } finally {
      setRestoring(false);
    }
  };

  const handleCleanup = async () => {
    setError('');
    try {
      const result = await api.delete<{ deleted: number }>('/backup/cleanup');
      setSuccess(`${result.deleted} respaldos expirados eliminados`);
      await fetchBackups();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al limpiar respaldos');
    }
  };

  const handleMeasureStorage = async () => {
    setError('');
    try {
      await api.post('/backup/storage/measure');
      setSuccess('Medicion de almacenamiento completada');
      await fetchStorage();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al medir almacenamiento');
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError('');
    try {
      await api.patch('/backup/schedule', {
        retentionDays: editRetention,
        autoScaleEnabled: editAutoScale,
        autoScaleThreshold: editThreshold,
      });
      await api.patch('/backup/storage/quota', {
        quotaBytes: editQuota * 1024 * 1024 * 1024,
      });
      setSuccess('Configuracion guardada');
      await fetchConfig();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuracion');
    } finally {
      setSavingConfig(false);
    }
  };

  // ─── Storage Gauge Component ────────────────────────────────────────────

  const StorageGauge = ({ percent, alertLevel }: { percent: number; alertLevel: string }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const clampedPercent = Math.min(percent, 100);
    const offset = circumference - (clampedPercent / 100) * circumference;
    const color = alertColors[alertLevel] || '#10b981';

    return (
      <div className="flex flex-col items-center">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 90 90)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <text
            x="90"
            y="82"
            textAnchor="middle"
            className="text-3xl font-bold"
            fill="#1e293b"
            fontSize="28"
          >
            {percent.toFixed(1)}%
          </text>
          <text
            x="90"
            y="106"
            textAnchor="middle"
            fill="#64748b"
            fontSize="12"
          >
            uso del almacenamiento
          </text>
        </svg>
        <Badge variant={alertVariants[alertLevel] || 'success'} className="mt-2">
          {alertLabels[alertLevel] || alertLevel}
        </Badge>
      </div>
    );
  };

  // ─── Mini Bar Chart ─────────────────────────────────────────────────────

  const MiniBarChart = ({ data }: { data: StorageMetric[] }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-slate-400 text-sm">
          Sin datos historicos. Ejecuta una medicion primero.
        </div>
      );
    }

    const maxUsage = Math.max(...data.map((d) => Number(d.usagePercent)), 1);

    return (
      <div className="flex items-end gap-1 h-32">
        {data.map((metric, i) => {
          const height = Math.max((Number(metric.usagePercent) / maxUsage) * 100, 2);
          const color = alertColors[metric.alertLevel] || '#10b981';
          const date = new Date(metric.measuredAt);

          return (
            <div
              key={metric.id || i}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              <div
                className="w-full rounded-t-sm min-w-[4px] transition-all hover:opacity-80"
                style={{
                  height: `${height}%`,
                  backgroundColor: color,
                }}
              />
              <div className="hidden group-hover:block absolute -top-10 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })} - {Number(metric.usagePercent).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-500">Cargando sistema de respaldos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Respaldos y Almacenamiento</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleMeasureStorage}>
            Medir Almacenamiento
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            + Crear Respaldo
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">Cerrar</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600 ml-4">Cerrar</button>
        </div>
      )}

      {/* Storage Alert Banner */}
      {currentStorage && (currentStorage.alertLevel === 'WARNING' || currentStorage.alertLevel === 'CRITICAL' || currentStorage.alertLevel === 'EXCEEDED') && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${
            currentStorage.alertLevel === 'EXCEEDED'
              ? 'bg-red-100 border border-red-300 text-red-800'
              : currentStorage.alertLevel === 'CRITICAL'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          <span className="text-lg">
            {currentStorage.alertLevel === 'EXCEEDED' ? '!!' : currentStorage.alertLevel === 'CRITICAL' ? '!' : '!'}
          </span>
          <span>
            {currentStorage.alertLevel === 'EXCEEDED'
              ? `ALMACENAMIENTO EXCEDIDO — Uso actual: ${Number(currentStorage.usagePercent).toFixed(1)}%. Se ha activado auto-escalamiento de emergencia.`
              : currentStorage.alertLevel === 'CRITICAL'
              ? `Almacenamiento CRITICO — Uso actual: ${Number(currentStorage.usagePercent).toFixed(1)}%. Se recomienda ampliar quota o limpiar datos.`
              : `Almacenamiento en advertencia — Uso actual: ${Number(currentStorage.usagePercent).toFixed(1)}%. Monitorear de cerca.`}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['estado', 'respaldos', 'configuracion'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'estado' ? 'Estado' : tab === 'respaldos' ? 'Respaldos' : 'Configuracion'}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: ESTADO (Storage Dashboard) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'estado' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Storage Gauge */}
            <Card>
              <CardBody>
                <StorageGauge
                  percent={currentStorage ? Number(currentStorage.usagePercent) : 0}
                  alertLevel={currentStorage?.alertLevel || 'NORMAL'}
                />
              </CardBody>
            </Card>

            {/* Current Stats */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-800">Detalle de Almacenamiento</h3>
              </CardHeader>
              <CardBody>
                {currentStorage ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Base de Datos</p>
                      <p className="text-lg font-semibold text-slate-800">{formatBytes(Number(currentStorage.dbSizeBytes))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Archivos</p>
                      <p className="text-lg font-semibold text-slate-800">{formatBytes(Number(currentStorage.fileSizeBytes))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Respaldos</p>
                      <p className="text-lg font-semibold text-slate-800">{formatBytes(Number(currentStorage.backupSizeBytes))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Total Usado</p>
                      <p className="text-lg font-bold text-slate-800">{formatBytes(Number(currentStorage.totalSizeBytes))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Quota Asignada</p>
                      <p className="text-lg font-semibold text-blue-700">{formatBytes(Number(currentStorage.quotaBytes))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Filas Totales</p>
                      <p className="text-lg font-semibold text-slate-800">{Number(currentStorage.rowCountTotal).toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    Sin mediciones. Haz clic en &ldquo;Medir Almacenamiento&rdquo; para comenzar.
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Auto-Scale Badge */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Auto-Escalamiento</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    El almacenamiento se ajusta automaticamente cuando se supera el umbral configurado.
                  </p>
                </div>
                <Badge variant={schedule?.autoScaleEnabled ? 'success' : 'default'}>
                  {schedule?.autoScaleEnabled ? 'Activado' : 'Desactivado'}
                </Badge>
              </div>
            </CardBody>
          </Card>

          {/* 30-day Usage Trend */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Tendencia de Uso (30 dias)</h3>
            </CardHeader>
            <CardBody>
              <MiniBarChart data={storageHistory} />
              {storageHistory.length > 0 && (
                <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                  <span>{formatDate(storageHistory[0]?.measuredAt)}</span>
                  <span>{formatDate(storageHistory[storageHistory.length - 1]?.measuredAt)}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: RESPALDOS (Backup Management) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'respaldos' && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              + Crear Respaldo
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCleanup}>
              Limpiar Expirados
            </Button>
            <span className="text-sm text-slate-400 ml-auto">
              {backupTotal} respaldos totales
            </span>
          </div>

          {/* Backup Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Destino</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Tamano</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 hidden md:table-cell">Duracion</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 hidden lg:table-cell">Origen</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 hidden lg:table-cell">Checksum</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {backupLoading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Cargando respaldos...
                      </td>
                    </tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No hay respaldos registrados
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-700">{formatDate(b.createdAt)}</td>
                        <td className="py-3 px-4">
                          <Badge variant={b.backupType === 'FULL' ? 'primary' : 'default'}>
                            {typeLabels[b.backupType]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{targetLabels[b.storageTarget]}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">{formatBytes(Number(b.sizeBytes))}</td>
                        <td className="py-3 px-4">
                          <Badge variant={statusVariants[b.status]}>
                            {statusLabels[b.status]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                          {formatDuration(b.startedAt, b.completedAt)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 hidden lg:table-cell">
                          {triggerLabels[b.triggeredBy]}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="font-mono text-xs text-slate-400" title={b.checksumSha256 || ''}>
                            {b.checksumSha256 ? b.checksumSha256.substring(0, 12) + '...' : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {b.status === 'COMPLETED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRestoreId(b.id)}
                              className="text-xs"
                            >
                              Restaurar
                            </Button>
                          )}
                          {b.status === 'FAILED' && b.errorMessage && (
                            <span className="text-xs text-red-500" title={b.errorMessage}>Ver Error</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: CONFIGURACION (Schedule & Quotas) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'configuracion' && (
        <div className="space-y-6">
          {/* Schedule Display */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Programacion de Respaldos</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Respaldo Completo</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    {schedule?.fullBackupCron || '0 2 * * 0'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Domingos a las 02:00 AM</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Respaldo Incremental</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    {schedule?.incrementalBackupCron || '0 3 * * *'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Diario a las 03:00 AM</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Retention & Auto-Scale Config */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Retencion y Auto-Escalamiento</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                {/* Retention */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Retencion de respaldos (dias)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={7}
                      max={365}
                      value={editRetention}
                      onChange={(e) => setEditRetention(parseInt(e.target.value, 10))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-semibold text-slate-800 w-16 text-right">
                      {editRetention} dias
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Local: {schedule?.localRetentionDays || 30} dias</span>
                    <span>Nube: {schedule?.cloudRetentionDays || 90} dias</span>
                  </div>
                </div>

                {/* Auto-Scale Toggle */}
                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Auto-Escalamiento</p>
                    <p className="text-xs text-slate-400">
                      Aumenta la quota automaticamente cuando se alcanza el umbral
                    </p>
                  </div>
                  <button
                    onClick={() => setEditAutoScale(!editAutoScale)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editAutoScale ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editAutoScale ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Threshold Slider */}
                {editAutoScale && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Umbral de escalamiento (%)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={70}
                        max={95}
                        value={editThreshold}
                        onChange={(e) => setEditThreshold(parseInt(e.target.value, 10))}
                        className="flex-1 accent-blue-600"
                      />
                      <span className="text-sm font-semibold text-slate-800 w-12 text-right">
                        {editThreshold}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Al superar este umbral, la quota se incrementa {schedule?.autoScaleIncrementPercent || 20}% automaticamente.
                    </p>
                  </div>
                )}

                {/* Quota Adjustment */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quota asignada (GB)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={editQuota}
                      onChange={(e) => setEditQuota(parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-500">GB</span>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-slate-100">
                  <Button onClick={handleSaveConfig} loading={savingConfig}>
                    Guardar Configuracion
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Scale History Timeline */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Historial de Auto-Escalamiento</h3>
            </CardHeader>
            <CardBody>
              {scaleHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Sin eventos de auto-escalamiento registrados
                </div>
              ) : (
                <div className="space-y-4">
                  {scaleHistory.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div
                        className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                          event.eventType === 'SCALE_UP'
                            ? 'bg-amber-500'
                            : 'bg-blue-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={event.eventType === 'SCALE_UP' ? 'warning' : 'info'}>
                            {event.eventType === 'SCALE_UP' ? 'Escalamiento' : 'Sugerencia'}
                          </Badge>
                          <span className="text-xs text-slate-400">{formatDate(event.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{event.reason}</p>
                        {event.eventType === 'SCALE_UP' && (
                          <p className="text-xs text-slate-500 mt-1">
                            Quota: {formatBytes(event.previousQuota)} → {formatBytes(event.newQuota)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Create Backup */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Crear Respaldo</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Respaldo</label>
                <div className="flex gap-2">
                  {(['FULL', 'INCREMENTAL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCreateType(t)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        createType === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Destino</label>
                <div className="flex gap-2">
                  {(['LOCAL', 'R2_CLOUD', 'BOTH'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCreateTarget(t)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        createTarget === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {targetLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateBackup}
                loading={creating}
              >
                Crear Respaldo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Restore Confirmation */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {restoreId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Confirmar Restauracion</h2>
            <p className="text-sm text-slate-600 mb-6">
              Esta accion solicitara la restauracion del respaldo seleccionado. Un administrador revisara y procesara la solicitud.
              Esta operacion podria sobrescribir datos actuales.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setRestoreId(null)}
                disabled={restoring}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleRestore(restoreId)}
                loading={restoring}
              >
                Confirmar Restauracion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
