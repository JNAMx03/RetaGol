import { View, Text, StyleSheet } from 'react-native';

export default function JoinPoolScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
      <Text style={{ color: 'white', fontSize: 24 }}>Unirse a Polla</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  text: {
    color: 'white',
    fontSize: 24,
  },
});