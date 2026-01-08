# Cotizador de Soluciones de Datos (Data Solutions Quoter)

Aplicación web profesional para la estimación de costos y dimensionamiento de equipos en proyectos de datos. Diseño moderno "Enterprise Dark" construido con las últimas tecnologías web.

## 🚀 Características Principales

### 💼 Panel de Gestión (Dashboard)
- **Mis Cotizaciones**: Historial personal de proyectos cotizados.
- **Detalle Interactivo**: Visualización de parámetros y costos mediante paneles laterales (Sheet).
- **Gestión de Cotizaciones**: Funcionalidad para eliminar cotizaciones con confirmación segura.

### 🛠️ Cotizador Inteligente
- **Formulario Dinámico**: 10 preguntas clave para dimensionar la infraestructura y equipo.
- **Lógica de Costeo**: Algoritmo que calcula roles (Data Engineer, Analyst, Scientist, BI) y horas necesarias.
- **Arquitectura Automática**: Generación de diagramas de flujo de datos con Mermaid.js basados en las respuestas.

### 👑 Panel Administrativo
- **Vista General**: KPIs en tiempo real (Cotizaciones Mes, Pipeline, Usuarios Activos).
- **Editor de Tarifas**: Interfaz para ajustar los costos por hora/mes de cada rol sin tocar código.
- **Trazabilidad**: Historial completo de todas las cotizaciones generadas por usuarios.

## 🏗️ Arquitectura y Herramientas

El proyecto utiliza una arquitectura moderna basada en **Next.js 16 (App Router)** para garantizar rendimiento, SEO y escalabilidad. A continuación, el detalle de las tecnologías empleadas:

### Core & Frontend
| Tecnología | Versión | Propósito en el Proyecto |
|------------|---------|--------------------------|
| **Next.js** | 16.1 | Framework principal. Renderizado híbrido (Server Actions + Componentes Cliente). |
| **React** | 19.2 | Biblioteca de UI con las últimas optimizaciones de concurrencia y servidor. |
| **Tailwind CSS** | v4.0 | Motor de estilos utility-first para un diseño rápido y consistente "Enterprise Dark". |
| **TypeScript** | 5.x | Tipado estático para garantizar la robustez del código y autocompletado inteligente. |
| **Framer Motion** | 12.x | Animaciones fluidas en transiciones de página y micro-interacciones. |

### Componentes & UI
| Librería | Uso Específico |
|----------|----------------|
| **Shadcn/ui** | Colección de componentes reutilizables basados en **Radix UI** (Dialogs, Sheets, Tabs). |
| **Lucide React** | Iconografía consistente y optimizada (SVG). |
| **Sonner** | Sistema de notificaciones (Toasts) elegante y no intrusivo. |
| **Mermaid.js** | Generación dinámica de diagramas de flujo para la arquitectura de datos. |

### Backend & Datos
| Herramienta | Función |
|-------------|---------|
| **Prisma ORM** | Capa de acceso a datos tipo-segura. Gestiona esquemas, migraciones y consultas. |
| **SQLite** | Base de datos ligera incluida para desarrollo local cero-configuración. |
| **Bcryptjs** | Hashing seguro de contraseñas para la autenticación local. |
| **Server Actions** | Mutaciones de datos directas desde el frontend, eliminando la necesidad de una API REST separada. |

### Utilidades
- **XLSX**: Exportación de reportes y trazabilidad a formato Excel.
- **Date-fns**: Manejo y formateo consistente de fechas y zonas horarias.
- **Docx / File-saver**: Generación de documentos descargables (propuestas).

## ⚡ Configuración e Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar Base de Datos**:
   La base de datos SQLite ya está configurada localmente. Para inicializarla desde cero:
   ```bash
   # Generar cliente Prisma
   npx prisma generate
   
   # Crear tablas (migraciones)
   npx prisma migrate dev --name init
   
   # Poblar base de datos (Usuarios y Tarifas por defecto)
   npx ts-node --project tsconfig.seed.json prisma/seed.ts
   ```
   *(Nota: Usamos un tsconfig especial para el seed debido a compatibilidad con módulos)*



4. **Acceder**:
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 👥 Usuarios Predeterminados

El sistema viene con usuarios pre-cargados para probar los diferentes roles:

### Administrador (Rol: ADMIN)
- **Email**: `admin@antigravity.com`
- **Password**: `admin2026`
- *Acceso completo al panel administrativo y edición de tarifas.*

### Consultor (Rol: USER)
- **Email**: `tomasmarzullo04@gmail.com`
- **Password**: `user2026`
- *Acceso estándar para generar y ver sus propias cotizaciones.*

### Usuario Demo (Rol: USER)
- **Email**: `maxhigareda@thestoreintelligence.com`
- **Password**: `max2026`
- *Usuario adicional para pruebas.*

## 💲 Estructura de Tarifas (Base)

Las tarifas pueden ser modificadas desde el Panel Admin. Valores iniciales:

- **Data Scientist**: $5,100 / mes
- **Data Engineer**: $4,950 / mes
- **BI Specialist**: $4,128 / mes
- **Data Analyst**: $2,500 / mes

*Base de cálculo: 160 horas mensuales.*
