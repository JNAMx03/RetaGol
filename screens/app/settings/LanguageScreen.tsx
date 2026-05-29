import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸', available: true },
  { code: 'en', label: 'English', flag: '🇺🇸', available: false },
  { code: 'pt', label: 'Português', flag: '🇧🇷', available: false },
];

export default function LanguageScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Idioma</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Seleccionar idioma</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang, i) => (
            <View
              key={lang.code}
              style={[styles.row, i < LANGUAGES.length - 1 && styles.rowBorder]}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, !lang.available && styles.langDisabled]}>
                {lang.label}
              </Text>
              <View style={styles.rowRight}>
                {lang.available ? (
                  <View style={styles.selected}>
                    <Text style={styles.selectedText}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.comingSoon}>
                    <Text style={styles.comingSoonText}>Próximamente</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          Más idiomas estarán disponibles en versiones futuras de Prolla.
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
  backArrow: { width: 11, height: 11, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#149435', transform: [{ rotate: '45deg' }], marginLeft: 8 },
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
    paddingVertical: 15,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBD8' },
  flag: { fontSize: 24 },
  langLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0F172A' },
  langDisabled: { color: '#94A3B8' },
  rowRight: { alignItems: 'flex-end' },
  selected: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#149435',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  comingSoon: {
    backgroundColor: '#F4EBD8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  comingSoonText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
