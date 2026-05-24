import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
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

  // Calcular cuáles partidos tienen resultado real en la BD.
  // Usamos pool.matches (datos originales) para no confundir resultado con predicción.
  const finishedIds = useMemo(() => {
    return new Set(
      (pool.matches as Match[])
        .filter((m) => m.homeScore !== '' && m.awayScore !== '')
        .map((m) => m.id)
    );
  }, [pool.matches]);

  const finishedCount = finishedIds.size;

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
      // Solo guardar partidos pendientes (sin resultado) donde el usuario ingresó al menos un marcador
      const filledMatches = matches.filter(
        (m) => !finishedIds.has(m.id) && (m.homeScore !== '' || m.awayScore !== '')
      );
      await savePredictionsByPool(pool.id, filledMatches);
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

  // Solo los partidos que aún no tienen resultado son editables
  const pendingMatches = matches.filter((m) => !finishedIds.has(m.id));

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MatchCard match={item} onChange={handleChange} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>Todo finalizado</Text>
            <Text style={styles.emptyText}>
              Todos los partidos de esta polla ya tienen resultado.{'\n'}
              Ve a la pestaña Resultados para ver tus puntos.
            </Text>
          </View>
        }
        ListFooterComponent={
          finishedCount > 0 && pendingMatches.length > 0 ? (
            <View style={styles.finishedBanner}>
              <Text style={styles.finishedIcon}>🔒</Text>
              <Text style={styles.finishedText}>
                {finishedCount} partido{finishedCount !== 1 ? 's' : ''} finalizado{finishedCount !== 1 ? 's' : ''} — ve a <Text style={styles.finishedLink}>Resultados</Text>
              </Text>
            </View>
          ) : null
        }
      />

      {pendingMatches.length > 0 && (
        <View style={styles.footer}>
          {savedMsg && <Text style={styles.savedMsg}>Predicciones guardadas ✓</Text>}
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
      )}
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

  // Estado vacío (todos finalizados)
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },

  // Banner inferior de partidos finalizados
  finishedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  finishedIcon: { fontSize: 14 },
  finishedText: { fontSize: 13, color: '#64748B', flex: 1 },
  finishedLink: { color: '#2563EB', fontWeight: '600' },

  // Footer con botón guardar
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
