import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import PredictionsScreen from '../screens/app/pool/PredictionsScreen';
import ResultsScreen from '../screens/app/pool/ResultsScreen';
import StandingsScreen from '../screens/app/pool/StandingsScreen';
import InfoScreen from '../screens/app/pool/InfoScreen';

const Tab = createBottomTabNavigator();

export default function PoolTabsNavigator({ route, navigation }: any) {
  const { pool } = route.params;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header con botón atrás y nombre de la polla */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          {/* Flecha dibujada con View — evita variaciones entre fuentes de distintos fabricantes */}
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{pool.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs de la polla */}
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tab.Screen
          name="Predicciones"
          component={PredictionsScreen}
          initialParams={{ pool }}
          options={{
            tabBarIcon: ({ focused }) => (
              <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.4 }]}>✏️</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Resultados"
          component={ResultsScreen}
          initialParams={{ pool }}
          options={{
            tabBarIcon: ({ focused }) => (
              <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.4 }]}>✅</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Clasificación"
          component={StandingsScreen}
          initialParams={{ pool }}
          options={{
            tabBarIcon: ({ focused }) => (
              <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.4 }]}>🏆</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Info"
          component={InfoScreen}
          initialParams={{ pool }}
          options={{
            tabBarIcon: ({ focused }) => (
              <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.4 }]}>ℹ️</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'white',
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#2563EB',
    transform: [{ rotate: '45deg' }],
    marginLeft: 8,   // compensa la rotación para que quede centrado visualmente
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: 'white',
    height: 62,
    paddingBottom: 6,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 18,
  },
});
