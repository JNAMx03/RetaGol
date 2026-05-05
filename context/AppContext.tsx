import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext<any>(null);

export function AppProvider({ children }: any) {

  const [user, setUser] = useState({
    id: 'user1',
    name: 'Nico',
  });

  /**
   * 🔥 Ahora es un objeto por poolId
   */
  const [predictions, setPredictions] = useState<any>({});
  const [loading, setLoading] = useState(true);

  /**
   * 📥 Cargar desde storage
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await AsyncStorage.getItem('predictions');

        if (data) {
          const parsed = JSON.parse(data);
          console.log('📥 Cargando:', parsed);
          setPredictions(parsed);
        }
      } catch (e) {
        console.log('❌ Error cargando:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /**
   * 💾 Guardar automáticamente
   */
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(
          'predictions',
          JSON.stringify(predictions)
        );
        console.log('💾 Guardado:', predictions);
      } catch (e) {
        console.log('❌ Error guardando:', e);
      }
    };

    if (!loading) {
      saveData();
    }
  }, [predictions, loading]);

  /**
   * 🧠 Obtener predicciones de una polla
   */
  const getPredictionsByPool = (poolId: string) => {
    return predictions[poolId]?.[user.id] || [];
  };

  /**
   * 🧠 Guardar predicciones de una polla
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
   * 🧹 Limpiar
   */
  const clearPredictions = async () => {
    await AsyncStorage.removeItem('predictions');
    setPredictions({});
  };

  return (
    <AppContext.Provider
      value={{
        predictions,
        getPredictionsByPool,
        savePredictionsByPool,
        clearPredictions,
        loading,
        user,
        setUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}