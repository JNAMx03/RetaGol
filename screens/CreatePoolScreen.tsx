import { View, Text, StyleSheet } from 'react-native';

export default function CreatePoolScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Crear Polla</Text>
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