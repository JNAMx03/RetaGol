import { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { ScoringConfig, DEFAULT_SCORING, getResultType, getPoints } from '../utils/scoring';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type { ScoringConfig };

export interface Match {
  id: string;
  home: string;
  away: string;
  date: string;
  utcDate?: string;
  homeScore: string;
  awayScore: string;
  apiId?: number;
}

export interface Pool {
  id: string;
  name: string;
  type: string;
  code: string;
  participants: number;
  matches: Match[];
  createdAt: string;
  scoringConfig: ScoringConfig;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserStats {
  totalPoints: number;
  totalCorrect: number;
  totalExact: number;
  totalPredictions: number;
}

interface AppContextType {
  user: User | null;
  isLogged: boolean;
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
  userStats: UserStats;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  pools: Pool[];
  refreshPools: () => Promise<void>;
  createPool: (name: string, type: string, matches: Match[], scoring: ScoringConfig) => Promise<void>;
  joinPool: (code: string) => Promise<Pool>;
  predictions: Record<string, Record<string, Match[]>>;
  getPredictionsByPool: (poolId: string) => Match[];
  savePredictionsByPool: (poolId: string, matches: Match[]) => Promise<void>;
  clearAllData: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── Utilidades ───────────────────────────────────────────────────────────────

const generateCode = (type: string): string => {
  const prefix = type === 'liga' ? 'L' : type === 'copa' ? 'C' : 'CH';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${num}`;
};

const mapPool = (pool: any, matches: any[]): Pool => ({
  id: pool.id,
  name: pool.name,
  type: pool.type,
  code: pool.code,
  participants: pool.participants,
  createdAt: pool.created_at,
  scoringConfig: pool.scoring_config ?? DEFAULT_SCORING,
  matches: matches.map((m) => ({
    id: m.id,
    home: m.home,
    away: m.away,
    date: m.date,
    utcDate: m.utc_date ?? undefined,
    homeScore: m.home_score ?? '',
    awayScore: m.away_score ?? '',
  })),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [pools, setPools] = useState<Pool[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, Match[]>>>({});
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    totalCorrect: 0,
    totalExact: 0,
    totalPredictions: 0,
  });

  const clearRecoveryMode = () => setRecoveryMode(false);

  // Recuperar sesión, perfil y pollas al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile);
            setIsLogged(true);
            await loadPoolsForUser(profile.id);
          }
        }

        // Predicciones en Supabase desde Fase 3.4 — ya no se persisten localmente
      } catch (e) {
        console.log('Error al iniciar:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Escuchar evento PASSWORD_RECOVERY de Supabase Auth
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setLoading(false);
      }
    });

    // Procesar deep link de recuperación de contraseña
    // URL esperada: retagol://reset-password#access_token=...&refresh_token=...&type=recovery
    const handleDeepLink = async (url: string | null) => {
      if (!url || !url.includes('reset-password')) return;
      const hash = url.split('#')[1] ?? '';
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken) return;
      // Establecer sesión → dispara PASSWORD_RECOVERY en onAuthStateChange
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      });
    };

    // Caso 1: app cerrada, abierta desde el link del correo
    Linking.getInitialURL().then(handleDeepLink);

    // Caso 2: app ya abierta en segundo plano
    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    return () => {
      authSubscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);


  // Calcula estadísticas globales del usuario (puntos, aciertos, exactos)
  const loadUserStats = async (userId: string, myPools: Pool[]) => {
    if (myPools.length === 0) return;

    // 1. Todas las predicciones del usuario
    const { data: preds } = await supabase
      .from('predictions')
      .select('home_score, away_score, pool_id, match_id')
      .eq('user_id', userId);

    if (!preds || preds.length === 0) return;

    // 2. Resultados reales de los partidos predichos (solo los que ya terminaron)
    const matchIds = preds.map((p: any) => p.match_id);
    const { data: matchResults } = await supabase
      .from('matches')
      .select('id, home_score, away_score')
      .in('id', matchIds)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (!matchResults || matchResults.length === 0) return;

    const matchMap: Record<string, { homeScore: string; awayScore: string }> = {};
    matchResults.forEach((m: any) => {
      matchMap[m.id] = {
        homeScore: String(m.home_score),
        awayScore: String(m.away_score),
      };
    });

    // 3. Calcular estadísticas
    let totalPoints = 0;
    let totalCorrect = 0;
    let totalExact = 0;
    let totalPredictions = 0;

    for (const pred of preds) {
      const result = matchMap[pred.match_id];
      if (!result) continue; // partido sin resultado — no contar aún

      const pool = myPools.find((p) => p.id === pred.pool_id);
      const scoringConfig = pool?.scoringConfig ?? DEFAULT_SCORING;

      const predInput = {
        homeScore: String(pred.home_score ?? ''),
        awayScore: String(pred.away_score ?? ''),
      };

      const type = getResultType(predInput, result);
      const pts = getPoints(type, scoringConfig);

      totalPredictions++;
      totalPoints += pts;
      if (pts > 0) totalCorrect++;
      if (type === 'exact') totalExact++;
    }

    setUserStats({ totalPoints, totalCorrect, totalExact, totalPredictions });
  };

  const loadPoolsForUser = async (userId: string) => {
    // 1. Cargar las pollas con sus partidos
    const { data, error } = await supabase
      .from('pool_participants')
      .select('pools(*, matches(*))')
      .eq('user_id', userId);

    if (error || !data) return;

    const poolsRaw = data.map((row: any) => row.pools).filter(Boolean);
    if (poolsRaw.length === 0) { setPools([]); return; }

    // 2. Contar participantes reales de cada polla desde pool_participants
    //    (más confiable que la columna pools.participants, que puede quedar desincronizada)
    const poolIds = poolsRaw.map((p: any) => p.id);
    const { data: allParticipants } = await supabase
      .from('pool_participants')
      .select('pool_id')
      .in('pool_id', poolIds);

    const countByPool: Record<string, number> = {};
    (allParticipants ?? []).forEach((row: any) => {
      countByPool[row.pool_id] = (countByPool[row.pool_id] ?? 0) + 1;
    });

    // 3. Construir los objetos Pool con el conteo real
    const myPools: Pool[] = poolsRaw.map((pool: any) => ({
      ...mapPool(pool, pool.matches ?? []),
      participants: countByPool[pool.id] ?? pool.participants,
    }));

    setPools(myPools);

    // Calcular estadísticas globales del usuario con las pollas recién cargadas
    await loadUserStats(userId, myPools);
  };

  // ─── Autenticación ──────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    setUser(profile);
    setIsLogged(true);
    await loadPoolsForUser(data.user.id);
  };

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;

    // Si Supabase requiere confirmación de correo, session viene null
    if (!data.session) {
      throw new Error('VERIFY_EMAIL');
    }

    const userId = data.user!.id;
    let profile = null;
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 800));
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (p) { profile = p; break; }
    }

    setUser(profile ?? { id: userId, name, email });
    setIsLogged(true);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsLogged(false);
    setUser(null);
    setPools([]);
  };

  const loginWithGoogle = async () => {
    // Importar módulos nativos de forma lazy — solo cuando el usuario los necesita.
    // Así la app no crashea al arrancar si el build no los incluye aún.
    let WebBrowser: any;
    let makeRedirectUri: any;
    try {
      WebBrowser = await import('expo-web-browser');
      const aes = await import('expo-auth-session');
      makeRedirectUri = aes.makeRedirectUri;
    } catch {
      throw new Error('GOOGLE_UNAVAILABLE');
    }

    // Solo llamar si la función existe (puede no estarlo en builds sin módulo nativo)
    if (typeof WebBrowser.maybeCompleteAuthSession === 'function') {
      WebBrowser.maybeCompleteAuthSession();
    } else {
      throw new Error('GOOGLE_UNAVAILABLE');
    }

    const redirectTo = makeRedirectUri({ scheme: 'retagol', path: 'auth/callback' });

    // 1. Obtener la URL de OAuth de Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;

    // 2. Abrir el navegador con la URL de Google
    const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
    if (result.type !== 'success') return;

    // 3. Extraer tokens del hash de la URL de retorno
    const hash = result.url.split('#')[1] ?? '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return;

    // 4. Establecer sesión en Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;

    // 5. Cargar perfil y pollas
    const userId = sessionData.user?.id;
    if (!userId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser(profile);
      setIsLogged(true);
      await loadPoolsForUser(userId);
    }
  };

  // ─── Pollas ─────────────────────────────────────────────────────────────────

  const createPool = async (name: string, type: string, matches: Match[], scoring: ScoringConfig) => {
    if (!user) return;

    const code = generateCode(type);

    // 1. Insertar la polla con su scoring config
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .insert({ name, type, code, creator_id: user.id, scoring_config: scoring })
      .select()
      .single();

    if (poolError) throw poolError;

    // 2. Insertar partidos con api_id real de football-data.org
    const matchRows = matches.map((m) => ({
      id: `${pool.id}_${m.apiId ?? m.id}`,
      pool_id: pool.id,
      home: m.home,
      away: m.away,
      date: m.date,
      utc_date: m.utcDate ?? null,
      api_id: m.apiId ?? null,
    }));

    const { error: matchError } = await supabase.from('matches').insert(matchRows);
    if (matchError) throw matchError;

    // 3. Agregar al creador como participante
    const { error: partError } = await supabase
      .from('pool_participants')
      .insert({ pool_id: pool.id, user_id: user.id });
    if (partError) throw partError;

    // 4. Actualizar estado local
    const newPool: Pool = mapPool(
      { ...pool, scoring_config: scoring },
      matchRows.map((m) => ({ ...m, home_score: null, away_score: null })),
    );
    setPools((prev) => [...prev, newPool]);
  };

  const joinPool = async (code: string): Promise<Pool> => {
    if (!user) throw new Error('No hay sesión activa');

    // 1. Buscar la polla por código
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('*, matches(*)')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (poolError || !pool) throw new Error('No se encontró ninguna polla con ese código.');

    // 2. Verificar si ya es participante
    const { data: existing } = await supabase
      .from('pool_participants')
      .select('user_id')
      .eq('pool_id', pool.id)
      .eq('user_id', user.id)
      .single();

    if (existing) throw new Error('YA_PARTICIPANTE');

    // 3. Registrar participante (el trigger en BD actualiza pools.participants automáticamente)
    const { error: joinError } = await supabase
      .from('pool_participants')
      .insert({ pool_id: pool.id, user_id: user.id });

    if (joinError) throw joinError;

    // 4. Consultar el conteo real de participantes tras el insert
    const { data: partRows } = await supabase
      .from('pool_participants')
      .select('user_id')
      .eq('pool_id', pool.id);

    const realCount = partRows?.length ?? pool.participants + 1;

    // 5. Construir objeto Pool con el conteo real y actualizar estado
    const newPool = mapPool({ ...pool }, pool.matches ?? []);
    newPool.participants = realCount;
    setPools((prev) => [...prev, newPool]);

    // Notificar al creador de la polla (fire & forget)
    fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pool_id: pool.id,
        pool_name: pool.name,
        joiner_name: user.name,
      }),
    }).catch(() => {});

    return newPool;
  };

  // ─── Predicciones ───────────────────────────────────────────────────────────

  const getPredictionsByPool = (poolId: string): Match[] => {
    return predictions[poolId]?.[user?.id ?? ''] || [];
  };

  const savePredictionsByPool = async (poolId: string, matches: Match[]) => {
    if (!user) return;

    const rows = matches.map((m) => ({
      pool_id: poolId,
      match_id: m.id,
      user_id: user.id,
      home_score: m.homeScore,
      away_score: m.awayScore,
    }));

    const { error } = await supabase
      .from('predictions')
      .upsert(rows, { onConflict: 'pool_id,match_id,user_id' });

    if (error) throw error;

    // Actualizar caché local
    setPredictions((prev) => ({
      ...prev,
      [poolId]: { ...prev[poolId], [user.id]: matches },
    }));
  };

  // ─── Debug ──────────────────────────────────────────────────────────────────

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      await supabase.auth.signOut();
      setPools([]);
      setPredictions({});
      setIsLogged(false);
      setUser(null);
    } catch (e) {
      console.log('Error limpiando datos:', e);
    }
  };

  // Recarga las pollas del usuario desde Supabase — útil al volver a Home
  const refreshPools = async () => {
    if (user) await loadPoolsForUser(user.id);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLogged,
        recoveryMode,
        clearRecoveryMode,
        userStats,
        login,
        register,
        loginWithGoogle,
        logout,
        pools,
        refreshPools,
        createPool,
        joinPool,
        predictions,
        getPredictionsByPool,
        savePredictionsByPool,
        clearAllData,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}
