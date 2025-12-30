# 📋 Checklist de Configuración - Fluid-Calendar ADHD Edition

## ✅ Configuraciones Requeridas (MÍNIMO para funcionar)

### 1. Base de Datos PostgreSQL
- [ ] PostgreSQL instalado y corriendo
  - Opción A: `docker compose up db -d`
  - Opción B: PostgreSQL local en puerto 5432
- [ ] Variable `DATABASE_URL` en `.env.local`
  ```bash
  DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"
  ```

### 2. NextAuth Secret
- [ ] Variable `NEXTAUTH_SECRET` generada
  ```bash
  # Generar con:
  openssl rand -base64 32

  # Agregar a .env.local:
  NEXTAUTH_SECRET="tu-secret-de-32-caracteres-minimo"
  ```

### 3. Google OAuth (para sync de Calendar/Tasks)
- [ ] Proyecto creado en [Google Cloud Console](https://console.cloud.google.com/)
- [ ] APIs habilitadas:
  - [ ] Google Calendar API
  - [ ] Google Tasks API
- [ ] OAuth Client ID creado (tipo: Web Application)
- [ ] Redirect URI configurado:
  ```
  http://localhost:3000/api/auth/callback/google
  ```
- [ ] Variables en `.env.local`:
  ```bash
  GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET="xxx"
  ```

### 4. URLs de la Aplicación
- [ ] Variables en `.env.local`:
  ```bash
  NEXTAUTH_URL="http://localhost:3000"
  NEXT_PUBLIC_APP_URL="http://localhost:3000"
  NEXT_PUBLIC_SITE_URL="http://localhost:3000"
  ```

---

## ⭕ Configuraciones Opcionales

### Email (Resend)
Necesario para: Notificaciones por email, recordatorios de hábitos

- [ ] Cuenta creada en [Resend](https://resend.com/)
- [ ] API Key obtenida
- [ ] Variables en `.env.local`:
  ```bash
  RESEND_API_KEY="re_xxx"
  RESEND_FROM_EMAIL="noreply@tudominio.com"
  ```

### Microsoft Outlook
Necesario para: Sync con Outlook Calendar/Tasks

- [ ] App registrada en [Azure Portal](https://portal.azure.com/)
- [ ] API permissions: `Calendars.ReadWrite`, `Tasks.ReadWrite`
- [ ] Variables en `.env.local`:
  ```bash
  AZURE_AD_CLIENT_ID="xxx"
  AZURE_AD_CLIENT_SECRET="xxx"
  AZURE_AD_TENANT_ID="common"
  ```

---

## ⏸️ Configuraciones para Fase 2 (NO necesarias ahora)

### Fitbit (Wearables)
Para: Tracking de sueño, energía, actividad física

- [ ] App creada en [Fitbit Dev Console](https://dev.fitbit.com/apps)
- [ ] Variables en `.env.local`:
  ```bash
  FITBIT_CLIENT_ID="xxx"
  FITBIT_CLIENT_SECRET="xxx"
  ```

### OpenAI/Groq (LLM)
Para: Insights avanzados con IA, recomendaciones personalizadas

- [ ] API Key de [OpenAI](https://platform.openai.com/api-keys)
  ```bash
  OPENAI_API_KEY="sk-xxx"
  ```

  O alternativamente:

- [ ] API Key de [Groq](https://console.groq.com/keys) (más rápido/barato)
  ```bash
  GROQ_API_KEY="gsk_xxx"
  ```

---

## 🔍 Verificación Rápida

### Check 1: Archivos de Configuración
```bash
# Verificar que existen
ls -la .env.local       # ✓ Debe existir
cat .env.local | grep DATABASE_URL    # ✓ Debe tener valor
cat .env.local | grep NEXTAUTH_SECRET # ✓ Debe tener valor
cat .env.local | grep GOOGLE_CLIENT   # ✓ Debe tener valores
```

### Check 2: Base de Datos
```bash
# Si usas Docker
docker ps | grep postgres    # ✓ Debe mostrar container corriendo

# Si usas PostgreSQL local
pg_isready -h localhost -p 5432    # ✓ Debe decir "accepting connections"

# Test de conexión
npx prisma db execute --stdin <<< "SELECT 1;"    # ✓ Debe ejecutar sin error
```

### Check 3: Migración de Database
```bash
npx prisma migrate status    # ✓ Debe mostrar "Database schema is up to date"
```

### Check 4: Prisma Client
```bash
ls -la node_modules/.prisma/client    # ✓ Directorio debe existir
```

### Check 5: Servidor de Desarrollo
```bash
npm run dev    # ✓ Debe iniciar en http://localhost:3000
```

---

## 🚨 Troubleshooting

### ❌ Error: "Environment variable not found: DATABASE_URL"
**Solución**: Asegúrate de que `.env.local` existe y tiene `DATABASE_URL`

### ❌ Error: "Can't reach database server at localhost:5432"
**Solución**:
- Si usas Docker: `docker compose up db -d`
- Si usas PostgreSQL local: verificar que esté corriendo

### ❌ Error: "Invalid `prisma.xxx()` invocation"
**Solución**: Regenerar Prisma Client
```bash
npx prisma generate
```

### ❌ Error: "redirect_uri_mismatch" en Google OAuth
**Solución**: Verificar que en Google Cloud Console tengas exactamente:
```
http://localhost:3000/api/auth/callback/google
```
(sin trailing slash, con http en desarrollo)

### ❌ Error: "Migration failed"
**Solución**: Resetear database (⚠️ borra datos)
```bash
npx prisma migrate reset
```

---

## 📊 Estado de tu Configuración

Marca lo que ya tienes configurado:

**Esenciales** (sin estos, la app no funciona):
- [ ] Database URL
- [ ] NextAuth Secret
- [ ] Google Client ID/Secret
- [ ] Migración ejecutada
- [ ] Prisma Client generado

**Opcionales Fase 1**:
- [ ] Resend (email)
- [ ] Azure AD (Outlook)

**Fase 2** (implementar después):
- [ ] Fitbit
- [ ] OpenAI/Groq

---

## 🎯 Configuración Mínima Viable

Para empezar a desarrollar, necesitas SOLO esto en `.env.local`:

```bash
# 🔥 CONFIGURACIÓN MÍNIMA - COPIAR ESTO
DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Reemplazar con un secret real

# AGREGAR TUS CREDENCIALES DE GOOGLE:
GOOGLE_CLIENT_ID="TU_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="TU_CLIENT_SECRET"
```

Con esto + `docker compose up db -d` + `npx prisma migrate dev` ya puedes correr la app.

---

## 📝 Template Rápido de .env.local

```bash
# Copiar este template a .env.local y rellenar los valores

# === REQUERIDO ===
DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXTAUTH_SECRET=""  # openssl rand -base64 32

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# === OPCIONAL ===
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""

AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID="common"

# === FASE 2 ===
FITBIT_CLIENT_ID=""
FITBIT_CLIENT_SECRET=""
OPENAI_API_KEY=""
GROQ_API_KEY=""
```

---

## ✅ Lista de Comandos para Setup Completo

```bash
# 1. Copiar template
cp .env.local.example .env.local

# 2. Editar .env.local y agregar tus valores
nano .env.local  # o vim, code, etc.

# 3. Iniciar PostgreSQL
docker compose up db -d

# 4. Instalar dependencias
npm install

# 5. Ejecutar migración
npx prisma migrate dev --name add_adhd_features

# 6. Generar Prisma Client
npx prisma generate

# 7. Verificar conexión
npx prisma studio  # Abrir en browser para ver DB

# 8. Iniciar app
npm run dev

# 9. Abrir en browser
# http://localhost:3000
```

---

**¿Todo listo?** ✓ Marca todos los checks y procede a `npm run dev` 🚀
