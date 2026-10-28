# Gestión de Solicitudes Internas y Externas (PQRSF) · Tecnitrauma S.A.

Aplicación web y móvil (React + TypeScript + Tailwind CSS + Vite) que implementa el
Flujograma Oficial de Gestión de PQRSF del Sistema de Gestión de Calidad ISO 9001.
Toda la información se guarda en `localStorage` del navegador: no requiere backend.

## Cómo usarlo en Bolt (bolt.new)

**Opción A – Subir el proyecto**
1. Descomprima `pqrsf-tecnitrauma.zip`.
2. Súbalo a un repositorio de GitHub y en Bolt use *Import from GitHub*, **o** cree en Bolt un
   proyecto "Vite + React + TypeScript" y arrastre/pegue los archivos respetando las rutas.
3. Bolt instala las dependencias y ejecuta `npm run dev` automáticamente.

**Opción B – Copiar y pegar**
Abra `CODIGO_COMPLETO.md`: contiene cada archivo con su ruta. Cree cada archivo en Bolt con
el mismo nombre y pegue su contenido.

## Ejecutar localmente

```bash
npm install
npm run dev      # desarrollo
npm run build    # compilación de producción (tsc + vite)
```

## Acceso

- Correo institucional `@tecnitrauma.com.co` + clave numérica de 5 dígitos.
- Todas las cuentas iniciales (Listado de Líderes 2026) usan la clave provisional **12345** y el
  sistema obliga a cambiarla en el primer ingreso.
- Administrador del sistema: `coordinadorcalidad@tecnitrauma.com.co` (Coordinador de Calidad).
- Director Técnico (aprobaciones): `gerenteoperaciones@tecnitrauma.com.co`.

## Estructura

```
src/
  App.tsx                       Enrutamiento por pestañas y sesión
  main.tsx                      Punto de entrada
  types.ts                      Modelo de datos (PQRSF, ciclos de mejora, usuarios…)
  data.ts                       Líderes oficiales, catálogos, tipologías, reglas SLA, correos por área, datos de ejemplo
  context/AppContext.tsx        Estado global, persistencia, autenticación, notificaciones,
                                auditoría y REGLA: SLA vencido ⇒ QUEJA automática
  utils/helpers.ts              SLA, indicadores 40/40/20, reincidencia/falla sistémica, permisos, archivos
  components/
    ui.tsx                      Componentes base (SelectConOtro "Otro / Personalizado", badges, modales, adjuntos)
    Login.tsx                   Ingreso, solicitar acceso, olvidé mi contraseña, cambio obligatorio
    Navbar.tsx                  Barra superior con las 8 pestañas
    DashboardAnalytics.tsx      KPIs, dona de SLA, tiempos por área, reincidencia, matriz de priorización P1–P5
    Dashboard.tsx               Tablero: bandeja asignada, tabla con filtros, alertas y correos
    AccionesModales.tsx         Cerrar (con soportes), rechazar, reabrir, reasignar
    RadicarPQRSF.tsx            Fase 1 · radicación (incluye "Solicitudes Internas entre Procesos")
    Fase2Caracterizacion.tsx    Fase 2 · caracterización, SLA automático, alertas de histórico
    GestionOperativa.tsx        Fase 3 · procedencia, delegación, 5 Porqués, Ishikawa 4M, plan, dispositivos médicos
    CierreYSeguimiento.tsx      Respuesta + aprobaciones, Flujo A, validación del cierre, Ciclo B a 3 meses
    DetallePQRSF.tsx            Vista "Abrir y gestionar" con trazabilidad
    Tipologias.tsx              CRUD de tipologías + pestaña de correos
    ConfiguracionCorreos.tsx    Líder principal, correos de apoyo y copias obligatorias por área
    Usuarios.tsx                Roles, procesos, claves provisionales (solo Calidad)
    Auditoria.tsx               Bitácora con filtro y exportación CSV
    MiCuenta.tsx                Perfil y cambio de clave
    ConsultaPublica.tsx         Estado de la PQRSF para clientes (también sin sesión)
    ModeloReglas.tsx            Flujograma, reglas SLA, indicadores, roles, respaldo JSON
```

## Herramientas de demostración

- **Simular vencimiento del término** (detalle, Coordinador de Calidad): prueba la conversión automática a Queja.
- **Simular cumplimiento de 3 meses** (Flujo B): habilita la evaluación de eficacia.
- **Restablecer datos de demostración** (Modelo y reglas).

## Paso a producción

Los correos son simulados (bandeja de alertas). Para envío real y almacenamiento compartido,
reemplace `notificarCon` y la persistencia de `AppContext.tsx` por un backend (p. ej. Supabase,
que Bolt integra) y un servicio de correo transaccional.
