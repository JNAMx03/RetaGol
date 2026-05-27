import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Pool } from '../../../context/AppContext';
import { getMaxMatchPoints } from '../../../utils/scoring';

export default function InfoScreen({ route }: any) {
  const pool: Pool = route.params.pool;
  const [scoringOpen, setScoringOpen] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);

  const sc = pool.scoringConfig;
  const ch = pool.championConfig;
  const pr = pool.prizeConfig;
  const maxPts = getMaxMatchPoints(sc);
  const totalPrize = (pr?.entryFee ?? 0) * pool.participants;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>

      {/* ── Información general ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información General</Text>
        <InfoRow label="Nombre de la Polla" value={pool.name} />
        <InfoRow label="Código de Acceso" value={pool.code} valueStyle={styles.code} />
        <InfoRow label="Participantes" value={String(pool.participants)} />
        <InfoRow label="Total de Partidos" value={String(pool.matches?.length ?? 0)} last />
      </View>

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
              { label: 'Resultado correcto (1X2)', pts: sc.resultado, color: '#2563EB' },
              { label: 'Goles local exactos', pts: sc.golesLocal, color: '#16A34A' },
              { label: 'Goles visitante exactos', pts: sc.golesVisitante, color: '#16A34A' },
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

    </ScrollView>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  list: { padding: 16 },
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
  code: { color: '#2563EB', letterSpacing: 1.5 },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  subLabel: {
    fontSize: 11, fontWeight: '600', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },
  scoringRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  scoringLabel: { flex: 1, color: '#374151', fontSize: 13 },
  scoringPts: { fontWeight: '700', fontSize: 13 },
  maxRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginTop: 8,
  },
  maxLabel: { fontSize: 13, color: '#16A34A', fontWeight: '600', flex: 1 },
  maxPts: { fontSize: 18, fontWeight: '800', color: '#16A34A' },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  optIcon: { fontSize: 16, marginRight: 8 },
  optText: { flex: 1, fontSize: 13, color: '#374151' },
  optActive: { fontSize: 12, fontWeight: '700', color: '#16A34A', backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  optPts: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  prizePoolBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 14, marginVertical: 10,
  },
  prizePoolLabel: { fontSize: 14, color: '#92400E', fontWeight: '600' },
  prizePoolValue: { fontSize: 18, fontWeight: '800', color: '#92400E' },
});
