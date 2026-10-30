import { useState } from 'react';
import type { Tipologia } from '../types';
import { useApp } from '../context/AppContext';
import { AREAS, CARGOS } from '../data';
import { esAdmin, uid } from '../utils/helpers';
import { Aviso, Badge, Field, Modal, PageHeader, SelectConOtro, toast } from './ui';
import ConfiguracionCorreos from './ConfiguracionCorreos';
import ConfiguracionEnvio from './ConfiguracionEnvio';

const vacia = (): Tipologia => ({ id: '', nombre: '', area: '', cargo: '', email: '', especial: false });

export default function Tipologias() {
  const { state, usuario, guardarTipologia, eliminarTipologia } = useApp();
  const [tab, setTab] = useState<'tipologias' | 'correos' | 'envio'>('tipologias');
  const [form, setForm] = useState<Tipologia>(vacia());
  const [error, setError] = useState('');
  const [borrar, setBorrar] = useState<Tipologia | null>(null);
  if (!usuario) return null;
  const admin = esAdmin(usuario);

  const guardar = () => {
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!form.especial && (!form.area || !form.cargo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)))
      return setError('Área responsable, cargo y un correo de notificación válido son obligatorios (salvo tipologías sin proceso fijo).');
    if (state.tipologias.some((t) => t.nombre.toLowerCase() === form.nombre.trim().toLowerCase() && t.id !== form.id)) return setError('Ya existe una tipología con ese nombre.');
    guardarTipologia({ ...form, nombre: form.nombre.trim(), id: form.id || uid(), ...(form.especial ? { area: '', cargo: '', email: '' } : {}) });
    toast(form.id ? 'Tipología actualizada.' : 'Tipología creada.');
    setForm(vacia());
    setError('');
  };

  return (
    <div>
      <PageHeader title="Tipologías y Correos" subtitle="La tipología determina el área responsable y el destinatario de la notificación automática." />
      <div className="mb-6 flex flex-wrap gap-2">
        <button className={tab === 'tipologias' ? 'btn-primary' : 'btn-soft'} onClick={() => setTab('tipologias')}>
          Tipologías específicas
        </button>
        <button className={tab === 'correos' ? 'btn-primary' : 'btn-soft'} onClick={() => setTab('correos')}>
          Configuración de correos por área
        </button>
        <button className={tab === 'envio' ? 'btn-primary' : 'btn-soft'} onClick={() => setTab('envio')}>
          Envío por Gmail
        </button>
      </div>

      {tab === 'envio' ? (
        <ConfiguracionEnvio />
      ) : tab === 'correos' ? (
        <ConfiguracionCorreos />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="card h-fit space-y-4 p-6">
            <h3 className="font-semibold">{form.id ? 'Editar tipología' : 'Nueva tipología'}</h3>
            {!admin && <Aviso tono="ambar">Solo el Coordinador de Calidad administra las tipologías.</Aviso>}
            {error && <Aviso tono="rojo">{error}</Aviso>}
            <fieldset disabled={!admin} className="space-y-4">
              <Field label="Nombre" required>
                <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.especial} onChange={(e) => setForm({ ...form, especial: e.target.checked })} /> Sin proceso ni correo fijo (se elige al radicar)
              </label>
              {!form.especial && (
                <>
                  <Field label="Área responsable" required>
                    <SelectConOtro value={form.area} options={AREAS} onChange={(v) => setForm({ ...form, area: v })} disabled={!admin} />
                  </Field>
                  <Field label="Cargo del responsable" required>
                    <SelectConOtro
                      value={form.cargo}
                      options={CARGOS}
                      disabled={!admin}
                      onChange={(v) => {
                        const u = state.usuarios.find((x) => x.cargo === v);
                        setForm({ ...form, cargo: v, email: u?.email ?? form.email });
                      }}
                    />
                  </Field>
                  <Field label="Correo de notificación" required>
                    <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </Field>
                </>
              )}
              <div className="flex gap-2">
                <button className="btn-primary" onClick={guardar}>
                  Guardar
                </button>
                <button
                  className="btn-soft"
                  onClick={() => {
                    setForm(vacia());
                    setError('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </fieldset>
          </section>

          <section className="card overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  {['Tipología', 'Área', 'Responsable', 'Acciones'].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.tipologias.map((t) => (
                  <tr key={t.id}>
                    <td className="td">
                      {t.nombre} {t.especial && <Badge tono="morado">Especial</Badge>}
                    </td>
                    <td className="td text-xs">{t.area || 'Sin proceso fijo'}</td>
                    <td className="td text-xs">
                      {t.especial ? (
                        <span className="text-slate-500">Se define al radicar (dependencia destino)</span>
                      ) : (
                        <>
                          <p>{t.cargo}</p>
                          <p className="text-slate-500">{t.email}</p>
                        </>
                      )}
                    </td>
                    <td className="td">
                      {admin && (
                        <div className="flex gap-2">
                          <button className="btn-soft btn-sm" onClick={() => setForm({ ...t })}>
                            Editar
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => setBorrar(t)}>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      <Modal
        open={!!borrar}
        onClose={() => setBorrar(null)}
        title="Eliminar tipología"
        footer={
          <>
            <button className="btn-soft" onClick={() => setBorrar(null)}>
              Cancelar
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                if (borrar) eliminarTipologia(borrar.id);
                toast('Tipología eliminada.');
                setBorrar(null);
              }}
            >
              Eliminar
            </button>
          </>
        }
      >
        <p className="text-sm">
          ¿Eliminar <b>{borrar?.nombre}</b>? Las PQRSF ya radicadas conservan su tipología como texto.
        </p>
      </Modal>
    </div>
  );
}
