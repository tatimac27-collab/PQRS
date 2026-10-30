import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { REGLA_CLAVE, ROL_LABEL } from '../data';
import { esAsignado, fmtFechaHora } from '../utils/helpers';
import { Aviso, Card, Field, PageHeader, toast } from './ui';

const dig = (v: string) => v.replace(/\s/g, '').slice(0, 20);

export default function MiCuenta() {
  const { state, usuario, cambiarClave, cambiarCorreoUsuario } = useApp();
  const [correo, setCorreo] = useState({ nuevo: '', clave: '' });
  const [errCorreo, setErrCorreo] = useState('');
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

  const cambiarCorreo = (e: React.FormEvent) => {
    e.preventDefault();
    if (correo.clave !== usuario.clave) return setErrCorreo('La clave actual no coincide.');
    const r = cambiarCorreoUsuario(usuario.id, correo.nuevo);
    if (!r.ok) return setErrCorreo(r.error ?? 'Error');
    setErrCorreo('');
    setCorreo({ nuevo: '', clave: '' });
    toast('Correo actualizado. Desde ahora ingrese con el nuevo correo.');
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
        <Card title="Cambiar clave" subtitle={REGLA_CLAVE}>
          <form onSubmit={enviar} className="space-y-4">
            {error && <Aviso tono="rojo">{error}</Aviso>}
            <Field label="Clave actual" required>
              <input className="input" type="password" value={f.actual} onChange={(e) => setF({ ...f, actual: dig(e.target.value) })} />
            </Field>
            <Field label="Nueva clave" required>
              <input className="input" type="password" value={f.nueva} onChange={(e) => setF({ ...f, nueva: dig(e.target.value) })} />
            </Field>
            <Field label="Confirmar nueva clave" required>
              <input className="input" type="password" value={f.confirmar} onChange={(e) => setF({ ...f, confirmar: dig(e.target.value) })} />
            </Field>
            <button className="btn-primary" type="submit">Actualizar clave</button>
          </form>
        </Card>
      </div>
      <Card title="Cambiar correo de acceso" subtitle="Puede usar cualquier correo válido. Sus solicitudes, tipologías y configuraciones de correo se actualizan con el nuevo correo.">
        <form onSubmit={cambiarCorreo} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Nuevo correo" required>
            <input id="nuevo-correo" className="input" type="email" value={correo.nuevo} onChange={(e) => setCorreo({ ...correo, nuevo: e.target.value })} />
          </Field>
          <Field label="Clave actual" required>
            <input id="clave-correo" className="input" type="password" value={correo.clave} onChange={(e) => setCorreo({ ...correo, clave: e.target.value })} />
          </Field>
          <button className="btn-primary" type="submit">Cambiar correo</button>
        </form>
        {errCorreo && <div className="mt-3"><Aviso tono="rojo">{errCorreo}</Aviso></div>}
      </Card>

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
