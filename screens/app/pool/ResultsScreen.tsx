import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getResultType, POINTS, BADGE_COLORS, BADGE_LABELS } from '../../../utils/scoring';

export default function ResultsScreen({ route }: any) {
  const { pool } = route.params;
  const { user } = useApp();
  const matches: Match[] = pool.matches ?? [];

  const [predictions, setPredictions] = useState<Record<string, { homeScore: string; awayScore: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const { data } = await supabase
          .from('predictions')
          .select('match_id, home_score, away_score')
          .eq('pool_id', pool.id)
          .eq('user_id', user?.id ?? '');

        if (data) {
          const map: Record<string, { homeScore: string; awayScore: string }> = {};
          data.forEach((p) => {
            map[p.match_id] = { homeScore: p.home_score ?? '', awayScore: p.away_score ?? '' };
          });
          setPredictions(map);
        }
      } catch (e) {
        console.log('Error cargando resultados:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      {matches.map((match) => {
        const pred = predictions[match.id];
        const hasResult = match.homeScore !== '' && match.awayScore !== '';
        const result = hasResult ? { homeScore: match.homeScore, awayScore: match.awayScore } : undefined;
        const type = getResultType(pred, result);
        const points = POINTS[type];
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
