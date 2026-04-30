import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function MatchCard({ match, onChange }: any) {
  return (
    <View style={styles.card}>
      
      <Text style={styles.league}>{match.league}</Text>

      <View style={styles.row}>
        <Text style={styles.team}>{match.home}</Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={match.homeScore?.toString()}
          onChangeText={(value) =>
            onChange(match.id, 'homeScore', value)
          }
        />

        <Text style={styles.separator}>-</Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={match.awayScore?.toString()}
          onChangeText={(value) =>
            onChange(match.id, 'awayScore', value)
          }
        />

        <Text style={styles.team}>{match.away}</Text>
      </View>

      <Text style={styles.date}>{match.date}</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  league: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  team: {
    flex: 1,
    fontWeight: 'bold',
  },
  input: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    textAlign: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  separator: {
    fontWeight: 'bold',
  },
  date: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
  },
});