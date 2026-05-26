import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useApp } from '../../context/AppContext';

export default function ResetPasswordScreen() {
  const { clearRecoveryMode } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const canSubmit = password.trim().length >= 6 && confirm.trim().length >= 6;

  const handleReset = async () => {
    if (!canSubmit) return;
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      // Cerrar sesión de recuperación tras 2 segundos y volver al login
      setTimeout(async () => {
        await supabase.auth.signOut();
        clearRecoveryMode();
      }, 2000);
    } catch (e: any) {
      setError(e.message ?? 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>RetaGol</Text>
        <Text style={styles.appSubtitle}>Predice y compite con tus amigos</Text>

        <View style={styles.card}>
          {done ? (
            // ── Éxito ──────────────────────────────────────────────────────
            <>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.cardTitle}>¡Contraseña actualizada!</Text>
              <Text style={styles.desc}>
                Tu contraseña fue cambiada correctamente.{'\n'}
                Serás redirigido al inicio de sesión.
              </Text>
              <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />
            </>
          ) : (
            // ── Formulario ─────────────────────────────────────────────────
            <>
              <Text style={styles.cardTitle}>Nueva contraseña</Text>
              <Text style={styles.desc}>
                Elige una contraseña segura de al menos 6 caracteres.
              </Text>

              <Text style={styles.label}>Nueva contraseña</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                editable={!loading}
                autoFocus
              />

              <Text style={styles.label}>Confirmar contraseña</Text>
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
                style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
                onPress={handleReset}
                disabled={!canSubmit || loading}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnText}>Guardar nueva contraseña</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#2563EB' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 14 },
  appName: { color: 'white', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  appSubtitle: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: 14, marginBottom: 28 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 10 },
  desc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  successIcon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 14,
  },
  error: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  btn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
