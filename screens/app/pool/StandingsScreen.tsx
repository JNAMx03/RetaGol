import { View, Text } from 'react-native';
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

  interface Prediction {
    id: string;
    homeScore: string;
    awayScore: string;
  }

  const calculatePoints = () => {
    let total = 0;

    predictions.forEach((pred: Prediction) => {
      const result = results.find((r) => r.id === pred.id);

      if (!result) return;

      // marcador exacto
      if (
        pred.homeScore === result.homeScore &&
        pred.awayScore === result.awayScore
      ) {
        total += 3;
      }

      // ganador correcto
      else if (
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

  const totalPoints = calculatePoints();

  return (
    <View>
      <Text>Puntos totales: {totalPoints}</Text>
    </View>
  );
}