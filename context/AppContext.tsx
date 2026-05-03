import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext<any>(null);

export function AppProvider({ children }: any) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  // CARGAR
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await AsyncStorage.getItem('predictions');

        if (data) {
          const parsed = JSON.parse(data);
          console.log('📥 Cargando desde storage:', parsed);
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

  // GUARDAR
  useEffect(() => {
    const saveData = async () => {
      try {
        console.log('💾 Guardando:', predictions);
        await AsyncStorage.setItem(
          'predictions',
          JSON.stringify(predictions)
        );
      } catch (e) {
        console.log('❌ Error guardando:', e);
      }
    };

    if (!loading) {
      saveData();
    }
  }, [predictions, loading]);

  return (
    <AppContext.Provider value={{ predictions, setPredictions, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}