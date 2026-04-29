import { View, Text, StyleSheet } from 'react-native';

export default function PoolDetailScreen({ route }: any) {
  const { name } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.text}>Detalle de la polla</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  text: {
    marginTop: 10,
  },
});