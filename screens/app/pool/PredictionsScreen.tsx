import { View, FlatList, StyleSheet} from 'react-native';
import { useState } from 'react';
import MatchCard from '../../../components/MatchCard';

export default function PredictionsScreen() {

  const [matches, setMatches] = useState([
    {
      id: '1',
      league: 'Champions League',
      home: 'Real Madrid',
      away: 'Barcelona',
      date: 'Hoy 18:00',
      homeScore: '',
      awayScore: '',
    },
    {
      id: '2',
      league: 'Premier League',
      home: 'Arsenal',
      away: 'Chelsea',
      date: 'Mañana 20:00',
      homeScore: '',
      awayScore: '',
    },
  ]);

  const handleChange = (id: string, field: string, value: string) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === id
          ? { ...match, [field]: value }
          : match
      )
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchCard match={item} onChange={handleChange} />
        )}
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