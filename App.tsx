// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native'; // Importamos NavigationContainer aquí, y SOLO aquí
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Este componente AppContent es el que realmente renderiza los navegadores
// y decide cuál mostrar basándose en el estado de autenticación.
const AppContent = () => {
  // Obtenemos el estado de autenticación y carga desde el AuthContext
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();

  // Si el estado de autenticación aún se está cargando (ej. verificando AsyncStorage),
  // mostramos un indicador de carga.
  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Una vez que el estado de autenticación se ha resuelto,
  // renderizamos el NavigationContainer principal.
  // Dentro de él, mostramos AppNavigator si está autenticado, o AuthNavigator si no lo está.
  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Este es el componente principal de la aplicación que se exporta.
// Envuelve toda la lógica de navegación y autenticación con el AuthProvider.
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// Estilos para la pantalla de carga inicial
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;