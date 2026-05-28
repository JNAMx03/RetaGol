import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getMatchPoints } from '../../../utils/scoring';

interface Participant {
  id: string;
  name: string;
  points: number;
  bonusPoints: number;
}

const PODIUM_COLORS = ['#FACC15', '#94A3B8', '#B45309'];

export default function StandingsScreen({ route }: any) {
  const { pool } = route.params;
  const { user } = useApp();
  const [ranking, setRanking] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        // Cargar participantes
        const { data: participants, error: pError } = await supabase
          .from('pool_participants')
          .select('user_id, profiles(name)')
          .eq('pool_id', pool.id);
        if (pError || !participants) return;

        // Cargar todas las predicciones
        const { data: allPreds, error: predError } = await supabase
          .from('predictions')
          .select('user_id, match_id, home_score, away_score')
          .eq('pool_id', pool.id);
        if (predError) return;

        // Cargar marcadores frescos con stage
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

        // Detectar partidos donde solo UNA persona acertó el marcador exacto
        const bonusMatchUserMap: Record<string, string> = {};

        if (pool.scoringConfig.bonusUnico) {
          const finishedMatchIds = Object.keys(matchMap).filter(
            (id) => matchMap[id].homeScore !== '' && matchMap[id].awayScore !== '',
          );

          for (const matchId of finishedMatchIds) {
            const result = matchMap[matchId];
            const exactPredictors = (allPreds ?? []).filter((pr) => {
              return (
                pr.match_id === matchId &&
                String(pr.home_score) === result.homeScore &&
                String(pr.away_score) === result.awayScore
              );
            });

            if (exactPredictors.length === 1) {
              // Solo un participante acertó exacto → ese recibe el bonus
              bonusMatchUserMap[matchId] = exactPredictors[0].user_id;
            }
          }
        }

        // Calcular puntos por participante
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

            // Bonus único
            if (bonusMatchUserMap[matchId] === p.user_id) {
              bonusPoints += 1;
            }
          }

          return {
            id: p.user_id,
            name: p.profiles?.name ?? 'Usuario',
            points,
            bonusPoints,
          };
        });

        setRanking(
          calculated
            .sort((a, b) => (b.points + b.bonusPoints) - (a.points + a.bonusPoints)),
        );
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#149435" /></View>;
  if (loadError) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>No se pudo cargar la clasificación.{'\n'}Verifica tu conexión e intenta de nuevo.</Text>
    </View>
  );

  return (
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EBD8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4EBD8', padding: 24 },
  errorText: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 22 },
  list: { padding: 16 },
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
});
