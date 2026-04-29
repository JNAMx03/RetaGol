import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Pollas</Text>

      <TouchableOpacity style={styles.card}>
        <Text>Champions League 2026</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CreatePool')}>
        <Text style={styles.buttonText}>+ Crear Polla</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('JoinPool')}>
        <Text style={styles.buttonText}>Unirse</Text>
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: '#16A34A',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
});