import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppState, ConfigCorreoArea, PQRSF, Tipologia, Usuario } from '../types';
import {
  CLAVE_PROVISIONAL,
  DOMINIO,
  EMAIL_CALIDAD,
  EMAIL_DIRECCION_TECNICA,
  GERENCIAS,
  ROL_LABEL,
  STATE_VERSION,
  estadoInicial,
} from '../data';
import { ahoraISO, estaVencida, fmtFechaHora, formatearConsecutivo, uid } from '../utils/helpers';

const STORAGE_KEY = 'tecnitrauma-pqrsf-estado';
const SESION_KEY = 'tecnitrauma-pqrsf-sesion';

type Resultado = { ok: boolean; error?: string };

export interface NotificarArgs {
  para: string[];
  asunto: string;
  cuerpo: string;
  pqrsfId?: string;
  /** Si se indica, se agregan el líder principal y los correos de apoyo del área, y sus copias obligatorias. */
  area?: string;
  evento?: string;
}

interface Ctx {
  state: AppState;
  usuario: Usuario | null;
  now: number;
  // Autenticación
  login: (email: string, clave: string) => Resultado;
  logout: () => void;
  solicitarAcceso: (d: { nombre: string; email: string; cargo: string; proceso: string; clave: string }) => Resultado;
  olvideClave: (email: string) => Resultado;
  cambiarClave: (actual: string, nueva: string) => Resultado;
  // Usuarios
  actualizarUsuario: (id: string, patch: Partial<Usuario>, detalle: string) => void;
  crearUsuario: (u: Usuario) => void;
  restablecerClave: (id: string) => string;
  atenderSolicitudClave: (id: string) => void;
  // Tipologías
  guardarTipologia: (t: Tipologia) => void;
  eliminarTipologia: (id: string) => void;
  guardarConfigCorreo: (c: ConfigCorreoArea) => void;
  // PQRSF
  siguienteConsecutivo: () => string;
  radicar: (p: Omit<PQRSF, 'id' | 'consecutivo' | 'actualizado'>) => PQRSF;
  actualizarPQRSF: (id: string, fn: (p: PQRSF) => PQRSF, accion: string, detalle: string) => void;
  notificar: (n: NotificarArgs) => void;
  auditar: (accion: string, detalle: string, pqrsfId?: string) => void;
  reiniciarDemo: () => void;
}

const AppContext = createContext<Ctx | null>(null);

const cargarEstado = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION && Array.isArray(parsed.pqrsf)) return parsed;
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return estadoInicial();
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(cargarEstado);
  const [sesion, setSesion] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESION_KEY);
    } catch {
      return null;
    }
  });
  const [now, setNow] = useState(Date.now());

  // Persistencia
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* cuota excedida: se mantiene en memoria */
    }
  }, [state]);

  useEffect(() => {
    try {
      if (sesion) localStorage.setItem(SESION_KEY, sesion);
      else localStorage.removeItem(SESION_KEY);
    } catch {
      /* noop */
    }
  }, [sesion]);

  // Reloj del SLA en vivo (cada 15 s)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const usuario = useMemo(() => state.usuarios.find((u) => u.email === sesion && u.activo) ?? null, [state.usuarios, sesion]);

  // ------------------------------------------------------------ utilidades base
  const auditarCon = useCallback(
    (s: AppState, accion: string, detalle: string, pqrsfId?: string, quien?: Usuario | null): AppState => ({
      ...s,
      auditoria: [
        {
          id: uid(),
          fecha: ahoraISO(),
          usuario: quien ? quien.nombre : 'Sistema',
          rol: quien ? ROL_LABEL[quien.rol] : 'Sistema',
          accion,
          detalle,
          pqrsfId,
        },
        ...s.auditoria,
      ],
    }),
    []
  );

  /** Simulación de correo: resuelve destinatarios con la configuración dinámica por área. */
  const notificarCon = (s: AppState, n: NotificarArgs): AppState => {
    const cfg = n.area ? s.configCorreos.find((c) => c.area === n.area) : undefined;
    const para = Array.from(new Set([...n.para, ...(cfg ? [cfg.liderEmail, ...cfg.apoyo] : [])].filter(Boolean)));
    const cc = Array.from(new Set([EMAIL_DIRECCION_TECNICA, ...(cfg?.copias ?? [])].filter((e) => e && !para.includes(e))));
    return {
      ...s,
      notificaciones: [
        { id: uid(), fecha: ahoraISO(), para, cc, asunto: n.asunto, cuerpo: n.cuerpo, pqrsfId: n.pqrsfId, evento: n.evento },
        ...s.notificaciones,
      ],
    };
  };

  const auditar = useCallback(
    (accion: string, detalle: string, pqrsfId?: string) => setState((s) => auditarCon(s, accion, detalle, pqrsfId, usuario)),
    [auditarCon, usuario]
  );

  const notificar = useCallback((n: NotificarArgs) => setState((s) => notificarCon(s, n)), []);

  // ------------------------------------------------------------ REGLA CRÍTICA: SLA vencido => QUEJA
  useEffect(() => {
    const pendientes = state.pqrsf.filter((p) => estaVencida(p, now) && !p.alertas.includes('SLA vencido'));
    if (!pendientes.length) return;
    setState((s) => {
      // Se recalcula sobre el estado más reciente para evitar duplicados
      const objetivo = s.pqrsf.filter((p) => estaVencida(p, now) && !p.alertas.includes('SLA vencido'));
      if (!objetivo.length) return s;
      let nuevo = { ...s };
      nuevo.pqrsf = s.pqrsf.map((p) => {
        if (!objetivo.some((x) => x.id === p.id)) return p;
        const convertir = p.tipoTramite !== 'Queja';
        return {
          ...p,
          tipoTramiteOriginal: convertir ? p.tipoTramite : p.tipoTramiteOriginal,
          tipoTramite: 'Queja',
          convertidaEnQueja: convertir || p.convertidaEnQueja,
          fechaConversionQueja: convertir ? ahoraISO() : p.fechaConversionQueja,
          estadoAccion: p.estadoAccion === 'No aplica' ? 'Sin Plan' : p.estadoAccion,
          alertas: [...p.alertas, 'SLA vencido', ...(convertir ? ['Convertida en Queja'] : [])],
          actualizado: ahoraISO(),
        };
      });
      for (const p of objetivo) {
        const convertir = p.tipoTramite !== 'Queja';
        nuevo = auditarCon(
          nuevo,
          convertir ? 'Conversión automática a Queja' : 'Vencimiento de término',
          convertir
            ? `${p.consecutivo}: el término venció el ${fmtFechaHora(p.fechaLimite)} sin cierre. El trámite "${p.tipoTramite}" se convirtió automáticamente en QUEJA.`
            : `${p.consecutivo}: el término venció el ${fmtFechaHora(p.fechaLimite)} sin cierre.`,
          p.id,
          null
        );
        nuevo = notificarCon(nuevo, {
          para: [EMAIL_CALIDAD, ...GERENCIAS, p.responsableEmail, p.delegadoEmail ?? '', p.radicadoPor],
          area: p.area || undefined,
          evento: 'Vencimiento SLA',
          asunto: `[VENCIDA] ${p.consecutivo} ${convertir ? 'convertida en QUEJA' : 'sin respuesta dentro del término'}`,
          cuerpo: `La solicitud ${p.consecutivo} (${p.institucion}) no se cerró dentro del término establecido (${p.slaHoras} h). ${
            convertir ? `Por regla de negocio se reclasifica de "${p.tipoTramite}" a QUEJA.` : ''
          }`,
          pqrsfId: p.id,
        });
      }
      return nuevo;
    });
  }, [now, state.pqrsf, auditarCon]);

  // ------------------------------------------------------------ Autenticación
  const login = (email: string, clave: string): Resultado => {
    const e = email.trim().toLowerCase();
    if (!e.endsWith(DOMINIO)) return { ok: false, error: `Use su correo institucional (${DOMINIO}).` };
    if (!/^\d{5}$/.test(clave)) return { ok: false, error: 'La clave debe tener exactamente 5 dígitos numéricos.' };
    const u = state.usuarios.find((x) => x.email.toLowerCase() === e);
    if (!u) return { ok: false, error: 'El correo no está registrado. Use "Solicitar acceso".' };
    if (!u.activo) return { ok: false, error: 'La cuenta está inactiva. Contacte a Coordinación de Calidad.' };
    if (u.clave !== clave) return { ok: false, error: 'Clave incorrecta.' };
    setSesion(u.email);
    setState((s) => auditarCon(s, 'Inicio de sesión', `${u.nombre} ingresó al sistema.`, undefined, u));
    return { ok: true };
  };

  const logout = () => {
    if (usuario) auditar('Cierre de sesión', `${usuario.nombre} cerró sesión.`);
    setSesion(null);
  };

  const solicitarAcceso: Ctx['solicitarAcceso'] = (d) => {
    const email = d.email.trim().toLowerCase();
    if (!d.nombre.trim()) return { ok: false, error: 'Ingrese su nombre completo.' };
    if (!email.endsWith(DOMINIO)) return { ok: false, error: `El correo debe ser institucional (${DOMINIO}).` };
    if (state.usuarios.some((u) => u.email.toLowerCase() === email)) return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
    if (!/^\d{5}$/.test(d.clave)) return { ok: false, error: 'La clave debe tener 5 dígitos numéricos.' };
    if (d.clave === CLAVE_PROVISIONAL) return { ok: false, error: 'No use la clave provisional 12345.' };
    const nuevo: Usuario = {
      id: uid(),
      nombre: d.nombre.trim().toUpperCase(),
      email,
      cargo: d.cargo || 'Sin cargo',
      proceso: d.proceso || 'Sin proceso',
      ciudad: 'Barranquilla',
      rol: 'REGISTRADOR',
      clave: d.clave,
      debeCambiarClave: false,
      activo: true,
      creado: ahoraISO(),
    };
    setState((s) => {
      let n = { ...s, usuarios: [...s.usuarios, nuevo] };
      n = auditarCon(n, 'Solicitud de acceso', `Cuenta creada para ${nuevo.nombre} (${email}) con perfil Registrador de Solicitudes.`, undefined, nuevo);
      n = notificarCon(n, {
        para: [EMAIL_CALIDAD],
        asunto: 'Nueva cuenta creada · Registrador de Solicitudes',
        cuerpo: `${nuevo.nombre} (${email}) creó una cuenta. Ajuste el rol y el proceso desde Usuarios si corresponde.`,
      });
      return n;
    });
    setSesion(email);
    return { ok: true };
  };

  const olvideClave = (email: string): Resultado => {
    const e = email.trim().toLowerCase();
    const u = state.usuarios.find((x) => x.email.toLowerCase() === e);
    if (!u) return { ok: false, error: 'El correo no está registrado.' };
    setState((s) => {
      let n: AppState = { ...s, solicitudesClave: [{ id: uid(), email: e, fecha: ahoraISO(), atendida: false }, ...s.solicitudesClave] };
      n = auditarCon(n, 'Olvidó su contraseña', `${u.nombre} solicitó restablecimiento de clave.`, undefined, u);
      n = notificarCon(n, {
        para: [EMAIL_CALIDAD],
        asunto: 'Solicitud de restablecimiento de clave',
        cuerpo: `${u.nombre} (${e}) olvidó su clave. Genere una clave provisional desde el módulo Usuarios.`,
      });
      return n;
    });
    return { ok: true };
  };

  const cambiarClave = (actual: string, nueva: string): Resultado => {
    if (!usuario) return { ok: false, error: 'Sin sesión.' };
    if (usuario.clave !== actual) return { ok: false, error: 'La clave actual no coincide.' };
    if (!/^\d{5}$/.test(nueva)) return { ok: false, error: 'La nueva clave debe tener 5 dígitos numéricos.' };
    if (nueva === CLAVE_PROVISIONAL || nueva === actual) return { ok: false, error: 'La nueva clave debe ser distinta a la provisional y a la actual.' };
    setState((s) =>
      auditarCon(
        { ...s, usuarios: s.usuarios.map((u) => (u.id === usuario.id ? { ...u, clave: nueva, debeCambiarClave: false } : u)) },
        'Cambio de clave',
        `${usuario.nombre} actualizó su clave.`,
        undefined,
        usuario
      )
    );
    return { ok: true };
  };

  // ------------------------------------------------------------ Usuarios
  const actualizarUsuario = (id: string, patch: Partial<Usuario>, detalle: string) =>
    setState((s) => auditarCon({ ...s, usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ...patch } : u)) }, 'Gestión de usuarios', detalle, undefined, usuario));

  const crearUsuario = (u: Usuario) =>
    setState((s) => {
      let n: AppState = { ...s, usuarios: [...s.usuarios, u] };
      n = auditarCon(n, 'Creación de usuario', `${u.nombre} (${u.email}) creado con rol ${ROL_LABEL[u.rol]} y clave provisional.`, undefined, usuario);
      return notificarCon(n, { para: [u.email], asunto: 'Cuenta creada · Gestión de Solicitudes Tecnitrauma', cuerpo: `Su cuenta fue creada. Ingrese con la clave provisional ${CLAVE_PROVISIONAL}; el sistema le pedirá cambiarla.` });
    });

  const restablecerClave = (id: string) => {
    const clave = String(Math.floor(10000 + Math.random() * 89999));
    setState((s) => {
      const u = s.usuarios.find((x) => x.id === id);
      let n: AppState = {
        ...s,
        usuarios: s.usuarios.map((x) => (x.id === id ? { ...x, clave, debeCambiarClave: true } : x)),
        solicitudesClave: s.solicitudesClave.map((r) => (r.email === u?.email ? { ...r, atendida: true } : r)),
      };
      n = auditarCon(n, 'Restablecimiento de clave', `Se generó clave provisional para ${u?.nombre}.`, undefined, usuario);
      if (u) n = notificarCon(n, { para: [u.email], asunto: 'Clave provisional generada', cuerpo: `Su clave provisional es ${clave}. El sistema le pedirá cambiarla al ingresar.` });
      return n;
    });
    return clave;
  };

  const atenderSolicitudClave = (id: string) =>
    setState((s) => ({ ...s, solicitudesClave: s.solicitudesClave.map((r) => (r.id === id ? { ...r, atendida: true } : r)) }));

  // ------------------------------------------------------------ Tipologías
  const guardarTipologia = (t: Tipologia) =>
    setState((s) => {
      const existe = s.tipologias.some((x) => x.id === t.id);
      return auditarCon(
        { ...s, tipologias: existe ? s.tipologias.map((x) => (x.id === t.id ? t : x)) : [...s.tipologias, t] },
        existe ? 'Edición de tipología' : 'Creación de tipología',
        `${t.nombre} → ${t.area || 'Sin área fija'} (${t.email || 'sin correo fijo'})`,
        undefined,
        usuario
      );
    });

  const eliminarTipologia = (id: string) =>
    setState((s) => {
      const t = s.tipologias.find((x) => x.id === id);
      return auditarCon({ ...s, tipologias: s.tipologias.filter((x) => x.id !== id) }, 'Eliminación de tipología', t?.nombre ?? id, undefined, usuario);
    });

  const guardarConfigCorreo = (c: ConfigCorreoArea) =>
    setState((s) => {
      const existe = s.configCorreos.some((x) => x.area === c.area);
      return auditarCon(
        { ...s, configCorreos: existe ? s.configCorreos.map((x) => (x.area === c.area ? c : x)) : [...s.configCorreos, c] },
        'Configuración de correos',
        `${c.area}: líder ${c.liderEmail}; apoyo ${c.apoyo.join(', ') || '—'}; copias ${c.copias.join(', ') || '—'}`,
        undefined,
        usuario
      );
    });

  // ------------------------------------------------------------ PQRSF
  const siguienteConsecutivo = () => {
    const y = new Date().getFullYear();
    return formatearConsecutivo((state.contadores[String(y)] ?? 0) + 1, y);
  };

  const radicar: Ctx['radicar'] = (datos) => {
    const y = String(new Date().getFullYear());
    const n = (state.contadores[y] ?? 0) + 1;
    const nueva: PQRSF = { ...datos, id: uid(), consecutivo: formatearConsecutivo(n, Number(y)), actualizado: ahoraISO() };
    setState((s) => {
      let st: AppState = { ...s, pqrsf: [nueva, ...s.pqrsf], contadores: { ...s.contadores, [y]: n } };
      st = auditarCon(st, 'Radicación', `${nueva.consecutivo} radicada · ${nueva.origen} · ${nueva.canal} · ${nueva.institucion}`, nueva.id, usuario);
      st = notificarCon(
        st,
        nueva.responsableEmail
          ? {
              para: [nueva.responsableEmail, nueva.radicadoPor],
              asunto: `Nueva solicitud asignada ${nueva.consecutivo} · ${nueva.tipologia}`,
              cuerpo: `Se le asignó la solicitud ${nueva.consecutivo} (${nueva.tipologia}). Vence el ${fmtFechaHora(nueva.fechaLimite)}.`,
              pqrsfId: nueva.id,
              evento: 'Radicación',
            }
          : {
              para: [EMAIL_CALIDAD, nueva.radicadoPor],
              area: nueva.area || undefined,
              asunto: `Radicado / Pendiente Clasificación · ${nueva.consecutivo}`,
              cuerpo: `${nueva.radicadoPorNombre} radicó ${nueva.consecutivo} (${nueva.institucion})${nueva.tipologia ? ` con tipificación "${nueva.tipologia}"` : ''}. Pendiente de caracterización por Calidad y Dirección Técnica (Fase 2).`,
              pqrsfId: nueva.id,
              evento: 'Radicación',
            }
      );
      return st;
    });
    return nueva;
  };

  const actualizarPQRSF: Ctx['actualizarPQRSF'] = (id, fn, accion, detalle) =>
    setState((s) => {
      const p = s.pqrsf.find((x) => x.id === id);
      if (!p) return s;
      const actualizado = { ...fn(p), actualizado: ahoraISO() };
      let st = auditarCon({ ...s, pqrsf: s.pqrsf.map((x) => (x.id === id ? actualizado : x)) }, accion, `${p.consecutivo}: ${detalle}`, id, usuario);
      // Correo automático al radicador y al líder responsable ante cualquier cambio de estado
      if (actualizado.estadoLegal !== p.estadoLegal) {
        st = notificarCon(st, {
          para: [actualizado.radicadoPor, actualizado.responsableEmail],
          area: actualizado.area || undefined,
          asunto: `${p.consecutivo} · cambio de estado: ${p.estadoLegal} → ${actualizado.estadoLegal}`,
          cuerpo: `${accion}. ${detalle}`,
          pqrsfId: id,
          evento: 'Cambio de estado',
        });
      }
      if (actualizado.estadoAccion !== p.estadoAccion) {
        st = notificarCon(st, {
          para: [actualizado.responsableEmail, actualizado.delegadoEmail ?? ''],
          area: actualizado.area || undefined,
          asunto: `${p.consecutivo} · acción correctiva: ${p.estadoAccion} → ${actualizado.estadoAccion}`,
          cuerpo:
            actualizado.estadoAccion === 'Reingeniería autorizada'
              ? 'Gerencia autorizó la reingeniería. Inicie un nuevo Diagrama de Ishikawa (4M) y nuevos 5 Porqués, y defina nueva acción, responsable y plazo.'
              : `Ciclo de mejora actualizado: ${actualizado.estadoAccion}.`,
          pqrsfId: id,
          evento: 'Acción correctiva',
        });
      }
      return st;
    });

  const reiniciarDemo = () => {
    setState(estadoInicial());
    setSesion(null);
  };

  const value: Ctx = {
    state,
    usuario,
    now,
    login,
    logout,
    solicitarAcceso,
    olvideClave,
    cambiarClave,
    actualizarUsuario,
    crearUsuario,
    restablecerClave,
    atenderSolicitudClave,
    guardarTipologia,
    eliminarTipologia,
    guardarConfigCorreo,
    siguienteConsecutivo,
    radicar,
    actualizarPQRSF,
    notificar,
    auditar,
    reiniciarDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return c;
};
