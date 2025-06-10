import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { useVisit } from '../context/VisitContext';
import { dataService } from '../services/dataService';
import { CompetitorProduct, CompetitorVisitEntry } from '../types/data';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker'; // Importar el Picker

// --- CONSTANTES DE COLORES ---
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
const PLACEHOLDER_GRAY = '#9E9E9E';
const DISABLED_GRAY = '#EEEEEE';
const DISABLED_TEXT_GRAY = '#B0B0B0';

type CompetitorScreenProps = StackScreenProps<AppStackParamList, 'Competitor'>;

const CompetitorScreen: React.FC<CompetitorScreenProps> = ({ navigation }) => {
  const {
    competitorEntries: initialCompetitorEntries,
    updateCompetitorEntries,
    markSectionComplete, // Esta es la función correcta que debes usar
    // finalizeVisitSection, // ¡Esta línea debe eliminarse o comentarse!
    currentCommerceId,
    currentCommerceName,
    resetVisit,
  } = useVisit();

  const [availableCompetitorProducts, setAvailableCompetitorProducts] = useState<CompetitorProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [showOverlayLoading, setShowOverlayLoading] = useState<boolean>(true);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');

  const [collectedCompetitorEntries, setCollectedCompetitorEntries] = useState<CompetitorVisitEntry[]>(initialCompetitorEntries);

  useEffect(() => {
    setCollectedCompetitorEntries(initialCompetitorEntries);
  }, [initialCompetitorEntries]);

  useEffect(() => {
    const fetchCompetitorProducts = async () => {
      setLoadingProducts(true);
      try {
        const products = await dataService.getCompetitorProducts();
        setAvailableCompetitorProducts(products || []);
      } catch (error) {
        console.error("Error fetching competitor products:", error);
        Alert.alert("Error de Carga", "No se pudieron cargar los productos de la competencia. Intenta de nuevo.");
      } finally {
        setLoadingProducts(false);
        setShowOverlayLoading(false);
      }
    };
    fetchCompetitorProducts();
  }, []);

  // Usa este useEffect para marcar la sección como completa/incompleta basado en si hay entradas
  useEffect(() => {
    markSectionComplete('competitor', collectedCompetitorEntries.length > 0);
  }, [collectedCompetitorEntries, markSectionComplete]);

  const handleAddOrUpdateEntry = useCallback(() => {
    if (!selectedProductId) {
      Alert.alert('Selección Inválida', 'Por favor, selecciona un producto de la competencia.');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Precio Requerido', 'Por favor, introduce el precio del producto.');
      return;
    }

    const newPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(newPrice) || newPrice < 0) {
      Alert.alert('Precio Inválido', 'Por favor, introduce un precio numérico válido y no negativo.');
      return;
    }

    const product = availableCompetitorProducts.find(p => p.id === selectedProductId);

    if (!product) {
      Alert.alert('Error interno', 'Producto de competencia seleccionado no encontrado.');
      return;
    }

    const newEntry: CompetitorVisitEntry = {
      productId: product.id,
      productName: product.name,
      price: newPrice,
      currency: currency,
    };

    const existingEntryIndex = collectedCompetitorEntries.findIndex(
      entry => entry.productId === newEntry.productId
    );

    let updatedEntries: CompetitorVisitEntry[];
    if (existingEntryIndex > -1) {
      updatedEntries = [...collectedCompetitorEntries];
      updatedEntries[existingEntryIndex] = newEntry;
      Alert.alert('Actualizado', `"${newEntry.productName}" ha sido actualizado.`);
    } else {
      updatedEntries = [...collectedCompetitorEntries, newEntry];
      Alert.alert('Añadido', `Producto "${newEntry.productName}" añadido.`);
    }

    setCollectedCompetitorEntries(updatedEntries);
    updateCompetitorEntries(updatedEntries);

    setSelectedProductId(null);
    setPrice('');
    setCurrency('USD');
  }, [selectedProductId, price, currency, availableCompetitorProducts, collectedCompetitorEntries, updateCompetitorEntries]);

  const handleEditEntry = useCallback((entry: CompetitorVisitEntry) => {
    setSelectedProductId(entry.productId);
    setPrice(entry.price !== null ? entry.price.toString() : '');
    setCurrency(entry.currency);
  }, []);

  const handleDeleteEntry = useCallback((productId: string) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que quieres eliminar esta entrada de producto de competencia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          onPress: () => {
            const updatedEntries = collectedCompetitorEntries.filter(entry => entry.productId !== productId);
            setCollectedCompetitorEntries(updatedEntries);
            updateCompetitorEntries(updatedEntries);
            Alert.alert('Eliminado', 'La entrada ha sido eliminada.');
            if (selectedProductId === productId) {
              setSelectedProductId(null);
              setPrice('');
              setCurrency('USD');
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [collectedCompetitorEntries, updateCompetitorEntries, selectedProductId]);

  const renderCompetitorEntryItem = useCallback(({ item }: { item: CompetitorVisitEntry }) => (
    <View style={styles.productEntryItem}>
      <View style={styles.productEntryDetails}>
        <Text style={styles.productEntryText}>** {item.productName} **</Text>
        <Text style={styles.productEntryDetail}>
          Precio: {item.currency === 'USD' ? '$' : 'BsF'} {item.price.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteEntry(item.productId)}
        style={styles.deleteButton}
      >
        <Icon name="close-circle" size={28} color={ERROR_RED} />
      </TouchableOpacity>
    </View>
  ), [handleDeleteEntry]);

  const handleGoToVisitItems = useCallback(() => {
    if (currentCommerceId && currentCommerceName) {
      navigation.navigate('VisitItems', { commerceId: currentCommerceId, commerceName: currentCommerceName });
    } else {
      Alert.alert('Error de Sesión', 'El comercio actual o su nombre no están definidos. Por favor, reinicia la visita.', [{
        text: 'OK',
        onPress: () => {
          navigation.replace('CommerceList');
          resetVisit();
        }
      }]);
    }
  }, [navigation, currentCommerceId, currentCommerceName, resetVisit]);

  const handleFinalizeSection = useCallback(() => {
    if (collectedCompetitorEntries.length === 0) {
      Alert.alert(
        "Sección Vacía",
        "No has registrado ningún producto de competencia. ¿Deseas finalizar la sección de todos modos?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sí, Finalizar",
            onPress: () => {
              // *** CAMBIO CRÍTICO AQUÍ: Usamos markSectionComplete ***
              markSectionComplete('competitor', true); // Marcamos la sección 'competitor' como completa
              handleGoToVisitItems();
            },
            style: "destructive"
          },
        ]
      );
    } else {
      // *** CAMBIO CRÍTICO AQUÍ: Usamos markSectionComplete ***
      markSectionComplete('competitor', true); // Marcamos la sección 'competitor' como completa
      Alert.alert("Sección Completada", "Sección de productos de competencia finalizada.");
      handleGoToVisitItems();
    }
  }, [collectedCompetitorEntries, markSectionComplete, handleGoToVisitItems]); // Asegúrate de incluir markSectionComplete en las dependencias

  const productsToSelect = useMemo(() => {
    // Filtrar productos que no han sido añadidos a la lista collectedCompetitorEntries
    return availableCompetitorProducts.filter(
      (product) => !collectedCompetitorEntries.some(entry => entry.productId === product.id)
    );
  }, [availableCompetitorProducts, collectedCompetitorEntries]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {showOverlayLoading && loadingProducts && (
        <View style={styles.overlayLoadingContainer}>
          <ActivityIndicator size="large" color={DARK_BLUE} />
          <Text style={styles.overlayLoadingText}>Cargando productos de competencia...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoToVisitItems}>
            <Text style={styles.backButtonText}>{'< Volver'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Productos de la Competencia</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registro de Productos de la Competencia</Text>
          <Text style={styles.sectionDescription}>
            Selecciona un producto de la competencia y registra su precio.
          </Text>

          {loadingProducts ? (
            <ActivityIndicator size="large" color={DARK_BLUE} style={styles.loadingIndicator} />
          ) : (
            <>
              <Text style={styles.inputLabel}>Seleccionar Producto de Competencia *</Text>
              <View style={styles.pickerContainer}>
                {productsToSelect.length === 0 && collectedCompetitorEntries.length === availableCompetitorProducts.length ? (
                  <Text style={styles.noProductsText}>Todos los productos disponibles ya han sido añadidos.</Text>
                ) : productsToSelect.length === 0 && collectedCompetitorEntries.length === 0 ? (
                  <Text style={styles.noProductsText}>No hay productos de competencia disponibles para seleccionar.</Text>
                ) : (
                  <Picker
                    selectedValue={selectedProductId}
                    onValueChange={(itemValue: string | null) => {
                      setSelectedProductId(itemValue);
                      setPrice(''); // Limpiar el precio al seleccionar un nuevo producto
                      setCurrency('USD'); // Restablecer moneda por defecto
                      // Si el producto ya está añadido, cargar sus datos para editar
                      const existingEntry = collectedCompetitorEntries.find(entry => entry.productId === itemValue);
                      if (existingEntry) {
                        handleEditEntry(existingEntry);
                      }
                    }}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="-- Selecciona un producto --" value={null} enabled={false} style={{ color: PLACEHOLDER_GRAY }} />
                    {productsToSelect.map((product) => (
                      <Picker.Item key={product.id} label={product.name} value={product.id} />
                    ))}
                    
                 
                    {collectedCompetitorEntries.map((entry) => {
                      const product = availableCompetitorProducts.find(p => p.id === entry.productId);
                      if (product) {
                        return (
                          <Picker.Item
                            key={product.id}
                            label={`${product.name} (Editando)`} // Indicador para edición
                            value={product.id}
                            style={{ color: ACCENT_BLUE, fontWeight: 'bold' }} // Estilo para resaltar
                          />
                        );
                      }
                      return null;
                    })}
                  </Picker>
                )}
              </View>

              {selectedProductId && (
                <>
                  <Text style={styles.inputLabel}>Precio Producto *</Text>
                  <View style={styles.currencyToggleContainer}>
                    <TouchableOpacity
                      style={[styles.currencyButton, currency === 'USD' && styles.currencyButtonSelected]}
                      onPress={() => setCurrency('USD')}
                    >
                      <Text style={[styles.currencyButtonText, currency === 'USD' && styles.currencyButtonTextSelected]}>$ USD</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.currencyButton, currency === 'VES' && styles.currencyButtonSelected]}
                      onPress={() => setCurrency('VES')}
                    >
                      <Text style={[styles.currencyButtonText, currency === 'VES' && styles.currencyButtonTextSelected]}>BsF VES</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Precio del producto"
                    placeholderTextColor={PLACEHOLDER_GRAY}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                    returnKeyType="done"
                    onSubmitEditing={handleAddOrUpdateEntry}
                  />

                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddOrUpdateEntry}
                  >
                    <Text style={styles.addButtonText}>
                      {collectedCompetitorEntries.some(entry => entry.productId === selectedProductId) ? 'Actualizar Precio' : 'Agregar Producto'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {collectedCompetitorEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Productos de Competencia Registrados</Text>
            <FlatList
              data={collectedCompetitorEntries}
              renderItem={renderCompetitorEntryItem}
              keyExtractor={(item) => item.productId}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.noDataText}>No hay productos de competencia registrados.</Text>}
            />
          </View>
        )}

        <Text style={styles.infoText}>
          (Todos los datos aún no se han guardado definitivamente. Se guardarán al finalizar la visita.)
        </Text>

        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity
            style={[styles.finalizeButton, collectedCompetitorEntries.length === 0 && styles.finalizeButtonDisabled]}
            onPress={handleFinalizeSection}
            disabled={loadingProducts} // Deshabilitar si se están cargando los productos
          >
            <Text style={styles.finalizeButtonText}>Finalizar Sección Competencia</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.goToItemsButton}
            onPress={handleGoToVisitItems}
          >
            <Text style={styles.goToItemsButtonText}>Ir a Items de Visita</Text>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  overlayLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(227, 242, 253, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayLoadingText: {
    fontSize: 16,
    color: TEXT_DARK,
    marginTop: 10,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: DARK_BLUE,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 15,
  },
  backButton: {
    position: 'absolute',
    left: 10,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 15,
    padding: 5,
  },
  backButtonText: {
    color: TEXT_LIGHT,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginTop: 5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: LIGHT_GRAY_BACKGROUND,
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
    color: DARK_BLUE,
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 16,
    color: TEXT_DARK,
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  inputLabel: {
    width: '100%',
    textAlign: 'left',
    marginBottom: 5,
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: '600',
    marginTop: 10,
  },
  pickerContainer: { // Estilos para el contenedor del Picker
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: TEXT_LIGHT,
    overflow: 'hidden', // Asegura que los bordes del picker sean redondeados
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  picker: {
    height: 55, // Altura consistente con el input
    width: '100%',
    color: TEXT_DARK, // Color del texto del Picker
  },
  pickerItem: {
    fontSize: 17, // Tamaño de fuente para los ítems
    color: TEXT_DARK,
  },
  noProductsText: {
    textAlign: 'center',
    color: DISABLED_TEXT_GRAY,
    fontSize: 16,
    paddingVertical: 20,
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
  currencyToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    backgroundColor: LIGHT_GRAY_BACKGROUND,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
  },
  currencyButtonSelected: {
    backgroundColor: ACCENT_BLUE,
    borderColor: ACCENT_BLUE,
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEXT_DARK,
  },
  currencyButtonTextSelected: {
    color: TEXT_LIGHT,
  },
  addButton: {
    backgroundColor: WARNING_ORANGE,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: TEXT_DARK,
    fontSize: 19,
    fontWeight: 'bold',
  },
  productEntryItem: {
    backgroundColor: PRIMARY_BLUE_SOFT,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productEntryDetails: {
    flex: 1,
  },
  productEntryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DARK_BLUE,
    marginBottom: 5,
  },
  productEntryDetail: {
    fontSize: 15,
    color: TEXT_DARK,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 5,
  },
  noDataText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  bottomButtonsContainer: {
    flexDirection: 'column',
    marginTop: 20,
    gap: 15,
  },
  finalizeButton: {
    backgroundColor: DARK_BLUE,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  finalizeButtonDisabled: {
    backgroundColor: DISABLED_GRAY,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  finalizeButtonText: {
    color: TEXT_LIGHT,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  goToItemsButton: {
    backgroundColor: ACCENT_BLUE,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  goToItemsButtonText: {
    color: TEXT_LIGHT,
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CompetitorScreen;