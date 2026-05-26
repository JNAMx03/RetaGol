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

export default function RegisterScreen({ navigation }: any) {
  const { register, loginWithGoogle } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState(false);

  const canRegister =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    confirm.trim().length > 0;

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) return;
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password, fullName.trim());
    } catch (e: any) {
      if (e.message === 'VERIFY_EMAIL') {
        setVerifyEmail(true);
      } else {
        setError(translateError(e));
      }
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

  // ── Pantalla de verificación de correo ─────────────────────────────────────
  if (verifyEmail) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.verifyContainer}>
          <Text style={styles.verifyIcon}>📧</Text>
          <Text style={styles.verifyTitle}>Verifica tu correo</Text>
          <Text style={styles.verifyText}>
            Te enviamos un enlace de confirmación a{'\n'}
            <Text style={styles.verifyEmail}>{email}</Text>
            {'\n\n'}
            Abre el correo y haz clic en el enlace para activar tu cuenta. Luego inicia sesión.
          </Text>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.verifyBtnText}>Ir a Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

          <Text style={styles.appName}>Crear Cuenta</Text>
          <Text style={styles.appSubtitle}>Únete y comienza a competir</Text>

          {/* Tarjeta del formulario */}
          <View style={styles.card}>

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
                  <Text style={styles.btnGoogleText}>Registrarse con Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o con correo</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput
              placeholder="John Doe"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              editable={!loading}
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

            <Text style={styles.label}>Confirmar Contraseña</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              style={styles.input}
              editable={!loading}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btnPrimary, (!canRegister || loading) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={!canRegister || loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.btnPrimaryText}>Crear Cuenta</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
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
  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  btnDisabled: {
    opacity: 0.6,
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

  // Pantalla de verificación de correo
  verifyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  verifyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  verifyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  verifyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  verifyEmail: {
    fontWeight: 'bold',
    color: 'white',
  },
  verifyBtn: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  verifyBtnText: {
    color: '#16A34A',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
