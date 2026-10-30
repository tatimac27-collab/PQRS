import type { Adjunto, PQRSF, Usuario } from '../types';
import {
  DIAS_SEGUIMIENTO_EFICACIA,
  PESOS_INDICADOR,
  SLA_MAX_POR_TRAMITE,
  SLA_POR_RIESGO,
  CLAVE_MAX,
  CLAVE_MIN,
  UMBRAL_FALLA_SISTEMICA,
  VENTANA_REINCIDENCIA_DIAS,
} from '../data';

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

/** Devuelve el mensaje de error o null si la clave cumple la regla alfanumérica. */
export const validarClave = (c: string): string | null => {
  if (c.length < CLAVE_MIN || c.length > CLAVE_MAX) return `La clave debe tener entre ${CLAVE_MIN} y ${CLAVE_MAX} caracteres.`;
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(c) || !/\d/.test(c)) return 'La clave debe combinar letras y números.';
  if (/\s/.test(c)) return 'La clave no puede tener espacios.';
  return null;
};

/** Clave provisional alfanumérica de 8 caracteres (sin caracteres ambiguos). */
export const generarClaveProvisional = () => {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const N = '23456789';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [pick(L), pick(L), pick(N), pick(N), ...Array.from({ length: 4 }, () => pick(L + N))];
  return base.sort(() => Math.random() - 0.5).join('');
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const ahoraISO = () => new Date().toISOString();

const HORA = 3600_000;
const DIA = 24 * HORA;

// ---------------------------------------------------------------- Formatos
export const fmtFechaHora = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
export const fmtFecha = (iso?: string) =>
  iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
export const fmtTamano = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// ---------------------------------------------------------------- Consecutivo
export const formatearConsecutivo = (n: number, year: number) => `PQR${String(n).padStart(3, '0')}${year}`;

// ---------------------------------------------------------------- SLA
export const calcularSLAHoras = (riesgo: string, tramite: string, personalizado?: number) => {
  const porRiesgo = personalizado && personalizado > 0 ? personalizado : SLA_POR_RIESGO[riesgo] ?? SLA_POR_RIESGO['Medio'];
  const maxTramite = SLA_MAX_POR_TRAMITE[tramite] ?? 360;
  return Math.min(porRiesgo, maxTramite);
};

export const calcularFechaLimite = (fechaRecepcion: string, horas: number) =>
  new Date(new Date(fechaRecepcion).getTime() + horas * HORA).toISOString();

export const horasRestantes = (p: PQRSF, now: number) => (new Date(p.fechaLimite).getTime() - now) / HORA;

export const estaVencida = (p: PQRSF, now: number) => !p.slaDetenido && now > new Date(p.fechaLimite).getTime();

/** Se cerró (detuvo el SLA) dentro del término. */
export const cerradaATiempo = (p: PQRSF) =>
  p.slaDetenido && !!p.fechaDetencionSLA && new Date(p.fechaDetencionSLA).getTime() <= new Date(p.fechaLimite).getTime();

export const ESTADOS_ABIERTOS = ['Radicada', 'En Proceso', 'Reabierta', 'Gestión del área cerrada', 'Respuesta en aprobación', 'Aprobada para envío'];

export const accionActiva = (p: PQRSF) => ['Pendiente aprobación', 'En ejecución', 'Plan fallido', 'Reingeniería autorizada'].includes(p.estadoAccion);

export const fechaEvaluacionEficacia = (desdeISO: string) => new Date(new Date(desdeISO).getTime() + DIAS_SEGUIMIENTO_EFICACIA * DIA).toISOString();

// ---------------------------------------------------------------- Reincidencia / Falla sistémica
export const analizarHistorico = (lista: PQRSF[], actual: Pick<PQRSF, 'id' | 'institucion' | 'tipologia' | 'fechaRecepcion'>) => {
  if (!actual.tipologia) return { reincidencia: 0, sistemica: 0, alertas: [] as string[] };
  const desde = new Date(actual.fechaRecepcion).getTime() - VENTANA_REINCIDENCIA_DIAS * DIA;
  const misma = lista.filter(
    (p) => p.id !== actual.id && p.tipologia === actual.tipologia && new Date(p.fechaRecepcion).getTime() >= desde
  );
  const reincidencia = misma.filter((p) => p.institucion.trim().toLowerCase() === actual.institucion.trim().toLowerCase()).length;
  const sistemica = misma.length + 1;
  const alertas: string[] = [];
  if (reincidencia > 0) alertas.push('Reincidencia');
  if (sistemica >= UMBRAL_FALLA_SISTEMICA) alertas.push('Falla sistémica');
  return { reincidencia, sistemica, alertas };
};

// ---------------------------------------------------------------- Indicadores
export const calcularIndicadores = (lista: PQRSF[], now: number) => {
  const vencidas = lista.filter((p) => estaVencida(p, now)).length;
  const porValidar = lista.filter((p) => p.estadoLegal === 'Por validar el cierre').length;
  const cerradas = lista.filter((p) => p.estadoLegal === 'Cerrada con respuesta').length;

  const conTermino = lista.filter((p) => p.slaDetenido || estaVencida(p, now));
  const aTiempo = conTermino.filter((p) => cerradaATiempo(p)).length;
  const cumplimiento = conTermino.length ? (aTiempo / conTermino.length) * 100 : 100;

  const ciclosEvaluados = lista.flatMap((p) => p.ciclos.filter((c) => c.resultado));
  const eficacia = ciclosEvaluados.length
    ? (ciclosEvaluados.filter((c) => c.resultado === 'Eficaz').length / ciclosEvaluados.length) * 100
    : 100;

  const validaciones = lista.flatMap((p) => p.validaciones);
  const validacion = validaciones.length
    ? (validaciones.filter((v) => v.resultado === 'Aceptada').length / validaciones.length) * 100
    : 100;

  const ponderado =
    cumplimiento * PESOS_INDICADOR.terminos + eficacia * PESOS_INDICADOR.eficacia + validacion * PESOS_INDICADOR.validacion;

  return { total: lista.length, vencidas, porValidar, cerradas, cumplimiento, eficacia, validacion, ponderado };
};

// ---------------------------------------------------------------- Archivos
const LIMITE_DATAURL = 350 * 1024; // para no saturar localStorage

export const leerArchivos = async (files: FileList | File[], usuario: string): Promise<Adjunto[]> => {
  const arr = Array.from(files);
  return Promise.all(
    arr.map(
      (f) =>
        new Promise<Adjunto>((resolve) => {
          const base: Adjunto = { id: uid(), nombre: f.name, tipo: f.type || 'application/octet-stream', tamano: f.size, fecha: ahoraISO(), subidoPor: usuario };
          if (f.size > LIMITE_DATAURL) return resolve(base);
          const r = new FileReader();
          r.onload = () => resolve({ ...base, dataUrl: String(r.result) });
          r.onerror = () => resolve(base);
          r.readAsDataURL(f);
        })
    )
  );
};

export const esPdfOImagen = (a: Adjunto) => a.tipo === 'application/pdf' || a.tipo.startsWith('image/') || /\.(pdf|png|jpe?g|gif|webp)$/i.test(a.nombre);

// ---------------------------------------------------------------- Permisos
export const esAdmin = (u: Usuario) => u.rol === 'ADMIN_CALIDAD';
export const esDT = (u: Usuario) => u.rol === 'DIRECTOR_TECNICO';
export const esGerencia = (u: Usuario) => u.rol === 'GERENCIA' || u.rol === 'DIRECTOR_TECNICO';
export const veTodo = (u: Usuario) => esAdmin(u) || esGerencia(u);
export const puedeClasificar = (u: Usuario) => esAdmin(u) || esDT(u);
export const esAsignado = (u: Usuario, p: PQRSF) =>
  (!!p.responsableEmail && p.responsableEmail === u.email) || (!!p.delegadoEmail && p.delegadoEmail === u.email);
export const esLiderDelArea = (u: Usuario, p: PQRSF) => u.rol === 'LIDER_PROCESO' && !!p.area && u.proceso === p.area;
export const puedeGestionar = (u: Usuario, p: PQRSF) => esAdmin(u) || esAsignado(u, p) || esLiderDelArea(u, p);
export const puedeValidar = (u: Usuario, p: PQRSF) => esAdmin(u) || p.radicadoPor === u.email || esAsignado(u, p);
export const visiblePara = (u: Usuario, p: PQRSF) =>
  veTodo(u) || p.radicadoPor === u.email || esAsignado(u, p) || (!!p.area && p.area === u.proceso);
