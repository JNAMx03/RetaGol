# RetaGol — Documento de Arquitectura y Hoja de Ruta
**Versión del documento:** 1.1  
**Fecha:** Mayo 2026  
**Última actualización:** Mayo 2026 — V1 MVP implementado con Supabase + football-data.org

---

## 1. REFINAMIENTO DE LA IDEA

### Nombre sugerido del producto
**QuiniPolla** (o variantes: *PollaApp*, *GoalPolla*, *MarcadorPro*)  
→ Para expansión internacional considerar un nombre en inglés: **GoalPool**, **MatchPool**, **ScorePolla**

### Propuesta de valor
Plataforma social de quinielas deportivas que combina predicciones de partidos, mecánicas de juego competitivas (comodines, logros, rankings), economía virtual y pagos reales, con un enfoque inicial en fútbol y dirigida al mercado colombiano con visión de expansión latinoamericana.

### Audiencia objetivo
- **Primario:** Aficionados al fútbol 18–45 años, Colombia
- **Secundario:** Grupos de amigos, oficinas, familias que hacen quinielas informalmente
- **Expansión:** Latinoamérica (México, Argentina, Chile, Perú), después España

---

## 2. STACK TECNOLÓGICO RECOMENDADO

### Frontend (App Móvil)
| Tecnología | Rol | Por qué |
|---|---|---|
| **React Native + Expo** | Framework principal | Híbrido iOS/Android, comunidad enorme, rápido desarrollo |
| **TypeScript** | Lenguaje | Tipado estático, menos bugs, mejor escalabilidad |
| **Expo Router** | Navegación | File-based routing, tabs nativos, deep linking |
| **Zustand** | Estado global | Más simple que Redux, perfecto para este tamaño de app |
| **React Query (TanStack)** | Caché de datos del servidor | Manejo de cache, loading states, sincronización |
| **NativeWind** | Estilos | Tailwind CSS para React Native, consistente y rápido |

### Backend
| Tecnología | Rol | Por qué |
|---|---|---|
| **Supabase** | Backend principal | PostgreSQL + Auth + Realtime + Storage. Alternativa a Azure más simple para arrancar |
| **PostgreSQL** | Base de datos | Relacional, sólido, soportado por Supabase |
| **Supabase Realtime** | WebSockets | Chat en tiempo real, actualizaciones de puntaje en vivo |
| **Supabase Auth** | Autenticación | Email, Google, Facebook, Apple login |
| **Supabase Storage** | Archivos | Fotos de perfil, imágenes de pollas |
| **Edge Functions** | Lógica de negocio | Serverless, corre en Deno, para cálculos de puntaje, pagos |

> **¿Por qué Supabase en vez de Azure?**  
> Azure es excelente para empresas grandes, pero para un solo desarrollador arrancando desde cero, Supabase es:
> - Mucho más rápido de configurar (días vs semanas)
> - Más económico en etapas iniciales (free tier generoso)
> - Open source (puedes migrar a Azure más adelante)
> - Todo en uno: DB + Auth + API + Realtime + Storage
> - Cuando crezcas y necesites más control, puedes migrar a Azure fácilmente

### Servicios Externos
| Servicio | Rol | Estado |
|---|---|---|
| **football-data.org** | Datos de partidos, ligas, fixtures — plan gratuito, cubre temporada actual | ✅ V1 activo |
| **Wompi / Stripe** | Pagos (Wompi para Colombia, Stripe para internacionalización) | V2.0 |
| **OneSignal** | Notificaciones push | V1 pendiente (Fase 3C) |
| **Sentry** | Monitoreo de errores | V1 pendiente |
| **Expo EAS** | Build y distribución de la app | V1 pendiente (Fase 5) |

---

## 3. ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                     QUINIPOLLA APP                          │
│                  (React Native + Expo)                      │
├─────────────────────────────────────────────────────────────┤
│  Presentación    │  Estado         │  Servicios             │
│  - Screens       │  - Zustand      │  - API Client          │
│  - Components    │  - React Query  │  - Auth Service        │
│  - Navigation    │  - Local State  │  - Payment Service     │
└──────────────────┴─────────────────┴───────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │     SUPABASE       │
                    ├────────────────────┤
                    │  Auth              │
                    │  PostgreSQL DB     │
                    │  Realtime          │
                    │  Storage           │
                    │  Edge Functions    │
                    └────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──┐  ┌────────▼────┐  ┌─────▼──────┐
    │ API-Football│  │   Wompi/    │  │ OneSignal  │
    │ (Partidos) │  │   Stripe    │  │   (Push)   │
    └────────────┘  └─────────────┘  └────────────┘
```

### Arquitectura de la App (Carpetas)

```
quinipolla/
├── app/                          # Expo Router (navegación)
│   ├── (auth)/                   # Pantallas sin autenticación
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Pantallas principales (bottom tabs)
│   │   ├── index.tsx             # Tab 1: Home (mis pollas)
│   │   ├── explore.tsx           # Tab 2: Explorar pollas
│   │   ├── store.tsx             # Tab 3: Tienda de comodines
│   │   ├── ranking.tsx           # Tab 4: Clasificación
│   │   └── profile.tsx           # Tab 5: Perfil
│   ├── polla/                    # Pantallas de una polla
│   │   └── [id]/
│   │       ├── predictions.tsx   # Sub-tab: Predicciones
│   │       ├── results.tsx       # Sub-tab: Resultados
│   │       ├── ranking.tsx       # Sub-tab: Ranking
│   │       └── info.tsx          # Sub-tab: Info
│   ├── notifications.tsx         # Pantalla notificaciones
│   └── _layout.tsx               # Layout raíz
│
├── src/
│   ├── components/               # Componentes reutilizables
│   │   ├── ui/                   # Botones, inputs, cards, modales
│   │   ├── polla/                # Componentes específicos de polla
│   │   ├── match/                # Componentes de partido
│   │   └── shared/               # Header, Footer, etc.
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── usePollas.ts
│   │   └── useNotifications.ts
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── services/                 # Llamadas a APIs externas
│   │   ├── supabase.ts           # Cliente Supabase
│   │   ├── footballApi.ts        # API-Football
│   │   └── payments.ts           # Wompi/Stripe
│   │
│   ├── types/                    # Interfaces TypeScript
│   │   ├── polla.types.ts
│   │   ├── match.types.ts
│   │   └── user.types.ts
│   │
│   ├── utils/                    # Funciones utilitarias
│   │   ├── scoring.ts            # Lógica de puntajes
│   │   └── formatters.ts         # Formateo de fechas, monedas
│   │
│   └── constants/                # Constantes de la app
│       ├── colors.ts
│       └── config.ts
│
├── assets/                       # Imágenes, fuentes, íconos
├── supabase/                     # Esquema de DB y Edge Functions
│   ├── migrations/
│   └── functions/
└── docs/                         # Documentación del proyecto
```

---

## 4. MODELO DE DATOS (Base de Datos)

### Tablas V1 — Implementadas en Supabase

```sql
-- Perfiles de usuario (sincronizado con Supabase Auth vía trigger)
profiles (
  id uuid references auth.users primary key,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz
)

-- Pollas
pools (
  id uuid primary key,
  name text,
  type text,                          -- código del torneo (ej: 'WC', 'CL', 'PD')
  code text unique,                   -- código de invitación (ej: 'L4521')
  creator_id uuid references profiles,
  participants int default 1,
  status text default 'active',       -- 'active' | 'finished'
  scoring_config jsonb,               -- { exact, oneTeam, winner, goalDiff }
  created_at timestamptz
)

-- Participantes de una polla
pool_participants (
  pool_id uuid references pools,
  user_id uuid references profiles,
  joined_at timestamptz,
  primary key (pool_id, user_id)
)

-- Partidos de una polla
matches (
  id text primary key,                -- '{pool_id}_{api_id}'
  pool_id uuid references pools,
  home text,
  away text,
  date text,                          -- formateado para mostrar en UI
  home_score text,                    -- null hasta que termine el partido
  away_score text,
  api_id int,                         -- ID real de football-data.org (para sync-results)
  created_at timestamptz
)

-- Predicciones
predictions (
  id uuid primary key,
  pool_id uuid references pools,
  match_id text references matches,
  user_id uuid references profiles,
  home_score text,
  away_score text,
  submitted_at timestamptz,
  unique (pool_id, match_id, user_id)
)
```

### Tablas V1.5 — Planificadas (ver `V1_5_PLAN.md`)

```sql
-- Amistades, chat de polla, logros disponibles, logros de usuario
-- Columnas adicionales en pools: visibility ('public'|'private'), invite_token
-- Columnas adicionales en profiles: username (único)
```

### Tablas V2.0+ — Planificadas (ver `V2_0_PLAN.md`)

```sql
-- Comodines (jokers), inventario, transacciones, notificaciones
-- Columnas adicionales en pools: entry_fee, prize_distribution
-- Columnas adicionales en pool_participants: total_points, rank, paid_at
```

---

## 5. PANTALLAS POR VERSIÓN

### VERSIÓN 1.0 — La Base (MVP)
**Objetivo:** App funcional, bonita, con el núcleo del negocio.

#### Pantallas
```
AUTH
  ├── Login (email/password)
  └── Registro

HOME (pantalla principal única)
  ├── Header: [☰ Menú] — "Mis Pollas" — [🔔 Notificaciones]
  ├── Lista de mis pollas activas (FlatList de PoolCards)
  ├── Footer: [+ Crear Polla]  [Unirse]
  └── Menú lateral (slide desde izquierda):
        ├── Avatar con iniciales + nombre + email
        ├── Estadísticas: pollas, puntos totales, victorias
        ├── Próximamente: Explorar (V1.5), Tienda (V2.0), Ranking (V2.5)
        ├── Configuración: Cuenta, App
        └── Cerrar sesión

POLLA (pantalla interna con 4 sub-tabs)
  ├── Predicciones — Ingresar marcadores de cada partido
  ├── Resultados — Ver marcadores reales y mis puntos
  ├── Clasificación — Tabla de posiciones de participantes
  └── Info — Datos de la polla, reglas, participantes
```

#### Flujo de navegación V1
```
Stack (raíz)
├── Login → Register              (si !isLogged)
└── Home                          (si isLogged)
      ├── CreatePool   (push sobre Home)
      ├── JoinPool     (push sobre Home)
      └── PoolDetail (PoolTabsNavigator)
            ├── Predicciones
            ├── Resultados
            ├── Clasificación
            └── Info
```

#### Funcionalidades V1 — Estado de implementación

| Funcionalidad | Estado |
|---|---|
| Registro e inicio de sesión (email + contraseña, Supabase Auth) | ✅ |
| Crear polla seleccionando torneo de football-data.org (solo no iniciados) | ✅ |
| Partidos guardados automáticamente con `api_id` real | ✅ |
| Puntajes configurables por polla (4 criterios editables) | ✅ guardado en DB |
| Edge Function `sync-results` para actualizar marcadores automáticamente | ✅ desplegada |
| Pull-to-refresh en Resultados activa la sincronización | ✅ |
| Ver pollas en las que participo | ✅ |
| Ingresar predicciones (upsert en Supabase) | ✅ |
| Ver resultados y puntajes calculados en cliente | ✅ |
| Clasificación interna con datos reales de Supabase | ✅ |
| Perfil de usuario en menú lateral | ✅ |
| Resultados/Clasificación respetan scoring configurable de la polla | ⚠️ pendiente |
| Notificaciones push (OneSignal) | ❌ Fase 3C |
| Build y publicación (EAS) | ❌ Fase 5 |

#### Lo que NO tiene V1
- Bottom tabs (hay un solo Home con menú lateral)
- Pagos reales
- Comodines
- Chat
- Pollas públicas / sección Explorar (V1.5)
- Pollas Relámpago con partidos a la carta de varias ligas (V1.5)
- Ranking global (V2.5)
- Logros (V1.5)

---

### VERSIÓN 1.5 — Sociabilidad y Descubrimiento

- Pollas públicas (sección Explorar funcional)
- Sistema de solicitudes para unirse a pollas
- Código / link de invitación para pollas privadas
- Sistema de amistades
- Seguir a usuarios
- Chat dentro de la polla
- Sistema de logros básico (5–10 logros)
- Mejoras de UI/UX basadas en feedback

---

### VERSIÓN 2.0 — Economía del Juego

- Moneda virtual (QuiniCoins)
- Tienda de comodines funcional
- Comodines activos durante partidos
- Pollas con entrada de pago (Wompi Colombia)
- Distribución de premios
- Historial de transacciones
- Pollas avanzadas (esquinas, amarillas, etc.)

---

### VERSIÓN 2.5 — Competencia y Retención

- Ranking global / por país / por temporada
- Sistema de niveles y categorías (Amateur → Clase Mundial)
- Temporadas de 12 meses
- Compartir victorias en redes sociales
- Pollas con partidos de múltiples ligas
- Estadísticas detalladas de usuario

---

### VERSIÓN 3.0 — IA y Expansión

- Sugerencias de pollas por IA según historial
- Predicciones asistidas por IA (sin garantías, solo sugerencias)
- Soporte multi-país (Stripe para internacionalización)
- Soporte multi-idioma (español, inglés, portugués)
- Notificaciones inteligentes por presupuesto e intereses
- Dashboard de administración web (para ti como creador)

---

## 6. SISTEMA DE PUNTAJES (Lógica de Negocio)

### Polla Clásica — Marcador exacto
| Acierto | Puntos por defecto (configurable) |
|---|---|
| Marcador exacto (ej. 2-1 y fue 2-1) | 5 pts |
| Marcador de un equipo (ej. Local=2, visitante errado) | 2 pts |
| Ganador correcto (ej. Local gana, marcador errado) | 1 pt |
| Empate correcto (pero marcador errado) | 1 pt |
| Diferencia de goles correcta | 1 pt |
| Ningún acierto | 0 pts |

*El creador puede modificar estos valores al crear la polla.*

### Con Comodín activado
- Se aplica el efecto del comodín
- Los puntos ganados se reducen un % (ej. 50%)
- El comodín se consume del inventario

---

## 7. SISTEMA DE COMODINES

| Comodín | Efecto | Costo |
|---|---|---|
| **Gol Extra** | Añade 1 gol al equipo que elijas en un partido en curso | 50 coins |
| **Cambio de Marcador** | Modifica tu predicción una vez iniciado el partido (hasta min 60) | 80 coins |
| **Seguro de Empate** | Si predijiste un ganador y empataron, ganas puntos de empate igual | 40 coins |
| **Doblete** | Duplica los puntos de UN partido específico | 100 coins |
| **Comodín Fantasma** | Oculta tu predicción del ranking hasta que termine el partido | 60 coins |

---

## 8. FLUJO DE CREACIÓN DE UNA POLLA

### V1 — Polla por Torneo (MVP)

El usuario selecciona un torneo completo. La app muestra **solo torneos que aún no han comenzado y tienen fixtures confirmados**. Al seleccionar uno, se muestran datos básicos (total de partidos y fecha de inicio) — no la lista completa. Los partidos se guardan en la BD con su `api_id` real para sincronización automática de resultados.

```
1. Usuario toca "Crear Polla"
2. Escribe el nombre de la polla
3. Ve la lista de torneos disponibles:
     - Solo torneos con startDate > hoy (no iniciados)
     - Solo torneos con fixtures confirmados en la API
     - Ejemplos: Mundial 2026, próxima Champions, etc.
4. Selecciona un torneo → ve resumen del torneo:
     - Total de partidos programados
     - Fecha de inicio del torneo
     - (No se muestra la lista completa de partidos)
5. Configura los puntajes de la polla:
     - Marcador exacto        → por defecto 5 pts (editable)
     - Un equipo exacto       → por defecto 2 pts (editable)
     - Ganador correcto       → por defecto 1 pt  (editable)
     - Diferencia de goles    → por defecto 1 pt  (editable)
6. Crea la polla
7. La app guarda todos los partidos del torneo en Supabase con su api_id real
8. El creador recibe un código de invitación para compartir
```

> **Nota técnica:** Al abrir CreatePool, la app consulta la API para cada torneo y filtra los que ya iniciaron (`currentSeason.startDate > hoy`). Al seleccionar uno, se obtienen los partidos programados (SCHEDULED). Cada partido se guarda con su `api_id` real para que la Edge Function `sync-results` actualice marcadores automáticamente.

> **V1.5 — Pollas Relámpago:** En esta versión sí se podrán usar torneos en curso, ya que el usuario elige partidos específicos del calendario (no el torneo completo). Ver `V1_5_PLAN.md`.

### V1.5 — Pollas Relámpago (Flash Pools)

Ver detalles en `V1_5_PLAN.md`. El usuario podrá seleccionar partidos a la carta de distintas ligas para crear pollas temáticas de corta duración (un fin de semana, una semana, un mes).

```
1. Usuario toca "Crear Polla Relámpago"
2. Escribe nombre y define duración (fin de semana / semana / mes / fecha exacta)
3. Explora partidos disponibles por liga o fecha
4. Selecciona los partidos que quiere incluir (de una o varias ligas)
5. Configura puntajes y visibilidad
6. Crea la polla
```

### V2.0+ — Polla con Pago

Extensión del flujo V1 o V1.5 con campos adicionales de entrada económica y distribución de premios. Ver `V2_0_PLAN.md`.

---

## 9. METODOLOGÍA DE DESARROLLO

### Metodología: **Agile Personal (Sprints semanales)**
Como desarrollador solo, adaptamos Scrum a tu ritmo:

- **Sprint:** 1–2 semanas
- **Backlog:** Lista priorizada de funcionalidades
- **Definition of Done:** La feature funciona, tiene manejo de errores, se ve bien
- **Review:** Al final de cada versión, prueba con usuarios reales (amigos, familia)
- **Retrospectiva:** ¿Qué mejorar en el proceso?

### Herramientas de gestión
- **GitHub Projects** o **Notion** → Kanban de tareas
- **GitHub** → Repositorio con ramas por versión (`main`, `develop`, `feature/nombre`)
- **Figma** → Wireframes y diseño (free tier)
- **Postman** → Pruebas de API

### Flujo de ramas (Git Flow simplificado)
```
main          → código en producción (siempre estable)
develop       → integración de features
feature/xxx   → cada funcionalidad nueva
hotfix/xxx    → correcciones urgentes en producción
```

---

## 10. GUÍA DE PASOS PARA COMENZAR

### FASE 0 — Preparación (Esta semana)
1. Instalar herramientas: Node.js, Git, VS Code, Expo CLI
2. Crear cuenta en: Supabase, GitHub, Expo (eas)
3. Crear cuenta en: Figma (wireframes)
4. Crear cuenta en: API-Football (RapidAPI) — plan gratuito para arrancar

### FASE 1 — Diseño (1–2 semanas)
1. Diseñar wireframes de todas las pantallas de V1 en Figma
2. Definir paleta de colores, tipografía, estilo visual
3. Diseñar el logo e ícono de la app

### FASE 2 — Configuración del proyecto (1 semana)
1. Inicializar proyecto Expo con TypeScript
2. Configurar Expo Router (tabs y rutas)
3. Conectar Supabase (auth, db)
4. Configurar estructura de carpetas
5. Configurar NativeWind (estilos)
6. Crear las tablas en Supabase

### FASE 3 — Desarrollo V1 (4–6 semanas)
1. Pantallas de Auth (login, registro, onboarding)
2. Navigation (tabs + nested screens)
3. Home con lista de pollas
4. Pantalla interna de polla (4 sub-tabs)
5. Crear polla (formulario completo)
6. Sistema de predicciones
7. Cálculo de puntajes (Edge Function)
8. Integración de marcadores reales (API-Football)
9. Pantalla de perfil y configuración
10. Notificaciones push (OneSignal)

### FASE 4 — QA y Lanzamiento V1 (1 semana)
1. Pruebas manuales en iOS y Android
2. Corrección de bugs
3. Build con EAS (Expo Application Services)
4. Publicar en Google Play (beta cerrada)
5. Publicar en TestFlight (iOS)

### FASE 5 y siguientes → Desarrollo iterativo de V1.5, V2.0, V2.5, V3.0

---

## 11. IDEAS ADICIONALES PARA ENRIQUECER LA APP

### Engagement y retención
- **Racha diaria:** Premio en coins por acceder X días seguidos
- **Modo espectador:** Ver en tiempo real cómo van las predicciones de otros (después de que el partido empiece)
- **Mini-torneos:** Pollas flash de 24 horas para partidos únicos
- **Pollas de Clásicos:** Templates prearmados para los grandes partidos (El Clásico, Copa Libertadores, etc.)
- **Desafío 1 vs 1:** Retar a un amigo en un partido específico

### Monetización adicional
- **Coins de regalo:** El creador de la polla puede regalar coins a participantes como premio especial
- **Pollas premium:** Diseño exclusivo, más comodines incluidos
- **Publicidad no intrusiva:** Banner sutil solo en pollas gratuitas (versión avanzada)
- **Suscripción Pro:** Sin comisiones al crear pollas, más comodines por mes

### Social
- **Reacciones en resultados:** 🔥😱🤣 cuando sale un resultado inesperado
- **Memes de resultados:** Generador automático de meme con el marcador y los puntajes
- **Tabla de Shame:** El último lugar recibe una "corona de vergüenza" animada (con buen humor)
- **Stories de resultados:** Resumen visual de la jornada para compartir en Instagram/WhatsApp

---

## 12. CONSIDERACIONES LEGALES Y DE NEGOCIO

- **Registro de empresa:** Para manejar pagos reales necesitas una empresa registrada en Colombia (SAS es la más simple)
- **Cuentas de cobro:** Wompi requiere empresa o persona natural con RUT
- **Términos y condiciones + Política de privacidad:** Necesarios desde V1 para publicar en las tiendas
- **Regulación de apuestas:** En Colombia las apuestas con dinero real requieren licencia de Coljuegos. Considera empezar con moneda virtual y premios no monetarios, o consultar un abogado especializado.
- **GDPR / LGPD:** Para expansión a Europa / Brasil, preparar cumplimiento de protección de datos

---

## PRÓXIMO PASO

Con este documento claro, el siguiente paso es:

1. **Configurar el entorno de desarrollo** (Node, Expo, VS Code, extensiones)
2. **Crear el proyecto base** con Expo + TypeScript + Expo Router
3. **Conectar Supabase** y crear las primeras tablas
4. **Levantar las primeras pantallas** con navegación funcional

¿Comenzamos con la configuración del entorno?
