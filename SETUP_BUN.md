# 🚀 Setup Guide - Fluid Calendar (con Bun)

## Quick Start

### 1. Instalar Bun (Recomendado)

**Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Linux/Mac:**
```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Configurar Variables de Entorno

Los archivos con tus credenciales van en la carpeta `keys/`:

```bash
cd keys

# Copiar templates
cp database.env.template database.env
cp google-oauth.env.template google-oauth.env
cp fitbit-oauth.env.template fitbit-oauth.env

# Editar cada archivo con tus credenciales reales
```

#### Archivos a configurar:

**keys/database.env:**
```env
DATABASE_URL=postgresql://fluid:fluid@localhost:5432/fluid_calendar
```

**keys/google-oauth.env:**
```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
```

**keys/fitbit-oauth.env:**
```env
FITBIT_CLIENT_ID=tu-fitbit-client-id
FITBIT_CLIENT_SECRET=tu-fitbit-client-secret
```

**keys/.env.local:**
```env
NEXTAUTH_SECRET=genera-uno-con-openssl-rand-base64-32
```

### 3. Iniciar Base de Datos

```bash
docker compose up db -d
```

### 4. Instalar Dependencias

```bash
bun install
```

### 5. Generar Prisma Client

```bash
bun run prisma:generate
```

### 6. Iniciar Servidor

```bash
bun run dev
```

El servidor estará en: http://localhost:3000

## Resumen de los Cambios Implementados

### ✅ Carpeta `keys/` para Variables de Entorno

**Problema anterior:**
- Archivos `.env` dispersos en la raíz
- Difícil gestionar múltiples servicios
- Confusión sobre qué variables van dónde
- Windows no leía bien las variables de entorno

**Solución implementada:**
- Carpeta `keys/` centralizada
- Un archivo por servicio (database.env, google-oauth.env, fitbit-oauth.env)
- Templates `.template` versionados en git
- Archivos reales gitignored por seguridad
- Orden de carga explícito y documentado

### ✅ Migración a Bun Runtime

**Problema anterior:**
- npm/Node.js lento en Windows
- Problemas leyendo variables .env
- Builds lentos
- Hot reload tardado

**Solución implementada:**
- Bun como runtime principal (3-4x más rápido)
- Soporte nativo de múltiples `--env-file`
- Sin necesidad de libraries como dotenv
- Compatible con todo el ecosistema npm

### Estructura Final

```
fluid-calendar-io/
├── keys/                   # 🔑 NUEVO: Credenciales centralizadas
│   ├── .env               # Config base (committed)
│   ├── .env.local         # Overrides (gitignored)
│   ├── database.env       # PostgreSQL (gitignored)
│   ├── google-oauth.env   # Google (gitignored)
│   ├── fitbit-oauth.env   # Fitbit (gitignored)
│   ├── *.env.template     # Templates (committed)
│   └── README.md          # Documentación
├── src/lib/mcp/tools/
│   ├── calendar-tools.ts  # ✅ MCP Calendar
│   ├── fitbit-tools.ts    # ✅ MCP Fitbit
│   └── task-tools.ts      # ✅ MCP Tasks
└── docs/
    └── BUN_MIGRATION.md   # 📚 Guía de migración
```

## Por qué estos cambios

### Ventajas de la carpeta `keys/`:

1. **Organización**: Todo en un lugar
2. **Seguridad**: Fácil agregar todo `keys/*.env` al gitignore
3. **Templates**: Otros devs saben qué variables necesitan
4. **Separación**: Un archivo por servicio = más claro
5. **Onboarding**: Nuevos desarrolladores copian templates y llenan

### Ventajas de Bun:

1. **Performance**: 3-4x más rápido que npm
2. **DX**: Hot reload instantáneo
3. **Env Loading**: Múltiples `--env-file` nativos
4. **Compatibilidad**: 100% compatible con Node.js
5. **TypeScript**: Nativo, sin transpilación

## Obtener Credenciales

### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto → Habilitar APIs (Calendar, Tasks)
3. Credentials → OAuth 2.0 Client ID
4. Redirect URI: `http://localhost:3000/api/auth/callback/google`

### Fitbit Web API
1. [Fitbit Developers](https://dev.fitbit.com/apps)
2. Register App → Personal → Callback: `http://localhost:3000/api/fitbit/callback`
3. Scopes: activity, heartrate, sleep, profile

### NextAuth Secret
```bash
openssl rand -base64 32
```

## Comandos Disponibles

```bash
# Development
bun run dev              # Iniciar con Bun (recomendado)
npm run dev:npm          # Fallback con npm

# Database
bun run db:up            # Docker PostgreSQL
bun run prisma:studio    # GUI para DB
bun run prisma:generate  # Regenerar client

# Build
bun run build            # Compilar
bun run start            # Producción

# Quality
bun run lint             # ESLint
bun run type-check       # TypeScript
bun run format           # Prettier
```

## Documentación

- [Migración a Bun](./docs/BUN_MIGRATION.md)
- [Keys Directory](./keys/README.md)
- [MCP Documentation](./MCP_DOCUMENTATION.md)
