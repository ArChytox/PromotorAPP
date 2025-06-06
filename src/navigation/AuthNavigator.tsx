// PromotorAPP/src/navigation/AuthNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Auth/LoginScreen'; // <-- ¡Verifica esta ruta!
import RegisterScreen from '../screens/Auth/RegisterScreen'; // <-- ¡Verifica esta ruta y que sea 'RegisterScreen'!
// Define los nombres de las rutas y los tipos de sus parámetros
// Esto es crucial para la seguridad de tipos en React Navigation
export type AuthStackParamList = {
  Login: undefined; // No toma parámetros
  Register: undefined; // <-- ¡Asegúrate de que esta línea exista!
};
const AuthStack = createStackNavigator<AuthStackParamList>();
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} /> 
    </AuthStack.Navigator>
  );
};
export default AuthNavigator;