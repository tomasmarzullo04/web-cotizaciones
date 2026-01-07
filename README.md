# Cotizador de Soluciones de Datos (Data Solutions Quoter)

Aplicación web profesional para la estimación de costos y dimensionamiento de equipos en proyectos de datos. Construida con Next.js 14+, Tailwind CSS, Shadcn/ui y Prisma.

## Características

- **Diseño Enterprise Dark**: Interfaz moderna y profesional.
- **Formulario Inteligente**: 10 preguntas técnicas clave para dimensionar el proyecto.
- **Motor de Costeo**: Cálculo automático de roles y costos mensuales basado en tarifas configurables.
- **Diagramas Dinámicos**: Generación automática de arquitectura de flujo de datos con Mermaid.js.
- **Historial**: Persistencia de cotizaciones utilizando SQLite (fácilmente migrable a PostgreSQL).

## Stack Tecnológico

- **Frontend**: Next.js (App Router), Tailwind CSS, Shadcn/ui, Framer Motion.
- **Backend**: Server Actions, Prisma ORM.
- **Base de Datos**: SQLite (Dev/Local).
- **Visualización**: Mermaid.js.

## Configuración e Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar Base de Datos**:
   La base de datos SQLite ya está configurada. Si necesitas resetearla o sembrarla nuevamente:
   ```bash
   # Crear migraciones y aplicar
   npx prisma migrate dev --name init
   
   # Sembrar tarifas iniciales (Analyst, DS, BI, DE)
   npx tsx prisma/seed.ts
   ```

3. **Iniciar Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```

4. **Acceder**:
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura de Tarifas (Base)

- **Data Analyst**: $2,500 / mes
- **Data Scientist**: $5,100 / mes
- **BI Specialist**: $4,128 / mes
- **Data Engineer**: $4,950 / mes

*Base de cálculo: 160 horas mensuales.*
