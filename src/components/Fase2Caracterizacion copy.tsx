import { useMemo, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { AREAS, RIESGOS, SLA_POR_RIESGO, TIPOLOGIA_INTERNA, TIPOS_PQRSF, TIPOS_TRAMITE } from '../data';
import { analizarHistorico, calcularFechaLimite, calcularSLAHoras, fmtFechaHora, puedeClasificar } from '../utils/helpers';
import { AlertasBadges, Aviso, Badge, Card, Field, PersonaSelect, RiesgoBadge, SelectConOtro, toast } from './ui';

const CERRADOS = ['Por validar el cierre', 'Cerrada con respuesta', 'Rechazada'];

export default function Fase2Caracterizacion({ p }: { p: PQRSF }) {
  const { state, usuario, actualizarPQRSF, notificar } = useApp();
  const [f, setF] = useState({
    tipoTramite: p.tipoTramite === 'Por clasificar' ? '' : p.tipoTramite,
    tipoPQRSF: p.tipoPQRSF,
    riesgo: p.riesgo === 'Sin clasificar' ? '' : p.riesgo,
    slaPersonalizado: RIESGOS.includes(p.riesgo) || p.riesgo === 'Sin clasificar' ? '' : String(p.slaHoras),
    tipologia: p.tipologia,
    area: p.area,
    ciudad: p.ciudad,
    institucion: p.institucion,
    reportaNombre: p.reportaNombre,
    paciente: p.paciente,
  });
  const [resp, setResp] = useState({ email: p.responsableEmail, nombre: p.responsableNombre, cargo: p.responsableCargo });
  const [error, setError] = useState('');

  const riesgoPersonalizado = !!f.riesgo && !RIESGOS.includes(f.riesgo);
  const slaHoras = f.riesgo && f.tipoTramite ? calcularSLAHoras(f.riesgo, f.tipoTramite, riesgoPersonalizado ? Number(f.slaPersonalizado) : undefined) : null;
  const limite = slaHoras ? calcularFechaLimite(p.fechaRecepcion, slaHoras) : null;
  const hist = useMemo(
    () => analizarHistorico(state.pqrsf, { id: p.id, institucion: f.institucion, tipologia: f.tipologia, fechaRecepcion: p.fechaRecepcion }),
    [state.pqrsf, p.id, p.fechaRecepcion, f.institucion, f.tipologia]
  );

  if (!usuario) return null;
  const editable = puedeClasificar(usuario) && !CERRADOS.includes(p.estadoLegal);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const elegirTipologia = (v: string) => {
    set('tipologia', v);
    const t = state.tipologias.find((x) => x.nombre === v);
    if (t && !t.especial) {
      set('area', t.area);
      const u = state.usuarios.find((x) => x.email === t.email);
      setResp({ email: t.email, nombre: u?.nombre ?? t.cargo, cargo: u?.cargo ?? t.cargo });
    }
    if (t?.especial) setResp({ email: '', nombre: '', cargo: '' });
  };

  const personal = state.usuarios.filter((u) => u.activo && (!f.area || u.proceso === f.area));

  const guardar = () => {
    const faltan: string[] = [];
    if (!f.tipoTramite) faltan.push('Tipo de trámite');
    if (!f.tipoPQRSF) faltan.push('Tipo de PQRSF');
    if (!f.riesgo) faltan.push('Clasificación de riesgo');
    if (riesgoPersonalizado && !Number(f.slaPersonalizado)) faltan.push('Horas de SLA del riesgo personalizado');
    if (!f.tipologia) faltan.push('Tipología específica');
    if (!f.area) faltan.push('Proceso / Área responsable');
    if (!resp.email) faltan.push('Responsable a notificar');
    if (!f.institucion.trim()) faltan.push('Institución');
    if (faltan.length) return setError(`Complete: ${faltan.join(', ')}.`);
    setError('');

    const horas = slaHoras!;
    const nuevoLimite = calcularFechaLimite(p.fechaRecepcion, horas);
    const esQR = ['Queja', 'Reclamo'].includes(f.tipoTramite);
    actualizarPQRSF(
      p.id,
      (x) => {
        const base = x.alertas.filter((a) => a !== 'Reincidencia' && a !== 'Falla sistémica');
        return {
          ...x,
          ...f,
          responsableEmail: resp.email,
          responsableNombre: resp.nombre,
          responsableCargo: resp.cargo,
          slaHoras: horas,
          fechaLimite: x.slaDetenido ? x.fechaLimite : nuevoLimite,
          clasificada: true,
          clasificadaPor: usuario.nombre,
          estadoLegal: x.estadoLegal === 'Radicada' ? 'En Proceso' : x.estadoLegal,
          estadoAccion: x.estadoAccion === 'Sin Plan' || x.estadoAccion === 'No aplica' ? (esQR ? 'Sin Plan' : 'No aplica') : x.estadoAccion,
          alertas: [...base, ...hist.alertas],
        };
      },
      'Fase 2 · Caracterización',
      `${f.tipoTramite} · ${f.tipoPQRSF} · ${f.riesgo} · ${f.tipologia} → ${f.area} (${resp.nombre}). SLA ${horas} h, vence ${fmtFechaHora(nuevoLimite)}.${
        hist.alertas.length ? ` Alertas: ${hist.alertas.join(', ')}.` : ''
      }`
    );
    notificar({
      para: [resp.email, p.radicadoPor],
      area: f.area,
      evento: 'Asignación',
      asunto: `${p.consecutivo} asignada · ${f.tipoTramite} · ${f.riesgo}`,
      cuerpo: `Se le asignó la PQRSF ${p.consecutivo} de ${f.institucion} (${f.tipologia}). Fecha límite de respuesta: ${fmtFechaHora(nuevoLimite)}.${
        hist.alertas.length ? ` ALERTAS: ${hist.alertas.join(', ')}.` : ''
      }`,
      pqrsfId: p.id,
    });
    toast('Clasificación guardada y área notificada (con copia a Dirección Técnica).');
  };

  return (
    <Card title="Fase 2 · Caracterización y clasificación técnica" subtitle="Rol: Coordinador de Calidad + Director Técnico / Líder">
      {!editable && (
        <div className="mb-4">
          <Aviso tono="ambar">{CERRADOS.includes(p.estadoLegal) ? 'La solicitud está cerrada; la caracterización es de solo lectura.' : 'Solo Coordinación de Calidad o Dirección Técnica pueden caracterizar.'}</Aviso>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Aviso tono="rojo">{error}</Aviso>
        </div>
      )}
      <fieldset disabled={!editable} className="grid gap-4 md:grid-cols-2">
        <Field label="Tipo de trámite" required>
          <SelectConOtro value={f.tipoTramite} options={TIPOS_TRAMITE} onChange={(v) => set('tipoTramite', v)} disabled={!editable} />
        </Field>
        <Field label="Tipo de PQRSF" required>
          <SelectConOtro value={f.tipoPQRSF} options={TIPOS_PQRSF} onChange={(v) => set('tipoPQRSF', v)} disabled={!editable} />
        </Field>
        <Field label="Clasificación de riesgo" required>
          <SelectConOtro value={f.riesgo} options={RIESGOS} onChange={(v) => set('riesgo', v)} disabled={!editable} />
          {riesgoPersonalizado && (
            <input className="input mt-2" type="number" min={1} placeholder="Horas de SLA para este riesgo" value={f.slaPersonalizado} onChange={(e) => set('slaPersonalizado', e.target.value)} />
          )}
        </Field>
        <Field label="Tipología específica" required>
          <SelectConOtro value={f.tipologia} options={state.tipologias.map((t) => t.nombre)} onChange={elegirTipologia} disabled={!editable} />
        </Field>
        <Field label="Proceso / Área responsable" required>
          <SelectConOtro value={f.area} options={AREAS} onChange={(v) => set('area', v)} disabled={!editable} />
        </Field>
        <Field label="Responsable notificado" required hint={f.tipologia === TIPOLOGIA_INTERNA ? 'Tipología sin correo fijo: seleccione el destinatario.' : 'Se precarga desde la tipología.'}>
          <PersonaSelect usuarios={personal} email={resp.email} nombre={resp.nombre} cargo={resp.cargo} onChange={setResp} disabled={!editable} />
        </Field>
        <Field label="Institución" required>
          <input className="input" value={f.institucion} onChange={(e) => set('institucion', e.target.value)} />
        </Field>
        <Field label="Ciudad">
          <input className="input" value={f.ciudad} onChange={(e) => set('ciudad', e.target.value)} />
        </Field>
        <Field label="Nombre de quien reporta">
          <input className="input" value={f.reportaNombre} onChange={(e) => set('reportaNombre', e.target.value)} />
        </Field>
        <Field label="Nombre del paciente (condicional)">
          <input className="input" value={f.paciente} onChange={(e) => set('paciente', e.target.value)} />
        </Field>
      </fieldset>

      {/* Cálculo automático */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-sky-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-tecni-navy">
            <Clock className="h-4 w-4" /> SLA calculado por el sistema
          </p>
          {slaHoras ? (
            <p className="mt-1 text-slate-700">
              {slaHoras} horas · Fecha/hora límite: <b>{fmtFechaHora(limite!)}</b>
              <span className="block text-xs text-slate-500">
                Regla: mínimo entre el término por riesgo ({riesgoPersonalizado ? `${f.slaPersonalizado || '?'} h personalizado` : `${SLA_POR_RIESGO[f.riesgo]} h`}) y el término máximo del trámite (360 h), contado desde la recepción.
              </span>
            </p>
          ) : (
            <p className="mt-1 text-slate-500">Seleccione tipo de trámite y riesgo.</p>
          )}
          {p.clasificada && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              Vigente: <RiesgoBadge riesgo={p.riesgo} /> {p.slaHoras} h · vence {fmtFechaHora(p.fechaLimite)}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-4 text-sm ${hist.alertas.length ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Histórico: reincidencia y falla sistémica
          </p>
          <p className="mt-1 text-slate-700">
            {hist.reincidencia} caso(s) previos de la misma institución y tipología · {hist.sistemica} caso(s) de esta tipología en 90 días.
          </p>
          <div className="mt-2">{hist.alertas.length ? <AlertasBadges alertas={hist.alertas} /> : <Badge tono="verde">Sin alertas</Badge>}</div>
        </div>
      </div>

      {editable && (
        <button className="btn-primary mt-5" onClick={guardar}>
          Guardar clasificación y notificar al área
        </button>
      )}
    </Card>
  );
}
