import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function MatchCard() {
  return (
    <View style={styles.card}>
      
      <Text style={styles.league}>Champions League</Text>

      <View style={styles.row}>
        <Text style={styles.team}>Real Madrid</Text>

        <TextInput style={styles.input} keyboardType="numeric" />
        <Text style={styles.separator}>-</Text>
        <TextInput style={styles.input} keyboardType="numeric" />

        <Text style={styles.team}>Barcelona</Text>
      </View>

      <Text style={styles.date}>Hoy 18:00</Text>

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
    justifyContent: 'space-between',
  },
  team: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 14,
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