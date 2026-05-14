import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/app/HomeScreen';
import CreatePoolScreen from '../screens/app/CreatePoolScreen';
import JoinPoolScreen from '../screens/app/JoinPoolScreen';
import PoolTabsNavigator from './PoolTabsNavigator';
import { useApp } from '../context/AppContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLogged, loading } = useApp();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLogged ? (
          // ── Flujo de autenticación ──────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // ── Flujo principal ─────────────────────────────────────
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreatePool" component={CreatePoolScreen} />
            <Stack.Screen name="JoinPool" component={JoinPoolScreen} />
            <Stack.Screen name="PoolDetail" component={PoolTabsNavigator} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
