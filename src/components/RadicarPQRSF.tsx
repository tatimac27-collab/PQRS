import { useMemo, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import type { Adjunto, PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { AREAS, CANALES, ORIGENES, RIESGOS, TIPOLOGIA_INTERNA, TIPOS_TRAMITE } from '../data';
import { analizarHistorico, calcularFechaLimite, calcularSLAHoras, fmtFechaHora } from '../utils/helpers';
import { AdjuntosInput, Aviso, Card, Field, PageHeader, PersonaSelect, SelectConOtro, toast } from './ui';

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function RadicarPQRSF({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { state, usuario, siguienteConsecutivo, radicar } = useApp();
  const [f, setF] = useState({
    origen: 'Externa',
    canal: '',
    fechaHora: localNow(),
    reportaNombre: '',
    reportaContacto: '',
    institucion: '',
    ciudad: '',
    involucraPaciente: false,
    paciente: '',
    tipologia: '',
    tipoTramite: '',
    descripcion: '',
    // Solicitudes internas entre procesos
    areaDestino: '',
    riesgo: 'Bajo',
    slaPersonalizado: '',
  });
  const [destino, setDestino] = useState({ email: '', nombre: '', cargo: '' });
  const [evidencias, setEvidencias] = useState<Adjunto[]>([]);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState<PQRSF | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const esInternaProcesos = f.tipologia === TIPOLOGIA_INTERNA;
  const tip = state.tipologias.find((t) => t.nombre === f.tipologia);
  const personalDestino = useMemo(() => state.usuarios.filter((u) => u.activo && (!f.areaDestino || u.proceso === f.areaDestino)), [state.usuarios, f.areaDestino]);

  if (!usuario) return null;

  const limpiar = () => {
    setF((x) => ({ ...x, canal: '', fechaHora: localNow(), reportaNombre: '', reportaContacto: '', institucion: '', ciudad: '', involucraPaciente: false, paciente: '', tipologia: '', tipoTramite: '', descripcion: '', areaDestino: '', riesgo: 'Bajo', slaPersonalizado: '' }));
    setDestino({ email: '', nombre: '', cargo: '' });
    setEvidencias([]);
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const faltan: string[] = [];
    if (!f.origen) faltan.push('Origen');
    if (!f.canal) faltan.push('Canal de recepción');
    if (!f.fechaHora) faltan.push('Fecha y hora');
    if (!f.reportaNombre.trim()) faltan.push('Nombre de quien reporta');
    if (!f.institucion.trim()) faltan.push('Institución');
    if (f.involucraPaciente && !f.paciente.trim()) faltan.push('Nombre del paciente');
    if (f.descripcion.trim().length < 15) faltan.push('Descripción detallada (mín. 15 caracteres)');
    if (esInternaProcesos && (!f.areaDestino || !destino.email)) faltan.push('Proceso y persona destinataria');
    if (esInternaProcesos && !RIESGOS.includes(f.riesgo) && !Number(f.slaPersonalizado)) faltan.push('Horas de SLA para la prioridad personalizada');
    if (faltan.length) return setError(`Complete: ${faltan.join(', ')}.`);

    const fechaRecepcion = new Date(f.fechaHora).toISOString();
    const tramite = f.tipoTramite || (esInternaProcesos ? 'Petición' : 'Por clasificar');
    const riesgo = esInternaProcesos ? f.riesgo : 'Sin clasificar';
    const slaHoras = calcularSLAHoras(riesgo, tramite, esInternaProcesos ? Number(f.slaPersonalizado) || undefined : undefined);
    const hist = analizarHistorico(state.pqrsf, { id: '', institucion: f.institucion, tipologia: f.tipologia, fechaRecepcion });

    const nueva = radicar({
      origen: f.origen,
      canal: f.canal,
      fechaRecepcion,
      radicadoPor: usuario.email,
      radicadoPorNombre: usuario.nombre,
      reportaNombre: f.reportaNombre.trim(),
      reportaContacto: f.reportaContacto.trim(),
      institucion: f.institucion.trim(),
      ciudad: f.ciudad.trim(),
      paciente: f.involucraPaciente ? f.paciente.trim() : '',
      descripcion: f.descripcion.trim(),
      evidencias,
      tipoTramite: tramite,
      convertidaEnQueja: false,
      tipoPQRSF: esInternaProcesos ? 'Solicitud interna' : '',
      riesgo,
      tipologia: f.tipologia,
      area: esInternaProcesos ? f.areaDestino : tip?.area ?? '',
      responsableEmail: esInternaProcesos ? destino.email : '',
      responsableNombre: esInternaProcesos ? destino.nombre : '',
      responsableCargo: esInternaProcesos ? destino.cargo : '',
      clasificada: esInternaProcesos,
      clasificadaPor: esInternaProcesos ? usuario.nombre : undefined,
      slaHoras,
      fechaLimite: calcularFechaLimite(fechaRecepcion, slaHoras),
      slaDetenido: false,
      alertas: esInternaProcesos ? hist.alertas : [],
      estadoLegal: esInternaProcesos ? 'En Proceso' : 'Radicada',
      procedencia: 'Pendiente',
      ciclos: [],
      estadoAccion: esInternaProcesos ? 'No aplica' : 'Sin Plan',
      validaciones: [],
      reaperturas: 0,
    });
    toast(`Solicitud ${nueva.consecutivo} radicada correctamente.`);
    setCreada(nueva);
    limpiar();
  };

  return (
    <div>
      <PageHeader title="Radicar PQRSF" subtitle="Fase 1 · Registro de la solicitud. El consecutivo se genera automáticamente." />

      {creada && (
        <div className="mb-6">
          <Aviso tono="verde">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Se radicó <b>{creada.consecutivo}</b>. Vence: {fmtFechaHora(creada.fechaLimite)}.{' '}
                {creada.responsableEmail ? `Notificada a ${creada.responsableNombre}.` : 'Pendiente de caracterización por Coordinación de Calidad.'}
              </span>
              <button className="btn-primary btn-sm" onClick={() => onAbrir(creada.id)}>
                Abrir solicitud
              </button>
            </div>
          </Aviso>
        </div>
      )}

      <form onSubmit={enviar} className="space-y-6">
        <Card title="Datos de recepción" subtitle="Registrador de Solicitudes">
          {error && (
            <div className="mb-4">
              <Aviso tono="rojo">{error}</Aviso>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Consecutivo">
              <input className="input font-semibold text-tecni-primary" value={siguienteConsecutivo()} disabled />
            </Field>
            <Field label="Origen" required>
              <SelectConOtro
                value={f.origen}
                options={ORIGENES}
                onChange={(v) => {
                  set('origen', v);
                  if (v === 'Interna' && !f.institucion) set('institucion', `Tecnitrauma S.A. · ${usuario.proceso}`);
                }}
              />
            </Field>
            <Field label="Canal de recepción" required>
              <SelectConOtro value={f.canal} options={CANALES} onChange={(v) => set('canal', v)} />
            </Field>
            <Field label="Fecha y hora de recepción" required>
              <input type="datetime-local" className="input" value={f.fechaHora} onChange={(e) => set('fechaHora', e.target.value)} />
            </Field>
            <Field label="Nombre de quien reporta" required>
              <input className="input" value={f.reportaNombre} onChange={(e) => set('reportaNombre', e.target.value)} />
            </Field>
            <Field label="Contacto (correo / teléfono)">
              <input className="input" value={f.reportaContacto} onChange={(e) => set('reportaContacto', e.target.value)} />
            </Field>
            <Field label="Institución" required>
              <input className="input" value={f.institucion} onChange={(e) => set('institucion', e.target.value)} />
            </Field>
            <Field label="Ciudad">
              <input className="input" value={f.ciudad} onChange={(e) => set('ciudad', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.involucraPaciente} onChange={(e) => set('involucraPaciente', e.target.checked)} /> La solicitud involucra a un paciente
              </label>
              {f.involucraPaciente && (
                <div className="mt-2">
                  <Field label="Nombre del paciente (condicional)" required>
                    <input className="input" value={f.paciente} onChange={(e) => set('paciente', e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
            <Field label="Tipo de trámite (preliminar)" hint="Calidad lo confirma en la Fase 2.">
              <SelectConOtro value={f.tipoTramite} options={TIPOS_TRAMITE} onChange={(v) => set('tipoTramite', v)} placeholder="Por clasificar" />
            </Field>
          </div>
        </Card>

        <Card title="Tipificación de la solicitud" subtitle="La tipología determina el área responsable y el destinatario de la notificación automática.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tipificación" hint="Ej.: Producto defectuoso, Error en facturación o cobro, Solicitudes Internas entre Procesos.">
              <SelectConOtro value={f.tipologia} options={state.tipologias.map((t) => t.nombre)} onChange={(v) => set('tipologia', v)} />
            </Field>
            <div className="flex items-end">
              {tip && !tip.especial && (
                <Aviso>
                  <span className="flex gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Área: <b>{tip.area}</b> · Notifica a <b>{tip.cargo}</b> ({tip.email}) una vez Calidad complete la caracterización.
                    </span>
                  </span>
                </Aviso>
              )}
              {f.tipologia && !tip && <Aviso tono="ambar">Tipología personalizada: Calidad definirá el área responsable en la Fase 2.</Aviso>}
            </div>
          </div>

          {esInternaProcesos && (
            <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-teal-900">Solicitud interna entre procesos · sin proceso ni correo fijo: indique a quién va dirigida.</p>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Proceso destino" required>
                  <SelectConOtro
                    value={f.areaDestino}
                    options={AREAS}
                    onChange={(v) => {
                      set('areaDestino', v);
                      setDestino({ email: '', nombre: '', cargo: '' });
                    }}
                  />
                </Field>
                <Field label="Dirigida a (nombre y cargo)" required>
                  <PersonaSelect usuarios={personalDestino} email={destino.email} nombre={destino.nombre} onChange={setDestino} />
                </Field>
                <Field label="Prioridad / riesgo" required>
                  <SelectConOtro value={f.riesgo} options={RIESGOS} onChange={(v) => set('riesgo', v)} />
                  {!RIESGOS.includes(f.riesgo) && (
                    <input className="input mt-2" type="number" min={1} placeholder="Horas de SLA" value={f.slaPersonalizado} onChange={(e) => set('slaPersonalizado', e.target.value)} />
                  )}
                </Field>
              </div>
            </div>
          )}
        </Card>

        <Card title="Descripción y evidencias">
          <div className="space-y-4">
            <Field label="Descripción detallada" required>
              <textarea className="input min-h-[140px]" value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
            </Field>
            <Field label="Evidencias iniciales" hint="PDF o imágenes. Los archivos de más de 350 KB se registran sin vista previa para no saturar el almacenamiento local.">
              <AdjuntosInput value={evidencias} onChange={setEvidencias} usuario={usuario.nombre} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={limpiar}>
            Limpiar
          </button>
          <button type="submit" className="btn-primary">
            Radicar solicitud
          </button>
        </div>
      </form>
    </div>
  );
}
