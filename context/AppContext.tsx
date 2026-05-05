import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext<any>(null);

export function AppProvider({ children }: any) {

  /**
   * 👤 Usuario simulado (luego vendrá del backend)
   */
  const [user, setUser] = useState({
    id: 'user1',
    name: 'Nico',
  });

  /**
   * 🏆 Pools (pollas)
   */
  const [pools, setPools] = useState<any[]>([]);

  /**
   * 📊 Predicciones
   * Estructura:
   * {
   *   poolId: {
   *     userId: [matches]
   *   }
   * }
   */
  const [predictions, setPredictions] = useState<any>({});

  /**
   * ⏳ Estado de carga
   */
  const [loading, setLoading] = useState(true);

  /**
   * 📥 Cargar datos al iniciar
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedPools = await AsyncStorage.getItem('pools');
        const storedPredictions = await AsyncStorage.getItem('predictions');

        if (storedPools) {
          setPools(JSON.parse(storedPools));
        }

        if (storedPredictions) {
          setPredictions(JSON.parse(storedPredictions));
        }

      } catch (e) {
        console.log('❌ Error cargando datos:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /**
   * 💾 Guardar pools automáticamente
   */
  useEffect(() => {
    const savePools = async () => {
      try {
        await AsyncStorage.setItem('pools', JSON.stringify(pools));
      } catch (e) {
        console.log('❌ Error guardando pools:', e);
      }
    };

    if (!loading) {
      savePools();
    }
  }, [pools, loading]);

  /**
   * 💾 Guardar predicciones automáticamente
   */
  useEffect(() => {
    const savePredictions = async () => {
      try {
        await AsyncStorage.setItem(
          'predictions',
          JSON.stringify(predictions)
        );
      } catch (e) {
        console.log('❌ Error guardando predicciones:', e);
      }
    };

    if (!loading) {
      savePredictions();
    }
  }, [predictions, loading]);

  /**
   * ➕ Crear nueva polla
   */
  const createPool = (name: string) => {
    const newPool = {
      id: Date.now().toString(),
      name,
      participants: 1,
      matches: [
        {
          id: '1',
          home: 'Equipo A',
          away: 'Equipo B',
          date: 'Próximamente',
          homeScore: '',
          awayScore: '',
        },
      ],
    };

    setPools((prev) => [...prev, newPool]);
  };

  /**
   * 📥 Obtener predicciones de una polla (del usuario actual)
   */
  const getPredictionsByPool = (poolId: string) => {
    return predictions[poolId]?.[user.id] || [];
  };

  /**
   * 💾 Guardar predicciones por polla y usuario
   */
  const savePredictionsByPool = (poolId: string, matches: any[]) => {
    setPredictions((prev: any) => ({
      ...prev,
      [poolId]: {
        ...prev[poolId],
        [user.id]: matches,
      },
    }));
  };

  /**
   * 🧹 Limpiar todo (debug / logout futuro)
   */
  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      setPools([]);
      setPredictions({});
      console.log('🧹 Todo limpiado');
    } catch (e) {
      console.log('❌ Error limpiando:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
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
  return useContext(AppContext);
}