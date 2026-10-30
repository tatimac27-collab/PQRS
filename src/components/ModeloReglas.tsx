import { useState } from 'react';
import { ArrowDown, Download, RefreshCcw, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DIAS_SEGUIMIENTO_EFICACIA, PESOS_INDICADOR, ROL_LABEL, SLA_POR_RIESGO, UMBRAL_FALLA_SISTEMICA, VENTANA_REINCIDENCIA_DIAS } from '../data';
import { esAdmin } from '../utils/helpers';
import { Card, Modal, PageHeader, toast } from './ui';
import { NIVELES_PRIORIDAD } from './DashboardAnalytics';

const Paso = ({ actor, texto, fuerte }: { actor?: string; texto: string; fuerte?: boolean }) => (
  <div className={`rounded-xl border px-4 py-3 text-sm ${fuerte ? 'border-tecni-navy bg-tecni-navy text-white' : 'border-slate-200 bg-white'}`}>
    {actor && <p className={`text-[11px] font-bold uppercase tracking-wide ${fuerte ? 'text-sky-200' : 'text-tecni-primary'}`}>{actor}</p>}
    <p className={fuerte ? 'font-semibold' : ''}>{texto}</p>
  </div>
);
const Flecha = () => (
  <div className="flex justify-center py-1 text-slate-400">
    <ArrowDown className="h-4 w-4" />
  </div>
);

export default function ModeloReglas() {
  const { state, usuario, reiniciarDemo, eliminarEjemplos } = useApp();
  const [confirmar, setConfirmar] = useState(false);
  const [confirmarEjemplos, setConfirmarEjemplos] = useState(false);
  const ejemplos = state.pqrsf.filter((p) => /^p\d+$/.test(p.id)).length;
  if (!usuario) return null;

  const exportar = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_pqrsf_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Modelo y reglas ISO 9001" subtitle="Flujograma oficial de Gestión de PQRSF de Tecnitrauma S.A. y reglas de negocio implementadas." />

      <Card title="Flujograma · Gestión de PQRSF" subtitle="Registro, clasificación, gestión, respuesta y seguimiento de acciones">
        <div className="mx-auto max-w-3xl">
          <Paso texto="INICIO – RECEPCIÓN DE PQRSF" fuerte />
          <Flecha />
          <Paso actor="Registrador de solicitudes" texto="Registra fecha, consecutivo automático, origen, canal, descripción y evidencias." />
          <Flecha />
          <Paso texto="FASE 2 – CARACTERIZACIÓN Y CLASIFICACIÓN TÉCNICA" fuerte />
          <Flecha />
          <Paso actor="Coordinador de Calidad + Director Técnico / Líder" texto="Completa tipo de trámite, tipo de PQRSF, clasificación de riesgo, tipología, contexto institucional y área responsable." />
          <Flecha />
          <Paso actor="Sistema" texto="Calcula automáticamente el SLA y la fecha/hora límite de respuesta." />
          <Flecha />
          <Paso actor="Sistema" texto="Consulta reincidencia y falla sistémica en el histórico y genera alertas." />
          <Flecha />
          <Paso texto="FASE 3 – ENRUTAMIENTO Y GESTIÓN OPERATIVA" fuerte />
          <Flecha />
          <Paso actor="Asignación al responsable del área" texto="Notificación automática al responsable con copia a Dirección Técnica." />
          <Flecha />
          <Paso actor="Validación de procedencia" texto="¿El requerimiento es procedente?" />
          <Flecha />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 rounded-2xl bg-red-50 p-3">
              <Paso actor="Camino A" texto="NO PROCEDENTE – Calidad proyecta la respuesta con la justificación." />
              <Flecha />
              <Paso actor="Aprobación obligatoria" texto="Gerencia involucrada + Dirección Técnica." />
              <Flecha />
              <Paso actor="Una vez aprobada" texto="Calidad envía la respuesta y carga el soporte. FIN." />
            </div>
            <div className="space-y-1 rounded-2xl bg-emerald-50 p-3">
              <Paso actor="Camino B" texto="PROCEDENTE – El responsable investiga; análisis de causa raíz (5 Porqués + Ishikawa 4M)." />
              <Flecha />
              <Paso actor="Plan de acción" texto="Corrección inmediata, acción correctiva de fondo, responsable, fecha límite, indicador." />
              <Flecha />
              <Paso actor="Si es dispositivo médico" texto="Descripción, referencia, lote, cantidad, género; evento adverso y reportes." />
            </div>
          </div>
          <Flecha />
          <Paso texto="RESPUESTA AL CLIENTE – REQUISITO TRANSVERSAL (FLUJO A)" fuerte />
          <Flecha />
          <Paso actor="Coordinación de Calidad" texto="Proyecta la respuesta final → aprobación obligatoria de Gerencia y Dirección Técnica → envía, carga PDF, fecha real y medio." />
          <Flecha />
          <Paso actor="PQRSF cerrada con respuesta" texto="Se detiene el contador del SLA → validación del cierre por radicador / destinatario (visto bueno o reapertura)." />
          <Flecha />
          <Paso texto="CICLO B – SEGUIMIENTO Y CIERRE DE LA ACCIÓN CORRECTIVA" fuerte />
          <Flecha />
          <Paso actor="Responsable del proceso" texto="Ejecuta las acciones y adjunta evidencias de implementación." />
          <Flecha />
          <Paso actor="A los 3 meses · Líder de área" texto="¿La acción fue eficaz? SÍ → CERRADO DEFINITIVO. NO → PLAN FALLIDO → Gerencia autoriza reingeniería → nuevo Ishikawa + 5 Porqués → nueva acción, responsable y plazo → nuevo ciclo de 3 meses." />
          <Flecha />
          <Paso texto="FIN – PQRSF CERRADA Y, CUANDO APLIQUE, ACCIÓN CORRECTIVA CERRADA DEFINITIVAMENTE" fuerte />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Reglas de SLA">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Clasificación de riesgo</th>
                <th className="th">Término</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(SLA_POR_RIESGO).map(([r, h]) => (
                <tr key={r}>
                  <td className="td">{r}</td>
                  <td className="td">{h} horas ({(h / 24).toFixed(0)} días)</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Término = mínimo entre el término por riesgo y el máximo legal del trámite (15 días = 360 h), contado desde la fecha/hora de recepción.</li>
            <li>Riesgos personalizados ("Otro / Personalizado") exigen indicar las horas de SLA.</li>
            <li>El SLA se detiene al <b>Cerrar con respuesta</b> (Flujo A), al cerrar una solicitud interna con soportes o al rechazarla; se reanuda si se reabre.</li>
            <li className="font-semibold text-red-700">Toda solicitud no cerrada dentro del término se convierte automáticamente en QUEJA y se alerta a Calidad y Gerencias.</li>
          </ul>
        </Card>

        <Card title="Indicadores y alertas">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              <b>Indicador ponderado (Matriz 40/40/20)</b> = {PESOS_INDICADOR.terminos * 100}% Oportunidad (cumplimiento de términos) + {PESOS_INDICADOR.eficacia * 100}% Eficacia de acciones correctivas (Ciclo B) + {PESOS_INDICADOR.validacion * 100}% Satisfacción (cierres validados sin reapertura).
            </li>
            <li><b>Cumplimiento de términos</b> = cerradas a tiempo ÷ (cerradas + vencidas abiertas).</li>
            <li><b>Reincidencia</b>: misma institución y misma tipología en los últimos {VENTANA_REINCIDENCIA_DIAS} días.</li>
            <li><b>Falla sistémica</b>: {UMBRAL_FALLA_SISTEMICA} o más casos de la misma tipología en {VENTANA_REINCIDENCIA_DIAS} días (cualquier institución).</li>
            <li><b>Eficacia</b>: se evalúa a los {DIAS_SEGUIMIENTO_EFICACIA} días de aprobado el plan.</li>
            <li>Evento adverso con dispositivo médico exige reporte a Tecnovigilancia y Seguridad del Paciente.</li>
          </ul>
          <p className="label mt-4">Matriz de priorización</p>
          <ol className="space-y-1 text-sm">
            {NIVELES_PRIORIDAD.map((n) => (
              <li key={n.n}>
                <b>P{n.n}</b> · {n.titulo} <span className="text-slate-500">({n.desc})</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Roles y permisos">
          <ul className="space-y-2 text-sm">
            <li><b>{ROL_LABEL.ADMIN_CALIDAD}</b>: todo el sistema; caracteriza, reasigna, reabre, proyecta respuestas, cierre legal, tipologías, correos y usuarios.</li>
            <li><b>{ROL_LABEL.DIRECTOR_TECNICO}</b>: caracterización técnica, aprobación DT de respuestas, aprobación gerencial de planes y reingenierías.</li>
            <li><b>{ROL_LABEL.GERENCIA}</b>: aprobación de respuestas y planes, autorización de reingeniería; consulta total.</li>
            <li><b>{ROL_LABEL.LIDER_PROCESO}</b>: gestiona las solicitudes de su proceso, procedencia, delegación, causa raíz, plan, evaluación de eficacia.</li>
            <li><b>{ROL_LABEL.GESTOR}</b>: ejecuta lo delegado; cierra o rechaza con soportes.</li>
            <li><b>{ROL_LABEL.REGISTRADOR}</b>: radica y valida el cierre de lo que radicó (perfil por defecto de cuentas nuevas).</li>
          </ul>
        </Card>

        <Card title="Notificaciones automáticas (simulación de correo)">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Radicación → responsable del área / Calidad: "Radicado / Pendiente Clasificación".</li>
            <li>Caracterización → responsable, líder principal y correos de apoyo del área.</li>
            <li>Cambio de estado → radicador y líder responsable.</li>
            <li>Vencimiento → Calidad y Gerencias (conversión a Queja).</li>
            <li>Acción correctiva / reingeniería → inicio de Ishikawa y 5 Porqués.</li>
            <li>Siempre con copia a Dirección Técnica y a las copias obligatorias configuradas por área.</li>
          </ul>
        </Card>
      </div>

      <Card title="Datos de la aplicación" subtitle="La información se guarda en el almacenamiento local del navegador (localStorage).">
        <div className="flex flex-wrap gap-2">
          <button className="btn-soft" onClick={exportar}>
            <Download className="h-4 w-4" /> Exportar respaldo JSON
          </button>
          {esAdmin(usuario) && ejemplos > 0 && (
            <button className="btn-ghost" onClick={() => setConfirmarEjemplos(true)}>
              <Trash2 className="h-4 w-4" /> Eliminar solicitudes de ejemplo ({ejemplos})
            </button>
          )}
          {esAdmin(usuario) && (
            <button className="btn-danger" onClick={() => setConfirmar(true)}>
              <RefreshCcw className="h-4 w-4" /> Restablecer datos de demostración
            </button>
          )}
        </div>
      </Card>

      <Modal
        open={confirmarEjemplos}
        onClose={() => setConfirmarEjemplos(false)}
        title="Eliminar solicitudes de ejemplo"
        footer={
          <>
            <button className="btn-soft" onClick={() => setConfirmarEjemplos(false)}>Cancelar</button>
            <button
              className="btn-danger"
              onClick={() => {
                const n = eliminarEjemplos();
                toast(`Se eliminaron ${n} solicitudes de ejemplo.`);
                setConfirmarEjemplos(false);
              }}
            >
              Eliminar ejemplos
            </button>
          </>
        }
      >
        <p className="text-sm">
          Se borrarán las {ejemplos} solicitudes de demostración (PQR001 a PQR006) con sus alertas e historial. Se conservan los usuarios, las tipologías, la configuración de correos y las solicitudes que ustedes hayan radicado.
        </p>
      </Modal>

      <Modal
        open={confirmar}
        onClose={() => setConfirmar(false)}
        title="Restablecer datos"
        footer={
          <>
            <button className="btn-soft" onClick={() => setConfirmar(false)}>Cancelar</button>
            <button className="btn-danger" onClick={reiniciarDemo}>Restablecer</button>
          </>
        }
      >
        <p className="text-sm">Se borrarán todas las solicitudes, usuarios creados y auditoría, y se cargarán los datos iniciales. Se cerrará la sesión.</p>
      </Modal>
    </div>
  );
}
