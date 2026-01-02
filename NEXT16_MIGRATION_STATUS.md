# 📊 Estado de Migración a Next.js 16 + Drizzle

**Fecha**: 2026-01-02
**Versiones Objetivo**:
- Next.js: 16.1.1 ✅
- React: 19.2.3 ✅
- Drizzle ORM: 0.45.1 ✅ (schema completo)

---

## ✅ Completado

### 1. Actualización de Dependencias
- ✅ Next.js actualizado de 15.3.8 → 16.1.1
- ✅ React actualizado de 19.0.3 → 19.2.3
- ✅ React DOM actualizado de 19.0.3 → 19.2.3
- ✅ @types/react actualizado a 19.2.7
- ✅ eslint-config-next actualizado a 16.1.1

### 2. Codemods de Next.js 16 Aplicados
- ✅ remove-experimental-ppr
- ✅ remove-unstable-prefix
- ✅ middleware-to-proxy
- ✅ next-lint-to-eslint-cli
- ✅ next-experimental-turbo-to-turbopack

### 3. Archivos Críticos Migrados Manualmente

**Archivos de Autenticación**:
- ✅ `src/app/api/auth/register/route.ts` - Migrado completamente a Drizzle con transacciones
- ✅ `src/app/api/auth/reset-password/request/route.ts` - Corregido sintaxis Drizzle

**Archivos de Configuración**:
- ✅ `src/app/api/auto-schedule-settings/route.ts` - Upsert convertido a find-then-insert/update
- ✅ `src/app/api/calendar-settings/route.ts` - Upsert convertido a find-then-insert/update
- ✅ `src/app/api/logs/route.ts` - Queries complejas migradas a Drizzle
- ✅ `src/app/api/setup/route.ts` - Count query corregido

---

## ⚠️ Pendientes (20 archivos con ~1269 errores TS)

### Archivos de Settings (6 archivos) - PRIORIDAD ALTA
Patrón similar a los ya corregidos, se pueden arreglar rápidamente:

1. `src/app/api/data-settings/route.ts`
2. `src/app/api/integration-settings/route.ts`
3. `src/app/api/notification-settings/route.ts`
4. `src/app/api/logs/settings/route.ts`

**Fix Pattern**: Reemplazar upsert con:
```typescript
let settings = await db.query.settingsTable.findFirst({ where });
if (settings) {
  [settings] = await db.update(settingsTable).set(updates).where(eq(...)).returning();
} else {
  [settings] = await db.insert(settingsTable).values({...defaults, ...updates}).returning();
}
```

### Archivos de Calendar (5 archivos) - PRIORIDAD ALTA
Requieren revisión manual por complejidad:

1. `src/app/api/calendar/caldav/auth/route.ts`
2. `src/app/api/calendar/caldav/route.ts`
3. `src/app/api/calendar/caldav/sync/route.ts`
4. `src/app/api/calendar/google/events/route.ts`
5. `src/app/api/calendar/google/route.ts`
6. `src/app/api/calendar/outlook/sync/route.ts`

**Problemas Comunes**:
- Sintaxis Prisma `create`, `connect`, `include` mezclada con Drizzle
- Queries con relaciones complejas
- Transacciones que necesitan ser reescritas

### Archivos de Lib (5 archivos) - PRIORIDAD MEDIA

1. `src/lib/caldav-calendar.ts`
2. `src/lib/logger/server.ts`
3. `src/lib/outlook-sync.ts`
4. `src/lib/setup-migration.ts`
5. `src/lib/mcp/tools/task-tools.ts`

### Archivos de Task Sync (4 archivos) - PRIORIDAD MEDIA

1. `src/app/api/task-sync/mappings/route.ts`
2. `src/app/api/task-sync/providers/route.ts`
3. `src/lib/task-sync/task-change-tracker.ts`
4. `src/app/api/fitbit/callback/route.ts`

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Settings Files (30-45 minutos)
Arreglar los 6 archivos de settings restantes usando el patrón establecido.

### Fase 2: Calendar Files (1-2 horas)
Migrar archivos de calendar uno por uno, empezando por:
1. `calendar/google/events/route.ts` (menos complejo)
2. `calendar/google/route.ts` (más complejo)
3. Archivos de CalDAV
4. Archivo de Outlook

### Fase 3: Lib & Task Sync (1 hora)
Migrar archivos de librería y task sync.

### Fase 4: Verificación Final
1. Build completo sin errores
2. Tests básicos
3. Documentación actualizada

---

## 📝 Patrones de Migración Establecidos

### Count Queries
```typescript
// ❌ Antes (Prisma)
const count = await prisma.model.count({ where });

// ✅ Ahora (Drizzle)
const [{ value: count }] = await db
  .select({ value: count() })
  .from(table)
  .where(conditions);
```

### Upsert Pattern
```typescript
// ❌ Antes (Prisma)
const record = await prisma.model.upsert({
  where: { id },
  update: updates,
  create: defaults
});

// ✅ Ahora (Drizzle)
let record = await db.query.model.findFirst({ where });
if (record) {
  [record] = await db.update(table).set(updates).where(eq(table.id, id)).returning();
} else {
  [record] = await db.insert(table).values({...defaults}).returning();
}
```

### Transacciones con Relaciones
```typescript
// ❌ Antes (Prisma)
const user = await prisma.user.create({
  data: {
    email,
    accounts: {
      create: { provider: "google" }
    }
  }
});

// ✅ Ahora (Drizzle)
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({ email }).returning();
  await tx.insert(accounts).values({ userId: user.id, provider: "google" });
  return user;
});
```

### Where Conditions
```typescript
// ❌ Antes (Prisma)
const where: Prisma.ModelWhereInput = {
  userId,
  status: "active",
  createdAt: { gte: startDate }
};

// ✅ Ahora (Drizzle)
const conditions = [];
conditions.push(eq(table.userId, userId));
conditions.push(eq(table.status, "active"));
conditions.push(gte(table.createdAt, startDate));
const whereClause = and(...conditions);
```

---

## 🔍 Verificación de Progreso

### Comando para ver errores restantes:
```bash
npm run type-check 2>&1 | grep "error TS" | wc -l
```

### Comando para ver archivos únicos con errores:
```bash
npm run type-check 2>&1 | grep "error TS" | cut -d'(' -f1 | sort -u
```

---

## 📚 Referencias

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Drizzle Query API](https://orm.drizzle.team/docs/rqb)
- [Drizzle Migrations](https://orm.drizzle.team/docs/migrations)

---

## 💡 Notas

- El schema de Drizzle está 100% completo en [src/db/schema.ts](src/db/schema.ts)
- Todos los modelos están definidos correctamente
- La conexión a la base de datos funciona
- El problema principal son queries con sintaxis mixta Prisma/Drizzle
- Una vez migrados estos 20 archivos, el proyecto estará completamente en Next.js 16 + Drizzle

---

**Siguiente paso recomendado**: Continuar con migración manual de settings files (Fase 1)
