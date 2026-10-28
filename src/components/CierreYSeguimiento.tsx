import { useState } from 'react';
import { CheckCircle2, FastForward, RotateCcw, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Adjunto, PlanAccion, PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { EMAIL_CALIDAD, EMAIL_DIRECCION_TECNICA, GERENCIAS, MEDIOS_RESPUESTA, TIPOLOGIA_INTERNA } from '../data';
import { ahoraISO, esAdmin, esAsignado, esDT, esGerencia, esLiderDelArea, fechaEvaluacionEficacia, fmtFecha, fmtFechaHora, puedeGestionar, puedeValidar } from '../utils/helpers';
import { AccionBadge, AdjuntosInput, Aviso, Badge, Card, Field, ListaAdjuntos, SelectConOtro, toast } from './ui';
import { AnalisisCausaForm, analisisCompleto, analisisVacio, esQuejaOReclamo, PlanAccionFields, planCompleto, planVacio } from './GestionOperativa';
import { ReabrirModal } from './AccionesModales';

export default function CierreYSeguimiento({ p }: { p: PQRSF }) {
  const esInterna = p.tipologia === TIPOLOGIA_INTERNA;
  return (
    <div className="space-y-6">
      {!esInterna && <RespuestaCliente p={p} />}
      <FlujoB p={p} />
      {!esInterna && <FlujoA p={p} />}
      <ValidacionCierre p={p} />
    </div>
  );
}

// ============================================================ Respuesta al cliente (requisito transversal)
function RespuestaCliente({ p }: { p: PQRSF }) {
  const { usuario, actualizarPQRSF, notificar } = useApp();
  const [texto, setTexto] = useState(p.respuesta?.texto ?? (p.procedencia === 'No Procedente' ? `Respuesta de no procedencia. Justificación: ${p.justificacionProcedencia ?? ''}` : p.cierreArea?.respuesta ?? ''));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  if (!usuario) return null;

  const r = p.respuesta;
  const qr = esQuejaOReclamo(p);
  const faltaRCA = p.procedencia === 'Procedente' && qr && !p.ciclos[0]?.analisis;
  const puedeProyectar = esAdmin(usuario) && ['En Proceso', 'Reabierta', 'Gestión del área cerrada'].includes(p.estadoLegal) && p.procedencia !== 'Pendiente' && !faltaRCA;

  const proyectar = () => {
    if (texto.trim().length < 20) return setError('Redacte la respuesta (mínimo 20 caracteres).');
    setError('');
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        estadoLegal: 'Respuesta en aprobación',
        respuesta: {
          tipo: x.procedencia === 'No Procedente' ? 'No procedente' : 'Procedente',
          texto,
          proyectadaPor: usuario.nombre,
          fecha: ahoraISO(),
          aprobGerencia: { aprobado: false },
          aprobDT: { aprobado: false },
        },
      }),
      'Respuesta proyectada por Calidad',
      `Respuesta ${p.procedencia === 'No Procedente' ? 'de no procedencia' : 'final'} enviada a aprobación de Gerencia y Dirección Técnica.`
    );
    notificar({
      para: [EMAIL_DIRECCION_TECNICA, ...GERENCIAS],
      area: p.area || undefined,
      asunto: `${p.consecutivo} · respuesta pendiente de aprobación obligatoria`,
      cuerpo: 'Coordinación de Calidad proyectó la respuesta al cliente. Requiere aprobación de la Gerencia involucrada y de la Dirección Técnica.',
      pqrsfId: p.id,
      evento: 'Aprobación',
    });
    toast('Respuesta enviada a aprobación.');
  };

  const aprobar = (cual: 'aprobGerencia' | 'aprobDT') => {
    actualizarPQRSF(
      p.id,
      (x) => {
        if (!x.respuesta) return x;
        const resp = { ...x.respuesta, [cual]: { aprobado: true, por: usuario.nombre, fecha: ahoraISO() } };
        const ambas = resp.aprobGerencia.aprobado && resp.aprobDT.aprobado;
        return { ...x, respuesta: resp, estadoLegal: ambas ? 'Aprobada para envío' : x.estadoLegal };
      },
      cual === 'aprobGerencia' ? 'Aprobación de Gerencia' : 'Aprobación de Dirección Técnica',
      `${usuario.nombre} aprobó la respuesta al cliente.`
    );
    toast('Aprobación registrada.');
  };

  const devolver = () => {
    if (motivo.trim().length < 10) return setError('Indique el motivo de la devolución.');
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        estadoLegal: 'En Proceso',
        respuesta: x.respuesta ? { ...x.respuesta, aprobGerencia: { aprobado: false }, aprobDT: { aprobado: false }, devolucion: { por: usuario.nombre, fecha: ahoraISO(), motivo } } : x.respuesta,
      }),
      'Respuesta devuelta para ajustes',
      `${usuario.nombre}: ${motivo}`
    );
    notificar({ para: [EMAIL_CALIDAD], asunto: `${p.consecutivo} · respuesta devuelta`, cuerpo: motivo, pqrsfId: p.id, evento: 'Aprobación' });
    setMotivo('');
    setError('');
  };

  const enAprobacion = p.estadoLegal === 'Respuesta en aprobación' && r;
  const yaCerrada = ['Aprobada para envío', 'Por validar el cierre', 'Cerrada con respuesta'].includes(p.estadoLegal);

  return (
    <Card title="Respuesta al cliente · requisito transversal" subtitle="Calidad proyecta → aprobación obligatoria de Gerencia involucrada y Dirección Técnica → envío y registro">
      {p.procedencia === 'Pendiente' && <Aviso tono="ambar">Pendiente: el área responsable debe validar la procedencia (Fase 3).</Aviso>}
      {faltaRCA && <Aviso tono="ambar">Queja/Reclamo procedente: se requiere el análisis de causa raíz antes de proyectar la respuesta final.</Aviso>}
      {p.cierreArea && (
        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold">Gestión cerrada por el área ({p.cierreArea.por}, {fmtFechaHora(p.cierreArea.fecha)})</p>
          <p className="mt-1 text-slate-700">{p.cierreArea.respuesta}</p>
          <div className="mt-2">
            <ListaAdjuntos adjuntos={p.cierreArea.soportes} />
          </div>
        </div>
      )}
      {r?.devolucion && p.estadoLegal !== 'Aprobada para envío' && (
        <div className="mb-3">
          <Aviso tono="rojo">
            Devuelta por {r.devolucion.por} ({fmtFechaHora(r.devolucion.fecha)}): {r.devolucion.motivo}
          </Aviso>
        </div>
      )}
      {error && <div className="mb-3"><Aviso tono="rojo">{error}</Aviso></div>}

      <Field label={`Respuesta ${p.procedencia === 'No Procedente' ? 'justificada de no procedencia' : 'final'} al cliente`} required>
        <textarea className="input min-h-[120px]" disabled={!puedeProyectar} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Field>
      {puedeProyectar && (
        <button className="btn-primary mt-3" onClick={proyectar}>
          Proyectar y enviar a aprobación
        </button>
      )}

      {r && (enAprobacion || yaCerrada) && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {([
            ['aprobGerencia', 'Gerencia involucrada', esGerencia(usuario)],
            ['aprobDT', 'Dirección Técnica', esDT(usuario)],
          ] as const).map(([k, l, permitido]) => (
            <div key={k} className={`rounded-xl border p-4 ${r[k].aprobado ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" /> Aprobación · {l}
              </p>
              {r[k].aprobado ? (
                <p className="mt-1 text-xs text-emerald-700">
                  Aprobada por {r[k].por} · {fmtFechaHora(r[k].fecha)}
                </p>
              ) : enAprobacion && permitido ? (
                <button className="btn-success btn-sm mt-2" onClick={() => aprobar(k)}>
                  <ThumbsUp className="h-3.5 w-3.5" /> Aprobar respuesta
                </button>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Pendiente{enAprobacion && !permitido ? ` · requiere rol ${l}` : ''}.</p>
              )}
            </div>
          ))}
        </div>
      )}
      {enAprobacion && (esGerencia(usuario) || esDT(usuario)) && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <input className="input" placeholder="Motivo de devolución (si no aprueba)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <button className="btn-ghost" onClick={devolver}>
            <ThumbsDown className="h-4 w-4" /> Devolver a Calidad
          </button>
        </div>
      )}
    </Card>
  );
}

// ============================================================ Flujo A · Cierre legal
function FlujoA({ p }: { p: PQRSF }) {
  const { usuario, actualizarPQRSF } = useApp();
  const [pdf, setPdf] = useState<Adjunto[]>([]);
  const [fecha, setFecha] = useState('');
  const [medio, setMedio] = useState('');
  const [error, setError] = useState('');
  if (!usuario) return null;
  const habilitado = esAdmin(usuario) && p.estadoLegal === 'Aprobada para envío';

  const cerrar = () => {
    if (!pdf.length || !(pdf[0].tipo === 'application/pdf' || /\.pdf$/i.test(pdf[0].nombre))) return setError('Cargue el PDF de respuesta final (obligatorio).');
    if (!fecha) return setError('Indique la fecha real de envío.');
    if (new Date(fecha + 'T00:00:00') > new Date()) return setError('La fecha real de envío no puede ser futura.');
    if (!medio.trim()) return setError('Seleccione el medio de respuesta.');
    setError('');
    const ahora = ahoraISO();
    const dentro = new Date(ahora) <= new Date(p.fechaLimite);
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        cierreLegal: { pdf: pdf[0], fechaEnvio: fecha, medio, cerradoPor: usuario.nombre, fecha: ahora, dentroDeTermino: dentro },
        slaDetenido: true,
        fechaDetencionSLA: ahora,
        estadoLegal: 'Por validar el cierre',
      }),
      'Flujo A · Cerrar con respuesta',
      `PDF ${pdf[0].nombre} enviado por ${medio} el ${fmtFecha(fecha)}. SLA detenido ${dentro ? 'dentro' : 'FUERA'} del término.`
    );
    toast('PQRSF cerrada con respuesta. Contador del SLA detenido.');
  };

  return (
    <Card title="Flujo A · Cierre legal frente al cliente" subtitle="Rol: Coordinador de Calidad">
      {p.cierreLegal ? (
        <div className="space-y-2 text-sm">
          <p>
            Cerrada por <b>{p.cierreLegal.cerradoPor}</b> el {fmtFechaHora(p.cierreLegal.fecha)} · Enviada el {fmtFecha(p.cierreLegal.fechaEnvio)} por <b>{p.cierreLegal.medio}</b>{' '}
            <Badge tono={p.cierreLegal.dentroDeTermino ? 'verde' : 'rojo'}>{p.cierreLegal.dentroDeTermino ? 'Dentro del término' : 'Fuera del término'}</Badge>
          </p>
          <ListaAdjuntos adjuntos={[p.cierreLegal.pdf]} />
        </div>
      ) : (
        <>
          {!habilitado && <div className="mb-4"><Aviso tono="ambar">Se habilita para Coordinación de Calidad cuando la respuesta tiene las dos aprobaciones obligatorias.</Aviso></div>}
          {error && <div className="mb-3"><Aviso tono="rojo">{error}</Aviso></div>}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="PDF de respuesta final" required>
              <AdjuntosInput value={pdf} onChange={setPdf} usuario={usuario.nombre} accept="application/pdf" multiple={false} disabled={!habilitado} texto="Seleccionar PDF" />
            </Field>
            <Field label="Fecha real de envío" required>
              <input type="date" className="input" disabled={!habilitado} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Medio de respuesta" required>
              <SelectConOtro value={medio} options={MEDIOS_RESPUESTA} onChange={setMedio} disabled={!habilitado} />
            </Field>
          </div>
          <button className="btn-primary mt-4" disabled={!habilitado} onClick={cerrar}>
            <CheckCircle2 className="h-4 w-4" /> Cerrar con respuesta
          </button>
        </>
      )}
    </Card>
  );
}

// ============================================================ Validación del cierre
function ValidacionCierre({ p }: { p: PQRSF }) {
  const { usuario, actualizarPQRSF } = useApp();
  const [adicionales, setAdicionales] = useState<Adjunto[]>([]);
  const [reabrir, setReabrir] = useState(false);
  if (!usuario) return null;
  const habilitada = p.estadoLegal === 'Por validar el cierre' && puedeValidar(usuario, p);

  const aceptar = () => {
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        estadoLegal: 'Cerrada con respuesta',
        soportesAdicionales: [...(x.soportesAdicionales ?? []), ...adicionales],
        validaciones: [...x.validaciones, { resultado: 'Aceptada', por: usuario.nombre, fecha: ahoraISO() }],
      }),
      'Validación del cierre',
      `${usuario.nombre} dio el visto bueno al cierre${adicionales.length ? ` y adjuntó ${adicionales.length} soporte(s) adicional(es)` : ''}.`
    );
    setAdicionales([]);
    toast('Cierre validado.');
  };

  const guardarAdicionales = () => {
    if (!adicionales.length) return;
    actualizarPQRSF(p.id, (x) => ({ ...x, soportesAdicionales: [...(x.soportesAdicionales ?? []), ...adicionales] }), 'Soportes adicionales', `${adicionales.length} soporte(s) adicional(es) cargados por ${usuario.nombre}.`);
    setAdicionales([]);
    toast('Soportes adicionales guardados.');
  };

  return (
    <Card title="Validación del cierre" subtitle="Rol: usuario que radicó la solicitud o a quien fue dirigida">
      {p.estadoLegal === 'Por validar el cierre' ? (
        habilitada ? (
          <div className="space-y-4">
            {p.cierreArea && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Respuesta del área ({p.cierreArea.por})</p>
                <p className="mt-1">{p.cierreArea.respuesta}</p>
                <div className="mt-2"><ListaAdjuntos adjuntos={p.cierreArea.soportes} /></div>
              </div>
            )}
            {p.cierreLegal && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Respuesta final enviada al cliente</p>
                <div className="mt-2"><ListaAdjuntos adjuntos={[p.cierreLegal.pdf]} /></div>
              </div>
            )}
            <Field label="Adjuntar soportes adicionales (opcional)">
              <AdjuntosInput value={adicionales} onChange={setAdicionales} usuario={usuario.nombre} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button className="btn-success" onClick={aceptar}>
                <ThumbsUp className="h-4 w-4" /> Dar visto bueno al cierre
              </button>
              <button className="btn-danger" onClick={() => setReabrir(true)}>
                <RotateCcw className="h-4 w-4" /> Reabrir con justificación
              </button>
              {adicionales.length > 0 && (
                <button className="btn-soft" onClick={guardarAdicionales}>
                  Solo guardar soportes
                </button>
              )}
            </div>
          </div>
        ) : (
          <Aviso tono="ambar">Pendiente de validación por quien radicó la solicitud o por el destinatario.</Aviso>
        )
      ) : p.validaciones.length ? (
        <ul className="space-y-1 text-sm">
          {p.validaciones.map((v, i) => (
            <li key={i}>
              <Badge tono={v.resultado === 'Aceptada' ? 'verde' : 'rojo'}>{v.resultado}</Badge> {v.por} · {fmtFechaHora(v.fecha)} {v.justificacion && `· ${v.justificacion}`}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Esta validación se habilita cuando {p.tipologia === TIPOLOGIA_INTERNA ? 'el responsable cierra la solicitud' : 'Calidad envía la respuesta final'}.</p>
      )}
      {p.soportesAdicionales?.length ? (
        <div className="mt-3">
          <p className="label">Soportes adicionales</p>
          <ListaAdjuntos adjuntos={p.soportesAdicionales} />
        </div>
      ) : null}
      {reabrir && <ReabrirModal p={p} onClose={() => setReabrir(false)} />}
    </Card>
  );
}

// ============================================================ Flujo B · Ciclo de mejora (3 meses)
function FlujoB({ p }: { p: PQRSF }) {
  const { usuario, now, actualizarPQRSF, notificar } = useApp();
  const [motivo, setMotivo] = useState('');
  const [evid, setEvid] = useState<Adjunto[]>([]);
  const [nota, setNota] = useState('');
  const [resultado, setResultado] = useState<'Eficaz' | 'Ineficaz' | ''>('');
  const [obs, setObs] = useState('');
  const [nuevoAnalisis, setNuevoAnalisis] = useState(analisisVacio());
  const [nuevoPlan, setNuevoPlan] = useState<PlanAccion>(planVacio());
  const [error, setError] = useState('');
  if (!usuario) return null;

  const ciclo = p.ciclos[p.ciclos.length - 1];
  const idx = p.ciclos.length - 1;
  const ejecutor = puedeGestionar(usuario, p);
  const lider = esLiderDelArea(usuario, p) || esAsignado(usuario, p) || esAdmin(usuario);
  const vencidaEval = ciclo?.fechaEvaluacion ? now >= new Date(ciclo.fechaEvaluacion).getTime() : false;

  const actCiclo = (fn: (c: typeof ciclo) => typeof ciclo, estado: PQRSF['estadoAccion'] | null, accion: string, detalle: string) =>
    actualizarPQRSF(p.id, (x) => ({ ...x, estadoAccion: estado ?? x.estadoAccion, ciclos: x.ciclos.map((c, i) => (i === idx ? fn(c) : c)) }), accion, detalle);

  const aprobarPlan = () => {
    const f = ahoraISO();
    actCiclo((c) => ({ ...c, aprobadoPor: usuario.nombre, fechaAprobacion: f, fechaEvaluacion: fechaEvaluacionEficacia(f) }), 'En ejecución', 'Aprobación gerencial del plan', `Plan aprobado por ${usuario.nombre}. Evaluación de eficacia: ${fmtFecha(fechaEvaluacionEficacia(f))}.`);
    toast('Plan aprobado. Inicia el seguimiento a 3 meses.');
  };
  const devolverPlan = () => {
    if (motivo.trim().length < 10) return setError('Indique el motivo de la devolución.');
    actCiclo((c) => ({ ...c, enviadoAprobacion: undefined }), 'Sin Plan', 'Plan devuelto', `${usuario.nombre} devolvió el plan: ${motivo}`);
    setMotivo('');
    setError('');
  };
  const registrarEvidencias = () => {
    if (!evid.length) return setError('Adjunte al menos una evidencia de implementación.');
    actCiclo((c) => ({ ...c, evidencias: [...c.evidencias, ...evid], notaEjecucion: nota || c.notaEjecucion }), null, 'Evidencias de implementación', `${evid.length} evidencia(s) cargadas. ${nota}`);
    setEvid([]);
    setNota('');
    setError('');
    toast('Evidencias registradas.');
  };
  const evaluar = () => {
    if (!ciclo.evidencias.length) return setError('No hay evidencias de implementación para evaluar.');
    if (!resultado) return setError('Seleccione si la acción fue eficaz.');
    if (resultado === 'Ineficaz' && obs.trim().length < 10) return setError('Describa por qué la acción no fue eficaz.');
    setError('');
    actCiclo(
      (c) => ({ ...c, resultado, observacionEvaluacion: obs, evaluadoPor: usuario.nombre, fechaEvaluada: ahoraISO() }),
      resultado === 'Eficaz' ? 'Cerrado definitivo' : 'Plan fallido',
      'Evaluación de eficacia (3 meses)',
      `${resultado === 'Eficaz' ? 'SÍ (eficaz) → CERRADO DEFINITIVO' : 'NO (ineficaz) → PLAN FALLIDO, pasa a revisión gerencial'}. ${obs}`
    );
    if (resultado === 'Ineficaz')
      notificar({ para: [EMAIL_DIRECCION_TECNICA, ...GERENCIAS], area: p.area, asunto: `${p.consecutivo} · PLAN FALLIDO`, cuerpo: `La acción correctiva del ciclo ${ciclo.numero} no fue eficaz. Requiere revisión y autorización gerencial de reingeniería.`, pqrsfId: p.id, evento: 'Acción correctiva' });
    toast(resultado === 'Eficaz' ? 'Ciclo de mejora cerrado definitivamente.' : 'Plan fallido: pasa a revisión gerencial.');
  };
  const autorizar = () => {
    if (motivo.trim().length < 10) return setError('Indique la decisión gerencial.');
    actCiclo((c) => ({ ...c, autorizacionReingenieria: { por: usuario.nombre, fecha: ahoraISO(), motivo } }), 'Reingeniería autorizada', 'Re-apertura por ineficacia', `Gerencia (${usuario.nombre}) autorizó la reingeniería: ${motivo}`);
    setMotivo('');
    setError('');
  };
  const iniciarNuevoCiclo = () => {
    if (!analisisCompleto(nuevoAnalisis)) return setError('El nuevo ciclo exige un nuevo Ishikawa (4M) y nuevos 5 Porqués completos.');
    if (!planCompleto(nuevoPlan, true)) return setError('Defina la nueva acción correctiva, responsable, plazo e indicador.');
    setError('');
    const f = ahoraISO();
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        estadoAccion: 'En ejecución',
        ciclos: [
          ...x.ciclos,
          {
            numero: x.ciclos.length + 1,
            analisis: { ...nuevoAnalisis, fecha: f, por: usuario.nombre },
            plan: nuevoPlan,
            enviadoAprobacion: f,
            aprobadoPor: ciclo.autorizacionReingenieria?.por ?? usuario.nombre,
            fechaAprobacion: f,
            evidencias: [],
            fechaEvaluacion: fechaEvaluacionEficacia(f),
          },
        ],
      }),
      'Nuevo ciclo de mejora',
      `Ciclo ${p.ciclos.length + 1}: ${nuevoPlan.accion} · ${nuevoPlan.responsable} · límite ${nuevoPlan.fechaLimite}. Seguimiento a 3 meses.`
    );
    setNuevoAnalisis(analisisVacio());
    setNuevoPlan(planVacio());
    toast('Nuevo ciclo de seguimiento a 3 meses iniciado.');
  };
  const simular3Meses = () =>
    actCiclo((c) => ({ ...c, fechaEvaluacion: new Date(Date.now() - 60_000).toISOString() }), null, 'Simulación (demostración)', 'Se adelantó la fecha de evaluación de eficacia para pruebas.');

  return (
    <Card title="Flujo B · Estado de la acción correctiva" subtitle="Continúa activo aunque la PQRSF ya esté cerrada legalmente" actions={<AccionBadge estado={p.estadoAccion} />}>
      {error && <div className="mb-3"><Aviso tono="rojo">{error}</Aviso></div>}

      {!ciclo?.plan ? (
        <p className="text-sm text-slate-500">
          {p.estadoAccion === 'No aplica' ? 'No aplica plan de acción para esta solicitud.' : 'Aún no hay plan de acción. El ciclo de mejora inicia cuando el responsable formula el plan.'}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="label">Ciclo {ciclo.numero} · acción correctiva</p>
              <p>{ciclo.plan.accion}</p>
              <p className="mt-1 text-xs text-slate-500">
                Responsable: {ciclo.plan.responsable} · Límite: {fmtFecha(ciclo.plan.fechaLimite)} · Indicador: {ciclo.plan.indicador}
                {ciclo.plan.impactoEstructural && ' · Impacto estructural'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="label">Seguimiento</p>
              <p className="text-xs">Aprobado: {ciclo.aprobadoPor ? `${ciclo.aprobadoPor} · ${fmtFechaHora(ciclo.fechaAprobacion)}` : 'pendiente'}</p>
              <p className="text-xs">Evaluación de eficacia (3 meses): <b>{fmtFecha(ciclo.fechaEvaluacion)}</b></p>
              <p className="text-xs">Evidencias: {ciclo.evidencias.length}</p>
            </div>
          </div>

          {/* Pendiente de aprobación gerencial */}
          {p.estadoAccion === 'Pendiente aprobación' &&
            (esGerencia(usuario) ? (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold">Aprobación gerencial del plan</p>
                <div className="flex flex-col gap-2 md:flex-row">
                  <button className="btn-success" onClick={aprobarPlan}>
                    <ThumbsUp className="h-4 w-4" /> Aprobar plan
                  </button>
                  <input className="input" placeholder="Motivo si devuelve el plan" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  <button className="btn-ghost" onClick={devolverPlan}>
                    Devolver
                  </button>
                </div>
              </div>
            ) : (
              <Aviso tono="ambar">Plan pendiente de aprobación por Gerencia / Dirección Técnica.</Aviso>
            ))}

          {/* En ejecución: evidencias y evaluación */}
          {p.estadoAccion === 'En ejecución' && (
            <>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-sm font-semibold">Ejecución · evidencias de implementación (Responsable del proceso)</p>
                <ListaAdjuntos adjuntos={ciclo.evidencias} />
                {ejecutor && (
                  <div className="mt-3 space-y-2">
                    <AdjuntosInput value={evid} onChange={setEvid} usuario={usuario.nombre} texto="Adjuntar evidencias" />
                    <input className="input" placeholder="Nota de ejecución" value={nota} onChange={(e) => setNota(e.target.value)} />
                    <button className="btn-primary btn-sm" onClick={registrarEvidencias}>
                      Registrar evidencias
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-sm font-semibold">A los 3 meses · Líder de Área: ¿la acción fue eficaz?</p>
                {!vencidaEval ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Aviso>La evaluación se habilita el {fmtFecha(ciclo.fechaEvaluacion)}.</Aviso>
                    {esAdmin(usuario) && (
                      <button className="btn-ghost btn-sm" onClick={simular3Meses}>
                        <FastForward className="h-3.5 w-3.5" /> Simular cumplimiento de 3 meses (demo)
                      </button>
                    )}
                  </div>
                ) : lider ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {(['Eficaz', 'Ineficaz'] as const).map((r) => (
                        <button key={r} onClick={() => setResultado(r)} className={`btn border ${resultado === r ? (r === 'Eficaz' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-red-400 bg-red-50 text-red-700') : 'border-slate-300 bg-white'}`}>
                          {r === 'Eficaz' ? 'SÍ · Eficaz' : 'NO · Ineficaz'}
                        </button>
                      ))}
                    </div>
                    <textarea className="input" placeholder="Observación de la evaluación (resultado del indicador)" value={obs} onChange={(e) => setObs(e.target.value)} />
                    <button className="btn-primary" onClick={evaluar}>
                      Registrar evaluación
                    </button>
                  </div>
                ) : (
                  <Aviso tono="ambar">La evalúa el Líder del Área responsable.</Aviso>
                )}
              </div>
            </>
          )}

          {p.estadoAccion === 'Plan fallido' &&
            (esGerencia(usuario) ? (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">Plan fallido · revisión y autorización gerencial</p>
                <textarea className="input" placeholder="Decisión / directrices de la reingeniería" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <button className="btn-danger" onClick={autorizar}>
                  Autorizar reingeniería (re-apertura por ineficacia)
                </button>
              </div>
            ) : (
              <Aviso tono="rojo">PLAN FALLIDO: pendiente de revisión y autorización gerencial.</Aviso>
            ))}

          {p.estadoAccion === 'Reingeniería autorizada' && (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-sm font-semibold">
                Reingeniería autorizada por {ciclo.autorizacionReingenieria?.por}: {ciclo.autorizacionReingenieria?.motivo}
              </p>
              {ejecutor ? (
                <>
                  <p className="text-xs text-slate-600">Nuevo Ishikawa + nuevos 5 Porqués → nueva acción correctiva, responsable y plazo → nuevo ciclo de 3 meses.</p>
                  <AnalisisCausaForm value={nuevoAnalisis} onChange={setNuevoAnalisis} />
                  <PlanAccionFields value={nuevoPlan} onChange={setNuevoPlan} sinCorreccion />
                  <button className="btn-primary" onClick={iniciarNuevoCiclo}>
                    Iniciar nuevo ciclo de seguimiento a 3 meses
                  </button>
                </>
              ) : (
                <Aviso tono="ambar">El responsable del proceso debe registrar el nuevo análisis y la nueva acción.</Aviso>
              )}
            </div>
          )}

          {p.estadoAccion === 'Cerrado definitivo' && <Aviso tono="verde">CERRADO DEFINITIVO: el ciclo de mejora se archivó. Evaluado por {ciclo.evaluadoPor}.</Aviso>}

          {p.ciclos.length > 1 && (
            <div>
              <p className="label">Historial de ciclos</p>
              <ul className="space-y-1 text-xs">
                {p.ciclos.map((c) => (
                  <li key={c.numero}>
                    Ciclo {c.numero}: {c.plan?.accion} · {c.resultado ? <Badge tono={c.resultado === 'Eficaz' ? 'verde' : 'rojo'}>{c.resultado}</Badge> : 'en curso'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
