import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getMatchBreakdown, getMaxMatchPoints, getBadgeColor, getMatchPoints } from '../../../utils/scoring';
import { getTeamName } from '../../../utils/teamNames';
import { captureRef } from 'react-native-view-shot';
import { shareAsync, isAvailableAsync } from 'expo-sharing';

const SYNC_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sync-results`;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ParticipantPred {
  userId: string;
  name: string;
  homeScore: string;
  awayScore: string;
}

interface DaySection {
  key: string;
  title: string;
  totalCount: number;
  totalPts: number;
  data: Match[];
}

interface ChampionPickRow {
  userId: string;
  name: string;
  champion: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
}

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

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function ResultsScreen({ route }: any) {
  const { pool } = route.params;
  const { user } = useApp();

  const [finishedMatches, setFinishedMatches] = useState<Match[]>([]);
  const [inProgressMatches, setInProgressMatches] = useState<Match[]>([]);
  const [myPredictions, setMyPredictions] = useState<Record<string, { homeScore: string; awayScore: string }>>({});

  // Predicciones de todos los participantes — cargadas lazy al expandir
  const [participantPreds, setParticipantPreds] = useState<Record<string, ParticipantPred[]>>({});
  const [loadingPreds, setLoadingPreds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Dos niveles de acordeón: secciones de fecha (finalizados) y partidos expandidos
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());

  // ── Picks de campeón de todos los participantes ────────────────────────────
  const [championOpen, setChampionOpen] = useState(false);
  const [championPicks, setChampionPicks] = useState<ChampionPickRow[]>([]);
  const [loadingChampion, setLoadingChampion] = useState(false);

  // ── Compartir partido ──────────────────────────────────────────────────────
  const [shareData, setShareData] = useState<{ match: Match; preds: ParticipantPred[] } | null>(null);
  const [sharingMatchId, setSharingMatchId] = useState<string | null>(null);
  const shareMatchCardRef = useRef<View>(null);

  useEffect(() => {
    if (!shareData) return;
    const timer = setTimeout(async () => {
      try {
        if (!shareMatchCardRef.current) return;
        const uri = await captureRef(shareMatchCardRef, { format: 'png', quality: 0.95 });
        if (await isAvailableAsync()) {
          await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir resultado' });
        }
      } catch (e) {
        console.log('Error compartiendo:', e);
      } finally {
        setSharingMatchId(null);
        setShareData(null);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [shareData]);

  const handleShareMatch = (match: Match, preds: ParticipantPred[]) => {
    if (sharingMatchId) return;
    setSharingMatchId(match.id);
    setShareData({ match, preds });
  };

  // ── Carga de datos ─────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      // Mis predicciones
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
        setMyPredictions(map);
      }

      const now = new Date().toISOString();

      // Partidos finalizados (tienen resultado)
      const { data: finished, error } = await supabase
        .from('matches')
        .select('id, home, away, date, utc_date, home_score, away_score, stage')
        .eq('pool_id', pool.id)
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);

      if (error) { setLoadError(true); return; }

      // Partidos en curso: ya empezaron (utc_date < ahora) pero sin resultado aún
      const { data: inProgress } = await supabase
        .from('matches')
        .select('id, home, away, date, utc_date, home_score, away_score, stage')
        .eq('pool_id', pool.id)
        .is('home_score', null)
        .lt('utc_date', now);

      const mapMatch = (m: any): Match => ({
        id: m.id,
        home: m.home,
        away: m.away,
        date: m.date,
        utcDate: m.utc_date ?? undefined,
        homeScore: m.home_score ?? '',
        awayScore: m.away_score ?? '',
        stage: m.stage ?? 'GROUP_STAGE',
      });

      // Finalizados: ordenar descendente (más recientes primero)
      const sortedFinished = [...(finished ?? [])].sort((a, b) => {
        if (!a.utc_date) return 1;
        if (!b.utc_date) return -1;
        return b.utc_date.localeCompare(a.utc_date);
      });

      setFinishedMatches(sortedFinished.map(mapMatch));
      setInProgressMatches((inProgress ?? []).map(mapMatch));

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

  // ── Cargar predicciones de todos para un partido (lazy) ────────────────────

  const loadParticipantPreds = async (matchId: string) => {
    if (participantPreds[matchId] || loadingPreds.has(matchId)) return;

    setLoadingPreds((prev) => new Set(prev).add(matchId));
    try {
      const { data } = await supabase
        .from('predictions')
        .select('user_id, home_score, away_score, profiles(name)')
        .eq('pool_id', pool.id)
        .eq('match_id', matchId);

      if (data) {
        const parsed: ParticipantPred[] = data.map((p: any) => ({
          userId: p.user_id,
          name: p.profiles?.name ?? 'Usuario',
          homeScore: p.home_score ?? '',
          awayScore: p.away_score ?? '',
        }));
        // Poner al usuario actual primero
        parsed.sort((a, b) => {
          if (a.userId === user?.id) return -1;
          if (b.userId === user?.id) return 1;
          return a.name.localeCompare(b.name);
        });
        setParticipantPreds((prev) => ({ ...prev, [matchId]: parsed }));
      }
    } catch (_) {}
    finally {
      setLoadingPreds((prev) => { const s = new Set(prev); s.delete(matchId); return s; });
    }
  };

  const toggleMatch = (matchId: string) => {
    setExpandedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
        loadParticipantPreds(matchId);
      }
      return next;
    });
  };

  // Resultado real del torneo — derivado de la final y el tercer puesto
  const actualResult = useMemo(() => {
    const finalMatch = finishedMatches.find((m) => m.stage === 'FINAL');
    if (!finalMatch || finalMatch.homeScore === '' || finalMatch.awayScore === '') return null;
    const h = parseInt(finalMatch.homeScore), a = parseInt(finalMatch.awayScore);
    if (h === a) return null; // empate en 90' (fue a penales) — no podemos determinar campeón
    const thirdMatch = finishedMatches.find(
      (m) => m.stage === 'THIRD_PLACE' || m.stage === 'THIRD_PLACE_MATCH',
    );
    let thirdPlace: string | null = null;
    if (thirdMatch && thirdMatch.homeScore !== '' && thirdMatch.awayScore !== '') {
      const h3 = parseInt(thirdMatch.homeScore), a3 = parseInt(thirdMatch.awayScore);
      if (h3 !== a3) thirdPlace = h3 > a3 ? thirdMatch.home : thirdMatch.away;
    }
    return {
      champion:  h > a ? finalMatch.home : finalMatch.away,
      runnerUp:  h > a ? finalMatch.away : finalMatch.home,
      thirdPlace,
    };
  }, [finishedMatches]);

  const handleToggleChampion = () => {
    if (championOpen) { setChampionOpen(false); return; }
    Alert.alert(
      '¿Ver los picks de todos?',
      'Vas a ver las predicciones de campeón de todos los participantes. ¿Seguro que querés continuar? 😬',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ver igual',
          onPress: async () => {
            setChampionOpen(true);
            if (championPicks.length > 0) return;
            setLoadingChampion(true);
            try {
              const { data } = await supabase
                .from('pool_champion_predictions')
                .select('user_id, champion, runner_up, third_place, profiles(name)')
                .eq('pool_id', pool.id);
              if (data) {
                const parsed: ChampionPickRow[] = data.map((p: any) => ({
                  userId:     p.user_id,
                  name:       p.profiles?.name ?? 'Usuario',
                  champion:   p.champion    ?? null,
                  runnerUp:   p.runner_up   ?? null,
                  thirdPlace: p.third_place ?? null,
                }));
                parsed.sort((a, b) => {
                  if (a.userId === user?.id) return -1;
                  if (b.userId === user?.id) return 1;
                  return a.name.localeCompare(b.name);
                });
                setChampionPicks(parsed);
              }
            } catch (e) {
              console.log('Error cargando picks de campeón:', e);
            } finally {
              setLoadingChampion(false);
            }
          },
        },
      ],
    );
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const maxPts = getMaxMatchPoints(pool.scoringConfig);

  // Agrupar finalizados por fecha
  const finishedSections = useMemo<DaySection[]>(() => {
    const map = new Map<string, Match[]>();
    for (const match of finishedMatches) {
      const key = getDateKey(match);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(match);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => {
        const totalPts = data.reduce((sum, m) => {
          const pred = myPredictions[m.id];
          return sum + getMatchPoints(
            pred,
            { homeScore: m.homeScore, awayScore: m.awayScore },
            pool.scoringConfig,
            m.stage,
          );
        }, 0);
        return { key, title: formatSectionTitle(key), totalCount: data.length, totalPts, data };
      });
  }, [finishedMatches, myPredictions]);

  // ── Render de tarjeta de participantes ─────────────────────────────────────

  const renderParticipants = (match: Match, isFinished: boolean) => {
    const preds = participantPreds[match.id];
    const isLoadingThis = loadingPreds.has(match.id);
    const isSharingThis = sharingMatchId === match.id;

    if (isLoadingThis) {
      return (
        <View style={styles.participantsLoading}>
          <ActivityIndicator size="small" color="#149435" />
        </View>
      );
    }

    if (!preds || preds.length === 0) {
      return (
        <View style={styles.participantsEmpty}>
          <Text style={styles.participantsEmptyText}>Nadie ha predicho este partido aún</Text>
        </View>
      );
    }

    return (
      <View style={styles.participantsList}>
        {preds.map((p) => {
          const isMe = p.userId === user?.id;
          const hasPred = p.homeScore !== '' && p.awayScore !== '';

          if (isFinished && hasPred) {
            const breakdown = getMatchBreakdown(
              { homeScore: p.homeScore, awayScore: p.awayScore },
              { homeScore: match.homeScore, awayScore: match.awayScore },
              pool.scoringConfig,
              match.stage,
            );
            const badgeColor = getBadgeColor(breakdown.total, maxPts);
            return (
              <View key={p.userId} style={[styles.participantRow, isMe && styles.participantRowMe]}>
                <Text style={[styles.participantName, isMe && styles.participantNameMe]} numberOfLines={1}>
                  {isMe ? '⭐ Tú' : p.name}
                </Text>
                <Text style={styles.participantPred}>{p.homeScore} – {p.awayScore}</Text>
                <View style={[styles.participantBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.participantBadgePts}>{breakdown.total} pts</Text>
                </View>
              </View>
            );
          }

          // En curso o sin predicción
          return (
            <View key={p.userId} style={[styles.participantRow, isMe && styles.participantRowMe]}>
              <Text style={[styles.participantName, isMe && styles.participantNameMe]} numberOfLines={1}>
                {isMe ? '⭐ Tú' : p.name}
              </Text>
              <Text style={styles.participantPred}>
                {hasPred ? `${p.homeScore} – ${p.awayScore}` : '–'}
              </Text>
              <View style={styles.participantBadgeEmpty}>
                <Text style={styles.participantBadgeEmptyText}>En juego</Text>
              </View>
            </View>
          );
        })}

        {/* Botón compartir — partidos finalizados y en vivo */}
        <TouchableOpacity
          style={[styles.shareMatchBtn, isSharingThis && styles.shareMatchBtnDisabled]}
          onPress={() => handleShareMatch(match, preds)}
          disabled={!!sharingMatchId}
          activeOpacity={0.75}
        >
          <Text style={styles.shareMatchBtnText}>
            {isSharingThis ? 'Generando imagen...' : (isFinished ? '📤  Compartir este resultado' : '📤  Compartir predicciones')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render de tarjeta de partido ───────────────────────────────────────────

  const renderMatchCard = (match: Match, isLast: boolean, isFinished: boolean) => {
    const isExpanded = expandedMatches.has(match.id);
    const myPred = myPredictions[match.id];
    const isKnockout = isFinished && myPred
      ? getMatchBreakdown(myPred, { homeScore: match.homeScore, awayScore: match.awayScore }, pool.scoringConfig, match.stage).multiplied
      : false;

    return (
      <View key={match.id} style={[styles.card, isLast && !isExpanded && styles.cardLast]}>
        {/* Cabecera del partido — solo muestra el marcador, sin predicción propia */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleMatch(match.id)}
          activeOpacity={0.75}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardDate}>{match.utcDate ? formatMatchTime(match.utcDate) : match.date}</Text>
            <Text style={styles.cardTeams}>
              {getTeamName(match.home)}
              {isFinished ? `  ${match.homeScore} – ${match.awayScore}  ` : '  vs  '}
              {getTeamName(match.away)}
            </Text>
            {isKnockout && (
              <View style={styles.knockoutBadge}>
                <Text style={styles.knockoutText}>⚡ Eliminatoria</Text>
              </View>
            )}
          </View>
          <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* Predicciones de participantes (expandido) */}
        {isExpanded && (
          <View style={[styles.participantsContainer, isLast && styles.participantsContainerLast]}>
            <Text style={styles.participantsTitle}>
              {isFinished ? '📊 Predicciones del grupo' : '👀 Predicciones en juego'}
            </Text>
            {renderParticipants(match, isFinished)}
          </View>
        )}
      </View>
    );
  };

  // ── Estados de carga / error / vacío ──────────────────────────────────────

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#149435" /></View>;
  if (loadError) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>No se pudieron cargar los resultados.{'\n'}Verifica tu conexión e intenta de nuevo.</Text>
    </View>
  );

  const hasData = finishedMatches.length > 0 || inProgressMatches.length > 0;

  if (!hasData) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#149435']} />}
        contentContainerStyle={styles.centerContent}
      >
        <Text style={styles.emptyIcon}>⏳</Text>
        <Text style={styles.emptyTitle}>Sin resultados aún</Text>
        <Text style={styles.emptyText}>
          Cuando comiencen los primeros partidos aparecerán aquí.{'\n'}
          Desliza hacia abajo para actualizar.
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#149435']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sección: Predicción final del torneo ──────────────────────────── */}
        {pool.championConfig?.enabled && (
          <View style={styles.championBlock}>
            <TouchableOpacity
              style={styles.championHeader}
              onPress={handleToggleChampion}
              activeOpacity={0.75}
            >
              <Text style={styles.championHeaderText}>🏆  Predicción final del torneo</Text>
              <Text style={styles.chevron}>{championOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {championOpen && (
              <View style={styles.championBody}>
                {loadingChampion ? (
                  <ActivityIndicator color="#149435" style={{ paddingVertical: 16 }} />
                ) : championPicks.length === 0 ? (
                  <Text style={styles.championEmpty}>Nadie ha elegido campeón aún</Text>
                ) : (
                  championPicks.map((pick) => {
                    const isMe = pick.userId === user?.id;
                    const items = [
                      { emoji: '🥇', label: 'Campeón',    val: pick.champion,   actual: actualResult?.champion   ?? null },
                      { emoji: '🥈', label: 'Subcampeón', val: pick.runnerUp,   actual: actualResult?.runnerUp   ?? null },
                      { emoji: '🥉', label: '3er lugar',  val: pick.thirdPlace, actual: actualResult?.thirdPlace ?? null },
                    ];
                    return (
                      <View key={pick.userId} style={[styles.championCard, isMe && styles.championCardMe]}>
                        <Text style={[styles.championName, isMe && styles.championNameMe]} numberOfLines={1}>
                          {isMe ? '⭐ Tú' : pick.name}
                        </Text>
                        {items.map(({ emoji, label, val, actual }) => {
                          const hit  = actual !== null && val !== null && val === actual;
                          const miss = actual !== null && val !== null && val !== actual;
                          return (
                            <View key={label} style={styles.championPickRow}>
                              <Text style={styles.championPickEmoji}>{emoji}</Text>
                              <Text style={styles.championPickLabel}>{label}</Text>
                              <Text
                                style={[styles.championPickTeam, hit && styles.championPickHit, miss && styles.championPickMiss]}
                                numberOfLines={1}
                              >
                                {val ? getTeamName(val) : '–'}
                              </Text>
                              {hit  && <Text style={styles.championResultIcon}>✅</Text>}
                              {miss && <Text style={styles.championResultIcon}>❌</Text>}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Sección: En curso ─────────────────────────────────────────────── */}
        {inProgressMatches.length > 0 && (
          <View style={styles.groupBlock}>
            <View style={styles.groupHeader}>
              <View style={styles.liveIndicator} />
              <Text style={styles.groupTitle}>En curso</Text>
              <Text style={styles.groupCount}>{inProgressMatches.length}</Text>
            </View>
            <View style={styles.groupBody}>
              {inProgressMatches.map((match, idx) =>
                renderMatchCard(match, idx === inProgressMatches.length - 1, false)
              )}
            </View>
          </View>
        )}

        {/* ── Sección: Finalizados ──────────────────────────────────────────── */}
        {finishedSections.length > 0 && (
          <View style={styles.groupBlock}>
            <View style={[styles.groupHeader, styles.groupHeaderDark]}>
              <Text style={styles.groupHeaderDarkText}>✅  Finalizados</Text>
              <Text style={[styles.groupCount, styles.groupCountDark]}>{finishedMatches.length}</Text>
            </View>

            {finishedSections.map((section) => {
              const isOpen = openSections.has(section.key);
              return (
                <View key={section.key} style={styles.sectionBlock}>
                  {/* Cabecera de jornada */}
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
                        <View style={styles.sectionPtsBadge}>
                          <Text style={styles.sectionPtsBadgeText}>+{section.totalPts} pts</Text>
                        </View>
                      )}
                      <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Partidos de la jornada */}
                  {isOpen && section.data.map((match, idx) =>
                    renderMatchCard(match, idx === section.data.length - 1, true)
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Tarjeta off-screen para compartir partido ──────────────────────── */}
      {shareData && (
        <View
          ref={shareMatchCardRef}
          collapsable={false}
          style={styles.shareCard}
        >
          <View style={styles.scHeader}>
            <Text style={styles.scPoolName} numberOfLines={1}>{pool.name}</Text>
            <Text style={styles.scMatchResult}>
              {getTeamName(shareData.match.home)}
              {shareData.match.homeScore !== '' ? `  ${shareData.match.homeScore} – ${shareData.match.awayScore}  ` : '  ⏱️  '}
              {getTeamName(shareData.match.away)}
            </Text>
            <Text style={styles.scMatchDate}>{shareData.match.utcDate ? formatMatchTime(shareData.match.utcDate) : shareData.match.date}</Text>
          </View>
          <View style={styles.scBody}>
            {shareData.preds.map((p) => {
              const isMe = p.userId === user?.id;
              const hasPred = p.homeScore !== '' && p.awayScore !== '';
              const isLiveMatch = shareData.match.homeScore === '' && shareData.match.awayScore === '';
              const pts = (!isLiveMatch && hasPred)
                ? getMatchPoints(
                    { homeScore: p.homeScore, awayScore: p.awayScore },
                    { homeScore: shareData.match.homeScore, awayScore: shareData.match.awayScore },
                    pool.scoringConfig,
                    shareData.match.stage,
                  )
                : null;
              const badgeColor = pts !== null ? getBadgeColor(pts, maxPts) : (isLiveMatch ? '#FEF9C3' : '#CBD5E1');
              return (
                <View key={p.userId} style={styles.scRow}>
                  <Text style={[styles.scName, isMe && styles.scNameMe]} numberOfLines={1}>
                    {isMe ? `⭐ ${p.name}` : p.name}
                  </Text>
                  <Text style={styles.scPred}>{hasPred ? `${p.homeScore} – ${p.awayScore}` : '–'}</Text>
                  <View style={[styles.scBadge, { backgroundColor: badgeColor }]}>
                    <Text style={[styles.scBadgePts, isLiveMatch && styles.scBadgePtsLive]}>
                      {pts !== null ? `${pts} pts` : (isLiveMatch && hasPred ? '⏱️' : '–')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.scFooter}>
            <Text style={styles.scFooterText}>Prolla · prolla.app</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EBD8' },
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

  // ── Bloque de grupo (En curso / Finalizados) ────────────────────────────────
  groupBlock: { marginBottom: 16 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 4, paddingBottom: 8,
  },
  liveIndicator: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444',
  },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  groupCount: {
    fontSize: 12, fontWeight: '600', color: '#94A3B8',
    backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  groupHeaderDark: {
    backgroundColor: '#0F172A', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 8,
  },
  groupHeaderDarkText: { fontSize: 14, fontWeight: '700', color: 'white', flex: 1 },
  groupCountDark: { backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' },
  groupBody: {
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  // ── Sección de jornada (dentro de Finalizados) ──────────────────────────────
  sectionBlock: {
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E293B', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionHeaderOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: 'white' },
  sectionSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  sectionPtsBadge: {
    backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  sectionPtsBadgeText: { fontSize: 11, fontWeight: '700', color: '#149435' },

  // ── Tarjeta de partido ──────────────────────────────────────────────────────
  card: {
    backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  cardLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 14,
  },
  cardHeaderLeft: { flex: 1, marginRight: 10 },
  cardDate: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  cardTeams: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  knockoutBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  knockoutText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  expandChevron: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  // ── Participantes expandidos ────────────────────────────────────────────────
  participantsContainer: {
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA', padding: 12,
  },
  participantsContainerLast: {
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  participantsTitle: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10,
  },
  participantsLoading: { paddingVertical: 12, alignItems: 'center' },
  participantsEmpty: { paddingVertical: 8 },
  participantsEmptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  participantsList: { gap: 6 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  participantRowMe: {
    borderColor: '#BBF7D0', backgroundColor: '#F0FDF4',
  },
  participantName: {
    flex: 1, fontSize: 13, color: '#374151', fontWeight: '500',
  },
  participantNameMe: { color: '#149435', fontWeight: '700' },
  participantPred: {
    fontSize: 13, fontWeight: '600', color: '#0F172A',
    marginHorizontal: 12, minWidth: 48, textAlign: 'center',
  },
  participantBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 56, alignItems: 'center',
  },
  participantBadgePts: { color: 'white', fontWeight: '700', fontSize: 12 },
  participantBadgeEmpty: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 56, alignItems: 'center',
    backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#FDE68A',
  },
  participantBadgeEmptyText: { fontSize: 11, fontWeight: '600', color: '#92400E' },

  // ── Botón compartir partido ─────────────────────────────────────────────────
  shareMatchBtn: {
    marginTop: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 8, paddingVertical: 9,
    borderWidth: 1.5, borderColor: '#86EFAC',
  },
  shareMatchBtnDisabled: { opacity: 0.5 },
  shareMatchBtnText: { color: '#149435', fontWeight: '700', fontSize: 13 },

  // ── Tarjeta de compartir partido (off-screen) ───────────────────────────────
  shareCard: {
    position: 'absolute', left: -9999, top: 0,
    width: 340, backgroundColor: 'white',
    borderRadius: 16, overflow: 'hidden',
  },
  scHeader: {
    backgroundColor: '#149435', paddingHorizontal: 20, paddingVertical: 16,
  },
  scPoolName: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 6 },
  scMatchResult: { fontSize: 17, fontWeight: '800', color: 'white', marginBottom: 4 },
  scMatchDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  scBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  scRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F4EBD8',
  },
  scName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#374151' },
  scNameMe: { color: '#149435', fontWeight: '700' },
  scPred: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginHorizontal: 12, minWidth: 44, textAlign: 'center' },
  scBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 52, alignItems: 'center' },
  scBadgePts: { color: 'white', fontWeight: '700', fontSize: 12 },
  scBadgePtsLive: { color: '#92400E' },
  scFooter: { backgroundColor: '#F4EBD8', paddingVertical: 10, alignItems: 'center' },
  scFooterText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // ── Acordeón: Predicción final del torneo ─────────────────────────────────
  championBlock: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 12, backgroundColor: '#FAF7F2',
    borderWidth: 1, borderColor: '#DADADA',
    overflow: 'hidden',
  },
  championHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#DADADA', paddingHorizontal: 14, paddingVertical: 12,
  },
  championHeaderText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  chevron: { fontSize: 12, color: '#374151' },
  championBody: { paddingHorizontal: 12, paddingVertical: 8 },
  championEmpty: { textAlign: 'center', color: '#64748B', paddingVertical: 12, fontSize: 13 },
  championCard: {
    marginVertical: 6, padding: 10, borderRadius: 10,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB',
  },
  championCardMe: { borderColor: '#149435', borderWidth: 1.5 },
  championName: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  championNameMe: { color: '#149435' },
  championPickRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  championPickEmoji: { fontSize: 16, width: 24 },
  championPickLabel: { fontSize: 12, color: '#64748B', width: 82 },
  championPickTeam: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  championPickHit: { color: '#149435' },
  championPickMiss: { color: '#B91C1C' },
  championResultIcon: { fontSize: 14, marginLeft: 6 },
});
