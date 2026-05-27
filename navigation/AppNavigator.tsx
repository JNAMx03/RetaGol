import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import HomeScreen from '../screens/app/HomeScreen';
import CreatePoolScreen from '../screens/app/CreatePoolScreen';
import JoinPoolScreen from '../screens/app/JoinPoolScreen';
import PoolTabsNavigator from './PoolTabsNavigator';
import ChampionPredictionScreen from '../screens/app/pool/ChampionPredictionScreen';
import EditProfileScreen from '../screens/app/settings/EditProfileScreen';
import NotificationsScreen from '../screens/app/settings/NotificationsScreen';
import SecurityScreen from '../screens/app/settings/SecurityScreen';
import LanguageScreen from '../screens/app/settings/LanguageScreen';
import HelpScreen from '../screens/app/settings/HelpScreen';
import AboutScreen from '../screens/app/settings/AboutScreen';
import { useApp } from '../context/AppContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLogged, loading, recoveryMode } = useApp();

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
        {recoveryMode ? (
          // ── Modo recuperación de contraseña (deep link del correo) ──
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : !isLogged ? (
          // ── Flujo de autenticación ──────────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // ── Flujo principal ─────────────────────────────────────────
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreatePool" component={CreatePoolScreen} />
            <Stack.Screen name="JoinPool" component={JoinPoolScreen} />
            <Stack.Screen name="PoolDetail" component={PoolTabsNavigator} />
            <Stack.Screen name="ChampionPrediction" component={ChampionPredictionScreen} />
            {/* Pantallas de configuración */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Security" component={SecurityScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
