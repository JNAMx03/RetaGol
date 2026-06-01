import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function JoinPoolScreen({ navigation }: any) {
  const { joinPool } = useApp();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canJoin = code.trim().length > 0;

  const handleJoin = async () => {
    if (!canJoin || loading) return;
    setError('');
    setLoading(true);
    try {
      const pool = await joinPool(code.trim());
      // Si la polla tiene predicción de campeón y el usuario acaba de unirse
      // (nunca ha elegido), llevarlo primero a ChampionPrediction
      if (pool.championConfig?.enabled) {
        navigation.replace('ChampionPrediction', { pool });
      } else {
        navigation.replace('PoolDetail', { pool });
      }
    } catch (e: any) {
      if (e.message === 'YA_PARTICIPANTE') {
        Alert.alert('Ya estás en esta polla', 'Puedes verla en tu pantalla principal.');
        navigation.goBack();
      } else {
        setError(e.message ?? 'Error al unirse a la polla');
      }
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
        <Text style={styles.headerTitle}>Unirse a una Polla</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
          <View style={styles.plusCircle}>
            <Text style={styles.plusIcon}>+</Text>
          </View>

          <Text style={styles.description}>
            Ingresa el código de la polla para unirte
          </Text>

          <Text style={styles.label}>Código de Polla</Text>
          <TextInput
            placeholder="Ej. CH2026"
            placeholderTextColor="#94A3B8"
            value={code}
            onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
            style={styles.input}
            autoCapitalize="characters"
            maxLength={8}
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, (!canJoin || loading) && styles.btnDisabled]}
            onPress={handleJoin}
            disabled={!canJoin || loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.btnText}>Unirse</Text>
            }
          </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4EBD8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: { width: 11, height: 11, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#149435', transform: [{ rotate: '45deg' }], marginLeft: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#149435',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  plusIcon: {
    fontSize: 52,
    color: '#149435',
    lineHeight: 60,
  },
  description: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    alignSelf: 'flex-start',
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    backgroundColor: 'white',
    marginBottom: 16,
    width: '100%',
    textAlign: 'center',
    letterSpacing: 3,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    width: '100%',
  },
  btn: {
    backgroundColor: '#149435',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
