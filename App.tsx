// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { VisitProvider } from './src/context/VisitContext'; // <--- Importa tu VisitProvider aquí
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const AppContent = () => {
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {isAuthenticated ? (
        // Si el usuario está autenticado, envuelve el AppNavigator con el VisitProvider
        <VisitProvider> {/* <--- VisitProvider envuelve AppNavigator */}
          <AppNavigator />
        </VisitProvider>
      ) : (
        // Si no está autenticado, muestra el AuthNavigator
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    // AuthProvider siempre debe estar arriba para manejar la autenticación global
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;