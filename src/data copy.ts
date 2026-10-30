// ============================================================================
// Datos maestros de Tecnitrauma S.A. (Listado de Líderes 2026) y catálogos
// ============================================================================
import type { AppState, ConfigCorreoArea, ConfigEnvio, PQRSF, Rol, Tipologia, Usuario } from './types';

export const OTRO = 'Otro / Personalizado';
export const DOMINIO = '@tecnitrauma.com.co';
export const CLAVE_PROVISIONAL = '12345';
/** Regla de clave: alfanumérica de 6 a 20 caracteres, con al menos una letra y un número. */
export const CLAVE_MIN = 6;
export const CLAVE_MAX = 20;
export const REGLA_CLAVE = `De ${CLAVE_MIN} a ${CLAVE_MAX} caracteres, con al menos una letra y un número.`;
export const EMAIL_DIRECCION_TECNICA = 'gerenteoperaciones@tecnitrauma.com.co';
export const EMAIL_CALIDAD = 'coordinadorcalidad@tecnitrauma.com.co';
export const TIPOLOGIA_INTERNA = 'Solicitudes Internas entre Procesos';

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN_CALIDAD: 'Administrador (Coordinador de Calidad)',
  DIRECTOR_TECNICO: 'Director Técnico / Gerencia Operativa',
  GERENCIA: 'Gerencia',
  LIDER_PROCESO: 'Líder de Proceso (Responsable de Gestión)',
  GESTOR: 'Gestor del Área',
  REGISTRADOR: 'Registrador de Solicitudes',
};

// ---------------------------------------------------------------- Procesos
export const AREAS = [
  'Dirección Técnica',
  'Comercial',
  'Administrativa',
  'Almacén',
  'Soporte Técnico y Servicio al Cliente',
  'Inventarios',
  'Gestión Humana',
  'Cuentas Médicas y Facturación',
  'Compras',
  'Cartera',
  'Calidad',
  'Biomédica / Mantenimiento',
];

// ---------------------------------------------------------------- Catálogos
export const ORIGENES = ['Interna', 'Externa'];
export const CANALES = [
  'Correo electrónico',
  'Teléfono',
  'WhatsApp',
  'Presencial',
  'Página web / Portal',
  'Buzón de sugerencias',
  'Asesor comercial',
  'Encuesta de satisfacción',
];
export const TIPOS_TRAMITE = ['Queja', 'Reclamo', 'Petición', 'Sugerencia', 'Felicitación'];
export const TIPOS_PQRSF = [
  'Dispositivos médicos',
  'Facturación',
  'Entrega / Logística',
  'Atención comercial',
  'Soporte técnico / Mantenimiento',
  'Inventarios',
  'Cartera',
  'Talento humano',
  'Documentación técnica o legal',
  'Solicitud interna',
];
export const RIESGOS = ['Riesgo vital', 'Alto', 'Medio', 'Bajo'];
export const MEDIOS_RESPUESTA = [
  'Correo electrónico',
  'Físico / Correspondencia',
  'Portal web',
  'WhatsApp',
  'Llamada telefónica',
  'Entrega personal',
];
export const GENEROS = ['Femenino', 'Masculino', 'No aplica'];

// ---------------------------------------------------------------- Reglas SLA
/** Horas calendario para responder según la clasificación de riesgo. */
export const SLA_POR_RIESGO: Record<string, number> = {
  'Riesgo vital': 24,
  Alto: 72,
  Medio: 120,
  Bajo: 240,
  'Sin clasificar': 360,
};
/** Término máximo según el tipo de trámite (15 días = 360 h). */
export const SLA_MAX_POR_TRAMITE: Record<string, number> = {
  Queja: 360,
  Reclamo: 360,
  'Petición': 360,
  Sugerencia: 360,
  'Felicitación': 360,
};
export const DIAS_SEGUIMIENTO_EFICACIA = 90; // 3 meses
export const VENTANA_REINCIDENCIA_DIAS = 90;
export const UMBRAL_FALLA_SISTEMICA = 3;
export const PESOS_INDICADOR = { terminos: 0.4, eficacia: 0.4, validacion: 0.2 };

// ---------------------------------------------------------------- Usuarios
type Semilla = [nombre: string, cargo: string, proceso: string, email: string, ciudad: string, rol: Rol];

const LIDERES: Semilla[] = [
  ['SALCEDO ALVAREZ ADRIANA JUDITH', 'Gerente Operativo / Director Técnico', 'Dirección Técnica', 'gerenteoperaciones@tecnitrauma.com.co', 'Barranquilla', 'DIRECTOR_TECNICO'],
  ['FUENTES CARBONELL ELIA PATRICIA', 'Gerente Comercial', 'Comercial', 'gerentecomercial@tecnitrauma.com.co', 'Barranquilla', 'GERENCIA'],
  ['TERAN HERNANDEZ CLAUDIA PATRICIA', 'Gerente Administrativo', 'Administrativa', 'gerenciaadministrativa@tecnitrauma.com.co', 'Barranquilla', 'GERENCIA'],
  ['MIRANDA BEDOYA WUALFRAN FELICIANO', 'Director de Almacén', 'Almacén', 'directoralmacen@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['OLIVEROS HERNANDEZ ANDREA CAROLINA', 'Coordinador de Soporte Técnico y Servicio al Cliente', 'Soporte Técnico y Servicio al Cliente', 'servicioalcliente@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['TORRES MAC LISETH TATIANA', 'Coordinador de Inventarios', 'Inventarios', 'logisticainventarios@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['FUENTES CARBONELL MARTA ISABEL', 'Coordinador de Gestión Humana', 'Gestión Humana', 'gestionhumana@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['BADILLO FERNANDEZ LIBIA ESTHER', 'Coordinador de Cuentas Médicas y Facturación', 'Cuentas Médicas y Facturación', 'coordinadorfacturacion@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['MARTINEZ PATERNINA MARY INES', 'Coordinador de Compras', 'Compras', 'coordinadorcompras@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['ACOSTA ALVAREZ RUBY ANTONINA', 'Coordinador de Cartera', 'Cartera', 'autorizacioncartera@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['JALAL NIETO SOMNY DEL CARMEN', 'Coordinador de Calidad', 'Calidad', 'coordinadorcalidad@tecnitrauma.com.co', 'Barranquilla', 'ADMIN_CALIDAD'],
  ['JIMENEZ OQUENDO ERICK ALFONSO', 'Coordinador de Almacén / Logística MV', 'Almacén', 'logisticamv@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
  ['BARRETO RAMOS KATHERIN MERCEDES', 'Biomédico / Mantenimiento', 'Biomédica / Mantenimiento', 'mantenimientoequipos@tecnitrauma.com.co', 'Barranquilla', 'LIDER_PROCESO'],
];

// Personal del área comercial (Listado de Líderes 2026) para delegaciones
const ASESORES: Semilla[] = [
  ['ARZUAGA GUEVARA KAROLL YULIBEINY', 'Asesor Comercial y Técnico', 'Comercial', 'comercial2.valledupar@tecnitrauma.com.co', 'Valledupar', 'GESTOR'],
  ['CURA ARRIETA LINA MARCELA', 'Asesor Comercial y Técnico', 'Comercial', 'comercial.monteria@tecnitrauma.com.co', 'Montería', 'GESTOR'],
  ['JARABA GARCIA YENIFER PAOLA', 'Asesor Comercial y Técnico', 'Comercial', 'comercial.sincelejo@tecnitrauma.com.co', 'Sincelejo', 'GESTOR'],
  ['LINARES MARRIAGA HANDSON ALBERTO', 'Asesor Comercial y Técnico', 'Comercial', 'comercial.fxe@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
  ['MERCADO CASTRO DALMA KARINA', 'Asesor Comercial y Técnico', 'Comercial', 'comercial.valledupar@tecnitrauma.com.co', 'Valledupar', 'GESTOR'],
  ['ZUÑIGA PUENTES LILIANA', 'Asesor Comercial y Técnico', 'Comercial', 'comercial5@tecnitrauma.com.co', 'Santa Marta', 'GESTOR'],
  ['MEZA CORRALES SANDRA MARGARITA', 'Asesor Comercial / Fisioterapeuta', 'Comercial', 'comerciallineablanda@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
  ['GAMBOA LIZARAZO JENIFER', 'Asesor Comercial Punto de Venta', 'Comercial', 'comercialpvb@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
  ['BERTEL MELENDEZ JULIETH CAROLINA', 'Asesor Comercial', 'Comercial', 'soportetecnicocg@tecnitrauma.com.co', 'Cartagena', 'GESTOR'],
  ['FORERO CASTAÑO JHUDY YANETH', 'Asesor Comercial', 'Comercial', 'comercial.cmf@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
  ['MANTILLA ESTRADA TATIANA ISABEL', 'Asesor Comercial', 'Comercial', 'distribuidores@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
  ['PINO PEREZ PATRICIA MILAGROS', 'Asesor Comercial', 'Comercial', 'ppino@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
  ['VARELA REINA ANA JULIA', 'Asesor Comercial', 'Comercial', 'comercial6@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
  ['ESCALANTE MARQUEZ YOLANDA MILENA', 'Asesor Comercial', 'Comercial', 'comercial.barranquilla1@tecnitrauma.com.co', 'Barranquilla', 'GESTOR'],
];

export const usuariosIniciales = (): Usuario[] =>
  [...LIDERES, ...ASESORES].map(([nombre, cargo, proceso, email, ciudad, rol], i) => ({
    id: `u${i + 1}`,
    nombre,
    cargo,
    proceso,
    email,
    ciudad,
    rol,
    clave: CLAVE_PROVISIONAL,
    debeCambiarClave: true,
    activo: true,
    creado: new Date().toISOString(),
  }));

export const CARGOS = Array.from(new Set([...LIDERES, ...ASESORES].map((s) => s[1])));

// ---------------------------------------------------------------- Tipologías
export const tipologiasIniciales = (): Tipologia[] => [
  { id: 't1', nombre: 'Producto no conforme / defectuoso', area: 'Almacén', cargo: 'Director de Almacén', email: 'directoralmacen@tecnitrauma.com.co' },
  { id: 't2', nombre: 'Entrega incompleta o fuera de tiempo', area: 'Almacén', cargo: 'Director de Almacén', email: 'directoralmacen@tecnitrauma.com.co' },
  { id: 't3', nombre: 'Error en facturación o cobro', area: 'Cuentas Médicas y Facturación', cargo: 'Coordinador de Cuentas Médicas y Facturación', email: 'coordinadorfacturacion@tecnitrauma.com.co' },
  { id: 't4', nombre: 'Demora en radicación de cuentas', area: 'Cuentas Médicas y Facturación', cargo: 'Coordinador de Cuentas Médicas y Facturación', email: 'coordinadorfacturacion@tecnitrauma.com.co' },
  { id: 't5', nombre: 'Atención comercial / trato del asesor', area: 'Comercial', cargo: 'Gerente Comercial', email: 'gerentecomercial@tecnitrauma.com.co' },
  { id: 't6', nombre: 'Incumplimiento de condiciones pactadas', area: 'Comercial', cargo: 'Gerente Comercial', email: 'gerentecomercial@tecnitrauma.com.co' },
  { id: 't7', nombre: 'Falla técnica de equipo / instrumental', area: 'Soporte Técnico y Servicio al Cliente', cargo: 'Coordinador de Soporte Técnico y Servicio al Cliente', email: 'servicioalcliente@tecnitrauma.com.co' },
  { id: 't8', nombre: 'Mantenimiento no realizado', area: 'Biomédica / Mantenimiento', cargo: 'Biomédico / Mantenimiento', email: 'mantenimientoequipos@tecnitrauma.com.co' },
  { id: 't9', nombre: 'Evento / incidente adverso con dispositivo médico', area: 'Dirección Técnica', cargo: 'Gerente Operativo / Director Técnico', email: 'gerenteoperaciones@tecnitrauma.com.co' },
  { id: 't10', nombre: 'Solicitud de documentación técnica o legal', area: 'Dirección Técnica', cargo: 'Gerente Operativo / Director Técnico', email: 'gerenteoperaciones@tecnitrauma.com.co' },
  { id: 't11', nombre: 'Diferencias de inventario / consignación', area: 'Inventarios', cargo: 'Coordinador de Inventarios', email: 'logisticainventarios@tecnitrauma.com.co' },
  { id: 't12', nombre: 'Gestión de cartera / estado de cuenta', area: 'Cartera', cargo: 'Coordinador de Cartera', email: 'autorizacioncartera@tecnitrauma.com.co' },
  { id: 't13', nombre: TIPOLOGIA_INTERNA, area: '', cargo: '', email: '', especial: true },
];

// ---------------------------------------------------------------- PQRSF de ejemplo
const H = 3600_000;
const D = 24 * H;

export const pqrsfIniciales = (): { lista: PQRSF[]; contadores: Record<string, number> } => {
  const now = Date.now();
  const year = new Date().getFullYear();
  const iso = (ms: number) => new Date(ms).toISOString();
  const cons = (n: number) => `PQR${String(n).padStart(3, '0')}${year}`;
  const base = (n: number, recibida: number, horas: number): Omit<PQRSF, 'tipoTramite' | 'tipoPQRSF' | 'riesgo' | 'tipologia' | 'area' | 'responsableEmail' | 'responsableNombre' | 'responsableCargo' | 'institucion' | 'descripcion' | 'origen' | 'canal' | 'reportaNombre'> => ({
    id: `p${n}`,
    consecutivo: cons(n),
    fechaRecepcion: iso(recibida),
    radicadoPor: EMAIL_CALIDAD,
    radicadoPorNombre: 'JALAL NIETO SOMNY DEL CARMEN',
    reportaContacto: '',
    ciudad: 'Barranquilla',
    paciente: '',
    evidencias: [],
    convertidaEnQueja: false,
    clasificada: true,
    clasificadaPor: 'JALAL NIETO SOMNY DEL CARMEN',
    slaHoras: horas,
    fechaLimite: iso(recibida + horas * H),
    slaDetenido: false,
    alertas: [],
    estadoLegal: 'En Proceso',
    procedencia: 'Pendiente',
    ciclos: [],
    estadoAccion: 'Sin Plan',
    validaciones: [],
    reaperturas: 0,
    actualizado: iso(now),
  });

  const lista: PQRSF[] = [
    {
      ...base(1, now - 10 * H, 24),
      origen: 'Externa', canal: 'Correo electrónico', reportaNombre: 'Coordinación de Cirugía',
      institucion: 'Clínica del Caribe', paciente: 'Paciente de prueba',
      descripcion: 'Placa de osteosíntesis recibida con empaque estéril comprometido para cirugía programada.',
      tipoTramite: 'Queja', tipoPQRSF: 'Dispositivos médicos', riesgo: 'Riesgo vital',
      tipologia: 'Producto no conforme / defectuoso', area: 'Almacén',
      responsableEmail: 'directoralmacen@tecnitrauma.com.co', responsableNombre: 'MIRANDA BEDOYA WUALFRAN FELICIANO', responsableCargo: 'Director de Almacén',
    },
    {
      ...base(2, now - 130 * H, 120),
      origen: 'Externa', canal: 'Correo electrónico', reportaNombre: 'Auditoría de cuentas',
      institucion: 'IPS Salud Norte', ciudad: 'Santa Marta',
      descripcion: 'Factura con valor unitario distinto al pactado en el contrato vigente.',
      tipoTramite: 'Reclamo', tipoPQRSF: 'Facturación', riesgo: 'Medio',
      tipologia: 'Error en facturación o cobro', area: 'Cuentas Médicas y Facturación',
      responsableEmail: 'coordinadorfacturacion@tecnitrauma.com.co', responsableNombre: 'BADILLO FERNANDEZ LIBIA ESTHER', responsableCargo: 'Coordinador de Cuentas Médicas y Facturación',
    },
    {
      ...base(3, now - 30 * H, 240),
      radicadoPor: 'logisticainventarios@tecnitrauma.com.co', radicadoPorNombre: 'TORRES MAC LISETH TATIANA',
      origen: 'Interna', canal: 'Correo electrónico', reportaNombre: 'TORRES MAC LISETH TATIANA',
      institucion: 'Tecnitrauma S.A. · Inventarios',
      descripcion: 'Se requiere orden de compra para reposición de tornillos corticales 3.5 mm agotados.',
      tipoTramite: 'Petición', tipoPQRSF: 'Solicitud interna', riesgo: 'Bajo',
      tipologia: TIPOLOGIA_INTERNA, area: 'Compras',
      responsableEmail: 'coordinadorcompras@tecnitrauma.com.co', responsableNombre: 'MARTINEZ PATERNINA MARY INES', responsableCargo: 'Coordinador de Compras',
    },
    {
      ...base(4, now - 6 * D, 240),
      origen: 'Externa', canal: 'Encuesta de satisfacción', reportaNombre: 'Jefe de Salas de Cirugía',
      institucion: 'Hospital Regional de Sincelejo', ciudad: 'Sincelejo',
      descripcion: 'Felicitación por el acompañamiento del asesor técnico en cirugía de urgencia.',
      tipoTramite: 'Felicitación', tipoPQRSF: 'Atención comercial', riesgo: 'Bajo',
      tipologia: 'Atención comercial / trato del asesor', area: 'Comercial',
      responsableEmail: 'gerentecomercial@tecnitrauma.com.co', responsableNombre: 'FUENTES CARBONELL ELIA PATRICIA', responsableCargo: 'Gerente Comercial',
      procedencia: 'Procedente', estadoAccion: 'No aplica', estadoLegal: 'Cerrada con respuesta',
      slaDetenido: true, fechaDetencionSLA: iso(now - 4 * D),
      cierreLegal: {
        pdf: { id: 'a1', nombre: 'Respuesta_PQR004.pdf', tipo: 'application/pdf', tamano: 84211, fecha: iso(now - 4 * D), subidoPor: 'JALAL NIETO SOMNY DEL CARMEN' },
        fechaEnvio: iso(now - 4 * D).slice(0, 10), medio: 'Correo electrónico',
        cerradoPor: 'JALAL NIETO SOMNY DEL CARMEN', fecha: iso(now - 4 * D), dentroDeTermino: true,
      },
      validaciones: [{ resultado: 'Aceptada', por: 'JALAL NIETO SOMNY DEL CARMEN', fecha: iso(now - 3 * D) }],
    },
    {
      ...base(5, now - 20 * D, 72),
      origen: 'Externa', canal: 'Teléfono', reportaNombre: 'Ingeniería Biomédica',
      institucion: 'Clínica Santa Marta', ciudad: 'Santa Marta',
      descripcion: 'Taladro quirúrgico presentó apagado intermitente durante el procedimiento.',
      tipoTramite: 'Queja', tipoPQRSF: 'Soporte técnico / Mantenimiento', riesgo: 'Alto',
      tipologia: 'Falla técnica de equipo / instrumental', area: 'Soporte Técnico y Servicio al Cliente',
      responsableEmail: 'servicioalcliente@tecnitrauma.com.co', responsableNombre: 'OLIVEROS HERNANDEZ ANDREA CAROLINA', responsableCargo: 'Coordinador de Soporte Técnico y Servicio al Cliente',
      procedencia: 'Procedente', estadoLegal: 'Cerrada con respuesta', estadoAccion: 'En ejecución',
      slaDetenido: true, fechaDetencionSLA: iso(now - 18 * D),
      ciclos: [{
        numero: 1,
        analisis: {
          porques: ['El taladro se apagó durante la cirugía', 'La batería no mantuvo la carga', 'La batería superó su vida útil', 'No se registró el ciclo de cambio de baterías', 'El plan de mantenimiento no incluye control de baterías'],
          ishikawa: { manoObra: 'Personal sin verificación previa de carga', metodo: 'Lista de chequeo sin ítem de baterías', materiales: 'Baterías con más de 500 ciclos', medioAmbiente: 'Almacenamiento a temperatura elevada' },
          fecha: iso(now - 19 * D), por: 'OLIVEROS HERNANDEZ ANDREA CAROLINA',
        },
        plan: {
          correccion: 'Reemplazo inmediato del equipo y de las baterías', fechaCorreccion: iso(now - 19 * D).slice(0, 10),
          accion: 'Incluir control de ciclos de batería en el plan de mantenimiento preventivo', responsable: 'BARRETO RAMOS KATHERIN MERCEDES',
          fechaLimite: iso(now + 30 * D).slice(0, 10), indicador: '0 fallas por batería en 3 meses', impactoEstructural: true,
        },
        enviadoAprobacion: iso(now - 19 * D), aprobadoPor: 'SALCEDO ALVAREZ ADRIANA JUDITH', fechaAprobacion: iso(now - 18 * D),
        evidencias: [], fechaEvaluacion: iso(now - 18 * D + DIAS_SEGUIMIENTO_EFICACIA * D),
      }],
      cierreLegal: {
        pdf: { id: 'a2', nombre: 'Respuesta_PQR005.pdf', tipo: 'application/pdf', tamano: 102400, fecha: iso(now - 18 * D), subidoPor: 'JALAL NIETO SOMNY DEL CARMEN' },
        fechaEnvio: iso(now - 18 * D).slice(0, 10), medio: 'Correo electrónico',
        cerradoPor: 'JALAL NIETO SOMNY DEL CARMEN', fecha: iso(now - 18 * D), dentroDeTermino: true,
      },
      validaciones: [{ resultado: 'Aceptada', por: 'OLIVEROS HERNANDEZ ANDREA CAROLINA', fecha: iso(now - 17 * D) }],
    },
    {
      ...base(6, now - 2 * H, 360),
      origen: 'Externa', canal: 'WhatsApp', reportaNombre: 'Auxiliar de compras',
      institucion: 'Clínica Montería Central', ciudad: 'Montería',
      descripcion: 'Solicitan certificado de registro INVIMA y ficha técnica del sistema de clavos endomedulares.',
      tipoTramite: 'Petición', tipoPQRSF: '', riesgo: 'Sin clasificar', tipologia: '', area: '',
      responsableEmail: '', responsableNombre: '', responsableCargo: '',
      clasificada: false, clasificadaPor: undefined, estadoLegal: 'Radicada',
    },
  ];
  return { lista, contadores: { [String(year)]: lista.length } };
};

export const STATE_VERSION = 2;

export const GERENCIAS = ['gerentecomercial@tecnitrauma.com.co', 'gerenciaadministrativa@tecnitrauma.com.co'];

/** Líder principal por área (editable en "Tipologías y Correos"). */
const LIDER_POR_AREA: Record<string, string> = {
  'Dirección Técnica': 'gerenteoperaciones@tecnitrauma.com.co',
  Comercial: 'gerentecomercial@tecnitrauma.com.co',
  Administrativa: 'gerenciaadministrativa@tecnitrauma.com.co',
  'Almacén': 'directoralmacen@tecnitrauma.com.co',
  'Soporte Técnico y Servicio al Cliente': 'servicioalcliente@tecnitrauma.com.co',
  Inventarios: 'logisticainventarios@tecnitrauma.com.co',
  'Gestión Humana': 'gestionhumana@tecnitrauma.com.co',
  'Cuentas Médicas y Facturación': 'coordinadorfacturacion@tecnitrauma.com.co',
  Compras: 'coordinadorcompras@tecnitrauma.com.co',
  Cartera: 'autorizacioncartera@tecnitrauma.com.co',
  Calidad: 'coordinadorcalidad@tecnitrauma.com.co',
  'Biomédica / Mantenimiento': 'mantenimientoequipos@tecnitrauma.com.co',
};
const APOYO_POR_AREA: Record<string, string[]> = {
  'Almacén': ['logisticamv@tecnitrauma.com.co'],
  'Soporte Técnico y Servicio al Cliente': ['mantenimientoequipos@tecnitrauma.com.co'],
  Comercial: ['distribuidores@tecnitrauma.com.co'],
};
const COPIAS_EXTRA: Record<string, string[]> = {
  Comercial: ['gerentecomercial@tecnitrauma.com.co'],
  'Cuentas Médicas y Facturación': ['gerenciaadministrativa@tecnitrauma.com.co'],
  Cartera: ['gerenciaadministrativa@tecnitrauma.com.co'],
  Compras: ['gerenciaadministrativa@tecnitrauma.com.co'],
  'Gestión Humana': ['gerenciaadministrativa@tecnitrauma.com.co'],
};

export const configCorreosInicial = (): ConfigCorreoArea[] =>
  AREAS.map((area) => ({
    area,
    liderEmail: LIDER_POR_AREA[area] ?? '',
    apoyo: APOYO_POR_AREA[area] ?? [],
    copias: Array.from(new Set([EMAIL_DIRECCION_TECNICA, ...(COPIAS_EXTRA[area] ?? [])])),
  }));

/** Cuenta de envío de prueba (se cambia desde Tipologías y Correos → Envío por Gmail). */
export const configEnvioInicial = (): ConfigEnvio => ({
  activo: false,
  urlScript: '',
  token: '',
  correoRemitente: 'logisticainventarios@tecnitrauma.com.co',
  nombreRemitente: 'Gestión PQRSF · Tecnitrauma S.A.',
  modoPrueba: true,
  correoPrueba: 'logisticainventarios@tecnitrauma.com.co',
  urlApp: '',
});

export const estadoInicial = (): AppState => {
  const { lista, contadores } = pqrsfIniciales();
  return {
    version: STATE_VERSION,
    usuarios: usuariosIniciales(),
    tipologias: tipologiasIniciales(),
    configCorreos: configCorreosInicial(),
    configEnvio: configEnvioInicial(),
    pqrsf: lista,
    notificaciones: [],
    auditoria: [
      { id: 'au0', fecha: new Date().toISOString(), usuario: 'Sistema', rol: 'Sistema', accion: 'Inicialización', detalle: 'Base de datos cargada con el Listado de Líderes 2026 y tipologías oficiales.' },
    ],
    solicitudesClave: [],
    contadores,
  };
};
