import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useApp, Match, ScoringConfig } from '../../context/AppContext';
import {
  AvailableTournament,
  getAvailableTournaments,
  getScheduledMatches,
  formatMatchDate,
  formatShortDate,
} from '../../services/footballDataApi';
import { DEFAULT_SCORING } from '../../utils/scoring';

export default function CreatePoolScreen({ navigation }: any) {
  const { createPool } = useApp();

  const [name, setName] = useState('');
  const [availableTournaments, setAvailableTournaments] = useState<AvailableTournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [selected, setSelected] = useState<AvailableTournament | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [cachedMatches, setCachedMatches] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [scoring, setScoring] = useState<ScoringConfig>(DEFAULT_SCORING);
  const [showScoring, setShowScoring] = useState(false);

  const canCreate = name.trim().length > 0 && selected !== null && cachedMatches.length > 0;

  // Cargar torneos disponibles al abrir la pantalla
  useEffect(() => {
    getAvailableTournaments()
      .then(setAvailableTournaments)
      .catch(() => Alert.alert('Error', 'No se pudieron cargar los torneos disponibles.'))
      .finally(() => setLoadingTournaments(false));
  }, []);

  const handleSelectTournament = async (tournament: AvailableTournament) => {
    if (selected?.code === tournament.code) return;
    setSelected(tournament);
    setMatchCount(tournament.totalMatches); // ya lo tenemos del filtrado inicial
    setLoadingMatches(true);
    try {
      const matches = await getScheduledMatches(tournament.code);
      setCachedMatches(matches);
      setMatchCount(matches.length);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los partidos de este torneo.');
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const mappedMatches: Match[] = cachedMatches.map((m) => ({
        id: String(m.id),
        home: m.homeTeam.name,
        away: m.awayTeam.name,
        date: formatMatchDate(m.utcDate),
        homeScore: '',
        awayScore: '',
        apiId: m.id,
      }));

      await createPool(name.trim(), selected!.code, mappedMatches, scoring);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Error al crear la polla');
    } finally {
      setCreating(false);
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
          placeholder="Ej. Mundial con los parceros"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        {/* Torneos disponibles */}
        <Text style={styles.label}>Torneo</Text>

        {loadingTournaments ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.loadingText}>Buscando torneos disponibles...</Text>
          </View>
        ) : availableTournaments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No hay torneos próximos disponibles por el momento.
            </Text>
          </View>
        ) : (
          <View style={styles.tournamentsGrid}>
            {availableTournaments.map((t) => {
              const isSelected = selected?.code === t.code;
              return (
                <TouchableOpacity
                  key={t.code}
                  style={[
                    styles.tournamentBtn,
                    isSelected && { backgroundColor: t.color, borderColor: t.color },
                  ]}
                  onPress={() => handleSelectTournament(t)}
                >
                  <Text style={[styles.tournamentText, isSelected && styles.tournamentTextActive]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Resumen del torneo seleccionado */}
        {selected && (
          <View style={[styles.summaryCard, { borderLeftColor: selected.color }]}>
            {loadingMatches ? (
              <ActivityIndicator color={selected.color} />
            ) : (
              <>
                <Text style={styles.summaryTitle}>{selected.name}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>⚽</Text>
                  <Text style={styles.summaryText}>
                    {matchCount} partidos programados
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>📅</Text>
                  <Text style={styles.summaryText}>
                    Inicia el {formatShortDate(selected.startDate)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>🏁</Text>
                  <Text style={styles.summaryText}>
                    Finaliza el {formatShortDate(selected.endDate)}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Scoring configurable */}
        <TouchableOpacity
          style={styles.scoringHeader}
          onPress={() => setShowScoring((v) => !v)}
        >
          <Text style={styles.scoringTitle}>Configurar puntuación</Text>
          <Text style={styles.scoringArrow}>{showScoring ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showScoring && (
          <View style={styles.scoringBody}>
            {[
              { key: 'exact',    label: 'Marcador exacto' },
              { key: 'oneTeam',  label: 'Un equipo exacto' },
              { key: 'winner',   label: 'Ganador / empate correcto' },
              { key: 'goalDiff', label: 'Diferencia de goles correcta' },
            ].map(({ key, label }) => (
              <View key={key} style={styles.scoringRow}>
                <Text style={styles.scoringLabel}>{label}</Text>
                <View style={styles.scoringControls}>
                  <TouchableOpacity
                    style={styles.scoringBtn}
                    onPress={() =>
                      setScoring((s) => ({ ...s, [key]: Math.max(0, (s as any)[key] - 1) }))
                    }
                  >
                    <Text style={styles.scoringBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.scoringValue}>{(scoring as any)[key]}</Text>
                  <TouchableOpacity
                    style={styles.scoringBtn}
                    onPress={() =>
                      setScoring((s) => ({ ...s, [key]: (s as any)[key] + 1 }))
                    }
                  >
                    <Text style={styles.scoringBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón crear */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnCreate, (!canCreate || creating) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={!canCreate || creating}
        >
          {creating
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnCreateText}>Crear Polla</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#2563EB' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scroll: { padding: 16, paddingBottom: 32 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
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
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
  },
  loadingText: { color: '#64748B', fontSize: 14 },
  emptyBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
  },
  emptyText: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  tournamentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tournamentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: 'white',
  },
  tournamentText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tournamentTextActive: { color: 'white' },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryIcon: { fontSize: 14 },
  summaryText: { fontSize: 13, color: '#374151' },
  scoringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoringTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  scoringArrow: { color: '#64748B', fontSize: 12 },
  scoringBody: {
    backgroundColor: 'white',
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  scoringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoringLabel: { flex: 1, fontSize: 13, color: '#374151' },
  scoringControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoringBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoringBtnText: { fontSize: 18, color: '#374151', lineHeight: 20 },
  scoringValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
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
  btnDisabled: { backgroundColor: '#CBD5E1' },
  btnCreateText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
