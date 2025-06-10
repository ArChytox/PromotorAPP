// PromotorAPP/App.tsx
import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { VisitProvider } from './src/context/VisitContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const AppContent = () => {
  const { isAuthenticated, isLoading: isLoadingAuth, isConnected, triggerSync } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);
  const hasPreparedAppContent = useRef(false);

  useEffect(() => {
    if (!hasPreparedAppContent.current) {
      console.log('[AppContent] Iniciando preparación del contenido de la aplicación...');
      hasPreparedAppContent.current = true;
      setAppIsReady(true);
      console.log('[AppContent] Contenido de la aplicación listo.');
    }
  }, []);

  useEffect(() => {
    if (appIsReady && !isLoadingAuth) {
      console.log('[HideSplash Effect] Ocultando SplashScreen...');
      SplashScreen.hideAsync();
    }
  }, [appIsReady, isLoadingAuth]);

  // 👉 AQUI colocas los console.log de verificación
  console.log('[AppContent] isAuthenticated:', isAuthenticated);
  console.log('[AppContent] AppNavigator:', AppNavigator);
  console.log('[AppContent] AuthNavigator:', AuthNavigator);

  if (!appIsReady || isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        {isAuthenticated ? (
          <VisitProvider>
            <AppNavigator />
          </VisitProvider>
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
    </View>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0e43f1',
  },
});

export default App;