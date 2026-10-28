import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ROL_LABEL } from '../data';
import { esAsignado, fmtFechaHora } from '../utils/helpers';
import { Aviso, Card, Field, PageHeader, toast } from './ui';

const dig = (v: string) => v.replace(/\D/g, '').slice(0, 5);

export default function MiCuenta() {
  const { state, usuario, cambiarClave } = useApp();
  const [f, setF] = useState({ actual: '', nueva: '', confirmar: '' });
  const [error, setError] = useState('');
  if (!usuario) return null;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.nueva !== f.confirmar) return setError('Las claves no coinciden.');
    const r = cambiarClave(f.actual, f.nueva);
    if (!r.ok) return setError(r.error ?? 'Error');
    setError('');
    setF({ actual: '', nueva: '', confirmar: '' });
    toast('Clave actualizada.');
  };

  const radicadas = state.pqrsf.filter((p) => p.radicadoPor === usuario.email).length;
  const asignadas = state.pqrsf.filter((p) => esAsignado(usuario, p)).length;
  const misCorreos = state.notificaciones.filter((n) => n.para.includes(usuario.email) || n.cc.includes(usuario.email)).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Mi cuenta" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Datos del usuario">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Nombre', usuario.nombre],
              ['Correo', usuario.email],
              ['Cargo', usuario.cargo],
              ['Proceso', usuario.proceso],
              ['Rol', ROL_LABEL[usuario.rol]],
              ['Ciudad', usuario.ciudad],
              ['Solicitudes radicadas', String(radicadas)],
              ['Solicitudes asignadas', String(asignadas)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">El rol y el proceso los ajusta Coordinación de Calidad desde Usuarios.</p>
        </Card>
        <Card title="Cambiar clave" subtitle="5 dígitos numéricos">
          <form onSubmit={enviar} className="space-y-4">
            {error && <Aviso tono="rojo">{error}</Aviso>}
            <Field label="Clave actual" required>
              <input className="input" type="password" inputMode="numeric" value={f.actual} onChange={(e) => setF({ ...f, actual: dig(e.target.value) })} />
            </Field>
            <Field label="Nueva clave" required>
              <input className="input" type="password" inputMode="numeric" value={f.nueva} onChange={(e) => setF({ ...f, nueva: dig(e.target.value) })} />
            </Field>
            <Field label="Confirmar nueva clave" required>
              <input className="input" type="password" inputMode="numeric" value={f.confirmar} onChange={(e) => setF({ ...f, confirmar: dig(e.target.value) })} />
            </Field>
            <button className="btn-primary" type="submit">Actualizar clave</button>
          </form>
        </Card>
      </div>
      <Card title="Mis notificaciones recientes">
        {misCorreos.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {misCorreos.map((n) => (
              <li key={n.id} className="py-2">
                <p className="font-medium">{n.asunto}</p>
                <p className="text-xs text-slate-500">{fmtFechaHora(n.fecha)} · {n.cuerpo}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Sin notificaciones.</p>
        )}
      </Card>
    </div>
  );
}
