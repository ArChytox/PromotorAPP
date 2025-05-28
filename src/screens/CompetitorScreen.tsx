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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/AppNavigator';
import { ProductVisitEntry, Commerce } from '../types/data';
import { getCommerces } from '../utils/storage'; // Para cargar el nombre del comercio

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
    navigation.goBack(); // Vuelve a VisitScreen
  };

  const handleGoToNextSection = () => {
    // Aquí navegarías a la siguiente pantalla en el flujo de la visita
    // Por ahora, solo un placeholder:
    Alert.alert('Siguiente Paso', 'Aquí iría la siguiente sección de la visita (ej: observaciones, inventario general, etc.)');
  };

  const renderProductEntryItem = ({ item }: { item: ProductVisitEntry }) => (
    <View style={styles.productEntryItem}>
      <Text style={styles.productEntryText}>** {item.productName} **</Text>
      <Text style={styles.productEntryDetail}>Precio: ${item.price.toFixed(2)}</Text>
      <Text style={styles.productEntryDetail}>Anaqueles: {item.shelfStock}</Text>
      <Text style={styles.productEntryDetail}>General: {item.generalStock}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
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
          <Text style={styles.sectionTitle}>Datos de Presentaciones Chispa Recopilados</Text>
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
          <Text style={styles.infoText}>
            (Estos datos aún no se han guardado. Se guardarán al finalizar la visita.)
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sección de Competencia (Próximamente)</Text>
          <Text style={styles.placeholderText}>
            Aquí añadirás los campos para registrar los datos de la competencia.
          </Text>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleGoToNextSection}>
          <Text style={styles.nextButtonText}>Continuar Visita {'>'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    backgroundColor: '#e6f7ff', // Un color claro para los items de la lista
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
  nextButton: {
    backgroundColor: '#007bff',
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
  nextButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
  },
});

export default CompetitorScreen;