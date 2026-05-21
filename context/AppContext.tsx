import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { ScoringConfig, DEFAULT_SCORING } from '../utils/scoring';

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

interface AppContextType {
  user: User | null;
  isLogged: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  pools: Pool[];
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

const generateCode = (type: CompetitionType): string => {
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
  const [pools, setPools] = useState<Pool[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, Match[]>>>({});
  const [loading, setLoading] = useState(true);

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
  }, []);


  const loadPoolsForUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('pool_participants')
      .select('pools(*, matches(*))')
      .eq('user_id', userId);

    if (error || !data) return;

    const myPools: Pool[] = data
      .map((row: any) => row.pools)
      .filter(Boolean)
      .map((pool: any) => mapPool(pool, pool.matches ?? []));

    setPools(myPools);
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

    // 3. Registrar participante y actualizar contador
    const { error: joinError } = await supabase
      .from('pool_participants')
      .insert({ pool_id: pool.id, user_id: user.id });

    if (joinError) throw joinError;

    await supabase
      .from('pools')
      .update({ participants: pool.participants + 1 })
      .eq('id', pool.id);

    // 4. Construir objeto Pool y actualizar estado
    const newPool = mapPool({ ...pool, participants: pool.participants + 1 }, pool.matches ?? []);
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

  return (
    <AppContext.Provider
      value={{
        user,
        isLogged,
        login,
        register,
        logout,
        pools,
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
