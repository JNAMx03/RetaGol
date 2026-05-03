import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import PredictionsScreen from '../screens/app/pool/PredictionsScreen';
import ResultsScreen from '../screens/app/pool/ResultsScreen';
import StandingsScreen from '../screens/app/pool/StandingsScreen';
import InfoScreen from '../screens/app/pool/InfoScreen';

const Tab = createBottomTabNavigator();

export default function PoolTabsNavigator({ route }: any) {

  /**
   * 👉 recibimos el pool desde PoolDetail
   */
  const { pool } = route.params;

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>

      <Tab.Screen
        name="Predictions"
        component={PredictionsScreen}
        initialParams={{ pool }}
      />

      <Tab.Screen
        name="Results"
        component={ResultsScreen}
        initialParams={{ pool }}
      />

      <Tab.Screen
        name="Standings"
        component={StandingsScreen}
        initialParams={{ pool }}
      />

      <Tab.Screen
        name="Info"
        component={InfoScreen}
        initialParams={{ pool }}
      />

    </Tab.Navigator>
  );
}