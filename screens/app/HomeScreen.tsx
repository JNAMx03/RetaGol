import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, Pool } from '../../context/AppContext';
import PoolCard from '../../components/PoolCard';

const MENU_WIDTH = Math.min(Dimensions.get('window').width * 0.82, 340);

const FUTURE_FEATURES = [
  { icon: '🧭', label: 'Explorar pollas', badge: 'V1.5' },
  { icon: '🛍️', label: 'Tienda de comodines', badge: 'V2.0' },
  { icon: '🏆', label: 'Ranking global', badge: 'V2.5' },
];

const SETTINGS_CUENTA = [
  { icon: '👤', label: 'Editar perfil' },
  { icon: '🔔', label: 'Notificaciones' },
  { icon: '🔒', label: 'Privacidad y seguridad' },
];

const SETTINGS_APP = [
  { icon: '🌐', label: 'Idioma' },
  { icon: '❓', label: 'Ayuda y soporte' },
  { icon: 'ℹ️', label: 'Acerca de la app' },
];

export default function HomeScreen({ navigation }: any) {
  const { pools, user, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function openMenu() {
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeMenu() {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -MENU_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setMenuOpen(false));
  }

  function handleLogout() {
    closeMenu();
    // Pequeño delay para que la animación cierre antes de navegar
    setTimeout(() => logout(), 240);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openMenu} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pollas</Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* ── Lista de pollas ──────────────────────────── */}
      <FlatList
        data={pools}
        keyExtractor={(item: Pool) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: Pool }) => (
          <PoolCard
            pool={item}
            onPress={() => navigation.navigate('PoolDetail', { pool: item })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚽</Text>
            <Text style={styles.emptyTitle}>No tienes pollas aún</Text>
            <Text style={styles.emptySubtitle}>
              Crea o únete a una polla para comenzar a competir con tus amigos.
            </Text>
          </View>
        }
      />

      {/* ── Botones inferiores ───────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnCreate}
          onPress={() => navigation.navigate('CreatePool')}
        >
          <Text style={styles.btnCreateText}>+ Crear Polla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnJoin}
          onPress={() => navigation.navigate('JoinPool')}
        >
          <Text style={styles.btnJoinText}>Unirse</Text>
        </TouchableOpacity>
      </View>

      {/* ── Overlay ──────────────────────────────────── */}
      {menuOpen && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
      )}

      {/* ── Panel lateral (siempre montado, fuera de pantalla hasta que abre) ── */}
      <Animated.View style={[styles.menuPanel, { transform: [{ translateX }] }]}>
        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar y datos del usuario */}
          <View style={styles.menuUserCard}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{initials}</Text>
            </View>
            <Text style={styles.menuUserName}>{user?.name ?? ''}</Text>
            <Text style={styles.menuUserEmail}>
              {user?.email || 'sin correo configurado'}
            </Text>
          </View>

          {/* Estadísticas rápidas */}
          <View style={styles.menuStatsRow}>
            <View style={styles.menuStat}>
              <Text style={styles.menuStatValue}>{pools.length}</Text>
              <Text style={styles.menuStatLabel}>Pollas</Text>
            </View>
            <View style={styles.menuStatDivider} />
            <View style={styles.menuStat}>
              <Text style={styles.menuStatValue}>—</Text>
              <Text style={styles.menuStatLabel}>Puntos</Text>
            </View>
            <View style={styles.menuStatDivider} />
            <View style={styles.menuStat}>
              <Text style={styles.menuStatValue}>—</Text>
              <Text style={styles.menuStatLabel}>Victorias</Text>
            </View>
          </View>

          {/* Funcionalidades futuras */}
          <View style={styles.menuBlock}>
            {FUTURE_FEATURES.map((f, i) => (
              <View
                key={f.label}
                style={[styles.menuFutureRow, i < FUTURE_FEATURES.length - 1 && styles.menuRowBorder]}
              >
                <Text style={styles.menuFutureIcon}>{f.icon}</Text>
                <Text style={styles.menuFutureLabel}>{f.label}</Text>
                <View style={styles.menuFutureBadge}>
                  <Text style={styles.menuFutureBadgeText}>{f.badge}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Sección Cuenta */}
          <Text style={styles.menuSectionTitle}>Cuenta</Text>
          <View style={styles.menuBlock}>
            {SETTINGS_CUENTA.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuSettingRow,
                  i < SETTINGS_CUENTA.length - 1 && styles.menuRowBorder,
                ]}
                activeOpacity={0.6}
              >
                <View style={styles.menuSettingLeft}>
                  <View style={styles.menuSettingIconBox}>
                    <Text style={styles.menuSettingEmoji}>{item.icon}</Text>
                  </View>
                  <Text style={styles.menuSettingLabel}>{item.label}</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sección App */}
          <Text style={styles.menuSectionTitle}>App</Text>
          <View style={styles.menuBlock}>
            {SETTINGS_APP.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuSettingRow,
                  i < SETTINGS_APP.length - 1 && styles.menuRowBorder,
                ]}
                activeOpacity={0.6}
              >
                <View style={styles.menuSettingLeft}>
                  <View style={styles.menuSettingIconBox}>
                    <Text style={styles.menuSettingEmoji}>{item.icon}</Text>
                  </View>
                  <Text style={styles.menuSettingLabel}>{item.label}</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cerrar sesión */}
          <TouchableOpacity
            style={styles.menuLogout}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLogoutIcon}>🚪</Text>
            <Text style={styles.menuLogoutText}>Cerrar sesión</Text>
          </TouchableOpacity>

          <Text style={styles.menuVersion}>Versión 1.0.0</Text>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },

  // ── Header ───────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: { fontSize: 22, color: '#374151' },
  bellIcon: { fontSize: 20 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },

  // ── Lista ────────────────────────────────────────────
  list: { padding: 16, flexGrow: 1 },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Footer ───────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btnCreate: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCreateText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  btnJoin: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnJoinText: { color: '#2563EB', fontWeight: 'bold', fontSize: 15 },

  // ── Overlay ──────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },

  // ── Panel lateral ────────────────────────────────────
  menuPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: MENU_WIDTH,
    backgroundColor: '#F8FAFC',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  menuScroll: { flex: 1 },
  menuScrollContent: { paddingBottom: 24 },

  // ── Menú: avatar y datos ─────────────────────────────
  menuUserCard: {
    backgroundColor: '#2563EB',
    padding: 24,
    paddingTop: 36,
    alignItems: 'flex-start',
  },
  menuAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuAvatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  menuUserName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  menuUserEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },

  // ── Menú: stats ──────────────────────────────────────
  menuStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuStat: { flex: 1, alignItems: 'center' },
  menuStatValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 },
  menuStatLabel: { fontSize: 11, color: '#64748B' },
  menuStatDivider: { width: 1, backgroundColor: '#E2E8F0' },

  // ── Menú: bloques ────────────────────────────────────
  menuBlock: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Menú: features futuras ───────────────────────────
  menuFutureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuFutureIcon: { fontSize: 18, width: 28 },
  menuFutureLabel: { flex: 1, fontSize: 14, color: '#374151' },
  menuFutureBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  menuFutureBadgeText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  // ── Menú: ajustes ────────────────────────────────────
  menuSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuSettingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuSettingIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuSettingEmoji: { fontSize: 15 },
  menuSettingLabel: { fontSize: 14, color: '#0F172A' },
  menuChevron: { fontSize: 18, color: '#CBD5E1', fontWeight: '300' },

  // ── Menú: logout ─────────────────────────────────────
  menuLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  menuLogoutIcon: { fontSize: 18 },
  menuLogoutText: { color: '#DC2626', fontWeight: '600', fontSize: 15 },
  menuVersion: {
    textAlign: 'center',
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 10,
  },
});
