import { useState } from 'react';
import { Send, UserPlus } from 'lucide-react';
import type { AnalisisCausa, CicloMejora, DispositivoMedico, Ishikawa, PlanAccion, PQRSF } from '../types';
import { useApp } from '../context/AppContext';
import { EMAIL_CALIDAD, EMAIL_DIRECCION_TECNICA, GENEROS, TIPOLOGIA_INTERNA } from '../data';
import { ahoraISO, esAdmin, puedeGestionar } from '../utils/helpers';
import { Aviso, Badge, Card, Field, PersonaSelect, SelectConOtro, toast } from './ui';

const CERRADOS = ['Por validar el cierre', 'Cerrada con respuesta', 'Rechazada'];
export const esQuejaOReclamo = (p: PQRSF) => ['Queja', 'Reclamo'].includes(p.tipoTramite);
export const aplicaDispositivo = (p: PQRSF) => p.tipoPQRSF === 'Dispositivos médicos' || /dispositivo/i.test(p.tipologia);

// ============================================================ Formularios reutilizables
export const analisisVacio = (): Omit<AnalisisCausa, 'fecha' | 'por'> => ({
  porques: ['', '', '', '', ''],
  ishikawa: { manoObra: '', metodo: '', materiales: '', medioAmbiente: '' },
});

export const analisisCompleto = (a: Omit<AnalisisCausa, 'fecha' | 'por'>) =>
  a.porques.every((x) => x.trim()) && Object.values(a.ishikawa).every((x) => x.trim());

export function AnalisisCausaForm({ value, onChange, disabled }: { value: Omit<AnalisisCausa, 'fecha' | 'por'>; onChange: (v: Omit<AnalisisCausa, 'fecha' | 'por'>) => void; disabled?: boolean }) {
  const ish: { k: keyof Ishikawa; l: string }[] = [
    { k: 'manoObra', l: 'Mano de obra' },
    { k: 'metodo', l: 'Método' },
    { k: 'materiales', l: 'Materiales' },
    { k: 'medioAmbiente', l: 'Medio ambiente' },
  ];
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div>
        <p className="label">Metodología 5 Porqués</p>
        <div className="space-y-2">
          {value.porques.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs font-semibold text-slate-500">¿Por qué? {i + 1}</span>
              <input
                className="input"
                value={v}
                disabled={disabled || (i > 0 && !value.porques[i - 1].trim())}
                placeholder={i === 0 ? '¿Qué ocurrió y por qué?' : 'Responda a partir de la respuesta anterior'}
                onChange={(e) => {
                  const porques = [...value.porques];
                  porques[i] = e.target.value;
                  onChange({ ...value, porques });
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Diagrama de Ishikawa (4M)</p>
        <div className="grid gap-3 md:grid-cols-2">
          {ish.map(({ k, l }) => (
            <Field key={k} label={l}>
              <textarea className="input min-h-[70px]" value={value.ishikawa[k]} onChange={(e) => onChange({ ...value, ishikawa: { ...value.ishikawa, [k]: e.target.value } })} />
            </Field>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

export const planVacio = (): PlanAccion => ({ correccion: '', fechaCorreccion: '', accion: '', responsable: '', fechaLimite: '', indicador: '', impactoEstructural: false });

export function PlanAccionFields({ value, onChange, disabled, sinCorreccion }: { value: PlanAccion; onChange: (v: PlanAccion) => void; disabled?: boolean; sinCorreccion?: boolean }) {
  const { state } = useApp();
  const set = <K extends keyof PlanAccion>(k: K, v: PlanAccion[K]) => onChange({ ...value, [k]: v });
  return (
    <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2">
      {!sinCorreccion && (
        <>
          <Field label="Corrección inmediata" required>
            <textarea className="input min-h-[70px]" value={value.correccion} onChange={(e) => set('correccion', e.target.value)} />
          </Field>
          <Field label="Fecha de implementación de la corrección" required>
            <input type="date" className="input" value={value.fechaCorreccion} onChange={(e) => set('fechaCorreccion', e.target.value)} />
          </Field>
        </>
      )}
      <Field label="Acción correctiva de fondo" required>
        <textarea className="input min-h-[70px]" value={value.accion} onChange={(e) => set('accion', e.target.value)} />
      </Field>
      <Field label="Responsable de la acción" required>
        <SelectConOtro value={value.responsable} options={state.usuarios.filter((u) => u.activo).map((u) => ({ value: u.nombre, label: `${u.nombre} · ${u.cargo}` }))} onChange={(v) => set('responsable', v)} disabled={disabled} />
      </Field>
      <Field label="Fecha límite de la acción" required>
        <input type="date" className="input" value={value.fechaLimite} onChange={(e) => set('fechaLimite', e.target.value)} />
      </Field>
      <Field label="Indicador de eficacia" required>
        <input className="input" placeholder="Ej.: 0 reincidencias en 3 meses" value={value.indicador} onChange={(e) => set('indicador', e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={value.impactoEstructural} onChange={(e) => set('impactoEstructural', e.target.checked)} /> Plan de Impacto Estructural
      </label>
    </fieldset>
  );
}

export const planCompleto = (p: PlanAccion, sinCorreccion = false) =>
  (sinCorreccion || (p.correccion.trim() && p.fechaCorreccion)) && p.accion.trim() && p.responsable.trim() && p.fechaLimite && p.indicador.trim();

// ============================================================ Fase 3
export default function GestionOperativa({ p }: { p: PQRSF }) {
  const { state, usuario, actualizarPQRSF, notificar } = useApp();
  const ciclo1: CicloMejora | undefined = p.ciclos[0];
  const [proc, setProc] = useState<'Procedente' | 'No Procedente' | ''>(p.procedencia === 'Pendiente' ? '' : p.procedencia);
  const [justProc, setJustProc] = useState(p.justificacionProcedencia ?? '');
  const [deleg, setDeleg] = useState({ email: '', nombre: '', cargo: '' });
  const [analisis, setAnalisis] = useState(ciclo1?.analisis ? { porques: ciclo1.analisis.porques, ishikawa: ciclo1.analisis.ishikawa } : analisisVacio());
  const [plan, setPlan] = useState<PlanAccion>(ciclo1?.plan ?? planVacio());
  const [usarDispositivo, setUsarDispositivo] = useState(aplicaDispositivo(p) || !!p.dispositivo);
  const [disp, setDisp] = useState<DispositivoMedico>(
    p.dispositivo ?? { descripcion: '', referencia: '', lote: '', cantidad: 1, genero: '', eventoAdverso: false, reportadoTecnovigilancia: false, reportadoSeguridadPaciente: false }
  );
  const [confirmaEval, setConfirmaEval] = useState(!!p.dispositivo);
  const [error, setError] = useState<Record<string, string>>({});

  if (!usuario) return null;
  const puede = puedeGestionar(usuario, p) && !CERRADOS.includes(p.estadoLegal);
  const esInterna = p.tipologia === TIPOLOGIA_INTERNA;
  const qr = esQuejaOReclamo(p);
  const planBloqueado = !puede || ['Pendiente aprobación', 'En ejecución', 'Plan fallido', 'Reingeniería autorizada', 'Cerrado definitivo'].includes(p.estadoAccion);

  if (!p.clasificada) {
    return (
      <Card title="Fase 3 · Gestión operativa" subtitle="Rol: Responsable del Área">
        <Aviso tono="ambar">La gestión operativa se habilita cuando Calidad completa la Fase 2 y el sistema enruta la solicitud al área responsable.</Aviso>
      </Card>
    );
  }

  const err = (k: string, m: string) => setError((e) => ({ ...e, [k]: m }));
  const ok = (k: string) => setError((e) => ({ ...e, [k]: '' }));

  const asegurarCiclo = (x: PQRSF): CicloMejora[] => (x.ciclos.length ? x.ciclos : [{ numero: 1, evidencias: [] }]);

  // -------------------------------------------------- Procedencia
  const guardarProcedencia = () => {
    if (!proc) return err('proc', 'Seleccione Procedente o No Procedente.');
    if (proc === 'No Procedente' && justProc.trim().length < 15) return err('proc', 'La justificación es obligatoria cuando no es procedente (mín. 15 caracteres).');
    ok('proc');
    actualizarPQRSF(
      p.id,
      (x) => ({ ...x, procedencia: proc, justificacionProcedencia: justProc, estadoAccion: proc === 'No Procedente' ? 'No aplica' : x.estadoAccion }),
      'Validación de procedencia',
      `${proc}${justProc ? ` · ${justProc}` : ''}`
    );
    if (proc === 'No Procedente') {
      notificar({
        para: [EMAIL_CALIDAD],
        asunto: `${p.consecutivo} NO PROCEDENTE · Calidad debe proyectar respuesta`,
        cuerpo: `El área ${p.area} determinó que el requerimiento no es procedente. Justificación: ${justProc}. Proyecte la respuesta al cliente y envíela a aprobación de Gerencia y Dirección Técnica.`,
        pqrsfId: p.id,
        evento: 'Procedencia',
      });
    } else if (qr) {
      notificar({
        para: [p.responsableEmail, p.delegadoEmail ?? ''],
        area: p.area,
        asunto: `${p.consecutivo} PROCEDENTE · iniciar análisis de causa raíz`,
        cuerpo: `La ${p.tipoTramite.toLowerCase()} es procedente. Inicie el Diagrama de Ishikawa (4M) y los 5 Porqués, y formule el plan de acción.`,
        pqrsfId: p.id,
        evento: 'Acción correctiva',
      });
    }
    toast('Procedencia guardada.');
  };

  // -------------------------------------------------- Delegación
  const delegar = () => {
    if (!deleg.email || !deleg.nombre) return err('deleg', 'Seleccione el trabajador (o escriba nombre y correo).');
    ok('deleg');
    actualizarPQRSF(p.id, (x) => ({ ...x, delegadoEmail: deleg.email, delegadoNombre: deleg.nombre }), 'Delegación de ejecución', `Delegada a ${deleg.nombre} (${deleg.email}) por ${usuario.nombre}`);
    notificar({ para: [deleg.email], asunto: `${p.consecutivo} delegada a usted`, cuerpo: `${usuario.nombre} le delegó la ejecución de la solicitud ${p.consecutivo}.`, pqrsfId: p.id, evento: 'Delegación' });
    toast(`Delegación enviada a ${deleg.nombre}.`);
    setDeleg({ email: '', nombre: '', cargo: '' });
  };

  // -------------------------------------------------- Causa raíz
  const guardarAnalisis = () => {
    if (!analisisCompleto(analisis)) return err('rca', 'Complete los 5 porqués y las 4M del Ishikawa.');
    ok('rca');
    actualizarPQRSF(
      p.id,
      (x) => {
        const ciclos = asegurarCiclo(x);
        return { ...x, ciclos: ciclos.map((c, i) => (i === 0 ? { ...c, analisis: { ...analisis, fecha: ahoraISO(), por: usuario.nombre } } : c)) };
      },
      'Análisis de causa raíz',
      `5 Porqués e Ishikawa registrados. Causa raíz: ${analisis.porques[4]}`
    );
    toast('Análisis de causa raíz guardado.');
  };

  // -------------------------------------------------- Plan de acción
  const enviarPlan = () => {
    if (qr && !ciclo1?.analisis) return err('plan', 'Primero registre el análisis de causa raíz (obligatorio para Quejas y Reclamos procedentes).');
    if (!planCompleto(plan)) return err('plan', 'Complete todos los campos obligatorios del plan.');
    ok('plan');
    actualizarPQRSF(
      p.id,
      (x) => {
        const ciclos = asegurarCiclo(x);
        return { ...x, estadoAccion: 'Pendiente aprobación', ciclos: ciclos.map((c, i) => (i === 0 ? { ...c, plan, enviadoAprobacion: ahoraISO() } : c)) };
      },
      'Plan de acción enviado a aprobación gerencial',
      `Acción: ${plan.accion} · Responsable: ${plan.responsable} · Límite: ${plan.fechaLimite}${plan.impactoEstructural ? ' · Impacto estructural' : ''}`
    );
    notificar({
      para: [EMAIL_DIRECCION_TECNICA],
      area: p.area,
      asunto: `${p.consecutivo} · plan de acción pendiente de aprobación gerencial`,
      cuerpo: `${usuario.nombre} formuló el plan de acción. Revíselo y apruébelo en el Flujo B.`,
      pqrsfId: p.id,
      evento: 'Acción correctiva',
    });
    toast('Plan enviado a aprobación gerencial.');
  };

  // -------------------------------------------------- Dispositivos médicos
  const guardarDispositivo = () => {
    if (!disp.descripcion.trim() || !disp.referencia.trim() || !disp.lote.trim() || !disp.genero || disp.cantidad < 1)
      return err('disp', 'Complete descripción, referencia, lote, cantidad y género del paciente.');
    if (!confirmaEval) return err('disp', 'Confirme que evaluó los tres criterios obligatorios (evento adverso y reportes).');
    if (disp.eventoAdverso && (!disp.reportadoTecnovigilancia || !disp.reportadoSeguridadPaciente))
      return err('disp', 'Si es evento / incidente adverso, debe reportarse a Tecnovigilancia y a Seguridad del Paciente.');
    ok('disp');
    actualizarPQRSF(
      p.id,
      (x) => ({ ...x, dispositivo: disp, alertas: disp.eventoAdverso ? Array.from(new Set([...x.alertas, 'Evento adverso'])) : x.alertas.filter((a) => a !== 'Evento adverso') }),
      'Módulo de dispositivos médicos',
      `${disp.descripcion} · Ref ${disp.referencia} · Lote ${disp.lote} · Cant ${disp.cantidad} · Evento adverso: ${disp.eventoAdverso ? 'Sí' : 'No'}`
    );
    if (disp.eventoAdverso)
      notificar({
        para: [EMAIL_DIRECCION_TECNICA, EMAIL_CALIDAD],
        asunto: `${p.consecutivo} · EVENTO / INCIDENTE ADVERSO con dispositivo médico`,
        cuerpo: `${disp.descripcion} (Ref. ${disp.referencia}, lote ${disp.lote}). Reportado a Tecnovigilancia y Seguridad del Paciente.`,
        pqrsfId: p.id,
        evento: 'Tecnovigilancia',
      });
    toast('Información del dispositivo médico guardada.');
  };

  const personalArea = state.usuarios.filter((u) => u.activo && u.proceso === p.area && u.email !== p.responsableEmail);

  return (
    <div className="space-y-6">
      {/* Procedencia + delegación */}
      <Card title="Fase 3 · Gestión operativa" subtitle={`Rol: Responsable de Gestión · ${p.responsableNombre || 'sin responsable'}${p.delegadoNombre ? ` · Ejecuta: ${p.delegadoNombre}` : ''}`}>
        {!puede && (
          <div className="mb-4">
            <Aviso tono="ambar">{CERRADOS.includes(p.estadoLegal) ? 'La solicitud está cerrada. El seguimiento de acciones continúa en el Flujo B.' : 'Solo el responsable asignado, su líder de proceso o Calidad pueden gestionar esta fase.'}</Aviso>
          </div>
        )}
        <p className="label">Validación de procedencia *</p>
        <div className="flex flex-wrap gap-2">
          {(['Procedente', 'No Procedente'] as const).map((o) => (
            <button
              key={o}
              disabled={!puede}
              onClick={() => setProc(o)}
              className={`btn border ${proc === o ? (o === 'Procedente' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-red-400 bg-red-50 text-red-700') : 'border-slate-300 bg-white text-slate-700'}`}
            >
              {o}
            </button>
          ))}
          {p.procedencia !== 'Pendiente' && <Badge tono={p.procedencia === 'Procedente' ? 'verde' : 'rojo'}>Registrado: {p.procedencia}</Badge>}
        </div>
        <div className="mt-3">
          <Field label={proc === 'No Procedente' ? 'Justificación (obligatoria)' : 'Observaciones'} required={proc === 'No Procedente'}>
            <textarea className="input min-h-[70px]" disabled={!puede} value={justProc} onChange={(e) => setJustProc(e.target.value)} />
          </Field>
        </div>
        {error.proc && <div className="mt-3"><Aviso tono="rojo">{error.proc}</Aviso></div>}
        {proc === 'No Procedente' && (
          <div className="mt-3">
            <Aviso>Camino A: Coordinación de Calidad proyecta la respuesta justificada → aprobación obligatoria de Gerencia y Dirección Técnica → envío y carga del soporte.</Aviso>
          </div>
        )}
        <button className="btn-primary mt-4" disabled={!puede} onClick={guardarProcedencia}>
          Guardar procedencia
        </button>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="label">Delegar ejecución a otro trabajador</p>
          {p.delegadoNombre && <p className="mb-2 text-sm text-slate-600">Actualmente delegada a <b>{p.delegadoNombre}</b>.</p>}
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex-1">
              <PersonaSelect usuarios={personalArea} email={deleg.email} nombre={deleg.nombre} cargo={deleg.cargo} onChange={setDeleg} disabled={!puede} />
            </div>
            <button className="btn-soft h-fit" disabled={!puede} onClick={delegar}>
              <UserPlus className="h-4 w-4" /> Enviar delegación
            </button>
          </div>
          {error.deleg && <div className="mt-2"><Aviso tono="rojo">{error.deleg}</Aviso></div>}
        </div>
      </Card>

      {p.procedencia === 'Procedente' && !esInterna && (
        <>
          {/* Causa raíz */}
          <Card title="Análisis de causa raíz" subtitle={qr ? 'Obligatorio para Quejas y Reclamos procedentes' : 'Cuando aplique'}>
            <AnalisisCausaForm value={analisis} onChange={setAnalisis} disabled={planBloqueado} />
            {ciclo1?.analisis && <p className="mt-3 text-xs text-slate-500">Registrado por {ciclo1.analisis.por}.</p>}
            {error.rca && <div className="mt-3"><Aviso tono="rojo">{error.rca}</Aviso></div>}
            {!planBloqueado && (
              <button className="btn-primary mt-4" onClick={guardarAnalisis}>
                Guardar análisis
              </button>
            )}
          </Card>

          {/* Plan de acción */}
          <Card title="Plan de acción inmediato y de fondo" subtitle="Requiere aprobación gerencial">
            <PlanAccionFields value={plan} onChange={setPlan} disabled={planBloqueado} />
            {error.plan && <div className="mt-3"><Aviso tono="rojo">{error.plan}</Aviso></div>}
            {planBloqueado && p.estadoAccion !== 'Sin Plan' && p.estadoAccion !== 'No aplica' && (
              <div className="mt-3">
                <Aviso>Plan en estado <b>{p.estadoAccion}</b>. El seguimiento continúa en el Flujo B.</Aviso>
              </div>
            )}
            {!planBloqueado && (
              <button className="btn-primary mt-4" onClick={enviarPlan}>
                <Send className="h-4 w-4" /> Enviar plan a aprobación gerencial
              </button>
            )}
          </Card>
        </>
      )}

      {/* Dispositivos médicos */}
      {!esInterna && (
        <Card title="Módulo de dispositivos médicos" subtitle="Condicional: se activa para PQRSF de tipo Dispositivos médicos">
          {!aplicaDispositivo(p) && (
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={usarDispositivo} disabled={!puede} onChange={(e) => setUsarDispositivo(e.target.checked)} /> La solicitud involucra un dispositivo médico
            </label>
          )}
          {usarDispositivo ? (
            <fieldset disabled={!puede} className="grid gap-4 md:grid-cols-2">
              <Field label="Descripción" required>
                <input className="input" value={disp.descripcion} onChange={(e) => setDisp({ ...disp, descripcion: e.target.value })} />
              </Field>
              <Field label="Referencia" required>
                <input className="input" value={disp.referencia} onChange={(e) => setDisp({ ...disp, referencia: e.target.value })} />
              </Field>
              <Field label="Lote" required>
                <input className="input" value={disp.lote} onChange={(e) => setDisp({ ...disp, lote: e.target.value })} />
              </Field>
              <Field label="Cantidad" required>
                <input className="input" type="number" min={1} value={disp.cantidad} onChange={(e) => setDisp({ ...disp, cantidad: Number(e.target.value) })} />
              </Field>
              <Field label="Género del paciente" required>
                <SelectConOtro value={disp.genero} options={GENEROS} onChange={(v) => setDisp({ ...disp, genero: v })} disabled={!puede} />
              </Field>
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm md:col-span-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={disp.eventoAdverso} onChange={(e) => setDisp({ ...disp, eventoAdverso: e.target.checked })} /> ¿Evento / Incidente adverso? <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={disp.reportadoTecnovigilancia} onChange={(e) => setDisp({ ...disp, reportadoTecnovigilancia: e.target.checked })} /> ¿Reportado a Tecnovigilancia? <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={disp.reportadoSeguridadPaciente} onChange={(e) => setDisp({ ...disp, reportadoSeguridadPaciente: e.target.checked })} /> ¿Reportado a Seguridad del Paciente? <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-2 border-t border-slate-200 pt-2 font-medium">
                  <input type="checkbox" checked={confirmaEval} onChange={(e) => setConfirmaEval(e.target.checked)} /> Confirmo que evalué los tres criterios obligatorios
                </label>
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-slate-500">No aplica para esta solicitud.</p>
          )}
          {error.disp && <div className="mt-3"><Aviso tono="rojo">{error.disp}</Aviso></div>}
          {usarDispositivo && puede && (
            <button className="btn-primary mt-4" onClick={guardarDispositivo}>
              Guardar dispositivo médico
            </button>
          )}
        </Card>
      )}

      {esInterna && (
        <Aviso>
          Solicitud interna entre procesos: el responsable la cierra desde su bandeja adjuntando los soportes, o la rechaza con justificación. Quien la radicó valida el cierre. {esAdmin(usuario) && 'Calidad puede reasignarla o reabrirla.'}
        </Aviso>
      )}
    </div>
  );
}
