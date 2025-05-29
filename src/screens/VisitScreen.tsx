// src/screens/VisitScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { ProductVisitEntry, Commerce, ChispaPresentation } from '../types/data'; // Asegúrate de importar ProductVisitEntry
import { getCommerces } from '../utils/storage';
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useVisit } from '../context/VisitContext';

// Lista de presentaciones Chispa (Generados con IDs únicos)
const CHISPA_PRESENTATIONS: ChispaPresentation[] = [
  { id: uuidv4(), name: 'GRAN MARQUES PREMIUM 1KG' },
  { id: uuidv4(), name: 'DON JULIAN TIPO 1 1KG' },
  { id: uuidv4(), name: 'GRAN MARQUES GOURMET 900G' },
  { id: uuidv4(), name: 'GRAN MARQUES SELECTO 850G' },
  { id: uuidv4(), name: 'DON JULIAN TIPO 2 1kG' },
  { id: uuidv4(), name: 'SIN STOCK' }, // Esta es la entrada "SIN STOCK"
];

type VisitScreenProps = StackScreenProps<AppStackParamList, 'Visit'>;

const VisitScreen: React.FC<VisitScreenProps> = ({ navigation }) => {
  const {
    currentCommerceId,
    productEntries: initialProductEntries,
    updateProductEntries,
    markSectionComplete,
    resetVisit,
  } = useVisit();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productPrice, setProductPrice] = useState<string>('');
  // Nuevo estado para la moneda
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'VES'>('USD'); // Valor por defecto: Dólar
  const [shelfStock, setShelfStock] = useState<string>('');
  const [generalStock, setGeneralStock] = useState<string>('');
  const [collectedProductEntries, setCollectedProductEntries] = useState<ProductVisitEntry[]>(initialProductEntries);

  // NUEVO ESTADO: Para controlar si "SIN STOCK" está seleccionado
  const [isSinStockSelected, setIsSinStockSelected] = useState<boolean>(false);

  useEffect(() => {
    setCollectedProductEntries(initialProductEntries);
  }, [initialProductEntries]);

  // Cargar detalles del comercio al montar la pantalla o cambiar currentCommerceId
  useEffect(() => {
    const fetchCommerceDetails = async () => {
      try {
        if (!currentCommerceId) {
          console.warn('ID de comercio no proporcionado a VisitScreen desde el contexto. Redirigiendo.');
          Alert.alert('Error de Sesión', 'No se pudo determinar el comercio actual. Por favor, reinicia la visita.', [
            { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
          ]);
          return;
        }
        const storedCommerces = await getCommerces();
        const foundCommerce = storedCommerces.find(c => c.id === currentCommerceId);
        if (foundCommerce) {
          setCommerce(foundCommerce);
        } else {
          console.warn('Comercio no encontrado en VisitScreen para ID:', currentCommerceId);
          Alert.alert('Error de Sesión', 'El comercio no se encontró. Por favor, selecciona un comercio nuevamente.', [
            { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
          ]);
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio en VisitScreen:', error);
        Alert.alert('Error', 'Hubo un problema al cargar los detalles del comercio.', [
          { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
        ]);
      } finally {
        setIsLoadingCommerce(false);
      }
    };

    fetchCommerceDetails();
  }, [currentCommerceId, navigation, resetVisit]);

  // Función para el botón "< Volver" en la esquina superior
  const handleBackToVisitItems = useCallback(() => {
    updateProductEntries(collectedProductEntries); // Guarda temporalmente
    if (currentCommerceId) {
      navigation.navigate('VisitItems', { commerceId: currentCommerceId });
    } else {
      Alert.alert('Error de Sesión', 'El comercio actual no está definido. Por favor, reinicia la visita.', [
        { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
      ]);
    }
  }, [navigation, currentCommerceId, collectedProductEntries, updateProductEntries, resetVisit]);

  // Función para el nuevo botón "Ir a Items de Visita" (parte inferior)
  const handleGoToVisitItems = useCallback(() => {
    updateProductEntries(collectedProductEntries); // Guarda temporalmente
    if (currentCommerceId) {
      navigation.navigate('VisitItems', { commerceId: currentCommerceId });
    } else {
      Alert.alert('Error de Sesión', 'El comercio actual no está definido. Por favor, reinicia la visita.', [
        { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
      ]);
    }
  }, [navigation, currentCommerceId, collectedProductEntries, updateProductEntries, resetVisit]);

  const handleAddProductEntry = () => {
    if (!selectedProductId) {
      Alert.alert('Error', 'Por favor, selecciona una presentación Chispa.');
      return;
    }

    const selectedProduct = CHISPA_PRESENTATIONS.find(
      (p) => p.id === selectedProductId
    );

    if (!selectedProduct) {
      Alert.alert('Error interno', 'Presentación Chispa seleccionada no válida.');
      return;
    }

    let parsedPrice: number | null = null;
    let parsedShelfStock: number | null = null;
    let parsedGeneralStock: number | null = null;

    // LÓGICA DE VALIDACIÓN: Excepción para "SIN STOCK"
    if (selectedProduct.name === 'SIN STOCK') {
      // Si es "SIN STOCK", los campos de precio y stock se guardan como null
      parsedPrice = null;
      parsedShelfStock = null;
      parsedGeneralStock = null;
    } else {
      // Para cualquier otra presentación, aplicamos la validación normal
      if (!productPrice.trim() || !shelfStock.trim() || !generalStock.trim()) {
        Alert.alert('Error', 'Por favor, completa todos los campos (precio, stock anaqueles, stock general).');
        return;
      }

      parsedPrice = parseFloat(productPrice.replace(',', '.'));
      parsedShelfStock = parseInt(shelfStock, 10);
      parsedGeneralStock = parseInt(generalStock, 10);

      if (isNaN(parsedPrice) || parsedPrice < 0 ||
        isNaN(parsedShelfStock) || parsedShelfStock < 0 ||
        isNaN(parsedGeneralStock) || parsedGeneralStock < 0) {
        Alert.alert('Error', 'Por favor, ingresa valores numéricos válidos y no negativos para precio y stocks.');
        return;
      }
    }

    const newEntry: ProductVisitEntry = {
      productId: selectedProductId,
      productName: selectedProduct.name,
      price: parsedPrice, // Puede ser null si es SIN STOCK
      currency: selectedCurrency, // ¡Añadimos la moneda aquí!
      shelfStock: parsedShelfStock, // Puede ser null si es SIN STOCK
      generalStock: parsedGeneralStock, // Puede ser null si es SIN STOCK
    };

    const existingEntryIndex = collectedProductEntries.findIndex(
      (entry) => entry.productId === newEntry.productId
    );

    let updatedEntries: ProductVisitEntry[];
    if (existingEntryIndex > -1) {
      updatedEntries = [...collectedProductEntries];
      updatedEntries[existingEntryIndex] = newEntry;
      Alert.alert('Actualizado', `"${newEntry.productName}" ha sido actualizado.`);
    } else {
      updatedEntries = [...collectedProductEntries, newEntry];
      Alert.alert('Añadido', `Presentación "${newEntry.productName}" añadida.`);
    }
    setCollectedProductEntries(updatedEntries);

    // Reiniciar los estados de los campos después de añadir/actualizar
    setSelectedProductId(null);
    setProductPrice('');
    setSelectedCurrency('USD'); // Reiniciar la moneda a su valor por defecto
    setShelfStock('');
    setGeneralStock('');
    setIsSinStockSelected(false); // IMPORTANTE: Resetear el estado de "SIN STOCK"
  };

  // Función para el botón "Finalizar Sección Chispa y Continuar"
  const handleFinalizeSectionAndContinue = () => {
    if (collectedProductEntries.length === 0) {
      Alert.alert('Atención', 'Debes añadir al menos una presentación Chispa antes de continuar.');
      markSectionComplete('chispa', false);
      return;
    }

    updateProductEntries(collectedProductEntries);
    markSectionComplete('chispa', true);
    if (currentCommerceId) {
      navigation.navigate('Competitor', { commerceId: currentCommerceId }); // Navega a la siguiente sección
    } else {
      Alert.alert('Error de Sesión', 'El comercio actual no está definido. Por favor, reinicia la visita.', [
        { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
      ]);
    }
  };

  const renderProductEntryItem = ({ item }: { item: ProductVisitEntry }) => (
    <View style={styles.productEntryItem}>
      <Text style={styles.productEntryText}>** {item.productName} **</Text>
      {/* Mostrar la moneda junto al precio, y manejar 'null' */}
      <Text style={styles.productEntryDetail}>
        Precio: {item.price !== null ? `${item.currency === 'USD' ? '$' : 'BsF'} ${item.price.toFixed(2)}` : 'N/A'}
      </Text>
      <Text style={styles.productEntryDetail}>
        Anaqueles: {item.shelfStock !== null ? item.shelfStock : 'N/A'}
      </Text>
      <Text style={styles.productEntryDetail}>
        General: {item.generalStock !== null ? item.generalStock : 'N/A'}
      </Text>
    </View>
  );

  // Filtrar las presentaciones disponibles:
  // 1. Excluir las que ya están en collectedProductEntries.
  // 2. Si "SIN STOCK" ya está añadido, no lo mostramos en la lista.
  const availablePresentations = CHISPA_PRESENTATIONS.filter(
    (presentation) => {
      // Si es "SIN STOCK", solo la mostramos si aún no ha sido añadida
      if (presentation.name === 'SIN STOCK') {
        return !collectedProductEntries.some((entry) => entry.productName === 'SIN STOCK');
      }
      // Para cualquier otra presentación, la mostramos si no está ya en la lista de entradas recolectadas
      return !collectedProductEntries.some((entry) => entry.productId === presentation.id);
    }
  );


  if (isLoadingCommerce) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando información del comercio...</Text>
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
          <TouchableOpacity style={styles.backButton} onPress={handleBackToVisitItems}>
            <Text style={styles.backButtonText}>{'< Volver'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Productos Chispa para:</Text>
          <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
          {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registro de Presentaciones Chispa</Text>

          <Text style={styles.inputLabel}>Seleccionar Presentación *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProductId}
              onValueChange={(itemValue) => {
                setSelectedProductId(itemValue);
                // Buscar la presentación seleccionada para saber si es "SIN STOCK"
                const selected = CHISPA_PRESENTATIONS.find(p => p.id === itemValue);
                const isCurrentlySinStock = selected?.name === 'SIN STOCK';

                setIsSinStockSelected(isCurrentlySinStock); // Actualizar el nuevo estado

                // Limpiar campos o establecer valores predeterminados
                if (isCurrentlySinStock) {
                  setProductPrice('');
                  setSelectedCurrency('USD'); // Resetear a USD por defecto si es SIN STOCK
                  setShelfStock('');
                  setGeneralStock('');
                } else {
                  // Si no es SIN STOCK, aún así puedes limpiar los campos para una nueva entrada
                  setProductPrice('');
                  setSelectedCurrency('USD');
                  setShelfStock('');
                  setGeneralStock('');
                }
              }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="-- Selecciona una Presentación --" value={null} />
              {/* Usar las presentaciones disponibles */}
              {availablePresentations.map((presentation) => (
                <Picker.Item key={presentation.id} label={presentation.name} value={presentation.id} />
              ))}
            </Picker>
          </View>

          {selectedProductId && (
            <View>
              <Text style={styles.inputLabel}>Precio Venta *</Text>
              {/* Controles para seleccionar la moneda */}
              <View style={styles.currencyToggleContainer}>
                <TouchableOpacity
                  style={[styles.currencyButton, selectedCurrency === 'USD' && styles.currencyButtonSelected]}
                  onPress={() => setSelectedCurrency('USD')}
                  disabled={isSinStockSelected} // Deshabilitar si es SIN STOCK
                >
                  <Text style={[styles.currencyButtonText, selectedCurrency === 'USD' && styles.currencyButtonTextSelected, isSinStockSelected && { color: '#a0a0a0' }]}>$ USD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.currencyButton, selectedCurrency === 'VES' && styles.currencyButtonSelected]}
                  onPress={() => setSelectedCurrency('VES')}
                  disabled={isSinStockSelected} // Deshabilitar si es SIN STOCK
                >
                  <Text style={[styles.currencyButtonText, selectedCurrency === 'VES' && styles.currencyButtonTextSelected, isSinStockSelected && { color: '#a0a0a0' }]}>BsF VES</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, isSinStockSelected && styles.inputDisabled]} // Estilo para deshabilitar
                placeholder="Precio de venta (ej. 12.50)"
                placeholderTextColor={isSinStockSelected ? '#c0c0c0' : '#999'}
                value={productPrice}
                onChangeText={setProductPrice}
                keyboardType="numeric"
                returnKeyType="done"
                editable={!isSinStockSelected} // Deshabilitar si es SIN STOCK
              />

              <Text style={styles.inputLabel}>Stock en Anaqueles *</Text>
              <TextInput
                style={[styles.input, isSinStockSelected && styles.inputDisabled]}
                placeholder="Unidades en anaqueles"
                placeholderTextColor={isSinStockSelected ? '#c0c0c0' : '#999'}
                value={shelfStock}
                onChangeText={setShelfStock}
                keyboardType="numeric"
                returnKeyType="done"
                editable={!isSinStockSelected} // Deshabilitar si es SIN STOCK
              />

              <Text style={styles.inputLabel}>Stock en Bodega *</Text>
              <TextInput
                style={[styles.input, isSinStockSelected && styles.inputDisabled]}
                placeholder="Unidades en inventario"
                placeholderTextColor={isSinStockSelected ? '#c0c0c0' : '#999'}
                value={generalStock}
                onChangeText={setGeneralStock}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleAddProductEntry}
                editable={!isSinStockSelected} // Deshabilitar si es SIN STOCK
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.addButton, !selectedProductId && styles.addButtonDisabled]}
            onPress={handleAddProductEntry}
            disabled={!selectedProductId}
          >
            <Text style={styles.addButtonText}>+ Añadir Presentación</Text>
          </TouchableOpacity>
        </View>

        {collectedProductEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Presentaciones Chispa Añadidas</Text>
            <FlatList
              data={collectedProductEntries}
              renderItem={renderProductEntryItem}
              keyExtractor={(item, index) => item.productId + index.toString()}
              contentContainerStyle={styles.collectedProductsList}
              scrollEnabled={false}
            />
          </View>
        )}

        <Text style={styles.infoText}>
            (Todos los datos aún no se han guardado definitivamente. Se guardarán al finalizar la visita.)
        </Text>

        <TouchableOpacity
          style={[styles.finalizeButton, collectedProductEntries.length === 0 && styles.finalizeButtonDisabled]}
          onPress={handleFinalizeSectionAndContinue}
          disabled={collectedProductEntries.length === 0}
        >
          <Text style={styles.finalizeButtonText}>Finalizar Sección Chispa y Continuar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.goToItemsButton}
          onPress={handleGoToVisitItems}
        >
          <Text style={styles.goToItemsButtonText}>Ir a Items de Visita</Text>
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
    marginBottom: 15,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  collectedProductsList: {
    marginTop: 10,
  },
  productEntryItem: {
    backgroundColor: '#e6f7ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#99d9ea',
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
  infoText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 10,
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
  // NUEVO ESTILO: Para campos deshabilitados
  inputDisabled: {
    backgroundColor: '#e0e0e0',
    color: '#a0a0a0',
  },
  // Nuevos estilos para los botones de moneda
  currencyToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  currencyButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  currencyButtonTextSelected: {
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: 'rgba(0, 123, 255, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonDisabled: {
    backgroundColor: '#a0c9f8',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  finalizeButton: {
    backgroundColor: '#28a745',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: 'rgba(40, 167, 69, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  finalizeButtonDisabled: {
    backgroundColor: '#90ee90',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  finalizeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  goToItemsButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: 'rgba(108, 117, 125, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  goToItemsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default VisitScreen;