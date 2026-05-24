import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getResultType, getPoints } from '../../../utils/scoring';

interface Participant {
  id: string;
  name: string;
  points: number;
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
        // Cargar participantes con su nombre de perfil
        const { data: participants, error: pError } = await supabase
          .from('pool_participants')
          .select('user_id, profiles(name)')
          .eq('pool_id', pool.id);

        if (pError || !participants) return;

        // Cargar todas las predicciones de la polla
        const { data: allPreds, error: predError } = await supabase
          .from('predictions')
          .select('user_id, match_id, home_score, away_score')
          .eq('pool_id', pool.id);

        if (predError) return;

        // Cargar marcadores frescos de Supabase (pueden haber sido actualizados por sync-results)
        const { data: freshMatches } = await supabase
          .from('matches')
          .select('id, home_score, away_score')
          .eq('pool_id', pool.id);

        const matchScores = (freshMatches ?? []).reduce((acc: Record<string, { homeScore: string; awayScore: string }>, m: any) => {
          acc[m.id] = { homeScore: m.home_score ?? '', awayScore: m.away_score ?? '' };
          return acc;
        }, {});

        // Calcular puntos por participante
        const calculated: Participant[] = participants.map((p: any) => {
          const userPreds = (allPreds ?? []).filter((pr) => pr.user_id === p.user_id);

          const points = (pool.matches ?? []).reduce((total: number, match: any) => {
            const scores = matchScores[match.id] ?? { homeScore: '', awayScore: '' };
            if (scores.homeScore === '' || scores.awayScore === '') return total;

            const pred = userPreds.find((pr) => pr.match_id === match.id);
            if (!pred) return total;

            const type = getResultType(
              { homeScore: pred.home_score, awayScore: pred.away_score },
              scores,
            );
            return total + getPoints(type, pool.scoringConfig);
          }, 0);

          return {
            id: p.user_id,
            name: p.profiles?.name ?? 'Usuario',
            points,
          };
        });

        setRanking(calculated.sort((a, b) => b.points - a.points));
      } catch (e) {
        console.log('Error cargando clasificación:', e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar la clasificación.{'\n'}Verifica tu conexión e intenta de nuevo.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      <View style={styles.tableHeader}>
        <Text style={styles.colHash}>#</Text>
        <Text style={styles.colName}>Participante</Text>
        <Text style={styles.colPts}>Puntos</Text>
      </View>

      {ranking.map((participant, index) => {
        const isMe = participant.id === user?.id;
        const badgeColor = PODIUM_COLORS[index] ?? '#E2E8F0';

        return (
          <View key={participant.id} style={[styles.row, isMe && styles.rowMe]}>
            <View style={[styles.posBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.posText}>{index + 1}</Text>
            </View>

            <Text style={[styles.nameText, isMe && styles.nameMe]} numberOfLines={1}>
              {participant.name}
            </Text>

            <Text style={[styles.ptsText, isMe && styles.ptsMe]}>
              {participant.points}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 24 },
  errorText: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 22 },
  list: { padding: 16 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
  },
  colHash: { width: 42, fontWeight: '700', color: '#64748B', fontSize: 13 },
  colName: { flex: 1, fontWeight: '700', color: '#64748B', fontSize: 13 },
  colPts: { fontWeight: '700', color: '#64748B', fontSize: 13, width: 60, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowMe: { borderWidth: 2, borderColor: '#2563EB' },
  posBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  posText: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  nameText: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '500' },
  nameMe: { color: '#2563EB', fontWeight: '700' },
  ptsText: { fontSize: 15, fontWeight: '700', color: '#0F172A', width: 50, textAlign: 'right' },
  ptsMe: { color: '#2563EB' },
});
