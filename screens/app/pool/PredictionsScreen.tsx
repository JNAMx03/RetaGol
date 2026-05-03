import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import MatchCard from '../../../components/MatchCard';

const initialMatches = [
  {
    id: '1',
    league: 'Champions League',
    home: 'Real Madrid',
    away: 'Barcelona',
    date: 'Hoy 18:00',
    homeScore: '',
    awayScore: '',
  },
  {
    id: '2',
    league: 'Premier League',
    home: 'Arsenal',
    away: 'Chelsea',
    date: 'Mañana 20:00',
    homeScore: '',
    awayScore: '',
  },
];

export default function PredictionsScreen() {
  const { predictions, setPredictions, loading } = useApp();

  const [matches, setMatches] = useState(initialMatches);

  // SINCRONIZAR SOLO SI HAY DATOS
  useEffect(() => {
    if (predictions.length > 0) {
      console.log('🔄 Sincronizando desde contexto');
      setMatches(predictions);
    }
  }, [predictions]);

  const handleChange = (id: string, field: string, value: string) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === id ? { ...match, [field]: value } : match
      )
    );
  };

  const handleSave = () => {
    console.log('✅ Guardando global:', matches);
    setPredictions(matches);
  };

  if (loading) {
    return <Text>Cargando...</Text>;
  }

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