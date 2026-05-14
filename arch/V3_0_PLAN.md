# Plan de Desarrollo — Versión 3.0 (IA y Expansión Internacional)

**Prerequisito:** V2.5 publicada. Plataforma competitiva madura con base de usuarios activa en Colombia y primeros usuarios en otros países latinoamericanos.  
**Objetivo:** Escalar la plataforma globalmente con inteligencia artificial para personalización, soporte multi-idioma, expansión de pagos internacionales, y un dashboard de administración para gestionar la plataforma.

---

## Resumen de funcionalidades

| Funcionalidad | Descripción |
|---|---|
| Asistente de predicciones IA | Sugerencias de marcadores basadas en historial y estadísticas |
| Pollas inteligentes IA | El sistema sugiere pollas relevantes al usuario |
| Notificaciones inteligentes | Push personalizadas según comportamiento |
| Multi-idioma | Español, inglés, portugués |
| Stripe (pagos internacionales) | Pagos en USD/EUR para México, Argentina, Chile, España |
| Dashboard de administración web | Panel para monitorear la plataforma y gestionar contenido |
| Soporte GDPR / LGPD | Cumplimiento para Europa y Brasil |

---

## Fase 1 — Diseño y Planificación

### 1.1 Nuevas pantallas de usuario

- **Asistente IA:** sección en PredictionsScreen con sugerencias de marcadores
- **Preferencias de idioma:** en PerfilScreen → Ajustes → Idioma
- **Política de datos:** pantalla de GDPR con opciones de descarga/eliminación de datos

### 1.2 Dashboard de administración (web)

Aplicación web separada (no parte de la app móvil) construida con:
- **Framework:** Next.js + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Auth:** Supabase Auth con rol `admin`
- **Hosting:** Vercel

Secciones del dashboard:
- **Overview:** usuarios activos hoy/semana/mes, pollas creadas, transacciones
- **Usuarios:** lista, buscar, ver perfil, banear, ajustar balance
- **Pollas:** ver todas, moderar contenido, cerrar pollas problemáticas
- **Resultados:** subir resultados manualmente si API-Football falla
- **Transacciones:** historial de pagos, reembolsos
- **Notificaciones:** enviar push masiva o segmentada
- **Analytics:** gráficas de retención, funnel de conversión, ingresos

---

## Fase 2 — Inteligencia Artificial

### 2.1 Asistente de predicciones

El asistente sugiere marcadores para cada partido basándose en:
- Historial de enfrentamientos (datos de API-Football)
- Forma reciente de los equipos (últimos 5 partidos)
- Estadísticas de casa/visitante
- El historial del usuario (qué tipo de predicciones suele hacer bien)

**Implementación con Claude API:**

```typescript
// services/predictionAssistant.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function getPredictionSuggestion(match: Match, userHistory: any) {
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Eres un asistente de quinielas deportivas. Analiza este partido y sugiere un marcador probable.

Partido: ${match.home} vs ${match.away}
Fecha: ${match.date}

Estadísticas disponibles:
- Últimos 5 partidos del ${match.home}: [datos de API-Football]
- Últimos 5 partidos del ${match.away}: [datos de API-Football]
- Historial de enfrentamientos directos: [datos de API-Football]

Historial del usuario (sus aciertos recientes):
${JSON.stringify(userHistory)}

Responde en formato JSON:
{
  "home_score": número,
  "away_score": número,
  "confidence": "alta" | "media" | "baja",
  "reasoning": "explicación breve en 1-2 oraciones"
}`,
    }],
  });

  return JSON.parse(message.content[0].text);
}
```

**UI en PredictionsScreen:**

```tsx
// Para cada partido, mostrar la sugerencia de IA
function AIHint({ match }: { match: Match }) {
  const { data: suggestion } = useQuery({
    queryKey: ['ai-suggestion', match.id],
    queryFn: () => getPredictionSuggestion(match, userHistory),
    staleTime: 1000 * 60 * 30,  // 30 minutos
  });

  if (!suggestion) return null;

  return (
    <TouchableOpacity
      style={styles.aiHint}
      onPress={() => applySuggestion(match.id, suggestion)}
    >
      <Text>🤖 IA sugiere: {suggestion.home_score}–{suggestion.away_score}</Text>
      <Text style={styles.confidence}>Confianza: {suggestion.confidence}</Text>
      <Text style={styles.reasoning}>{suggestion.reasoning}</Text>
    </TouchableOpacity>
  );
}
```

> **Disclaimer importante:** La UI debe dejar claro que son sugerencias algorítmicas, no garantías. Texto: *"Sugerencia de IA basada en estadísticas. No es un pronóstico garantizado."*

### 2.2 Sistema de recomendaciones de pollas

Recomendar pollas relevantes en la tab Explorar basándose en:
- Competiciones que el usuario ha seguido históricamente
- Amigos que ya están en la polla
- Pollas similares a las que ya participa

```typescript
// Edge Function con Claude para ranking de recomendaciones
const recommendations = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',  // modelo más rápido y económico para esto
  max_tokens: 256,
  messages: [{
    role: 'user',
    content: `Usuario con estas preferencias: ${JSON.stringify(userProfile)}
    Pollas disponibles: ${JSON.stringify(availablePools)}
    Devuelve los IDs de las 5 pollas más relevantes en formato JSON array.`,
  }],
});
```

### 2.3 Notificaciones inteligentes

En lugar de notificaciones genéricas, personalizar basándose en comportamiento:

| Señal del usuario | Notificación personalizada |
|---|---|
| Siempre predice exacto en Champions | "Tu polla de Champions empieza mañana — ¡hay 4 partidos a tu medida!" |
| No ha abierto la app en 5 días | "Te estás perdiendo la racha. {amigo} te lleva 15 puntos de ventaja 👀" |
| Suele predecir tarde (1h antes) | "Quedan 2 horas para que cierre la predicción de hoy. Ya tienes datos de IA disponibles." |
| Acaba de subir de categoría | "¡Bienvenido a {categoría}! Los Pro tienen un 23% más de exactos en promedio. 🎯" |

Edge Function `smart-notifications` con Claude:
```typescript
const notification = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 100,
  messages: [{
    role: 'user',
    content: `Genera una notificación push personalizada, motivadora y breve (máx 80 caracteres) para:
    Evento: ${event}
    Datos del usuario: ${JSON.stringify(userContext)}
    Idioma: ${user.language}
    Responde solo con el texto de la notificación, sin comillas.`,
  }],
});
```

---

## Fase 3 — Multi-idioma (i18n)

### 3.1 Librería de internacionalización

```bash
npx expo install expo-localization
npm install i18next react-i18next
```

### 3.2 Estructura de archivos de traducción

```
locales/
├── es.json   # Español (defecto)
├── en.json   # Inglés
└── pt.json   # Portugués (Brasil)
```

`locales/es.json`:
```json
{
  "home": {
    "title": "Mis Pollas",
    "empty": "No tienes pollas aún",
    "create": "Crear Polla",
    "join": "Unirse"
  },
  "pool": {
    "predictions": "Predicciones",
    "results": "Resultados",
    "standings": "Clasificación",
    "info": "Info"
  },
  "scoring": {
    "exact": "Exacto",
    "one_team": "Parcial",
    "winner": "Ganador",
    "diff": "Diferencia",
    "none": "Sin acierto"
  }
}
```

### 3.3 Detectar idioma del dispositivo

```typescript
// En App.tsx
import * as Localization from 'expo-localization';
import i18next from 'i18next';

const deviceLocale = Localization.getLocales()[0].languageCode;
const supportedLocale = ['es', 'en', 'pt'].includes(deviceLocale) ? deviceLocale : 'es';
i18next.init({ lng: supportedLocale, resources: { es, en, pt } });
```

### 3.4 Uso en componentes

```typescript
import { useTranslation } from 'react-i18next';

function HomeScreen() {
  const { t } = useTranslation();
  return <Text>{t('home.title')}</Text>;  // "Mis Pollas" / "My Pools" / "Minhas Pollas"
}
```

---

## Fase 4 — Expansión de pagos (Stripe)

Stripe cubre pagos fuera de Colombia:

```bash
npm install @stripe/stripe-react-native
```

Configurar en `services/payments.ts` para seleccionar automáticamente el procesador:

```typescript
export async function processPayment(amount: number, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('country').eq('id', userId).single();

  if (profile.country === 'CO') {
    return createWompiTransaction(amount, userId);  // Colombia → Wompi (COP)
  } else {
    return createStripePaymentIntent(amount, userId);  // Internacional → Stripe (USD)
  }
}
```

**Países habilitados en V3.0:**

| País | Procesador | Moneda |
|---|---|---|
| Colombia | Wompi | COP |
| México | Stripe | MXN |
| Argentina | Stripe | ARS |
| Chile | Stripe | CLP |
| Perú | Stripe | PEN |
| España | Stripe | EUR |

---

## Fase 5 — Cumplimiento GDPR / LGPD

Para operar en Europa y Brasil, implementar:

### 5.1 Derechos del usuario

```typescript
// services/gdpr.ts

// Descargar todos los datos del usuario
async function exportUserData(userId: string) {
  const [profile, pools, predictions, transactions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId),
    supabase.from('pool_participants').select('pools(*)').eq('user_id', userId),
    supabase.from('predictions').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
  ]);

  return { profile, pools, predictions, transactions };  // devuelto como JSON descargable
}

// Eliminar cuenta y todos los datos
async function deleteAccount(userId: string) {
  // La cascada de FK en Supabase elimina todo lo relacionado
  await supabase.auth.admin.deleteUser(userId);
  // + eliminar de Supabase Storage (avatar_url)
}
```

### 5.2 Consentimiento de cookies / analytics

- Banner de consentimiento en primer lanzamiento (solo en EU/BR)
- Optar por no participar en analytics
- Política de privacidad traducida en los 3 idiomas

---

## Fase 6 — Dashboard de Administración

Aplicación web separada en `admin.retagol.app`:

### 6.1 Stack técnico del dashboard

```
admin-dashboard/
├── app/                   # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx           # Overview / métricas
│   ├── users/
│   ├── pools/
│   ├── transactions/
│   └── notifications/
├── components/
├── lib/
│   └── supabase.ts        # Cliente con service_role_key
└── package.json
```

### 6.2 Métricas clave del overview

```typescript
// Queries para el dashboard
const metrics = await Promise.all([
  supabase.from('profiles').select('id', { count: 'exact' }),  // total usuarios
  supabase.from('profiles').select('id', { count: 'exact' })
    .gte('created_at', startOfDay),  // nuevos hoy

  supabase.from('pools').select('id', { count: 'exact' })
    .eq('status', 'active'),  // pollas activas

  supabase.from('transactions').select('amount_money.sum()')
    .eq('type', 'purchase_coins')
    .gte('created_at', startOfMonth),  // ingresos este mes
]);
```

### 6.3 Acceso al dashboard

Solo usuarios con rol `admin` en Supabase Auth:

```sql
-- Crear policy de admin en todas las tablas
create policy "admin puede ver todo"
  on profiles for all
  using (
    exists (
      select 1 from auth.users
      where auth.uid() = id
        and raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

## Consideraciones técnicas de escala en V3.0

### Migración completa a Expo Router

En V3.0 completar la migración que se inició en V2.5:
- Eliminar `navigation/` (React Navigation)
- Todas las pantallas en `app/` con Expo Router
- Deep links manejados automáticamente por el file system

### Caché y rendimiento

Con miles de usuarios, algunos cambios necesarios:
- **Redis / Supabase Edge Cache:** cachear el ranking global (no recalcular por cada request)
- **CDN para imágenes:** mover avatares de Supabase Storage a Cloudflare Images
- **Paginación agresiva:** todas las listas paginadas de 20 en 20
- **Lazy loading de pantallas:** cargar tab content solo cuando se visita

### Monitoreo

```typescript
// Integrar Sentry en producción
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.1,  // 10% de transacciones para APM
});
```

---

## Checklist de publicación V3.0

### Técnico
- [ ] Sugerencias de IA probadas con disclaimers claros
- [ ] i18n: todas las cadenas de texto traducidas a EN y PT
- [ ] Stripe probado en modo sandbox para todos los países
- [ ] Dashboard de admin desplegado en Vercel con acceso restringido
- [ ] GDPR: botones de "descargar datos" y "eliminar cuenta" funcionando
- [ ] Tests de carga: simular 1000 usuarios simultáneos

### Legal
- [ ] Política de privacidad actualizada para GDPR/LGPD
- [ ] Términos de servicio actualizados con expansión internacional
- [ ] Cumplimiento de regulaciones de pagos en cada país habilitado
- [ ] Revisión de disclaimers de sugerencias de IA

### Producto
- [ ] Pruebas de usuario en México y España (al menos 10 usuarios)
- [ ] Feedback de i18n (traducciones naturales, no robóticas)
- [ ] Capturas de pantalla actualizadas en Play Store y App Store para cada idioma
- [ ] Notas de versión redactadas en los 3 idiomas

---

## Visión a futuro (V4.0+)

Ideas que pueden surgir tras el feedback de V3.0:

- **Sports expansion:** ampliar a otros deportes (baloncesto, béisbol, fútbol americano)
- **Live predictions:** predicciones en tiempo real durante el partido (gol siguiente, resultado final)
- **B2B:** licenciar la plataforma a medios de comunicación y empresas
- **API pública:** permitir que terceros construyan sobre RetaGol
- **NFTs de logros:** versión digital verificable de los trofeos ganados
- **Torneos presenciales:** organizar eventos físicos en bares y estadios
