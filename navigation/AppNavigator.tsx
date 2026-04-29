import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// App
import HomeScreen from '../screens/app/HomeScreen';
import CreatePoolScreen from '../screens/app/CreatePoolScreen';
import JoinPoolScreen from '../screens/app/JoinPoolScreen';
import PoolDetailScreen from '../screens/app/PoolDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLogged, setIsLogged] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {!isLogged ? (
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} setIsLogged={setIsLogged} />}
            </Stack.Screen>
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreatePool" component={CreatePoolScreen} />
            <Stack.Screen name="JoinPool" component={JoinPoolScreen} />
            <Stack.Screen name="PoolDetail" component={PoolDetailScreen} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}