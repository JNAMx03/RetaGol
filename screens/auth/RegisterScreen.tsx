import { View, Text, StyleSheet } from 'react-native';

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Registro</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 24,
  },
});