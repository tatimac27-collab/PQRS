import { useState } from 'react';
import { Mail, Plus, X } from 'lucide-react';
import type { ConfigCorreoArea } from '../types';
import { useApp } from '../context/AppContext';
import { DOMINIO, EMAIL_DIRECCION_TECNICA } from '../data';
import { esAdmin } from '../utils/helpers';
import { Aviso, Badge, Card, Field, PersonaSelect, SelectConOtro, toast } from './ui';

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function ListaCorreos({ valores, onChange, disabled, sugeridos }: { valores: string[]; onChange: (v: string[]) => void; disabled?: boolean; sugeridos: { value: string; label: string }[] }) {
  const [nuevo, setNuevo] = useState('');
  const agregar = () => {
    const e = nuevo.trim().toLowerCase();
    if (!emailValido(e)) return toast('Correo no válido.', 'error');
    if (!valores.includes(e)) onChange([...valores, e]);
    setNuevo('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {valores.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-tecni-light px-2.5 py-1 text-xs text-tecni-navy">
            {v}
            {!disabled && (
              <button onClick={() => onChange(valores.filter((x) => x !== v))} aria-label={`Quitar ${v}`}>
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!valores.length && <span className="text-xs text-slate-400">Sin correos.</span>}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <div className="flex-1">
            <SelectConOtro value={nuevo} onChange={setNuevo} options={sugeridos} placeholder="Agregar correo…" otroPlaceholder={`correo${DOMINIO}`} />
          </div>
          <button className="btn-soft h-fit" onClick={agregar}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Configuración dinámica de líder principal, correos de apoyo y copias obligatorias por área. */
export default function ConfiguracionCorreos() {
  const { state, usuario, guardarConfigCorreo } = useApp();
  const [sel, setSel] = useState(state.configCorreos[0]?.area ?? '');
  const actual = state.configCorreos.find((c) => c.area === sel);
  const [form, setForm] = useState<ConfigCorreoArea | null>(actual ?? null);
  const [nuevaArea, setNuevaArea] = useState('');
  if (!usuario) return null;
  const admin = esAdmin(usuario);
  const sugeridos = state.usuarios.filter((u) => u.activo).map((u) => ({ value: u.email, label: `${u.email} · ${u.nombre}` }));

  const elegir = (area: string) => {
    setSel(area);
    setForm(state.configCorreos.find((c) => c.area === area) ?? null);
  };

  const guardar = () => {
    if (!form) return;
    if (!emailValido(form.liderEmail)) return toast('Indique un correo válido para el líder principal.', 'error');
    if (!state.usuarios.some((u) => u.email === form.liderEmail) && !form.liderNombre?.trim()) return toast('Escriba el nombre y cargo del líder principal.', 'error');
    guardarConfigCorreo(form);
    toast(`Correos de ${form.area} actualizados.`);
  };

  const crearArea = () => {
    const a = nuevaArea.trim();
    if (!a || state.configCorreos.some((c) => c.area === a)) return;
    const c: ConfigCorreoArea = { area: a, liderEmail: '', apoyo: [], copias: [EMAIL_DIRECCION_TECNICA] };
    guardarConfigCorreo(c);
    setSel(a);
    setForm(c);
    setNuevaArea('');
  };

  const lider = state.usuarios.find((u) => u.email === form?.liderEmail);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <section className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Área</th>
              <th className="th">Líder principal</th>
              <th className="th">Apoyo / Copias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.configCorreos.map((c) => (
              <tr key={c.area} onClick={() => elegir(c.area)} className={`cursor-pointer hover:bg-slate-50 ${sel === c.area ? 'bg-sky-50' : ''}`}>
                <td className="td font-medium">{c.area}</td>
                <td className="td text-xs">
                  {c.liderEmail ? (
                    <>
                      {(c.liderNombre || state.usuarios.find((u) => u.email === c.liderEmail)?.nombre) && <p className="font-medium text-slate-700">{c.liderNombre || state.usuarios.find((u) => u.email === c.liderEmail)?.nombre}</p>}
                      <p>{c.liderEmail}</p>
                    </>
                  ) : (
                    <span className="text-red-600">Sin líder</span>
                  )}
                </td>
                <td className="td text-xs">
                  <Badge tono="azul">{c.apoyo.length} apoyo</Badge> <Badge tono="gris">{c.copias.length} CC</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {admin && (
          <div className="flex gap-2 border-t border-slate-100 p-3">
            <input className="input" placeholder="Nueva área / proceso" value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value)} />
            <button className="btn-soft" onClick={crearArea}>
              Agregar
            </button>
          </div>
        )}
      </section>

      {form && (
        <Card title={<span className="flex items-center gap-2"><Mail className="h-5 w-5 text-tecni-primary" /> {form.area}</span>} subtitle="Destinatarios de las notificaciones automáticas de esta área">
          {!admin && <div className="mb-4"><Aviso tono="ambar">Solo el Coordinador de Calidad puede modificar la configuración de correos.</Aviso></div>}
          <div className="space-y-5">
            <Field label="Líder principal" required>
              <PersonaSelect usuarios={state.usuarios.filter((u) => u.activo)} email={form.liderEmail} nombre={form.liderNombre ?? lider?.nombre ?? ''} onChange={(p) => setForm({ ...form, liderEmail: p.email, liderNombre: p.nombre })} disabled={!admin} />
            </Field>
            <Field label="Correos de apoyo" hint="Reciben las mismas notificaciones que el líder.">
              <ListaCorreos valores={form.apoyo} onChange={(v) => setForm({ ...form, apoyo: v })} disabled={!admin} sugeridos={sugeridos} />
            </Field>
            <Field label="Copias obligatorias (Dirección Técnica / Gerencias)" hint="Dirección Técnica siempre recibe copia, aunque se retire de esta lista.">
              <ListaCorreos valores={form.copias} onChange={(v) => setForm({ ...form, copias: v })} disabled={!admin} sugeridos={sugeridos} />
            </Field>
            {admin && (
              <button className="btn-primary" onClick={guardar}>
                Guardar configuración
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
