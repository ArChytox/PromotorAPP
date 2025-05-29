// src/screens/AddEditCommerceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce } from '../types/data';
import { getCommerces, saveCommerces } from '../utils/storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type AddEditCommerceScreenNavigationProp = StackNavigationProp<
  AppStackParamList,
  'AddEditCommerce'
>;
type AddEditCommerceScreenRouteProp = RouteProp<
  AppStackParamList,
  'AddEditCommerce'
>;

interface AddEditCommerceScreenProps {
  navigation: AddEditCommerceScreenNavigationProp;
  route: AddEditCommerceScreenRouteProp;
}

const AddEditCommerceScreen: React.FC<AddEditCommerceScreenProps> = ({ navigation, route }) => {
  const initialCommerceId = route.params?.commerceId;
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [createdAt, setCreatedAt] = useState<string>(''); // <-- Estado para createdAt

  const isEditing = initialCommerceId !== undefined;

  useEffect(() => {
    const loadCommerceData = async () => {
      if (isEditing && initialCommerceId) {
        setIsLoading(true);
        try {
          const existingCommerces = await getCommerces();
          const commerceToEdit = existingCommerces.find(c => c.id === initialCommerceId);
          if (commerceToEdit) {
            setName(commerceToEdit.name);
            setAddress(commerceToEdit.address);
            setPhone(commerceToEdit.phone || '');
            setCategory(commerceToEdit.category || '');
            setCreatedAt(commerceToEdit.createdAt || new Date().toISOString()); // <-- Cargar o asignar si falta
          } else {
            Alert.alert('Error', 'Comercio no encontrado para editar.');
            navigation.goBack();
          }
        } catch (error) {
          console.error('Error al cargar datos del comercio para edición:', error);
          Alert.alert('Error', 'No se pudieron cargar los datos del comercio.');
          navigation.goBack();
        } finally {
          setIsLoading(false);
          setIsDataLoaded(true);
        }
      } else {
        setIsDataLoaded(true);
      }
    };

    loadCommerceData();
  }, [isEditing, initialCommerceId, navigation]);

  const handleSaveCommerce = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Error', 'Por favor, ingresa el nombre y la dirección del comercio.');
      return;
    }

    setIsLoading(true);
    try {
      const existingCommerces = await getCommerces();
      let updatedCommerces: Commerce[];

      const formattedName = name.trim().toUpperCase();

      if (isEditing) {
        updatedCommerces = existingCommerces.map(c =>
          c.id === initialCommerceId
            ? { 
                ...c, 
                name: formattedName, 
                address: address.trim(), 
                phone: phone.trim(), 
                category: category.trim() || 'General',
                createdAt: c.createdAt // <-- Preservar la fecha de creación existente
              }
            : c
        );
        Alert.alert('Éxito', `Comercio "${formattedName}" actualizado exitosamente.`);

      } else {
        const newCommerce: Commerce = {
          id: uuidv4(),
          name: formattedName,
          address: address.trim(),
          phone: phone.trim(),
          category: category.trim() || 'General',
          createdAt: new Date().toISOString(), // <-- Asignar fecha de creación al añadir
        };
        updatedCommerces = [...existingCommerces, newCommerce];
        Alert.alert('Éxito', `Comercio "${formattedName}" añadido exitosamente.`);
      }

      await saveCommerces(updatedCommerces);
      
      navigation.navigate('CommerceList'); 

    } catch (error) {
      console.error('Error al guardar comercio:', error);
      Alert.alert('Error', `No se pudo ${isEditing ? 'actualizar' : 'añadir'} el comercio. Intenta de nuevo.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !isDataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando comercio...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formBox}>
          <Text style={styles.title}>{isEditing ? 'Editar Comercio' : 'Añadir Nuevo Comercio'}</Text>

          {/* Campo Nombre */}
          <Text style={styles.inputLabel}>Nombre del Comercio *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Tienda La Esquina"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Campo Dirección */}
          <Text style={styles.inputLabel}>Dirección *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Av. Principal 123, Centro"
            placeholderTextColor="#999"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Campo Teléfono (Opcional) */}
          <Text style={styles.inputLabel}>Teléfono (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 0414-1234567"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          {/* Campo Categoría */}
          <Text style={styles.inputLabel}>Categoría</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Restaurante, Tienda, Servicio (Por defecto: General)"
            placeholderTextColor="#999"
            value={category}
            onChangeText={setCategory}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSaveCommerce}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSaveCommerce}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Añadir Comercio')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e9eff4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9eff4',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  formBox: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  inputLabel: {
    width: '100%',
    textAlign: 'left',
    marginBottom: 5,
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
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
    backgroundColor: '#f9f9f9',
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#007bff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: 'rgba(0, 123, 255, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#a0c9f8',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddEditCommerceScreen;