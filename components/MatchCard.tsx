import { View, Text, TextInput, StyleSheet } from 'react-native';

interface Match {
  id: string;
  home: string;
  away: string;
  date: string;
  homeScore: string;
  awayScore: string;
}

interface Props {
  match: Match;
  onChange: (id: string, field: string, value: string) => void;
}

export default function MatchCard({ match, onChange }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.date}>{match.date}</Text>

      <View style={styles.row}>
        <Text style={styles.team} numberOfLines={2}>{match.home}</Text>

        <View style={styles.scoreRow}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={match.homeScore?.toString()}
            onChangeText={(v) => onChange(match.id, 'homeScore', v)}
            maxLength={2}
            placeholder="0"
            placeholderTextColor="#CBD5E1"
          />
          <Text style={styles.separator}>-</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={match.awayScore?.toString()}
            onChangeText={(v) => onChange(match.id, 'awayScore', v)}
            maxLength={2}
            placeholder="0"
            placeholderTextColor="#CBD5E1"
          />
        </View>

        <Text style={[styles.team, styles.teamRight]} numberOfLines={2}>{match.away}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  date: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  team: {
    flex: 1,
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 14,
  },
  teamRight: {
    textAlign: 'right',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  input: {
    width: 40,
    height: 40,
    backgroundColor: '#F4EBD8',
    textAlign: 'center',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#DADADA',
  },
  separator: {
    fontWeight: 'bold',
    marginHorizontal: 6,
    color: '#64748B',
    fontSize: 18,
  },
});
