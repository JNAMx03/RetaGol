import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function PoolCard({ pool, onPress }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.name}>{pool.name}</Text>
      <Text style={styles.info}>
        {pool.participants} participantes
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  info: {
    color: '#64748B',
    marginTop: 5,
  },
});