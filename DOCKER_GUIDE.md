# 🐳 Docker Compose Guide - Fluid Calendar

Esta guía explica cómo usar Docker Compose para ejecutar Fluid Calendar con todas las funcionalidades ADHD.

## 📋 Requisitos Previos

1. **Docker Desktop** instalado y corriendo
   - Windows: [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)
   - Verificar instalación: `docker --version` y `docker compose version`

2. **Archivo `.env` configurado** (ver `.env.example`)

---

## 🚀 Opción 1: Desarrollo Local (Recomendado para ti)

Esta opción construye tu código local, incluyendo todas las funcionalidades ADHD que acabamos de implementar.

### Paso 1: Configurar Variables de Entorno

Crea/edita el archivo `.env` en la raíz del proyecto:

```env
# Database
DATABASE_URL="postgresql://fluid:fluid@db:5432/fluid_calendar"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-aqui-genera-uno-random"

# Google OAuth (opcional para testing)
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# Otros (opcional)
NEXT_PUBLIC_ENABLE_SAAS_FEATURES="false"
```

**Generar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Paso 2: Iniciar los Servicios

```bash
# Construir e iniciar en segundo plano
docker compose -f docker-compose.dev.yml up -d --build

# Ver logs en tiempo real
docker compose -f docker-compose.dev.yml logs -f

# Ver solo logs de la app
docker compose -f docker-compose.dev.yml logs -f app

# Ver solo logs de la base de datos
docker compose -f docker-compose.dev.yml logs -f db
```

### Paso 3: Verificar que Todo Está Funcionando

1. **Aplicación Next.js**: http://localhost:3000
2. **Test ADHD API**: http://localhost:3000/test-adhd.html
3. **PostgreSQL**: localhost:5432 (usuario: `fluid`, password: `fluid`)

### Paso 4: Conectar con Prisma Studio (Opcional)

```bash
# Abrir Prisma Studio para ver/editar la base de datos
docker compose -f docker-compose.dev.yml exec app npx prisma studio
```

Esto abrirá Prisma Studio en http://localhost:5555

### Paso 5: Ejecutar Migraciones Manualmente (Si es necesario)

```bash
# Generar Prisma Client
docker compose -f docker-compose.dev.yml exec app npx prisma generate

# Ejecutar migraciones
docker compose -f docker-compose.dev.yml exec app npx prisma migrate deploy

# Crear nueva migración (para cambios futuros)
docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev --name nombre_migracion
```

### Paso 6: Detener los Servicios

```bash
# Detener sin borrar datos
docker compose -f docker-compose.dev.yml down

# Detener y borrar TODO (incluyendo base de datos)
docker compose -f docker-compose.dev.yml down -v

# Reconstruir desde cero
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --build
```

---

## 🏭 Opción 2: Producción (Imagen Pre-construida)

Esta opción usa la imagen publicada en Docker Hub (NO incluye las funcionalidades ADHD nuevas).

```bash
# Iniciar servicios de producción
docker compose up -d

# Ver logs
docker compose logs -f

# Detener
docker compose down
```

---

## 🛠️ Comandos Útiles

### Ver Estado de los Contenedores
```bash
docker compose -f docker-compose.dev.yml ps
```

### Entrar al Contenedor de la App
```bash
docker compose -f docker-compose.dev.yml exec app sh
```

### Entrar al Contenedor de PostgreSQL
```bash
docker compose -f docker-compose.dev.yml exec db psql -U fluid -d fluid_calendar
```

### Limpiar Todo (Reset Completo)
```bash
# Detener y eliminar contenedores, redes, volúmenes, imágenes
docker compose -f docker-compose.dev.yml down -v --rmi all

# Limpiar sistema Docker completo (cuidado!)
docker system prune -a --volumes
```

### Ver Uso de Recursos
```bash
docker stats
```

---

## 🐛 Troubleshooting

### Problema: "Port 5432 is already in use"

**Causa**: Ya tienes PostgreSQL corriendo localmente.

**Solución 1** - Detener PostgreSQL local:
```bash
# Windows (PowerShell como Admin)
Stop-Service postgresql-x64-16

# O cambiar el puerto en docker-compose.dev.yml
ports:
  - "5433:5432"  # Usar puerto 5433 en tu máquina
```

**Solución 2** - Usar PostgreSQL local en lugar de Docker:
```env
# En .env, cambiar DATABASE_URL a:
DATABASE_URL="postgresql://postgres:password@localhost:5432/fluid_calendar"
```

### Problema: "Port 3000 is already in use"

**Causa**: Ya tienes Next.js corriendo localmente.

**Solución**:
```bash
# Detener el servidor local primero
# Ctrl+C en la terminal donde corre npm run dev

# O cambiar el puerto en docker-compose.dev.yml
ports:
  - "3001:3000"  # Acceder en http://localhost:3001
```

### Problema: Cambios en el Código No Se Reflejan

**Causa**: Caché de Docker o volúmenes viejos.

**Solución**:
```bash
# Reconstruir sin caché
docker compose -f docker-compose.dev.yml build --no-cache

# Reiniciar servicios
docker compose -f docker-compose.dev.yml up -d
```

### Problema: "Module not found" o Errores de Dependencias

**Causa**: node_modules desactualizado en el contenedor.

**Solución**:
```bash
# Reinstalar dependencias dentro del contenedor
docker compose -f docker-compose.dev.yml exec app npm install --legacy-peer-deps

# O reconstruir imagen completa
docker compose -f docker-compose.dev.yml build --no-cache app
```

### Problema: Migraciones de Prisma Fallan

**Causa**: Base de datos no está lista o schema incorrecto.

**Solución**:
```bash
# Verificar que PostgreSQL está corriendo
docker compose -f docker-compose.dev.yml ps db

# Ver logs de la base de datos
docker compose -f docker-compose.dev.yml logs db

# Resetear base de datos (CUIDADO: borra todo)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d db
# Esperar 10 segundos
docker compose -f docker-compose.dev.yml up -d app
```

---

## 📊 Monitoreo y Logs

### Ver Logs de Errores Únicamente
```bash
docker compose -f docker-compose.dev.yml logs --tail=100 | grep -i error
```

### Seguir Logs de un Servicio Específico
```bash
# App logs
docker compose -f docker-compose.dev.yml logs -f --tail=50 app

# Database logs
docker compose -f docker-compose.dev.yml logs -f --tail=50 db
```

### Exportar Logs a Archivo
```bash
docker compose -f docker-compose.dev.yml logs > docker-logs.txt
```

---

## 🔐 Seguridad

### Cambiar Credenciales de PostgreSQL

En `docker-compose.dev.yml`, modifica:

```yaml
db:
  environment:
    - POSTGRES_USER=mi_usuario
    - POSTGRES_PASSWORD=mi_password_seguro
    - POSTGRES_DB=mi_base_datos
```

Y actualiza `.env`:
```env
DATABASE_URL="postgresql://mi_usuario:mi_password_seguro@db:5432/mi_base_datos"
```

### Usar Docker Secrets (Producción)

Para entornos de producción, usa Docker Secrets en lugar de variables de entorno:

```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  db:
    secrets:
      - db_password
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
```

---

## 📦 Backup y Restore

### Crear Backup de la Base de Datos

```bash
# Crear backup
docker compose -f docker-compose.dev.yml exec db pg_dump -U fluid fluid_calendar > backup.sql

# Con timestamp
docker compose -f docker-compose.dev.yml exec db pg_dump -U fluid fluid_calendar > "backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Restaurar Backup

```bash
# Restaurar desde backup
docker compose -f docker-compose.dev.yml exec -T db psql -U fluid fluid_calendar < backup.sql
```

### Backup del Volumen de Datos

```bash
# Crear backup del volumen completo
docker run --rm -v fluid-calendar-io_postgres_dev_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restaurar volumen
docker run --rm -v fluid-calendar-io_postgres_dev_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

---

## 🚀 Optimizaciones para Desarrollo

### Hot Reload Más Rápido

En `docker-compose.dev.yml`, ya está configurado el volume mounting para hot reload:

```yaml
volumes:
  - .:/app
  - /app/node_modules
  - /app/.next
```

Esto hace que los cambios en tu código se reflejen inmediatamente sin reconstruir la imagen.

### Usar Turbopack (Experimental)

Si quieres usar Turbopack en Docker:

```yaml
# En docker-compose.dev.yml
command: npm run dev -- --turbo
```

---

## 📝 Notas Importantes

1. **No commitear `.env`**: Asegúrate de que `.env` esté en `.gitignore`
2. **Docker Desktop debe estar corriendo**: Antes de cualquier comando de Docker
3. **Permisos en Linux/Mac**: Si tienes problemas de permisos, ejecuta con `sudo`
4. **Windows**: Usa PowerShell o Git Bash, no CMD
5. **Hot Reload**: Los cambios en el código se reflejan automáticamente
6. **Primera vez**: La construcción inicial puede tomar 5-10 minutos
7. **Base de datos**: Los datos persisten entre reinicios en el volumen `postgres_dev_data`

---

## 🎯 Workflow Recomendado para Desarrollo

```bash
# 1. Iniciar servicios (primera vez del día)
docker compose -f docker-compose.dev.yml up -d

# 2. Ver logs mientras desarrollas
docker compose -f docker-compose.dev.yml logs -f app

# 3. Hacer cambios en el código
# (Los cambios se reflejan automáticamente gracias a hot reload)

# 4. Si cambias el schema de Prisma
docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev --name mi_cambio

# 5. Si agregas nuevas dependencias
docker compose -f docker-compose.dev.yml exec app npm install --legacy-peer-deps nueva-dependencia
# O reconstruir imagen
docker compose -f docker-compose.dev.yml build app

# 6. Al terminar el día (opcional)
docker compose -f docker-compose.dev.yml down
```

---

## 🌐 Acceso desde Otros Dispositivos en la Red

Para acceder desde otros dispositivos en tu red local:

```yaml
# En docker-compose.dev.yml, cambiar:
ports:
  - "0.0.0.0:3000:3000"  # Permitir acceso externo

# Y en .env:
NEXTAUTH_URL="http://TU_IP_LOCAL:3000"
```

Ejemplo: `http://192.168.1.100:3000`

---

**¿Preguntas o problemas?** Revisa la sección de Troubleshooting o abre un issue en GitHub.
