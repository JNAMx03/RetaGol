import { View, Text, StyleSheet } from 'react-native';
import PoolTabsNavigator from '../../navigation/PoolTabsNavigator';

/**
 * 🔥 Esta pantalla recibe la polla seleccionada
 */
export default function PoolDetailScreen({ route }: any) {

  /**
   * 👉 Obtenemos la polla enviada desde Home
   */
  const { pool } = route.params;

  return (
    <View style={styles.container}>

      {/* 🧾 Nombre de la polla */}
      <Text style={styles.title}>{pool.name}</Text>

      {/* 👥 Participantes */}
      <Text style={styles.info}>
        {pool.participants} participantes
      </Text>

      {/* 🔥 Tabs (Predicciones, Resultados, etc) */}
      <View style={styles.tabs}>
        <PoolTabsNavigator route={{ params: { pool } }} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 15,
  },
  info: {
    paddingHorizontal: 15,
    color: '#64748B',
    marginBottom: 10,
  },
  tabs: {
    flex: 1,
  },
});