// PromotorAPP/src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button, // Aunque usaremos TouchableOpacity para el botón principal, lo mantengo por si lo usas en otro lado
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Asegúrate que esta ruta es correcta
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator'; // Importa AuthStackParamList desde la navegación

// Define el tipo para las props de navegación, importante para TypeScript
type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

// Asegúrate de pasar 'navigation' como prop
const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>(''); // Cambiado de 'username' a 'email'
  const [password, setPassword] = useState<string>('');
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) { // Usamos email en lugar de username
      Alert.alert('Error de inicio de sesión', 'Por favor, ingresa tu email y contraseña.');
      return;
    }
    await login(email, password); // Llama a login con email
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
            placeholder="Email" // Cambiado a Email
            placeholderTextColor="#999"
            value={email} // Usamos email
            onChangeText={setEmail} // Usamos setEmail
            autoCapitalize="none"
            keyboardType="email-address" // Importante para teclados de email
            returnKeyType="next"
            // onSubmitEditing={() => console.log('Focus next input')} // Si tienes múltiples inputs
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

          {/* BOTÓN PARA CREAR UNA NUEVA CUENTA */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')} // Navega a la pantalla 'Register'
            style={styles.createAccountButton} // Nuevo estilo para diferenciar
            disabled={isLoading}
          >
            <Text style={styles.createAccountButtonText}>Crear una nueva cuenta</Text>
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
    backgroundColor: '#3498db',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 15,
    borderRadius: 60,
    backgroundColor: '#fff',
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
    width: '90%',
    maxWidth: 450,
    backgroundColor: '#fff',
    borderRadius: 15,
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
    height: 55,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
    fontSize: 17,
    color: '#333',
    backgroundColor: '#f5f5f5',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#28a745',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: 'rgba(40, 167, 69, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#90ee90',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  createAccountButton: { // Nuevo estilo para el botón de crear cuenta
    marginTop: 5, // Espacio entre el botón de login y este
    marginBottom: 10, // Espacio antes del botón de olvidar contraseña
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    // backgroundColor: '#0e43f1', // Podrías darle un fondo diferente o dejarlo transparente
  },
  createAccountButtonText: {
    color: '#007bff', // Un azul estándar para enlaces
    fontSize: 15,
    textDecorationLine: 'underline',
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