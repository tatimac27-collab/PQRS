import { useEffect, useState } from 'react';
import type { Vista } from './types';
import { useApp } from './context/AppContext';
import Login, { CambioClaveObligatorio } from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import RadicarPQRSF from './components/RadicarPQRSF';
import Tipologias from './components/Tipologias';
import Usuarios from './components/Usuarios';
import Auditoria from './components/Auditoria';
import MiCuenta from './components/MiCuenta';
import ConsultaPublica from './components/ConsultaPublica';
import ModeloReglas from './components/ModeloReglas';
import DetallePQRSF from './components/DetallePQRSF';
import { Toaster } from './components/ui';

export default function App() {
  const { usuario } = useApp();
  const [vista, setVista] = useState<Vista>('tablero');
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [consultaSinSesion, setConsultaSinSesion] = useState(false);

  useEffect(() => {
    if (!usuario) {
      setVista('tablero');
      setDetalleId(null);
    }
  }, [usuario]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [vista, detalleId]);

  const abrir = (id: string) => {
    setDetalleId(id);
    setVista('detalle');
  };

  if (!usuario)
    return (
      <>
        {consultaSinSesion ? <ConsultaPublica onVolver={() => setConsultaSinSesion(false)} /> : <Login onConsultaPublica={() => setConsultaSinSesion(true)} />}
        <Toaster />
      </>
    );

  if (usuario.debeCambiarClave)
    return (
      <>
        <CambioClaveObligatorio />
        <Toaster />
      </>
    );

  return (
    <div className="min-h-screen">
      <Navbar vista={vista} onVista={(v) => setVista(v)} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {vista === 'tablero' && <Dashboard onAbrir={abrir} />}
        {vista === 'radicar' && <RadicarPQRSF onAbrir={abrir} />}
        {vista === 'tipologias' && <Tipologias />}
        {vista === 'usuarios' && <Usuarios />}
        {vista === 'auditoria' && <Auditoria onAbrir={abrir} />}
        {vista === 'cuenta' && <MiCuenta />}
        {vista === 'consulta' && <ConsultaPublica />}
        {vista === 'modelo' && <ModeloReglas />}
        {vista === 'detalle' && detalleId && <DetallePQRSF id={detalleId} onVolver={() => setVista('tablero')} />}
      </main>
      <footer className="py-6 text-center text-xs text-slate-400">Tecnitrauma S.A. · Sistema de Gestión de Calidad ISO 9001 · Gestión de Solicitudes Internas y Externas</footer>
      <Toaster />
    </div>
  );
}
