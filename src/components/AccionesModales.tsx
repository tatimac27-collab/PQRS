import { useEffect, useState } from 'react';
import type { Adjunto, PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { AREAS, EMAIL_CALIDAD, TIPOLOGIA_INTERNA } from '../data';
import { ahoraISO, esPdfOImagen } from '../utils/helpers';
import { AdjuntosInput, Aviso, Field, Modal, PersonaSelect, SelectConOtro, toast } from './ui';

export const ESTADOS_REABRIBLES = ['Por validar el cierre', 'Cerrada con respuesta', 'Rechazada', 'Gestión del área cerrada'];

const esInterna = (p: PQRSF) => p.origen === 'Interna' || p.tipologia === TIPOLOGIA_INTERNA;

// ============================================================ Cerrar solicitud (usuario asignado)
export function CerrarSolicitudModal({ p, onClose }: { p: PQRSF | null; onClose: () => void }) {
  const { usuario, actualizarPQRSF, notificar } = useApp();
  const [respuesta, setRespuesta] = useState('');
  const [soportes, setSoportes] = useState<Adjunto[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setRespuesta('');
    setSoportes([]);
    setError('');
  }, [p?.id]);
  if (!p || !usuario) return null;
  const interna = esInterna(p);

  const cerrar = () => {
    if (respuesta.trim().length < 10) return setError('Redacte la respuesta (mínimo 10 caracteres).');
    if (!soportes.length) return setError('Debe adjuntar al menos un soporte (PDF o imagen) que respalde el cierre.');
    if (soportes.some((s) => !esPdfOImagen(s))) return setError('Los soportes deben ser PDF o imágenes.');
    const ahora = ahoraISO();
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        cierreArea: { respuesta, soportes, por: usuario.nombre, fecha: ahora },
        estadoLegal: interna ? 'Por validar el cierre' : 'Gestión del área cerrada',
        slaDetenido: interna ? true : x.slaDetenido,
        fechaDetencionSLA: interna ? ahora : x.fechaDetencionSLA,
        procedencia: x.procedencia === 'Pendiente' ? 'Procedente' : x.procedencia,
      }),
      'Cierre de solicitud por el responsable',
      `${usuario.nombre} cerró la solicitud con ${soportes.length} soporte(s). ${interna ? 'Pasa a validación del cierre.' : 'Pasa a Calidad para respuesta final al cliente.'}`
    );
    notificar({
      para: interna ? [p.radicadoPor] : [EMAIL_CALIDAD, p.radicadoPor],
      asunto: `${p.consecutivo} cerrada por el área responsable`,
      cuerpo: interna
        ? `${usuario.nombre} cerró la solicitud. Ingrese a validar el cierre (visto bueno o reapertura con justificación).`
        : `${usuario.nombre} cerró la gestión del área. Coordinación de Calidad debe proyectar la respuesta final al cliente.`,
      pqrsfId: p.id,
    });
    toast(`${p.consecutivo} cerrada con soportes.`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Cerrar solicitud ${p.consecutivo}`}
      subtitle={interna ? 'Solicitud interna: al cerrar se detiene el SLA y pasa a validación de quien la radicó.' : 'PQRSF externa: el cierre legal frente al cliente lo realiza Coordinación de Calidad.'}
      footer={
        <>
          <button className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={cerrar}>
            Cerrar solicitud
          </button>
        </>
      }
    >
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <Field label="Respuesta / gestión realizada" required>
        <textarea className="input min-h-[120px]" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
      </Field>
      <Field label="Soportes obligatorios (PDF / imágenes)" required hint="Documentos que respaldan el cierre: actas, correos, fotografías, órdenes, etc.">
        <AdjuntosInput value={soportes} onChange={setSoportes} usuario={usuario.nombre} />
      </Field>
    </Modal>
  );
}

// ============================================================ Rechazar solicitud
export function RechazarModal({ p, onClose }: { p: PQRSF | null; onClose: () => void }) {
  const { usuario, actualizarPQRSF, notificar } = useApp();
  const [just, setJust] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setJust('');
    setError('');
  }, [p?.id]);
  if (!p || !usuario) return null;
  const rechazar = () => {
    if (just.trim().length < 15) return setError('La justificación del rechazo es obligatoria (mínimo 15 caracteres).');
    const ahora = ahoraISO();
    actualizarPQRSF(
      p.id,
      (x) => ({ ...x, estadoLegal: 'Rechazada', rechazo: { justificacion: just, por: usuario.nombre, fecha: ahora }, slaDetenido: true, fechaDetencionSLA: ahora }),
      'Rechazo de solicitud',
      `${usuario.nombre} rechazó la solicitud. Justificación: ${just}`
    );
    notificar({ para: [p.radicadoPor, EMAIL_CALIDAD], asunto: `${p.consecutivo} rechazada`, cuerpo: `Justificación: ${just}`, pqrsfId: p.id });
    toast(`${p.consecutivo} rechazada.`);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Rechazar solicitud ${p.consecutivo}`}
      subtitle="Quien radicó la solicitud y Calidad podrán reabrirla si la justificación no es suficiente."
      footer={
        <>
          <button className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-danger" onClick={rechazar}>
            Rechazar solicitud
          </button>
        </>
      }
    >
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <Field label="Justificación del rechazo" required>
        <textarea className="input min-h-[120px]" value={just} onChange={(e) => setJust(e.target.value)} />
      </Field>
    </Modal>
  );
}

// ============================================================ Reabrir solicitud
export function ReabrirModal({ p, onClose }: { p: PQRSF | null; onClose: () => void }) {
  const { usuario, actualizarPQRSF, notificar } = useApp();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setMotivo('');
    setError('');
  }, [p?.id]);
  if (!p || !usuario) return null;
  const habilitada = ESTADOS_REABRIBLES.includes(p.estadoLegal);
  const reabrir = () => {
    if (!habilitada) return setError('La reapertura se habilita cuando la solicitud está cerrada con respuesta, por validar o rechazada.');
    if (motivo.trim().length < 15) return setError('Indique el motivo de la reapertura (soporte insuficiente, respuesta incompleta, etc.).');
    const ahora = ahoraISO();
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        estadoLegal: 'Reabierta',
        slaDetenido: false,
        fechaDetencionSLA: undefined,
        cierreArea: undefined,
        cierreLegal: undefined,
        rechazo: undefined,
        respuesta: undefined,
        reaperturas: x.reaperturas + 1,
        alertas: x.alertas.includes('Reabierta') ? x.alertas : [...x.alertas, 'Reabierta'],
        validaciones: [...x.validaciones, { resultado: 'Reabierta', por: usuario.nombre, fecha: ahora, justificacion: motivo }],
      }),
      'Reapertura de solicitud',
      `${usuario.nombre} reabrió la solicitud (estado previo: ${p.estadoLegal}). Motivo: ${motivo}`
    );
    notificar({
      para: [p.responsableEmail, p.delegadoEmail ?? '', EMAIL_CALIDAD],
      asunto: `${p.consecutivo} REABIERTA`,
      cuerpo: `${usuario.nombre} reabrió la solicitud. Motivo: ${motivo}. El contador del SLA se reanuda.`,
      pqrsfId: p.id,
    });
    toast(`${p.consecutivo} reabierta.`);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Reabrir solicitud ${p.consecutivo}`}
      subtitle="Para solicitudes cerradas sin soporte suficiente o con respuesta insuficiente. El SLA se reanuda."
      footer={
        <>
          <button className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-danger" disabled={!habilitada} onClick={reabrir}>
            Reabrir solicitud
          </button>
        </>
      }
    >
      {!habilitada && <Aviso tono="ambar">Estado actual: {p.estadoLegal}. La reapertura se habilita cuando la solicitud está cerrada con respuesta, por validar o rechazada.</Aviso>}
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <Field label="Motivo de la reapertura" required>
        <textarea className="input min-h-[110px]" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Field>
    </Modal>
  );
}

// ============================================================ Reasignar (Coordinador de Calidad)
export function ReasignarForm({ p, onDone }: { p: PQRSF; onDone?: () => void }) {
  const { state, usuario, actualizarPQRSF, notificar } = useApp();
  const [area, setArea] = useState(p.area);
  const [tipologia, setTipologia] = useState(p.tipologia);
  const [resp, setResp] = useState({ email: p.responsableEmail, nombre: p.responsableNombre, cargo: p.responsableCargo });
  const [deleg, setDeleg] = useState({ email: p.delegadoEmail ?? '', nombre: p.delegadoNombre ?? '', cargo: '' });
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  if (!usuario) return null;

  const elegirTipologia = (v: string) => {
    setTipologia(v);
    const t = state.tipologias.find((x) => x.nombre === v);
    if (t && !t.especial) {
      setArea(t.area);
      const u = state.usuarios.find((x) => x.email === t.email);
      setResp({ email: t.email, nombre: u?.nombre ?? t.cargo, cargo: u?.cargo ?? t.cargo });
    }
  };

  const personalArea = state.usuarios.filter((u) => u.activo && (!area || u.proceso === area));

  const reasignar = () => {
    if (!area || !tipologia || !resp.email) return setError('Proceso, tipología y destinatario son obligatorios.');
    if (motivo.trim().length < 10) return setError('Indique el motivo de la corrección.');
    actualizarPQRSF(
      p.id,
      (x) => ({
        ...x,
        area,
        tipologia,
        responsableEmail: resp.email,
        responsableNombre: resp.nombre,
        responsableCargo: resp.cargo,
        delegadoEmail: deleg.email || undefined,
        delegadoNombre: deleg.nombre || undefined,
        estadoLegal: x.estadoLegal === 'Radicada' ? 'En Proceso' : x.estadoLegal,
      }),
      'Reasignación',
      `Enrutamiento corregido → ${area} · ${tipologia} · ${resp.nombre}${deleg.nombre ? ` (ejecuta ${deleg.nombre})` : ''}. Motivo: ${motivo}`
    );
    notificar({
      para: [resp.email, deleg.email],
      asunto: `${p.consecutivo} reasignada a su proceso`,
      cuerpo: `Coordinación de Calidad reasignó la solicitud a ${area} (${tipologia}). Motivo: ${motivo}`,
      pqrsfId: p.id,
    });
    toast(`${p.consecutivo} reasignada.`);
    setMotivo('');
    setError('');
    onDone?.();
  };

  return (
    <div className="space-y-4">
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Proceso responsable" required>
          <SelectConOtro value={area} options={AREAS} onChange={setArea} />
        </Field>
        <Field label="Tipología" required>
          <SelectConOtro value={tipologia} options={state.tipologias.map((t) => t.nombre)} onChange={elegirTipologia} />
        </Field>
        <Field label="Persona responsable (ejecuta)">
          <PersonaSelect usuarios={personalArea} email={deleg.email} nombre={deleg.nombre} onChange={setDeleg} placeholder="Sin asignar" />
        </Field>
        <Field label="Se radica a (nombre y cargo)" required className="md:col-span-2">
          <PersonaSelect usuarios={state.usuarios.filter((u) => u.activo)} email={resp.email} nombre={resp.nombre} onChange={setResp} />
        </Field>
      </div>
      <Field label="Motivo de la corrección" required>
        <textarea className="input min-h-[80px]" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Field>
      <button className="btn-primary" onClick={reasignar}>
        Reasignar solicitud
      </button>
    </div>
  );
}

export function ReasignarModal({ p, onClose }: { p: PQRSF | null; onClose: () => void }) {
  if (!p) return null;
  return (
    <Modal open onClose={onClose} wide title={`Reasignar ${p.consecutivo}`} subtitle="Coordinación de Calidad: corregir el enrutamiento de la solicitud.">
      <ReasignarForm key={p.id} p={p} onDone={onClose} />
    </Modal>
  );
}
