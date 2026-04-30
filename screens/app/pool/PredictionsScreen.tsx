import { View, FlatList, StyleSheet } from 'react-native';
import MatchCard from '../../../components/MatchCard';

const matches = [1, 2, 3, 4];

export default function PredictionsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.toString()}
        renderItem={() => <MatchCard />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 15,
  },
});