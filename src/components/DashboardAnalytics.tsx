import { useMemo, useState } from 'react';
import { Activity, AlertOctagon, Gauge, Timer } from 'lucide-react';
import type { PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { PESOS_INDICADOR } from '../data';
import { calcularIndicadores, cerradaATiempo, estaVencida, horasRestantes } from '../utils/helpers';
import { Card, RiesgoBadge, TerminoBadge } from './ui';

// ============================================================ Matriz de priorización
export const NIVELES_PRIORIDAD = [
  { n: 1, titulo: 'Crítico / Riesgo vital', desc: 'Atención inmediata', cls: 'border-red-300 bg-red-50 text-red-800' },
  { n: 2, titulo: 'Eventos adversos / Dispositivos médicos', desc: 'Tecnovigilancia', cls: 'border-orange-300 bg-orange-50 text-orange-800' },
  { n: 3, titulo: 'SLA próximo a vencer (< 24 h)', desc: 'Incluye vencidas', cls: 'border-amber-300 bg-amber-50 text-amber-800' },
  { n: 4, titulo: 'Reincidencia / Falla sistémica', desc: 'Detectadas en el histórico', cls: 'border-violet-300 bg-violet-50 text-violet-800' },
  { n: 5, titulo: 'Trámite regular', desc: 'Dentro del término', cls: 'border-sky-300 bg-sky-50 text-sky-800' },
];

export const prioridadDe = (p: PQRSF, now: number) => {
  if (p.riesgo === 'Riesgo vital') return 1;
  if (p.dispositivo?.eventoAdverso || p.alertas.includes('Evento adverso') || p.tipoPQRSF === 'Dispositivos médicos') return 2;
  if (!p.slaDetenido && horasRestantes(p, now) < 24) return 3;
  if (p.alertas.includes('Reincidencia') || p.alertas.includes('Falla sistémica')) return 4;
  return 5;
};

const HORA = 3600_000;
const fmtDur = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} días` : `${h.toFixed(1)} h`);

function Donut({ pct, label }: { pct: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const ok = pct >= 90;
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36" role="img" aria-label={`${label}: ${Math.round(pct)}%`}>
      <title>{`${label}: ${Math.round(pct)}%`}</title>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#E2E8F0" strokeWidth="14" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={ok ? '#059669' : pct >= 70 ? '#D97706' : '#DC2626'}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="68" textAnchor="middle" className="fill-slate-900 font-display" fontSize="26" fontWeight="700">
        {Math.round(pct)}%
      </text>
      <text x="70" y="88" textAnchor="middle" className="fill-slate-500" fontSize="10">
        {ok ? 'En meta' : 'Bajo meta'}
      </text>
    </svg>
  );
}

/** Barras horizontales de una sola serie (un tono). */
function Barras({ datos, formato, vacio }: { datos: { etiqueta: string; valor: number; detalle?: string }[]; formato: (v: number) => string; vacio: string }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  if (!datos.length) return <p className="py-4 text-sm text-slate-500">{vacio}</p>;
  return (
    <ul className="space-y-2.5">
      {datos.map((d) => (
        <li key={d.etiqueta} className="group" title={`${d.etiqueta}: ${formato(d.valor)}${d.detalle ? ` · ${d.detalle}` : ''}`}>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="truncate text-slate-700">{d.etiqueta}</span>
            <span className="shrink-0 font-semibold text-slate-900">{formato(d.valor)}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-tecni-primary transition-all group-hover:bg-tecni-navy" style={{ width: `${Math.max(2, (d.valor / max) * 100)}%` }} />
          </div>
          {d.detalle && <p className="mt-0.5 text-[11px] text-slate-500">{d.detalle}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function DashboardAnalytics({ lista, onAbrir }: { lista: PQRSF[]; onAbrir: (id: string) => void }) {
  const { now } = useApp();
  const [vistaReinc, setVistaReinc] = useState<'area' | 'tipologia'>('area');
  const kpi = useMemo(() => calcularIndicadores(lista, now), [lista, now]);

  const data = useMemo(() => {
    const internas = lista.filter((p) => p.origen === 'Interna').length;
    const externas = lista.filter((p) => p.origen === 'Externa').length;
    const convertidas = lista.filter((p) => p.convertidaEnQueja).length;
    const cerradasATiempo = lista.filter((p) => p.estadoLegal === 'Cerrada con respuesta' && cerradaATiempo(p)).length;
    const respondidas = lista.filter((p) => p.slaDetenido && p.fechaDetencionSLA);
    const dur = (p: PQRSF) => (new Date(p.fechaDetencionSLA!).getTime() - new Date(p.fechaRecepcion).getTime()) / HORA;
    const promedioGlobal = respondidas.length ? respondidas.reduce((a, p) => a + dur(p), 0) / respondidas.length : 0;

    const porArea = new Map<string, number[]>();
    respondidas.forEach((p) => {
      const k = p.area || 'Sin área';
      porArea.set(k, [...(porArea.get(k) ?? []), dur(p)]);
    });
    const tiempos = [...porArea.entries()]
      .map(([etiqueta, v]) => ({ etiqueta, valor: v.reduce((a, b) => a + b, 0) / v.length, detalle: `${v.length} respondida(s)` }))
      .sort((a, b) => b.valor - a.valor);

    const agrupar = (key: (p: PQRSF) => string) => {
      const m = new Map<string, { total: number; reinc: number }>();
      lista.forEach((p) => {
        const k = key(p) || 'Sin definir';
        const e = m.get(k) ?? { total: 0, reinc: 0 };
        e.total++;
        if (p.alertas.includes('Reincidencia') || p.alertas.includes('Falla sistémica')) e.reinc++;
        m.set(k, e);
      });
      return [...m.entries()]
        .map(([etiqueta, e]) => ({ etiqueta, valor: (e.reinc / e.total) * 100, detalle: `${e.reinc} de ${e.total} con reincidencia o falla sistémica` }))
        .sort((a, b) => b.valor - a.valor);
    };

    const abiertas = lista.filter((p) => !p.slaDetenido);
    const priorizadas = abiertas
      .map((p) => ({ p, prioridad: prioridadDe(p, now), h: horasRestantes(p, now) }))
      .sort((a, b) => a.prioridad - b.prioridad || a.h - b.h);
    const conteo = NIVELES_PRIORIDAD.map((n) => priorizadas.filter((x) => x.prioridad === n.n).length);

    return { internas, externas, convertidas, cerradasATiempo, promedioGlobal, respondidas: respondidas.length, tiempos, reincArea: agrupar((p) => p.area), reincTip: agrupar((p) => p.tipologia), priorizadas, conteo };
  }, [lista, now]);

  const tiles = [
    { t: 'PQRSF registradas', v: kpi.total, s: `${data.externas} externas · ${data.internas} internas`, c: 'text-tecni-dark' },
    { t: 'Vencidas', v: kpi.vencidas, s: `${data.convertidas} convertida(s) automáticamente en Queja`, c: 'text-red-600' },
    { t: 'Por validar el cierre', v: kpi.porValidar, s: 'Esperan visto bueno', c: 'text-violet-700' },
    { t: 'Cerradas con respuesta', v: kpi.cerradas, s: `${data.cerradasATiempo} a tiempo`, c: 'text-emerald-600' },
    { t: 'Eficacia acciones (Ciclo B)', v: `${Math.round(kpi.eficacia)}%`, s: 'Evaluadas a 3 meses', c: 'text-tecni-dark' },
    { t: 'Indicador ponderado', v: `${Math.round(kpi.ponderado)}%`, s: 'Matriz 40/40/20', c: 'text-tecni-dark' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((k) => (
          <div key={k.t} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.t}</p>
            <p className={`mt-2 font-display text-3xl font-bold ${k.c}`}>{k.v}</p>
            <p className="mt-1 text-xs text-slate-500">{k.s}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* SLA */}
        <Card title={<span className="flex items-center gap-2"><Gauge className="h-5 w-5 text-tecni-primary" /> Cumplimiento de términos (SLA)</span>} subtitle="Cerradas a tiempo ÷ (cerradas + vencidas abiertas), en tiempo real">
          <div className="flex items-center gap-4">
            <Donut pct={kpi.cumplimiento} label="Cumplimiento de términos" />
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-display text-xl font-bold">{fmtDur(data.promedioGlobal)}</span>
                <span className="block text-xs text-slate-500">Tiempo promedio de respuesta global ({data.respondidas} respondidas)</span>
              </p>
              <p className="text-xs text-slate-500">Meta: ≥ 90%.</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="label">Matriz 40/40/20</p>
            {[
              ['Oportunidad (términos)', kpi.cumplimiento, PESOS_INDICADOR.terminos],
              ['Eficacia de acciones', kpi.eficacia, PESOS_INDICADOR.eficacia],
              ['Satisfacción (cierres validados)', kpi.validacion, PESOS_INDICADOR.validacion],
            ].map(([l, v, w]) => (
              <div key={l as string} className="flex justify-between text-xs" title={`${l}: ${Math.round(v as number)}% × ${(w as number) * 100}%`}>
                <span className="text-slate-600">
                  {l} · {(w as number) * 100}%
                </span>
                <span className="font-semibold">{Math.round(v as number)}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tiempos por área */}
        <Card title={<span className="flex items-center gap-2"><Timer className="h-5 w-5 text-tecni-primary" /> Tiempo promedio de respuesta por área</span>} subtitle="Desde la recepción hasta la detención del SLA">
          <Barras datos={data.tiempos} formato={fmtDur} vacio="Aún no hay solicitudes respondidas." />
        </Card>

        {/* Reincidencia */}
        <Card
          title={<span className="flex items-center gap-2"><Activity className="h-5 w-5 text-tecni-primary" /> Tasa de reincidencia</span>}
          subtitle="% de solicitudes con alerta de reincidencia o falla sistémica"
          actions={
            <div className="flex gap-1">
              {(['area', 'tipologia'] as const).map((v) => (
                <button key={v} onClick={() => setVistaReinc(v)} className={`btn btn-sm ${vistaReinc === v ? 'bg-tecni-primary text-white' : 'bg-tecni-light text-tecni-navy'}`}>
                  {v === 'area' ? 'Proceso' : 'Tipología'}
                </button>
              ))}
            </div>
          }
        >
          <Barras datos={(vistaReinc === 'area' ? data.reincArea : data.reincTip).slice(0, 8)} formato={(v) => `${Math.round(v)}%`} vacio="Sin datos." />
        </Card>
      </div>

      {/* Matriz de priorización */}
      <Card
        title={<span className="flex items-center gap-2"><AlertOctagon className="h-5 w-5 text-red-600" /> Matriz de priorización de atención</span>}
        subtitle="Severidad / riesgo vital · ordenamiento automático de las solicitudes activas con contador regresivo en vivo"
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {NIVELES_PRIORIDAD.map((n, i) => (
            <div key={n.n} className={`rounded-xl border p-3 ${n.cls}`}>
              <p className="text-xs font-semibold uppercase">Prioridad {n.n}</p>
              <p className="font-display text-2xl font-bold">{data.conteo[i]}</p>
              <p className="text-xs font-medium">{n.titulo}</p>
              <p className="text-[11px] opacity-80">{n.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr>
                {['Prioridad', 'Consecutivo', 'Institución / Área', 'Riesgo', 'Contador'].map((h) => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.priorizadas.slice(0, 10).map(({ p, prioridad }) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${NIVELES_PRIORIDAD[prioridad - 1].cls}`}>P{prioridad}</span>
                  </td>
                  <td className="td">
                    <button className="font-semibold text-tecni-primary hover:underline" onClick={() => onAbrir(p.id)}>
                      {p.consecutivo}
                    </button>
                  </td>
                  <td className="td text-xs">
                    <p className="font-medium text-sm">{p.institucion}</p>
                    {p.area || 'Sin área'}
                  </td>
                  <td className="td"><RiesgoBadge riesgo={p.riesgo} /></td>
                  <td className="td">
                    {estaVencida(p, now) ? (
                      <span className="inline-flex animate-pulse items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">¡VENCIDO!</span>
                    ) : (
                      <TerminoBadge p={p} now={now} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.priorizadas.length && <p className="py-4 text-center text-sm text-slate-500">No hay solicitudes activas.</p>}
        </div>
      </Card>
    </div>
  );
}
