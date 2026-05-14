import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Pool } from '../../../context/AppContext';

const TYPE_LABELS: Record<string, string> = {
  liga: 'Liga',
  copa: 'Copa',
  champions: 'Champions',
};

const TOURNAMENT_DESC: Record<string, string> = {
  champions:
    'La UEFA Champions League es la competición de clubes más prestigiosa de Europa, donde los mejores equipos del continente compiten por el trofeo continental.',
  liga:
    'La Liga Española es una de las mejores ligas del mundo, con clubes de clase mundial compitiendo por el título cada temporada.',
  copa:
    'La Copa del Rey es el torneo de copa más importante de España, donde participan equipos de todas las divisiones del fútbol español.',
};

// Tabla de puntuación oficial según arquitectura V1
const SCORING_RULES = [
  { label: 'Marcador exacto', points: '5 pts', color: '#16A34A' },
  { label: 'Un marcador exacto (local o visitante)', points: '2 pts', color: '#2563EB' },
  { label: 'Ganador / empate correcto', points: '1 pt', color: '#EAB308' },
  { label: 'Diferencia de goles correcta', points: '1 pt', color: '#EAB308' },
  { label: 'Sin acierto', points: '0 pts', color: '#DC2626' },
];

export default function InfoScreen({ route }: any) {
  const pool: Pool = route.params.pool;
  const [scoringOpen, setScoringOpen] = useState(false);

  const typeLabel = TYPE_LABELS[pool.type] ?? pool.type;
  const description = TOURNAMENT_DESC[pool.type] ?? 'Información de la competición no disponible.';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      {/* ── Información general ─────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información General</Text>

        <InfoRow label="Nombre de la Polla" value={pool.name} />
        <InfoRow label="Tipo" value={typeLabel} />
        <InfoRow label="Código de Acceso" value={pool.code} valueStyle={styles.code} />
        <InfoRow label="Participantes" value={String(pool.participants)} />
        <InfoRow label="Total de Partidos" value={String(pool.matches?.length ?? 0)} last />
      </View>

      {/* ── Sobre el torneo ─────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre el Torneo</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* ── Sistema de puntuación (acordeón) ────── */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.accordionRow}
          onPress={() => setScoringOpen((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Sistema de Puntuación</Text>
          <Text style={styles.chevron}>{scoringOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {scoringOpen && (
          <View style={styles.scoringList}>
            {SCORING_RULES.map((rule, i) => (
              <View key={i} style={styles.scoringRow}>
                <View style={[styles.dot, { backgroundColor: rule.color }]} />
                <Text style={styles.scoringLabel}>{rule.label}</Text>
                <Text style={[styles.scoringPts, { color: rule.color }]}>{rule.points}</Text>
              </View>
            ))}
            <Text style={styles.scoringNote}>
              * Los puntos son excluyentes: se aplica solo el acierto de mayor valor.
              En futuras versiones el creador podrá personalizar estos valores.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  valueStyle,
  last,
}: {
  label: string;
  value: string;
  valueStyle?: object;
  last?: boolean;
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
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  infoLabel: { color: '#64748B', fontSize: 14 },
  infoValue: { fontWeight: '600', color: '#0F172A', fontSize: 14 },
  code: { color: '#2563EB', letterSpacing: 1.5 },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  description: { color: '#64748B', lineHeight: 22, fontSize: 14 },
  accordionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  chevron: { color: '#64748B', fontSize: 13 },
  scoringList: { marginTop: 12 },
  scoringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  scoringLabel: { flex: 1, color: '#374151', fontSize: 13 },
  scoringPts: { fontWeight: '700', fontSize: 13 },
  scoringNote: {
    marginTop: 12,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
