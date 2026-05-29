import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useApp } from '../../../context/AppContext';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateProfile } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);

  const hasChanged = name.trim().length > 0 && name.trim() !== user?.name;

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    if (!hasChanged || loading) return;
    setLoading(true);
    try {
      await updateProfile({ name: name.trim() });
      Alert.alert('¡Listo!', 'Tu perfil fue actualizado correctamente.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarHint}>Las fotos de perfil llegarán en una próxima versión</Text>
        </View>

        {/* Formulario */}
        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Tu nombre completo"
            placeholderTextColor="#94A3B8"
            editable={!loading}
            autoCorrect={false}
          />

          <Text style={styles.label}>Correo electrónico</Text>
          <View style={styles.inputReadOnly}>
            <Text style={styles.inputReadOnlyText}>{user?.email ?? ''}</Text>
          </View>
          <Text style={styles.helperText}>
            El correo no se puede cambiar desde aquí.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, (!hasChanged || loading) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!hasChanged || loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnText}>Guardar cambios</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4EBD8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { width: 11, height: 11, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#149435', transform: [{ rotate: '45deg' }], marginLeft: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  content: { flex: 1, padding: 20 },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#149435',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  avatarHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FAF7F2',
    marginBottom: 16,
  },
  inputReadOnly: {
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F4EBD8',
    marginBottom: 6,
  },
  inputReadOnlyText: { fontSize: 15, color: '#94A3B8' },
  helperText: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  btn: {
    backgroundColor: '#149435',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
