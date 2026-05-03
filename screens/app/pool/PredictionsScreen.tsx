import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import MatchCard from '../../../components/MatchCard';

export default function PredictionsScreen({ route }: any) {

  const { pool } = route.params;

  const {
    getPredictionsByPool,
    savePredictionsByPool,
  } = useApp();

  /**
   * 🔥 estado local
   */
  const [matches, setMatches] = useState(pool.matches);

  /**
   * 🔄 cargar predicciones de ESA polla
   */
  useEffect(() => {
    const saved = getPredictionsByPool(pool.id);

    if (saved.length > 0) {
      setMatches(saved);
    }
  }, []);

  /**
   * ✏️ editar
   */
  const handleChange = (id: string, field: string, value: string) => {
    setMatches((prev:any) =>
      prev.map((match:any) =>
        match.id === id ? { ...match, [field]: value } : match
      )
    );
  };

  /**
   * 💾 guardar SOLO en esa polla
   */
  const handleSave = () => {
    savePredictionsByPool(pool.id, matches);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchCard match={item} onChange={handleChange} />
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.text}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F1F5F9',
  },
  button: {
    backgroundColor: '#16A34A',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});