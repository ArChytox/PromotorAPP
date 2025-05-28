// src/screens/CommerceSelectionScreen.tsx
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
import { getCommerces, saveCommerces } from '../utils/storage';

type CommerceSelectionScreenNavigationProp = StackNavigationProp<
  AppStackParamList,
  'CommerceSelection'
>;

interface CommerceSelectionScreenProps {
  navigation: CommerceSelectionScreenNavigationProp;
}

const CommerceSelectionScreen: React.FC<CommerceSelectionScreenProps> = ({ navigation }) => {
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
      <Text style={styles.headerTitle}>Seleccionar Comercio</Text>
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

      <TouchableOpacity style={styles.addButton} onPress={handleAddCommerce}>
        <Text style={styles.addButtonText}>+ Añadir Nuevo Comercio</Text>
      </TouchableOpacity>
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
    paddingBottom: 80,
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
    paddingBottom: 80,
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
  commercePhone: { // Nuevo estilo para el teléfono
    fontSize: 14,
    color: '#444',
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
});

export default CommerceSelectionScreen;