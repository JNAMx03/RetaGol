import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useApp, Match } from '../../../context/AppContext';
import { supabase } from '../../../services/supabase';
import { getTeamName } from '../../../utils/teamNames';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function getDateKey(match: Match): string {
  if (match.utcDate) {
    // Convertir a fecha LOCAL del dispositivo para agrupar correctamente.
    // Un partido a las 9PM Colombia (UTC-5) es UTC+1 día → sin esta conversión
    // quedaría en la sección del día siguiente.
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
    const d = new Date(year, month - 1, day); // fecha local (evita desfase UTC)
    const str = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    // Solo capitalizar la primera letra; el resto en minúscula natural ("viernes, 12 de junio")
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch { return key; }
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
      <Text style={styles.matchDate}>{match.date}</Text>
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
  key: string;    // YYYY-MM-DD
  title: string;  // "sábado, 11 de junio"
  data: Match[];
}

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

  // IDs de partidos bloqueados: ya tienen resultado O ya empezaron (utcDate <= ahora)
  // Usa freshResults para no depender del estado stale de pool.matches
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

  // Solo partidos con resultado real (para el banner informativo)
  const finishedCount = useMemo(
    () => Object.values(freshResults).filter((r) => r.homeScore !== '' && r.awayScore !== '').length,
    [freshResults],
  );

  // Partidos iniciados pero sin resultado aún (en curso)
  const inProgressCount = lockedIds.size - finishedCount;

  // Cargar estado fresco de partidos + predicciones del usuario desde Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Resultados y fechas frescos (para saber si el partido ya inició)
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

        // Predicciones guardadas del usuario
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

  const handleChange = (id: string, field: string, value: string) => {
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const filledMatches = matches.filter(
        (m) => !lockedIds.has(m.id) && (m.homeScore !== '' || m.awayScore !== ''),
      );
      await savePredictionsByPool(pool.id, filledMatches);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (e) {
      console.log('Error guardando predicciones:', e);
    } finally {
      setSaving(false);
    }
  };

  // Solo partidos no bloqueados (sin resultado Y que aún no han empezado)
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

  if (loadingPreds) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#149435" /></View>;
  }

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

              {/* ── Cabecera de jornada ──────────────────────────── */}
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

              {/* ── Partidos del día ─────────────────────────────── */}
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

        {/* Banner de partidos bloqueados */}
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

      {/* ── Botón guardar ────────────────────────────────────────── */}
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

  // ── Bloque de sección (card agrupadora con sombra) ──────────────────────────
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
  sectionHeaderOpen: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#374151',
  },
  sectionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chevron: { fontSize: 12, color: '#64748B' },

  // Badge de progreso X/Y
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

  // ── Tarjeta de partido (embebida, sin sombra propia) ────────────────────────
  matchCard: {
    backgroundColor: 'white',
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: '#F4EBD8',
  },
  matchCardLast: {
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
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

  // Banner de partidos finalizados
  finishedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF7F2', borderRadius: 10, padding: 12,
    gap: 8, borderWidth: 1, borderColor: '#DADADA', marginTop: 2,
  },
  finishedText: { fontSize: 13, color: '#64748B', flex: 1 },

  // Footer con botón guardar
  footer: {
    padding: 16, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#DADADA',
  },
  savedMsg: { textAlign: 'center', color: '#149435', fontWeight: '600', fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: '#149435', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
