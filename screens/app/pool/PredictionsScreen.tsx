import { View, FlatList, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import MatchCard from '../../../components/MatchCard';

export default function PredictionsScreen({ route }: any) {
  const { pool } = route.params;
  const { getPredictionsByPool, savePredictionsByPool } = useApp();
  const [matches, setMatches] = useState<Match[]>(pool.matches);

  // Cargar predicciones guardadas de esta polla al entrar
  useEffect(() => {
    const saved = getPredictionsByPool(pool.id);
    if (saved.length > 0) setMatches(saved);
  }, []);

  const handleChange = (id: string, field: string, value: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = () => {
    savePredictionsByPool(pool.id, matches);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MatchCard match={item} onChange={handleChange} />
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleSave}>
          <Text style={styles.btnText}>✓  Guardar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  list: {
    padding: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
