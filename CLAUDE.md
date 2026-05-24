# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

RetaGol es una app de quinielas deportivas en React Native (Expo). Los usuarios crean o se unen a pollas, predicen marcadores de partidos de torneos reales, y compiten en un ranking de puntos dentro de cada polla.

## Tech Stack

- React Native 0.81 + Expo SDK 54, TypeScript strict mode
- React Navigation v7: Native Stack (flujo principal) + Bottom Tabs (detalle de polla)
- React Context API (`useApp()` hook) para estado global
- **Supabase** como backend completo: PostgreSQL + Auth + Edge Functions + RLS
- **football-data.org** como API de datos de fútbol (plan gratuito, cubre temporada actual, 10 req/min)
- `react-native-safe-area-context` — usar `SafeAreaView` de esta librería, **no** de `react-native` (está deprecated)
- **No usar `@expo/vector-icons`** — no está instalado; usar emojis con `<Text>` en su lugar
- No hay test runner ni linter separado — Metro lo maneja todo vía Expo

## Development Commands

```bash
npm start        # Inicia Metro dev server
npm run android  # Corre en emulador/dispositivo Android
npm run ios      # Corre en simulador iOS
npm run web      # Corre en navegador
```

## Variables de entorno (`.env` — nunca subir a Git)

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_FOOTBALL_DATA_KEY=tu_key_de_football_data_org
```

Secretos de Supabase (para Edge Functions — solo lado servidor):
```bash
supabase secrets set FOOTBALL_DATA_KEY=tu_key_de_football_data_org
```

## Architecture — Estado actual (Mayo 2026)

### State (`context/AppContext.tsx`)

Contexto global único conectado con Supabase. Tipos exportados: `Match`, `Pool`, `User`, `ScoringConfig`.

Estado clave:
- `user`: `{ id, name, email }` — cargado desde tabla `profiles` de Supabase al iniciar sesión
- `isLogged`: booleano; controla qué flujo muestra el navegador
- `pools`: array de `Pool` — cada pool tiene `{ id, name, type, code, participants, matches, createdAt, scoringConfig }`
- `predictions`: `{ [poolId]: { [userId]: Match[] } }` — caché local; fuente de verdad es Supabase

Funciones del contexto:
- `login(email, password)` — Supabase Auth + carga perfil
- `register(email, password, name)` — Supabase signUp
- `logout()` — Supabase signOut
- `createPool(name, type, matches, scoring)` — inserta en Supabase con partidos de football-data.org y scoring_config
- `joinPool(code)` — busca polla por código, registra participante
- `getPredictionsByPool(poolId)` — retorna predicciones del caché local
- `savePredictionsByPool(poolId, matches)` — upsert en Supabase

### Supabase — Tablas principales

| Tabla | Descripción |
|---|---|
| `profiles` | Perfil de usuario (sincronizado con Supabase Auth vía trigger) |
| `pools` | Pollas: name, type, code, creator_id, participants, scoring_config (jsonb), status |
| `pool_participants` | Relación usuario ↔ polla |
| `matches` | Partidos: home, away, date, utc_date, home_score, away_score, api_id (int, ID de football-data.org) |
| `predictions` | Predicciones: pool_id, match_id, user_id, home_score, away_score |

Columnas clave:
- `pools.scoring_config` (jsonb): `{ exact, oneTeam, winner, goalDiff }` — configurable al crear la polla
- `matches.api_id` (int): ID real de football-data.org para sincronización automática de resultados
- `matches.utc_date` (text): fecha ISO UTC del partido — usada por `send-reminders` para comparar fechas
- `profiles.onesignal_player_id` (text): subscription ID de OneSignal para enviar push al dispositivo

### Edge Functions (`supabase/functions/`)

- **`sync-results/index.ts`**: Consulta partidos con `api_id != null` y `home_score = null`. Para cada uno llama a `football-data.org/v4/matches/{api_id}`. Si `status === 'FINISHED'`, actualiza marcadores y envía push a participantes de la polla. Secretos: `FOOTBALL_DATA_KEY`, `ONESIGNAL_REST_API_KEY`.
- **`send-reminders/index.ts`**: Cron cada hora. Busca partidos con `utc_date` en la próxima hora y `home_score = null`. Envía push "Partido en 1 hora" a los participantes. Secreto: `ONESIGNAL_REST_API_KEY`.
- **`notify-join/index.ts`**: Llamada desde `joinPool()` en el app. Recibe `pool_id`, `pool_name`, `joiner_name`. Busca el `onesignal_player_id` del creador y le envía push. Secreto: `ONESIGNAL_REST_API_KEY`.
- **`_shared/onesignal.ts`**: Helper compartido `sendPushNotification(playerIds, title, message, data?)` — llama a la REST API de OneSignal v2.

Activación de `sync-results`: pull-to-refresh en ResultsScreen hace POST antes de recargar datos.
Activación de `send-reminders`: cron en Supabase vía `pg_cron` + `pg_net` (cada hora).
Activación de `notify-join`: llamada directa desde `joinPool()` en AppContext (fire & forget).

### Navigation (`navigation/`)

- `AppNavigator.tsx`: stack raíz; usa `isLogged` para alternar entre flujo auth y flujo app
- `PoolTabsNavigator.tsx`: 4 tabs del detalle de polla; header personalizado con flecha atrás
- **No hay bottom tabs en V1** — app con una sola pantalla Home y menú lateral deslizante

Flujo de navegación:
```
Stack (AppNavigator)
├── Login → Register          (si !isLogged)
└── Home                      (si isLogged)
│    └── Menú lateral (slide izquierda): perfil, stats, accesos futuros, logout
├── CreatePool   (push)
├── JoinPool     (push)
└── PoolDetail (PoolTabsNavigator)
     ├── Predicciones
     ├── Resultados
     ├── Clasificación
     └── Info
```

### Scoring (`utils/scoring.ts`)

Lógica de puntuación configurable por polla:

```
Exacto       → marcador exacto            (por defecto 5 pts)
Parcial      → un equipo exacto           (por defecto 2 pts)
Ganador      → resultado correcto (1X2)   (por defecto 1 pt)
Diferencia   → diff de goles correcta     (por defecto 1 pt)
Sin acierto  → 0 pts
```

Exporta:
- `getResultType(pred, result)` → `ResultType`
- `POINTS` → puntos por defecto (sin config)
- `ScoringConfig` → interface `{ exact, oneTeam, winner, goalDiff }`
- `DEFAULT_SCORING` → valores por defecto
- `getPoints(type, config?)` → puntos respetando scoring configurable de la polla
- `BADGE_COLORS`, `BADGE_LABELS`

ResultsScreen y StandingsScreen usan `getPoints(type, pool.scoringConfig)` — el scoring configurable ya tiene efecto real en la UI.

### Services (`services/`)

- `supabase.ts`: cliente Supabase (URL + anon key del `.env`, SecureStore para sesión)
- `footballDataApi.ts`: servicio de football-data.org

  Funciones:
  - `getAvailableTournaments()`: consulta la API para cada torneo en `TOURNAMENTS`, filtra solo los que `startDate > hoy` y tienen fixtures SCHEDULED. Guarda en caché en memoria (`matchCache`). Devuelve `AvailableTournament[]`.
  - `getScheduledMatches(code)`: retorna partidos del caché o los carga desde la API.
  - `formatMatchDate(utcDate)` / `formatShortDate(isoDate)`: helpers de formato de fecha en español (locale `es-CO`).

  Torneos disponibles en `TOURNAMENTS`: WC, CL, PD, CDR, PL, BL1, SA (códigos de football-data.org).

### Screens (`screens/`)

**Auth:**
- `auth/LoginScreen`: fondo azul `#2563EB`, formulario en tarjeta blanca, llama `login()`
- `auth/RegisterScreen`: fondo verde `#16A34A`, 4 campos, llama `register()`

**App (pantalla principal):**
- `app/HomeScreen`: header (☰ + título + 🔔) + FlatList de PoolCards + footer (Crear/Unirse) + menú lateral animado

**App (flujo de pools):**
- `app/CreatePoolScreen`:
  1. Campo nombre de polla
  2. Selector de torneo: llama `getAvailableTournaments()` al montar; muestra solo torneos próximos (no iniciados) como pill buttons de colores
  3. Al seleccionar torneo: muestra resumen (total partidos, fecha inicio/fin) — NO la lista de partidos
  4. Sección colapsable de configuración de puntajes (4 criterios con botones +/-)
  5. Botón "Crear Polla" habilitado solo cuando hay nombre, torneo y partidos cargados
  6. Llama `createPool()` con partidos reales del torneo (con `apiId`) y `ScoringConfig`

- `app/JoinPoolScreen`: input de código (auto-uppercase); busca en Supabase y registra participante
- `app/pool/PredictionsScreen`: FlatList de MatchCards editables + botón Guardar (upsert en Supabase)
- `app/pool/ResultsScreen`: carga predicciones y marcadores frescos de Supabase; pull-to-refresh llama Edge Function `sync-results` antes de recargar; badges de puntos usando `getPoints(type, pool.scoringConfig)`
- `app/pool/StandingsScreen`: calcula puntos leyendo predicciones y resultados de Supabase; ordena por puntos; resalta usuario actual; usa `getPoints(type, pool.scoringConfig)`
- `app/pool/InfoScreen`: datos del pool + sistema de puntuación en acordeón

### Components (`components/`)

- `MatchCard.tsx`: tarjeta de partido con inputs numéricos; `onChange(id, field, value)`
- `PoolCard.tsx`: tarjeta de pool con badge de tipo (color según competición) y código de acceso

## Key Patterns

- **Pool-scoped predictions**: siempre `predictions[poolId][userId]` — mezclarlos causó un bug de leakage en el pasado
- **SafeAreaView**: importar siempre de `react-native-safe-area-context`, nunca de `react-native`
- **Iconos**: NO usar `@expo/vector-icons`; usar emojis dentro de `<Text style={{ fontSize: N }}>` 
- **Colores base**: slate `#64748B`, green `#16A34A`, blue `#2563EB`, bg `#F1F5F9`, white `#FFFFFF`
  - Exacto → `#16A34A` | Parcial → `#2563EB` | Ganador/Diff → `#EAB308` | Sin acierto → `#94A3B8`
- **Comentarios**: escritos en español; mantener ese estilo al agregar comentarios
- **Scoring**: usar siempre `getPoints(type, pool.scoringConfig)` — nunca `POINTS[type]` directamente. Ya implementado en ResultsScreen y StandingsScreen
- **OneSignal**: subscription ID se guarda en `profiles.onesignal_player_id` al abrir la app. Las Edge Functions lo leen para enviar push. `google-services.json` configurado + `onesignal-expo-plugin` en `app.json` — requiere nuevo EAS build para activar FCM en el dispositivo
- **Match.utcDate**: guardar siempre el ISO UTC de football-data.org junto con `date` (string formateado). `utcDate` es lo que usa `send-reminders` para comparar fechas en la BD
- **API de partidos**: toda la lógica de football-data.org va en `services/footballDataApi.ts`. El `api_id` de cada partido es el `id` numérico de football-data.org — fundamental para que `sync-results` funcione
- **Caché de partidos**: `matchCache` en footballDataApi.ts evita llamadas repetidas a la API dentro de la misma sesión

## Estado actual de V1 (Mayo 2026)

| Área | Estado |
|---|---|
| Auth (Login/Register) con Supabase | ✅ Completo |
| Home con menú lateral y stats | ✅ Completo |
| Pool tabs (4 sub-tabs) | ✅ Completo |
| Crear polla con torneos reales de football-data.org | ✅ Completo |
| Scoring configurable al crear polla | ✅ Completo (guardado en DB) |
| Predicciones persistidas en Supabase | ✅ Completo |
| Edge Function `sync-results` desplegada | ✅ Completo |
| Resultados con pull-to-refresh → sync-results | ✅ Completo |
| Clasificación con datos reales de Supabase | ✅ Completo |
| Unirse a polla por código | ✅ Completo |
| Resultados/Clasificación respetando scoring configurable | ✅ Completo |
| Notificaciones push (OneSignal) — SDK + Edge Functions | ⚠️ Parcial — SDK integrado, `sync-results` envía push; `google-services.json` + `onesignal-expo-plugin` configurados; falta: rebuild EAS con FCM, desplegar `send-reminders` y `notify-join`, configurar cron |
| Dev build EAS | ⚠️ Pendiente rebuild — APK anterior instalado; hay que rebuild con Firebase FCM (`eas build --profile development --platform android`) |
| Build producción y Google Play | ❌ Pendiente — Fase 5 |

## Roadmap (versiones futuras)

Ver `arch/ARQUITECTURA_RETAGOL.md` para el plan completo. Resumen:

| Versión | Objetivo principal |
|---|---|
| **V1** (actual) | MVP funcional — auth, crear polla con API real, predicciones, resultados sync, ranking |
| V1.5 | Pollas públicas, invitaciones por link, chat, amistades, logros, Pollas Relámpago |
| V2.0 | Moneda virtual (QuiniCoins), comodines, pagos reales (Wompi) |
| V2.5 | Ranking global, temporadas, compartir en redes |
| V3.0 | IA, multi-idioma, dashboard de administración |
