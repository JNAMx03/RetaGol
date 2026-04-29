import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import PollCard from '../../components/PollCard';

const data = [1, 2, 3]; // luego será dinámico

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Pollas</Text>

      <FlatList
        data={data}
        keyExtractor={(item) => item.toString()}
        renderItem={() => <PollCard navigation={navigation} />}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreatePool')}
        >
          <Text style={styles.buttonText}>+ Crear Polla</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => navigation.navigate('JoinPool')}
        >
          <Text style={styles.buttonText}>Unirse</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  createButton: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 5,
  },
  joinButton: {
    backgroundColor: '#16A34A',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});