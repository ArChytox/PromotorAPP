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
import { Commerce } from '../types/data'; // Asegúrate de que esta ruta sea correcta para tu interfaz Commerce actualizada
import { getCommerces, saveCommerces } from '../utils/storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase'; // Asegúrate de que esta ruta sea correcta para tu cliente Supabase

// --- IMPORTAR TIPOS DE SUPABASE ---
// ASEGÚRATE de que esta ruta sea correcta a tu archivo database.types.ts
import { Database } from '../database.types';

type CommercesInsert = Database['public']['Tables']['commerces']['Insert'];
type CommercesUpdate = Database['public']['Tables']['commerces']['Update'];

// --- CONSTANTES DE COLORES (COPIADAS DE CommerceListScreen para consistencia) ---
const PRIMARY_BLUE_SOFT = '#E3F2FD';
const DARK_BLUE = '#1565C0';
const ACCENT_BLUE = '#2196F3';
const SUCCESS_GREEN = '#66BB6A';
const WARNING_ORANGE = '#FFCA28';
const TEXT_DARK = '#424242';
const TEXT_LIGHT = '#FFFFFF';
const BORDER_COLOR = '#BBDEFB';
const LIGHT_GRAY_BACKGROUND = '#F5F5F5';
const ERROR_RED = '#DC3545';

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
  const [createdAt, setCreatedAt] = useState<string>('');
  // No necesitamos un estado para userId aquí, lo obtendremos de la sesión

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
            setCreatedAt(commerceToEdit.createdAt || new Date().toISOString());
            // No necesitamos setear userId aquí, ya que no se edita directamente
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
      // --- PASO CLAVE: Obtener el ID del usuario autenticado ---
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error al obtener el usuario autenticado:', userError?.message || 'Usuario no encontrado.');
        Alert.alert('Error', 'No se pudo identificar al usuario. Asegúrate de iniciar sesión antes de añadir/editar comercios.');
        setIsLoading(false);
        return; // Detener la ejecución si no hay usuario
      }
      const currentUserId = user.id; // ¡Este es el ID del promotor/usuario!
      // --- Fin de obtención del user_id ---

      const existingCommerces = await getCommerces();
      let updatedCommerces: Commerce[];
      let commerceToSave: Commerce;

      const formattedName = name.trim().toUpperCase();

      if (isEditing) {
        const existingCommerce = existingCommerces.find(c => c.id === initialCommerceId);
        if (!existingCommerce) {
          Alert.alert('Error', 'Comercio original no encontrado para actualizar.');
          setIsLoading(false);
          return;
        }

        commerceToSave = {
          ...existingCommerce, // Mantenemos el ID y createdAt originales
          name: formattedName,
          address: address.trim(),
          phone: phone.trim(),
          category: category.trim() || 'General',
          userId: existingCommerce.userId || currentUserId, // Mantenemos el userId existente o asignamos el actual si por alguna razón no lo tenía
        };

        updatedCommerces = existingCommerces.map(c =>
          c.id === initialCommerceId
            ? commerceToSave
            : c
        );
        Alert.alert('Éxito', `Comercio "${formattedName}" actualizado exitosamente.`);

        const commerceUpdateData: CommercesUpdate = {
          name: commerceToSave.name,
          address: commerceToSave.address,
          phone: commerceToSave.phone,
          category: commerceToSave.category,
          // user_id no se suele actualizar una vez asignado
        };

        const { error: updateError } = await supabase
          .from('commerces')
          .update(commerceUpdateData)
          .eq('id', commerceToSave.id);

        if (updateError) {
          console.error('Error al actualizar comercio en Supabase:', updateError);
          Alert.alert('Error de Sincronización', 'El comercio se actualizó localmente, pero hubo un problema al sincronizar con la base de datos.');
        } else {
          console.log('Comercio actualizado en Supabase:', commerceToSave.id);
        }

      } else {
        commerceToSave = {
          id: uuidv4(),
          name: formattedName,
          address: address.trim(),
          phone: phone.trim(),
          category: category.trim() || 'General',
          createdAt: new Date().toISOString(),
          userId: currentUserId, // ¡Añadido! Asociar el comercio al usuario actual
        };
        updatedCommerces = [...existingCommerces, commerceToSave];
        Alert.alert('Éxito', `Comercio "${formattedName}" añadido exitosamente.`);

        const commerceInsertData: CommercesInsert = {
          id: commerceToSave.id,
          name: commerceToSave.name,
          address: commerceToSave.address,
          phone: commerceToSave.phone,
          category: commerceToSave.category,
          created_at: commerceToSave.createdAt,
          user_id: commerceToSave.userId, // ¡Añadido!
        };

        const { error: insertError } = await supabase
          .from('commerces')
          .insert(commerceInsertData);

        if (insertError) {
          console.error('Error al insertar comercio en Supabase:', insertError);
          Alert.alert('Error de Sincronización', 'El comercio se añadió localmente, pero hubo un problema al sincronizar con la base de datos.');
        } else {
          console.log('Comercio insertado en Supabase:', commerceToSave.id);
        }
      }

      await saveCommerces(updatedCommerces);

      navigation.navigate('CommerceList');

    } catch (error) {
      console.error('Error general al guardar comercio:', error);
      Alert.alert('Error', `No se pudo ${isEditing ? 'actualizar' : 'añadir'} el comercio. Intenta de nuevo.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !isDataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DARK_BLUE} />
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

          <Text style={styles.inputLabel}>Nombre del Comercio *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Tienda La Esquina"
            placeholderTextColor={TEXT_DARK}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Dirección *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Av. Principal 123, Centro"
            placeholderTextColor={TEXT_DARK}
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Teléfono (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 0414-1234567"
            placeholderTextColor={TEXT_DARK}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Categoría</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Restaurante, Tienda, Servicio (Por defecto: General)"
            placeholderTextColor={TEXT_DARK}
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
    backgroundColor: PRIMARY_BLUE_SOFT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE_SOFT,
  },
  loadingText: {
    fontSize: 18,
    color: TEXT_DARK,
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
    backgroundColor: LIGHT_GRAY_BACKGROUND,
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
    color: DARK_BLUE,
    textAlign: 'center',
  },
  inputLabel: {
    width: '100%',
    textAlign: 'left',
    marginBottom: 5,
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 55,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
    fontSize: 17,
    color: TEXT_DARK,
    backgroundColor: TEXT_LIGHT,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: ACCENT_BLUE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: BORDER_COLOR,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  buttonText: {
    color: TEXT_LIGHT,
    fontSize: 19,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: ERROR_RED,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddEditCommerceScreen;