import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getMatchBreakdown, getMaxMatchPoints, getBadgeColor } from '../../../utils/scoring';

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

      // Cargar marcadores frescos con stage
      const { data: freshMatches, error: matchError } = await supabase
        .from('matches')
        .select('id, home, away, date, home_score, away_score, stage')
        .eq('pool_id', pool.id);

      if (matchError) { setLoadError(true); return; }

      if (freshMatches && freshMatches.length > 0) {
        const sorted = [...freshMatches].sort((a, b) => {
          const aHas = a.home_score != null && a.away_score != null;
          const bHas = b.home_score != null && b.away_score != null;
          if (aHas && !bHas) return -1;
          if (!aHas && bHas) return 1;
          return 0;
        });
        setMatches(sorted.map((m) => ({
          id: m.id,
          home: m.home,
          away: m.away,
          date: m.date,
          homeScore: m.home_score ?? '',
          awayScore: m.away_score ?? '',
          stage: m.stage ?? 'GROUP_STAGE',
        })));
      }
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(SYNC_FUNCTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}` },
      });
    } catch (_) {}
    await fetchData();
    setRefreshing(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (loadError) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>No se pudieron cargar los resultados.{'\n'}Verifica tu conexión e intenta de nuevo.</Text>
    </View>
  );

  const maxPts = getMaxMatchPoints(pool.scoringConfig);

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
        const breakdown = getMatchBreakdown(pred, result, pool.scoringConfig, match.stage);
        const badgeColor = getBadgeColor(breakdown.total, maxPts);
        const isKnockout = breakdown.multiplied;

        return (
          <View key={match.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.date}>{match.date}</Text>
              {isKnockout && (
                <View style={styles.knockoutBadge}>
                  <Text style={styles.knockoutText}>⚡ Eliminatoria</Text>
                </View>
              )}
            </View>

            <View style={styles.resultRow}>
              <View style={styles.matchInfo}>
                {hasResult ? (
                  <Text style={styles.matchTitle}>
                    {match.home}  {match.homeScore} – {match.awayScore}  {match.away}
                  </Text>
                ) : (
                  <Text style={styles.matchTitle}>{match.home} vs {match.away}</Text>
                )}
                <Text style={styles.prediction}>
                  Tu predicción:{' '}
                  {pred ? `${pred.homeScore || '?'} – ${pred.awayScore || '?'}` : 'Sin predicción'}
                </Text>

                {/* Desglose de puntos */}
                {hasResult && pred && breakdown.total > 0 && (
                  <View style={styles.breakdown}>
                    {breakdown.resultado > 0 && <Text style={styles.breakdownItem}>✓ Resultado +{breakdown.resultado}</Text>}
                    {breakdown.golesLocal > 0 && <Text style={styles.breakdownItem}>✓ Goles local +{breakdown.golesLocal}</Text>}
                    {breakdown.golesVisitante > 0 && <Text style={styles.breakdownItem}>✓ Goles visit. +{breakdown.golesVisitante}</Text>}
                    {breakdown.diferencia > 0 && <Text style={styles.breakdownItem}>✓ Diferencia +{breakdown.diferencia}</Text>}
                    {isKnockout && <Text style={[styles.breakdownItem, { color: '#7C3AED' }]}>⚡ ×2 eliminatoria</Text>}
                  </View>
                )}
              </View>

              <View style={[styles.badge, { backgroundColor: hasResult ? badgeColor : '#E2E8F0' }]}>
                {hasResult ? (
                  <>
                    <Text style={styles.badgePts}>{breakdown.total}</Text>
                    <Text style={styles.badgePtsLabel}>pts</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 24 },
  errorText: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 22 },
  list: { padding: 16 },
  card: {
    backgroundColor: 'white', padding: 16, borderRadius: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  date: { fontSize: 12, color: '#94A3B8' },
  knockoutBadge: { backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  knockoutText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  matchInfo: { flex: 1, marginRight: 12 },
  matchTitle: { fontWeight: '700', color: '#0F172A', fontSize: 14, marginBottom: 5 },
  prediction: { color: '#64748B', fontSize: 13, marginBottom: 6 },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  breakdownItem: { fontSize: 11, color: '#16A34A', backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, minWidth: 56, alignItems: 'center',
  },
  badgePts: { color: 'white', fontWeight: 'bold', fontSize: 18, lineHeight: 22 },
  badgePtsLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
  badgePending: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
});
