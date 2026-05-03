import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../../context/AppContext';

/**
 * 🔥 Resultados simulados
 */
const results = [
  { id: '1', homeScore: '2', awayScore: '1' },
  { id: '2', homeScore: '0', awayScore: '0' },
];

/**
 * 👤 Usuario actual (luego vendrá del backend)
 */
const currentUser = 'Nico';

export default function StandingsScreen() {
  const { predictions } = useApp();

  /**
   * 🧠 Calcula puntos por usuario
   */
  const calculatePoints = (userPredictions: any[]) => {
    let total = 0;

    userPredictions.forEach((pred) => {
      const result = results.find((r) => r.id === pred.id);

      if (!result) return;

      if (
        pred.homeScore === result.homeScore &&
        pred.awayScore === result.awayScore
      ) {
        total += 3;
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

  /**
   * 👥 Usuarios simulados
   */
  const users = [
    {
      name: currentUser,
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
    {
      name: '117',
      predictions: [
        { id: '1', homeScore: '0', awayScore: '3' },
        { id: '2', homeScore: '2', awayScore: '2' },
      ],
    },
  ];

  /**
   * 🏆 Ranking ordenado
   */
  const ranking = users
    .map((user) => ({
      name: user.name,
      points: calculatePoints(user.predictions),
    }))
    .sort((a, b) => b.points - a.points);

  /**
   * 🎨 Color para podio
   */
  const getPodiumColor = (index: number) => {
    if (index === 0) return '#FACC15'; // oro
    if (index === 1) return '#94A3B8'; // plata
    if (index === 2) return '#B45309'; // bronce
    return '#FFFFFF';
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>🏆 Clasificación</Text>

      {ranking.map((user, index) => {
        const isMe = user.name === currentUser;

        return (
          <View
            key={index}
            style={[
              styles.row,
              { backgroundColor: getPodiumColor(index) },
              isMe && styles.me,
            ]}
          >
            <Text style={styles.position}>{index + 1}</Text>
            <Text style={styles.name}>
              {user.name} {isMe && '(Tú)'}
            </Text>
            <Text style={styles.points}>{user.points} pts</Text>
          </View>
        );
      })}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  position: {
    fontWeight: 'bold',
    width: 30,
  },
  name: {
    flex: 1,
  },
  points: {
    fontWeight: 'bold',
  },
  me: {
    borderWidth: 2,
    borderColor: '#16A34A',
  },
});