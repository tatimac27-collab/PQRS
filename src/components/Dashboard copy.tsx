import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, Inbox, Mail, RotateCcw, Search, XCircle } from 'lucide-react';
import type { PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { accionActiva, esAdmin, esAsignado, estaVencida, fmtFechaHora, veTodo, visiblePara, ESTADOS_ABIERTOS, puedeValidar } from '../utils/helpers';
import { AccionBadge, AlertasBadges, Badge, Card, EstadoBadge, PageHeader, RiesgoBadge, TerminoBadge, Vacio } from './ui';
import DashboardAnalytics from './DashboardAnalytics';
import { CerrarSolicitudModal, ESTADOS_REABRIBLES, ReabrirModal, ReasignarModal, RechazarModal } from './AccionesModales';

type Filtro = 'todas' | 'tramite' | 'validar' | 'vencidas' | 'accion';
const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'tramite', label: 'En trámite' },
  { id: 'validar', label: 'Por validar el cierre' },
  { id: 'vencidas', label: 'Vencidas' },
  { id: 'accion', label: 'Con acción correctiva activa' },
];

const pctConsumido = (p: PQRSF, now: number) => {
  const ini = new Date(p.fechaRecepcion).getTime();
  const fin = new Date(p.fechaLimite).getTime();
  const ref = p.slaDetenido && p.fechaDetencionSLA ? new Date(p.fechaDetencionSLA).getTime() : now;
  return Math.max(0, Math.min(100, Math.round(((ref - ini) / Math.max(1, fin - ini)) * 100)));
};

export default function Dashboard({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { state, usuario, now, reintentarEnvio } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ tipo: 'cerrar' | 'rechazar' | 'reabrir' | 'reasignar'; id: string } | null>(null);
  const [verTodasAlertas, setVerTodasAlertas] = useState(false);

  const visibles = useMemo(() => (usuario ? state.pqrsf.filter((p) => visiblePara(usuario, p)) : []), [state.pqrsf, usuario]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return visibles
      .filter((p) => {
        if (filtro === 'tramite') return ESTADOS_ABIERTOS.includes(p.estadoLegal);
        if (filtro === 'validar') return p.estadoLegal === 'Por validar el cierre';
        if (filtro === 'vencidas') return estaVencida(p, now);
        if (filtro === 'accion') return accionActiva(p);
        return true;
      })
      .filter((p) =>
        !t ? true : [p.consecutivo, p.institucion, p.reportaNombre, p.area, p.ciudad, p.tipologia].some((v) => v?.toLowerCase().includes(t))
      )
      .sort((a, b) => b.fechaRecepcion.localeCompare(a.fechaRecepcion));
  }, [visibles, filtro, q, now]);

  if (!usuario) return null;
  const admin = esAdmin(usuario);
  const asignadas = state.pqrsf.filter((p) => esAsignado(usuario, p)).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  const porValidarMias = state.pqrsf.filter((p) => p.estadoLegal === 'Por validar el cierre' && p.radicadoPor === usuario.email && !esAsignado(usuario, p));
  const notifs = state.notificaciones.filter((n) => veTodo(usuario) || n.para.includes(usuario.email) || n.cc.includes(usuario.email));
  const sel = modal ? state.pqrsf.find((p) => p.id === modal.id) ?? null : null;
  const puedeOperar = (p: PQRSF) => ['Radicada', 'En Proceso', 'Reabierta'].includes(p.estadoLegal);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tablero de control PQRSF"
        subtitle={`Sesión: ${usuario.nombre} · ${usuario.cargo}. ${
          veTodo(usuario) ? 'Su rol le permite ver todas las PQRSF de la institución.' : 'Ve las solicitudes que radicó, las asignadas a usted y las de su proceso.'
        }`}
      />

      <DashboardAnalytics lista={visibles} onAbrir={onAbrir} />

      {/* Bandeja del usuario */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-tecni-primary" /> Solicitudes que le han sido asignadas
          </span>
        }
        subtitle="Requerimientos puestos a su cargo. Cierre adjuntando soportes, rechace con justificación o reabra cuando el cierre fue insuficiente."
      >
        {asignadas.length === 0 ? (
          <Vacio>No tiene solicitudes asignadas.</Vacio>
        ) : (
          <div className="divide-y divide-slate-100">
            {asignadas.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <button className="font-semibold text-tecni-primary hover:underline" onClick={() => onAbrir(p.id)}>
                    {p.consecutivo}
                  </button>{' '}
                  <span className="text-sm text-slate-600">
                    · {p.institucion} · {p.tipologia || 'Sin tipología'}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <EstadoBadge estado={p.estadoLegal} />
                    <TerminoBadge p={p} now={now} />
                    {p.delegadoEmail === usuario.email && <Badge tono="morado">Delegada a usted</Badge>}
                    {p.convertidaEnQueja && <Badge tono="rojo">Convertida en Queja</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-soft btn-sm" onClick={() => onAbrir(p.id)}>
                    Abrir y gestionar
                  </button>
                  <button className="btn-success btn-sm" disabled={!puedeOperar(p)} onClick={() => setModal({ tipo: 'cerrar', id: p.id })}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Cerrar solicitud
                  </button>
                  <button className="btn-danger btn-sm" disabled={!puedeOperar(p)} onClick={() => setModal({ tipo: 'rechazar', id: p.id })}>
                    <XCircle className="h-3.5 w-3.5" /> Rechazar
                  </button>
                  <button className="btn-ghost btn-sm" disabled={!ESTADOS_REABRIBLES.includes(p.estadoLegal)} onClick={() => setModal({ tipo: 'reabrir', id: p.id })}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {porValidarMias.length > 0 && (
          <div className="mt-4 rounded-xl bg-violet-50 p-4">
            <p className="mb-2 text-sm font-semibold text-violet-800">Pendientes de su validación (usted las radicó)</p>
            <div className="flex flex-wrap gap-2">
              {porValidarMias.map((p) => (
                <button key={p.id} className="btn-soft btn-sm" onClick={() => onAbrir(p.id)}>
                  {p.consecutivo} · validar cierre
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Tabla principal */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button key={f.id} onClick={() => setFiltro(f.id)} className={`btn-sm btn ${filtro === f.id ? 'bg-tecni-primary text-white' : 'bg-tecni-light text-tecni-navy hover:bg-sky-200'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar por consecutivo, cliente, institución o área" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Consecutivo', 'Cliente / Institución', 'Riesgo', 'Vence', 'Término', 'Estado legal', 'Acción correctiva', 'Alertas', 'Acciones'].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="td">
                    <button className="font-semibold text-tecni-primary hover:underline" onClick={() => onAbrir(p.id)}>
                      {p.consecutivo}
                    </button>
                    <p className="text-xs text-slate-500">
                      {p.origen} · {pctConsumido(p, now)}% · {p.tipoTramite}
                    </p>
                    {/^p\d+$/.test(p.id) && <Badge tono="gris">Ejemplo</Badge>}
                  </td>
                  <td className="td max-w-[240px]">
                    <p className="font-medium">{p.institucion}</p>
                    <p className="truncate text-xs text-slate-500">{p.descripcion}</p>
                    <p className="text-xs text-slate-400">{p.area || 'Sin área asignada'}</p>
                  </td>
                  <td className="td">
                    <RiesgoBadge riesgo={p.riesgo} />
                  </td>
                  <td className="td whitespace-nowrap text-xs">{fmtFechaHora(p.fechaLimite)}</td>
                  <td className="td">
                    <TerminoBadge p={p} now={now} />
                  </td>
                  <td className="td">
                    <EstadoBadge estado={p.estadoLegal} />
                  </td>
                  <td className="td">
                    <AccionBadge estado={p.estadoAccion} />
                  </td>
                  <td className="td max-w-[180px]">
                    <AlertasBadges alertas={p.alertas} />
                  </td>
                  <td className="td">
                    <div className="flex flex-col gap-1.5">
                      <button className="btn-primary btn-sm" onClick={() => onAbrir(p.id)}>
                        Abrir y gestionar
                      </button>
                      {admin && (
                        <button className="btn-soft btn-sm" onClick={() => setModal({ tipo: 'reasignar', id: p.id })}>
                          Reasignar
                        </button>
                      )}
                      {ESTADOS_REABRIBLES.includes(p.estadoLegal) && puedeValidar(usuario, p) && (
                        <button className="btn-ghost btn-sm" onClick={() => setModal({ tipo: 'reabrir', id: p.id })}>
                          Reabrir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && <Vacio>No hay solicitudes para este filtro.</Vacio>}
        </div>
      </section>

      {/* Bandeja de alertas */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-tecni-primary" /> Bandeja de alertas y notificaciones
          </span>
        }
        subtitle="Simulación del envío de correos (siempre con copia a Dirección Técnica)."
      >
        {notifs.length === 0 ? (
          <Vacio>Sin alertas registradas todavía.</Vacio>
        ) : (
          <ul className="space-y-2">
            {(verTodasAlertas ? notifs : notifs.slice(0, 8)).map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Mail className="h-4 w-4 text-tecni-primary" /> {n.asunto}
                  </p>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {n.envio === 'enviado' && <Badge tono="verde">Enviado por Gmail</Badge>}
                    {n.envio === 'pendiente' && <Badge tono="ambar">Enviando…</Badge>}
                    {n.envio === 'error' && <Badge tono="rojo">Error de envío</Badge>}
                    {(!n.envio || n.envio === 'simulado') && <Badge tono="gris">Solo registrado</Badge>}
                    {fmtFechaHora(n.fecha)}
                  </span>
                </div>
                {n.envio === 'error' && (
                  <p className="mt-1 text-xs text-red-700">
                    {n.envioDetalle}{' '}
                    {esAdmin(usuario) && (
                      <button className="font-semibold underline" onClick={() => reintentarEnvio(n.id)}>
                        Reintentar
                      </button>
                    )}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  <b>Para:</b> {n.para.join(', ') || '—'} · <b>CC:</b> {n.cc.join(', ')}
                </p>
                <p className="mt-1 text-sm text-slate-700">{n.cuerpo}</p>
                {n.pqrsfId && (
                  <button className="mt-1 text-xs font-semibold text-tecni-primary hover:underline" onClick={() => onAbrir(n.pqrsfId!)}>
                    Ver solicitud →
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {notifs.length > 8 && (
          <button className="btn-soft btn-sm mt-3" onClick={() => setVerTodasAlertas(!verTodasAlertas)}>
            {verTodasAlertas ? 'Ver menos' : `Ver todas (${notifs.length})`}
          </button>
        )}
      </Card>

      {modal?.tipo === 'cerrar' && <CerrarSolicitudModal p={sel} onClose={() => setModal(null)} />}
      {modal?.tipo === 'rechazar' && <RechazarModal p={sel} onClose={() => setModal(null)} />}
      {modal?.tipo === 'reabrir' && <ReabrirModal p={sel} onClose={() => setModal(null)} />}
      {modal?.tipo === 'reasignar' && <ReasignarModal p={sel} onClose={() => setModal(null)} />}
    </div>
  );
}
