import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../../context/AppContext';
import { getResultType, POINTS } from '../../../utils/scoring';

// Resultados simulados (reemplazar con API real en V2)
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

// Participantes simulados para demo (reemplazar con backend en V2)
const MOCK_PARTICIPANTS = [
  {
    id: 'p1', name: 'John Doe',
    predictions: [
      { id: 'ch1', homeScore: '2', awayScore: '8' },
      { id: 'ch2', homeScore: '2', awayScore: '0' },
      { id: 'ch3', homeScore: '3', awayScore: '2' },
      { id: 'ch4', homeScore: '0', awayScore: '2' },
    ],
  },
  {
    id: 'p2', name: 'Jane Smith',
    predictions: [
      { id: 'ch1', homeScore: '1', awayScore: '0' },
      { id: 'ch2', homeScore: '1', awayScore: '1' },
      { id: 'ch3', homeScore: '3', awayScore: '1' },
      { id: 'ch4', homeScore: '1', awayScore: '2' },
    ],
  },
  {
    id: 'p3', name: 'Mike Johnson',
    predictions: [
      { id: 'ch1', homeScore: '2', awayScore: '1' },
      { id: 'ch2', homeScore: '0', awayScore: '0' },
      { id: 'ch3', homeScore: '2', awayScore: '2' },
      { id: 'ch4', homeScore: '0', awayScore: '3' },
    ],
  },
];

function calcPoints(predictions: { id: string; homeScore: string; awayScore: string }[]): number {
  return predictions.reduce((total, pred) => {
    const result = MOCK_RESULTS[pred.id];
    const type = getResultType(pred, result);
    return total + POINTS[type];
  }, 0);
}

const PODIUM_COLORS = ['#FACC15', '#94A3B8', '#B45309'];

export default function StandingsScreen() {
  const { user } = useApp();

  const ranking = MOCK_PARTICIPANTS
    .map((p) => ({ ...p, points: calcPoints(p.predictions) }))
    .sort((a, b) => b.points - a.points);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      {/* Encabezado de tabla */}
      <View style={styles.tableHeader}>
        <Text style={styles.colHash}>#</Text>
        <Text style={styles.colName}>Participante</Text>
        <Text style={styles.colPts}>Puntos</Text>
      </View>

      {ranking.map((participant, index) => {
        const isMe = participant.name === user.name;
        const badgeColor = PODIUM_COLORS[index] ?? '#E2E8F0';

        return (
          <View key={participant.id} style={[styles.row, isMe && styles.rowMe]}>
            <View style={[styles.posBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.posText}>{index + 1}</Text>
            </View>

            <Text style={[styles.nameText, isMe && styles.nameMe]} numberOfLines={1}>
              {participant.name}
            </Text>

            <Text style={[styles.ptsText, isMe && styles.ptsMe]}>
              {participant.points}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  list: { padding: 16 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
  },
  colHash: { width: 42, fontWeight: '700', color: '#64748B', fontSize: 13 },
  colName: { flex: 1, fontWeight: '700', color: '#64748B', fontSize: 13 },
  colPts: { fontWeight: '700', color: '#64748B', fontSize: 13, width: 60, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowMe: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  posBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  posText: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  nameText: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '500' },
  nameMe: { color: '#2563EB', fontWeight: '700' },
  ptsText: { fontSize: 15, fontWeight: '700', color: '#0F172A', width: 50, textAlign: 'right' },
  ptsMe: { color: '#2563EB' },
});
