import { useState } from 'react';
import { Copy, Plug, Send } from 'lucide-react';
import type { ConfigEnvio } from '../types';
import { useApp } from '../context/AppContext';
import { emailValido, esAdmin } from '../utils/helpers';
import { CODIGO_APPS_SCRIPT, envioConfigurado, probarConexion } from '../utils/correo';
import { Aviso, Badge, Card, Field, toast } from './ui';

const PASOS = [
  'Abra un navegador con la sesión de Google de la cuenta que enviará los correos (para la prueba: logisticainventarios@tecnitrauma.com.co) y entre a script.google.com.',
  'Pulse "Nuevo proyecto", borre el contenido del editor y pegue el código de abajo (botón "Copiar código").',
  'En la línea TOKEN cambie CAMBIE-ESTA-CLAVE por una clave propia (por ejemplo PqrsTecni2026) y guarde con el ícono del disquete.',
  'Arriba, elija la función "autorizar" y pulse "Ejecutar". Acepte los permisos de Gmail con la misma cuenta (si aparece "Google no verificó esta app", pulse Configuración avanzada → Ir al proyecto).',
  'Pulse "Implementar" → "Nueva implementación" → tipo "Aplicación web". En "Ejecutar como" elija "Yo" y en "Quién tiene acceso" elija "Cualquier usuario". Pulse "Implementar".',
  'Copie la "URL de la aplicación web" (termina en /exec) y péguela aquí junto con la misma clave TOKEN. Pulse "Probar conexión" y luego "Enviar correo de prueba".',
];

/** Configuración del envío real de correos por Gmail (solo administradores). */
export default function ConfiguracionEnvio() {
  const { state, usuario, guardarConfigEnvio, enviarCorreoPrueba } = useApp();
  const [f, setF] = useState<ConfigEnvio>(state.configEnvio);
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!usuario) return null;
  const admin = esAdmin(usuario);
  const set = <K extends keyof ConfigEnvio>(k: K, v: ConfigEnvio[K]) => setF((x) => ({ ...x, [k]: v }));

  const notifs = state.notificaciones;
  const cuenta = (e: string) => notifs.filter((n) => n.envio === e).length;

  const guardar = () => {
    if (f.activo && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(f.urlScript.trim())) return toast('La URL del script debe empezar por https://script.google.com/ y terminar en /exec.', 'error');
    if (f.activo && !f.token.trim()) return toast('Escriba la clave (TOKEN) configurada en el script.', 'error');
    if (!emailValido(f.correoRemitente)) return toast('Escriba un correo remitente válido.', 'error');
    if (f.modoPrueba && !emailValido(f.correoPrueba)) return toast('Escriba el correo que recibirá las pruebas.', 'error');
    guardarConfigEnvio({ ...f, urlScript: f.urlScript.trim(), token: f.token.trim() });
    toast(f.activo ? 'Envío por Gmail activado.' : 'Configuración guardada (envío desactivado).');
  };

  const conectar = async () => {
    setOcupado(true);
    const r = await probarConexion(f);
    setEstado({ ok: r.ok, texto: r.detalle });
    if (r.ok && r.remitente && r.remitente !== f.correoRemitente) set('correoRemitente', r.remitente);
    setOcupado(false);
  };

  const prueba = async () => {
    if (state.configEnvio.urlScript !== f.urlScript.trim() || state.configEnvio.token !== f.token.trim()) return toast('Guarde la configuración antes de enviar la prueba.', 'error');
    setOcupado(true);
    const r = await enviarCorreoPrueba();
    setEstado({ ok: r.ok, texto: r.ok ? `${r.detalle}. Revise la bandeja de ${state.configEnvio.modoPrueba ? state.configEnvio.correoPrueba : usuario.email}.` : r.detalle });
    setOcupado(false);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(CODIGO_APPS_SCRIPT);
      toast('Código copiado.');
    } catch {
      toast('No se pudo copiar automáticamente: seleccione el código y cópielo.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Envío real de correos por Gmail"
        subtitle="Los correos salen desde la cuenta de Google que implementa el script. Para cambiar de cuenta, implemente el script con la nueva cuenta y pegue aquí la nueva URL."
        actions={<Badge tono={envioConfigurado(state.configEnvio) ? 'verde' : 'gris'}>{envioConfigurado(state.configEnvio) ? (state.configEnvio.modoPrueba ? 'Activo · modo prueba' : 'Activo') : 'Solo simulación'}</Badge>}
      >
        {!admin && <div className="mb-4"><Aviso tono="ambar">Solo un administrador puede configurar el envío de correos.</Aviso></div>}
        <fieldset disabled={!admin} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cuenta que envía (remitente)" required hint="Debe ser la misma cuenta con la que implementó el script.">
              <input id="env-remitente" className="input" type="email" value={f.correoRemitente} onChange={(e) => set('correoRemitente', e.target.value)} />
            </Field>
            <Field label="Nombre que verán los destinatarios">
              <input id="env-nombre" className="input" value={f.nombreRemitente} onChange={(e) => set('nombreRemitente', e.target.value)} />
            </Field>
            <Field label="URL de la aplicación web del script" required hint="Termina en /exec.">
              <input id="env-url" className="input" placeholder="https://script.google.com/macros/s/…/exec" value={f.urlScript} onChange={(e) => set('urlScript', e.target.value)} />
            </Field>
            <Field label="Clave TOKEN (la misma del script)" required>
              <input id="env-token" className="input" value={f.token} onChange={(e) => set('token', e.target.value)} />
            </Field>
            <Field label="Enlace de la aplicación (opcional)" hint="Aparece como botón «Abrir la aplicación» en cada correo.">
              <input id="env-app" className="input" placeholder="https://…" value={f.urlApp} onChange={(e) => set('urlApp', e.target.value)} />
            </Field>
          </div>

          <div className={`rounded-xl border p-4 ${f.modoPrueba ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={f.modoPrueba} onChange={(e) => set('modoPrueba', e.target.checked)} /> Modo prueba: enviar TODOS los correos solo a este buzón
            </label>
            {f.modoPrueba ? (
              <div className="mt-3 max-w-md">
                <input id="env-prueba" className="input" type="email" value={f.correoPrueba} onChange={(e) => set('correoPrueba', e.target.value)} />
                <p className="mt-1 text-xs text-amber-900">Cada correo de prueba indica a quién le habría llegado en producción.</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-red-800">Producción: los correos llegarán a los líderes, correos de apoyo y copias configurados por área.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={f.activo} onChange={(e) => set('activo', e.target.checked)} /> Activar el envío real (si está apagado, los correos solo se registran en la bandeja)
          </label>

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={guardar}>Guardar configuración</button>
            <button className="btn-soft" disabled={ocupado || !f.urlScript} onClick={conectar}>
              <Plug className="h-4 w-4" /> Probar conexión
            </button>
            <button className="btn-soft" disabled={ocupado || !f.urlScript || !f.token} onClick={prueba}>
              <Send className="h-4 w-4" /> Enviar correo de prueba
            </button>
          </div>
        </fieldset>
        {estado && <div className="mt-4"><Aviso tono={estado.ok ? 'verde' : 'rojo'}>{estado.texto}</Aviso></div>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge tono="verde">{cuenta('enviado')} enviados</Badge>
          <Badge tono="ambar">{cuenta('pendiente')} pendientes</Badge>
          <Badge tono="rojo">{cuenta('error')} con error</Badge>
          <Badge tono="gris">{cuenta('simulado')} solo registrados</Badge>
        </div>
      </Card>

      <Card title="Cómo conectar la cuenta de Gmail" subtitle="Se hace una sola vez por cuenta remitente. Tarda unos 10 minutos.">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          {PASOS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <div className="mt-4 flex items-center justify-between">
          <p className="label">Código de Google Apps Script</p>
          <button className="btn-soft btn-sm" onClick={copiar}>
            <Copy className="h-3.5 w-3.5" /> Copiar código
          </button>
        </div>
        <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{CODIGO_APPS_SCRIPT}</pre>
        <p className="mt-3 text-xs text-slate-500">
          Cupo de Google: unos 1.500 correos al día con Google Workspace (100 con una cuenta @gmail.com). Para cambiar después la cuenta remitente, repita estos pasos con la nueva cuenta y reemplace la URL y el correo remitente.
        </p>
      </Card>
    </div>
  );
}
