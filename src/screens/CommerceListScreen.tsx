// src/screens/CommerceListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce } from '../types/data';
import { getCommerces } from '../utils/storage';
import { useVisit } from '../context/VisitContext'; // Importar useVisit

type CommerceListScreenProps = StackScreenProps<AppStackParamList, 'CommerceList'>;

const CommerceListScreen: React.FC<CommerceListScreenProps> = ({ navigation }) => {
  // LLAMA A useVisit AQUÍ, AL PRINCIPIO DEL COMPONENTE
  const { setCurrentCommerceId, resetVisit, startNewVisit } = useVisit(); // Desestructura también startNewVisit

  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');

  const fetchCommerces = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedCommerces = await getCommerces();
      const sortedCommerces = storedCommerces.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setCommerces(sortedCommerces);
    } catch (error) {
      console.error('Error al cargar comercios:', error);
      Alert.alert('Error', 'No se pudieron cargar los comercios. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCommerces();
  }, [fetchCommerces]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCommerces();
    });
    return unsubscribe;
  }, [navigation, fetchCommerces]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCommerces();
  }, [fetchCommerces]);

  const handleStartVisit = useCallback(async (commerce: Commerce) => {
    console.log('DEBUG: Intentando iniciar visita para:', commerce.name, 'con ID:', commerce.id);

    Alert.alert(
      'Iniciar Visita',
      `¿Deseas iniciar una visita para ${commerce.name}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sí',
          onPress: async () => {
            try {
              // AHORA LLAMAS A startNewVisit DIRECTAMENTE, YA QUE FUE DESESTRUCTURADO AL PRINCIPIO
              const success = await startNewVisit(commerce.id);

              console.log('DEBUG: Resultado de startNewVisit:', success);

              if (success) {
                  console.log('DEBUG: Navegando a VisitItems con commerceId:', commerce.id);
                  navigation.navigate('VisitItems', { commerceId: commerce.id });
              } else {
                  console.log('DEBUG: startNewVisit devolvió false, mostrando alerta de error.');
                  Alert.alert('Error', 'No se pudo iniciar la visita.');
              }
            } catch (error) {
              console.error('DEBUG: Error inesperado al iniciar visita en handleStartVisit:', error);
              Alert.alert('Error crítico', 'Ocurrió un error inesperado al intentar iniciar la visita.');
            }
          },
        },
      ]
    );
  // Añade `startNewVisit` a las dependencias de useCallback
  }, [navigation, startNewVisit]);

  const handleGoToMyVisits = useCallback(() => {
    navigation.navigate('MyVisits');
  }, [navigation]);

  const handleAddCommerce = useCallback(() => {
    navigation.navigate('AddEditCommerce');
  }, [navigation]);

  const filteredCommerces = commerces.filter(commerce =>
    commerce.name.toLowerCase().includes(searchText.toLowerCase()) ||
    commerce.address.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderCommerceItem = ({ item }: { item: Commerce }) => (
    <View style={styles.commerceItem}>
      <Text style={styles.commerceName}>{item.name}</Text>
      <Text style={styles.commerceAddress}>{item.address}</Text>
      <Text style={styles.commerceDate}>
        Registrado: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Fecha desconocida'}
      </Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => handleStartVisit(item)}
      >
        <Text style={styles.startButtonText}>Iniciar Visita</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando comercios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Título Principal */}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>Lista de Comercios</Text>
      </View>

      {/* Botón Mis Visitas */}
      <TouchableOpacity style={styles.myVisitsButton} onPress={handleGoToMyVisits}>
        <Text style={styles.myVisitsButtonText}>Mis Visitas</Text>
      </TouchableOpacity>

      {/* Botón Agregar Comercio */}
      <TouchableOpacity style={styles.addCommerceButton} onPress={handleAddCommerce}>
        <Text style={styles.addCommerceButtonText}>+ Agregar Comercio</Text>
      </TouchableOpacity>

      {/* Campo de Búsqueda */}
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar comercio por nombre o dirección..."
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* Lista de Comercios */}
      {filteredCommerces.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyListContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.emptyListText}>No se encontraron comercios.</Text>
          <Text style={styles.emptyListSubText}>
            Tira hacia abajo para recargar o ajusta tu búsqueda.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredCommerces}
          renderItem={renderCommerceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor="#007bff" // Color del spinner en iOS
            colors={["#007bff"]} // Colores del spinner en Android
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e9eff4',
    paddingHorizontal: 20,
    paddingTop: 40,
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
  titleContainer: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  myVisitsButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    width: '100%',
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  myVisitsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addCommerceButton: {
    backgroundColor: '#ffc107',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    width: '100%',
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addCommerceButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInput: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 20,
  },
  commerceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commerceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  commerceAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  commerceDate: { // <-- Estilo para la fecha
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#ffc107',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 5,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  startButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  emptyListText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptyListSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default CommerceListScreen;