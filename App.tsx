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

    // Guarda el subscription ID de OneSignal en el perfil del usuario autenticado.
    // Se llama en tres momentos para cubrir todos los casos:
    //   1. Al iniciar la app (si ya hay sesión activa)
    //   2. Cuando OneSignal asigna/renueva el ID (evento 'change')
    //   3. Cuando el usuario inicia sesión (evento SIGNED_IN de Supabase)
    const savePlayerId = async () => {
      const id = (OneSignal.User.pushSubscription as any).id as string | undefined;
      if (!id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onesignal_player_id: id })
          .eq('id', user.id);
      }
    };

    // Caso 1: sesión activa al arrancar
    savePlayerId();

    // Caso 2: OneSignal renueva o asigna el ID por primera vez
    OneSignal.User.pushSubscription.addEventListener('change', savePlayerId);

    // Caso 3: usuario acaba de iniciar sesión (el ID ya estaba listo pero no había usuario)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') savePlayerId();
    });

    return () => {
      OneSignal.User.pushSubscription.removeEventListener('change', savePlayerId);
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
