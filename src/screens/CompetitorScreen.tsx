// src/screens/CompetitorScreen.tsx
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
import { Commerce, CompetitorProduct, CompetitorVisitEntry, ProductVisitEntry } from '../types/data';
import { getCommerces } from '../utils/storage';
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useVisit } from '../context/VisitContext';
import { useIsFocused } from '@react-navigation/native';

// Lista de productos de la competencia (Generados con IDs únicos)
const COMPETITOR_PRODUCTS: CompetitorProduct[] = [
  { id: uuidv4(), name: 'AGUA BLANCA TIPO 1 kg' },
  { id: uuidv4(), name: 'ALVARIGUA TIPO 1 900g' },
  { id: uuidv4(), name: 'AMANECER TIPO 1 800g' },
  { id: uuidv4(), name: 'ARAURIGUA TIPO 1 1kg' },
  { id: uuidv4(), name: 'CANTA CLARO TIPO 1 1kg' },
  { id: uuidv4(), name: 'CHAIRA TIPO 1 1kg' },
  { id: uuidv4(), name: 'DIANA TIPO 1 1kg' },
  { id: uuidv4(), name: 'DON PACO TIPO 1 900g' },
  { id: uuidv4(), name: 'DOÑA ALICIA TIPO 1 1kg' },
  { id: uuidv4(), name: 'DOÑA EMILIA TIPO 1 1kg' },
  { id: uuidv4(), name: 'EL TITAN TIPO 1 1kg' },
  { id: uuidv4(), name: 'ELITE PREMIUM 1kg' },
  { id: uuidv4(), name: 'ELITE CLÁSICO 900g' },
  { id: uuidv4(), name: 'EMI TIPO 1 900g' },
  { id: uuidv4(), name: 'ESPIGA DORADA TIPO 1 1kg' },
  { id: uuidv4(), name: 'FAVORITO TIPO 1 900g' },
  { id: uuidv4(), name: 'GLORIA TIPO 1 1kg' },
  { id: uuidv4(), name: 'GLORIA CLÁSICO 1kg' },
  { id: uuidv4(), name: 'INNOVA TIPO 1 1kg' },
  { id: uuidv4(), name: 'KIARA TIPO 1 1kg' },
  { id: uuidv4(), name: 'LA CONQUISTA CLÁSICO 1kg' },
  { id: uuidv4(), name: 'LA ESPERANZA TIPO 1 900g' },
  { id: uuidv4(), name: 'LA LUCHA TIPO 1 kg' },
  { id: uuidv4(), name: 'LA MOLIENDA TIPO 1 1kg' },
  { id: uuidv4(), name: 'LLANO VERDE TIPO 1 1kg' },
  { id: uuidv4(), name: 'LUISANA TIPO 1 900g' },
  { id: uuidv4(), name: 'LUISANA PREMIUM 1kg' },
  { id: uuidv4(), name: 'MARY SUPERIOR 1kg' },
  { id: uuidv4(), name: 'MARY TRADICIONAL 900g' },
  { id: uuidv4(), name: 'MISIFU TIPO 1 1kg' },
  { id: uuidv4(), name: 'MONICA TIPO 1 900g' },
  { id: uuidv4(), name: 'PANTERA TIPO 1 1kg' },
  { id: uuidv4(), name: 'PRIMOR TRADICIONAL 1kg' },
  { id: uuidv4(), name: 'SABROZON TIPO 1 1kg' },
  { id: uuidv4(), name: 'SANTONI PREMIUM 900g' },
  { id: uuidv4(), name: 'SANTONI EXCELENTE 800g' },
  { id: uuidv4(), name: 'ZENI TIPO 1 900g' },
  { id: uuidv4(), name: 'KIANA TIPO 1 900g' },
  { id: uuidv4(), name: 'MASIA PREMIUM 1kg' },
  { id: uuidv4(), name: 'AGUA BLANCA DIAMANTE 900g' },
  { id: uuidv4(), name: 'DOÑA ALICIA PLATINUM 1kg' },
  { id: uuidv4(), name: 'MARY ESMERALDA 1kg' },
  { id: uuidv4(), name: 'MARY DORADO 1kg' },
  { id: uuidv4(), name: 'MARY BIO 1kg' },
  { id: uuidv4(), name: 'PRIMOR CLÁSICO SUPERIOR 1kg' },
  { id: uuidv4(), name: 'PRIMOR PERLADO 900g' },
  { id: uuidv4(), name: 'SANTONI ZAFIRO 1kg' },
  { id: uuidv4(), name: 'MASIA CLÁSICA 1kg' },
  { id: uuidv4(), name: 'LUISANA SUPREMO 1kg' },
  { id: uuidv4(), name: 'ELITE SELECTO 1kg' },
];

type CompetitorScreenProps = StackScreenProps<AppStackParamList, 'Competitor'>;

const CompetitorScreen: React.FC<CompetitorScreenProps> = ({ navigation }) => {
  const {
    currentCommerceId,
    productEntries, // <--- Importante: `productEntries` viene del contexto aquí.
    competitorEntries: initialCompetitorEntries,
    updateCompetitorEntries,
    markSectionComplete,
    resetVisit,
  } = useVisit();

  const isFocused = useIsFocused();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true);
  const [selectedCompetitorProductId, setSelectedCompetitorProductId] = useState<string | null>(null);
  const [competitorPrice, setCompetitorPrice] = useState<string>('');
  const [selectedCompetitorCurrency, setSelectedCompetitorCurrency] = useState<'USD' | 'VES'>('USD');
  const [collectedCompetitorEntries, setCollectedCompetitorEntries] = useState<CompetitorVisitEntry[]>(initialCompetitorEntries);

  useEffect(() => {
    setCollectedCompetitorEntries(initialCompetitorEntries);
  }, [initialCompetitorEntries]);

  useEffect(() => {
    if (isFocused && !currentCommerceId) {
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

    const fetchCommerceDetails = async () => {
      try {
        if (currentCommerceId) {
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
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio en CompetitorScreen:', error);
        Alert.alert('Error', 'Hubo un problema al cargar los detalles del comercio.', [
          { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } },
        ]);
      } finally {
        setIsLoadingCommerce(false);
      }
    };

    if (currentCommerceId) {
      fetchCommerceDetails();
    } else {
      setIsLoadingCommerce(false);
    }
  }, [isFocused, currentCommerceId, navigation, resetVisit]);

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

    const selectedCompetitorProduct = COMPETITOR_PRODUCTS.find(
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

    setSelectedCompetitorProductId(null);
    setCompetitorPrice('');
    setSelectedCompetitorCurrency('USD');
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
    navigation.navigate('PhotoAndLocation', { commerceId: currentCommerceId });
  };

  // --- CORRECCIÓN EN renderProductEntryItem DENTRO DE CompetitorScreen.tsx ---
  // Esta función es la que renderiza las entradas de productos Chispa
  // Y es donde se estaba produciendo el error con .toFixed en valores null.
  const renderProductEntryItem = ({ item }: { item: ProductVisitEntry }) => (
    <View style={styles.productEntryItem}>
      <Text style={styles.productEntryText}>** {item.productName} **</Text>
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
  // --- FIN DE CORRECCIÓN PARA renderProductEntryItem ---

  // Esta función renderiza las entradas de productos de la Competencia (no afectadas por el error de Chispa)
  const renderCompetitorEntryItem = ({ item }: { item: CompetitorVisitEntry }) => (
    <View style={styles.competitorEntryItem}>
      <Text style={styles.competitorEntryText}>** {item.productName} **</Text>
      <Text style={styles.competitorEntryDetail}>Precio: {item.currency === 'USD' ? '$' : 'BsF'} {item.price.toFixed(2)}</Text>
    </View>
  );

  if (!currentCommerceId || isLoadingCommerce) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
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
          <Text style={styles.headerTitle}>Competencia para:</Text>
          <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
          {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Presentaciones Chispa Recopiladas</Text>
          {productEntries.length === 0 ? (
            <Text style={styles.noDataText}>No se recopiló ninguna presentación Chispa.</Text>
          ) : (
            <FlatList
              data={productEntries}
              renderItem={renderProductEntryItem} // <-- Usa la función corregida aquí
              keyExtractor={(item, index) => item.productId + index.toString()}
              contentContainerStyle={styles.collectedProductsList}
              scrollEnabled={false}
            />
          )}
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
              {COMPETITOR_PRODUCTS.map((competitor) => (
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
                placeholderTextColor="#999"
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
    backgroundColor: '#ffc107',
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
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  commerceName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
  commerceAddress: {
    fontSize: 16,
    color: '#555',
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
  competitorEntryItem: {
    backgroundColor: '#ffe6e6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffb3b3',
  },
  competitorEntryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  competitorEntryDetail: {
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
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
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
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: 'rgba(220, 53, 69, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonDisabled: {
    backgroundColor: '#ffb3b3',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  finalizeButton: {
    backgroundColor: '#007bff',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: 'rgba(0, 123, 255, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  finalizeButtonDisabled: {
    backgroundColor: '#a0c9f8',
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
    width: '100%',
  },
  goToItemsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centeredButton: {
    alignSelf: 'center',
    maxWidth: 350,
    minWidth: 200,
  },
  buttonTextCentered: {
    textAlign: 'center',
  },
});

export default CompetitorScreen;