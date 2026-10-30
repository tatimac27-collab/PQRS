// ============================================================================
// Tipos del dominio · Gestión de Solicitudes Internas y Externas (PQRSF)
// Tecnitrauma S.A. · Sistema de Gestión de Calidad ISO 9001
// ============================================================================

export type Rol =
  | 'ADMIN_CALIDAD' // Coordinador de Calidad (Administrador del sistema)
  | 'DIRECTOR_TECNICO' // Gerente Operativo / Director Técnico
  | 'GERENCIA' // Gerente Comercial / Administrativo
  | 'LIDER_PROCESO' // Responsable de área / coordinador
  | 'GESTOR' // Trabajador del área (recibe delegaciones)
  | 'REGISTRADOR'; // Registrador de Solicitudes (perfil por defecto de cuentas nuevas)

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  cargo: string;
  proceso: string;
  ciudad: string;
  rol: Rol;
  clave: string; // alfanumérica (ver REGLA_CLAVE)
  debeCambiarClave: boolean;
  activo: boolean;
  creado: string;
}

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  dataUrl?: string; // sólo se guarda si el archivo es liviano (localStorage)
  fecha: string;
  subidoPor: string;
}

export type Riesgo = 'Riesgo vital' | 'Alto' | 'Medio' | 'Bajo' | 'Sin clasificar' | string;

export type EstadoLegal =
  | 'Radicada'
  | 'En Proceso'
  | 'Reabierta'
  | 'Gestión del área cerrada'
  | 'Respuesta en aprobación'
  | 'Aprobada para envío'
  | 'Por validar el cierre'
  | 'Cerrada con respuesta'
  | 'Rechazada';

export type EstadoAccion =
  | 'Sin Plan'
  | 'Pendiente aprobación'
  | 'En ejecución'
  | 'Plan fallido'
  | 'Reingeniería autorizada'
  | 'Cerrado definitivo'
  | 'No aplica';

export type Procedencia = 'Pendiente' | 'Procedente' | 'No Procedente';

export interface Ishikawa {
  manoObra: string;
  metodo: string;
  materiales: string;
  medioAmbiente: string;
}

export interface AnalisisCausa {
  porques: string[]; // 5 porqués secuenciales
  ishikawa: Ishikawa;
  fecha: string;
  por: string;
}

export interface PlanAccion {
  correccion: string;
  fechaCorreccion: string;
  accion: string;
  responsable: string;
  fechaLimite: string;
  indicador: string;
  impactoEstructural: boolean;
}

export interface CicloMejora {
  numero: number;
  analisis?: AnalisisCausa;
  plan?: PlanAccion;
  enviadoAprobacion?: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  evidencias: Adjunto[];
  notaEjecucion?: string;
  fechaEvaluacion?: string; // fecha programada (aprobación + 3 meses)
  resultado?: 'Eficaz' | 'Ineficaz';
  observacionEvaluacion?: string;
  evaluadoPor?: string;
  fechaEvaluada?: string;
  autorizacionReingenieria?: { por: string; fecha: string; motivo: string };
}

export interface DispositivoMedico {
  descripcion: string;
  referencia: string;
  lote: string;
  cantidad: number;
  genero: string;
  eventoAdverso: boolean;
  reportadoTecnovigilancia: boolean;
  reportadoSeguridadPaciente: boolean;
}

export interface Aprobacion {
  aprobado: boolean;
  por?: string;
  fecha?: string;
}

export interface RespuestaCliente {
  tipo: 'Procedente' | 'No procedente';
  texto: string;
  proyectadaPor: string;
  fecha: string;
  aprobGerencia: Aprobacion;
  aprobDT: Aprobacion;
  devolucion?: { por: string; fecha: string; motivo: string };
}

export interface CierreLegal {
  pdf: Adjunto;
  fechaEnvio: string;
  medio: string;
  cerradoPor: string;
  fecha: string;
  dentroDeTermino: boolean;
}

export interface CierreArea {
  respuesta: string;
  soportes: Adjunto[];
  por: string;
  fecha: string;
}

export interface Validacion {
  resultado: 'Aceptada' | 'Reabierta';
  por: string;
  fecha: string;
  justificacion?: string;
}

export interface PQRSF {
  id: string;
  consecutivo: string;
  // ---- Fase 1 · Radicación
  origen: string;
  canal: string;
  fechaRecepcion: string; // ISO
  radicadoPor: string; // email
  radicadoPorNombre: string;
  reportaNombre: string;
  reportaContacto: string;
  institucion: string;
  ciudad: string;
  paciente: string;
  descripcion: string;
  evidencias: Adjunto[];
  // ---- Fase 2 · Caracterización
  tipoTramite: string;
  tipoTramiteOriginal?: string;
  convertidaEnQueja: boolean;
  fechaConversionQueja?: string;
  tipoPQRSF: string;
  riesgo: Riesgo;
  tipologia: string;
  area: string;
  responsableEmail: string;
  responsableNombre: string;
  responsableCargo: string;
  delegadoEmail?: string;
  delegadoNombre?: string;
  clasificada: boolean;
  clasificadaPor?: string;
  // ---- SLA
  slaHoras: number;
  fechaLimite: string;
  slaDetenido: boolean;
  fechaDetencionSLA?: string;
  alertas: string[];
  // ---- Fase 3 · Gestión operativa
  estadoLegal: EstadoLegal;
  procedencia: Procedencia;
  justificacionProcedencia?: string;
  dispositivo?: DispositivoMedico;
  ciclos: CicloMejora[];
  estadoAccion: EstadoAccion;
  // ---- Respuesta, cierre y validación
  respuesta?: RespuestaCliente;
  cierreArea?: CierreArea;
  rechazo?: { justificacion: string; por: string; fecha: string };
  cierreLegal?: CierreLegal;
  validaciones: Validacion[];
  soportesAdicionales?: Adjunto[]; // aportados durante la validación del cierre
  reaperturas: number;
  actualizado: string;
}

export interface Tipologia {
  id: string;
  nombre: string;
  area: string;
  cargo: string;
  email: string;
  especial?: boolean; // "Solicitudes Internas entre Procesos": sin proceso ni correo fijo
}

export interface Notificacion {
  id: string;
  fecha: string;
  para: string[];
  cc: string[];
  asunto: string;
  cuerpo: string;
  pqrsfId?: string;
  evento?: string; // Radicación, Cambio de estado, Vencimiento, Acción correctiva, etc.
  /** Estado del envío real por Gmail (Google Apps Script). */
  envio?: 'simulado' | 'pendiente' | 'enviado' | 'error';
  envioDetalle?: string;
  envioFecha?: string;
}

/** Configuración del envío real de correos a través de Gmail (Google Apps Script). */
export interface ConfigEnvio {
  activo: boolean; // si es false, los correos solo se registran (simulación)
  urlScript: string; // URL de la aplicación web de Apps Script (termina en /exec)
  token: string; // clave compartida con el script
  correoRemitente: string; // cuenta de Gmail / Workspace que implementa el script
  nombreRemitente: string;
  modoPrueba: boolean; // redirige TODOS los correos al buzón de prueba
  correoPrueba: string;
  urlApp: string; // enlace de la aplicación que aparece en el botón del correo
}

export interface RegistroAuditoria {
  id: string;
  fecha: string;
  usuario: string;
  rol: string;
  accion: string;
  detalle: string;
  pqrsfId?: string;
}

export interface SolicitudClave {
  id: string;
  email: string;
  fecha: string;
  atendida: boolean;
}

/** Configuración dinámica de correos por área (Coordinador de Calidad). */
export interface ConfigCorreoArea {
  area: string;
  liderEmail: string;
  liderNombre?: string; // nombre y cargo del líder cuando no es un usuario registrado
  apoyo: string[]; // correos de apoyo
  copias: string[]; // copias obligatorias (Dirección Técnica / Gerencias)
}

export interface AppState {
  version: number;
  usuarios: Usuario[];
  tipologias: Tipologia[];
  configCorreos: ConfigCorreoArea[];
  configEnvio: ConfigEnvio;
  pqrsf: PQRSF[];
  notificaciones: Notificacion[];
  auditoria: RegistroAuditoria[];
  solicitudesClave: SolicitudClave[];
  contadores: Record<string, number>; // año -> último consecutivo
}

export type Vista =
  | 'tablero'
  | 'radicar'
  | 'tipologias'
  | 'usuarios'
  | 'auditoria'
  | 'cuenta'
  | 'consulta'
  | 'modelo'
  | 'detalle';
