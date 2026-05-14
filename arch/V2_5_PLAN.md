# Plan de Desarrollo — Versión 2.5 (Competencia y Retención)

**Prerequisito:** V2.0 publicada. La app tiene economía virtual funcionando y usuarios pagadores.  
**Objetivo:** Convertir RetaGol en una plataforma competitiva a largo plazo. El jugador tiene metas más allá de su polla de amigos: subir en el ranking global, avanzar de categoría, y compartir sus victorias.

---

## Resumen de funcionalidades

| Funcionalidad | Descripción |
|---|---|
| Ranking global | Tabla de posiciones de todos los usuarios de la plataforma |
| Ranking por país | Tabla separada por Colombia, México, Argentina, etc. |
| Sistema de temporadas | Ciclos de 12 meses con reseteo y premios anuales |
| Categorías / niveles | Amateur → Aficionado → Semipro → Pro → Clase Mundial |
| Pollas multi-liga | Crear pollas con partidos de varias competiciones a la vez |
| Compartir en redes | Tarjetas visuales para WhatsApp/Instagram con resultados |
| Estadísticas avanzadas | Historial personal detallado de aciertos por tipo |

---

## Fase 1 — Diseño

### 1.1 Pantallas nuevas

- **Ranking Global:** tabla paginada con posición, avatar, nombre, puntos de temporada, categoría
- **Ranking por País:** misma estructura filtrada por `profiles.country`
- **Mi posición:** card personal que muestra posición actual, puntos, distancia al siguiente nivel
- **Perfil de temporada:** resumen al final de temporada — mejor racha, aciertos, pollas ganadas
- **Estadísticas personales:** breakdown por tipo de acierto (exactos, parciales, etc.)
- **Compartir resultado:** tarjeta visual generada tras terminar una jornada

### 1.2 Actualizaciones a pantallas existentes

- **RankingScreen (tab):** implementar el contenido real con las tablas globales
- **PerfilScreen:** añadir categoría/nivel, puntos de temporada, botón de estadísticas
- **HomeScreen:** mostrar tu posición global como dato motivador
- **StandingsScreen:** mostrar el nivel/categoría de cada participante

---

## Fase 2 — Modelo de datos

### 2.1 Nuevas tablas

```sql
-- Temporadas (cada año es una temporada)
create table seasons (
  id text primary key,          -- ej: '2026', '2027'
  starts_at timestamptz,
  ends_at timestamptz,
  is_current boolean default false,
  status text default 'active' check (status in ('active', 'finished'))
);

-- Puntos globales del usuario por temporada
create table user_season_stats (
  user_id uuid references profiles(id) on delete cascade,
  season_id text references seasons(id),
  total_points int default 0,
  exact_count int default 0,
  one_team_count int default 0,
  winner_count int default 0,
  diff_count int default 0,
  none_count int default 0,
  pools_won int default 0,
  pools_played int default 0,
  best_streak int default 0,    -- exactos consecutivos
  rank int,                     -- calculado periódicamente
  category text default 'amateur',
  primary key (user_id, season_id)
);

-- Categorías / niveles
create table categories (
  id text primary key,
  name text not null,
  min_points int not null,
  max_points int,
  icon text,   -- emoji
  color text   -- hex
);

insert into categories values
  ('amateur',       'Amateur',       0,      999,   '⚽', '#94A3B8'),
  ('aficionado',    'Aficionado',    1000,   4999,  '🥉', '#B45309'),
  ('semipro',       'Semipro',       5000,   14999, '🥈', '#94A3B8'),
  ('pro',           'Pro',           15000,  39999, '🥇', '#FACC15'),
  ('clase_mundial', 'Clase Mundial', 40000,  null,  '👑', '#2563EB');
```

### 2.2 Modificar tablas existentes

```sql
-- Agregar país a profiles
alter table profiles
  add column country text default 'CO',
  add column city text,
  add column category text default 'amateur';

-- Agregar puntos de temporada a predicciones para acumulación
alter table predictions
  add column season_id text references seasons(id);
```

### 2.3 Vista materializada para ranking (rendimiento)

Para no calcular el ranking en tiempo real (muy lento con miles de usuarios), usar una vista materializada que se refresca cada hora:

```sql
create materialized view global_ranking as
  select
    u.id,
    u.name,
    u.country,
    u.category,
    s.total_points,
    s.pools_won,
    rank() over (order by s.total_points desc) as global_rank,
    rank() over (partition by u.country order by s.total_points desc) as country_rank
  from user_season_stats s
  join profiles u on u.id = s.user_id
  join seasons cur on cur.is_current = true
  where s.season_id = cur.id;

-- Refrescar cada hora via cron de Supabase
```

---

## Fase 3 — Desarrollo

### 3.1 Ranking Global (tab funcional)

La tab `RankingScreen` (actualmente placeholder) se convierte en contenido real:

```typescript
export default function RankingScreen() {
  const [tab, setTab] = useState<'global' | 'country'>('global');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: rankings } = useQuery({
    queryKey: ['ranking', tab, page],
    queryFn: async () => {
      let query = supabase
        .from('global_ranking')
        .select('*')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (tab === 'country') {
        query = query.eq('country', user.country).order('country_rank');
      } else {
        query = query.order('global_rank');
      }

      const { data } = await query;
      return data;
    },
  });

  // También mostrar la posición del usuario autenticado
  const { data: myRank } = useQuery({
    queryKey: ['my-rank'],
    queryFn: async () => {
      const { data } = await supabase
        .from('global_ranking')
        .select('global_rank, country_rank, total_points')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  // render de tabla con posición fija del usuario al fondo
}
```

### 3.2 Sistema de temporadas

**Edge Function `season-cron`** — corre el 1 de enero:

```typescript
serve(async () => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // 1. Cerrar temporada actual
  await supabase.from('seasons').update({ status: 'finished', is_current: false })
    .eq('is_current', true);

  // 2. Otorgar premios de temporada (top 100 globales)
  const { data: topUsers } = await supabase
    .from('global_ranking')
    .select('id, global_rank')
    .lte('global_rank', 100)
    .order('global_rank');

  for (const user of topUsers) {
    const coinsReward = getSeasonReward(user.global_rank);
    await awardCoins(user.id, coinsReward, 'Fin de temporada: Top ' + user.global_rank);
    await unlockAchievement(user.id, `season_top_${getSuffix(user.global_rank)}`);
  }

  // 3. Crear nueva temporada
  await supabase.from('seasons').insert({
    id: String(nextYear),
    starts_at: `${nextYear}-01-01`,
    ends_at: `${nextYear}-12-31`,
    is_current: true,
    status: 'active',
  });

  // 4. Resetear categorías a 'amateur' para todos
  await supabase.from('profiles').update({ category: 'amateur' });

  return new Response('Temporada ' + nextYear + ' iniciada');
});
```

**Premios de fin de temporada:**

| Posición | Premios |
|---|---|
| 1° | 5.000 coins + insignia "Campeón {año}" |
| 2°–5° | 2.000 coins + insignia "Top 5" |
| 6°–25° | 1.000 coins + insignia "Top 25" |
| 26°–100° | 500 coins + insignia "Top 100" |

### 3.3 Sistema de categorías

La categoría se actualiza automáticamente al acumular puntos:

```sql
-- Trigger que actualiza la categoría al ganar puntos
create function update_category()
returns trigger as $$
declare
  new_category text;
begin
  select id into new_category
  from categories
  where new.total_points >= min_points
    and (max_points is null or new.total_points <= max_points)
  limit 1;

  update profiles set category = new_category where id = new.user_id;
  return new;
end;
$$ language plpgsql;

create trigger on_points_update
  after update of total_points on user_season_stats
  for each row execute procedure update_category();
```

Al subir de categoría, enviar notificación push:
```
"¡Subiste a {nueva categoría}! Sigue así 🏆"
```

### 3.4 Pollas con partidos de múltiples ligas

En `CreatePoolScreen.tsx`, añadir opción "Multi-liga":

```typescript
// En lugar de elegir un solo tipo, el creador puede combinar
const MATCHES_MULTI = {
  'Liga + Copa': [...MATCHES_BY_TYPE.liga.slice(0, 2), ...MATCHES_BY_TYPE.copa.slice(0, 2)],
  'Liga + Champions': [...MATCHES_BY_TYPE.liga.slice(0, 2), ...MATCHES_BY_TYPE.champions.slice(0, 2)],
  'Copa + Champions': [...MATCHES_BY_TYPE.copa.slice(0, 2), ...MATCHES_BY_TYPE.champions.slice(0, 2)],
  'Todas': [...MATCHES_BY_TYPE.liga.slice(0, 2), ...MATCHES_BY_TYPE.copa.slice(0, 2), ...MATCHES_BY_TYPE.champions.slice(0, 2)],
};
```

Cuando se integre API-Football completamente, el creador podrá buscar partidos de cualquier liga activa.

### 3.5 Compartir resultados en redes

Usar `react-native-view-shot` para capturar una tarjeta visual y compartirla:

```bash
npx expo install react-native-view-shot
```

**Tarjeta de resultados** — lo que se comparte:

```
┌─────────────────────────────┐
│  🏆 RetaGol                 │
│  Jornada terminada           │
│                             │
│  2° lugar en Champions Pool  │
│  38 puntos — 3 exactos 🎯   │
│                             │
│  Mejor partido:             │
│  Barcelona 2-1 Real Madrid  │
│  Mi predicción: 2-1 ✅       │
│                             │
│  retagol.app/join/ABC123    │
└─────────────────────────────┘
```

```typescript
import ViewShot from 'react-native-view-shot';
import { Share } from 'react-native';

async function shareResult() {
  const uri = await viewShotRef.current.capture();
  await Share.share({
    url: uri,
    message: `¡Terminé 2° en mi polla de Champions con 38 puntos! 🏆 Únete a RetaGol: retagol.app`,
  });
}
```

### 3.6 Estadísticas personales avanzadas

Nueva sección en `PerfilScreen.tsx` o pantalla independiente:

```typescript
// Fetch de stats del usuario
const { data: stats } = await supabase
  .from('user_season_stats')
  .select('*')
  .eq('user_id', user.id)
  .eq('season_id', currentSeason);

// Mostrar breakdown por tipo de acierto:
// - Exactos: stats.exact_count (%)
// - Parciales: stats.one_team_count (%)
// - Ganadores: stats.winner_count (%)
// - Diferencias: stats.diff_count (%)
// - Fallos: stats.none_count (%)
// - Mejor racha de exactos: stats.best_streak
// - Pollas ganadas: stats.pools_won / stats.pools_played
```

---

## Fase 4 — QA

### Checklist V2.5

**Ranking:**
- [ ] Ranking global muestra todos los usuarios ordenados correctamente
- [ ] Ranking por país filtra bien por `profiles.country`
- [ ] La vista materializada se actualiza cada hora
- [ ] La posición propia aparece siempre visible (al fondo si no está en página)
- [ ] Paginación funciona sin duplicados ni saltos

**Temporadas:**
- [ ] Fin de temporada corre correctamente (probar en staging)
- [ ] Coins se otorgan a los ganadores correctamente
- [ ] Categorías se resetean a 'amateur'
- [ ] La nueva temporada inicia con stats en 0

**Categorías:**
- [ ] Subir de categoría actualiza `profiles.category` inmediatamente
- [ ] La notificación push llega al subir de categoría
- [ ] No hay saltos de categoría (de amateur directo a clase mundial)

**Compartir:**
- [ ] La captura de pantalla incluye todos los datos
- [ ] Se comparte correctamente en WhatsApp, Instagram, etc.
- [ ] El link `retagol.app/join/...` funciona (deep link)
- [ ] La imagen tiene buena resolución en distintas pantallas

---

## Migración técnica en V2.5

Esta versión justifica completar la migración a Expo Router:

**Motivación:** Con pollas multi-liga y deep links complejos, el file-based routing de Expo Router maneja mejor los parámetros de URL.

**Plan de migración gradual:**
1. Instalar Expo Router: `npx expo install expo-router`
2. Mover pantallas nuevas de V2.5 directamente a `app/` con Expo Router
3. Mantener React Navigation para pantallas existentes (coexistencia temporal)
4. En V3.0 completar la migración de pantallas antiguas

---

## Siguiente versión

Con competencia global funcionando, continuar con `V3_0_PLAN.md`: IA, multi-idioma, dashboard de administración, y expansión internacional.
