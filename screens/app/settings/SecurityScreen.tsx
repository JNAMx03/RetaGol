import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '../../../services/supabase';
import { useApp } from '../../../context/AppContext';

export default function SecurityScreen({ navigation }: any) {
  const { user } = useApp();
  const [loadingReset, setLoadingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleChangePassword = async () => {
    if (!user?.email || loadingReset) return;
    setLoadingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'prolla://reset-password',
      });
      if (error) throw error;
      setResetSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el correo.');
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidad y seguridad</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Cambiar contraseña */}
        <Text style={styles.sectionTitle}>Contraseña</Text>
        <View style={styles.card}>
          {resetSent ? (
            <View style={styles.successRow}>
              <Text style={styles.successIcon}>📧</Text>
              <View style={styles.successInfo}>
                <Text style={styles.successTitle}>Correo enviado</Text>
                <Text style={styles.successDesc}>
                  Revisa <Text style={{ fontWeight: '600' }}>{user?.email}</Text> y sigue el enlace para crear una nueva contraseña.
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleChangePassword}
              disabled={loadingReset}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconBox}>
                <Text style={styles.actionIcon}>🔑</Text>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Cambiar contraseña</Text>
                <Text style={styles.actionDesc}>
                  Te enviaremos un enlace a {user?.email}
                </Text>
              </View>
              {loadingReset
                ? <ActivityIndicator color="#149435" />
                : <Text style={styles.chevron}>›</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Sesión activa */}
        <Text style={styles.sectionTitle}>Sesión</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>📱</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Sesión activa</Text>
              <Text style={styles.actionDesc}>
                Conectado como {user?.email}
              </Text>
            </View>
            <View style={[styles.dot, { backgroundColor: '#149435' }]} />
          </View>
        </View>

        <Text style={styles.hint}>
          Si crees que tu cuenta fue comprometida, cambia tu contraseña inmediatamente.
        </Text>
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
  backIcon: { fontSize: 22, color: '#149435' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: { fontSize: 18 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  actionDesc: { fontSize: 12, color: '#64748B' },
  chevron: { fontSize: 22, color: '#CBD5E1' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  successRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  successIcon: { fontSize: 28 },
  successInfo: { flex: 1 },
  successTitle: { fontSize: 14, fontWeight: '600', color: '#149435', marginBottom: 4 },
  successDesc: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
