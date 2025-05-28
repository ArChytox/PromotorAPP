// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet, Alert, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTACIONES ADICIONALES PARA ESTA LÓGICA (Asegúrate de que estas rutas y tipos sean correctos)
// Si no tienes estos archivos todavía, comenta o elimina estas líneas por ahora
// hasta que los crees. Por ahora, nos centraremos en el Login.
// import { Promoter } from '../types/data';
// import { saveCurrentPromoter } from '../utils/storage';

// 1. Definir la interfaz (contrato) para el objeto de usuario autenticado
export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
}

// 2. Definir la interfaz (contrato) para el valor que el contexto proporcionará
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// 3. Crear el contexto de React
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 4. Componente AuthProvider: Envuelve a la aplicación para proporcionar el contexto
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Función para simular el inicio de sesión
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simula un retraso de red

      // Credenciales de ejemplo
      if (username === 'promotor' && password === '12345') {
        const loggedInUser: User = {
          id: 'user-001',
          username: 'promotor',
          name: 'Juan Pérez',
          role: 'Promotor Principal',
          email: 'juan.perez@granmarquez.com',
        };

        // --- LÓGICA AGREGADA: GUARDAR EL PROMOTOR ASOCIADO AUTOMÁTICAMENTE ---
        // Comenta o elimina esto si no tienes el tipo 'Promoter' y la función 'saveCurrentPromoter'
        // const defaultPromoter: Promoter = {
        //   id: 'promotor-default-001',
        //   name: loggedInUser.name,
        //   // code: 'P001',
        // };
        // await saveCurrentPromoter(defaultPromoter);
        // ---------------------------------------------------------------------

        setUser(loggedInUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('user', JSON.stringify(loggedInUser)); // Guarda el usuario logueado
        Alert.alert('Éxito', '¡Inicio de sesión exitoso!');
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        Alert.alert('Error', 'Usuario o contraseña incorrectos.');
        return false;
      }
    } catch (error) {
      console.error('Error durante el login:', error);
      Alert.alert('Error', 'Ocurrió un problema al iniciar sesión. Intenta de nuevo.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    setIsLoading(true);
    setUser(null);
    setIsAuthenticated(false);
    await AsyncStorage.removeItem('user'); // Elimina el usuario de AsyncStorage
    // await AsyncStorage.removeItem('@MyApp:currentPromoter'); // También elimina el promotor activo si lo usas
    Alert.alert('Sesión Cerrada', 'Has cerrado sesión exitosamente.');
    setIsLoading(false);
  };

  // Efecto para cargar el estado de autenticación desde AsyncStorage al iniciar la app
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error al cargar el usuario de AsyncStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Valor que se proporcionará a los componentes que consuman este contexto
  const authContextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando sesión...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 5. Hook personalizado para consumir el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Estilos para la pantalla de carga inicial
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
});