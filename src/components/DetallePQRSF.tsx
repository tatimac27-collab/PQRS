import { useState } from 'react';
import { ArrowLeft, Clock3, History, TimerOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { esAdmin, fmtFechaHora, visiblePara } from '../utils/helpers';
import { AccionBadge, AlertasBadges, Aviso, Badge, Card, EstadoBadge, ListaAdjuntos, RiesgoBadge, TerminoBadge, toast } from './ui';
import { ESTADOS_REABRIBLES, ReabrirModal, ReasignarForm } from './AccionesModales';
import Fase2Caracterizacion from './Fase2Caracterizacion';
import GestionOperativa from './GestionOperativa';
import CierreYSeguimiento from './CierreYSeguimiento';

export default function DetallePQRSF({ id, onVolver }: { id: string; onVolver: () => void }) {
  const { state, usuario, now, actualizarPQRSF } = useApp();
  const [reabrir, setReabrir] = useState(false);
  const p = state.pqrsf.find((x) => x.id === id);
  if (!usuario) return null;
  if (!p || !visiblePara(usuario, p))
    return (
      <div className="space-y-4">
        <button className="btn-soft" onClick={onVolver}>
          <ArrowLeft className="h-4 w-4" /> Volver al tablero
        </button>
        <Aviso tono="rojo">La solicitud no existe o no tiene permisos para verla.</Aviso>
      </div>
    );

  const admin = esAdmin(usuario);
  const historial = state.auditoria.filter((a) => a.pqrsfId === p.id);

  const simularVencimiento = () => {
    actualizarPQRSF(p.id, (x) => ({ ...x, fechaLimite: new Date(Date.now() - 60_000).toISOString() }), 'Simulación (demostración)', 'Se forzó el vencimiento del término para probar la conversión automática a Queja.');
    toast('Término vencido: el sistema aplicará la regla de conversión a Queja.');
  };

  return (
    <div className="space-y-6">
      <button className="btn-soft btn-sm" onClick={onVolver}>
        <ArrowLeft className="h-4 w-4" /> Volver al tablero
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{p.consecutivo}</h1>
          <p className="text-sm text-slate-500">
            {p.origen} · {p.canal} · Radicada {fmtFechaHora(p.fechaRecepcion)} por {p.radicadoPorNombre}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <EstadoBadge estado={p.estadoLegal} />
            <TerminoBadge p={p} now={now} />
            <RiesgoBadge riesgo={p.riesgo} />
            <Badge tono={p.convertidaEnQueja ? 'rojo' : 'azul'}>{p.tipoTramite}</Badge>
            <AccionBadge estado={p.estadoAccion} />
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="flex items-center justify-end gap-1 text-slate-500">
            <Clock3 className="h-4 w-4" /> Vence: <b className="text-slate-800">{fmtFechaHora(p.fechaLimite)}</b>
          </p>
          <p className="text-slate-500">SLA: {p.slaHoras} h</p>
        </div>
      </div>

      {p.convertidaEnQueja && (
        <Aviso tono="rojo">
          <b>Convertida automáticamente en QUEJA</b> el {fmtFechaHora(p.fechaConversionQueja)}: el trámite original "{p.tipoTramiteOriginal}" no se cerró dentro del término establecido.
        </Aviso>
      )}
      {p.alertas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Alertas:</span>
          <AlertasBadges alertas={p.alertas} />
        </div>
      )}

      {admin && (
        <Card title="Acciones de la Administradora" subtitle="Coordinación de Calidad: corregir el enrutamiento y reabrir solicitudes sin soporte suficiente">
          <ReasignarForm key={p.id + p.area + p.responsableEmail} p={p} />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button className="btn-danger" disabled={!ESTADOS_REABRIBLES.includes(p.estadoLegal)} onClick={() => setReabrir(true)}>
              Reabrir solicitud
            </button>
            {!p.slaDetenido && (
              <button className="btn-ghost" onClick={simularVencimiento}>
                <TimerOff className="h-4 w-4" /> Simular vencimiento del término (demo)
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">La reapertura se habilita cuando la solicitud está cerrada con respuesta, por validar o rechazada.</p>
        </Card>
      )}

      <Card title="Fase 1 · Datos de radicación">
        <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-3">
          {[
            ['Quien reporta', p.reportaNombre],
            ['Contacto', p.reportaContacto || '—'],
            ['Institución', p.institucion],
            ['Ciudad', p.ciudad || '—'],
            ['Paciente', p.paciente || 'No aplica'],
            ['Tipificación', p.tipologia || 'Por definir'],
            ['Área responsable', p.area || 'Por definir'],
            ['Responsable', p.responsableNombre ? `${p.responsableNombre} (${p.responsableEmail})` : 'Por asignar'],
            ['Ejecuta (delegado)', p.delegadoNombre || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <p className="label">Descripción</p>
          <p className="whitespace-pre-wrap text-sm">{p.descripcion}</p>
        </div>
        {p.evidencias.length > 0 && (
          <div className="mt-4">
            <p className="label">Evidencias iniciales</p>
            <ListaAdjuntos adjuntos={p.evidencias} />
          </div>
        )}
        {p.rechazo && (
          <div className="mt-4">
            <Aviso tono="rojo">
              Rechazada por {p.rechazo.por} ({fmtFechaHora(p.rechazo.fecha)}): {p.rechazo.justificacion}
            </Aviso>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Fase2Caracterizacion key={`f2-${p.id}-${p.actualizado}`} p={p} />
          <GestionOperativa key={`f3-${p.id}-${p.actualizado}`} p={p} />
        </div>
        <div className="space-y-6">
          <CierreYSeguimiento key={`c-${p.id}-${p.actualizado}`} p={p} />
          <Card
            title={
              <span className="flex items-center gap-2">
                <History className="h-5 w-5 text-tecni-primary" /> Trazabilidad de la solicitud
              </span>
            }
          >
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">
              {historial.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-tecni-primary" />
                  <p className="font-semibold">{h.accion}</p>
                  <p className="text-xs text-slate-500">
                    {fmtFechaHora(h.fecha)} · {h.usuario}
                  </p>
                  <p className="text-xs text-slate-700">{h.detalle}</p>
                </li>
              ))}
              {!historial.length && <li className="text-sm text-slate-500">Sin movimientos.</li>}
            </ol>
          </Card>
        </div>
      </div>

      {reabrir && <ReabrirModal p={p} onClose={() => setReabrir(false)} />}
    </div>
  );
}
