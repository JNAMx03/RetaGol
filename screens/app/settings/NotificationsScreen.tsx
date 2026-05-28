import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_KEY = 'retagol_notif_prefs';

interface NotifPrefs {
  matchReminders: boolean;
  resultsSync: boolean;
  newParticipant: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  matchReminders: true,
  resultsSync: true,
  newParticipant: true,
};

const ITEMS: { key: keyof NotifPrefs; icon: string; title: string; desc: string }[] = [
  {
    key: 'matchReminders',
    icon: '⏰',
    title: 'Recordatorios de partidos',
    desc: 'Te avisamos 1 hora antes de que empiece un partido.',
  },
  {
    key: 'resultsSync',
    icon: '📊',
    title: 'Resultados disponibles',
    desc: 'Notificación cuando se actualicen los marcadores de tu polla.',
  },
  {
    key: 'newParticipant',
    icon: '👥',
    title: 'Nuevo participante',
    desc: 'Te avisamos cuando alguien se une a una polla que creaste.',
  },
];

export default function NotificationsScreen({ navigation }: any) {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((val) => {
      if (val) setPrefs(JSON.parse(val));
    });
  }, []);

  const toggle = async (key: keyof NotifPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Push notifications</Text>
        <View style={styles.card}>
          {ITEMS.map((item, i) => (
            <View
              key={item.key}
              style={[styles.row, i < ITEMS.length - 1 && styles.rowBorder]}
            >
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#DADADA', true: '#A7F3D0' }}
                thumbColor={prefs[item.key] ? '#149435' : '#94A3B8'}
              />
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          Para recibir notificaciones push, asegúrate de tener los permisos activados en la configuración del sistema.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4EBD8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#149435' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBD8' },
  rowIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  rowDesc: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
