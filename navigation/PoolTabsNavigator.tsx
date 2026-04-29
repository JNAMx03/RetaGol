import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import PredictionsScreen from '../screens/app/pool/PredictionsScreen';
import ResultsScreen from '../screens/app/pool/ResultsScreen';
import StandingsScreen from '../screens/app/pool/StandingsScreen';
import InfoScreen from '../screens/app/pool/InfoScreen';

const Tab = createBottomTabNavigator();

export default function PoolTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Predictions" component={PredictionsScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Standings" component={StandingsScreen} />
      <Tab.Screen name="Info" component={InfoScreen} />
    </Tab.Navigator>
  );
}