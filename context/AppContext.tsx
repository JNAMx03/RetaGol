import { createContext, useContext, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import {
  ScoringConfig, DEFAULT_SCORING,
  ChampionConfig, DEFAULT_CHAMPION,
  PrizeConfig, DEFAULT_PRIZE,
  getMatchPoints,
} from '../utils/scoring';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type { ScoringConfig, ChampionConfig, PrizeConfig };

export interface Match {
  id: string;
  home: string;
  away: string;
  date: string;
  utcDate?: string;
  homeScore: string;
  awayScore: string;
  apiId?: number;
  stage?: string;  // GROUP_STAGE, ROUND_OF_16, QUARTER_FINAL, etc.
}

export interface Pool {
  id: string;
  name: string;
  type: string;
  code: string;
  creatorId: string;   // para saber quién puede borrar la polla
  participants: number;
  matches: Match[];
  createdAt: string;
  scoringConfig: ScoringConfig;
  championConfig: ChampionConfig;
  prizeConfig: PrizeConfig;
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
  createPool: (name: string, type: string, matches: Match[], scoring: ScoringConfig, champion: ChampionConfig, prize: PrizeConfig) => Promise<void>;
  joinPool: (code: string) => Promise<Pool>;
  predictions: Record<string, Record<string, Match[]>>;
  getPredictionsByPool: (poolId: string) => Match[];
  savePredictionsByPool: (poolId: string, matches: Match[]) => Promise<void>;
  updateProfile: (updates: { name?: string }) => Promise<void>;
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
  creatorId: pool.creator_id ?? '',
  participants: pool.participants,
  createdAt: pool.created_at,
  // Mezclar con DEFAULT_SCORING para que pollas viejas (formato { exact, oneTeam, ... })
  // no produzcan NaN al acceder a campos nuevos como resultado, golesLocal, etc.
  scoringConfig: {
    resultado:        pool.scoring_config?.resultado        ?? DEFAULT_SCORING.resultado,
    golesLocal:       pool.scoring_config?.golesLocal       ?? DEFAULT_SCORING.golesLocal,
    golesVisitante:   pool.scoring_config?.golesVisitante   ?? DEFAULT_SCORING.golesVisitante,
    diferencia:       pool.scoring_config?.diferencia       ?? DEFAULT_SCORING.diferencia,
    dobleEliminatoria: pool.scoring_config?.dobleEliminatoria ?? DEFAULT_SCORING.dobleEliminatoria,
    bonusUnico:       pool.scoring_config?.bonusUnico       ?? DEFAULT_SCORING.bonusUnico,
  },
  championConfig: pool.champion_config ?? DEFAULT_CHAMPION,
  prizeConfig: pool.prize_config ?? DEFAULT_PRIZE,
  matches: matches.map((m) => ({
    id: m.id,
    home: m.home,
    away: m.away,
    date: m.date,
    utcDate: m.utc_date ?? undefined,
    homeScore: m.home_score ?? '',
    awayScore: m.away_score ?? '',
    stage: m.stage ?? 'GROUP_STAGE',
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

    // Escuchar eventos de Supabase Auth
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setLoading(false);
      }
    });

    // Procesar deep links de Supabase. Tres casos posibles:
    //
    //   1. Recuperación de contraseña (reset-password):
    //      PKCE:     prolla://reset-password?code=xxx
    //      Implicit: prolla://reset-password#access_token=xxx&type=recovery
    //
    //   2. Confirmación de correo / signup (auth/callback):
    //      PKCE:     prolla://auth/callback?code=xxx
    //      Implicit: prolla://auth/callback#access_token=xxx&type=signup
    //
    //   3. OAuth de Google — manejado directamente en loginWithGoogle() via WebBrowser
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      const isRecovery = url.includes('reset-password');
      const isCallback = url.includes('auth/callback');
      // También aceptar prolla:// con tokens en el hash (Google OAuth implicit flow)
      const hasTokensInHash = url.includes('access_token=');
      if (!isRecovery && !isCallback && !hasTokensInHash) return;

      // ── PKCE flow: ?code=xxx ───────────────────────────────────────────────
      const queryString = url.split('?')[1] ?? '';
      const queryParams = new URLSearchParams(queryString);
      const code = queryParams.get('code');

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return;

        if (isRecovery) {
          // Modo recuperación — mostrar ResetPasswordScreen
          setRecoveryMode(true);
        } else if (data.user) {
          // Confirmación de correo — loguear al usuario directamente
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', data.user.id).single();
          if (profile) {
            setUser(profile);
            setIsLogged(true);
            await loadPoolsForUser(data.user.id);
          }
        }
        return;
      }

      // ── Implicit flow: #access_token=xxx ──────────────────────────────────
      const hash = url.split('#')[1] ?? '';
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type'); // 'recovery' | 'signup'
      if (!accessToken) return;

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      });
      if (error) return;

      // type === 'recovery': reset de contraseña
      // type === 'signup': confirmación de correo
      // type === null/vacío: Google OAuth (implicit flow) → loguear directamente
      if (type === 'recovery' || isRecovery) {
        setRecoveryMode(true);
      } else if (data.user) {
        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
          setUser(profile);
          setIsLogged(true);
          await loadPoolsForUser(data.user.id);
        }
      }
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

      const pts = getMatchPoints(predInput, result, scoringConfig);
      const isExact = predInput.homeScore === result.homeScore && predInput.awayScore === result.awayScore;

      totalPredictions++;
      totalPoints += pts;
      if (pts > 0) totalCorrect++;
      if (isExact) totalExact++;
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

    const redirectTo = makeRedirectUri({ scheme: 'prolla', path: 'auth/callback' });

    // 1. Obtener la URL de OAuth de Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;

    // 2. Abrir el navegador con la URL de Google
    if (Platform.OS === 'ios') {
      // iOS: openAuthSessionAsync captura la URL de retorno directamente
      const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
      if (result.type !== 'success' || !result.url) return;

      // Extraer sesión de la URL — PKCE (?code=xxx) o implicit (#access_token=xxx)
      const queryString = result.url.split('?')[1] ?? '';
      const queryParams = new URLSearchParams(queryString);
      const code = queryParams.get('code');

      let sessionData: any = null;
      let sessionError: any = null;

      if (code) {
        const res = await supabase.auth.exchangeCodeForSession(code);
        sessionData = res.data; sessionError = res.error;
      } else {
        const hash = result.url.split('#')[1] ?? '';
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (!accessToken || !refreshToken) return;
        const res = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        sessionData = res.data; sessionError = res.error;
      }

      if (sessionError) throw sessionError;

      const userId = sessionData?.user?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', userId).single();

      if (profile) {
        setUser(profile);
        setIsLogged(true);
        await loadPoolsForUser(userId);
      }
    } else {
      // Android: Chrome Custom Tab (overlay dentro de la app — mejor UX que browser externo).
      // Devuelve 'cancel' cuando prolla:// abre la app, pero el callback llega
      // via Linking.addEventListener → handleDeepLink lo procesa automáticamente.
      await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
    }
  };

  // ─── Pollas ─────────────────────────────────────────────────────────────────

  const createPool = async (
    name: string,
    type: string,
    matches: Match[],
    scoring: ScoringConfig,
    champion: ChampionConfig,
    prize: PrizeConfig,
  ) => {
    if (!user) return;

    const code = generateCode(type);

    // 1. Insertar la polla con toda la configuración
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .insert({
        name,
        type,
        code,
        creator_id: user.id,
        scoring_config: scoring,
        champion_config: champion,
        prize_config: prize,
      })
      .select()
      .single();

    if (poolError) throw poolError;

    // 2. Insertar partidos con stage, api_id y fechas
    const matchRows = matches.map((m) => ({
      id: `${pool.id}_${m.apiId ?? m.id}`,
      pool_id: pool.id,
      home: m.home,
      away: m.away,
      date: m.date,
      utc_date: m.utcDate ?? null,
      api_id: m.apiId ?? null,
      stage: m.stage ?? 'GROUP_STAGE',
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
      { ...pool, scoring_config: scoring, champion_config: champion, prize_config: prize },
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

  // ─── Perfil ─────────────────────────────────────────────────────────────────

  const updateProfile = async (updates: { name?: string }) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) throw error;
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
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
        updateProfile,
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
