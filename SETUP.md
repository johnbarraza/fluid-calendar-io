# Guía de Configuración Rápida - Fluid-Calendar ADHD Edition

## 📋 Prerequisitos

- Node.js 18+ instalado
- PostgreSQL 14+ (o Docker)
- Git

## 🚀 Setup Paso a Paso

### 1. Clonar y Configurar Dependencias

```bash
# Ya tienes el repo clonado, instalar dependencias
npm install
```

### 2. Configurar Base de Datos

#### Opción A: Docker (Recomendado para desarrollo)

```bash
# Iniciar PostgreSQL con Docker Compose
docker compose up db -d

# Verificar que esté corriendo
docker ps
```

La base de datos estará disponible en:
- Host: `localhost`
- Port: `5432`
- User: `fluid`
- Password: `fluid`
- Database: `fluid_calendar`

#### Opción B: PostgreSQL Local

Si ya tienes PostgreSQL instalado localmente:

```bash
# Crear la base de datos
createdb fluid_calendar

# O usando psql
psql -U postgres
CREATE DATABASE fluid_calendar;
\q
```

### 3. Configurar Variables de Entorno

```bash
# Copiar el template
cp .env.local.example .env.local

# Editar .env.local con tus valores
```

**Configuración MÍNIMA requerida** en `.env.local`:

```bash
# 1. Database
DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"

# 2. NextAuth Secret (genera uno nuevo)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# 3. URLs (para desarrollo local)
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Configurar Google OAuth (IMPORTANTE)

Para sincronización con Google Calendar/Tasks:

#### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear nuevo proyecto o seleccionar existente
3. Nombre sugerido: "Fluid Calendar ADHD"

#### Paso 2: Habilitar APIs

1. En el menú lateral: **APIs & Services** → **Library**
2. Buscar y habilitar:
   - ✅ **Google Calendar API**
   - ✅ **Google Tasks API**
   - ⚠️ **NO habilitar Google Fit API** (deprecada)

#### Paso 3: Crear Credenciales OAuth

1. **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Si es tu primera vez, configurar **OAuth consent screen**:
   - User Type: **External**
   - App name: "Fluid Calendar ADHD"
   - Support email: tu email
   - Scopes: agregar `calendar`, `calendar.events`, `tasks`
   - Test users: agregar tu email
4. Crear OAuth client ID:
   - Application type: **Web application**
   - Name: "Fluid Calendar Web"
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - Click **Create**

5. **Copiar** el Client ID y Client Secret
6. Agregar a `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="tu-client-secret"
   ```

### 5. Ejecutar Migración de Base de Datos

```bash
# Generar y aplicar migración
npx prisma migrate dev --name add_adhd_features

# Generar Prisma Client
npx prisma generate
```

Esto creará:
- 6 tablas nuevas: Habit, HabitLog, MoodEntry, PomodoroSession, ScheduleSuggestion, JournalEntry
- Campos nuevos en Task y AutoScheduleSettings

### 6. Verificar Setup

```bash
# Abrir Prisma Studio para ver la base de datos
npx prisma studio

# En otra terminal, iniciar el servidor de desarrollo
npm run dev
```

Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### 7. Crear tu Primer Usuario

1. Ir a `http://localhost:3000`
2. Click en "Sign In"
3. Autenticarse con Google (si configuraste OAuth)
4. O usar credenciales locales (si está habilitado)

## 🔧 Configuraciones Opcionales

### Microsoft Outlook (Opcional)

Si quieres sincronizar con Outlook Calendar/Tasks:

1. [Azure Portal](https://portal.azure.com/) → App registrations
2. New registration
3. Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
4. API permissions: `Calendars.ReadWrite`, `Tasks.ReadWrite`
5. Agregar a `.env.local`:
   ```bash
   AZURE_AD_CLIENT_ID="tu-azure-client-id"
   AZURE_AD_CLIENT_SECRET="tu-azure-secret"
   AZURE_AD_TENANT_ID="common"
   ```

### Email con Resend (Opcional)

Para notificaciones por email:

1. Crear cuenta en [Resend](https://resend.com/) (100 emails/día gratis)
2. Obtener API key
3. Agregar a `.env.local`:
   ```bash
   RESEND_API_KEY="re_tu_api_key"
   RESEND_FROM_EMAIL="noreply@tudominio.com"
   ```

## 🧪 Testing

### Configurar Base de Datos de Test

```bash
# Crear database de test
createdb fluid_calendar_test

# Crear .env.test
echo 'DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar_test"' > .env.test

# Ejecutar migración en DB de test
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Ejecutar Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

## 🐛 Troubleshooting

### Error: "Prisma Client did not initialize yet"

```bash
npx prisma generate
```

### Error: Database connection failed

Verifica que PostgreSQL esté corriendo:
```bash
# Si usas Docker
docker ps

# Si usas PostgreSQL local
pg_isready -h localhost -p 5432
```

### Error: Migration failed

Resetear database (⚠️ ESTO BORRA TODOS LOS DATOS):
```bash
npx prisma migrate reset
```

### Error: Google OAuth redirect URI mismatch

Verifica que en Google Cloud Console tengas exactamente:
```
http://localhost:3000/api/auth/callback/google
```

### Puerto 3000 ya en uso

```bash
# Cambiar puerto
PORT=3001 npm run dev
```

## 📚 Próximos Pasos

Una vez que tengas el setup básico funcionando:

1. ✅ Crear tu primer hábito en `/adhd/habits` (cuando esté implementado el UI)
2. ✅ Log tu primera entrada de mood en `/adhd/mood`
3. ✅ Iniciar una sesión Pomodoro en `/focus`
4. ✅ Ver sugerencias de re-agendamiento en el calendario

## 🔐 Seguridad

### ⚠️ IMPORTANTE: NO Subir Secretos a Git

El `.gitignore` ya está configurado para ignorar:
- `.env`
- `.env.local`
- `.env.*.local`
- Cualquier archivo `*.env`

Verifica antes de hacer commit:
```bash
git status

# Debe mostrar: "nothing to commit" o solo archivos que quieres subir
# NO debe mostrar .env.local
```

### Generar NEXTAUTH_SECRET Seguro

En desarrollo:
```bash
openssl rand -base64 32
```

En producción, usa el generador de tu hosting:
- **Vercel**: Variables de entorno en dashboard
- **Railway**: Variables en Settings
- **Heroku**: `heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32)`

## 📦 Estructura de Archivos de Configuración

```
fluid-calendar-io/
├── .env.example              # Template original (commitear)
├── .env.local.example        # Template detallado con guías (commitear)
├── .env.local                # TU configuración (NO commitear)
├── .env.test                 # Config de testing (NO commitear)
├── .gitignore                # Ignora todos los .env (excepto .example)
└── SETUP.md                  # Esta guía
```

## 🆘 Ayuda

Si tienes problemas:

1. Revisa los logs en la terminal donde corrió `npm run dev`
2. Revisa la consola del browser (F12)
3. Verifica que todas las APIs estén habilitadas en Google Cloud Console
4. Verifica que la base de datos esté corriendo
5. Consulta la documentación de Fluid-Calendar: [GitHub](https://github.com/dotnetfactory/fluid-calendar)

## 📖 Documentación Relacionada

- [ADHD_IMPLEMENTATION.md](ADHD_IMPLEMENTATION.md) - Detalles de implementación Fase 1
- [Plan de Implementación](.claude/plans/reactive-humming-horizon.md) - Plan completo de 28 días
- [Prisma Docs](https://www.prisma.io/docs) - Documentación de Prisma
- [Next.js Docs](https://nextjs.org/docs) - Documentación de Next.js
- [NextAuth.js Docs](https://next-auth.js.org/) - Documentación de autenticación

---

**¿Listo para empezar?** 🚀

```bash
npm install
cp .env.local.example .env.local
# Edita .env.local con tus valores
docker compose up db -d
npx prisma migrate dev --name add_adhd_features
npm run dev
```

¡Abre http://localhost:3000 y comienza a usar tu calendario ADHD-friendly!
