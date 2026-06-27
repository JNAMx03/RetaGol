import { useEffect } from 'react';
import { OneSignal } from 'react-native-onesignal';
import mobileAds from 'react-native-google-mobile-ads';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { AppProvider } from './context/AppContext';
import { supabase } from './services/supabase';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '';

export default function App() {
  useEffect(() => {
    // Inicializar Google Mobile Ads — en emuladores o builds sin Play Services puede fallar
    try { mobileAds().initialize(); } catch (e) { console.log('AdMob init skipped:', e); }

    // OneSignal solo si hay un App ID configurado
    if (ONESIGNAL_APP_ID) {
      OneSignal.initialize(ONESIGNAL_APP_ID);
      OneSignal.Notifications.requestPermission(true);
    }

    // Vincula el dispositivo actual al usuario de Supabase usando OneSignal.login(userId).
    // Esto reemplaza el enfoque anterior de guardar onesignal_player_id en profiles:
    // OneSignal asocia internamente el external_id (= user.id) con el dispositivo,
    // y las Edge Functions envían por external_id sin necesitar la columna en BD.
    if (ONESIGNAL_APP_ID) {
      // Al arrancar: si ya hay sesión activa, vincular de inmediato
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) OneSignal.login(user.id);
      });
    }

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ONESIGNAL_APP_ID) return;
      if (event === 'SIGNED_IN' && session?.user?.id) {
        OneSignal.login(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        OneSignal.logout();
      }
    });

    return () => {
      authSub.unsubscribe();
    };
  }, []);

  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor="#000000" translucent={false} />
      <AppNavigator />
    </AppProvider>
  );
}
