# Plan de Desarrollo — Versión 1.0 (MVP)

RetaGol V1 es el MVP funcional de la app: autenticación real, crear y unirse a pollas, ingresar predicciones, ver resultados con puntuación automática y una clasificación interna por polla. Sin pagos, sin comodines, sin chat.

**Diseño de navegación V1:** una sola pantalla Home (sin tabs inferiores) con un menú lateral deslizante que incluye el perfil del usuario, accesos futuros y el logout. El detalle de cada polla conserva sus 4 sub-tabs.

---

## Flujo de navegación

```
Stack (AppNavigator)
├── Login → Register              (si !isLogged)
└── Home                          (si isLogged)
      ├── Menú lateral (slide desde izquierda):
      │     ├── Avatar + nombre + email
      │     ├── Stats: pollas, puntos, victorias
      │     ├── Próximamente: Explorar, Tienda, Ranking
      │     ├── Ajustes: Cuenta, App
      │     └── Cerrar sesión
      ├── CreatePool   (push)
      ├── JoinPool     (push)
      └── PoolDetail (PoolTabsNavigator)
            ├── Predicciones
            ├── Resultados
            ├── Clasificación
            └── Info
```

---

## Estado actual (Mayo 2026)

| Área | Estado | Notas |
|---|---|---|
| Auth (Login/Register) | ✅ Completo | Supabase Auth con perfil automático vía trigger |
| Home con menú lateral | ✅ Completo | — |
| Pool tabs (4 sub-tabs) | ✅ Completo | — |
| Crear polla con torneos reales (football-data.org) | ✅ Completo | Solo torneos no iniciados con fixtures; resumen al seleccionar |
| Scoring configurable por polla | ✅ Completo | Guardado en `pools.scoring_config` (jsonb) |
| Partidos guardados con `api_id` real | ✅ Completo | Permite sync automático vía Edge Function |
| Edge Function `sync-results` | ✅ Completo | Desplegada; activada por pull-to-refresh en ResultsScreen |
| Predicciones | ✅ Completo | Upsert en Supabase |
| Resultados con pull-to-refresh | ✅ Completo | Llama `sync-results` luego recarga marcadores |
| Clasificación interna | ✅ Completo | Datos reales de Supabase |
| Unirse a polla por código | ✅ Completo | Conectado con Supabase |
| Results/Standings con scoring configurable | ⚠️ Pendiente | Aún usan `POINTS` fijo; cambiar a `getPoints(type, pool.scoringConfig)` |
| Perfil con stats (menú lateral) | ⚠️ Parcial | Stats calculadas desde DB pendientes |
| Notificaciones push | ❌ Pendiente | OneSignal — Fase 3C |
| Build y publicación | ❌ Pendiente | EAS — Fase 5 |

---

## Fase 0 — Preparación

### 0.1 Herramientas locales
- [ ] Node.js 18 LTS instalado (`node -v`)
- [ ] Git instalado y configurado (`git config --global user.name`)
- [ ] VS Code con extensiones: ES7 Snippets, Prettier, ESLint, React Native Tools
- [ ] Android Studio instalado y emulador configurado
- [ ] Expo CLI: `npm install -g expo-cli eas-cli`
- [ ] Expo Go instalado en dispositivo físico (para pruebas rápidas)

### 0.2 Cuentas y servicios
- [x] Cuenta en [Supabase](https://supabase.com) — proyecto `retagol-prod` creado y conectado
- [ ] Cuenta en [Expo](https://expo.dev) — crear proyecto `retagol`
- [x] Cuenta en [football-data.org](https://www.football-data.org/client/register) — plan gratuito, cubre temporada actual
- [ ] Cuenta en [OneSignal](https://onesignal.com) — plan gratuito
- [ ] Cuenta en [Sentry](https://sentry.io) — plan gratuito para monitoreo de errores

### 0.3 Variables de entorno
Archivo `.env` en la raíz del proyecto (nunca subir a Git — ya está en `.gitignore`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_FOOTBALL_DATA_KEY=tu_key_de_football_data_org
EXPO_PUBLIC_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Secretos en Supabase (para Edge Functions — nunca van al cliente):
```bash
supabase secrets set FOOTBALL_DATA_KEY=tu_key_de_football_data_org
```

---

## Fase 1 — Diseño

### 1.1 Wireframes en Figma
Diseñar en Figma (free tier) antes de implementar cualquier pantalla nueva:

- Splash / Onboarding (3 slides con propuesta de valor)
- Login y Register (ya implementados — validar contra prototipo)
- Home con lista de pollas (ya implementado)
- Crear polla — revisar si el formulario necesita mejoras
- Detalle de polla: 4 sub-tabs (ya implementados)
- Pantalla de Notificaciones

### 1.2 Identidad visual
- [ ] Definir paleta de colores oficial (base ya existe: blue `#2563EB`, green `#16A34A`, etc.)
- [ ] Elegir tipografía (actualmente usa la del sistema — considerar `Inter` o `Poppins`)
- [ ] Diseñar logo e ícono de la app (para `assets/icon.png` y `assets/adaptive-icon.png`)
- [ ] Diseñar splash screen

---

## Fase 2 — Configuración de Supabase

### 2.1 Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com) → New Project
2. Nombre: `retagol-prod`
3. Base de datos: elegir región más cercana (Miami o São Paulo para Colombia)
4. Guardar la URL y la `anon key` en `.env`

### 2.2 Habilitar autenticación
En el panel de Supabase → Authentication → Providers:
- [ ] Email/Password: habilitar
- [ ] Google OAuth: configurar (necesita app en Google Cloud Console)
- [ ] Confirmar email: deshabilitar en desarrollo, habilitar en producción

### 2.3 Crear tablas en PostgreSQL

Ejecutar estas migraciones en el SQL Editor de Supabase:

```sql
-- Perfiles de usuario (sincronizado con Supabase Auth)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table profiles enable row level security;
create policy "usuarios pueden ver su propio perfil"
  on profiles for select using (auth.uid() = id);
create policy "usuarios pueden actualizar su propio perfil"
  on profiles for update using (auth.uid() = id);

-- Trigger: crear perfil automáticamente al registrarse
create function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

```sql
-- Pollas
create table pools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('liga', 'copa', 'champions')),
  code text unique not null,
  creator_id uuid references profiles(id) on delete cascade not null,
  participants int default 1,
  status text default 'active' check (status in ('active', 'finished')),
  created_at timestamptz default now()
);

alter table pools enable row level security;
create policy "cualquiera puede ver pollas"
  on pools for select using (true);
create policy "solo el creador puede editar"
  on pools for update using (auth.uid() = creator_id);
```

```sql
-- Participantes de una polla
create table pool_participants (
  pool_id uuid references pools(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (pool_id, user_id)
);

alter table pool_participants enable row level security;
create policy "participantes pueden verse"
  on pool_participants for select using (true);
```

```sql
-- Partidos de una polla
create table matches (
  id text primary key,  -- ej: 'ch1', 'l3' — o UUID cuando vengan de API-Football
  pool_id uuid references pools(id) on delete cascade,
  home text not null,
  away text not null,
  date text not null,
  home_score text,      -- null hasta que haya resultado real
  away_score text,
  created_at timestamptz default now()
);

alter table matches enable row level security;
create policy "cualquiera puede ver partidos"
  on matches for select using (true);
```

```sql
-- Predicciones
create table predictions (
  id uuid default gen_random_uuid() primary key,
  pool_id uuid references pools(id) on delete cascade,
  match_id text references matches(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  home_score text not null,
  away_score text not null,
  submitted_at timestamptz default now(),
  unique (pool_id, match_id, user_id)  -- una predicción por partido por usuario
);

alter table predictions enable row level security;
create policy "usuarios ven sus propias predicciones"
  on predictions for select using (auth.uid() = user_id);
create policy "usuarios guardan sus predicciones"
  on predictions for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus predicciones"
  on predictions for update using (auth.uid() = user_id);
```

### 2.4 Instalar cliente Supabase

```bash
npx expo install @supabase/supabase-js
npx expo install expo-secure-store
```

Crear `services/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## Fase 3 — Desarrollo Backend

### 3.1 Autenticación con Supabase

Reemplazar la lógica mock en `context/AppContext.tsx`:

**Login:**
```typescript
// Reemplazar: setUser({ id: Date.now().toString(), name, email }); setIsLogged(true);
// Por:
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
// El trigger de Supabase ya creó el perfil; leer de 'profiles'
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user.id)
  .single();
setUser(profile);
setIsLogged(true);
```

**Register:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { name } }  // el trigger lo inserta en profiles
});
```

**Logout:**
```typescript
await supabase.auth.signOut();
setUser(null);
setIsLogged(false);
```

**Recuperar sesión al abrir la app:**
```typescript
// En AppProvider useEffect:
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  setUser(profile);
  setIsLogged(true);
}
```

### 3.2 Crear polla con backend

En `context/AppContext.tsx`, reemplazar `createPool()`:

```typescript
async function createPool(name: string, type: CompetitionType, matches: Match[]) {
  const code = generateCode(type);  // mantener la función actual

  // 1. Insertar polla
  const { data: pool, error } = await supabase
    .from('pools')
    .insert({ name, type, code, creator_id: user.id })
    .select()
    .single();
  if (error) throw error;

  // 2. Insertar partidos
  const matchRows = matches.map(m => ({ ...m, pool_id: pool.id }));
  await supabase.from('matches').insert(matchRows);

  // 3. Unir al creador como primer participante
  await supabase.from('pool_participants').insert({ pool_id: pool.id, user_id: user.id });

  // 4. Actualizar estado local
  setPools(prev => [...prev, pool]);
}
```

### 3.3 Unirse a polla por código

En `JoinPoolScreen.tsx`:

```typescript
async function joinByCode(code: string) {
  // 1. Buscar la polla por código
  const { data: pool, error } = await supabase
    .from('pools')
    .select('*, matches(*)')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !pool) {
    Alert.alert('Código inválido', 'No se encontró ninguna polla con ese código.');
    return;
  }

  // 2. Verificar que el usuario no esté ya dentro
  const { data: existing } = await supabase
    .from('pool_participants')
    .select('user_id')
    .eq('pool_id', pool.id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    Alert.alert('Ya estás en esta polla', 'Navega a Home para verla.');
    return;
  }

  // 3. Registrar participante
  await supabase.from('pool_participants').insert({ pool_id: pool.id, user_id: user.id });
  await supabase.from('pools').update({ participants: pool.participants + 1 }).eq('id', pool.id);

  // 4. Navegar a la polla
  navigation.navigate('PoolDetail', { pool });
}
```

### 3.4 Predicciones con backend

En `context/AppContext.tsx`, reemplazar `savePredictionsByPool()`:

```typescript
async function savePredictionsByPool(poolId: string, preds: Match[]) {
  const rows = preds.map(p => ({
    pool_id: poolId,
    match_id: p.id,
    user_id: user.id,
    home_score: p.homeScore,
    away_score: p.awayScore,
  }));

  // upsert: crea o actualiza si ya existe (unique constraint)
  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'pool_id,match_id,user_id' });

  if (error) throw error;

  // Actualizar estado local también
  setPredictions(prev => ({
    ...prev,
    [poolId]: { ...prev[poolId], [user.id]: preds },
  }));
}
```

Reemplazar `getPredictionsByPool()`:
```typescript
async function getPredictionsByPool(poolId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', user.id);

  if (error || !data) return [];

  return data.map(p => ({
    id: p.match_id,
    homeScore: p.home_score,
    awayScore: p.away_score,
  }));
}
```

### 3.5 Cargar mis pollas al iniciar

Reemplazar la carga mock de pools:

```typescript
async function loadPools() {
  const { data, error } = await supabase
    .from('pool_participants')
    .select('pool:pools(*, matches(*))')
    .eq('user_id', user.id);

  if (error) return;
  const myPools = data.map(row => row.pool).filter(Boolean);
  setPools(myPools);
}
```

---

## Fase 3B — Integración de Resultados Reales

**API utilizada:** football-data.org (plan gratuito — cubre temporada actual, 10 req/min)

### 3B.1 Servicio cliente en la app

Crear `services/footballDataApi.ts`:

```typescript
const BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_DATA_KEY!;

// Torneos disponibles en V1
export const TOURNAMENTS = [
  { code: 'CL',  name: 'Champions League',  color: '#1E40AF' },
  { code: 'WC',  name: 'Mundial 2026',       color: '#15803D' },
  { code: 'PD',  name: 'La Liga',            color: '#B91C1C' },
  { code: 'CDR', name: 'Copa del Rey',       color: '#A16207' },
  { code: 'PL',  name: 'Premier League',     color: '#6D28D9' },
  { code: 'BL1', name: 'Bundesliga',         color: '#B45309' },
  { code: 'SA',  name: 'Serie A',            color: '#0369A1' },
];

// Obtener próximos partidos de un torneo
export async function getUpcomingMatches(competitionCode: string) {
  const res = await fetch(
    `${BASE_URL}/competitions/${competitionCode}/matches?status=SCHEDULED`,
    { headers: { 'X-Auth-Token': API_KEY } }
  );
  const data = await res.json();
  return data.matches ?? [];
}
```

### 3B.2 Cambios en la base de datos

```sql
-- Añadir api_id a matches (ya ejecutado)
ALTER TABLE matches ADD COLUMN api_id int;

-- Añadir scoring_config a pools para puntajes configurables
ALTER TABLE pools ADD COLUMN scoring_config jsonb
  DEFAULT '{"exact": 5, "oneTeam": 2, "winner": 1, "goalDiff": 1}';
```

### 3B.3 Flujo completo de creación de polla con API

Al crear una polla, el `CreatePoolScreen` llama a `getUpcomingMatches()` y guarda los partidos con su `api_id` real:

```typescript
// En createPool() del AppContext:
const matchRows = matches.map((m) => ({
  id: `${pool.id}_${m.apiId}`,   // ID único en nuestra BD
  pool_id: pool.id,
  home: m.home,
  away: m.away,
  date: m.date,
  api_id: m.apiId,               // ID real de football-data.org
}));
```

### 3B.4 Edge Function sync-results

Archivo: `supabase/functions/sync-results/index.ts` (ya desplegado).

Usa el secreto `FOOTBALL_DATA_KEY` en Supabase. Consulta partidos con `api_id` definido y `home_score` null. Cuando `status === 'FINISHED'` actualiza los marcadores automáticamente.

Activación:
- **Pull-to-refresh** en ResultsScreen llama a la función y recarga los datos
- **Cron** (opcional): Supabase Dashboard → Edge Functions → Schedules, cada hora en días de partido

---

## Fase 3C — Notificaciones Push

### 3C.1 Configurar OneSignal

```bash
npx expo install onesignal-expo-plugin
```

Agregar en `app.json`:
```json
{
  "expo": {
    "plugins": [
      ["onesignal-expo-plugin", { "mode": "development" }]
    ]
  }
}
```

### 3C.2 Inicializar OneSignal en App.tsx

```typescript
import OneSignal from 'react-native-onesignal';

// En App.tsx useEffect:
OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!);
OneSignal.Notifications.requestPermission(true);

// Asociar el usuario autenticado con el dispositivo
OneSignal.login(user.id);
```

### 3C.3 Tipos de notificaciones V1

| Evento | Disparador | Cuándo enviar |
|---|---|---|
| Resultado disponible | Edge Function sync-results | Cuando `home_score` deja de ser null |
| Recordatorio partido | Cron 2h antes de kickoff | 2 horas antes del `date` del partido |
| Invitación a polla | Al unirse alguien nuevo | Notificar al creador |

---

## Fase 4 — QA y Pruebas

### 4.1 Checklist de pruebas funcionales

**Flujo de autenticación:**
- [ ] Registro con email nuevo crea cuenta y redirige a Home
- [ ] Login con credenciales correctas funciona
- [ ] Login con credenciales incorrectas muestra error claro
- [ ] La sesión persiste al cerrar y reabrir la app
- [ ] Logout redirige a Login y limpia el estado

**Flujo de creación de polla:**
- [ ] Seleccionar torneo carga los partidos reales desde football-data.org
- [ ] Los partidos se muestran con equipos y fechas reales
- [ ] Los puntajes configurables se guardan en `scoring_config` de la polla
- [ ] Cada partido se guarda en Supabase con su `api_id` real
- [ ] El código generado es único (verificar en Supabase)
- [ ] La polla aparece en Home del creador
- [ ] El creador aparece como participante

**Flujo de unirse a polla:**
- [ ] Código válido navega a la polla
- [ ] Código inválido muestra error
- [ ] Intentar unirse a una polla en la que ya estás muestra aviso
- [ ] La polla aparece en Home del nuevo participante

**Predicciones:**
- [ ] Guardar predicciones persiste en Supabase
- [ ] Reabrir la polla muestra las predicciones guardadas
- [ ] Las predicciones de usuario A no aparecen en usuario B (no hay leakage)
- [ ] Cambiar una predicción hace upsert, no crea duplicado

**Resultados y puntuación:**
- [ ] Marcador exacto da 5 pts
- [ ] Un marcador exacto (solo local o solo visitante) da 2 pts
- [ ] Ganador/empate correcto da 1 pt
- [ ] Diferencia correcta con ganador incorrecto da 1 pt
- [ ] Sin acierto da 0 pts
- [ ] Partido sin resultado muestra "Pdte."

**Clasificación:**
- [ ] El usuario con más puntos aparece primero
- [ ] El usuario actual se resalta en azul
- [ ] Empates en puntos se rompen consistentemente

**Perfil:**
- [ ] Muestra nombre y email del usuario autenticado
- [ ] Número de pollas refleja las pollas reales
- [ ] Logout funciona desde el perfil

### 4.2 Pruebas en dispositivo físico

- [ ] Probar en Android físico (no solo emulador)
- [ ] Probar en iPhone físico si es posible
- [ ] Verificar que el teclado no tapa los inputs
- [ ] Verificar que los gestos nativos funcionan (swipe back en iOS)
- [ ] Verificar en pantallas pequeñas (iPhone SE, Galaxy A series)
- [ ] Probar con conexión lenta (3G simulado)
- [ ] Probar sin conexión — mostrar error apropiado

### 4.3 Manejo de errores

Antes de publicar, asegurarse de que ningún error causa pantalla blanca:
- Auth: mostrar mensaje si login falla
- Red: mostrar "Sin conexión" si no hay internet
- Supabase: capturar errores de DB y mostrar toast
- Predicciones: mostrar confirmación de guardado

---

## Fase 5 — Build y Publicación

### 5.1 Configurar EAS

```bash
npm install -g eas-cli
eas login
eas build:configure   # genera eas.json
```

`eas.json` resultante:
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 5.2 Generar builds

```bash
# APK para testers en Android (más rápido para beta)
eas build --platform android --profile preview

# Build de producción Android (AAB para Play Store)
eas build --platform android --profile production

# Build iOS (requiere cuenta de Apple Developer — $99/año)
eas build --platform ios --profile production
```

### 5.3 Publicar en Google Play

1. Crear cuenta de desarrollador en [Google Play Console](https://play.google.com/console) ($25 único)
2. Crear nueva aplicación → RetaGol
3. Completar ficha de la tienda:
   - Título: "RetaGol — Quinielas de Fútbol"
   - Descripción corta (80 caracteres)
   - Descripción larga
   - Capturas de pantalla (mínimo 2 por tipo de dispositivo)
   - Ícono de alta resolución (512×512 px)
   - Imagen de encabezado (1024×500 px)
4. Subir el `.aab` generado por EAS
5. Lanzar como **beta cerrada** → invitar testers por email
6. Esperar aprobación (~3–7 días la primera vez)

### 5.4 Publicar en TestFlight (iOS)

1. Cuenta de [Apple Developer Program](https://developer.apple.com/programs/) ($99/año)
2. Crear app en App Store Connect
3. `eas submit --platform ios` (sube automáticamente a TestFlight)
4. En App Store Connect → TestFlight → invitar testers internos
5. Esperar que Apple procese el build (~30 min)

---

## Checklist final antes de publicar V1

### Técnico
- [ ] Cero errores de TypeScript (`npx tsc --noEmit`)
- [ ] Supabase RLS configurado (usuarios solo ven sus datos)
- [ ] Variables de entorno en `.env` y no en el código
- [ ] `.env` en `.gitignore`
- [ ] Sentry configurado para capturar errores en producción
- [ ] Versión en `app.json` es `1.0.0`
- [ ] `bundleIdentifier` / `package` en `app.json` son únicos

### Producto
- [ ] Logo e ícono de la app diseñados y exportados
- [ ] Splash screen configurada
- [ ] Textos de la app revisados (sin "TODO", sin nombres de prueba)
- [ ] Términos y condiciones + Política de privacidad redactados (requeridos por las tiendas)
- [ ] Flujos probados en dispositivos físicos iOS y Android
- [ ] Al menos 5 personas han probado la beta y dado feedback

### Publicación
- [ ] Ficha de Play Store completa con capturas y descripción
- [ ] Ficha de App Store completa
- [ ] Beta cerrada activa con invitados iniciales
- [ ] Canal de feedback habilitado (WhatsApp, formulario, etc.)

---

## Siguiente versión

Una vez publicada y con feedback real de usuarios, comenzar con `V1_5_PLAN.md`:
- Pollas públicas y sección Explorar funcional
- Sistema de invitaciones por link
- Chat interno de la polla
- Sistema de amistades y logros básicos
