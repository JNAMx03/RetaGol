import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CompetitionType = 'liga' | 'copa' | 'champions';

export interface Match {
  id: string;
  home: string;
  away: string;
  date: string;
  homeScore: string;
  awayScore: string;
}

export interface Pool {
  id: string;
  name: string;
  type: CompetitionType;
  code: string;
  participants: number;
  matches: Match[];
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AppContextType {
  user: User;
  isLogged: boolean;
  login: (email: string, name: string) => void;
  logout: () => void;
  pools: Pool[];
  createPool: (name: string, type: CompetitionType, matches: Match[]) => void;
  predictions: Record<string, Record<string, Match[]>>;
  getPredictionsByPool: (poolId: string) => Match[];
  savePredictionsByPool: (poolId: string, matches: Match[]) => void;
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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>({ id: 'user1', name: 'Usuario', email: '' });
  const [isLogged, setIsLogged] = useState(false);
  const [pools, setPools] = useState<Pool[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, Match[]>>>({});
  const [loading, setLoading] = useState(true);

  // Cargar datos persistidos al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedPools, storedPredictions, storedLogged, storedUser] = await Promise.all([
          AsyncStorage.getItem('pools'),
          AsyncStorage.getItem('predictions'),
          AsyncStorage.getItem('isLogged'),
          AsyncStorage.getItem('user'),
        ]);

        if (storedPools) setPools(JSON.parse(storedPools));
        if (storedPredictions) setPredictions(JSON.parse(storedPredictions));
        if (storedLogged) setIsLogged(JSON.parse(storedLogged));
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (e) {
        console.log('Error cargando datos:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistir pools automáticamente
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem('pools', JSON.stringify(pools)).catch(console.log);
    }
  }, [pools, loading]);

  // Persistir predicciones automáticamente
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem('predictions', JSON.stringify(predictions)).catch(console.log);
    }
  }, [predictions, loading]);

  // ─── Autenticación ──────────────────────────────────────────────────────────

  const login = (email: string, name: string) => {
    const newUser: User = { id: 'user1', name, email };
    setUser(newUser);
    setIsLogged(true);
    AsyncStorage.setItem('isLogged', 'true').catch(console.log);
    AsyncStorage.setItem('user', JSON.stringify(newUser)).catch(console.log);
  };

  const logout = () => {
    setIsLogged(false);
    AsyncStorage.setItem('isLogged', 'false').catch(console.log);
  };

  // ─── Pollas ─────────────────────────────────────────────────────────────────

  const createPool = (name: string, type: CompetitionType, matches: Match[]) => {
    const newPool: Pool = {
      id: Date.now().toString(),
      name,
      type,
      code: generateCode(type),
      participants: 1,
      matches,
      createdAt: new Date().toISOString(),
    };
    setPools((prev) => [...prev, newPool]);
  };

  // ─── Predicciones ───────────────────────────────────────────────────────────

  const getPredictionsByPool = (poolId: string): Match[] => {
    return predictions[poolId]?.[user.id] || [];
  };

  const savePredictionsByPool = (poolId: string, matches: Match[]) => {
    setPredictions((prev) => ({
      ...prev,
      [poolId]: {
        ...prev[poolId],
        [user.id]: matches,
      },
    }));
  };

  // ─── Debug ──────────────────────────────────────────────────────────────────

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      setPools([]);
      setPredictions({});
      setIsLogged(false);
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
        logout,
        pools,
        createPool,
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
