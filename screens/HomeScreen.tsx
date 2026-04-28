import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RetaGol ⚽</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CreatePool')}
      >
        <Text style={styles.buttonText}>Crear Polla</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('JoinPool')}
      >
        <Text style={styles.buttonText}>Unirse a Polla</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.secondaryText}>Perfil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#22C55E',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#94A3B8',
  },
});