import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../../context/AppContext';

export default function StandingsScreen() {

  const { predictions } = useApp();

  const results = [
    {
      id: '1',
      homeScore: '2',
      awayScore: '1',
    },
    {
      id: '2',
      homeScore: '0',
      awayScore: '0',
    },
  ];

  const users = [
    {
      name: 'Nico',
      predictions,
    },
    {
      name: 'Venki',
      predictions: [
        { id: '1', homeScore: '1', awayScore: '1' },
        { id: '2', homeScore: '0', awayScore: '0' },
      ],
    },
    {
      name: 'Emily',
      predictions: [
        { id: '1', homeScore: '2', awayScore: '1' },
        { id: '2', homeScore: '1', awayScore: '0' },
      ],
    },
  ];

  interface Prediction {
    id: string;
    homeScore: string;
    awayScore: string;
  }

  const calculateUserPoints = (userPredictions: any[]) => {
    let total = 0;

    userPredictions.forEach((pred) => {
      const result = results.find((r) => r.id === pred.id);

      if (!result) return;

      //marcador exacto
      if (
        pred.homeScore === result.homeScore &&
        pred.awayScore === result.awayScore
      ) {
        total += 3;
      //ganador exacto
      } else if (
        (pred.homeScore > pred.awayScore &&
          result.homeScore > result.awayScore) ||
        (pred.homeScore < pred.awayScore &&
          result.homeScore < result.awayScore) ||
        (pred.homeScore === pred.awayScore &&
          result.homeScore === result.awayScore)
      ) {
        total += 1;
      }
    });

    return total;
  };

  const ranking = users
    .map((user) => ({
      name: user.name,
      points: calculateUserPoints(user.predictions),
    }))
    .sort((a, b) => b.points - a.points);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clasificación</Text>

      {ranking.map((user, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.position}>{index + 1}</Text>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.points}>{user.points} pts</Text>
        </View>
      ))}
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
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  position: {
    fontWeight: 'bold',
  },
  name: {
    flex: 1,
    marginLeft: 10,
  },
  points: {
    fontWeight: 'bold',
  },
});