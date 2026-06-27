import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { useApp, Pool } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getMaxMatchPoints } from '../../../utils/scoring';
import { getTeamName } from '../../../utils/teamNames';

// ─── Helper: fecha de expiración (último partido + 7 días) ────────────────────

function getExpiryDate(pool: Pool): Date | null {
  const utcDates = pool.matches
    .map((m) => m.utcDate)
    .filter(Boolean) as string[];
  if (utcDates.length === 0) return null;
  const lastUtc = utcDates.reduce((max, d) => (d > max ? d : max), '');
  return new Date(new Date(lastUtc).getTime() + 7 * 24 * 60 * 60 * 1000);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function InfoScreen({ route, navigation }: any) {
  const pool: Pool = route.params.pool;
  const { user, refreshPools } = useApp();
  const [scoringOpen, setScoringOpen] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [poolOpen, setPoolOpen] = useState(pool.open ?? true);
  const [togglingOpen, setTogglingOpen] = useState(false);

  // Picks del torneo del usuario actual
  const [picks, setPicks] = useState<{ champion: string | null; runner_up: string | null; third_place: string | null } | null>(null);
  const [loadingPicks, setLoadingPicks] = useState(false);

  useEffect(() => {
    if (!ch?.enabled || !user?.id) return;
    setLoadingPicks(true);
    supabase
      .from('pool_champion_predictions')
      .select('champion, runner_up, third_place')
      .eq('pool_id', pool.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPicks(data ?? null);
        setLoadingPicks(false);
      });
  }, []);

  const sc = pool.scoringConfig;
  const ch = pool.championConfig;
  const pr = pool.prizeConfig;
  const maxPts = getMaxMatchPoints(sc);
  const totalPrize = (pr?.entryFee ?? 0) * pool.participants;

  const isCreator = user?.id === pool.creatorId;

  // ¿Todos los partidos tienen resultado?
  const allFinished =
    pool.matches.length > 0 &&
    pool.matches.every((m) => m.homeScore !== '' && m.awayScore !== '');

  const expiryDate = allFinished ? getExpiryDate(pool) : null;

  // ── Salir de la polla ────────────────────────────────────────────────────────

  const handleLeave = () => {
    Alert.alert(
      'Salir de la polla',
      `¿Estás seguro de que quieres salir de "${pool.name}"?\n\nPerderás el acceso a los partidos y resultados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, salir', style: 'destructive', onPress: confirmLeave },
      ],
    );
  };

  const confirmLeave = async () => {
    setLeaving(true);
    try {
      const { error } = await supabase
        .from('pool_participants')
        .delete()
        .eq('pool_id', pool.id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await refreshPools();
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }),
      );
    } catch {
      Alert.alert('Error', 'No se pudo salir de la polla. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLeaving(false);
    }
  };

  // ── Toggle ingreso de nuevos participantes ────────────────────────────────────

  const handleToggleOpen = async (value: boolean) => {
    setTogglingOpen(true);
    const prev = poolOpen;
    setPoolOpen(value); // optimistic update
    try {
      const { error } = await supabase
        .from('pools')
        .update({ open: value })
        .eq('id', pool.id);
      if (error) throw error;
    } catch {
      setPoolOpen(prev); // revertir si falla
      Alert.alert('Error', 'No se pudo actualizar la configuración.');
    } finally {
      setTogglingOpen(false);
    }
  };

  // ── Borrar polla ─────────────────────────────────────────────────────────────

  const handleDelete = () => {
    Alert.alert(
      'Borrar polla',
      `¿Estás seguro de que quieres borrar "${pool.name}"?\n\nSe eliminarán todos los partidos, predicciones y datos de la polla. Esta acción es irreversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ],
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('pools').delete().eq('id', pool.id);
      if (error) throw error;

      // Regresar al Home y refrescar la lista de pollas
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }),
      );
    } catch {
      Alert.alert('Error', 'No se pudo borrar la polla. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>

      {/* ── Banner de expiración (solo cuando el torneo ya terminó) ──────── */}
      {allFinished && expiryDate && (
        <View style={styles.expiryBanner}>
          <Text style={styles.expiryIcon}>⏳</Text>
          <View style={styles.expiryText}>
            <Text style={styles.expiryTitle}>Torneo finalizado</Text>
            <Text style={styles.expirySub}>
              Esta polla se borrará automáticamente el{' '}
              <Text style={styles.expiryDate}>{formatDate(expiryDate)}</Text>
            </Text>
          </View>
        </View>
      )}

      {/* ── Información general ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información General</Text>
        <InfoRow label="Nombre de la Polla" value={pool.name} />
        <InfoRow label="Código de Acceso" value={pool.code} valueStyle={styles.code} />
        <InfoRow label="Participantes" value={String(pool.participants)} />
        <InfoRow label="Total de Partidos" value={String(pool.matches?.length ?? 0)} last />
      </View>

      {/* ── Mi Predicción Final (solo si está habilitada) ───────────────── */}
      {ch?.enabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Mi Predicción Final</Text>
          {loadingPicks ? (
            <ActivityIndicator size="small" color="#149435" style={{ marginTop: 12 }} />
          ) : picks ? (
            <View style={styles.accordionBody}>
              {([
                { icon: '🥇', label: 'Campeón',      value: picks.champion },
                { icon: '🥈', label: 'Subcampeón',   value: picks.runner_up },
                { icon: '🥉', label: 'Tercer lugar', value: picks.third_place },
              ] as const).map((row) => (
                <View key={row.label} style={styles.pickRow}>
                  <Text style={styles.pickIcon}>{row.icon}</Text>
                  <Text style={styles.pickLabel}>{row.label}</Text>
                  <Text style={styles.pickValue}>
                    {row.value ? getTeamName(row.value) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noPicksRow}>
              <Text style={styles.noPicksText}>
                📝 Aún no has elegido tus picks del torneo
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Sistema de puntuación ────────────────────────────────────────── */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.accordionRow}
          onPress={() => setScoringOpen((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>🎯 Sistema de Puntuación</Text>
          <Text style={styles.chevron}>{scoringOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {scoringOpen && (
          <View style={styles.accordionBody}>
            {/* Puntos base */}
            <Text style={styles.subLabel}>Puntos por partido (aditivos)</Text>
            {[
              { label: 'Resultado correcto (1X2)', pts: sc.resultado, color: '#149435' },
              { label: 'Goles local exactos', pts: sc.golesLocal, color: '#149435' },
              { label: 'Goles visitante exactos', pts: sc.golesVisitante, color: '#149435' },
              { label: 'Diferencia de goles exacta', pts: sc.diferencia, color: '#EAB308' },
            ].map((r) => (
              <View key={r.label} style={styles.scoringRow}>
                <View style={[styles.dot, { backgroundColor: r.color }]} />
                <Text style={styles.scoringLabel}>{r.label}</Text>
                <Text style={[styles.scoringPts, { color: r.color }]}>+{r.pts} pts</Text>
              </View>
            ))}

            {/* Total exacto */}
            <View style={styles.maxRow}>
              <Text style={styles.maxLabel}>⭐ Marcador exacto (todos los criterios)</Text>
              <Text style={styles.maxPts}>{maxPts} pts</Text>
            </View>

            {/* Opciones especiales */}
            {(sc.dobleEliminatoria || sc.bonusUnico) && (
              <>
                <Text style={[styles.subLabel, { marginTop: 14 }]}>Opciones especiales</Text>
                {sc.dobleEliminatoria && (
                  <View style={styles.optRow}>
                    <Text style={styles.optIcon}>⚡</Text>
                    <Text style={styles.optText}>Doble puntos en fase eliminatoria</Text>
                    <Text style={styles.optActive}>ON</Text>
                  </View>
                )}
                {sc.bonusUnico && (
                  <View style={styles.optRow}>
                    <Text style={styles.optIcon}>🎁</Text>
                    <Text style={styles.optText}>+1 al único acertante exacto</Text>
                    <Text style={styles.optActive}>ON</Text>
                  </View>
                )}
              </>
            )}

            {/* Predicción final */}
            {ch?.enabled && (
              <>
                <Text style={[styles.subLabel, { marginTop: 14 }]}>Predicción final del torneo</Text>
                <View style={styles.optRow}>
                  <Text style={styles.optIcon}>🥇</Text>
                  <Text style={styles.optText}>Campeón</Text>
                  <Text style={styles.optPts}>+{ch.champion} pts</Text>
                </View>
                <View style={styles.optRow}>
                  <Text style={styles.optIcon}>🥈</Text>
                  <Text style={styles.optText}>Subcampeón</Text>
                  <Text style={styles.optPts}>+{ch.runnerUp} pts</Text>
                </View>
                <View style={styles.optRow}>
                  <Text style={styles.optIcon}>🥉</Text>
                  <Text style={styles.optText}>Tercer lugar</Text>
                  <Text style={styles.optPts}>+{ch.thirdPlace} pts</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* ── Premio ──────────────────────────────────────────────────────── */}
      {pr && pr.entryFee > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionRow}
            onPress={() => setPrizeOpen((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>💰 Premio</Text>
            <Text style={styles.chevron}>{prizeOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {prizeOpen && (
            <View style={styles.accordionBody}>
              <InfoRow label="Valor de entrada" value={`${pr.entryFee.toLocaleString('es-CO')} ${pr.currency}`} />
              <InfoRow label="Participantes" value={String(pool.participants)} />

              <View style={styles.prizePoolBox}>
                <Text style={styles.prizePoolLabel}>💵 Pozo total</Text>
                <Text style={styles.prizePoolValue}>
                  {totalPrize.toLocaleString('es-CO')} {pr.currency}
                </Text>
              </View>

              <Text style={styles.subLabel}>Distribución</Text>
              {pr.distribution === 'winner_takes_all' ? (
                <View style={styles.optRow}>
                  <Text style={styles.optIcon}>🥇</Text>
                  <Text style={styles.optText}>Todo al primer lugar</Text>
                  <Text style={styles.optPts}>{totalPrize.toLocaleString('es-CO')} {pr.currency}</Text>
                </View>
              ) : (
                <>
                  {pr.percentages.first > 0 && (
                    <View style={styles.optRow}>
                      <Text style={styles.optIcon}>🥇</Text>
                      <Text style={styles.optText}>1er lugar ({pr.percentages.first}%)</Text>
                      <Text style={styles.optPts}>
                        {Math.round(totalPrize * pr.percentages.first / 100).toLocaleString('es-CO')} {pr.currency}
                      </Text>
                    </View>
                  )}
                  {pr.percentages.second > 0 && (
                    <View style={styles.optRow}>
                      <Text style={styles.optIcon}>🥈</Text>
                      <Text style={styles.optText}>2do lugar ({pr.percentages.second}%)</Text>
                      <Text style={styles.optPts}>
                        {Math.round(totalPrize * pr.percentages.second / 100).toLocaleString('es-CO')} {pr.currency}
                      </Text>
                    </View>
                  )}
                  {pr.percentages.third > 0 && (
                    <View style={styles.optRow}>
                      <Text style={styles.optIcon}>🥉</Text>
                      <Text style={styles.optText}>3er lugar ({pr.percentages.third}%)</Text>
                      <Text style={styles.optPts}>
                        {Math.round(totalPrize * pr.percentages.third / 100).toLocaleString('es-CO')} {pr.currency}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── Salir de la polla (solo participantes, no el creador) ──────── */}
      {!isCreator && (
        <TouchableOpacity
          style={[styles.btnLeave, leaving && styles.btnLeaveDisabled]}
          onPress={handleLeave}
          disabled={leaving}
          activeOpacity={0.8}
        >
          {leaving
            ? <ActivityIndicator color="#92400E" size="small" />
            : <Text style={styles.btnLeaveText}>Salir de la polla</Text>
          }
        </TouchableOpacity>
      )}

      {/* ── Zona peligrosa (solo creador) ────────────────────────────────── */}
      {isCreator && (
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Zona del creador</Text>

          {/* Toggle: permitir nuevos ingresos */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Permitir nuevos ingresos</Text>
              <Text style={styles.toggleDesc}>
                {poolOpen ? 'La polla acepta nuevos participantes' : 'La polla está cerrada a nuevos participantes'}
              </Text>
            </View>
            <Switch
              value={poolOpen}
              onValueChange={handleToggleOpen}
              disabled={togglingOpen}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={poolOpen ? '#149435' : '#94A3B8'}
            />
          </View>

          <View style={styles.dangerDivider} />

          <Text style={styles.dangerDesc}>
            Solo tú puedes borrar esta polla. Esta acción eliminará todos los datos y no se puede deshacer.
          </Text>
          <TouchableOpacity
            style={[styles.btnDelete, deleting && styles.btnDeleteDisabled]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={styles.btnDeleteText}>🗑  Borrar polla</Text>
            }
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

// ─── Componente auxiliar ──────────────────────────────────────────────────────

function InfoRow({ label, value, valueStyle, last }: {
  label: string; value: string; valueStyle?: object; last?: boolean;
}) {
  return (
    <>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
      </View>
      {!last && <View style={styles.divider} />}
    </>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EBD8' },
  list: { padding: 16, paddingBottom: 40 },

  // Banner de expiración
  expiryBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#FDE68A', gap: 10,
  },
  expiryIcon: { fontSize: 20, marginTop: 1 },
  expiryText: { flex: 1 },
  expiryTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  expirySub: { fontSize: 12, color: '#92400E', lineHeight: 18 },
  expiryDate: { fontWeight: '700' },

  // Secciones
  section: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  accordionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chevron: { color: '#64748B', fontSize: 13 },
  accordionBody: { marginTop: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  infoLabel: { color: '#64748B', fontSize: 14 },
  infoValue: { fontWeight: '600', color: '#0F172A', fontSize: 14 },
  code: { color: '#149435', letterSpacing: 1.5 },
  divider: { height: 1, backgroundColor: '#F4EBD8' },
  subLabel: {
    fontSize: 11, fontWeight: '600', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },
  scoringRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F4EBD8' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  scoringLabel: { flex: 1, color: '#374151', fontSize: 13 },
  scoringPts: { fontWeight: '700', fontSize: 13 },
  maxRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginTop: 8,
  },
  maxLabel: { fontSize: 13, color: '#149435', fontWeight: '600', flex: 1 },
  maxPts: { fontSize: 18, fontWeight: '800', color: '#149435' },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F4EBD8' },
  optIcon: { fontSize: 16, marginRight: 8 },
  optText: { flex: 1, fontSize: 13, color: '#374151' },
  optActive: { fontSize: 12, fontWeight: '700', color: '#149435', backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  optPts: { fontSize: 13, fontWeight: '700', color: '#149435' },
  prizePoolBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 14, marginVertical: 10,
  },
  prizePoolLabel: { fontSize: 14, color: '#92400E', fontWeight: '600' },
  prizePoolValue: { fontSize: 18, fontWeight: '800', color: '#92400E' },

  // Picks del torneo
  pickRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F4EBD8',
  },
  pickIcon: { fontSize: 20, width: 30 },
  pickLabel: { flex: 1, fontSize: 14, color: '#64748B' },
  pickValue: { fontWeight: '700', color: '#0F172A', fontSize: 14 },
  noPicksRow: {
    marginTop: 12, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#FAF7F2', borderRadius: 10,
  },
  noPicksText: { fontSize: 13, color: '#94A3B8' },

  // Salir de la polla
  btnLeave: {
    backgroundColor: '#FEF3C7', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FCD34D', marginBottom: 12,
  },
  btnLeaveDisabled: { opacity: 0.5 },
  btnLeaveText: { color: '#92400E', fontWeight: '700', fontSize: 15 },

  // Zona peligrosa
  dangerZone: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginTop: 4,
    borderWidth: 1.5, borderColor: '#FEE2E2',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  dangerTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 12 },
  dangerDesc: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 14 },
  dangerDivider: { height: 1, backgroundColor: '#FEE2E2', marginVertical: 14 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  toggleDesc: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  btnDelete: {
    backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center',
  },
  btnDeleteDisabled: { opacity: 0.5 },
  btnDeleteText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
