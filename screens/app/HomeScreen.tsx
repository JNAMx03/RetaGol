import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useApp } from '../../context/AppContext';
import PoolCard from '../../components/PoolCard';

export default function HomeScreen({ navigation }: any) {

  const { pools } = useApp();

  //SOLO ES PARA PRUEBAS
  const { clearPredictions } = useApp();

  const goToPool = (pool: any) => {
    navigation.navigate('PoolDetail', { pool });
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>⚽ Tus Pollas</Text>

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

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CreatePool')}
      >
        <Text style={styles.text}>+ Crear Polla</Text>
      </TouchableOpacity>

      {/* SOLO ES PARA PRUEBAS */}
      <TouchableOpacity onPress={clearPredictions}>
        <Text>Borrar datos</Text>
      </TouchableOpacity>

    </View>
  );
}

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
  button: {
    backgroundColor: '#16A34A',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});