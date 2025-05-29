// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image, // Importamos Image para el logo
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error de inicio de sesión', 'Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    // El mensaje de error ya se muestra desde AuthContext.tsx si falla
    await login(username, password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {/* Aquí podrías colocar un logo, asegúrate de tener una imagen en assets/logo.png */}
          {/* <Image source={require('../../assets/logo.png')} style={styles.logo} /> */}
          <Text style={styles.appName}>PromotorApp</Text>
        </View>

        <View style={styles.loginBox}>
          <Text style={styles.title}>Iniciar Sesión</Text>

          <TextInput
            style={styles.input}
            placeholder="Usuario"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => console.log('Focus next input')} // Implementar si tienes múltiples inputs
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3498db', // Un azul más vibrante para el fondo
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40, // Espacio superior e inferior para evitar que el contenido toque los bordes
  },
  header: {
    alignItems: 'center',
    marginBottom: 40, // Espacio entre el header y el loginBox
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 15,
    borderRadius: 60, // Si es un logo circular
    backgroundColor: '#fff', // Fondo blanco para el logo si no hay imagen
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loginBox: {
    width: '90%', // Más ancho
    maxWidth: 450, // Más ancho en pantallas grandes
    backgroundColor: '#fff',
    borderRadius: 15, // Bordes más redondeados
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 35,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 55, // Más alto
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10, // Bordes más redondeados
    paddingHorizontal: 18,
    marginBottom: 20,
    fontSize: 17,
    color: '#333',
    backgroundColor: '#f5f5f5', // Un gris claro para el fondo
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    width: '100%',
    height: 55, // Más alto
    backgroundColor: '#28a745', // Un verde vibrante
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: 'rgba(40, 167, 69, 0.4)', // Sombra para el botón
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#90ee90', // Un verde más claro cuando está deshabilitado
    shadowOpacity: 0.2,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 15,
  },
});

export default LoginScreen;