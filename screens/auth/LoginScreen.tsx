import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function LoginScreen({ navigation }: any) {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) return;
    const raw = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim();
    const name = raw.charAt(0).toUpperCase() + raw.slice(1) || 'Usuario';
    login(email.trim(), name);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>e</Text>
          </View>

          <Text style={styles.appName}>Pollas App</Text>
          <Text style={styles.appSubtitle}>Predice y compite con tus amigos</Text>

          {/* Tarjeta del formulario */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>

            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
              <Text style={styles.btnPrimaryText}>Iniciar Sesión</Text>
            </TouchableOpacity>

            <Text style={styles.noAccount}>¿No tienes cuenta?</Text>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.btnSecondaryText}>Crear Cuenta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#2563EB',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  avatarIcon: {
    fontSize: 36,
    color: 'white',
    fontWeight: 'bold',
  },
  appName: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 28,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 14,
  },
  forgot: {
    color: '#2563EB',
    textAlign: 'right',
    fontSize: 13,
    marginBottom: 22,
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnPrimaryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  noAccount: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
    marginBottom: 12,
  },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
