import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getMatchPoints } from '../../../utils/scoring';
import { captureRef } from 'react-native-view-shot';
import { shareAsync, isAvailableAsync } from 'expo-sharing';

interface Participant {
  id: string;
  name: string;
  points: number;
  bonusPoints: number;
}

const PODIUM_COLORS = ['#FACC15', '#94A3B8', '#B45309'];
const PODIUM_EMOJIS = ['🥇', '🥈', '🥉'];

export default function StandingsScreen({ route }: any) {
  const { pool } = route.params;
  const { user } = useApp();
  const navigation = useNavigation<any>();
  const [ranking, setRanking] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const { data: participants, error: pError } = await supabase
          .from('pool_participants')
          .select('user_id, profiles(name)')
          .eq('pool_id', pool.id);
        if (pError || !participants) return;

        const { data: allPreds, error: predError } = await supabase
          .from('predictions')
          .select('user_id, match_id, home_score, away_score')
          .eq('pool_id', pool.id);
        if (predError) return;

        const { data: freshMatches } = await supabase
          .from('matches')
          .select('id, home_score, away_score, stage')
          .eq('pool_id', pool.id);

        const matchMap: Record<string, { homeScore: string; awayScore: string; stage: string }> = {};
        (freshMatches ?? []).forEach((m: any) => {
          matchMap[m.id] = {
            homeScore: m.home_score ?? '',
            awayScore: m.away_score ?? '',
            stage: m.stage ?? 'GROUP_STAGE',
          };
        });

        const bonusMatchUserMap: Record<string, string> = {};
        if (pool.scoringConfig.bonusUnico) {
          const finishedMatchIds = Object.keys(matchMap).filter(
            (id) => matchMap[id].homeScore !== '' && matchMap[id].awayScore !== '',
          );
          for (const matchId of finishedMatchIds) {
            const result = matchMap[matchId];
            const exactPredictors = (allPreds ?? []).filter((pr) =>
              pr.match_id === matchId &&
              String(pr.home_score) === result.homeScore &&
              String(pr.away_score) === result.awayScore,
            );
            if (exactPredictors.length === 1) {
              bonusMatchUserMap[matchId] = exactPredictors[0].user_id;
            }
          }
        }

        const calculated: Participant[] = participants.map((p: any) => {
          const userPreds = (allPreds ?? []).filter((pr) => pr.user_id === p.user_id);
          let points = 0;
          let bonusPoints = 0;

          for (const matchId of Object.keys(matchMap)) {
            const scores = matchMap[matchId];
            if (scores.homeScore === '' || scores.awayScore === '') continue;
            const pred = userPreds.find((pr) => pr.match_id === matchId);
            if (!pred) continue;
            points += getMatchPoints(
              { homeScore: String(pred.home_score), awayScore: String(pred.away_score) },
              scores,
              pool.scoringConfig,
              scores.stage,
            );
            if (bonusMatchUserMap[matchId] === p.user_id) bonusPoints += 1;
          }

          return { id: p.user_id, name: p.profiles?.name ?? 'Usuario', points, bonusPoints };
        });

        setRanking(calculated.sort((a, b) => (b.points + b.bonusPoints) - (a.points + a.bonusPoints)));
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, []);

  const handleShare = async () => {
    if (sharing || !shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 0.95 });
      if (await isAvailableAsync()) {
        await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir clasificación' });
      }
    } catch (e) {
      console.log('Error compartiendo:', e);
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleShare} disabled={sharing} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 20, opacity: sharing ? 0.4 : 1 }}>📤</Text>
        </TouchableOpacity>
      ),
    });
  }, [sharing]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#149435" /></View>;
  if (loadError) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>No se pudo cargar la clasificación.{'\n'}Verifica tu conexión e intenta de nuevo.</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <View style={styles.tableHeader}>
          <Text style={styles.colHash}>#</Text>
          <Text style={styles.colName}>Participante</Text>
          <Text style={styles.colPts}>Puntos</Text>
        </View>

        {ranking.map((p, index) => {
          const isMe = p.id === user?.id;
          const badgeColor = PODIUM_COLORS[index] ?? '#DADADA';
          const total = p.points + p.bonusPoints;

          return (
            <View key={p.id} style={[styles.row, isMe && styles.rowMe]}>
              <View style={[styles.posBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.posText}>{index + 1}</Text>
              </View>
              <View style={styles.nameWrap}>
                <Text style={[styles.nameText, isMe && styles.nameMe]} numberOfLines={1}>
                  {p.name}
                </Text>
                {p.bonusPoints > 0 && (
                  <Text style={styles.bonusText}>+{p.bonusPoints} bonus 🎁</Text>
                )}
              </View>
              <Text style={[styles.ptsText, isMe && styles.ptsMe]}>{total}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Tarjeta de compartir (renderizada fuera de pantalla para captura) */}
      <View
        ref={shareCardRef}
        collapsable={false}
        style={styles.shareCard}
      >
        {/* Header verde */}
        <View style={styles.scHeader}>
          <Text style={styles.scPoolName} numberOfLines={1}>{pool.name}</Text>
          <Text style={styles.scSubtitle}>Clasificación</Text>
        </View>

        {/* Filas de participantes */}
        <View style={styles.scBody}>
          {ranking.map((p, index) => {
            const total = p.points + p.bonusPoints;
            const emoji = PODIUM_EMOJIS[index];
            return (
              <View key={p.id} style={[styles.scRow, index === 0 && styles.scRowFirst]}>
                <Text style={styles.scPos}>
                  {emoji ?? `${index + 1}.`}
                </Text>
                <Text style={styles.scName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.scPts}>{total} pts</Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.scFooter}>
          <Text style={styles.scFooterText}>Prolla · prolla.app</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EBD8' },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4EBD8', padding: 24 },
  errorText: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 22 },
  list: { padding: 16 },

  // Tabla
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 6,
  },
  colHash: { width: 42, fontWeight: '700', color: '#64748B', fontSize: 13 },
  colName: { flex: 1, fontWeight: '700', color: '#64748B', fontSize: 13 },
  colPts: { fontWeight: '700', color: '#64748B', fontSize: 13, width: 60, textAlign: 'right' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    padding: 14, borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  rowMe: { borderWidth: 2, borderColor: '#149435' },
  posBadge: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  posText: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  nameWrap: { flex: 1 },
  nameText: { fontSize: 15, color: '#0F172A', fontWeight: '500' },
  nameMe: { color: '#149435', fontWeight: '700' },
  bonusText: { fontSize: 11, color: '#D97706', marginTop: 1 },
  ptsText: { fontSize: 15, fontWeight: '700', color: '#0F172A', width: 50, textAlign: 'right' },
  ptsMe: { color: '#149435' },

  // ── Tarjeta de compartir (off-screen) ─────────────────────────────────────────
  shareCard: {
    position: 'absolute', left: -9999, top: 0,
    width: 340, backgroundColor: 'white',
    borderRadius: 16, overflow: 'hidden',
  },
  scHeader: {
    backgroundColor: '#149435', paddingHorizontal: 20, paddingVertical: 16,
  },
  scPoolName: { fontSize: 17, fontWeight: '800', color: 'white', marginBottom: 2 },
  scSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  scBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  scRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4EBD8',
  },
  scRowFirst: { paddingTop: 4 },
  scPos: { fontSize: 20, width: 36 },
  scName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  scPts: { fontSize: 14, fontWeight: '800', color: '#149435', minWidth: 52, textAlign: 'right' },
  scFooter: {
    backgroundColor: '#F4EBD8', paddingVertical: 10, alignItems: 'center',
  },
  scFooterText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
});
