import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

const APP_VERSION = '1.0.0';

const LINKS = [
  { icon: '📜', label: 'Términos y condiciones', url: 'https://prolla.app/terms' },
  { icon: '🔒', label: 'Política de privacidad', url: 'https://prolla.app/privacy' },
];

export default function AboutScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Acerca de la app</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo y nombre */}
        <View style={styles.heroBlock}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Prolla</Text>
          <Text style={styles.appTagline}>Predice y compite con tus amigos</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Versión {APP_VERSION}</Text>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.card}>
          <Text style={styles.descText}>
            Prolla es una app de quinielas deportivas donde puedes crear pollas con tus amigos, hacer predicciones de partidos de torneos reales y competir en rankings de puntos.
          </Text>
        </View>

        {/* Legal */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          {LINKS.map((link, i) => (
            <TouchableOpacity
              key={link.label}
              style={[styles.linkRow, i < LINKS.length - 1 && styles.rowBorder]}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.7}
            >
              <Text style={styles.linkIcon}>{link.icon}</Text>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Créditos */}
        <Text style={styles.credits}>
          Hecho con ⚽ y ❤️{'\n'}
          Datos de partidos por football-data.org
        </Text>
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  heroBlock: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  logo: { width: 90, height: 90, marginBottom: 10 },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  appTagline: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  versionBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  versionText: { fontSize: 13, color: '#149435', fontWeight: '600' },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    padding: 16,
  },
  descText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBD8' },
  linkIcon: { fontSize: 18, width: 28 },
  linkLabel: { flex: 1, fontSize: 14, color: '#0F172A' },
  chevron: { fontSize: 22, color: '#CBD5E1' },
  credits: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 22,
    marginTop: 8,
  },
});
