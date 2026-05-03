import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import PoolCard from '../../components/PoolCard';

//SOLO ES PARA PRUEBAS
import { useApp } from '../../context/AppContext';

/**
 * 🔥 Ahora cada polla tiene sus propios partidos
 */
const pools = [
  {
    id: '1',
    name: 'Champions League',
    participants: 10,
    matches: [
      {
        id: '1',
        home: 'Real Madrid',
        away: 'Barcelona',
        date: 'Hoy 18:00',
        homeScore: '',
        awayScore: '',
      },
    ],
  },
  {
    id: '2',
    name: 'Premier League',
    participants: 8,
    matches: [
      {
        id: '2',
        home: 'Arsenal',
        away: 'Chelsea',
        date: 'Mañana 20:00',
        homeScore: '',
        awayScore: '',
      },
    ],
  },
];

export default function HomeScreen({ navigation }: any) {

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
});