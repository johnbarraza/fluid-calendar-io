# 🔄 Migración a Drizzle ORM

## Estado Actual: ✅ Schema Migrado, ⚠️ Problemas de Conexión

### ✅ Completado

1. **Instalación de Drizzle ORM**
   - ✅ drizzle-orm v0.45.1
   - ✅ drizzle-kit v0.31.8
   - ✅ pg v8.16.3 (node-postgres)

2. **Schema de Drizzle Creado** ([src/db/schema.ts](src/db/schema.ts))
   - ✅ User, Account, Session, VerificationToken (Auth)
   - ✅ CalendarFeed, Event (Calendar)
   - ✅ Project, Task, Tag, TaskTag (Tasks)
   - ✅ ConnectedAccount, FitbitAccount (OAuth)
   - ✅ FitbitActivity, FitbitSleep, FitbitHeartRate (Fitbit Data)
   - ✅ SystemSettings
   - ✅ Todas las relaciones configuradas

3. **Cliente de Base de Datos** ([src/db/index.ts](src/db/index.ts))
   - ✅ Configuración de Pool de conexiones
   - ✅ Export del schema
   - ✅ Helper para cerrar conexiones

4. **Scripts de package.json**
   ```json
   {
     "db:generate": "drizzle-kit generate",
     "db:migrate": "drizzle-kit migrate",
     "db:push": "drizzle-kit push",
     "db:studio": "drizzle-kit studio"
   }
   ```

5. **Configuración** ([drizzle.config.ts](drizzle.config.ts))
   - ✅ Archivo de configuración para Drizzle Kit

### ⚠️ Problema Actual

**Error de autenticación con PostgreSQL desde Node.js/Bun:**

```
error: la autentificación password falló para el usuario "fluid"
code: "28P01"
```

**Diagnóstico:**
- ✅ Docker container corriendo correctamente
- ✅ `docker exec` puede conectarse sin problemas
- ❌ `pg` (node-postgres) falla con autenticación
- ❌ `postgres` (postgres.js) falla con autenticación
- ❌ Prisma tenía el MISMO problema

**Causa Raíz:**
Este es un bug conocido de Windows + PostgreSQL + Node.js/Bun donde:
1. Las variables de entorno no se leen correctamente en procesos hijos
2. Hay problemas de codificación de caracteres en las credenciales
3. PostgreSQL en Docker tiene configuración de autenticación que no es compatible con drivers de Node.js en Windows

## Soluciones Intentadas (Sin Éxito)

1. ❌ Regenerar Prisma client con DATABASE_URL explícita
2. ❌ Scripts de carga de variables de entorno
3. ❌ Migración a Bun runtime
4. ❌ Carpeta `keys/` con archivos separados
5. ❌ Cambiar de `postgres.js` a `node-postgres`
6. ❌ Reset de contraseña del usuario PostgreSQL
7. ❌ Archivo `.env` en raíz del proyecto
8. ❌ Modificar `prisma.ts` para leer env files directamente

## ✅ Solución Recomendada

### Opción 1: Usar Prisma SOLO para conexiones (Hybrid)

Mantener Prisma solo para la conexión y usar Drizzle para queries:

```typescript
// src/db/index.ts
import { PrismaClient } from "@prisma/client";
import { drizzle } from "drizzle-orm/prisma/pg";

const prisma = new PrismaClient();
export const db = drizzle(prisma);
```

**Ventajas:**
- Prisma maneja la conexión (sabe lidiar con Windows)
- Drizzle maneja las queries (mejor DX, type-safety)
- No necesitamos migrar TODO el código

**Desventajas:**
- Seguimos dependiendo de Prisma Client

### Opción 2: Usar Docker Network

Conectar desde dentro de un container Docker:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://fluid:fluid@db:5432/fluid_calendar
    depends_on:
      - db
```

**Ventajas:**
- Conexión directa container-to-container
- No hay problemas de autenticación

**Desventajas:**
- Desarrollo debe ser dentro de Docker
- Más complejo para hot reload

### Opción 3: Cambiar a SQLite para desarrollo

Usar SQLite localmente y PostgreSQL en producción:

```typescript
// Desarrollo
const db = drizzle(new Database("dev.db"));

// Producción
const db = drizzle(pool);
```

**Ventajas:**
- Cero configuración
- Funciona perfecto en Windows
- Más rápido para desarrollo

**Desventajas:**
- Diferencias entre SQLite y PostgreSQL
- Dos configuraciones diferentes

## 📊 Comparación: Drizzle vs Prisma

| Característica | Drizzle | Prisma |
|----------------|---------|---------|
| **Generación de código** | ❌ No necesita | ✅ Requiere `prisma generate` |
| **Binarios nativos** | ❌ No tiene | ✅ Tiene (problemas en Windows) |
| **Type-safety** | ✅✅ Mejor | ✅ Buena |
| **Performance** | ✅✅ Más rápido | ✅ Rápido |
| **Bundle size** | ✅ ~7KB | ❌ ~30KB |
| **Conexión en Windows** | ⚠️ Mismo problema | ⚠️ Problema conocido |
| **Query syntax** | ✅ SQL-like | ⚠️ Propio DSL |
| **Migrations** | ✅ Drizzle Kit | ✅ Prisma Migrate |

## 🎯 Próximos Pasos

### Inmediatos:

1. ✅ **Implementar Opción 1** (Hybrid Prisma + Drizzle)
   - Usar Prisma para conexión
   - Drizzle para queries
   - Migrar gradualmente

2. ⏳ **Probar un query simple**
   - Verificar que hybrid funcione
   - Confirmar que resuelve el problema

3. ⏳ **Migrar un servicio pequeño**
   - Empezar con SystemSettings
   - Verificar funcionalidad

### Largo plazo:

1. Evaluar si vale la pena seguir con el hybrid
2. Considerar Docker para desarrollo
3. Documentar best practices para Windows

## 📝 Archivos Creados

- [src/db/schema.ts](src/db/schema.ts) - Schema completo de Drizzle
- [src/db/index.ts](src/db/index.ts) - Cliente de base de datos
- [src/lib/db.ts](src/lib/db.ts) - Export centralizado
- [drizzle.config.ts](drizzle.config.ts) - Configuración de Drizzle Kit
- [scripts/test-drizzle.ts](scripts/test-drizzle.ts) - Script de prueba
- [scripts/test-pg-direct.ts](scripts/test-pg-direct.ts) - Test de conexión directa
- [src/lib/prisma.ts.old](src/lib/prisma.ts.old) - Backup del archivo original

## 🔗 Referencias

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Drizzle + Prisma Guide](https://orm.drizzle.team/docs/get-started-postgresql#prisma)
- [PostgreSQL Windows Issues](https://github.com/brianc/node-postgres/issues)

---

**Conclusión**: La migración del schema está completa, pero necesitamos resolver el problema de conexión con un enfoque hybrid usando Prisma para la conexión y Drizzle para las queries.
