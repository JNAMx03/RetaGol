import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import MatchCard from '../../../components/MatchCard';

export default function PredictionsScreen({ route }: any) {
  const { pool } = route.params;
  const { user, savePredictionsByPool } = useApp();
  const [matches, setMatches] = useState<Match[]>(pool.matches);
  const [loadingPreds, setLoadingPreds] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Cargar predicciones guardadas desde Supabase al entrar
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const { data, error } = await supabase
          .from('predictions')
          .select('match_id, home_score, away_score')
          .eq('pool_id', pool.id)
          .eq('user_id', user?.id ?? '');

        if (!error && data && data.length > 0) {
          const scoreMap = new Map(
            data.map((p) => [p.match_id, { homeScore: p.home_score ?? '', awayScore: p.away_score ?? '' }])
          );
          setMatches((prev) =>
            prev.map((m) => ({
              ...m,
              homeScore: scoreMap.get(m.id)?.homeScore ?? m.homeScore,
              awayScore: scoreMap.get(m.id)?.awayScore ?? m.awayScore,
            }))
          );
        }
      } catch (e) {
        console.log('Error cargando predicciones:', e);
      } finally {
        setLoadingPreds(false);
      }
    };
    fetchPredictions();
  }, []);

  const handleChange = (id: string, field: string, value: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePredictionsByPool(pool.id, matches);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (e) {
      console.log('Error guardando predicciones:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loadingPreds) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

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
        {savedMsg && <Text style={styles.savedMsg}>Predicciones guardadas</Text>}
        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnText}>✓  Guardar</Text>
          }
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  savedMsg: {
    textAlign: 'center',
    color: '#16A34A',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
