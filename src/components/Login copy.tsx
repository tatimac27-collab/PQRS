import { useState } from 'react';
import { KeyRound, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AREAS, CARGOS, CLAVE_PROVISIONAL, DOMINIO, REGLA_CLAVE, ROL_LABEL } from '../data';
import { Aviso, Field, Logo, SelectConOtro, toast } from './ui';

type Modo = 'ingresar' | 'solicitar' | 'olvide';

const limpiar = (v: string) => v.replace(/\s/g, '').slice(0, 20);

export default function Login({ onConsultaPublica }: { onConsultaPublica: () => void }) {
  const { login, solicitarAcceso, olvideClave, state } = useApp();
  const [modo, setModo] = useState<Modo>('ingresar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [reg, setReg] = useState({ nombre: '', email: '', cargo: '', proceso: '', clave: '', confirmar: '' });
  const [enviadoReset, setEnviadoReset] = useState(false);

  const ingresar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(email, clave);
    if (!r.ok) setError(r.error ?? 'Error');
  };

  const registrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (reg.clave !== reg.confirmar) return setError('Las claves no coinciden.');
    if (!reg.cargo || !reg.proceso) return setError('Indique su cargo y proceso.');
    const r = solicitarAcceso(reg);
    if (!r.ok) setError(r.error ?? 'Error');
    else toast('Cuenta creada con perfil Registrador de Solicitudes.');
  };

  const olvide = (e: React.FormEvent) => {
    e.preventDefault();
    const r = olvideClave(email);
    if (!r.ok) setError(r.error ?? 'Error');
    else setEnviadoReset(true);
  };

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setError('');
    setEnviadoReset(false);
  };

  const demo = state.usuarios.filter((u) => u.rol !== 'GESTOR');

  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-b from-sky-50 to-tecni-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Gestión de Solicitudes Internas y Externas</h1>
          <p className="mt-2 text-sm text-slate-500">Ingrese con su correo y su clave.</p>
        </div>

        <div className="card p-6">
          {modo !== 'olvide' && (
            <div className="mb-5 grid grid-cols-2 gap-2">
              <button className={modo === 'ingresar' ? 'btn-primary' : 'btn-soft'} onClick={() => cambiarModo('ingresar')}>
                Ingresar
              </button>
              <button className={modo === 'solicitar' ? 'btn-primary' : 'btn-soft'} onClick={() => cambiarModo('solicitar')}>
                Solicitar acceso
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <Aviso tono="rojo">{error}</Aviso>
            </div>
          )}

          {modo === 'ingresar' && (
            <form onSubmit={ingresar} className="space-y-4">
              <Field label="Correo electrónico" required>
                <input className="input" type="email" autoComplete="username" placeholder={`usuario${DOMINIO}`} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Clave" required>
                <input className="input" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(limpiar(e.target.value))} />
              </Field>
              <p className="text-xs text-slate-500">
                La clave combina letras y números. Si su cuenta fue creada por la institución, ingrese con la clave provisional que le entregaron (
                <b>{CLAVE_PROVISIONAL}</b> para las cuentas iniciales) y el sistema le pedirá cambiarla de inmediato.
              </p>
              <button className="btn-primary w-full" type="submit">
                Ingresar
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button type="button" className="font-semibold text-tecni-primary hover:underline" onClick={() => cambiarModo('olvide')}>
                  Olvidé mi contraseña
                </button>
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-tecni-primary hover:underline" onClick={onConsultaPublica}>
                  <Search className="h-4 w-4" /> Consulta pública
                </button>
              </div>
              <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
                Las cuentas nuevas quedan con perfil de Registrador de Solicitudes; el Coordinador de Calidad ajusta el rol y el proceso desde la ventana de Usuarios, y puede generar una clave provisional nueva cuando alguien la olvide.
              </p>
              <details className="rounded-xl bg-slate-50 p-3 text-xs">
                <summary className="cursor-pointer font-semibold text-slate-600">Cuentas iniciales (Listado de Líderes 2026)</summary>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {demo.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left hover:bg-white"
                        onClick={() => {
                          setEmail(u.email);
                          setClave('');
                        }}
                      >
                        <b>{u.email}</b>
                        <span className="block text-slate-500">
                          {u.nombre} · {ROL_LABEL[u.rol]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </form>
          )}

          {modo === 'solicitar' && (
            <form onSubmit={registrar} className="space-y-4">
              <Field label="Nombre completo" required>
                <input className="input" value={reg.nombre} onChange={(e) => setReg({ ...reg, nombre: e.target.value })} />
              </Field>
              <Field label="Correo electrónico" required hint={`Se recomienda el correo institucional (${DOMINIO}).`}>
                <input className="input" type="email" placeholder={`usuario${DOMINIO}`} value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} />
              </Field>
              <Field label="Cargo" required>
                <SelectConOtro value={reg.cargo} options={CARGOS} onChange={(v) => setReg({ ...reg, cargo: v })} />
              </Field>
              <Field label="Proceso" required>
                <SelectConOtro value={reg.proceso} options={AREAS} onChange={(v) => setReg({ ...reg, proceso: v })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Clave" required>
                  <input className="input" type="password" autoComplete="new-password" value={reg.clave} onChange={(e) => setReg({ ...reg, clave: limpiar(e.target.value) })} />
                </Field>
                <Field label="Confirmar clave" required>
                  <input className="input" type="password" autoComplete="new-password" value={reg.confirmar} onChange={(e) => setReg({ ...reg, confirmar: limpiar(e.target.value) })} />
                </Field>
              </div>
              <p className="-mt-2 text-xs text-slate-500">{REGLA_CLAVE}</p>
              <Aviso>La cuenta se crea con perfil <b>Registrador de Solicitudes</b>. Coordinación de Calidad ajustará su rol y proceso.</Aviso>
              <button className="btn-primary w-full" type="submit">
                Crear cuenta
              </button>
            </form>
          )}

          {modo === 'olvide' && (
            <form onSubmit={olvide} className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="h-5 w-5 text-tecni-primary" /> Olvidé mi contraseña
              </h2>
              {enviadoReset ? (
                <Aviso tono="verde">
                  Solicitud enviada a Coordinación de Calidad. Le generarán una <b>clave provisional</b> que deberá cambiar al ingresar.
                </Aviso>
              ) : (
                <>
                  <Field label="Correo institucional" required>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <button className="btn-primary w-full" type="submit">
                    Solicitar clave provisional
                  </button>
                </>
              )}
              <button type="button" className="btn-soft w-full" onClick={() => cambiarModo('ingresar')}>
                Volver a ingresar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pantalla obligatoria cuando el usuario ingresa con una clave provisional. */
export function CambioClaveObligatorio() {
  const { usuario, cambiarClave, logout } = useApp();
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  if (!usuario) return null;
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva !== confirmar) return setError('Las claves no coinciden.');
    const r = cambiarClave(usuario.clave, nueva);
    if (!r.ok) setError(r.error ?? 'Error');
    else toast('Clave actualizada. Bienvenido(a).');
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-tecni-bg px-4">
      <form onSubmit={enviar} className="card w-full max-w-md space-y-4 p-6">
        <Logo />
        <h1 className="text-xl font-bold">Cambio de clave obligatorio</h1>
        <p className="text-sm text-slate-600">
          Hola <b>{usuario.nombre}</b>. Ingresó con una clave provisional; por seguridad debe definir una nueva clave antes de continuar.
        </p>
        {error && <Aviso tono="rojo">{error}</Aviso>}
        <Field label="Nueva clave" required hint={REGLA_CLAVE}>
          <input className="input" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(limpiar(e.target.value))} />
        </Field>
        <Field label="Confirmar nueva clave" required>
          <input className="input" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(limpiar(e.target.value))} />
        </Field>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">
            Guardar y continuar
          </button>
          <button type="button" className="btn-soft" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}
