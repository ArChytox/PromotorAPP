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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce } from '../types/data';
import { getCommerces } from '../utils/storage'; // No necesitamos saveCommerces aquí

type CommerceListScreenNavigationProp = StackNavigationProp<
  AppStackParamList,
  'CommerceList'
>;

interface CommerceListScreenProps {
  navigation: CommerceListScreenNavigationProp;
}

const CommerceListScreen: React.FC<CommerceListScreenProps> = ({ navigation }) => {
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadCommerces = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedCommerces = await getCommerces();
      setCommerces(storedCommerces);
    } catch (error) {
      console.error('Error al cargar comercios:', error);
      Alert.alert('Error', 'No se pudieron cargar los comercios.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCommerces();
      return () => {
        // Lógica de limpieza si es necesaria al desenfocar
      };
    }, [loadCommerces])
  );

  const handleAddCommerce = () => {
    navigation.navigate('AddEditCommerce', undefined);
  };

  // NUEVA FUNCIÓN para navegar a Mis Visitas
  const handleGoToMyVisits = () => {
    navigation.navigate('MyVisits');
  };

  const handleSelectCommerce = (commerce: Commerce) => {
    // Al seleccionar un comercio, ahora navegamos a la pantalla de visita
    navigation.navigate('Visit', { commerceId: commerce.id });
  };

  const renderCommerceItem = ({ item }: { item: Commerce }) => (
    <TouchableOpacity style={styles.commerceItem} onPress={() => handleSelectCommerce(item)}>
      <Text style={styles.commerceName}>{item.name}</Text>
      <Text style={styles.commerceAddress}>{item.address}</Text>
      <Text style={styles.commerceCategory}>{item.category}</Text>
      {item.phone && <Text style={styles.commercePhone}>Tel: {item.phone}</Text>}
    </TouchableOpacity>
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
      <Text style={styles.headerTitle}>Lista de Comercios</Text>
      {commerces.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Text style={styles.emptyListText}>No hay comercios registrados aún.</Text>
          <Text style={styles.emptyListSubText}>¡Empieza añadiendo uno nuevo!</Text>
        </View>
      ) : (
        <FlatList
          data={commerces}
          renderItem={renderCommerceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Contenedor para los botones de añadir y ver visitas */}
      <View style={styles.buttonContainer}> 
        <TouchableOpacity style={styles.addButton} onPress={handleAddCommerce}>
          <Text style={styles.addButtonText}>+ Añadir Nuevo Comercio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.myVisitsButton} onPress={handleGoToMyVisits}>
          <Text style={styles.myVisitsButtonText}>Mis Visitas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Ajusta para el espacio de los botones
  },
  emptyListText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyListSubText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 150, // Aumenta el padding para dar espacio a los dos botones fijos
  },
  commerceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
  },
  commerceAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  commerceCategory: {
    fontSize: 12,
    color: '#007bff',
    marginTop: 5,
    fontStyle: 'italic',
  },
  commercePhone: {
    fontSize: 14,
    color: '#444',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  // Contenedor para ambos botones en la parte inferior
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'column', // Apilarlos verticalmente
    gap: 10, // Espacio entre los botones
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    width: '100%', // Que ocupe todo el ancho disponible en el contenedor
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // NUEVOS ESTILOS para el botón "Mis Visitas"
  myVisitsButton: {
    backgroundColor: '#6c757d', // Un color gris para distinguirlo
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    width: '100%',
  },
  myVisitsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CommerceListScreen;