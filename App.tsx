import { useEffect } from 'react';
import { OneSignal } from 'react-native-onesignal';
import AppNavigator from './navigation/AppNavigator';
import { AppProvider } from './context/AppContext';
import { supabase } from './services/supabase';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!;

export default function App() {
  useEffect(() => {
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);

    const savePlayerId = async () => {
      const id = OneSignal.User.pushSubscription.id;
      if (!id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onesignal_player_id: id })
          .eq('id', user.id);
      }
    };

    // Guardar si ya hay sesión activa al iniciar
    savePlayerId();

    // Volver a guardar cuando cambie la suscripción (primer login, renovación)
    OneSignal.User.pushSubscription.addEventListener('change', savePlayerId);
    return () => {
      OneSignal.User.pushSubscription.removeEventListener('change', savePlayerId);
    };
  }, []);

  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}
