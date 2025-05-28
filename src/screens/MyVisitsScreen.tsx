// src/screens/MyVisitsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform, // Importar Platform para detectar el SO
  StatusBar, // Importar StatusBar
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Visit, Commerce } from '../types/data';
import { getVisits, getCommerces } from '../utils/storage';

type MyVisitsScreenProps = StackScreenProps<AppStackParamList, 'MyVisits'>;

const MyVisitsScreen: React.FC<MyVisitsScreenProps> = ({ navigation }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [commercesMap, setCommercesMap] = useState<Map<string, Commerce>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchVisitsAndCommerces = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedVisits = await getVisits();
      const storedCommerces = await getCommerces();

      const map = new Map<string, Commerce>();
      storedCommerces.forEach(c => map.set(c.id, c));
      setCommercesMap(map);

      setVisits(storedVisits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    } catch (error) {
      console.error('Error loading visits or commerces:', error);
      Alert.alert('Error', 'No se pudieron cargar las visitas o comercios.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitsAndCommerces();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchVisitsAndCommerces();
    });

    return unsubscribe;
  }, [fetchVisitsAndCommerces, navigation]);


  const renderVisitItem = ({ item }: { item: Visit }) => {
    const commerce = commercesMap.get(item.commerceId);
    const visitDate = new Date(item.timestamp);

    return (
      <View style={styles.visitItem}>
        <Text style={styles.visitCommerceName}>
          Visita a: **{commerce?.name || `Comercio ID: ${item.commerceId}`}**
        </Text>
        {commerce?.address && <Text style={styles.visitCommerceAddress}>{commerce.address}</Text>}
        <Text style={styles.visitDateTime}>
          Fecha: {visitDate.toLocaleDateString()} Hora: {visitDate.toLocaleTimeString()}
        </Text>
        {item.location && (
          <Text style={styles.visitLocation}>
            Ubicación: {item.location.cityName || 'Desconocida'} ({item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)})
          </Text>
        )}
        <Text style={styles.visitSummary}>
          Productos Chispa registrados: {item.productEntries.length}
        </Text>
        <Text style={styles.visitSummary}>
          Productos Competencia registrados: {item.competitorEntries.length}
        </Text>
        {item.photoBeforeUri && (
            <Text style={styles.photoIndicator}>✔ Foto ANTES</Text>
        )}
        {item.photoAfterUri && (
            <Text style={styles.photoIndicator}>✔ Foto DESPUÉS/</Text>        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando visitas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado de la pantalla con el título y el botón "Ir a Comercios" */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.goToCommercesButton}
          onPress={() => navigation.navigate('CommerceList')}
        >
          <Text style={styles.goToCommercesButtonText}>Ir a Comercios</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Visitas</Text>
      </View>

      {/* Mensaje si no hay visitas o la lista de visitas */}
      {visits.length === 0 ? (
        <View style={styles.noVisitsContainer}>
          <Text style={styles.noVisitsText}>Aún no hay visitas registradas.</Text>
          <TouchableOpacity
            style={styles.goToCommercesButtonNoVisits}
            onPress={() => navigation.navigate('CommerceList')}
          >
            <Text style={styles.goToCommercesButtonText}>Registrar Nueva Visita</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visits}
          renderItem={renderVisitItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
    marginTop: 10,
    fontSize: 18,
    color: '#555',
  },
  header: {
    backgroundColor: '#007bff',
    // Ajuste de paddingTop para considerar la barra de estado
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
    flexDirection: 'row', // Para que el botón y el título estén en la misma línea
    alignItems: 'center', // Alinea verticalmente
    justifyContent: 'space-between', // Distribuye los elementos (botón a izquierda, título a centro-derecha)
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1, // Para que el título ocupe el espacio restante y se pueda centrar
    textAlign: 'center', // Centra el título
    // Eliminar el marginLeft que lo empujaba
    marginRight: 60, // Añadir un margen a la derecha para equilibrar el botón de la izquierda si el título no es muy largo
  },
  goToCommercesButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    // Aseguramos que esté a la izquierda sin afectar el centrado del título
    marginRight: 10, // Pequeño margen a la derecha del botón
  },
  goToCommercesButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  noVisitsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noVisitsText: {
    textAlign: 'center',
    fontSize: 20,
    color: '#888',
    marginBottom: 20,
  },
  goToCommercesButtonNoVisits: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  listContent: {
    padding: 15,
  },
  visitItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  visitCommerceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  visitCommerceAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  visitDateTime: {
    fontSize: 13,
    color: '#888',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  visitLocation: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  visitSummary: {
    fontSize: 14,
    color: '#444',
    marginTop: 3,
  },
  photoIndicator: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 2,
    fontWeight: '600',
  }
});

export default MyVisitsScreen;