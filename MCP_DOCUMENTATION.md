# Documentación MCP (Model Context Protocol)

## Descripción General

Este proyecto integra el Model Context Protocol (MCP) para permitir que agentes de IA (Claude, OpenAI, Grok, Gemini) interactúen directamente con tu calendario de Google usando lenguaje natural.

## Arquitectura

### Componentes Principales

1. **Herramientas MCP** (`src/lib/mcp/tools/calendar-tools.ts`)
   - `listEvents`: Lista eventos del calendario con filtros opcionales
   - `createEvent`: Crea nuevos eventos en el calendario
   - `updateEvent`: Actualiza eventos existentes
   - `deleteEvent`: Elimina eventos del calendario
   - `findFreeSlots`: Encuentra espacios libres en el calendario

2. **Servidor MCP** (`src/lib/mcp-server.ts`)
   - Configura y registra todas las herramientas
   - Usa `mcp-handler` de Vercel para manejo HTTP/SSE
   - Valida parámetros con Zod schemas

3. **API Route** (`src/app/api/mcp/route.ts`)
   - Expone el servidor MCP vía HTTP
   - Maneja autenticación usando NextAuth
   - Soporta GET (SSE) y POST (tool calls)

4. **Chat con IA** (`src/components/ai-chat/ChatInterface.tsx`)
   - Interfaz de usuario para interactuar con el asistente
   - Procesamiento de lenguaje natural
   - Historial de conversación

## Uso

### Acceder al Chat con IA

1. Navega a `/ai-assistant` en tu aplicación
2. Asegúrate de tener una cuenta de Google Calendar conectada
3. Comienza a interactuar con el asistente usando lenguaje natural

### Ejemplos de Comandos

**Ver eventos:**
- "Muéstrame mis eventos de hoy"
- "¿Qué tengo mañana?"
- "Agenda de esta semana"

**Crear eventos:**
- "Crea una reunión para las 3pm"
- "Agregar evento de almuerzo mañana a las 12"
- "Nueva reunión con el equipo"

**Encontrar espacios libres:**
- "¿Cuándo tengo tiempo libre?"
- "Espacios disponibles esta semana"
- "Horarios libres mañana"

## Configuración Técnica

### Requisitos

- Cuenta de Google con Calendar API habilitada
- Credenciales OAuth configuradas en `gcp-oauth.keys.json`
- NextAuth configurado con Google provider

### Variables de Entorno

```bash
# Google OAuth (ya configuradas)
GOOGLE_CLIENT_ID=REDACTED_CLIENT_ID
GOOGLE_CLIENT_SECRET=REDACTED_CLIENT_SECRET

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-chars
```

### Autenticación

El servidor MCP requiere autenticación de usuario:

```typescript
// Middleware de autenticación en route.ts
async authenticate(): Promise<McpContext> {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    throw new Error("Authentication required");
  }

  return {
    userId: session.user.id,
  };
}
```

## Integración con Agentes IA Externos

### Conectar Claude Desktop

1. Instala Claude Desktop
2. Configura el MCP server en `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "fluid-calendar": {
      "url": "http://localhost:3000/api/mcp",
      "apiKey": "tu-api-key-aqui"
    }
  }
}
```

### Uso Programático

```typescript
// Llamar a una herramienta MCP
const response = await fetch('/api/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    method: 'tools/call',
    params: {
      name: 'list_events',
      arguments: {
        accountId: 'account-id',
        calendarId: 'primary',
        timeMin: '2025-01-01T00:00:00Z',
        timeMax: '2025-01-07T23:59:59Z',
        maxResults: 10
      }
    }
  })
});

const data = await response.json();
```

## Schemas de Validación

Todas las herramientas usan Zod para validación:

### ListEventsSchema
```typescript
{
  accountId: string,
  calendarId?: string (default: "primary"),
  timeMin?: string (ISO 8601),
  timeMax?: string (ISO 8601),
  maxResults?: number (default: 10),
  query?: string
}
```

### CreateEventSchema
```typescript
{
  accountId: string,
  calendarId?: string (default: "primary"),
  summary: string,
  description?: string,
  location?: string,
  start: string (ISO 8601),
  end: string (ISO 8601),
  attendees?: string[],
  reminders?: {
    useDefault?: boolean,
    overrides?: Array<{
      method: "email" | "popup",
      minutes: number
    }>
  }
}
```

### FindFreeSlotsSchema
```typescript
{
  accountId: string,
  calendarIds?: string[] (default: ["primary"]),
  timeMin: string (ISO 8601),
  timeMax: string (ISO 8601),
  duration?: number (default: 60 minutos),
  workingHours?: {
    start: number (0-23, default: 9),
    end: number (0-23, default: 17)
  }
}
```

## Seguridad

### Protecciones Implementadas

1. **Autenticación requerida**: Todas las solicitudes MCP requieren sesión válida
2. **Validación de parámetros**: Schemas Zod validan todos los inputs
3. **Aislamiento de usuario**: Cada usuario solo accede a sus propios calendarios
4. **Tokens seguros**: OAuth tokens almacenados encriptados en PostgreSQL

### Mejores Prácticas

- No expongas la ruta `/api/mcp` públicamente sin autenticación adicional
- Usa HTTPS en producción
- Rota las credenciales OAuth periódicamente
- Monitorea logs para detectar uso anómalo

## Troubleshooting

### El chat no responde

1. Verifica que tengas una cuenta de Google Calendar conectada
2. Revisa los logs del servidor: `npm run dev`
3. Confirma que las credenciales OAuth son válidas

### Errores de autenticación

```
Error: Authentication required. Please sign in to use MCP tools.
```

**Solución**: Asegúrate de estar autenticado en la aplicación

### Token expirado

Los tokens de OAuth se refrescan automáticamente. Si persiste el error:

1. Desconecta y vuelve a conectar tu cuenta de Google
2. Verifica que el refresh token esté almacenado en la base de datos

## Próximas Mejoras

- [ ] Soporte para Outlook Calendar
- [ ] Integración con Fitbit para sincronizar eventos de salud
- [ ] Sugerencias inteligentes basadas en patrones de uso
- [ ] Soporte multilenguaje
- [ ] Webhooks para notificaciones en tiempo real

## Referencias

- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [mcp-handler de Vercel](https://github.com/vercel/mcp-handler)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [NextAuth.js](https://next-auth.js.org/)
