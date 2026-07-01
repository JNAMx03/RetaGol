import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getTeamName } from '../../../utils/teamNames';
import { getMatchPoints } from '../../../utils/scoring';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function getDateKey(match: Match): string {
  if (match.utcDate) {
    const d = new Date(match.utcDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
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

function formatMatchTime(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Tarjeta de partido embebida en sección ───────────────────────────────────

function MatchItem({
  match,
  onChange,
  isLast,
}: {
  match: Match;
  onChange: (id: string, field: string, value: string) => void;
  isLast: boolean;
}) {
  return (
    <View style={[styles.matchCard, isLast && styles.matchCardLast]}>
      <Text style={styles.matchDate}>{match.utcDate ? formatMatchTime(match.utcDate) : match.date}</Text>
      <View style={styles.matchRow}>
        <Text style={styles.teamName} numberOfLines={2}>{getTeamName(match.home)}</Text>
        <View style={styles.scoreRow}>
          <TextInput
            style={styles.scoreInput}
            keyboardType="numeric"
            value={match.homeScore}
            onChangeText={(v) => onChange(match.id, 'homeScore', v)}
            maxLength={2}
            placeholder="–"
            placeholderTextColor="#CBD5E1"
          />
          <Text style={styles.vs}>-</Text>
          <TextInput
            style={styles.scoreInput}
            keyboardType="numeric"
            value={match.awayScore}
            onChangeText={(v) => onChange(match.id, 'awayScore', v)}
            maxLength={2}
            placeholder="–"
            placeholderTextColor="#CBD5E1"
          />
        </View>
        <Text style={[styles.teamName, styles.teamRight]} numberOfLines={2}>{getTeamName(match.away)}</Text>
      </View>
    </View>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DaySection {
  key: string;
  title: string;
  data: Match[];
}

interface PodiumParticipant {
  userId: string;
  name: string;
  points: number;
}

interface TeamPodium {
  champion: string;
  runnerUp: string;
  thirdPlace: string | null;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function PredictionsScreen({ route }: any) {
  const { pool } = route.params;
  const { user, savePredictionsByPool } = useApp();
  const [matches, setMatches] = useState<Match[]>(pool.matches);
  const [loadingPreds, setLoadingPreds] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Resultados frescos desde Supabase (utc_date + home_score actualizados)
  const [freshResults, setFreshResults] = useState<Record<string, { homeScore: string; awayScore: string; utcDate?: string }>>({});

  // ── Podio (solo cuando el torneo termina) ──────────────────────────────────
  const [podiumParticipants, setPodiumParticipants] = useState<PodiumParticipant[]>([]);
  const [teamPodium, setTeamPodium] = useState<TeamPodium | null>(null);
  const [myChampionPicks, setMyChampionPicks] = useState<{
    champion: string | null; runnerUp: string | null; thirdPlace: string | null;
  } | null>(null);
  const [loadingPodium, setLoadingPodium] = useState(false);

  // IDs de partidos bloqueados: ya tienen resultado O ya empezaron (utcDate <= ahora)
  const lockedIds = useMemo(() => {
    const now = new Date();
    return new Set(
      (pool.matches as Match[])
        .filter((m) => {
          const fresh = freshResults[m.id];
          const hasResult = fresh
            ? fresh.homeScore !== '' && fresh.awayScore !== ''
            : m.homeScore !== '' && m.awayScore !== '';
          const utcDate = fresh?.utcDate ?? m.utcDate;
          const hasStarted = utcDate ? new Date(utcDate) <= now : false;
          return hasResult || hasStarted;
        })
        .map((m) => m.id),
    );
  }, [pool.matches, freshResults]);

  const finishedCount = useMemo(
    () => Object.values(freshResults).filter((r) => r.homeScore !== '' && r.awayScore !== '').length,
    [freshResults],
  );

  const inProgressCount = lockedIds.size - finishedCount;

  // El torneo terminó cuando TODOS los partidos tienen resultado (ninguno en curso ni pendiente)
  const tournamentFinished = useMemo(() => {
    const total = Object.keys(freshResults).length;
    return !loadingPreds && total > 0 && finishedCount === total;
  }, [loadingPreds, finishedCount, freshResults]);

  // Cargar estado fresco de partidos + predicciones del usuario desde Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: freshMatches } = await supabase
          .from('matches')
          .select('id, home_score, away_score, utc_date')
          .eq('pool_id', pool.id);

        if (freshMatches) {
          const map: Record<string, { homeScore: string; awayScore: string; utcDate?: string }> = {};
          freshMatches.forEach((m) => {
            map[m.id] = {
              homeScore: m.home_score ?? '',
              awayScore: m.away_score ?? '',
              utcDate: m.utc_date ?? undefined,
            };
          });
          setFreshResults(map);
        }

        const { data: preds } = await supabase
          .from('predictions')
          .select('match_id, home_score, away_score')
          .eq('pool_id', pool.id)
          .eq('user_id', user?.id ?? '');

        if (preds && preds.length > 0) {
          const scoreMap = new Map(
            preds.map((p) => [p.match_id, { homeScore: p.home_score ?? '', awayScore: p.away_score ?? '' }]),
          );
          setMatches((prev) =>
            prev.map((m) => ({
              ...m,
              homeScore: scoreMap.get(m.id)?.homeScore ?? m.homeScore,
              awayScore: scoreMap.get(m.id)?.awayScore ?? m.awayScore,
            })),
          );
        }
      } catch (e) {
        console.log('Error cargando predicciones:', e);
      } finally {
        setLoadingPreds(false);
      }
    };
    fetchData();
  }, []);

  // Cargar datos del podio cuando el torneo termina
  useEffect(() => {
    if (!tournamentFinished) return;

    // Podio de equipos — derivado de los partidos locales + freshResults (sin fetch extra)
    const finalMatch = (pool.matches as Match[]).find((m) => m.stage === 'FINAL');
    const thirdMatch = (pool.matches as Match[]).find(
      (m) => m.stage === 'THIRD_PLACE' || m.stage === 'THIRD_PLACE_MATCH',
    );

    if (finalMatch) {
      const r = freshResults[finalMatch.id];
      if (r && r.homeScore !== '' && r.awayScore !== '') {
        const h = parseInt(r.homeScore);
        const a = parseInt(r.awayScore);
        // Si hubo penales (empate en el tiempo reglamentario) no podemos determinar el ganador
        if (h !== a) {
          const champion = h > a ? finalMatch.home : finalMatch.away;
          const runnerUp  = h > a ? finalMatch.away : finalMatch.home;
          let thirdPlace: string | null = null;
          if (thirdMatch) {
            const r3 = freshResults[thirdMatch.id];
            if (r3 && r3.homeScore !== '' && r3.awayScore !== '') {
              const h3 = parseInt(r3.homeScore);
              const a3 = parseInt(r3.awayScore);
              if (h3 !== a3) thirdPlace = h3 > a3 ? thirdMatch.home : thirdMatch.away;
            }
          }
          setTeamPodium({ champion, runnerUp, thirdPlace });
        }
      }
    }

    // Clasificación de participantes + picks del campeón
    const fetchPodiumData = async () => {
      setLoadingPodium(true);
      try {
        const [
          { data: participants },
          { data: allPreds },
          champResult,
        ] = await Promise.all([
          supabase.from('pool_participants').select('user_id, profiles(name)').eq('pool_id', pool.id),
          supabase.from('predictions').select('user_id, match_id, home_score, away_score').eq('pool_id', pool.id),
          pool.championConfig?.enabled
            ? supabase.from('pool_champion_predictions')
                .select('champion, runner_up, third_place')
                .eq('pool_id', pool.id)
                .eq('user_id', user?.id ?? '')
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        // Calcular puntos por participante
        const calculated: PodiumParticipant[] = (participants ?? []).map((p: any) => {
          const userPreds = (allPreds ?? []).filter((pr: any) => pr.user_id === p.user_id);
          let points = 0;
          for (const match of pool.matches as Match[]) {
            const result = freshResults[match.id];
            if (!result || result.homeScore === '' || result.awayScore === '') continue;
            const pred = userPreds.find((pr: any) => pr.match_id === match.id);
            if (!pred) continue;
            points += getMatchPoints(
              { homeScore: String(pred.home_score), awayScore: String(pred.away_score) },
              result,
              pool.scoringConfig,
              match.stage,
            );
          }
          return { userId: p.user_id, name: p.profiles?.name ?? 'Usuario', points };
        });

        setPodiumParticipants(calculated.sort((a, b) => b.points - a.points));

        if (champResult.data) {
          setMyChampionPicks({
            champion:   champResult.data.champion   ?? null,
            runnerUp:   champResult.data.runner_up  ?? null,
            thirdPlace: champResult.data.third_place ?? null,
          });
        }
      } catch (e) {
        console.log('Error cargando podio:', e);
      } finally {
        setLoadingPodium(false);
      }
    };

    fetchPodiumData();
  }, [tournamentFinished]);

  const handleChange = (id: string, field: string, value: string) => {
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const filledMatches = matches.filter(
        (m) => !lockedIds.has(m.id) && (m.homeScore !== '' || m.awayScore !== ''),
      );
      const { skipped } = await savePredictionsByPool(pool.id, filledMatches);
      if (skipped > 0) {
        Alert.alert(
          'Predicciones parciales',
          `${skipped} partido${skipped !== 1 ? 's' : ''} ya ${skipped !== 1 ? 'empezaron' : 'empezó'} y no ${skipped !== 1 ? 'se pudieron guardar' : 'se pudo guardar'}. Los demás quedaron guardados.`,
        );
      } else {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2500);
      }
    } catch (e) {
      console.log('Error guardando predicciones:', e);
    } finally {
      setSaving(false);
    }
  };

  const pendingMatches = useMemo(
    () => matches.filter((m) => !lockedIds.has(m.id)),
    [matches, lockedIds],
  );

  const sections = useMemo<DaySection[]>(() => {
    const map = new Map<string, Match[]>();
    for (const match of pendingMatches) {
      const key = getDateKey(match);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(match);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({ key, title: formatSectionTitle(key), data }));
  }, [pendingMatches]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingPreds) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#149435" /></View>;
  }

  // ── Pantalla de podio al terminar el torneo ────────────────────────────────

  if (tournamentFinished && pendingMatches.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.podiumScroll}>
        {/* Header festivo */}
        <View style={styles.podiumHeader}>
          <Text style={styles.podiumHeaderEmoji}>🏆</Text>
          <Text style={styles.podiumHeaderTitle}>¡Torneo finalizado!</Text>
          <Text style={styles.podiumHeaderSub}>{pool.name}</Text>
        </View>

        {loadingPodium ? (
          <ActivityIndicator color="#149435" size="large" style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.podiumContent}>

            {/* ── Podio de equipos ───────────────────────────────────── */}
            {teamPodium && (
              <View style={styles.podiumCard}>
                <Text style={styles.podiumCardTitle}>Resultado del torneo</Text>
                {[
                  {
                    emoji: '🥇', label: 'Campeón',    team: teamPodium.champion,
                    pick: pool.championConfig?.enabled ? myChampionPicks?.champion ?? null : null,
                  },
                  {
                    emoji: '🥈', label: 'Subcampeón', team: teamPodium.runnerUp,
                    pick: pool.championConfig?.enabled ? myChampionPicks?.runnerUp ?? null : null,
                  },
                  ...(teamPodium.thirdPlace ? [{
                    emoji: '🥉', label: '3er lugar',  team: teamPodium.thirdPlace,
                    pick: pool.championConfig?.enabled ? myChampionPicks?.thirdPlace ?? null : null,
                  }] : []),
                ].map(({ emoji, label, team, pick }) => {
                  const hit  = pick != null && pick === team;
                  const miss = pick != null && pick !== team;
                  return (
                    <View key={label} style={styles.teamRow}>
                      <Text style={styles.teamRowEmoji}>{emoji}</Text>
                      <View style={styles.teamRowInfo}>
                        <Text style={styles.teamRowLabel}>{label}</Text>
                        <Text style={styles.teamRowName}>{getTeamName(team)}</Text>
                      </View>
                      {pick != null && (
                        <View style={[styles.pickBadge, hit ? styles.pickHit : styles.pickMiss]}>
                          <Text style={[styles.pickBadgeText, hit ? styles.pickHitText : styles.pickMissText]}>
                            {hit ? '✅ Acertaste' : `❌ ${getTeamName(pick)}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Clasificación final ────────────────────────────────── */}
            {podiumParticipants.length > 0 && (
              <View style={styles.podiumCard}>
                <Text style={styles.podiumCardTitle}>Clasificación final</Text>
                {podiumParticipants.map((p, index) => {
                  const isMe = p.userId === user?.id;
                  return (
                    <View key={p.userId} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                      <Text style={styles.rankMedal}>
                        {RANK_MEDALS[index] ?? `${index + 1}`}
                      </Text>
                      <Text style={[styles.rankName, isMe && styles.rankNameMe]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[styles.rankPts, isMe && styles.rankPtsMe]}>
                        {p.points} pts
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

          </View>
        )}
      </ScrollView>
    );
  }

  // ── Estado vacío (partidos en curso, sin pendientes) ──────────────────────

  if (pendingMatches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>{finishedCount === lockedIds.size ? '✅' : '🔴'}</Text>
        <Text style={styles.emptyTitle}>
          {finishedCount === lockedIds.size ? 'Todo finalizado' : 'Partidos en curso'}
        </Text>
        <Text style={styles.emptyText}>
          {finishedCount === lockedIds.size
            ? 'Todos los partidos ya tienen resultado.\nVe a Resultados para ver tus puntos.'
            : 'Los partidos ya comenzaron y no se pueden editar.\nVe a Resultados para seguirlos en vivo.'
          }
        </Text>
      </View>
    );
  }

  // ── Lista de predicciones pendientes ──────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const isOpen = openSections.has(section.key);
          const filledCount = section.data.filter(
            (m) => m.homeScore !== '' || m.awayScore !== '',
          ).length;
          const allFilled = filledCount === section.data.length && section.data.length > 0;
          const someFilled = filledCount > 0 && !allFilled;

          return (
            <View key={section.key} style={styles.sectionBlock}>
              <TouchableOpacity
                style={[styles.sectionHeader, isOpen && styles.sectionHeaderOpen]}
                onPress={() => toggleSection(section.key)}
                activeOpacity={0.75}
              >
                <View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSub}>
                    {section.data.length} partido{section.data.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.sectionRight}>
                  <View style={[
                    styles.progressBadge,
                    allFilled ? styles.badgeGreen : someFilled ? styles.badgeYellow : styles.badgeGray,
                  ]}>
                    <Text style={[
                      styles.progressText,
                      allFilled ? styles.textGreen : someFilled ? styles.textYellow : styles.textGray,
                    ]}>
                      {filledCount}/{section.data.length}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isOpen && section.data.map((match, idx) => (
                <MatchItem
                  key={match.id}
                  match={match}
                  onChange={handleChange}
                  isLast={idx === section.data.length - 1}
                />
              ))}
            </View>
          );
        })}

        {lockedIds.size > 0 && (
          <View style={styles.finishedBanner}>
            <Text>🔒</Text>
            <Text style={styles.finishedText}>
              {inProgressCount > 0 && `${inProgressCount} partido${inProgressCount !== 1 ? 's' : ''} en curso`}
              {inProgressCount > 0 && finishedCount > 0 && ' · '}
              {finishedCount > 0 && `${finishedCount} finalizado${finishedCount !== 1 ? 's' : ''}`}
              {' — ve a Resultados'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {savedMsg && <Text style={styles.savedMsg}>Predicciones guardadas ✓</Text>}
        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnText}>✓  Guardar predicciones</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EBD8' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F4EBD8', paddingHorizontal: 24,
  },
  scroll: { padding: 12, paddingBottom: 24 },

  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptyText: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 21 },

  // ── Secciones de predicciones ───────────────────────────────────────────────
  sectionBlock: {
    marginBottom: 14,
    borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#DADADA', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  sectionHeaderOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  sectionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chevron: { fontSize: 12, color: '#64748B' },
  progressBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  progressText: { fontSize: 12, fontWeight: '700' },
  badgeGreen: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  textGreen: { color: '#149435' },
  badgeYellow: { backgroundColor: '#FEFCE8', borderColor: '#FDE047' },
  textYellow: { color: '#CA8A04' },
  badgeGray: { backgroundColor: 'rgba(0,0,0,0.06)', borderColor: 'rgba(0,0,0,0.15)' },
  textGray: { color: '#64748B' },

  matchCard: {
    backgroundColor: 'white',
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: '#F4EBD8',
  },
  matchCardLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  matchDate: { fontSize: 11, color: '#94A3B8', marginBottom: 10 },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  teamName: { flex: 1, fontWeight: '600', color: '#0F172A', fontSize: 13 },
  teamRight: { textAlign: 'right' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  scoreInput: {
    width: 42, height: 42, backgroundColor: '#F4EBD8',
    textAlign: 'center', borderRadius: 8, fontSize: 17, fontWeight: 'bold',
    color: '#0F172A', borderWidth: 1.5, borderColor: '#DADADA',
  },
  vs: { fontWeight: 'bold', marginHorizontal: 6, color: '#64748B', fontSize: 18 },

  finishedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF7F2', borderRadius: 10, padding: 12,
    gap: 8, borderWidth: 1, borderColor: '#DADADA', marginTop: 2,
  },
  finishedText: { fontSize: 13, color: '#64748B', flex: 1 },

  footer: {
    padding: 16, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#DADADA',
  },
  savedMsg: { textAlign: 'center', color: '#149435', fontWeight: '600', fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: '#149435', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  // ── Podio ───────────────────────────────────────────────────────────────────
  podiumScroll: { padding: 16, paddingBottom: 32 },
  podiumHeader: {
    backgroundColor: '#149435', borderRadius: 16,
    alignItems: 'center', paddingVertical: 28, marginBottom: 16,
  },
  podiumHeaderEmoji: { fontSize: 52, marginBottom: 10 },
  podiumHeaderTitle: { fontSize: 22, fontWeight: '800', color: 'white', marginBottom: 4 },
  podiumHeaderSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  podiumContent: { gap: 12 },
  podiumCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  podiumCardTitle: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14,
  },

  // Fila de equipo (campeón, subcampeón, 3°)
  teamRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4EBD8',
  },
  teamRowEmoji: { fontSize: 28, width: 44 },
  teamRowInfo: { flex: 1 },
  teamRowLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  teamRowName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  pickBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  pickHit: { backgroundColor: '#F0FDF4' },
  pickMiss: { backgroundColor: '#FEF2F2' },
  pickBadgeText: { fontSize: 12, fontWeight: '600' },
  pickHitText: { color: '#149435' },
  pickMissText: { color: '#DC2626' },

  // Fila de participante en la clasificación
  rankRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4EBD8',
  },
  rankRowMe: {
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 8, marginHorizontal: -8,
  },
  rankMedal: { fontSize: 22, width: 40, textAlign: 'center' },
  rankName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0F172A' },
  rankNameMe: { color: '#149435', fontWeight: '700' },
  rankPts: { fontSize: 15, fontWeight: '700', color: '#374151' },
  rankPtsMe: { color: '#149435' },
});
