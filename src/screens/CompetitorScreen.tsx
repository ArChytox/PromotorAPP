// src/screens/CompetitorScreen.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/AppNavigator';
import { ProductVisitEntry, Commerce, CompetitorProduct, CompetitorVisitEntry } from '../types/data';
import { getCommerces } from '../utils/storage';
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

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
  { id: uuidv4(), name: 'AGUA BLANCA TRADICIONAL 1kg' },
  { id: uuidv4(), name: 'ARAURIGUA TIPO 2 900g' },
  { id: uuidv4(), name: 'DOÑA FINA TIPO 2 1kg' },
  { id: uuidv4(), name: 'LA MOLIENDA TIPO 2 1kg' },
  { id: uuidv4(), name: 'EL TITAN TIPO 2 1kg' },
];

type CompetitorScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Competitor'>;
type CompetitorScreenRouteProp = RouteProp<AppStackParamList, 'Competitor'>;

interface CompetitorScreenProps {
  navigation: CompetitorScreenNavigationProp;
  route: CompetitorScreenRouteProp;
}

const CompetitorScreen: React.FC<CompetitorScreenProps> = ({ navigation, route }) => {
  const { commerceId, productEntries } = route.params;

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true);
  const [selectedCompetitorProductId, setSelectedCompetitorProductId] = useState<string | null>(null);
  const [competitorPrice, setCompetitorPrice] = useState<string>('');
  const [collectedCompetitorEntries, setCollectedCompetitorEntries] = useState<CompetitorVisitEntry[]>([]); // Estado para acumular entradas de competencia

  useEffect(() => {
    const fetchCommerceDetails = async () => {
      try {
        if (!commerceId) {
          console.warn('ID de comercio no proporcionado a CompetitorScreen.');
          return;
        }
        const storedCommerces = await getCommerces();
        const foundCommerce = storedCommerces.find(c => c.id === commerceId);
        if (foundCommerce) {
          setCommerce(foundCommerce);
        } else {
          console.warn('Comercio no encontrado en CompetitorScreen.');
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio en CompetitorScreen:', error);
      } finally {
        setIsLoadingCommerce(false);
      }
    };

    fetchCommerceDetails();
  }, [commerceId]);

  const handleGoBack = () => {
    Alert.alert(
      "Advertencia",
      "Si regresas ahora, los datos de competencia que hayas ingresado se perderán. ¿Deseas continuar?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Sí",
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

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
    };

    // Verificar si el producto ya fue añadido para evitar duplicados o actualizar
    const existingEntryIndex = collectedCompetitorEntries.findIndex(
      (entry) => entry.productId === newEntry.productId
    );

    if (existingEntryIndex > -1) {
      // Actualizar la entrada existente
      const updatedEntries = [...collectedCompetitorEntries];
      updatedEntries[existingEntryIndex] = newEntry;
      setCollectedCompetitorEntries(updatedEntries);
      Alert.alert('Actualizado', `"${newEntry.productName}" de la competencia ha sido actualizado.`);
    } else {
      // Añadir nueva entrada
      setCollectedCompetitorEntries((prevEntries) => [...prevEntries, newEntry]);
      Alert.alert('Añadido', `Producto "${newEntry.productName}" de la competencia añadido.`);
    }

    // Limpiar campos
    setSelectedCompetitorProductId(null);
    setCompetitorPrice('');
  };

  const handleFinalizeVisit = () => {
    // Navegar a la pantalla de fotos y ubicación, pasando TODOS los datos recopilados
    navigation.navigate('PhotoAndLocation', {
      commerceId: commerceId,
      productEntries: productEntries, // Datos de Chispa
      competitorEntries: collectedCompetitorEntries, // Datos de Competencia
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

  const renderCompetitorEntryItem = ({ item }: { item: CompetitorVisitEntry }) => (
    <View style={styles.competitorEntryItem}>
      <Text style={styles.competitorEntryText}>** {item.productName} **</Text>
      <Text style={styles.competitorEntryDetail}>Precio: ${item.price.toFixed(2)}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>{'< Volver'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Competencia para:</Text>
          {isLoadingCommerce ? (
            <Text style={styles.commerceName}>Cargando...</Text>
          ) : (
            <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
          )}
          {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Presentaciones Chispa Recopiladas</Text>
          {productEntries.length === 0 ? (
            <Text style={styles.noDataText}>No se recopiló ninguna presentación Chispa.</Text>
          ) : (
            <FlatList
              data={productEntries}
              renderItem={renderProductEntryItem}
              keyExtractor={(item, index) => item.productId + index}
              contentContainerStyle={styles.collectedProductsList}
              scrollEnabled={false} // Para que el ScrollView padre maneje el scroll
            />
          )}
        </View>

        {/* Sección para añadir productos de la competencia */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registro de Competencia</Text>

          <Text style={styles.inputLabel}>Seleccionar Producto Competencia *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCompetitorProductId}
              onValueChange={(itemValue) => {
                setSelectedCompetitorProductId(itemValue);
                setCompetitorPrice(''); // Limpiar precio al cambiar de producto
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

        {/* Sección para mostrar productos de la competencia añadidos */}
        {collectedCompetitorEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Productos de Competencia Añadidos</Text>
            <FlatList
              data={collectedCompetitorEntries}
              renderItem={renderCompetitorEntryItem}
              keyExtractor={(item, index) => item.productId + index}
              contentContainerStyle={styles.collectedProductsList}
              scrollEnabled={false}
            />
          </View>
        )}

        <Text style={styles.infoText}>
            (Todos los datos aún no se han guardado. Se guardarán al finalizar la visita.)
        </Text>

        {/* Botón para continuar a la siguiente sección (o guardar si es la última) */}
        <TouchableOpacity
          style={styles.finalizeButton}
          onPress={handleFinalizeVisit}
        >
          <Text style={styles.finalizeButtonText}>Continuar Tomar Foto </Text>
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
    backgroundColor: '#ffc107', // Un color diferente para esta pantalla
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
    backgroundColor: '#e6f7ff', // Un color claro para los items de la lista Chispa
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
    backgroundColor: '#ffe6e6', // Un color claro para los items de la lista de competencia
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
  addButton: {
    backgroundColor: '#dc3545', // Rojo para añadir competencia
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
    backgroundColor: '#007bff', // Azul para finalizar
    paddingVertical: 18,
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
  finalizeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default CompetitorScreen;