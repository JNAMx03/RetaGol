import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp, Match } from '../../../context/AppContext';
import { getResultType, POINTS, BADGE_COLORS, BADGE_LABELS } from '../../../utils/scoring';

// Resultados simulados por ID de partido (reemplazar con API real en V2)
const MOCK_RESULTS: Record<string, { homeScore: string; awayScore: string }> = {
  ch1: { homeScore: '2', awayScore: '1' },
  ch2: { homeScore: '1', awayScore: '1' },
  ch3: { homeScore: '3', awayScore: '2' },
  ch4: { homeScore: '0', awayScore: '2' },
  l1:  { homeScore: '1', awayScore: '2' },
  l2:  { homeScore: '0', awayScore: '0' },
  l3:  { homeScore: '2', awayScore: '1' },
  l4:  { homeScore: '3', awayScore: '0' },
  c1:  { homeScore: '2', awayScore: '0' },
  c2:  { homeScore: '1', awayScore: '1' },
  c3:  { homeScore: '0', awayScore: '1' },
};

export default function ResultsScreen({ route }: any) {
  const { pool } = route.params;
  const { getPredictionsByPool } = useApp();
  const predictions = getPredictionsByPool(pool.id);
  const matches: Match[] = pool.matches ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      {matches.map((match) => {
        const pred = predictions.find((p) => p.id === match.id);
        const result = MOCK_RESULTS[match.id];
        const type = getResultType(pred, result);
        const points = POINTS[type];
        const badgeColor = BADGE_COLORS[type];
        const badgeLabel = BADGE_LABELS[type];
        const hasResult = !!result;

        return (
          <View key={match.id} style={styles.card}>
            <Text style={styles.date}>{match.date}</Text>

            <View style={styles.resultRow}>
              <View style={styles.matchInfo}>
                {hasResult ? (
                  <Text style={styles.matchTitle}>
                    {match.home} {result!.homeScore} – {result!.awayScore} {match.away}
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
  matchTitle: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 5,
  },
  prediction: { color: '#64748B', fontSize: 13 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 58,
    alignItems: 'center',
  },
  badgePts: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    lineHeight: 16,
  },
  badgeLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    lineHeight: 12,
  },
  badgePending: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
});
