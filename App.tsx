// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator'; // Asegúrate de que la ruta sea correcta
import AuthNavigator from './src/navigation/AuthNavigator'; // Asegúrate de que la ruta sea correcta
import { AuthProvider, useAuth } from './src/contexts/AuthContext'; // Asegúrate de la ruta
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Este componente AppContent es el que realmente renderiza los navegadores
const AppContent = () => {
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth(); // Renombramos 'isLoading' a 'isLoadingAuth'

  if (isLoadingAuth) {
    // Muestra una pantalla de carga mientras se verifica el estado de autenticación
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Este es el componente principal que envuelve todo con el AuthProvider
const App = () => {
  return (
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