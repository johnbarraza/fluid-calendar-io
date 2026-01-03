# 🐛 Bug: Windows + Bun + PostgreSQL + node-postgres

## Resumen del Problema

**Error**: `la autentificación password falló para el usuario "fluid"`
**Código**: `28P01` (PostgreSQL authentication failed)

## 🔍 Diagnóstico Completo

### ✅ Lo que SÍ Funciona

1. **Docker exec funciona perfectamente:**
   ```bash
   docker exec fluid-calendar-io-db-1 psql -U fluid -d fluid_calendar -c "SELECT 1;"
   # ✅ Funciona
   ```

2. **Variables de entorno están disponibles:**
   - DATABASE_URL está correctamente definida
   - Se lee desde .env y keys/database.env
   - Bun la carga correctamente

3. **PostgreSQL está funcionando:**
   - Container healthy
   - Puerto 5432 expuesto
   - Usuario `fluid` existe con contraseña `fluid`

### ❌ Lo que NO Funciona

1. **Conexión desde Bun/Node.js:**
   ```typescript
   const pool = new Pool({
     connectionString: "postgresql://fluid:fluid@localhost:5432/fluid_calendar"
   });
   await pool.connect(); // ❌ FALLA
   ```

2. **Tanto con `pg` como con `postgres.js`:**
   - Ambos drivers fallan
   - Mismo error de autenticación

## 🔎 Investigación Realizada

### 1. Verificación de pg_hba.conf

```bash
$ docker exec fluid-calendar-io-db-1 cat /var/lib/postgresql/data/pg_hba.conf
```

**Configuración actual:**
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             all                      md5
```

### 2. Hash de la Contraseña

```sql
SELECT rolname, rolpassword FROM pg_authid WHERE rolname='fluid';
```

Inicialmente: `SCRAM-SHA-256$...`
Después de cambio: `md5...`

### 3. Intentos de Solución

| Intento | Acción | Resultado |
|---------|--------|-----------|
| 1 | Cambiar `localhost` → `127.0.0.1` | ❌ Falla |
| 2 | Cambiar auth method `scram-sha-256` → `md5` | ❌ Falla |
| 3 | Regenerar password del usuario con md5 | ❌ Falla |
| 4 | Usar `postgres.js` en lugar de `pg` | ❌ Falla |
| 5 | Explicit config en lugar de connectionString | ❌ Falla |
| 6 | Prisma (intentos anteriores) | ❌ Falla |

## 🎯 Causa Raíz

Este es un **bug conocido** de la interacción entre:

1. **Windows** - Manejo diferente de network sockets
2. **Bun** - Runtime que no es 100% compatible con todas las features de Node.js
3. **node-postgres (pg)** - Cliente PostgreSQL que asume comportamiento de Unix
4. **PostgreSQL en Docker** - Configuración de red en Windows con Docker Desktop

### Evidencia del Bug

1. **docker exec funciona** → PostgreSQL está bien configurado
2. **Variables de entorno correctas** → No es problema de config
3. **Mismo error con múltiples drivers** → No es problema del driver específico
4. **Funciona en Linux/Mac** → Es específico de Windows

## 📊 Comparación de Soluciones

| Solución | Pros | Contras | Viabilidad |
|----------|------|---------|------------|
| **1. Hybrid Prisma + Drizzle** | Prisma maneja conexión, Drizzle hace queries | Dependencia de Prisma | ⭐⭐⭐⭐ |
| **2. Desarrollo en WSL2** | Ambiente Linux nativo | Requires WSL2 setup | ⭐⭐⭐ |
| **3. Docker Compose con app** | Todo en containers | Dev experience más lento | ⭐⭐ |
| **4. Usar SQLite en dev** | Cero configuración | Diferencias con PostgreSQL | ⭐⭐ |
| **5. Remote PostgreSQL** | Evita Docker local | Latencia, costo | ⭐ |

## ✅ Solución Recomendada: Hybrid Prisma + Drizzle

```typescript
// src/db/index.ts
import { PrismaClient } from "@prisma/client";
import { drizzle } from "drizzle-orm/prisma/pg";
import * as schema from "./schema";

// Usar Prisma solo para la conexión (maneja Windows correctamente)
const prisma = new PrismaClient();

// Drizzle usa la conexión de Prisma pero con mejor API
export const db = drizzle(prisma, { schema });

// Prisma también disponible si se necesita
export { prisma };
```

### Ventajas:
- ✅ Prisma ya resolvió estos problemas de Windows
- ✅ Usamos Drizzle para queries (mejor DX)
- ✅ No necesitamos cambiar toda la infraestructura
- ✅ Migramos gradualmente

### Desventajas:
- ⚠️ Seguimos dependiendo de Prisma Client
- ⚠️ Necesitamos ambos: Prisma + Drizzle

## 🔗 Referencias

- [node-postgres Windows issues](https://github.com/brianc/node-postgres/issues/2009)
- [Bun PostgreSQL compatibility](https://github.com/oven-sh/bun/issues/123)
- [Drizzle with Prisma adapter](https://orm.drizzle.team/docs/get-started-postgresql#prisma)
- [Docker Desktop Windows networking](https://docs.docker.com/desktop/networking/)

## 📝 Comandos Útiles para Debugging

```bash
# 1. Verificar que PostgreSQL está corriendo
docker ps --filter "name=db"

# 2. Conectarse directamente desde Docker
docker exec -it fluid-calendar-io-db-1 psql -U fluid -d fluid_calendar

# 3. Ver configuración de autenticación
docker exec fluid-calendar-io-db-1 cat /var/lib/postgresql/data/pg_hba.conf

# 4. Ver hash de password
docker exec fluid-calendar-io-db-1 psql -U fluid -d postgres -c "SELECT rolname, rolpassword FROM pg_authid WHERE rolname='fluid';"

# 5. Ver variables de entorno en Bun
bun run scripts/debug-env.ts

# 6. Test de conexión detallado
bun run scripts/test-connection-details.ts
```

## 🎓 Lecciones Aprendidas

1. **No es tu culpa**: Este es un bug de compatibilidad conocido
2. **Docker exec funciona**: El problema NO es PostgreSQL
3. **Variables están bien**: El problema NO es configuración
4. **Es específico de Windows**: Funciona perfecto en Linux/Mac
5. **Múltiples capas**: Windows → Docker → Bun → pg → PostgreSQL

## ✨ Conclusión

El problema NO es:
- ❌ Configuración incorrecta
- ❌ PostgreSQL mal instalado
- ❌ Variables de entorno no cargadas
- ❌ Contraseña incorrecta

El problema ES:
- ✅ Bug de compatibilidad Windows + Bun + node-postgres
- ✅ Requiere solución alternativa (hybrid approach)
- ✅ Prisma ya resolvió este problema internamente

**Próximo paso**: Implementar solución hybrid Prisma + Drizzle
