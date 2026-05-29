import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useApp, Match, ScoringConfig, ChampionConfig, PrizeConfig } from '../../context/AppContext';
import {
  AvailableTournament,
  getAvailableTournaments,
  getScheduledMatches,
  formatMatchDate,
  formatShortDate,
} from '../../services/footballDataApi';
import {
  DEFAULT_SCORING,
  DEFAULT_CHAMPION,
  DEFAULT_PRIZE,
  getMaxMatchPoints,
} from '../../utils/scoring';

const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'ARS'];

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

  // Secciones colapsables
  const [showScoring, setShowScoring] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showChampion, setShowChampion] = useState(false);
  const [showPrize, setShowPrize] = useState(false);

  // Configuración de puntuación (aditiva)
  const [scoring, setScoring] = useState<ScoringConfig>(DEFAULT_SCORING);

  // Configuración de predicción final
  const [champion, setChampion] = useState<ChampionConfig>(DEFAULT_CHAMPION);

  // Configuración del premio
  const [prize, setPrize] = useState<PrizeConfig>(DEFAULT_PRIZE);
  const [entryFeeText, setEntryFeeText] = useState('');
  const [pctFirst, setPctFirst] = useState('100');
  const [pctSecond, setPctSecond] = useState('0');
  const [pctThird, setPctThird] = useState('0');

  const canCreate = name.trim().length > 0 && selected !== null && cachedMatches.length > 0;
  const maxPts = getMaxMatchPoints(scoring);
  const pctTotal = Number(pctFirst) + Number(pctSecond) + Number(pctThird);

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
    setMatchCount(tournament.totalMatches);
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

  const adjustScore = (key: keyof ScoringConfig, delta: number) => {
    if (typeof scoring[key] !== 'number') return;
    setScoring((s) => ({ ...s, [key]: Math.max(0, (s[key] as number) + delta) }));
  };

  const adjustChampion = (key: keyof ChampionConfig, delta: number) => {
    if (typeof champion[key] !== 'number') return;
    setChampion((c) => ({ ...c, [key]: Math.max(0, (c[key] as number) + delta) }));
  };

  const buildPrize = (): PrizeConfig => ({
    entryFee: Number(entryFeeText) || 0,
    currency: prize.currency,
    distribution: prize.distribution,
    percentages: {
      first: Number(pctFirst) || 0,
      second: Number(pctSecond) || 0,
      third: Number(pctThird) || 0,
    },
  });

  const handleCreate = async () => {
    if (!canCreate || creating) return;

    if (prize.distribution === 'top3' && pctTotal !== 100) {
      Alert.alert('Porcentajes inválidos', `Los porcentajes deben sumar 100%. Actualmente suman ${pctTotal}%.`);
      return;
    }

    setCreating(true);
    try {
      const mappedMatches: Match[] = cachedMatches
        .filter((m) => m.homeTeam?.name && m.awayTeam?.name)
        .map((m) => ({
          id: String(m.id),
          home: m.homeTeam.name!,
          away: m.awayTeam.name!,
          date: formatMatchDate(m.utcDate),
          utcDate: m.utcDate,
          homeScore: '',
          awayScore: '',
          apiId: m.id,
          stage: m.stage ?? 'GROUP_STAGE',
        }));

      await createPool(name.trim(), selected!.code, mappedMatches, scoring, champion, buildPrize());
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Error al crear la polla');
    } finally {
      setCreating(false);
    }
  };

  // ── Helpers de UI ─────────────────────────────────────────────────────────

  const ScoreRow = ({
    label, valueKey, sublabel,
  }: {
    label: string; valueKey: keyof ScoringConfig; sublabel?: string;
  }) => (
    <View style={styles.scoringRow}>
      <View style={styles.scoringLabelWrap}>
        <Text style={styles.scoringLabel}>{label}</Text>
        {sublabel && <Text style={styles.scoringSubLabel}>{sublabel}</Text>}
      </View>
      <View style={styles.scoringControls}>
        <TouchableOpacity style={styles.scoringBtn} onPress={() => adjustScore(valueKey, -1)}>
          <Text style={styles.scoringBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.scoringValue}>{scoring[valueKey] as number}</Text>
        <TouchableOpacity style={styles.scoringBtn} onPress={() => adjustScore(valueKey, 1)}>
          <Text style={styles.scoringBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ToggleRow = ({
    icon, label, desc, value, onToggle,
  }: {
    icon: string; label: string; desc: string; value: boolean; onToggle: () => void;
  }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleIcon}>{icon}</Text>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#DADADA', true: '#A7F3D0' }}
        thumbColor={value ? '#149435' : '#94A3B8'}
      />
    </View>
  );

  const SectionHeader = ({
    title, open, onPress,
  }: {
    title: string; open: boolean; onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionArrow}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Polla</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Nombre ─────────────────────────────────────────────────────── */}
        <Text style={styles.label}>Nombre de la Polla</Text>
        <TextInput
          placeholder="Ej. Mundial con los parceros"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        {/* ── Torneos ────────────────────────────────────────────────────── */}
        <Text style={styles.label}>Torneo</Text>

        {loadingTournaments ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#149435" />
            <Text style={styles.loadingText}>Buscando torneos disponibles...</Text>
          </View>
        ) : availableTournaments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No hay torneos próximos disponibles por el momento.</Text>
          </View>
        ) : (
          <View style={styles.tournamentsGrid}>
            {availableTournaments.map((t) => {
              const isSelected = selected?.code === t.code;
              return (
                <TouchableOpacity
                  key={t.code}
                  style={[styles.tournamentBtn, isSelected && { backgroundColor: t.color, borderColor: t.color }]}
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

        {/* Resumen del torneo */}
        {selected && (
          <View style={[styles.summaryCard, { borderLeftColor: selected.color }]}>
            {loadingMatches ? (
              <ActivityIndicator color={selected.color} />
            ) : (
              <>
                <Text style={styles.summaryTitle}>{selected.name}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>⚽</Text>
                  <Text style={styles.summaryText}>{matchCount} partidos programados</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>📅</Text>
                  <Text style={styles.summaryText}>Inicia el {formatShortDate(selected.startDate)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>🏁</Text>
                  <Text style={styles.summaryText}>Finaliza el {formatShortDate(selected.endDate)}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Puntuación ─────────────────────────────────────────────────── */}
        <SectionHeader
          title="🎯  Puntuación por partido"
          open={showScoring}
          onPress={() => setShowScoring((v) => !v)}
        />

        {showScoring && (
          <View style={styles.sectionBody}>
            <ScoreRow label="Resultado correcto (1X2)" valueKey="resultado" sublabel="Quién ganó o empate" />
            <ScoreRow label="Goles local exactos" valueKey="golesLocal" sublabel="Marcador del equipo local" />
            <ScoreRow label="Goles visitante exactos" valueKey="golesVisitante" sublabel="Marcador del visitante" />
            <ScoreRow label="Diferencia de goles" valueKey="diferencia" sublabel="Diferencia exacta entre equipos" />

            <View style={styles.maxPtsRow}>
              <Text style={styles.maxPtsLabel}>Máximo por partido (marcador exacto)</Text>
              <Text style={styles.maxPtsValue}>{maxPts} pts</Text>
            </View>
          </View>
        )}

        {/* ── Opciones especiales ─────────────────────────────────────────── */}
        <SectionHeader
          title="⚙️  Opciones especiales"
          open={showOptions}
          onPress={() => setShowOptions((v) => !v)}
        />

        {showOptions && (
          <View style={styles.sectionBody}>
            <ToggleRow
              icon="⚡"
              label="Doble puntos en eliminatorias"
              desc="Los partidos de playoffs o fase final valen el doble de puntos."
              value={scoring.dobleEliminatoria}
              onToggle={() => setScoring((s) => ({ ...s, dobleEliminatoria: !s.dobleEliminatoria }))}
            />
            <View style={styles.toggleDivider} />
            <ToggleRow
              icon="🎁"
              label="Punto extra al único acertante"
              desc="Si solo una persona predijo el marcador exacto en un partido, obtiene +1 punto adicional."
              value={scoring.bonusUnico}
              onToggle={() => setScoring((s) => ({ ...s, bonusUnico: !s.bonusUnico }))}
            />
          </View>
        )}

        {/* ── Predicción final del torneo ─────────────────────────────────── */}
        <SectionHeader
          title="🏆  Predicción final del torneo"
          open={showChampion}
          onPress={() => setShowChampion((v) => !v)}
        />

        {showChampion && (
          <View style={styles.sectionBody}>
            <ToggleRow
              icon="🥇"
              label="Activar predicción de campeón"
              desc="Los participantes elegirán campeón, subcampeón y 3er lugar. Los puntos se suman al finalizar el torneo."
              value={champion.enabled}
              onToggle={() => setChampion((c) => ({ ...c, enabled: !c.enabled }))}
            />

            {champion.enabled && (
              <>
                <View style={styles.toggleDivider} />
                <Text style={styles.subLabel}>Puntos por acierto</Text>

                {([
                  { key: 'champion', icon: '🥇', label: 'Campeón' },
                  { key: 'runnerUp', icon: '🥈', label: 'Subcampeón' },
                  { key: 'thirdPlace', icon: '🥉', label: 'Tercer lugar' },
                ] as { key: keyof ChampionConfig; icon: string; label: string }[]).map(({ key, icon, label }) => (
                  <View key={String(key)} style={styles.scoringRow}>
                    <Text style={styles.scoringLabel}>{icon}  {label}</Text>
                    <View style={styles.scoringControls}>
                      <TouchableOpacity style={styles.scoringBtn} onPress={() => adjustChampion(key, -1)}>
                        <Text style={styles.scoringBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.scoringValue}>{champion[key] as number}</Text>
                      <TouchableOpacity style={styles.scoringBtn} onPress={() => adjustChampion(key, 1)}>
                        <Text style={styles.scoringBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* ── Premio ──────────────────────────────────────────────────────── */}
        <SectionHeader
          title="💰  Premio (informativo)"
          open={showPrize}
          onPress={() => setShowPrize((v) => !v)}
        />

        {showPrize && (
          <View style={styles.sectionBody}>
            {/* Valor de entrada */}
            <Text style={styles.subLabel}>Valor de participación</Text>
            <TextInput
              value={entryFeeText}
              onChangeText={setEntryFeeText}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={styles.entryFeeInput}
            />
            {/* Selector de moneda */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll} contentContainerStyle={styles.currencyContent}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyBtn, prize.currency === c && styles.currencyBtnActive]}
                  onPress={() => setPrize((p) => ({ ...p, currency: c }))}
                >
                  <Text style={[styles.currencyText, prize.currency === c && styles.currencyTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Distribución */}
            <Text style={styles.subLabel}>Distribución del premio</Text>
            <View style={styles.distRow}>
              <TouchableOpacity
                style={[styles.distBtn, prize.distribution === 'winner_takes_all' && styles.distBtnActive]}
                onPress={() => setPrize((p) => ({ ...p, distribution: 'winner_takes_all' }))}
              >
                <Text style={[styles.distText, prize.distribution === 'winner_takes_all' && styles.distTextActive]}>
                  🥇 Todo al primero
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.distBtn, prize.distribution === 'top3' && styles.distBtnActive]}
                onPress={() => setPrize((p) => ({ ...p, distribution: 'top3' }))}
              >
                <Text style={[styles.distText, prize.distribution === 'top3' && styles.distTextActive]}>
                  🏅 Top 3
                </Text>
              </TouchableOpacity>
            </View>

            {/* Porcentajes si es top3 */}
            {prize.distribution === 'top3' && (
              <>
                <Text style={styles.subLabel}>Porcentaje por posición (debe sumar 100%)</Text>
                {[
                  { icon: '🥇', label: '1er lugar', val: pctFirst, set: setPctFirst },
                  { icon: '🥈', label: '2do lugar', val: pctSecond, set: setPctSecond },
                  { icon: '🥉', label: '3er lugar', val: pctThird, set: setPctThird },
                ].map(({ icon, label, val, set }) => (
                  <View key={label} style={styles.pctRow}>
                    <Text style={styles.pctLabel}>{icon}  {label}</Text>
                    <View style={styles.pctInputWrap}>
                      <TextInput
                        value={val}
                        onChangeText={set}
                        keyboardType="numeric"
                        style={styles.pctInput}
                        maxLength={3}
                      />
                      <Text style={styles.pctSign}>%</Text>
                    </View>
                  </View>
                ))}
                <Text style={[styles.pctTotal, pctTotal !== 100 && styles.pctTotalError]}>
                  Total: {pctTotal}% {pctTotal !== 100 ? '⚠️ debe ser 100%' : '✓'}
                </Text>
              </>
            )}

            {/* Pozo estimado */}
            {Number(entryFeeText) > 0 && (
              <View style={styles.prizePoolRow}>
                <Text style={styles.prizePoolLabel}>💵 Pozo estimado con 10 participantes</Text>
                <Text style={styles.prizePoolValue}>
                  {(Number(entryFeeText) * 10).toLocaleString('es-CO')} {prize.currency}
                </Text>
              </View>
            )}
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
  safe: { flex: 1, backgroundColor: '#F4EBD8' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#DADADA',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { width: 11, height: 11, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#149435', transform: [{ rotate: '45deg' }], marginLeft: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#DADADA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', backgroundColor: 'white',
  },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderRadius: 10, padding: 16 },
  loadingText: { color: '#64748B', fontSize: 14 },
  emptyBox: { backgroundColor: 'white', borderRadius: 10, padding: 16 },
  emptyText: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  tournamentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tournamentBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: 'white' },
  tournamentText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tournamentTextActive: { color: 'white' },
  summaryCard: {
    backgroundColor: 'white', borderRadius: 10, padding: 16, marginTop: 12, borderLeftWidth: 4, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryIcon: { fontSize: 14 },
  summaryText: { fontSize: 13, color: '#374151' },

  // Secciones colapsables
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 10, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#DADADA',
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sectionArrow: { color: '#64748B', fontSize: 12 },
  sectionBody: {
    backgroundColor: 'white', padding: 14, borderWidth: 1, borderColor: '#DADADA',
    borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
  },
  subLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10, marginBottom: 8 },

  // Scoring
  scoringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  scoringLabelWrap: { flex: 1, paddingRight: 8 },
  scoringLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  scoringSubLabel: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  scoringControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoringBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#F4EBD8',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DADADA',
  },
  scoringBtnText: { fontSize: 18, color: '#374151', lineHeight: 20 },
  scoringValue: { fontSize: 16, fontWeight: '700', color: '#0F172A', minWidth: 22, textAlign: 'center' },
  maxPtsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginTop: 4,
  },
  maxPtsLabel: { fontSize: 13, color: '#149435', fontWeight: '500' },
  maxPtsValue: { fontSize: 16, fontWeight: '800', color: '#149435' },

  // Toggles
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  toggleIcon: { fontSize: 22, marginTop: 2 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  toggleDesc: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  toggleDivider: { height: 1, backgroundColor: '#F4EBD8', marginVertical: 12 },

  // Premio
  entryFeeInput: {
    borderWidth: 1.5, borderColor: '#DADADA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700',
    color: '#0F172A', backgroundColor: 'white', marginBottom: 10,
  },
  currencyScroll: { marginBottom: 4 },
  currencyContent: { gap: 8, paddingBottom: 4 },
  currencyBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    borderColor: '#DADADA', backgroundColor: 'white', marginRight: 6,
  },
  currencyBtnActive: { backgroundColor: '#149435', borderColor: '#149435' },
  currencyText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  currencyTextActive: { color: 'white' },
  distRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  distBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#DADADA', alignItems: 'center', backgroundColor: 'white',
  },
  distBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#149435' },
  distText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  distTextActive: { color: '#149435' },
  pctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pctLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  pctInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pctInput: {
    width: 60, borderWidth: 1, borderColor: '#DADADA', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, fontWeight: '600', color: '#0F172A',
    textAlign: 'center', backgroundColor: '#FAF7F2',
  },
  pctSign: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  pctTotal: { fontSize: 13, fontWeight: '600', color: '#149435', textAlign: 'right', marginTop: 4 },
  pctTotalError: { color: '#DC2626' },
  prizePoolRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12, marginTop: 12,
  },
  prizePoolLabel: { fontSize: 12, color: '#92400E', flex: 1 },
  prizePoolValue: { fontSize: 15, fontWeight: '800', color: '#92400E' },

  // Footer
  footer: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#DADADA' },
  btnCreate: { backgroundColor: '#149435', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#CBD5E1' },
  btnCreateText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
