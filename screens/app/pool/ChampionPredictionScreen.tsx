import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getTeamName } from '../../../utils/teamNames';

interface ChampionPick {
  champion: string;
  runnerUp: string;
  thirdPlace: string;
}

export default function ChampionPredictionScreen({ route, navigation }: any) {
  const { pool } = route.params;
  const { user } = useApp();
  const ch = pool.championConfig;

  const [pick, setPick] = useState<ChampionPick>({ champion: '', runnerUp: '', thirdPlace: '' });
  const [saving, setSaving] = useState(false);

  // Extraer equipos únicos de los partidos de la polla
  const teams = useMemo<string[]>(() => {
    const set = new Set<string>();
    (pool.matches ?? []).forEach((m: any) => {
      if (m.home) set.add(m.home);
      if (m.away) set.add(m.away);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [pool.matches]);

  const handleSave = async () => {
    if (!pick.champion || !pick.runnerUp || !pick.thirdPlace) {
      Alert.alert('Faltan selecciones', 'Debes seleccionar un equipo para cada posición antes de continuar.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pool_champion_predictions')
        .upsert(
          {
            pool_id: pool.id,
            user_id: user!.id,
            champion: pick.champion,
            runner_up: pick.runnerUp,
            third_place: pick.thirdPlace,
          },
          { onConflict: 'pool_id,user_id' },
        );

      if (error) throw error;
      navigation.replace('PoolDetail', { pool });
    } catch {
      Alert.alert('Error', 'No se pudo guardar tu predicción. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.replace('PoolDetail', { pool });
  };

  // Equipos ya elegidos en otras posiciones (para deshabilitar duplicados)
  const takenByOther = (pos: keyof ChampionPick, team: string): boolean => {
    const all = [pick.champion, pick.runnerUp, pick.thirdPlace];
    const posIndex = pos === 'champion' ? 0 : pos === 'runnerUp' ? 1 : 2;
    return all.some((v, i) => i !== posIndex && v === team);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Predicción Final</Text>
        <Text style={styles.headerSub}>{pool.name}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── Intro ──────────────────────────────────────────────────────── */}
        <View style={styles.introBox}>
          <Text style={styles.introIcon}>🏆</Text>
          <Text style={styles.introText}>
            ¿Cómo crees que terminará el torneo? Elige los tres mejores equipos
            antes de ver la polla. ¡Solo puedes hacerlo una vez!
          </Text>
        </View>

        {/* ── Posiciones ─────────────────────────────────────────────────── */}
        {(
          [
            { pos: 'champion' as const, icon: '🥇', label: 'Campeón', pts: ch.champion },
            { pos: 'runnerUp' as const, icon: '🥈', label: 'Subcampeón', pts: ch.runnerUp },
            { pos: 'thirdPlace' as const, icon: '🥉', label: 'Tercer lugar', pts: ch.thirdPlace },
          ]
        ).map(({ pos, icon, label, pts }) => (
          <View key={pos} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{icon}</Text>
              <View>
                <Text style={styles.sectionLabel}>{label}</Text>
                <Text style={styles.sectionPts}>+{pts} puntos si aciertas</Text>
              </View>
              {pick[pos] !== '' && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText} numberOfLines={1}>
                    {getTeamName(pick[pos])}
                  </Text>
                </View>
              )}
            </View>

            {/* Grilla de equipos */}
            <View style={styles.teamGrid}>
              {teams.map((team) => {
                const isSelected = pick[pos] === team;
                const isTaken = takenByOther(pos, team);
                return (
                  <TouchableOpacity
                    key={team}
                    style={[
                      styles.teamBtn,
                      isSelected && styles.teamBtnSelected,
                      isTaken && styles.teamBtnTaken,
                    ]}
                    onPress={() => !isTaken && setPick((p) => ({ ...p, [pos]: team }))}
                    activeOpacity={isTaken ? 1 : 0.7}
                  >
                    <Text
                      style={[
                        styles.teamBtnText,
                        isSelected && styles.teamBtnTextSelected,
                        isTaken && styles.teamBtnTextTaken,
                      ]}
                      numberOfLines={1}
                    >
                      {getTeamName(team)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Botones ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.btnSave, saving && styles.btnSaveDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnSaveText}>Guardar predicción →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSkip} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.btnSkipText}>Saltar por ahora</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 18 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  introBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 16,
    gap: 10,
  },
  introIcon: { fontSize: 22, marginTop: 1 },
  introText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 20 },

  section: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10,
  },
  sectionIcon: { fontSize: 26 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  sectionPts: { fontSize: 12, color: '#64748B', marginTop: 1 },
  selectedBadge: {
    marginLeft: 'auto', backgroundColor: '#DBEAFE', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, maxWidth: 120,
  },
  selectedBadgeText: { fontSize: 12, color: '#1D4ED8', fontWeight: '700' },

  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  teamBtnSelected: {
    backgroundColor: '#2563EB', borderColor: '#2563EB',
  },
  teamBtnTaken: {
    borderColor: '#F1F5F9', backgroundColor: '#F8FAFC', opacity: 0.4,
  },
  teamBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  teamBtnTextSelected: { color: 'white', fontWeight: '700' },
  teamBtnTextTaken: { color: '#94A3B8' },

  btnSave: {
    backgroundColor: '#2563EB', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnSaveDisabled: { opacity: 0.6 },
  btnSaveText: { color: 'white', fontSize: 16, fontWeight: '700' },
  btnSkip: { alignItems: 'center', marginTop: 14 },
  btnSkipText: { color: '#64748B', fontSize: 14, textDecorationLine: 'underline' },
});
