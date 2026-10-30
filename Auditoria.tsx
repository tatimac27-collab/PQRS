import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { esAdmin, esGerencia, fmtFechaHora } from '../utils/helpers';
import { Aviso, PageHeader, Vacio } from './ui';

export default function Auditoria({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { state, usuario } = useApp();
  const [q, setQ] = useState('');
  const [accion, setAccion] = useState('');
  const acciones = useMemo(() => Array.from(new Set(state.auditoria.map((a) => a.accion))).sort(), [state.auditoria]);
  if (!usuario) return null;
  if (!esAdmin(usuario) && !esGerencia(usuario))
    return (
      <div>
        <PageHeader title="Auditoría" />
        <Aviso tono="ambar">La auditoría está disponible para Coordinación de Calidad, Dirección Técnica y Gerencias.</Aviso>
      </div>
    );

  const lista = state.auditoria.filter(
    (a) => (!accion || a.accion === accion) && (!q || [a.usuario, a.detalle, a.accion].some((v) => v.toLowerCase().includes(q.toLowerCase())))
  );

  const exportar = () => {
    const filas = [['Fecha', 'Usuario', 'Rol', 'Acción', 'Detalle'], ...lista.map((a) => [fmtFechaHora(a.fecha), a.usuario, a.rol, a.accion, a.detalle])];
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_pqrsf_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle="Trazabilidad completa de acciones del sistema (ISO 9001 · control de la información documentada)."
        actions={
          <button className="btn-soft" onClick={exportar}>
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        }
      />
      <section className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar en usuario, acción o detalle" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input max-w-xs" value={accion} onChange={(e) => setAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {acciones.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                {['Fecha', 'Usuario', 'Acción', 'Detalle'].map((h) => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.slice(0, 300).map((a) => (
                <tr key={a.id}>
                  <td className="td whitespace-nowrap text-xs">{fmtFechaHora(a.fecha)}</td>
                  <td className="td text-xs">
                    <p className="font-medium">{a.usuario}</p>
                    <p className="text-slate-500">{a.rol}</p>
                  </td>
                  <td className="td text-xs font-semibold">{a.accion}</td>
                  <td className="td text-xs">
                    {a.detalle}{' '}
                    {a.pqrsfId && state.pqrsf.some((p) => p.id === a.pqrsfId) && (
                      <button className="font-semibold text-tecni-primary hover:underline" onClick={() => onAbrir(a.pqrsfId!)}>
                        Ver →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!lista.length && <Vacio>Sin registros.</Vacio>}
        </div>
      </section>
    </div>
  );
}
