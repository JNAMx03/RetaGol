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

export default function RegisterScreen({ navigation }: any) {
  const { login } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRegister = () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) return;
    if (password !== confirm) return;
    login(email.trim(), fullName.trim());
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

          <Text style={styles.appName}>Crear Cuenta</Text>
          <Text style={styles.appSubtitle}>Únete y comienza a competir</Text>

          {/* Tarjeta del formulario */}
          <View style={styles.card}>
            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput
              placeholder="John Doe"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
            />

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

            <Text style={styles.label}>Confirmar Contraseña</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister}>
              <Text style={styles.btnPrimaryText}>Crear Cuenta</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>
                ¿Ya tienes cuenta?{' '}
                <Text style={styles.loginLinkBold}>Iniciar Sesión</Text>
              </Text>
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
    backgroundColor: '#16A34A',
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
  btnPrimary: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  btnPrimaryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  loginLink: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
  },
  loginLinkBold: {
    color: '#16A34A',
    fontWeight: 'bold',
  },
});
