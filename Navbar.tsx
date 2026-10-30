import { LogOut } from 'lucide-react';
import type { Vista } from '../types';
import { useApp } from '../context/AppContext';
import { ROL_LABEL } from '../data';
import { Logo } from './ui';

export const TABS: { id: Vista; label: string }[] = [
  { id: 'tablero', label: 'Tablero' },
  { id: 'radicar', label: 'Radicar PQRSF' },
  { id: 'tipologias', label: 'Tipologías y Correos' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'auditoria', label: 'Auditoría' },
  { id: 'cuenta', label: 'Mi cuenta' },
  { id: 'consulta', label: 'Consulta pública' },
  { id: 'modelo', label: 'Modelo y reglas ISO 9001' },
];

export default function Navbar({ vista, onVista }: { vista: Vista; onVista: (v: Vista) => void }) {
  const { usuario, logout } = useApp();
  if (!usuario) return null;
  const activa = vista === 'detalle' ? 'tablero' : vista;
  return (
    <header className="sticky top-0 z-40 bg-tecni-navy text-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Logo claro />
          <div className="hidden border-l border-white/20 pl-4 sm:block">
            <p className="font-display text-base font-bold leading-tight">Gestión de Solicitudes</p>
            <p className="text-xs text-white/80">Internas y Externas</p>
            <p className="text-xs text-white/60">Sistema de Gestión de Calidad · ISO 9001</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold">{usuario.nombre}</p>
            <p className="text-xs text-white/75">
              {usuario.cargo} · {usuario.proceso}
            </p>
            <p className="text-xs text-sky-200">{ROL_LABEL[usuario.rol]}</p>
          </div>
          <button onClick={logout} className="btn border border-white/30 bg-white/5 text-white hover:bg-white/15">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </div>
      <nav className="mx-auto mt-3 flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onVista(t.id)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-semibold transition ${
              activa === t.id ? 'border-b-2 border-teal-300 bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
