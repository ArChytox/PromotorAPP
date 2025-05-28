// src/screens/VisitScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList, // Para mostrar las presentaciones añadidas
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/AppNavigator';
import { ProductVisitEntry, ChispaPresentation, Commerce } from '../types/data'; // Usamos ChispaPresentation
import { getCommerces } from '../utils/storage'; // Ya no necesitamos saveVisits aquí
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Definir las 5 presentaciones "Chispas"
const CHISPA_PRESENTATIONS: ChispaPresentation[] = [
  { id: 'pres_001', name: 'GRAN MARQUES PREMIUM 1KG' },
  { id: 'pres_002', name: 'DON JULIAN TIPO 1 1KG' },
  { id: 'pres_003', name: 'GRAN MARQUES GOURMET 900G' },
  { id: 'pres_004', name: 'GRAN MARQUES SELECTO 850G' },
  { id: 'pres_005', name: 'DON JULIAN TIPO 2 1KG' },
];

type VisitScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Visit'>;
type VisitScreenRouteProp = RouteProp<AppStackParamList, 'Visit'>;

interface VisitScreenProps {
  navigation: VisitScreenNavigationProp;
  route: VisitScreenRouteProp;
}

const VisitScreen: React.FC<VisitScreenProps> = ({ navigation, route }) => {
  const { commerceId } = route.params;

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>('');
  const [shelfStock, setShelfStock] = useState<string>('');
  const [generalStock, setGeneralStock] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [collectedProductEntries, setCollectedProductEntries] = useState<ProductVisitEntry[]>([]); // Estado para acumular presentaciones

  useEffect(() => {
    const fetchCommerceDetails = async () => {
      try {
        if (!commerceId) {
          Alert.alert('Error', 'ID de comercio no proporcionado.');
          navigation.goBack();
          return;
        }
        const storedCommerces = await getCommerces();
        const foundCommerce = storedCommerces.find(c => c.id === commerceId);
        if (foundCommerce) {
          setCommerce(foundCommerce);
        } else {
          Alert.alert('Error', 'Comercio no encontrado.');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio:', error);
        Alert.alert('Error', 'No se pudieron cargar los detalles del comercio.');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommerceDetails();
  }, [commerceId, navigation]);

  const handleAddPresentationEntry = () => {
    if (!selectedPresentationId) {
      Alert.alert('Error', 'Por favor, selecciona una presentación.');
      return;
    }
    if (!price.trim() || !shelfStock.trim() || !generalStock.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos de datos de la presentación.');
      return;
    }

    // Convertir a números
    const parsedPrice = parseFloat(price.replace(',', '.'));
    const parsedShelfStock = parseInt(shelfStock, 10);
    const parsedGeneralStock = parseInt(generalStock, 10);

    if (isNaN(parsedPrice) || isNaN(parsedShelfStock) || isNaN(parsedGeneralStock)) {
      Alert.alert('Error', 'Por favor, ingresa valores numéricos válidos en Precio, Stock Anaqueles y Stock General.');
      return;
    }
    if (parsedPrice < 0 || parsedShelfStock < 0 || parsedGeneralStock < 0) {
      Alert.alert('Error', 'Los valores de Precio y Stock no pueden ser negativos.');
      return;
    }

    const selectedPresentation = CHISPA_PRESENTATIONS.find(p => p.id === selectedPresentationId);
    if (!selectedPresentation) {
      Alert.alert('Error interno', 'Presentación seleccionada no válida.');
      return;
    }

    const newEntry: ProductVisitEntry = {
      productId: selectedPresentationId,
      productName: selectedPresentation.name,
      price: parsedPrice,
      shelfStock: parsedShelfStock,
      generalStock: parsedGeneralStock,
    };

    // Verificar si la presentación ya fue añadida para evitar duplicados y actualizar
    const existingEntryIndex = collectedProductEntries.findIndex(
      (entry) => entry.productId === newEntry.productId
    );

    if (existingEntryIndex > -1) {
      // Actualizar la entrada existente
      const updatedEntries = [...collectedProductEntries];
      updatedEntries[existingEntryIndex] = newEntry;
      setCollectedProductEntries(updatedEntries);
      Alert.alert('Actualizado', `La presentación "${newEntry.productName}" ha sido actualizada.`);
    } else {
      // Añadir nueva entrada
      setCollectedProductEntries((prevEntries) => [...prevEntries, newEntry]);
      Alert.alert('Añadido', `Presentación "${newEntry.productName}" añadida.`);
    }

    // Limpiar campos para la siguiente entrada
    setSelectedPresentationId(null);
    setPrice('');
    setShelfStock('');
    setGeneralStock('');
  };

  const handleGoToCompetitors = () => {
    if (collectedProductEntries.length === 0) {
      Alert.alert('Atención', 'Debes añadir al menos una presentación antes de continuar.');
      return;
    }
    // Navegar a la pantalla de competencia, pasando los datos recopilados
    navigation.navigate('Competitor', {
      commerceId: commerceId,
      productEntries: collectedProductEntries,
    });
  };

  const renderProductEntryItem = ({ item }: { item: ProductVisitEntry }) => (
    <View style={styles.productEntryItem}>
      <Text style={styles.productEntryText}>** {item.productName} **</Text>
      <Text style={styles.productEntryDetail}>Precio: ${item.price.toFixed(2)}</Text>
      <Text style={styles.productEntryDetail}>Anaqueles: {item.shelfStock}</Text>
      <Text style={styles.productEntryDetail}>General: {item.generalStock}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando información del comercio...</Text>
      </View>
    );
  }

  if (!commerce) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No se pudo cargar el comercio. Por favor, intente de nuevo.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
            <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{'< Volver'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visita a:</Text>
          <Text style={styles.commerceName}>{commerce.name}</Text>
          <Text style={styles.commerceAddress}>{commerce.address}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registro de Presentaciones Chispa</Text>

          <Text style={styles.inputLabel}>Seleccionar Presentación *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedPresentationId}
              onValueChange={(itemValue) => {
                setSelectedPresentationId(itemValue);
                // Limpiar campos al cambiar de producto para evitar datos erróneos
                setPrice('');
                setShelfStock('');
                setGeneralStock('');
              }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="-- Selecciona una Presentación --" value={null} />
              {CHISPA_PRESENTATIONS.map((presentation) => (
                <Picker.Item key={presentation.id} label={presentation.name} value={presentation.id} />
              ))}
            </Picker>
          </View>

          {/* Campos que se activan al seleccionar una presentación */}
          {selectedPresentationId && (
            <View>
              <Text style={styles.inputLabel}>Precio *</Text>
              <TextInput
                style={styles.input}
                placeholder="Precio de la presentación (ej: 15.50)"
                placeholderTextColor="#999"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>Stock Anaqueles *</Text>
              <TextInput
                style={styles.input}
                placeholder="Cantidad en anaqueles"
                placeholderTextColor="#999"
                value={shelfStock}
                onChangeText={setShelfStock}
                keyboardType="numeric"
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>Stock General/Inventario *</Text>
              <TextInput
                style={styles.input}
                placeholder="Cantidad en almacén/inventario"
                placeholderTextColor="#999"
                value={generalStock}
                onChangeText={setGeneralStock}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleAddPresentationEntry}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.addButton, !selectedPresentationId && styles.addButtonDisabled]}
            onPress={handleAddPresentationEntry}
            disabled={!selectedPresentationId}
          >
            <Text style={styles.addButtonText}>+ Añadir Presentación</Text>
          </TouchableOpacity>
        </View>

        {/* Sección para mostrar presentaciones añadidas */}
        {collectedProductEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Presentaciones Añadidas</Text>
            <FlatList
              data={collectedProductEntries}
              renderItem={renderProductEntryItem}
              keyExtractor={(item, index) => item.productId + index} // Usar productId + index para key si hay duplicados
              contentContainerStyle={styles.addedProductsList}
              scrollEnabled={false} // <--- ¡Esta es la corrección!
            />
          </View>
        )}

        {/* Botón para continuar a la siguiente pantalla */}
        <TouchableOpacity
          style={[styles.continueButton, collectedProductEntries.length === 0 && styles.continueButtonDisabled]}
          onPress={handleGoToCompetitors}
          disabled={collectedProductEntries.length === 0}
        >
          <Text style={styles.continueButtonText}>Añadir Competencia </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e9eff4',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 10,
    top: 15,
    padding: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  commerceName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
  },
  commerceAddress: {
    fontSize: 16,
    color: '#e0e0e0',
    marginTop: 5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    width: '100%',
    textAlign: 'left',
    marginBottom: 5,
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
    marginTop: 10,
  },
  pickerContainer: {
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  picker: {
    height: 55,
    width: '100%',
    color: '#333',
  },
  pickerItem: {
    fontSize: 17,
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
  addButton: {
    backgroundColor: '#28a745', // Verde para añadir producto
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: 'rgba(40, 167, 69, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonDisabled: {
    backgroundColor: '#90ee90',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#007bff', // Azul para continuar
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: 'rgba(0, 123, 255, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: '#a0c9f8',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9eff4',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addedProductsList: {
    marginTop: 10,
  },
  productEntryItem: {
    backgroundColor: '#f0f8ff', // Un color claro para los items de la lista
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#b0e0e6',
  },
  productEntryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  productEntryDetail: {
    fontSize: 14,
    color: '#666',
  },
});

export default VisitScreen;