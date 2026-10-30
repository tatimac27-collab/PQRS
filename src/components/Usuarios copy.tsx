import { useState } from 'react';
import { KeyRound, Search, ShieldCheck, UserPlus } from 'lucide-react';
import type { Rol, Usuario } from '../types';
import { useApp } from '../context/AppContext';
import { AREAS, CARGOS, CLAVE_PROVISIONAL, DOMINIO, ROL_LABEL } from '../data';
import { ahoraISO, emailValido, esAdmin, fmtFechaHora, uid } from '../utils/helpers';
import { Aviso, Badge, Card, Field, Modal, PageHeader, SelectConOtro, toast } from './ui';

export default function Usuarios() {
  const { state, usuario, actualizarUsuario, crearUsuario, cambiarCorreoUsuario, restablecerClave, atenderSolicitudClave } = useApp();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Usuario | null>(null);
  const [claveGenerada, setClaveGenerada] = useState<{ nombre: string; clave: string } | null>(null);
  const [nuevo, setNuevo] = useState<Usuario | null>(null);
  const [nuevoAdmin, setNuevoAdmin] = useState({ nombre: '', email: '' });
  const [quitarAdmin, setQuitarAdmin] = useState<Usuario | null>(null);
  if (!usuario) return null;

  if (!esAdmin(usuario))
    return (
      <div>
        <PageHeader title="Usuarios" />
        <Aviso tono="ambar">La gestión de usuarios es exclusiva del Coordinador de Calidad (Administrador del Sistema).</Aviso>
      </div>
    );

  const admins = state.usuarios.filter((u) => u.rol === 'ADMIN_CALIDAD' && u.activo);

  /** Solo un administrador puede otorgar el rol; siempre debe quedar al menos uno activo. */
  const quedariaSinAdmin = (id: string, rol: Rol, activo: boolean) =>
    admins.some((a) => a.id === id) && (rol !== 'ADMIN_CALIDAD' || !activo) && admins.length <= 1;

  const agregarAdmin = () => {
    const email = nuevoAdmin.email.trim().toLowerCase();
    if (!emailValido(email)) return toast('Escriba un correo válido para el nuevo administrador.', 'error');
    const existente = state.usuarios.find((u) => u.email.toLowerCase() === email);
    if (existente) {
      if (existente.rol === 'ADMIN_CALIDAD' && existente.activo) return toast('Ese usuario ya es administrador.', 'error');
      actualizarUsuario(existente.id, { rol: 'ADMIN_CALIDAD', activo: true }, `${usuario.nombre} otorgó el rol Administrador a ${existente.nombre} (${email}).`);
      toast(`${existente.nombre} ahora es administrador.`);
    } else {
      if (!nuevoAdmin.nombre.trim()) return toast('Escriba el nombre del nuevo administrador.', 'error');
      crearUsuario({ id: uid(), nombre: nuevoAdmin.nombre.trim().toUpperCase(), email, cargo: 'Administrador del sistema', proceso: 'Calidad', ciudad: 'Barranquilla', rol: 'ADMIN_CALIDAD', clave: CLAVE_PROVISIONAL, debeCambiarClave: true, activo: true, creado: ahoraISO() });
      toast(`Administrador creado. Ingresa con ${email} y la clave provisional ${CLAVE_PROVISIONAL}.`);
    }
    setNuevoAdmin({ nombre: '', email: '' });
  };

  const confirmarQuitarAdmin = () => {
    if (!quitarAdmin) return;
    if (quedariaSinAdmin(quitarAdmin.id, 'GESTOR', true)) return toast('Debe quedar al menos un administrador activo.', 'error');
    actualizarUsuario(quitarAdmin.id, { rol: quitarAdmin.proceso === 'Calidad' ? 'LIDER_PROCESO' : 'GESTOR' }, `${usuario.nombre} retiró el rol Administrador a ${quitarAdmin.nombre}.`);
    toast(`${quitarAdmin.nombre} ya no es administrador.`);
    setQuitarAdmin(null);
  };

  const pendientes = state.solicitudesClave.filter((s) => !s.atendida);
  const lista = state.usuarios.filter((u) => [u.nombre, u.email, u.cargo, u.proceso].some((v) => v.toLowerCase().includes(q.toLowerCase())));

  const reset = (u: Usuario) => {
    const c = restablecerClave(u.id);
    setClaveGenerada({ nombre: u.nombre, clave: c });
  };

  const guardarEdicion = () => {
    if (!edit) return;
    if (!edit.cargo || !edit.proceso) return toast('Cargo y proceso son obligatorios.', 'error');
    const orig = state.usuarios.find((u) => u.id === edit.id);
    if (quedariaSinAdmin(edit.id, edit.rol, edit.activo)) return toast('Debe quedar al menos un administrador activo. Nombre otro administrador antes de cambiar este.', 'error');
    if (orig && edit.email.trim().toLowerCase() !== orig.email) {
      const r = cambiarCorreoUsuario(edit.id, edit.email);
      if (!r.ok) return toast(r.error ?? 'Error', 'error');
    }
    actualizarUsuario(edit.id, { rol: edit.rol, cargo: edit.cargo, proceso: edit.proceso, activo: edit.activo, nombre: edit.nombre }, `${edit.nombre}: rol ${orig?.rol} → ${edit.rol}; proceso ${orig?.proceso} → ${edit.proceso}; cargo ${edit.cargo}; ${edit.activo ? 'activo' : 'inactivo'}`);
    toast('Usuario actualizado.');
    setEdit(null);
  };

  const crear = () => {
    if (!nuevo) return;
    const email = nuevo.email.trim().toLowerCase();
    if (!nuevo.nombre.trim() || !emailValido(email)) return toast('Nombre y un correo válido son obligatorios.', 'error');
    if (state.usuarios.some((u) => u.email === email)) return toast('Ese correo ya existe.', 'error');
    if (!nuevo.cargo || !nuevo.proceso) return toast('Cargo y proceso son obligatorios.', 'error');
    crearUsuario({ ...nuevo, email, nombre: nuevo.nombre.trim().toUpperCase() });
    toast('Usuario creado con clave provisional 12345.');
    setNuevo(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Cambiar roles, ajustar procesos asociados y restablecer contraseñas."
        actions={
          <button
            className="btn-primary"
            onClick={() => setNuevo({ id: uid(), nombre: '', email: '', cargo: '', proceso: '', ciudad: 'Barranquilla', rol: 'GESTOR', clave: CLAVE_PROVISIONAL, debeCambiarClave: true, activo: true, creado: ahoraISO() })}
          >
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </button>
        }
      />

      <Card
        title={<span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-tecni-primary" /> Administradores del sistema</span>}
        subtitle="Solo un administrador puede nombrar a otro. El correo puede ser institucional o de otro dominio. Siempre debe quedar al menos un administrador activo."
      >
        <ul className="divide-y divide-slate-100">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <b>{a.nombre}</b> · {a.email} {a.id === usuario.id && <Badge tono="azul">Usted</Badge>}
              </span>
              <button className="btn-ghost btn-sm" disabled={admins.length <= 1} onClick={() => setQuitarAdmin(a)}>
                Quitar rol de administrador
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Correo del nuevo administrador" required hint="Si el correo ya tiene cuenta, solo se le asigna el rol.">
            <input id="admin-email" className="input" type="email" placeholder="correo@dominio.com" value={nuevoAdmin.email} onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, email: e.target.value })} />
          </Field>
          <Field label="Nombre completo" hint="Obligatorio si el correo no tiene cuenta.">
            <input id="admin-nombre" className="input" value={nuevoAdmin.nombre} onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, nombre: e.target.value })} />
          </Field>
          <button className="btn-primary" onClick={agregarAdmin}>
            <ShieldCheck className="h-4 w-4" /> Agregar administrador
          </button>
        </div>
      </Card>

      {pendientes.length > 0 && (
        <Card title={<span className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-600" /> Solicitudes de restablecimiento de clave</span>}>
          <ul className="divide-y divide-slate-100">
            {pendientes.map((s) => {
              const u = state.usuarios.find((x) => x.email === s.email);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <b>{u?.nombre ?? s.email}</b> · {s.email} · {fmtFechaHora(s.fecha)}
                  </span>
                  <span className="flex gap-2">
                    {u && (
                      <button className="btn-primary btn-sm" onClick={() => reset(u)}>
                        Generar clave provisional
                      </button>
                    )}
                    <button className="btn-soft btn-sm" onClick={() => atenderSolicitudClave(s.id)}>
                      Descartar
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <section className="card overflow-hidden">
        <div className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar usuario, correo, cargo o proceso" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                {['Usuario', 'Cargo / Proceso', 'Rol', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((u) => (
                <tr key={u.id}>
                  <td className="td">
                    <p className="font-medium">{u.nombre}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="td text-xs">
                    <p>{u.cargo}</p>
                    <p className="text-slate-500">{u.proceso}</p>
                  </td>
                  <td className="td text-xs">{ROL_LABEL[u.rol]}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      <Badge tono={u.activo ? 'verde' : 'gris'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                      {u.debeCambiarClave && <Badge tono="ambar">Clave provisional</Badge>}
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex gap-2">
                      <button className="btn-soft btn-sm" onClick={() => setEdit({ ...u })}>
                        Editar
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => reset(u)}>
                        Restablecer clave
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit && (
        <Modal
          open
          onClose={() => setEdit(null)}
          title={`Editar ${edit.nombre}`}
          subtitle={edit.email}
          footer={
            <>
              <button className="btn-soft" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion}>Guardar</button>
            </>
          }
        >
          <Field label="Correo de acceso" required hint="Puede ser institucional o de otro dominio. Al cambiarlo se actualizan sus solicitudes y configuraciones.">
            <input id="edit-email" className="input" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
          </Field>
          <UsuarioCampos u={edit} onChange={setEdit} propio={edit.id === usuario.id} />
        </Modal>
      )}

      {nuevo && (
        <Modal
          open
          onClose={() => setNuevo(null)}
          title="Nuevo usuario"
          subtitle={`Se crea con la clave provisional ${CLAVE_PROVISIONAL} y deberá cambiarla al ingresar.`}
          footer={
            <>
              <button className="btn-soft" onClick={() => setNuevo(null)}>Cancelar</button>
              <button className="btn-primary" onClick={crear}>Crear</button>
            </>
          }
        >
          <Field label="Correo" required hint={`Institucional (${DOMINIO}) o de otro dominio. Para que controle la aplicación, asígnele el rol Administrador.`}>
            <input className="input" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} placeholder={`usuario${DOMINIO}`} />
          </Field>
          <UsuarioCampos u={nuevo} onChange={setNuevo} />
        </Modal>
      )}

      <Modal
        open={!!quitarAdmin}
        onClose={() => setQuitarAdmin(null)}
        title="Quitar rol de administrador"
        footer={
          <>
            <button className="btn-soft" onClick={() => setQuitarAdmin(null)}>Cancelar</button>
            <button className="btn-danger" onClick={confirmarQuitarAdmin}>Quitar rol</button>
          </>
        }
      >
        <p className="text-sm">
          {quitarAdmin?.id === usuario.id ? 'Está a punto de quitarse a sí mismo el rol de administrador; perderá acceso a Usuarios, Tipologías y Correos.' : `${quitarAdmin?.nombre} dejará de administrar la aplicación.`}
        </p>
      </Modal>

      <Modal open={!!claveGenerada} onClose={() => setClaveGenerada(null)} title="Clave provisional generada">
        <p className="text-sm">
          Entregue a <b>{claveGenerada?.nombre}</b> la clave provisional:
        </p>
        <p className="text-center font-display text-4xl font-bold tracking-[0.3em] text-tecni-primary">{claveGenerada?.clave}</p>
        <Aviso>El sistema le pedirá cambiarla de inmediato al ingresar. También se registró la notificación simulada por correo.</Aviso>
      </Modal>
    </div>
  );
}

function UsuarioCampos({ u, onChange, propio }: { u: Usuario; onChange: (u: Usuario) => void; propio?: boolean }) {
  return (
    <div className="space-y-4">
      <Field label="Nombre completo" required>
        <input className="input" value={u.nombre} onChange={(e) => onChange({ ...u, nombre: e.target.value })} />
      </Field>
      <Field label="Rol" required hint={propio ? 'No puede quitarse a sí mismo el rol de administrador.' : undefined}>
        <select className="input" value={u.rol} disabled={propio} onChange={(e) => onChange({ ...u, rol: e.target.value as Rol })}>
          {(Object.keys(ROL_LABEL) as Rol[]).map((r) => (
            <option key={r} value={r}>{ROL_LABEL[r]}</option>
          ))}
        </select>
      </Field>
      <Field label="Cargo" required>
        <SelectConOtro value={u.cargo} options={CARGOS} onChange={(v) => onChange({ ...u, cargo: v })} />
      </Field>
      <Field label="Proceso asociado" required>
        <SelectConOtro value={u.proceso} options={AREAS} onChange={(v) => onChange({ ...u, proceso: v })} />
      </Field>
      {!propio && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={u.activo} onChange={(e) => onChange({ ...u, activo: e.target.checked })} /> Cuenta activa
        </label>
      )}
    </div>
  );
}
