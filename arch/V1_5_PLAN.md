# Plan de Desarrollo — Versión 1.5 (Sociabilidad y Descubrimiento)

**Prerequisito:** V1.0 publicada en Play Store y TestFlight, con usuarios reales activos.  
**Objetivo:** Convertir RetaGol de una app de gestión de pollas en una plataforma social. El usuario puede descubrir pollas públicas, invitar amigos, chatear dentro de la polla y coleccionar logros.

---

## Resumen de funcionalidades

| Funcionalidad | Descripción |
|---|---|
| Pollas públicas | Cualquiera puede descubrir y unirse a pollas abiertas |
| Invitaciones por link | Compartir polla via link a WhatsApp/redes |
| Chat de polla | Mensajería en tiempo real dentro de cada polla |
| Sistema de amistades | Seguir usuarios, ver sus stats |
| Logros (5–10 básicos) | Insignias por hitos como "Primer exacto", "Top 1" |
| Mejoras UX | Ajustes basados en feedback de V1 |

---

## Fase 1 — Diseño

### 1.1 Pantallas nuevas a diseñar en Figma

- **Explorar:** feed de pollas públicas con filtros por competición y estado (activa/por empezar)
- **Detalle de polla pública:** vista previa antes de unirse (participantes, partidos, fechas)
- **Chat:** interfaz de mensajería tipo WhatsApp dentro de cada polla
- **Perfil público:** lo que ve otro usuario al visitar tu perfil
- **Amigos:** lista de amigos, buscar por nombre/usuario, solicitudes pendientes
- **Logros:** galería de insignias obtenidas y pendientes

### 1.2 Actualizaciones a pantallas existentes

- **HomeScreen:** añadir indicador de mensajes no leídos en PoolCard
- **PoolTabsNavigator:** añadir sub-tab de Chat (5 tabs en total)
- **InfoScreen:** mostrar lista de participantes con avatares
- **CreatePoolScreen:** añadir opción de visibilidad (Pública / Privada)

---

## Fase 2 — Cambios en la base de datos

### 2.1 Nuevas tablas

```sql
-- Amistades
create table friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references profiles(id) on delete cascade,
  addressee_id uuid references profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table friendships enable row level security;
create policy "usuarios ven sus solicitudes"
  on friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Chat de polla
create table pool_messages (
  id uuid default gen_random_uuid() primary key,
  pool_id uuid references pools(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table pool_messages enable row level security;
create policy "participantes ven mensajes"
  on pool_messages for select
  using (
    exists (
      select 1 from pool_participants
      where pool_id = pool_messages.pool_id and user_id = auth.uid()
    )
  );
create policy "participantes envían mensajes"
  on pool_messages for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from pool_participants
      where pool_id = pool_messages.pool_id and user_id = auth.uid()
    )
  );

-- Logros disponibles
create table achievements (
  id text primary key,  -- ej: 'first_exact', 'first_place'
  name text not null,
  description text not null,
  icon text not null,   -- emoji
  condition jsonb not null  -- {type: 'exact_count', value: 1}
);

-- Logros obtenidos por usuario
create table user_achievements (
  user_id uuid references profiles(id) on delete cascade,
  achievement_id text references achievements(id),
  earned_at timestamptz default now(),
  primary key (user_id, achievement_id)
);
```

### 2.2 Modificar tablas existentes

```sql
-- Agregar visibilidad a pollas
alter table pools add column visibility text default 'private'
  check (visibility in ('public', 'private'));

-- Agregar link de invitación
alter table pools add column invite_token text unique default gen_random_uuid()::text;

-- Agregar username único a profiles
alter table profiles add column username text unique;
```

---

## Fase 3 — Desarrollo

### 3.1 Sección Explorar (tab funcional)

**Pantalla:** `screens/app/ExplorarScreen.tsx`

Reemplazar el placeholder "Próximamente" con contenido real:

```typescript
// Fetch de pollas públicas
const { data: publicPools } = await supabase
  .from('pools')
  .select('*, profiles(name), matches(count)')
  .eq('visibility', 'public')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(20);
```

Funcionalidades de la pantalla:
- Lista paginada de pollas públicas
- Filtros: Por competición (Liga/Copa/Champions), Estado (Activa/Por empezar)
- Buscador por nombre de polla
- Card de polla con: nombre, tipo, nº participantes, nº partidos, creador
- Botón "Unirse" que llama a la misma lógica que JoinPoolScreen

### 3.2 Invitaciones por link

Generar un link de invitación usando el `invite_token`:

```typescript
// Generar link de invitación
const inviteLink = `https://retagol.app/join/${pool.invite_token}`;

// Compartir vía Share API nativa
import { Share } from 'react-native';

async function shareInvite() {
  await Share.share({
    message: `¡Únete a mi polla "${pool.name}" en RetaGol! 🏆\n${inviteLink}`,
  });
}
```

Deep linking (configurar en `app.json`):
```json
{
  "expo": {
    "scheme": "retagol",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "https", "host": "retagol.app", "pathPrefix": "/join" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### 3.3 Chat de polla (Supabase Realtime)

Agregar tab "Chat" a `PoolTabsNavigator.tsx`.

**Pantalla:** `screens/app/pool/ChatScreen.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';

export default function ChatScreen({ route }) {
  const { pool } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // Cargar historial
    supabase
      .from('pool_messages')
      .select('*, profiles(name)')
      .eq('pool_id', pool.id)
      .order('created_at')
      .then(({ data }) => setMessages(data ?? []));

    // Suscribirse a mensajes nuevos en tiempo real
    const channel = supabase
      .channel(`pool-chat-${pool.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pool_messages',
        filter: `pool_id=eq.${pool.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pool.id]);

  async function sendMessage() {
    if (!text.trim()) return;
    await supabase.from('pool_messages').insert({
      pool_id: pool.id,
      user_id: user.id,
      content: text.trim(),
    });
    setText('');
  }

  // ... render con FlatList de mensajes + TextInput al pie
}
```

### 3.4 Sistema de amistades

**Pantalla:** `screens/app/AmigosScreen.tsx` (nueva tab o modal desde Perfil)

Flujo:
1. Usuario busca por nombre/username → endpoint `profiles` con `.ilike('name', '%query%')`
2. Envía solicitud → insert en `friendships` con `status: 'pending'`
3. El destinatario recibe notificación push
4. Acepta/rechaza → update `status` a `'accepted'`/`'rejected'`

```typescript
// Enviar solicitud
await supabase.from('friendships').insert({
  requester_id: user.id,
  addressee_id: targetUser.id,
});

// Aceptar solicitud
await supabase.from('friendships')
  .update({ status: 'accepted' })
  .eq('requester_id', requesterId)
  .eq('addressee_id', user.id);

// Listar amigos
const { data } = await supabase
  .from('friendships')
  .select('requester:requester_id(id, name), addressee:addressee_id(id, name)')
  .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
  .eq('status', 'accepted');
```

### 3.5 Sistema de logros

Logros incluidos en V1.5:

| ID | Nombre | Descripción | Ícono | Condición |
|---|---|---|---|---|
| `first_exact` | Primer Exacto | Tu primera predicción exacta | 🎯 | 1 exacto acumulado |
| `hat_trick` | Hat-trick | 3 exactos en la misma jornada | 🎩 | 3 exactos en 1 polla |
| `first_place` | Campeón | Terminar 1° en una polla | 🥇 | rank = 1 al cerrar polla |
| `top_3` | Podio | Terminar top 3 en una polla | 🏆 | rank <= 3 |
| `creator` | Creador | Crear tu primera polla | ⚽ | 1 polla creada |
| `social` | Social | Unirte a 5 pollas | 👥 | 5 participaciones |
| `perfect_round` | Ronda Perfecta | Acertar todos los partidos de una polla | ⭐ | todos exactos |
| `comeback_king` | Remontada | Pasar del último al primer lugar | 📈 | cambio de posición |

**Edge Function para evaluar logros** (`supabase/functions/check-achievements`):
- Se ejecuta cuando se calculan puntos de un partido terminado
- Consulta el estado del usuario
- Inserta en `user_achievements` si cumple la condición

### 3.6 Notificaciones V1.5

Nuevos tipos de notificaciones push:

| Evento | Mensaje |
|---|---|
| Solicitud de amistad recibida | "{nombre} quiere ser tu amigo en RetaGol" |
| Amistad aceptada | "{nombre} aceptó tu solicitud" |
| Mensaje nuevo en polla | "{nombre} en {polla}: {preview mensaje}" |
| Logro desbloqueado | "¡Desbloqueaste '{nombre del logro}'! {ícono}" |
| Alguien te supera en clasificación | "{nombre} te superó en {polla}" |

---

## Fase 4 — QA

### Checklist V1.5

**Explorar:**
- [ ] Solo pollas públicas aparecen en Explorar
- [ ] Pollas privadas no aparecen aunque existan
- [ ] Filtros funcionan correctamente
- [ ] Unirse desde Explorar funciona igual que por código

**Invitaciones:**
- [ ] Link de invitación abre la app en iOS y Android (deep link)
- [ ] Link inválido o expirado muestra error adecuado

**Chat:**
- [ ] Mensajes aparecen en tiempo real sin refrescar
- [ ] Mensajes históricos cargan al abrir el chat
- [ ] Solo participantes de la polla pueden enviar mensajes
- [ ] Mensajes largos se muestran correctamente

**Amistades:**
- [ ] Solicitud pendiente no permite enviar otra
- [ ] Amigo aparece en la lista al aceptar
- [ ] Notificación llega al destinatario

**Logros:**
- [ ] Logro se desbloquea al cumplir la condición
- [ ] Logro no se duplica al cumplir la condición dos veces
- [ ] Notificación push al desbloquear logro

---

## Checklist de publicación V1.5

- [ ] Deep linking probado en iOS y Android
- [ ] Supabase Realtime funcionando en producción (no solo en dev)
- [ ] Pruebas de carga del chat con 10+ usuarios simultáneos
- [ ] Términos de servicio actualizados (chat añade responsabilidades legales)
- [ ] Política de moderación de contenido definida
- [ ] Build de producción generado y probado
- [ ] Actualización enviada a Play Store y App Store
- [ ] Release notes escritas para los usuarios

---

## Siguiente versión

Con la sociabilidad cubierta, continuar con `V2_0_PLAN.md`: economía virtual (QuiniCoins), tienda de comodines y pollas con pago real.
