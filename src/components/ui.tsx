import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, FileText, ImageIcon, Paperclip, X, AlertTriangle } from 'lucide-react';
import type { Adjunto, PQRSF, Usuario } from '../types';
import { OTRO } from '../data';
import { esPdfOImagen, estaVencida, fmtTamano, horasRestantes, leerArchivos } from '../utils/helpers';

// ============================================================ Logo
export function Logo({ claro = false, size = 'md' }: { claro?: boolean; size?: 'md' | 'lg' }) {
  const s = size === 'lg' ? 'text-3xl' : 'text-xl';
  return (
    <div className="flex items-center gap-2 select-none">
      <svg viewBox="0 0 40 40" className={size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'} fill="none" stroke={claro ? '#7FB8E6' : '#2F6FB0'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="7" r="4" fill={claro ? '#7FB8E6' : '#2F6FB0'} stroke="none" />
        <path d="M22 13 L17 24 L25 28 L23 37" />
        <path d="M17 24 L9 33" />
        <path d="M21 15 L30 19 L35 15" />
        <path d="M21 15 L12 15 L7 20" />
      </svg>
      <span className={`${s} font-display font-bold tracking-tight`}>
        <span className={claro ? 'text-white' : 'text-tecni-navy'}>Tecni</span>
        <span className={claro ? 'text-sky-300' : 'text-tecni-sky'}>trauma</span>
      </span>
    </div>
  );
}

// ============================================================ Tarjetas y títulos
export function Card({ title, subtitle, children, className = '', actions }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Field({ label, required, children, hint, className = '' }: { label: string; required?: boolean; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ============================================================ Badges
const TONOS = {
  verde: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rojo: 'bg-red-50 text-red-700 ring-red-200',
  azul: 'bg-sky-50 text-sky-800 ring-sky-200',
  ambar: 'bg-amber-50 text-amber-800 ring-amber-200',
  gris: 'bg-slate-100 text-slate-600 ring-slate-200',
  morado: 'bg-violet-50 text-violet-700 ring-violet-200',
} as const;
export type Tono = keyof typeof TONOS;

export function Badge({ tono = 'gris', children, dot }: { tono?: Tono; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${TONOS[tono]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function TerminoBadge({ p, now }: { p: PQRSF; now: number }) {
  if (p.slaDetenido) {
    const aTiempo = p.fechaDetencionSLA && new Date(p.fechaDetencionSLA) <= new Date(p.fechaLimite);
    return <Badge tono={aTiempo ? 'verde' : 'rojo'} dot>SLA detenido · {aTiempo ? 'a tiempo' : 'fuera de término'}</Badge>;
  }
  const h = horasRestantes(p, now);
  if (estaVencida(p, now)) return <Badge tono="rojo" dot>¡VENCIDO! hace {Math.abs(Math.floor(h))} h</Badge>;
  if (h <= 24) return <Badge tono="ambar" dot>{Math.floor(h)} h restantes</Badge>;
  return <Badge tono="verde" dot>{Math.floor(h)} h restantes</Badge>;
}

export function EstadoBadge({ estado }: { estado: string }) {
  const tono: Tono =
    estado === 'Cerrada con respuesta' ? 'verde'
    : estado === 'Rechazada' ? 'rojo'
    : estado === 'Por validar el cierre' ? 'morado'
    : estado === 'Radicada' ? 'gris'
    : estado === 'Reabierta' ? 'ambar'
    : 'azul';
  return <Badge tono={tono}>{estado}</Badge>;
}

export function AccionBadge({ estado }: { estado: string }) {
  const tono: Tono =
    estado === 'Cerrado definitivo' ? 'verde'
    : estado === 'Plan fallido' ? 'rojo'
    : estado === 'Reingeniería autorizada' || estado === 'Pendiente aprobación' ? 'ambar'
    : estado === 'En ejecución' ? 'azul'
    : 'gris';
  return <Badge tono={tono}>{estado}</Badge>;
}

export function RiesgoBadge({ riesgo }: { riesgo: string }) {
  const tono: Tono = riesgo === 'Riesgo vital' ? 'rojo' : riesgo === 'Alto' ? 'ambar' : riesgo === 'Medio' ? 'azul' : riesgo === 'Bajo' ? 'verde' : 'gris';
  return <Badge tono={tono}>{riesgo}</Badge>;
}

export function AlertasBadges({ alertas }: { alertas: string[] }) {
  if (!alertas.length) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {alertas.map((a) => (
        <Badge key={a} tono={a === 'Falla sistémica' || a.includes('Queja') || a === 'SLA vencido' || a === 'Evento adverso' ? 'rojo' : 'ambar'}>
          {a}
        </Badge>
      ))}
    </div>
  );
}

// ============================================================ Select con "Otro / Personalizado"
type Opcion = string | { value: string; label: string };
const OTRO_VALUE = '__otro__';

/**
 * Selector estándar de la aplicación. Siempre incluye la opción "Otro / Personalizado"
 * y despliega un campo de texto libre cuando se elige.
 */
export function SelectConOtro({
  value,
  onChange,
  options,
  placeholder = 'Seleccione…',
  disabled,
  permitirOtro = true,
  otroPlaceholder = 'Escriba la opción personalizada',
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opcion[];
  placeholder?: string;
  disabled?: boolean;
  permitirOtro?: boolean;
  otroPlaceholder?: string;
}) {
  const valores = options.map((o) => (typeof o === 'string' ? o : o.value));
  const esPersonalizado = value !== '' && !valores.includes(value);
  const [otro, setOtro] = useState(esPersonalizado);

  useEffect(() => {
    if (value !== '' && !valores.includes(value)) setOtro(true);
    else if (value !== '' && valores.includes(value)) setOtro(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-2">
      <select
        className="input"
        disabled={disabled}
        value={otro ? OTRO_VALUE : value}
        onChange={(e) => {
          if (e.target.value === OTRO_VALUE) {
            setOtro(true);
            onChange('');
          } else {
            setOtro(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
        {permitirOtro && <option value={OTRO_VALUE}>{OTRO}</option>}
      </select>
      {otro && (
        <input autoFocus className="input border-teal-400 bg-teal-50/40" disabled={disabled} placeholder={otroPlaceholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/** Selector de persona: lista de usuarios + "Otro / Personalizado" (nombre y correo libres). */
export function PersonaSelect({
  usuarios,
  email,
  nombre,
  cargo = '',
  onChange,
  disabled,
  placeholder = 'Seleccione…',
}: {
  usuarios: Usuario[];
  email: string;
  nombre: string;
  cargo?: string;
  onChange: (p: { email: string; nombre: string; cargo: string }) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const enLista = usuarios.some((u) => u.email === email);
  const [otro, setOtro] = useState(!enLista && (!!email || !!nombre));
  useEffect(() => {
    if (email && usuarios.some((u) => u.email === email)) setOtro(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);
  return (
    <div className="space-y-2">
      <select
        className="input"
        disabled={disabled}
        value={otro ? OTRO_VALUE : enLista ? email : ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTRO_VALUE) {
            setOtro(true);
            onChange({ email: '', nombre: '', cargo: '' });
          } else {
            setOtro(false);
            const u = usuarios.find((x) => x.email === v);
            onChange({ email: u?.email ?? '', nombre: u?.nombre ?? '', cargo: u?.cargo ?? '' });
          }
        }}
      >
        <option value="">{placeholder}</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.email}>
            {u.nombre} · {u.cargo}
          </option>
        ))}
        <option value={OTRO_VALUE}>{OTRO}</option>
      </select>
      {otro && (
        <div className="grid gap-3 rounded-xl border border-teal-200 bg-teal-50/40 p-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-teal-900">Nombre completo *</span>
            <input className="input" placeholder="Ej.: Edinson Pantaleón" value={nombre} disabled={disabled} onChange={(e) => onChange({ email, nombre: e.target.value, cargo })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-teal-900">Cargo *</span>
            <input className="input" placeholder="Ej.: Director de Control Interno" value={cargo} disabled={disabled} onChange={(e) => onChange({ email, nombre, cargo: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-teal-900">Correo electrónico *</span>
            <input className="input" type="email" placeholder="nombre@tecnitrauma.com.co" value={email} disabled={disabled} onChange={(e) => onChange({ email: e.target.value.trim(), nombre, cargo })} />
            {email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && <span className="mt-1 block text-xs text-red-600">Escriba un correo válido, por ejemplo nombre@tecnitrauma.com.co</span>}
          </label>
        </div>
      )}
    </div>
  );
}

// ============================================================ Adjuntos
export function AdjuntosInput({
  value,
  onChange,
  usuario,
  accept = 'application/pdf,image/*',
  multiple = true,
  disabled,
  texto = 'Adjuntar PDF o imágenes',
}: {
  value: Adjunto[];
  onChange: (a: Adjunto[]) => void;
  usuario: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  texto?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <button type="button" disabled={disabled} className="btn-ghost w-full border-dashed" onClick={() => ref.current?.click()}>
        <Paperclip className="h-4 w-4" /> {texto}
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={async (e) => {
          if (!e.target.files?.length) return;
          const nuevos = await leerArchivos(e.target.files, usuario);
          onChange(multiple ? [...value, ...nuevos] : nuevos.slice(0, 1));
          e.target.value = '';
        }}
      />
      <ListaAdjuntos adjuntos={value} onRemove={disabled ? undefined : (id) => onChange(value.filter((a) => a.id !== id))} />
    </div>
  );
}

export function ListaAdjuntos({ adjuntos, onRemove }: { adjuntos: Adjunto[]; onRemove?: (id: string) => void }) {
  if (!adjuntos.length) return null;
  return (
    <ul className="space-y-1">
      {adjuntos.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
          <span className="flex min-w-0 items-center gap-2">
            {a.tipo.startsWith('image/') ? <ImageIcon className="h-4 w-4 shrink-0 text-sky-600" /> : <FileText className="h-4 w-4 shrink-0 text-red-600" />}
            {a.dataUrl ? (
              <a href={a.dataUrl} download={a.nombre} target="_blank" rel="noreferrer" className="truncate font-medium text-tecni-primary hover:underline">
                {a.nombre}
              </a>
            ) : (
              <span className="truncate font-medium">{a.nombre}</span>
            )}
            <span className="shrink-0 text-slate-400">{fmtTamano(a.tamano)}</span>
            {!esPdfOImagen(a) && <Badge tono="ambar">formato no PDF/imagen</Badge>}
          </span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(a.id)} className="text-slate-400 hover:text-red-600" aria-label="Quitar adjunto">
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// ============================================================ Modal
export function Modal({ open, onClose, title, subtitle, children, footer, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div className={`card max-h-[90vh] w-full overflow-y-auto ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// ============================================================ Mensajes
export function Aviso({ tono = 'azul', children }: { tono?: 'azul' | 'ambar' | 'rojo' | 'verde'; children: ReactNode }) {
  const cls = {
    azul: 'bg-sky-50 text-sky-900 border-sky-200',
    ambar: 'bg-amber-50 text-amber-900 border-amber-200',
    rojo: 'bg-red-50 text-red-800 border-red-200',
    verde: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  }[tono];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

// Toasts globales
export const toast = (mensaje: string, tipo: 'ok' | 'error' = 'ok') => window.dispatchEvent(new CustomEvent('app-toast', { detail: { mensaje, tipo } }));

export function Toaster() {
  const [items, setItems] = useState<{ id: number; mensaje: string; tipo: 'ok' | 'error' }[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as { mensaje: string; tipo: 'ok' | 'error' };
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { id, ...d }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4000);
    };
    window.addEventListener('app-toast', h);
    return () => window.removeEventListener('app-toast', h);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${t.tipo === 'ok' ? 'bg-tecni-navy' : 'bg-red-600'}`}>
          {t.tipo === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {t.mensaje}
        </div>
      ))}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}
