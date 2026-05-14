# Plan de Desarrollo — Versión 2.0 (Economía del Juego)

**Prerequisito:** V1.5 publicada y estable. Base de usuarios activa con engagement demostrado.  
**Objetivo:** Monetizar la plataforma a través de una economía virtual (QuiniCoins), comodines que mejoran las predicciones, y pollas con entrada de pago real para grupos de amigos.

> **Nota legal importante:** Las pollas con dinero real en Colombia requieren análisis legal previo. Consultar si aplica regulación de Coljuegos. Como alternativa para lanzar antes, considerar solo moneda virtual con premios no monetarios (créditos, insignias premium).

---

## Resumen de funcionalidades

| Funcionalidad | Descripción |
|---|---|
| QuiniCoins | Moneda virtual ganada por actividad y comprada con dinero real |
| Tienda de comodines | 5 tipos de comodines comprables con QuiniCoins |
| Comodines activos | El usuario puede activar un comodín antes o durante un partido |
| Pollas con entrada | El creador puede exigir un pago para participar |
| Distribución de premios | Los fondos se reparten entre los ganadores automáticamente |
| Historial de transacciones | Registro de todos los movimientos de coins y dinero |

---

## Fase 1 — Diseño

### 1.1 Pantallas nuevas

- **Tienda:** lista de comodines con descripción, costo y botón de compra
- **Mi balance:** coins actuales, historial de movimientos, botón de recargar
- **Comprar coins:** selector de paquetes con precios en COP
- **Activar comodín:** modal que aparece al tocar un partido en PredictionsScreen
- **Crear polla con pago:** extensión del formulario de creación con campos de entrada y distribución
- **Detalle de transacción:** pantalla de confirmación tras comprar o ganar coins

### 1.2 Cambios en pantallas existentes

- **PredictionsScreen:** botón de comodín por partido (si el usuario tiene en inventario)
- **HomeScreen/PoolCard:** badge si la polla tiene premio en juego
- **PerfilScreen:** mostrar balance de QuiniCoins
- **StandingsScreen:** mostrar premio estimado al lado de los puntos
- **InfoScreen:** mostrar configuración de premios de la polla

---

## Fase 2 — Cambios en la base de datos

### 2.1 Nuevas tablas

```sql
-- Balance de coins por usuario
alter table profiles add column balance_coins int default 0;

-- Comodines disponibles en la tienda
create table jokers (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  cost_coins int not null,
  effect jsonb not null  -- describe el efecto para la Edge Function
);

-- Inventario de comodines del usuario
create table user_jokers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  joker_id text references jokers(id),
  quantity int default 1,
  acquired_at timestamptz default now(),
  unique (user_id, joker_id)
);

-- Comodín usado en una predicción
create table prediction_jokers (
  prediction_id uuid references predictions(id) on delete cascade,
  joker_id text references jokers(id),
  activated_at timestamptz default now(),
  primary key (prediction_id)
);

-- Transacciones de coins y dinero
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null check (type in (
    'earn_activity',   -- ganar coins por jugar
    'purchase_coins',  -- comprar coins con dinero
    'spend_joker',     -- gastar coins en comodín
    'pool_entry',      -- pagar entrada a polla
    'prize_payout'     -- recibir premio
  )),
  amount_coins int,     -- puede ser positivo o negativo
  amount_money numeric, -- en COP, null si es solo coins
  currency text default 'COP',
  reference text,       -- ID de transacción de Wompi
  description text,
  status text default 'completed',
  created_at timestamptz default now()
);
```

### 2.2 Modificar tablas existentes

```sql
-- Pollas con configuración de pago
alter table pools
  add column entry_fee numeric default 0,        -- 0 = gratuita
  add column prize_pool numeric default 0,       -- acumulado de entradas
  add column prize_distribution jsonb,           -- {1: 60, 2: 30, 3: 10} = % por posición
  add column scoring_config jsonb,               -- puntos personalizables por el creador
  add column jokers_allowed boolean default false;

-- Predicciones con estado de comodín
alter table predictions
  add column joker_used text references jokers(id),
  add column points_earned int;  -- calculado al terminar, guardado para historial
```

### 2.3 Datos semilla: comodines

```sql
insert into jokers (id, name, description, icon, cost_coins, effect) values
  ('extra_goal',    'Gol Extra',         'Añade 1 gol al equipo elegido en un partido en curso', '⚽', 50,  '{"type": "add_goal", "applies_to": "team"}'),
  ('score_change',  'Cambio de Marcador','Modifica tu predicción hasta el minuto 60',             '🔄', 80,  '{"type": "change_prediction", "deadline_minute": 60}'),
  ('draw_insurance','Seguro de Empate',  'Si predijiste ganador y empataron, igual sumas puntos', '🛡️', 40,  '{"type": "draw_fallback"}'),
  ('double',        'Doblete',           'Duplica los puntos de un partido específico',           '✖️', 100, '{"type": "multiply_points", "factor": 2}'),
  ('ghost',         'Comodín Fantasma',  'Oculta tu predicción del ranking hasta que termine',   '👻', 60,  '{"type": "hide_prediction"}');
```

---

## Fase 3 — Desarrollo

### 3.1 Sistema de QuiniCoins

**Ganar coins por actividad (automático):**

| Acción | Coins ganados |
|---|---|
| Registrarse por primera vez | 200 coins (bienvenida) |
| Guardar predicciones en una polla | 10 coins |
| Exacto en un partido | 15 coins extra |
| Primera vez que completas todos los partidos | 25 coins |
| Terminar 1° en una polla | 100 coins |
| Terminar top 3 en una polla | 50 coins |
| Logro desbloqueado | 20–50 coins según logro |

Implementar en Edge Function `award-coins`:
```typescript
// Al terminar de calcular puntos de un partido
await supabase.from('profiles').update({
  balance_coins: supabase.rpc('increment', { x: coinsToAward })
}).eq('id', userId);

await supabase.from('transactions').insert({
  user_id: userId,
  type: 'earn_activity',
  amount_coins: coinsToAward,
  description: reason,
});
```

**Comprar coins con dinero real (Wompi):**

Paquetes de compra:

| Paquete | Precio COP | QuiniCoins |
|---|---|---|
| Arranque | $2.000 | 200 coins |
| Estándar | $5.000 | 600 coins |
| Pro | $10.000 | 1.400 coins |
| Fanático | $25.000 | 4.000 coins |

### 3.2 Integración Wompi

Wompi es el procesador de pagos para Colombia. Instalar su SDK o usar la API directamente:

```typescript
// services/payments.ts
export async function createWompiTransaction(
  amount: number,  // en centavos COP
  reference: string,
  userId: string
) {
  const response = await fetch('https://sandbox.wompi.co/v1/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WOMPI_PUBLIC_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount_in_cents: amount * 100,
      currency: 'COP',
      customer_email: user.email,
      reference,
      payment_method: { type: 'CARD' },
      redirect_url: 'retagol://payment-complete',
    }),
  });
  return response.json();
}
```

Edge Function `handle-payment-webhook` para procesar confirmación de Wompi:
```typescript
// Cuando Wompi confirma el pago
serve(async (req) => {
  const event = await req.json();
  if (event.data.transaction.status === 'APPROVED') {
    const { reference, amount } = event.data.transaction;
    const { userId, coinsPackage } = parseReference(reference);
    const coins = PACKAGES[coinsPackage];

    await supabase.from('profiles')
      .update({ balance_coins: supabase.rpc('increment', { x: coins }) })
      .eq('id', userId);

    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'purchase_coins',
      amount_coins: coins,
      amount_money: amount / 100,
      reference,
    });
  }
});
```

### 3.3 Tienda de comodines

Pantalla `screens/app/TiendaScreen.tsx` — reemplazar el placeholder por contenido real:

```typescript
// Verificar balance y comprar comodín
async function buyJoker(jokerId: string, cost: number) {
  if (user.balance_coins < cost) {
    Alert.alert('Coins insuficientes', 'Recarga tu balance para comprar este comodín.');
    return;
  }

  const { error } = await supabase.rpc('buy_joker', { joker_id: jokerId, user_id: user.id, cost });
  if (!error) {
    setBalance(prev => prev - cost);
    // Actualizar inventario local
  }
}
```

Función SQL atómica para comprar (evita race conditions):
```sql
create function buy_joker(joker_id text, user_id uuid, cost int)
returns void as $$
begin
  update profiles set balance_coins = balance_coins - cost
  where id = user_id and balance_coins >= cost;

  if not found then
    raise exception 'Coins insuficientes';
  end if;

  insert into user_jokers (user_id, joker_id, quantity)
  values (user_id, joker_id, 1)
  on conflict (user_id, joker_id)
  do update set quantity = user_jokers.quantity + 1;

  insert into transactions (user_id, type, amount_coins, description)
  values (user_id, 'spend_joker', -cost, 'Compra de comodín: ' || joker_id);
end;
$$ language plpgsql;
```

### 3.4 Activar comodín en predicciones

En `PredictionsScreen.tsx`, añadir botón de comodín en cada `MatchCard`:

```typescript
// Si el usuario tiene comodines disponibles, mostrar selector
function JokerSelector({ matchId, onSelect }) {
  const { inventory } = useJokers();
  const available = inventory.filter(j => j.quantity > 0);

  if (available.length === 0) return null;

  return (
    <TouchableOpacity onPress={() => showJokerModal(matchId, available)}>
      <Text>⚡ Usar comodín</Text>
    </TouchableOpacity>
  );
}
```

Al guardar predicciones, enviar el comodín elegido:
```typescript
// Guardar predicción con comodín
await supabase.from('predictions').upsert({
  ...predictionData,
  joker_used: selectedJokerId,  // null si no usó comodín
});

// Descontar del inventario
if (selectedJokerId) {
  await supabase.from('user_jokers')
    .update({ quantity: currentQuantity - 1 })
    .eq('user_id', user.id)
    .eq('joker_id', selectedJokerId);
}
```

### 3.5 Pollas con entrada de pago

Extensión del formulario `CreatePoolScreen.tsx`:

Campos adicionales:
- Toggle: "¿Esta polla tiene entrada?"
- Input: precio de entrada (COP)
- Selector de distribución de premios: 60/40 (2 ganadores), 60/30/10 (top 3), 100% al primero

Al unirse a una polla con entrada:
```typescript
async function joinPaidPool(pool: Pool) {
  // 1. Iniciar pago con Wompi
  const reference = `pool_${pool.id}_user_${user.id}_${Date.now()}`;
  const transaction = await createWompiTransaction(pool.entry_fee, reference, user.id);

  // 2. Abrir widget de pago de Wompi
  await WebBrowser.openBrowserAsync(transaction.data.payment_link.url);

  // 3. El webhook de Wompi confirma el pago y registra al participante
  // (automático via Edge Function handle-payment-webhook)
}
```

### 3.6 Distribución de premios

Edge Function `distribute-prizes` — se activa cuando la polla pasa a estado `finished`:

```typescript
serve(async (req) => {
  const { poolId } = await req.json();

  // 1. Obtener clasificación final
  const standings = await getPoolStandings(poolId);

  // 2. Obtener configuración de premios
  const { data: pool } = await supabase.from('pools').select('prize_pool, prize_distribution').eq('id', poolId).single();

  // 3. Calcular y distribuir
  const distribution = pool.prize_distribution; // {1: 60, 2: 30, 3: 10}
  for (const [position, percentage] of Object.entries(distribution)) {
    const winner = standings[parseInt(position) - 1];
    const prize = (pool.prize_pool * percentage) / 100;

    // Transferir via Wompi a cuenta del ganador (requiere cuenta bancaria registrada)
    await sendPrize(winner.user_id, prize);

    await supabase.from('transactions').insert({
      user_id: winner.user_id,
      type: 'prize_payout',
      amount_money: prize,
      description: `Premio posición ${position} en polla ${poolId}`,
    });
  }
});
```

---

## Fase 4 — QA

### Checklist V2.0

**QuiniCoins:**
- [ ] Nuevo usuario recibe 200 coins de bienvenida
- [ ] Coins se suman correctamente al ganar actividades
- [ ] Balance no puede quedar negativo (función SQL atómica)
- [ ] Historial de transacciones registra todos los movimientos

**Pagos Wompi:**
- [ ] Flujo de pago completo en sandbox funciona
- [ ] Webhook de confirmación procesa correctamente
- [ ] Pago fallido no acredita coins ni inscribe a la polla
- [ ] Montos coinciden entre Wompi y lo registrado en DB
- [ ] Probar con tarjetas de prueba de Wompi

**Comodines:**
- [ ] Comprar comodín descuenta coins y suma al inventario
- [ ] Inventario vacío no muestra opción de comodín
- [ ] Comodín activado afecta el cálculo de puntos correctamente
- [ ] Cada comodín solo se puede usar una vez por partido
- [ ] `ghost` oculta predicción en StandingsScreen hasta resultado

**Pollas con pago:**
- [ ] Solo usuarios que pagaron aparecen como participantes
- [ ] El premio se acumula correctamente
- [ ] Distribución de premios es correcta al finalizar polla
- [ ] Ganador recibe notificación de su premio

---

## Consideraciones legales V2.0

Antes de activar pollas con dinero real en producción:

- [ ] Consultar abogado sobre regulación Coljuegos en Colombia
- [ ] Definir si aplica como "juego de habilidad" vs "azar" (impacta la licencia)
- [ ] Registrar empresa (SAS en Colombia) para operar pagos
- [ ] Obtener RUT y cuenta bancaria empresarial para Wompi
- [ ] Actualizar Términos y Condiciones con sección de pagos y premios
- [ ] Implementar límites de gasto (responsabilidad social)
- [ ] Verificación de edad +18 para pollas con dinero real

---

## Migración técnica en V2.0

V2.0 es un buen momento para migrar partes del stack:

| Área | Acción | Por qué |
|---|---|---|
| Context API → Zustand | Migrar `useApp()` a stores de Zustand | Mejor rendimiento, menos re-renders |
| AsyncStorage → Supabase | Eliminar AsyncStorage para datos de usuario | Todo está en Supabase, evitar doble fuente de verdad |
| StyleSheet → NativeWind | Migrar estilos de pantallas nuevas a NativeWind | Velocidad de desarrollo en pantallas de tienda y pagos |

No migrar todo de golpe — hacerlo pantalla por pantalla para no introducir regresiones.

---

## Siguiente versión

Con la economía funcionando, continuar con `V2_5_PLAN.md`: ranking global, sistema de temporadas, y compartir resultados en redes sociales.
