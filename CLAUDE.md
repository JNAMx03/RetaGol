# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

RetaGol es una app de quinielas deportivas en React Native (Expo). Los usuarios crean o se unen a pollas, predicen marcadores de partidos, y compiten en un ranking de puntos.

## Tech Stack

- React Native 0.81 + Expo SDK 54, TypeScript strict mode
- React Navigation v7: Native Stack (flujo principal) + Bottom Tabs (tabs principales + detalle de polla)
- React Context API (`useApp()` hook) + AsyncStorage para persistencia local
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

## Architecture — Versión 1 (actual)

### State (`context/AppContext.tsx`)

Contexto global único. Tipos exportados: `CompetitionType`, `Match`, `Pool`, `User`.

Estado clave:
- `user`: `{ id, name, email }` — guardado en AsyncStorage; sin backend real todavía
- `isLogged`: booleano; controla qué flujo muestra el navegador
- `pools`: array de `Pool` — cada pool tiene `{ id, name, type, code, participants, matches, createdAt }`
- `predictions`: `{ [poolId]: { [userId]: Match[] } }` — scope doble para evitar leakage entre pools

Funciones del contexto: `login(email, name)`, `logout()`, `createPool(name, type, matches)`,
`getPredictionsByPool(poolId)`, `savePredictionsByPool(poolId, matches)`, `clearAllData()`.

### Navigation (`navigation/`)

- `AppNavigator.tsx`: stack raíz; usa `isLogged` para alternar entre flujo auth y flujo app
- `PoolTabsNavigator.tsx`: 4 tabs del detalle de polla; incluye header personalizado con flecha atrás
- **No hay bottom tabs en V1** — la app tiene una sola pantalla Home con menú lateral deslizante

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

Lógica de puntuación compartida entre ResultsScreen y StandingsScreen:

```
Exacto (5 pts)     → marcador exacto
Parcial (2 pts)    → un equipo exacto (local O visitante)
Ganador (1 pt)     → resultado correcto (1X2), marcador distinto
Diferencia (1 pt)  → diferencia de goles igual, ganador incorrecto
Sin acierto (0 pts)
```

Exporta: `getResultType()`, `POINTS`, `BADGE_COLORS`, `BADGE_LABELS`.

### Screens (`screens/`)

**Auth:**
- `auth/LoginScreen`: fondo azul `#2563EB`, formulario en tarjeta blanca, llama `login()`
- `auth/RegisterScreen`: fondo verde `#16A34A`, 4 campos, llama `login()`

**App (pantalla principal):**
- `app/HomeScreen`: header (☰ + título + 🔔) + FlatList de PoolCards + footer (Crear/Unirse) + menú lateral animado con perfil del usuario, stats, accesos a features futuras (Explorar/Tienda/Ranking), ajustes y logout

**App (flujo de pools):**
- `app/CreatePoolScreen`: nombre, selector Liga/Copa/Champions, partidos predefinidos según tipo
- `app/JoinPoolScreen`: input de código (auto-uppercase); conectar con backend en V2
- `app/pool/PredictionsScreen`: FlatList de MatchCards editables + botón Guardar
- `app/pool/ResultsScreen`: marcadores reales (hardcoded en `MOCK_RESULTS`) + badge de puntos
- `app/pool/StandingsScreen`: tabla con `MOCK_PARTICIPANTS` ordenados por puntos; resalta al usuario actual
- `app/pool/InfoScreen`: datos del pool + descripción del torneo + acordeón sistema de puntuación

### Components (`components/`)

- `MatchCard.tsx`: tarjeta de partido con inputs numéricos; `onChange(id, field, value)`
- `PoolCard.tsx`: tarjeta de pool con badge de tipo (color según competición) y código de acceso

## Key Patterns

- **Pool-scoped predictions**: siempre `predictions[poolId][userId]` — mezclarlos causó un bug de leakage en el pasado
- **SafeAreaView**: importar siempre de `react-native-safe-area-context`, nunca de `react-native`
- **Iconos**: NO usar `@expo/vector-icons`; usar emojis dentro de `<Text style={{ fontSize: N }}>` 
- **Colores base**: slate `#64748B`, green `#16A34A`, blue `#2563EB`, bg `#F1F5F9`, white `#FFFFFF`
  - Liga → `#16A34A` | Copa → `#EAB308` | Champions → `#2563EB`
  - Exacto → `#16A34A` | Parcial → `#2563EB` | Ganador/Diff → `#EAB308` | Sin acierto → `#94A3B8`
- **Comentarios**: escritos en español; mantener ese estilo al agregar comentarios
- **Datos mock**: `MOCK_RESULTS` y `MOCK_PARTICIPANTS` en Results/StandingsScreen — reemplazar con API real en V2

## Roadmap (versiones futuras)

Ver `ARQUITECTURA_RETAGOL.md` para el plan completo. Resumen:

| Versión | Objetivo principal |
|---|---|
| **V1** (actual) | MVP funcional — auth, crear polla, predicciones, resultados, ranking local |
| V1.5 | Pollas públicas, invitaciones, chat, amistades, logros |
| V2.0 | Moneda virtual (QuiniCoins), comodines, pagos reales (Wompi) |
| V2.5 | Ranking global, temporadas, compartir en redes |
| V3.0 | IA, multi-idioma, dashboard de administración |

### Stack planeado para V2+ (requiere migración)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Estado**: Zustand + React Query (reemplaza Context + AsyncStorage)
- **Navegación**: Expo Router (reemplaza React Navigation manual)
- **Estilos**: NativeWind (reemplaza StyleSheet manual)
- **API de partidos**: API-Football (RapidAPI)
- **Pagos**: Wompi (Colombia) / Stripe (internacional)
- **Push**: OneSignal
