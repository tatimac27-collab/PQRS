import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Search } from 'lucide-react';
import type { PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { fmtFechaHora } from '../utils/helpers';
import { Aviso, Badge, Card, Field, Logo, PageHeader } from './ui';

const ETAPAS = ['Radicada', 'Caracterizada y asignada', 'En gestión del área', 'Respuesta enviada', 'Cerrada'];

const etapaDe = (p: PQRSF) => {
  if (p.estadoLegal === 'Cerrada con respuesta') return 4;
  if (p.estadoLegal === 'Por validar el cierre' || p.estadoLegal === 'Rechazada') return 3;
  if (p.procedencia !== 'Pendiente' || ['Gestión del área cerrada', 'Respuesta en aprobación', 'Aprobada para envío'].includes(p.estadoLegal)) return 2;
  if (p.clasificada) return 1;
  return 0;
};

/** Consulta del estado de una PQRSF sin exponer información interna. */
export default function ConsultaPublica({ onVolver }: { onVolver?: () => void }) {
  const { state } = useApp();
  const [cons, setCons] = useState('');
  const [inst, setInst] = useState('');
  const [res, setRes] = useState<PQRSF | null | 'no'>(null);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const p = state.pqrsf.find((x) => x.consecutivo.toUpperCase() === cons.trim().toUpperCase() && x.institucion.toLowerCase().includes(inst.trim().toLowerCase()) && inst.trim().length >= 3);
    setRes(p ?? 'no');
  };

  const contenido = (
    <div className="space-y-6">
      <Card title="Consultar el estado de una solicitud" subtitle="Por seguridad se requiere el consecutivo y el nombre de la institución registrada.">
        <form onSubmit={buscar} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Consecutivo" required>
            <input className="input uppercase" placeholder="PQR0012026" value={cons} onChange={(e) => setCons(e.target.value)} />
          </Field>
          <Field label="Institución" required>
            <input className="input" placeholder="Nombre de la institución" value={inst} onChange={(e) => setInst(e.target.value)} />
          </Field>
          <button className="btn-primary" type="submit">
            <Search className="h-4 w-4" /> Consultar
          </button>
        </form>
      </Card>
      {res === 'no' && <Aviso tono="rojo">No se encontró una solicitud con esos datos. Verifique el consecutivo y la institución.</Aviso>}
      {res && res !== 'no' && (
        <Card title={res.consecutivo} subtitle={`${res.institucion} · radicada ${fmtFechaHora(res.fechaRecepcion)}`}>
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge tono="azul">{res.tipoTramite}</Badge>
            <Badge tono={res.estadoLegal === 'Cerrada con respuesta' ? 'verde' : 'azul'}>{res.estadoLegal}</Badge>
            {!res.slaDetenido && <Badge tono="gris">Respuesta estimada antes de {fmtFechaHora(res.fechaLimite)}</Badge>}
          </div>
          <ol className="grid gap-3 md:grid-cols-5">
            {ETAPAS.map((e, i) => {
              const hecho = i <= etapaDe(res);
              return (
                <li key={e} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${hecho ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-400'}`}>
                  {hecho ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />} {e}
                </li>
              );
            })}
          </ol>
          {res.cierreLegal && (
            <p className="mt-4 text-sm text-slate-600">
              Respuesta enviada el {res.cierreLegal.fechaEnvio} por {res.cierreLegal.medio}.
            </p>
          )}
        </Card>
      )}
    </div>
  );

  if (onVolver)
    return (
      <div className="min-h-screen bg-tecni-bg px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <button className="btn-soft btn-sm" onClick={onVolver}>
              <ArrowLeft className="h-4 w-4" /> Volver al ingreso
            </button>
          </div>
          <PageHeader title="Consulta pública" subtitle="Seguimiento de PQRSF para clientes e instituciones." />
          {contenido}
        </div>
      </div>
    );
  return (
    <div>
      <PageHeader title="Consulta pública" subtitle="Vista que ve el cliente: estado sin información interna." />
      {contenido}
    </div>
  );
}
