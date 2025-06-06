import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce, CompetitorProduct, CompetitorVisitEntry } from '../types/data';
import { getCommerces } from '../utils/storage';
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useVisit } from '../context/VisitContext';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Asegúrate de tener este paquete instalado: npm install react-native-vector-icons
import { supabase } from '../services/supabase';

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

type CompetitorScreenProps = StackScreenProps<AppStackParamList, 'Competitor'>;

const CompetitorScreen: React.FC<CompetitorScreenProps> = ({ navigation }) => {
  const {
    currentCommerceId,
    competitorEntries: initialCompetitorEntries,
    updateCompetitorEntries,
    markSectionComplete,
    resetVisit,
  } = useVisit();

  const isFocused = useIsFocused();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true);
  const [competitorProducts, setCompetitorProducts] = useState<CompetitorProduct[]>([]);
  const [isLoadingCompetitorProducts, setIsLoadingCompetitorProducts] = useState<boolean>(true);

  const [showOverlayLoading, setShowOverlayLoading] = useState<boolean>(true);

  const [selectedCompetitorProductId, setSelectedCompetitorProductId] = useState<string | null>(null);
  const [competitorPrice, setCompetitorPrice] = useState<string>('');
  const [selectedCompetitorCurrency, setSelectedCompetitorCurrency] = useState<'USD' | 'VES'>('USD');
  const [collectedCompetitorEntries, setCollectedCompetitorEntries] = useState<CompetitorVisitEntry[]>(initialCompetitorEntries);

  // Sincroniza el estado local con el del contexto cuando el contexto cambie
  useEffect(() => {
    console.log('DEBUG CompetitorScreen: initialCompetitorEntries actualizados en effect:', initialCompetitorEntries.length);
    setCollectedCompetitorEntries(initialCompetitorEntries);
  }, [initialCompetitorEntries]);

  // Cargar detalles del comercio
  useEffect(() => {
    const fetchCommerceDetails = async () => {
      try {
        if (!currentCommerceId) {
          console.warn('ID de comercio no proporcionado a CompetitorScreen. Redirigiendo a CommerceList.');
          Alert.alert('Error de Sesión', 'No se pudo determinar el comercio actual. Por favor, reinicia la visita.', [
            {
              text: 'OK',
              onPress: () => {
                resetVisit();
                navigation.replace('CommerceList');
              },
            },
          ]);
          return;
        }

        const storedCommerces = await getCommerces();
        const foundCommerce = storedCommerces.find(c => c.id === currentCommerceId);
        if (foundCommerce) {
          setCommerce(foundCommerce);
        } else {
          console.warn('Comercio no encontrado en CompetitorScreen para ID:', currentCommerceId);
          Alert.alert('Error de Sesión', 'El comercio no se encontró. Por favor, selecciona un comercio nuevamente.', [
            { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } },
          ]);
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio en CompetitorScreen:', error);
        Alert.alert('Error', 'Hubo un problema al cargar los detalles del comercio.', [
          { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } },
        ]);
      } finally {
        setIsLoadingCommerce(false);
        if (!isLoadingCompetitorProducts) {
          setShowOverlayLoading(false);
        }
      }
    };

    if (isFocused && currentCommerceId) {
      fetchCommerceDetails();
    } else if (!currentCommerceId) {
      setIsLoadingCommerce(false);
      setShowOverlayLoading(false);
    }
  }, [isFocused, currentCommerceId, navigation, resetVisit, isLoadingCompetitorProducts]);

  // Cargar productos de competencia desde Supabase
  useEffect(() => {
    const fetchCompetitorProducts = async () => {
      setIsLoadingCompetitorProducts(true);
      const { data, error } = await supabase
        .from('competitor_products')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error al cargar productos de competencia desde Supabase:', error);
        Alert.alert('Error de Carga', 'No se pudieron cargar los productos de la competencia. Por favor, inténtalo de nuevo.');
      } else {
        setCompetitorProducts(data || []);
      }
      setIsLoadingCompetitorProducts(false);
      if (!isLoadingCommerce) {
        setShowOverlayLoading(false);
      }
    };

    fetchCompetitorProducts();
  }, [isLoadingCommerce]);

  const handleBackToVisitItems = useCallback(() => {
    updateCompetitorEntries(collectedCompetitorEntries);
    if (currentCommerceId) {
      navigation.navigate('VisitItems', { commerceId: currentCommerceId });
    } else {
      console.warn('Fallback: currentCommerceId es nulo en handleBackToVisitItems, redirigiendo.');
      resetVisit();
      navigation.replace('CommerceList');
    }
  }, [navigation, currentCommerceId, collectedCompetitorEntries, updateCompetitorEntries, resetVisit]);

  const handleGoToVisitItems = useCallback(() => {
    updateCompetitorEntries(collectedCompetitorEntries);
    if (currentCommerceId) {
      navigation.navigate('VisitItems', { commerceId: currentCommerceId });
    } else {
      console.warn('Fallback: currentCommerceId es nulo en handleGoToVisitItems, redirigiendo.');
      resetVisit();
      navigation.replace('CommerceList');
    }
  }, [navigation, currentCommerceId, collectedCompetitorEntries, updateCompetitorEntries, resetVisit]);

  const handleAddCompetitorEntry = () => {
    if (!selectedCompetitorProductId) {
      Alert.alert('Error', 'Por favor, selecciona un producto de la competencia.');
      return;
    }
    if (!competitorPrice.trim()) {
      Alert.alert('Error', 'Por favor, ingresa el precio del producto de la competencia.');
      return;
    }

    const parsedPrice = parseFloat(competitorPrice.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Error', 'Por favor, ingresa un precio numérico válido y no negativo.');
      return;
    }

    const selectedCompetitorProduct = competitorProducts.find(
      (p) => p.id === selectedCompetitorProductId
    );

    if (!selectedCompetitorProduct) {
      Alert.alert('Error interno', 'Producto de competencia seleccionado no válido.');
      return;
    }

    const newEntry: CompetitorVisitEntry = {
      productId: selectedCompetitorProductId,
      productName: selectedCompetitorProduct.name,
      price: parsedPrice,
      currency: selectedCompetitorCurrency,
    };

    const existingEntryIndex = collectedCompetitorEntries.findIndex(
      (entry) => entry.productId === newEntry.productId
    );

    let updatedEntries: CompetitorVisitEntry[];
    if (existingEntryIndex > -1) {
      updatedEntries = [...collectedCompetitorEntries];
      updatedEntries[existingEntryIndex] = newEntry;
      Alert.alert('Actualizado', `"${newEntry.productName}" de la competencia ha sido actualizado.`);
    } else {
      updatedEntries = [...collectedCompetitorEntries, newEntry];
      Alert.alert('Añadido', `Producto "${newEntry.productName}" de la competencia añadido.`);
    }
    setCollectedCompetitorEntries(updatedEntries);

    // Limpiar campos después de añadir
    setSelectedCompetitorProductId(null);
    setCompetitorPrice('');
    setSelectedCompetitorCurrency('USD');
  };

  // NUEVA FUNCIÓN: Eliminar una entrada de producto de la competencia
  const handleRemoveCompetitorEntry = (productIdToRemove: string) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que quieres eliminar esta entrada de producto de la competencia?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          onPress: () => {
            const updatedEntries = collectedCompetitorEntries.filter(
              (entry) => entry.productId !== productIdToRemove
            );
            setCollectedCompetitorEntries(updatedEntries);
            updateCompetitorEntries(updatedEntries); // Actualiza el contexto también
            Alert.alert('Eliminado', 'La entrada ha sido eliminada.');
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleFinalizeSectionAndContinue = () => {
    if (collectedCompetitorEntries.length === 0) {
      Alert.alert('Atención', 'Debes añadir al menos un producto de la competencia antes de continuar.');
      markSectionComplete('competitor', false);
      return;
    }

    if (!currentCommerceId) {
      Alert.alert('Error de Sesión', 'El comercio actual no está definido. Por favor, reinicia la visita.', [
        { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } },
      ]);
      return;
    }

    updateCompetitorEntries(collectedCompetitorEntries);
    markSectionComplete('competitor', true);
    navigation.navigate('VisitItems', { commerceId: currentCommerceId });
  };

  const renderCompetitorEntryItem = ({ item }: { item: CompetitorVisitEntry }) => (
    <View style={styles.competitorEntryItem}>
      <View style={styles.competitorEntryDetails}>
        <Text style={styles.competitorEntryText}>** {item.productName} **</Text>
        <Text style={styles.competitorEntryDetail}>Precio: {item.currency === 'USD' ? '$' : 'BsF'} {item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveCompetitorEntry(item.productId)}
        style={styles.deleteButton}
      >
        <Icon name="close-circle" size={28} color={ERROR_RED} />
      </TouchableOpacity>
    </View>
  );

  const availableCompetitorProducts = competitorProducts.filter(
    (product) => !collectedCompetitorEntries.some(entry => entry.productId === product.id)
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {showOverlayLoading && (
        <View style={styles.overlayLoadingContainer}>
          <ActivityIndicator size="large" color={DARK_BLUE} />
          <Text style={styles.overlayLoadingText}>Cargando...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToVisitItems}>
            <Text style={styles.backButtonText}>{'< Volver'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Competencia para:</Text>
          <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
          {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registro de Competencia</Text>

          <Text style={styles.inputLabel}>Seleccionar Producto Competencia *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCompetitorProductId}
              onValueChange={(itemValue) => {
                setSelectedCompetitorProductId(itemValue);
                setCompetitorPrice('');
                setSelectedCompetitorCurrency('USD');
              }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="-- Selecciona un Producto --" value={null} />
              {availableCompetitorProducts.map((competitor) => (
                <Picker.Item key={competitor.id} label={competitor.name} value={competitor.id} />
              ))}
            </Picker>
          </View>

          {selectedCompetitorProductId && (
            <View>
              <Text style={styles.inputLabel}>Precio Competencia *</Text>
              <View style={styles.currencyToggleContainer}>
                <TouchableOpacity
                  style={[styles.currencyButton, selectedCompetitorCurrency === 'USD' && styles.currencyButtonSelected]}
                  onPress={() => setSelectedCompetitorCurrency('USD')}
                >
                  <Text style={[styles.currencyButtonText, selectedCompetitorCurrency === 'USD' && styles.currencyButtonTextSelected]}>$ USD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.currencyButton, selectedCompetitorCurrency === 'VES' && styles.currencyButtonSelected]}
                  onPress={() => setSelectedCompetitorCurrency('VES')}
                >
                  <Text style={[styles.currencyButtonText, selectedCompetitorCurrency === 'VES' && styles.currencyButtonTextSelected]}>BsF VES</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Precio del producto de la competencia"
                placeholderTextColor={PLACEHOLDER_GRAY}
                value={competitorPrice}
                onChangeText={setCompetitorPrice}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleAddCompetitorEntry}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.addButton, !selectedCompetitorProductId && styles.addButtonDisabled]}
            onPress={handleAddCompetitorEntry}
            disabled={!selectedCompetitorProductId}
          >
            <Text style={styles.addButtonText}>+ Añadir Producto Competencia</Text>
          </TouchableOpacity>
        </View>

        {collectedCompetitorEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Productos de Competencia Añadidos</Text>
            <FlatList
              data={collectedCompetitorEntries}
              renderItem={renderCompetitorEntryItem}
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
          style={[styles.finalizeButton, collectedCompetitorEntries.length === 0 && styles.finalizeButtonDisabled, styles.centeredButton]}
          onPress={handleFinalizeSectionAndContinue}
          disabled={collectedCompetitorEntries.length === 0}
        >
          <Text style={[styles.finalizeButtonText, styles.buttonTextCentered]}>Finalizar Sección Competencia y Continuar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.goToItemsButton, styles.centeredButton]}
          onPress={handleGoToVisitItems}
        >
          <Text style={[styles.goToItemsButtonText, styles.buttonTextCentered]}>Ir a Items de Visita</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_BLUE_SOFT,
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
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: DARK_BLUE,
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
    color: TEXT_LIGHT,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginTop: 5,
  },
  commerceName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginTop: 5,
    textAlign: 'center',
  },
  commerceAddress: {
    fontSize: 16,
    color: BORDER_COLOR,
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
  noDataText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  collectedProductsList: {
    marginTop: 10,
  },
  competitorEntryItem: {
    backgroundColor: PRIMARY_BLUE_SOFT,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row', // Para alinear el texto y el botón
    justifyContent: 'space-between', // Para que el botón esté a la derecha
    alignItems: 'center', // Para centrar verticalmente
  },
  competitorEntryDetails: {
    flex: 1, // Para que los detalles ocupen el espacio restante
    marginRight: 10, // Espacio entre los detalles y el botón
  },
  competitorEntryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DARK_BLUE,
  },
  competitorEntryDetail: {
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  placeholderText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'center',
    paddingVertical: 10,
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
  pickerContainer: {
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: TEXT_LIGHT,
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
    color: TEXT_DARK,
  },
  pickerItem: {
    fontSize: 17,
    color: TEXT_DARK,
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
  addButtonDisabled: {
    backgroundColor: '#FFEBEE',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  addButtonText: {
    color: TEXT_DARK,
    fontSize: 19,
    fontWeight: 'bold',
  },
  finalizeButton: {
    backgroundColor: SUCCESS_GREEN,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  finalizeButtonDisabled: {
    backgroundColor: '#B2DFDB',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  finalizeButtonText: {
    color: TEXT_LIGHT,
    fontSize: 20,
    fontWeight: 'bold',
  },
  goToItemsButton: {
    backgroundColor: ACCENT_BLUE,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  centeredButton: {
    alignSelf: 'center',
    maxWidth: 350,
    minWidth: 200,
  },
  buttonTextCentered: {
    textAlign: 'center',
  },
  deleteButton: {
    padding: 5,
  },
});

export default CompetitorScreen;