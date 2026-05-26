import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { translateError } from '../../utils/errorMessages';

export default function LoginScreen({ navigation }: any) {
  const { login, loginWithGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(translateError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      setError(translateError(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.appName}>RetaGol</Text>
          <Text style={styles.appSubtitle}>Predice y compite con tus amigos</Text>

          {/* Tarjeta del formulario */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>

            {/* Botón Google */}
            <TouchableOpacity
              style={[styles.btnGoogle, googleLoading && styles.btnDisabled]}
              onPress={handleGoogle}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#374151" />
              ) : (
                <>
                  <Text style={styles.btnGoogleIcon}>G</Text>
                  <Text style={styles.btnGoogleText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o con correo</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              editable={!loading}
            />

            <TouchableOpacity>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.btnPrimaryText}>Iniciar Sesión</Text>
              }
            </TouchableOpacity>

            <Text style={styles.noAccount}>¿No tienes cuenta?</Text>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
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
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 14,
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
    marginBottom: 18,
  },

  // Botón Google
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 13,
    gap: 10,
    marginBottom: 16,
  },
  btnGoogleIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA4335',
  },
  btnGoogleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  // Divisor
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
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
  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnDisabled: {
    opacity: 0.6,
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
