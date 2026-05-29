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
import { useRef, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, Pool } from '../../context/AppContext';
import { supabase } from '../../services/supabase';
import PoolCard from '../../components/PoolCard';
import AdBanner from '../../components/AdBanner';
import { getTeamName } from '../../utils/teamNames';

const MENU_WIDTH = Math.min(Dimensions.get('window').width * 0.82, 340);
const NOTIF_WIDTH = Math.min(Dimensions.get('window').width * 0.88, 360);
const READ_KEY = 'prolla_read_notifs';
const DISMISSED_KEY = 'prolla_dismissed_notifs';

interface NotifItem {
  id: string;
  type: 'result' | 'join';
  emoji: string;
  title: string;
  body: string;
  poolName: string;
  read: boolean;
}

const SETTINGS_CUENTA = [
  { icon: '👤', label: 'Editar perfil', screen: 'EditProfile' },
  { icon: '🔔', label: 'Notificaciones', screen: 'Notifications' },
  { icon: '🔒', label: 'Privacidad y seguridad', screen: 'Security' },
];

const SETTINGS_APP = [
  { icon: '🌐', label: 'Idioma', screen: 'Language' },
  { icon: '❓', label: 'Ayuda y soporte', screen: 'Help' },
  { icon: 'ℹ️', label: 'Acerca de la app', screen: 'About' },
];

export default function HomeScreen({ navigation }: any) {
  const { pools, user, logout, refreshPools, userStats } = useApp();

  // ── Estado menú izquierdo ─────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ── Estado panel de notificaciones (derecha) ──────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const notifTranslateX = useRef(new Animated.Value(NOTIF_WIDTH)).current;
  const notifOverlayOpacity = useRef(new Animated.Value(0)).current;
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Recargar pollas cada vez que Home recibe foco (ej. al volver de CreatePool, JoinPool, etc.)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshPools();
    });
    return unsubscribe;
  }, [navigation]);

  // Generar notificaciones a partir de resultados disponibles en las pollas
  const loadNotifications = useCallback(async () => {
    const readRaw = await AsyncStorage.getItem(READ_KEY);
    const readIds: string[] = readRaw ? JSON.parse(readRaw) : [];

    const dismissedRaw = await AsyncStorage.getItem(DISMISSED_KEY);
    const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];

    const items: NotifItem[] = [];
    for (const pool of pools) {
      for (const match of pool.matches) {
        if (match.homeScore !== '' && match.awayScore !== '') {
          const id = `result_${match.id}`;
          if (dismissedIds.includes(id)) continue; // ya fue borrada
          items.push({
            id,
            type: 'result',
            emoji: '⚽',
            title: 'Resultado disponible',
            body: `${getTeamName(match.home)}  ${match.homeScore} – ${match.awayScore}  ${getTeamName(match.away)}`,
            poolName: pool.name,
            read: readIds.includes(id),
          });
        }
      }
    }

    // Sin leer al tope
    items.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.read).length);
  }, [pools]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

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

  function openNotif() {
    setNotifOpen(true);
    Animated.parallel([
      Animated.timing(notifTranslateX, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(notifOverlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }

  function closeNotif() {
    Animated.parallel([
      Animated.timing(notifTranslateX, { toValue: NOTIF_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(notifOverlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setNotifOpen(false));
  }

  const markAllRead = async () => {
    const ids = notifications.map((n) => n.id);
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(ids));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    const readRaw = await AsyncStorage.getItem(READ_KEY);
    const readIds: string[] = readRaw ? JSON.parse(readRaw) : [];
    if (!readIds.includes(id)) {
      readIds.push(id);
      await AsyncStorage.setItem(READ_KEY, JSON.stringify(readIds));
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const dismissOne = async (id: string) => {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
    }
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    setUnreadCount(updated.filter((n) => !n.read).length);
  };

  const dismissAll = async () => {
    const ids = notifications.map((n) => n.id);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
    setNotifications([]);
    setUnreadCount(0);
  };

  function handleMenuNav(screen: string) {
    closeMenu();
    // Pequeño delay para que la animación cierre antes de navegar
    setTimeout(() => navigation.navigate(screen), 240);
  }

  function handleLogout() {
    closeMenu();
    // Pequeño delay para que la animación cierre antes de navegar
    setTimeout(() => logout(), 240);
  }

  // Abrir detalle de polla; si tiene predicción de campeón activada y el
  // usuario aún no ha hecho su elección, lo manda a ChampionPrediction primero.
  async function handlePoolPress(pool: Pool) {
    if (pool.championConfig?.enabled) {
      const { data } = await supabase
        .from('pool_champion_predictions')
        .select('id')
        .eq('pool_id', pool.id)
        .eq('user_id', user?.id ?? '')
        .maybeSingle();

      if (!data) {
        // Sin predicción guardada → ir a la pantalla de selección primero
        navigation.navigate('ChampionPrediction', { pool });
        return;
      }
    }
    navigation.navigate('PoolDetail', { pool });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openMenu} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pollas</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={openNotif} activeOpacity={0.6}>
          <View>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>
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
            onPress={() => handlePoolPress(item)}
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

      {/* ── Banner publicitario (aparece / desaparece con intervalo) ─── */}
      <AdBanner />

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

      {/* ── Overlay notificaciones ───────────────────────────────────────────── */}
      {notifOpen && (
        <TouchableWithoutFeedback onPress={closeNotif}>
          <Animated.View style={[styles.overlay, { opacity: notifOverlayOpacity }]} />
        </TouchableWithoutFeedback>
      )}

      {/* ── Panel de notificaciones (desliza desde la derecha) ────────────────── */}
      <Animated.View style={[styles.notifPanel, { transform: [{ translateX: notifTranslateX }] }]}>
        {/* Header */}
        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle}>Notificaciones</Text>
          <TouchableOpacity onPress={closeNotif} style={styles.notifCloseBtn}>
            <Text style={styles.notifCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de acciones — solo visible cuando hay notificaciones */}
        {notifications.length > 0 && (
          <View style={styles.notifActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
                <Text style={styles.notifActionBtn}>✓ Marcar leídas</Text>
              </TouchableOpacity>
            )}
            {unreadCount > 0 && <Text style={styles.notifActionSep}>·</Text>}
            <TouchableOpacity onPress={dismissAll} activeOpacity={0.7}>
              <Text style={[styles.notifActionBtn, styles.notifActionDelete]}>
                🗑 Borrar todas
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {notifications.length === 0 ? (
          // ── Sin notificaciones ────────────────────────────────────────────
          <View style={styles.notifEmpty}>
            <Text style={styles.notifEmptyIcon}>🔕</Text>
            <Text style={styles.notifEmptyTitle}>Sin notificaciones</Text>
            <Text style={styles.notifEmptyDesc}>
              Aquí aparecerán los resultados de tus pollas y otros avisos importantes.
            </Text>
          </View>
        ) : (
          // ── Lista de notificaciones ───────────────────────────────────────
          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.notifItem, item.read && styles.notifItemRead]}
                onPress={() => markOneRead(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.notifDot, item.read && styles.notifDotRead]} />
                <View style={styles.notifItemContent}>
                  <Text style={styles.notifItemEmoji}>{item.emoji}</Text>
                  <View style={styles.notifItemText}>
                    <Text style={[styles.notifItemTitle, item.read && styles.notifItemTitleRead]}>
                      {item.title}
                    </Text>
                    <Text style={styles.notifItemBody}>{item.body}</Text>
                    <Text style={styles.notifItemPool}>📋 {item.poolName}</Text>
                  </View>
                </View>
                {/* Botón borrar individual */}
                <TouchableOpacity
                  onPress={() => dismissOne(item.id)}
                  style={styles.notifDeleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.notifDeleteIcon}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Animated.View>

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
              <Text style={styles.menuStatValue}>{userStats.totalPoints}</Text>
              <Text style={styles.menuStatLabel}>Puntos</Text>
            </View>
            <View style={styles.menuStatDivider} />
            <View style={styles.menuStat}>
              <Text style={styles.menuStatValue}>{userStats.totalCorrect}</Text>
              <Text style={styles.menuStatLabel}>Aciertos</Text>
            </View>
          </View>

          {/* Estadísticas secundarias */}
          <View style={styles.menuSecondaryStats}>
            <Text style={styles.menuSecondaryStat}>
              ⭐ {userStats.totalExact} exactos
            </Text>
            <View style={styles.menuSecondaryDot} />
            <Text style={styles.menuSecondaryStat}>
              📊{' '}
              {userStats.totalPredictions > 0
                ? Math.round((userStats.totalCorrect / userStats.totalPredictions) * 100)
                : 0}% precisión
            </Text>
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
                onPress={() => handleMenuNav(item.screen)}
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
                onPress={() => handleMenuNav(item.screen)}
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
  safe: { flex: 1, backgroundColor: '#F4EBD8' },

  // ── Header ───────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
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
    borderTopColor: '#DADADA',
  },
  btnCreate: {
    flex: 1,
    backgroundColor: '#149435',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCreateText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  btnJoin: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#149435',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnJoinText: { color: '#149435', fontWeight: 'bold', fontSize: 15 },

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
    backgroundColor: '#FAF7F2',
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
    backgroundColor: '#149435',
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
    borderBottomColor: '#DADADA',
  },
  menuStat: { flex: 1, alignItems: 'center' },
  menuStatValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 },
  menuStatLabel: { fontSize: 11, color: '#64748B' },
  menuStatDivider: { width: 1, backgroundColor: '#DADADA' },
  menuSecondaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
    gap: 6,
  },
  menuSecondaryStat: { fontSize: 12, color: '#64748B' },
  menuSecondaryDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },

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
    borderBottomColor: '#F4EBD8',
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
    backgroundColor: '#ECFDF5',
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

  // ── Badge campanita ──────────────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  // ── Panel notificaciones ─────────────────────────────────────────────────
  notifPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: NOTIF_WIDTH,
    backgroundColor: '#FAF7F2',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
    gap: 8,
  },
  notifTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  notifActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
    gap: 8,
  },
  notifActionBtn: { fontSize: 13, color: '#149435', fontWeight: '600' },
  notifActionSep: { fontSize: 13, color: '#CBD5E1' },
  notifActionDelete: { color: '#DC2626' },
  notifCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4EBD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  notifCloseIcon: { fontSize: 13, color: '#64748B', fontWeight: 'bold' },
  notifEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notifEmptyIcon: { fontSize: 52, marginBottom: 16 },
  notifEmptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  notifEmptyDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F4EBD8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  notifItemRead: { backgroundColor: '#FAF7F2' },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#149435',
    marginTop: 5,
    flexShrink: 0,
  },
  notifDotRead: { backgroundColor: 'transparent' },
  notifItemContent: { flex: 1, flexDirection: 'row', gap: 10 },
  notifItemEmoji: { fontSize: 22, marginTop: 1 },
  notifItemText: { flex: 1 },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  notifItemTitleRead: { color: '#64748B', fontWeight: '600' },
  notifItemBody: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 18 },
  notifItemPool: { fontSize: 11, color: '#94A3B8' },
  notifDeleteBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDeleteIcon: { fontSize: 12, color: '#CBD5E1', fontWeight: 'bold' },
});
