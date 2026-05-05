import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function CreatePoolScreen({ navigation }: any) {

  const { createPool } = useApp();

  const [name, setName] = useState('');

  const handleCreate = () => {

    if (!name) return;

    createPool(name);

    navigation.goBack();
  };

  return (
    <View style={styles.container}>

      <TextInput
        placeholder="Nombre de la polla"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.text}>Crear</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#16A34A',
    padding: 15,
    borderRadius: 10,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});