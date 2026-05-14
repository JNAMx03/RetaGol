# QuiniPolla — Documento de Arquitectura y Hoja de Ruta
**Versión del documento:** 1.0  
**Fecha:** Mayo 2026  
**Autor:** Arquitecto de Software Senior

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
| Servicio | Rol |
|---|---|
| **API-Football** (RapidAPI) | Datos de partidos, ligas, marcadores en vivo |
| **Wompi / Stripe** | Pagos (Wompi para Colombia, Stripe para internacionalización) |
| **OneSignal** | Notificaciones push |
| **Sentry** | Monitoreo de errores |
| **Expo EAS** | Build y distribución de la app |

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

### Tablas principales

```sql
-- Usuarios
users (
  id, email, username, full_name, avatar_url,
  country, city, balance_coins, created_at
)

-- Pollas (Quinielas)
pools (
  id, creator_id, name, description, competition_id,
  type (classic|advanced), status (draft|open|active|finished),
  visibility (public|private), invite_code,
  entry_fee, prize_distribution (jsonb),
  scoring_config (jsonb), joker_config (jsonb),
  max_participants, created_at, starts_at, ends_at
)

-- Participantes de una polla
pool_participants (
  id, pool_id, user_id, status (pending|active|rejected),
  total_points, rank, paid_at, joined_at
)

-- Competiciones (ligas, torneos)
competitions (
  id, name, country, season, logo_url, api_id
)

-- Partidos
matches (
  id, competition_id, home_team, away_team,
  home_score, away_score, status, kickoff_at,
  api_id, extra_stats (jsonb)
)

-- Partidos dentro de una polla
pool_matches (
  id, pool_id, match_id, order_index,
  prediction_deadline
)

-- Predicciones del usuario
predictions (
  id, pool_match_id, user_id,
  predicted_home, predicted_away,
  extra_predictions (jsonb),
  points_earned, joker_used, submitted_at
)

-- Comodines
jokers (
  id, name, description, type, cost_coins, effect (jsonb)
)

-- Inventario de comodines del usuario
user_jokers (
  id, user_id, joker_id, quantity, acquired_at
)

-- Notificaciones
notifications (
  id, user_id, type, title, body, data (jsonb),
  read, created_at
)

-- Logros
achievements (
  id, name, description, icon, condition (jsonb)
)

user_achievements (
  id, user_id, achievement_id, earned_at
)

-- Amistades
friendships (
  id, requester_id, addressee_id, status (pending|accepted), created_at
)

-- Chat de polla
pool_messages (
  id, pool_id, user_id, content, created_at
)

-- Transacciones
transactions (
  id, user_id, type (deposit|withdrawal|pool_entry|prize),
  amount, currency, status, reference, created_at
)
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

#### Funcionalidades V1
- Registro e inicio de sesión (email + contraseña)
- Crear polla clásica (solo marcador) con partidos de una liga/copa/champions
- Ver pollas en las que participo
- Ingresar predicciones antes del tiempo límite
- Ver resultados y puntajes automáticamente calculados
- Clasificación dentro de la polla
- Perfil de usuario y configuración en menú lateral
- Notificaciones básicas (invitación recibida, partido próximo)

#### Lo que NO tiene V1
- Bottom tabs (hay un solo Home con menú lateral)
- Pagos reales
- Comodines
- Chat
- Pollas públicas/explorar (V1.5)
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

```
1. Usuario toca "Crear Polla"
2. Selecciona tipo: Clásica / Avanzada
3. Selecciona fuente de partidos:
     a. Por competición completa (ej. Liga BetPlay jornada 15)
     b. Partidos a la carta (escoge de varias ligas)
4. Configura:
     - Nombre y descripción
     - Visibilidad (Pública / Privada)
     - Entrada (gratis / con pago)
     - Distribución de premios (% por posición)
     - Puntajes por tipo de acierto
     - Comodines permitidos (sí/no)
     - Máximo de participantes
     - Fecha límite de predicciones
5. Paga para crear (en versión 2.0+)
6. Recibe código/link de invitación
7. La polla queda visible (si es pública) o solo por código (si es privada)
```

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
