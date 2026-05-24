import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getResultType, getPoints, BADGE_COLORS, BADGE_LABELS } from '../../../utils/scoring';

const SYNC_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sync-results`;

export default function ResultsScreen({ route }: any) {
  const { pool } = route.params;
  const { user } = useApp();

  const [matches, setMatches] = useState<Match[]>(pool.matches ?? []);
  const [predictions, setPredictions] = useState<Record<string, { homeScore: string; awayScore: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchData = async () => {
    try {
      // Cargar predicciones del usuario
      const { data: preds } = await supabase
        .from('predictions')
        .select('match_id, home_score, away_score')
        .eq('pool_id', pool.id)
        .eq('user_id', user?.id ?? '');

      if (preds) {
        const map: Record<string, { homeScore: string; awayScore: string }> = {};
        preds.forEach((p) => {
          map[p.match_id] = { homeScore: p.home_score ?? '', awayScore: p.away_score ?? '' };
        });
        setPredictions(map);
      }

      // Cargar marcadores frescos desde la BD (columnas explícitas para evitar problemas con select *)
      const { data: freshMatches, error: matchError } = await supabase
        .from('matches')
        .select('id, home, away, date, home_score, away_score')
        .eq('pool_id', pool.id);

      if (matchError) {
        setLoadError(true);
        return;
      }

      if (freshMatches && freshMatches.length > 0) {
        // Ordenar: partidos con resultado primero, luego pendientes
        const sorted = [...freshMatches].sort((a, b) => {
          const aHasResult = a.home_score != null && a.away_score != null;
          const bHasResult = b.home_score != null && b.away_score != null;
          if (aHasResult && !bHasResult) return -1;
          if (!aHasResult && bHasResult) return 1;
          return 0;
        });
        setMatches(sorted.map((m) => ({
          id: m.id,
          home: m.home,
          away: m.away,
          date: m.date,
          homeScore: m.home_score ?? '',
          awayScore: m.away_score ?? '',
        })));
      } else if (freshMatches && freshMatches.length === 0) {
        // Supabase devolvió vacío — puede ser un problema de RLS
        console.warn('[ResultsScreen] ⚠️ Supabase devolvió 0 matches para pool:', pool.id);
        // Conservar pool.matches como fallback para no dejar pantalla vacía
      }
    } catch (e) {
      console.log('Error cargando resultados:', e);
      setLoadError(true);
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Pedir a la Edge Function que sincronice resultados desde API-Football
      await fetch(SYNC_FUNCTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}` },
      });
    } catch (_) {
      // Si la función falla, igual recargamos los datos locales
    }
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 22 }}>
          No se pudieron cargar los resultados.{'\n'}Verifica tu conexión e intenta de nuevo.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
    >
      {matches.map((match) => {
        const pred = predictions[match.id];
        const hasResult = match.homeScore !== '' && match.awayScore !== '';
        const result = hasResult ? { homeScore: match.homeScore, awayScore: match.awayScore } : undefined;
        const type = getResultType(pred, result);
        const points = getPoints(type, pool.scoringConfig);
        const badgeColor = BADGE_COLORS[type];
        const badgeLabel = BADGE_LABELS[type];

        return (
          <View key={match.id} style={styles.card}>
            <Text style={styles.date}>{match.date}</Text>

            <View style={styles.resultRow}>
              <View style={styles.matchInfo}>
                {hasResult ? (
                  <Text style={styles.matchTitle}>
                    {match.home} {match.homeScore} – {match.awayScore} {match.away}
                  </Text>
                ) : (
                  <Text style={styles.matchTitle}>
                    {match.home} vs {match.away}
                  </Text>
                )}

                <Text style={styles.prediction}>
                  Tu predicción:{' '}
                  {pred
                    ? `${pred.homeScore || '?'} – ${pred.awayScore || '?'}`
                    : 'Sin predicción'}
                </Text>
              </View>

              <View style={[styles.badge, { backgroundColor: hasResult ? badgeColor : '#E2E8F0' }]}>
                {hasResult ? (
                  <>
                    <Text style={styles.badgePts}>{points} pt{points !== 1 ? 's' : ''}</Text>
                    <Text style={styles.badgeLabel}>{badgeLabel}</Text>
                  </>
                ) : (
                  <Text style={styles.badgePending}>Pdte.</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  list: { padding: 16 },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  date: { fontSize: 12, color: '#94A3B8', marginBottom: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchInfo: { flex: 1, marginRight: 12 },
  matchTitle: { fontWeight: '700', color: '#0F172A', fontSize: 14, marginBottom: 5 },
  prediction: { color: '#64748B', fontSize: 13 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 58,
    alignItems: 'center',
  },
  badgePts: { color: 'white', fontWeight: 'bold', fontSize: 13, lineHeight: 16 },
  badgeLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9, lineHeight: 12 },
  badgePending: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
});
