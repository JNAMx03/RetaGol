import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../../context/AppContext';

/**
 * 🔥 Resultados simulados (luego backend)
 */
const results = [
  {
    id: '1',
    home: 'Real Madrid',
    away: 'Barcelona',
    homeScore: '2',
    awayScore: '1',
  },
  {
    id: '2',
    home: 'Arsenal',
    away: 'Chelsea',
    homeScore: '0',
    awayScore: '0',
  },
];

export default function ResultsScreen() {
  const { predictions } = useApp();

  /**
   * 🧠 Determina tipo de resultado
   */
  const getResultType = (pred: any, result: any) => {
    if (!pred || pred.homeScore === '' || pred.awayScore === '') {
      return 'none';
    }

    const predHome = Number(pred.homeScore);
    const predAway = Number(pred.awayScore);
    const resHome = Number(result.homeScore);
    const resAway = Number(result.awayScore);

    // Exacto
    if (predHome === resHome && predAway === resAway) {
      return 'exact';
    }

    // Mismo resultado (ganador o empate)
    if (
      (predHome > predAway && resHome > resAway) ||
      (predHome < predAway && resHome < resAway) ||
      (predHome === predAway && resHome === resAway)
    ) {
      return 'winner';
    }

    return 'fail';
  };

  /**
   * 🧠 Puntos
   */
  const getPoints = (type: string) => {
    if (type === 'exact') return 3;
    if (type === 'winner') return 1;
    return 0;
  };

  /**
   * 🎨 Color según resultado
   */
  const getColor = (type: string) => {
    if (type === 'exact') return '#16A34A'; // verde
    if (type === 'winner') return '#EAB308'; // amarillo
    if (type === 'fail') return '#DC2626'; // rojo
    return '#64748B'; // gris
  };

  return (
    <View style={styles.container}>
      {results.map((match) => {
        const pred = predictions.find((p: any) => p.id === match.id);

        const type = getResultType(pred, match);
        const points = getPoints(type);
        const color = getColor(type);

        return (
          <View key={match.id} style={styles.card}>

            {/* 🧾 Resultado real */}
            <Text style={styles.title}>
              {match.home} {match.homeScore} - {match.awayScore} {match.away}
            </Text>

            {/* 👤 Predicción */}
            {pred && (
              <Text style={styles.pred}>
                Tu predicción: {pred.homeScore || '-'} - {pred.awayScore || '-'}
              </Text>
            )}

            {/* 🎯 Estado */}
            <Text style={[styles.status, { color }]}>
              {type === 'exact' && '✔ Exacto'}
              {type === 'winner' && '👍 Ganador'}
              {type === 'fail' && '✖ Fallaste'}
              {type === 'none' && '— Sin predicción'}
            </Text>

            {/* 🏆 Puntos */}
            <Text style={[styles.points, { color }]}>
              {points} pts
            </Text>

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
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 15,
  },
  pred: {
    color: '#64748B',
  },
  status: {
    marginTop: 5,
    fontWeight: 'bold',
  },
  points: {
    marginTop: 5,
    fontWeight: 'bold',
  },
});