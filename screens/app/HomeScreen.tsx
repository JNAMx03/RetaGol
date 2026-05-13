import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import PoolCard from '../../components/PoolCard';
import { Pool } from '../../context/AppContext';

export default function HomeScreen({ navigation }: any) {
  const { pools, user, logout } = useApp();
  const [menuVisible, setMenuVisible] = useState(false);

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pollas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Lista de pollas */}
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
              Crea o únete a una polla para comenzar
            </Text>
          </View>
        }
      />

      {/* Botones inferiores */}
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

      {/* Menú lateral (modal) */}
      <Modal visible={menuVisible} animationType="fade" transparent statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={styles.menu}>
          {/* Encabezado del menú */}
          <View style={styles.menuTopRow}>
            <Text style={styles.menuTitle}>Menú</Text>
            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.iconBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Info del usuario */}
          <View style={styles.menuUser}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{initials}</Text>
            </View>
            <Text style={styles.menuUserName}>{user.name}</Text>
            <Text style={styles.menuUserEmail}>{user.email || 'sin correo'}</Text>
          </View>

          {/* Opción configuración */}
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>⚙️</Text>
            <Text style={styles.menuItemText}>Configuración</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Cerrar sesión */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              logout();
            }}
          >
            <Text style={[styles.menuItemText, styles.logoutText]}>Cerrar sesión</Text>
          </TouchableOpacity>

          <Text style={styles.menuVersion}>Versión 1.0.0</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  menuIcon: {
    fontSize: 22,
    color: '#374151',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 14,
  },
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
  btnCreateText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnJoin: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnJoinText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // ── Menú ──────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '76%',
    backgroundColor: 'white',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  menuTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeIcon: {
    fontSize: 18,
    color: '#374151',
  },
  menuUser: {
    alignItems: 'center',
    paddingBottom: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 3,
  },
  menuUserEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
  },
  logoutText: {
    color: '#DC2626',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  menuVersion: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    color: '#94A3B8',
    fontSize: 12,
  },
});
