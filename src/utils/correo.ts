// ============================================================================
// Envío real de correos por Gmail a través de Google Apps Script
// La cuenta que implementa el script es la que envía (p. ej. logisticainventarios@…).
// ============================================================================
import type { ConfigEnvio, Notificacion } from '../types';

export interface ResultadoEnvio {
  ok: boolean;
  detalle: string;
  remitente?: string;
  restantes?: number;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plantilla HTML corporativa del correo. */
export const construirHTML = (n: Pick<Notificacion, 'asunto' | 'cuerpo' | 'para' | 'cc'>, cfg: ConfigEnvio, aviso?: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#EEF4F9;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dbe4ee">
    <div style="background:#0F2C59;color:#ffffff;padding:16px 24px">
      <div style="font-size:18px;font-weight:bold">Tecnitrauma S.A.</div>
      <div style="font-size:12px;opacity:.8">Gestión de Solicitudes Internas y Externas · SGC ISO 9001</div>
    </div>
    <div style="padding:24px;color:#1e293b">
      ${aviso ? `<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:16px">${escapar(aviso)}</div>` : ''}
      <h2 style="font-size:17px;margin:0 0 12px">${escapar(n.asunto)}</h2>
      <p style="font-size:14px;line-height:1.6;margin:0 0 20px;white-space:pre-wrap">${escapar(n.cuerpo)}</p>
      ${cfg.urlApp ? `<a href="${cfg.urlApp}" style="display:inline-block;background:#0B4F82;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:bold">Abrir la aplicación</a>` : ''}
    </div>
    <div style="padding:12px 24px;background:#f8fafc;color:#64748b;font-size:11px">
      Correo automático del sistema PQRSF. Por favor no responda a este mensaje.
    </div>
  </div>
</div>`;

/** Aplica el modo prueba: todos los correos van al buzón de prueba. */
export const destinatariosEfectivos = (n: Pick<Notificacion, 'para' | 'cc'>, cfg: ConfigEnvio) =>
  cfg.modoPrueba
    ? {
        para: [cfg.correoPrueba],
        cc: [] as string[],
        aviso: `MODO PRUEBA · Destinatarios reales: Para ${n.para.join(', ') || '—'} · CC ${n.cc.join(', ') || '—'}`,
      }
    : { para: n.para, cc: n.cc, aviso: undefined };

export const envioConfigurado = (cfg: ConfigEnvio) => cfg.activo && /^https:\/\/script\.google\.com\/.+\/exec$/.test(cfg.urlScript.trim()) && !!cfg.token;

/** Envía un correo mediante la aplicación web de Apps Script. */
export const enviarPorGmail = async (n: Pick<Notificacion, 'asunto' | 'cuerpo' | 'para' | 'cc'>, cfg: ConfigEnvio): Promise<ResultadoEnvio> => {
  const d = destinatariosEfectivos(n, cfg);
  const payload = JSON.stringify({
    token: cfg.token,
    para: d.para,
    cc: d.cc,
    asunto: (cfg.modoPrueba ? '[PRUEBA] ' : '') + n.asunto,
    cuerpo: (d.aviso ? d.aviso + '\n\n' : '') + n.cuerpo,
    html: construirHTML(n, cfg, d.aviso),
    nombre: cfg.nombreRemitente,
  });
  try {
    // text/plain evita la verificación previa (preflight) de CORS
    const r = await fetch(cfg.urlScript.trim(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload, redirect: 'follow' });
    const j = (await r.json()) as { ok: boolean; error?: string; remitente?: string; restantes?: number };
    return j.ok
      ? { ok: true, detalle: `Enviado desde ${j.remitente ?? cfg.correoRemitente}${typeof j.restantes === 'number' ? ` · cupo diario restante: ${j.restantes}` : ''}`, remitente: j.remitente, restantes: j.restantes }
      : { ok: false, detalle: j.error ?? 'El script rechazó el envío.' };
  } catch {
    // Si el navegador no permite leer la respuesta, se envía sin confirmación
    try {
      await fetch(cfg.urlScript.trim(), { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload });
      return { ok: true, detalle: 'Enviado (sin confirmación del servidor). Verifique en Enviados de Gmail.' };
    } catch (e) {
      return { ok: false, detalle: `No se pudo conectar con el script: ${String(e)}` };
    }
  }
};

/** Verifica la conexión y devuelve la cuenta que envía. */
export const probarConexion = async (cfg: ConfigEnvio): Promise<ResultadoEnvio> => {
  try {
    const r = await fetch(cfg.urlScript.trim(), { method: 'GET', redirect: 'follow' });
    const j = (await r.json()) as { ok: boolean; remitente?: string; restantes?: number; error?: string };
    if (!j.ok) return { ok: false, detalle: j.error ?? 'Respuesta inválida del script.' };
    return { ok: true, detalle: `Conectado. Cuenta que envía: ${j.remitente ?? 'desconocida'} · cupo diario restante: ${j.restantes ?? '—'}`, remitente: j.remitente, restantes: j.restantes };
  } catch (e) {
    return { ok: false, detalle: `No se pudo conectar. Revise que la URL termine en /exec y que el acceso sea "Cualquier usuario". (${String(e)})` };
  }
};

/** Código de Google Apps Script que se pega en script.google.com (cuenta remitente). */
export const CODIGO_APPS_SCRIPT = `/**
 * Servicio de correo · Gestión PQRSF Tecnitrauma S.A.
 * Pegue este código en https://script.google.com con la cuenta que enviará los correos.
 * Cambie TOKEN por una clave propia y escriba la misma clave en la aplicación.
 */
const TOKEN = 'CAMBIE-ESTA-CLAVE';
const NOMBRE_REMITENTE = 'Gestión PQRSF · Tecnitrauma S.A.';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return responder({ ok: false, error: 'Clave (token) inválida.' });
    const para = (d.para || []).filter(String).join(',');
    if (!para) return responder({ ok: false, error: 'Sin destinatarios.' });
    const opciones = { htmlBody: d.html || undefined, name: d.nombre || NOMBRE_REMITENTE };
    const cc = (d.cc || []).filter(String).join(',');
    if (cc) opciones.cc = cc;
    GmailApp.sendEmail(para, d.asunto || 'Notificación PQRSF', d.cuerpo || '', opciones);
    return responder({ ok: true, remitente: Session.getEffectiveUser().getEmail(), restantes: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return responder({ ok: false, error: String(err) });
  }
}

function doGet() {
  return responder({ ok: true, servicio: 'PQRSF Tecnitrauma', remitente: Session.getEffectiveUser().getEmail(), restantes: MailApp.getRemainingDailyQuota() });
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Ejecute esta función una vez desde el editor para conceder los permisos de Gmail. */
function autorizar() {
  GmailApp.getAliases();
  Logger.log('Cupo diario restante: ' + MailApp.getRemainingDailyQuota());
}
`;
