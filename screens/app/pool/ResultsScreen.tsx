import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getMatchBreakdown, getMaxMatchPoints, getBadgeColor, getMatchPoints } from '../../../utils/scoring';
import { getTeamName } from '../../../utils/teamNames';

const SYNC_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sync-results`;

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function getDateKey(match: Match): string {
  if (match.utcDate) return match.utcDate.split('T')[0];
  return match.date;
}

function formatSectionTitle(key: string): string {
  try {
    const [year, month, day] = key.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const str = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch { return key; }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DaySection {
  key: string;
  title: string;
  totalCount: number;
  totalPts: number;
  data: Match[];
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function ResultsScreen({ route }: any) {
  const { pool } = route.params;
  const { user } = useApp();

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, { homeScore: string; awayScore: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      // Predicciones del usuario
      const { data: preds } = await supabase
        .from('predictions')
        .select('match_id, home_score, away_score')
        .eq('pool_id', pool.id)
        .eq('user_id', user?.id ?? '');

      if (preds) {
        const map: Record<string, { homeScore: string; awayScore: string }> = {};
        preds.forEach((p) => {
          map[p.match_id] = { homeScore: p.home_score ?? '', awayScore: p.away_score ?? '' };
        });
        setPredictions(map);
      }

      // Marcadores frescos: solo los finalizados, con utc_date para ordenar
      const { data: freshMatches, error: matchError } = await supabase
        .from('matches')
        .select('id, home, away, date, utc_date, home_score, away_score, stage')
        .eq('pool_id', pool.id)
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);

      if (matchError) { setLoadError(true); return; }

      if (freshMatches && freshMatches.length > 0) {
        // Ordenar por fecha descendente (más recientes primero)
        const sorted = [...freshMatches].sort((a, b) => {
          if (!a.utc_date) return 1;
          if (!b.utc_date) return -1;
          return b.utc_date.localeCompare(a.utc_date);
        });

        setMatches(sorted.map((m) => ({
          id: m.id,
          home: m.home,
          away: m.away,
          date: m.date,
          utcDate: m.utc_date ?? undefined,
          homeScore: m.home_score ?? '',
          awayScore: m.away_score ?? '',
          stage: m.stage ?? 'GROUP_STAGE',
        })));
      } else {
        setMatches([]);
      }
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(SYNC_FUNCTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}` },
      });
    } catch (_) {}
    await fetchData();
    setRefreshing(false);
  };

  const maxPts = getMaxMatchPoints(pool.scoringConfig);

  // Agrupar por fecha (más recientes primero)
  const sections = useMemo<DaySection[]>(() => {
    const map = new Map<string, Match[]>();
    for (const match of matches) {
      const key = getDateKey(match);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(match);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // descendente: más recientes primero
      .map(([key, data]) => {
        const totalPts = data.reduce((sum, m) => {
          const pred = predictions[m.id];
          return sum + getMatchPoints(
            pred,
            { homeScore: m.homeScore, awayScore: m.awayScore },
            pool.scoringConfig,
            m.stage,
          );
        }, 0);
        return { key, title: formatSectionTitle(key), totalCount: data.length, totalPts, data };
      });
  }, [matches, predictions]);

  // Las secciones empiezan cerradas — el usuario las abre según necesite

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#149435" /></View>;
  if (loadError) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>No se pudieron cargar los resultados.{'\n'}Verifica tu conexión e intenta de nuevo.</Text>
    </View>
  );

  if (matches.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#149435']} />}
        contentContainerStyle={styles.centerContent}
      >
        <Text style={styles.emptyIcon}>⏳</Text>
        <Text style={styles.emptyTitle}>Sin resultados aún</Text>
        <Text style={styles.emptyText}>
          Cuando terminen los primeros partidos aparecerán aquí.{'\n'}
          Desliza hacia abajo para actualizar.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#149435']} />}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => {
        const isOpen = openSections.has(section.key);

        return (
          <View key={section.key} style={styles.sectionBlock}>

            {/* ── Cabecera de jornada ──────────────────────────── */}
            <TouchableOpacity
              style={[styles.sectionHeader, isOpen && styles.sectionHeaderOpen]}
              onPress={() => toggleSection(section.key)}
              activeOpacity={0.75}
            >
              <View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionSub}>
                  {section.totalCount} partido{section.totalCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.sectionRight}>
                {section.totalPts > 0 && (
                  <View style={styles.ptsBadge}>
                    <Text style={styles.ptsBadgeText}>+{section.totalPts} pts</Text>
                  </View>
                )}
                <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>

            {/* ── Tarjetas de resultado ─────────────────────────── */}
            {isOpen && section.data.map((match, idx) => {
              const pred = predictions[match.id];
              const result = { homeScore: match.homeScore, awayScore: match.awayScore };
              const breakdown = getMatchBreakdown(pred, result, pool.scoringConfig, match.stage);
              const badgeColor = getBadgeColor(breakdown.total, maxPts);
              const isKnockout = breakdown.multiplied;
              const isLast = idx === section.data.length - 1;

              return (
                <View key={match.id} style={[styles.card, isLast && styles.cardLast]}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardDate}>{match.date}</Text>
                    {isKnockout && (
                      <View style={styles.knockoutBadge}>
                        <Text style={styles.knockoutText}>⚡ Eliminatoria</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.resultRow}>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchTitle}>
                        {getTeamName(match.home)}  {match.homeScore} – {match.awayScore}  {getTeamName(match.away)}
                      </Text>
                      <Text style={styles.predLabel}>
                        Tu predicción:{' '}
                        {pred ? `${pred.homeScore || '?'} – ${pred.awayScore || '?'}` : 'Sin predicción'}
                      </Text>

                      {/* Desglose de puntos */}
                      {pred && breakdown.total > 0 && (
                        <View style={styles.breakdown}>
                          {breakdown.resultado > 0 && (
                            <Text style={styles.breakdownItem}>✓ Resultado +{breakdown.resultado}</Text>
                          )}
                          {breakdown.golesLocal > 0 && (
                            <Text style={styles.breakdownItem}>✓ Goles local +{breakdown.golesLocal}</Text>
                          )}
                          {breakdown.golesVisitante > 0 && (
                            <Text style={styles.breakdownItem}>✓ Goles visit. +{breakdown.golesVisitante}</Text>
                          )}
                          {breakdown.diferencia > 0 && (
                            <Text style={styles.breakdownItem}>✓ Diferencia +{breakdown.diferencia}</Text>
                          )}
                          {isKnockout && (
                            <Text style={[styles.breakdownItem, styles.breakdownKnockout]}>⚡ ×2 eliminatoria</Text>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                      <Text style={styles.badgePts}>{breakdown.total}</Text>
                      <Text style={styles.badgePtsLabel}>pts</Text>
                    </View>
                  </View>
                </View>
              );
            })}

          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EBD8' },
  scroll: { padding: 12, paddingBottom: 32 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F4EBD8', padding: 24,
  },
  centerContent: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  errorText: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 22 },

  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptyText: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 21 },

  // ── Bloque de sección ───────────────────────────────────────────────────────
  sectionBlock: {
    marginBottom: 14,
    borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0F172A', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  sectionHeaderOpen: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: 'white',
  },
  sectionSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chevron: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // Badge de puntos del día
  ptsBadge: {
    backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  ptsBadgeText: { fontSize: 12, fontWeight: '700', color: '#149435' },

  // ── Tarjeta de resultado (embebida) ─────────────────────────────────────────
  card: {
    backgroundColor: 'white', padding: 14,
    borderTopWidth: 1, borderTopColor: '#F4EBD8',
  },
  cardLast: {
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  cardDate: { fontSize: 11, color: '#94A3B8' },
  knockoutBadge: {
    backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  knockoutText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  matchInfo: { flex: 1, marginRight: 12 },
  matchTitle: { fontWeight: '700', color: '#0F172A', fontSize: 14, marginBottom: 4 },
  predLabel: { color: '#64748B', fontSize: 13, marginBottom: 6 },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  breakdownItem: {
    fontSize: 11, color: '#149435', backgroundColor: '#F0FDF4',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  breakdownKnockout: { color: '#7C3AED', backgroundColor: '#F5F3FF' },
  badge: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, minWidth: 56, alignItems: 'center',
  },
  badgePts: { color: 'white', fontWeight: 'bold', fontSize: 18, lineHeight: 22 },
  badgePtsLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
});
