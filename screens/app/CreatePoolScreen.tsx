import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useApp, CompetitionType, Match } from '../../context/AppContext';

// ─── Partidos predefinidos por tipo de competición ────────────────────────────

const MATCHES_BY_TYPE: Record<CompetitionType, Match[]> = {
  liga: [
    { id: 'l1', home: 'Real Madrid', away: 'Barcelona', date: '2026-05-15', homeScore: '', awayScore: '' },
    { id: 'l2', home: 'Atlético Madrid', away: 'Sevilla', date: '2026-05-15', homeScore: '', awayScore: '' },
    { id: 'l3', home: 'Valencia', away: 'Villarreal', date: '2026-05-16', homeScore: '', awayScore: '' },
    { id: 'l4', home: 'Athletic Bilbao', away: 'Real Sociedad', date: '2026-05-16', homeScore: '', awayScore: '' },
  ],
  copa: [
    { id: 'c1', home: 'Real Madrid', away: 'Sevilla', date: '2026-05-20', homeScore: '', awayScore: '' },
    { id: 'c2', home: 'Barcelona', away: 'Athletic Bilbao', date: '2026-05-21', homeScore: '', awayScore: '' },
    { id: 'c3', home: 'Atlético Madrid', away: 'Real Sociedad', date: '2026-05-22', homeScore: '', awayScore: '' },
  ],
  champions: [
    { id: 'ch1', home: 'Real Madrid', away: 'Barcelona', date: '2026-03-01', homeScore: '', awayScore: '' },
    { id: 'ch2', home: 'Manchester United', away: 'Liverpool', date: '2026-03-02', homeScore: '', awayScore: '' },
    { id: 'ch3', home: 'Bayern Munich', away: 'Borussia Dortmund', date: '2026-03-03', homeScore: '', awayScore: '' },
    { id: 'ch4', home: 'PSG', away: 'Marsella', date: '2026-03-04', homeScore: '', awayScore: '' },
  ],
};

const TYPE_OPTIONS: { key: CompetitionType; label: string; color: string }[] = [
  { key: 'liga', label: 'Liga', color: '#16A34A' },
  { key: 'copa', label: 'Copa', color: '#EAB308' },
  { key: 'champions', label: 'Champions', color: '#2563EB' },
];

export default function CreatePoolScreen({ navigation }: any) {
  const { createPool } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState<CompetitionType>('champions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const matches = MATCHES_BY_TYPE[type];
  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setError('');
    setLoading(true);
    try {
      await createPool(name.trim(), type, matches);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message ?? 'Error al crear la polla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Polla</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Nombre */}
        <Text style={styles.label}>Nombre de la Polla</Text>
        <TextInput
          placeholder="Ej. Champions League 2026"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        {/* Tipo de competición */}
        <Text style={styles.label}>Tipo de Competición</Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.typeBtn,
                type === opt.key && { backgroundColor: opt.color, borderColor: opt.color },
              ]}
              onPress={() => setType(opt.key)}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  type === opt.key && styles.typeBtnActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista de partidos */}
        <Text style={styles.label}>Seleccionar Partidos ({matches.length})</Text>
        {matches.map((match) => (
          <View key={match.id} style={styles.matchItem}>
            <Text style={styles.matchTeams}>
              {match.home} vs {match.away}
            </Text>
            <Text style={styles.matchDate}>{match.date}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Botón crear */}
      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.btnCreate, (!canCreate || loading) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={!canCreate || loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnCreateText}>Crear Polla</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: '#2563EB',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scroll: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: 'white',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnActive: {
    color: 'white',
  },
  matchItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matchTeams: {
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 12,
    color: '#64748B',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btnCreate: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  btnCreateText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
});
