import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import PoolCard from '../../components/PoolCard';

/**
 * 🔥 Datos simulados (luego backend)
 */
const pools = [
  {
    id: '1',
    name: 'Champions League',
    participants: 10,
  },
  {
    id: '2',
    name: 'Premier League',
    participants: 8,
  },
  {
    id: '3',
    name: 'Liga Española',
    participants: 12,
  },
];

export default function HomeScreen({ navigation }: any) {

  /**
   * 👉 Navegar a detalle de la polla
   */
  const goToPool = (pool: any) => {
    navigation.navigate('PoolDetail', { pool });
  };

  return (
    <View style={styles.container}>

      {/* 🧾 Título */}
      <Text style={styles.title}>⚽ Tus Pollas</Text>

      {/* 📋 Lista */}
      <FlatList
        data={pools}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PoolCard
            pool={item}
            onPress={() => goToPool(item)}
          />
        )}
      />

      {/* ➕ Botones abajo */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Crear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Unirse</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

/**
 * 🎨 Estilos
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#16A34A',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});