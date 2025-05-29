// src/screens/VisitItemsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce, Visit } from '../types/data';
import { getCommerces, saveVisit } from '../utils/storage';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useVisit } from '../context/VisitContext';

type VisitItemsScreenProps = StackScreenProps<AppStackParamList, 'VisitItems'>;

type ScreensThatNeedCommerceId = 'Visit' | 'Competitor' | 'PhotoAndLocation';

const VisitItemsScreen: React.FC<VisitItemsScreenProps> = ({ navigation, route }) => {
  const { commerceId } = route.params;

  const {
    currentCommerceId,
    setCurrentCommerceId,
    visitSections,
    productEntries,
    competitorEntries,
    photos,
    location,
    markSectionComplete,
    finalizeVisit,
    resetVisit,
  } = useVisit();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true);

  useEffect(() => {
    const fetchCommerceDetails = async () => {
      try {
        if (commerceId) {
          setCurrentCommerceId(commerceId);
          const storedCommerces = await getCommerces();
          const foundCommerce = storedCommerces.find(c => c.id === commerceId);
          if (foundCommerce) {
            setCommerce(foundCommerce);
            markSectionComplete('info_general', true);
          } else {
            console.warn('Comercio no encontrado para ID:', commerceId);
            Alert.alert('Error', 'El comercio seleccionado no se encontró.', [
              { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
            ]);
          }
        } else {
          console.warn('ID de comercio no proporcionado. Redirigiendo.');
          Alert.alert('Error de Sesión', 'No se pudo determinar el comercio actual. Por favor, selecciona un comercio nuevamente.', [
            { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
          ]);
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio en VisitItems:', error);
        Alert.alert('Error', 'Hubo un problema al cargar los detalles del comercio.', [
          { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
        ]);
      } finally {
        setIsLoadingCommerce(false);
      }
    };

    fetchCommerceDetails();
  }, [commerceId, navigation, setCurrentCommerceId, markSectionComplete, resetVisit]);

  const getSectionIconColor = useCallback((sectionName: keyof typeof visitSections) => {
    return visitSections[sectionName] ? '#28a745' : '#6c757d';
  }, [visitSections]);

  const navigateToSection = useCallback((screenName: ScreensThatNeedCommerceId) => {
    if (!currentCommerceId) {
      Alert.alert('Error de Sesión', 'El comercio actual no está definido. Por favor, reinicia la visita.', [
        { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
      ]);
      return;
    }
    navigation.navigate(screenName, { commerceId: currentCommerceId });
  }, [navigation, currentCommerceId, resetVisit]);

  const handleFinalizeVisit = async () => {
    const allSectionsComplete = visitSections.info_general &&
                                 visitSections.chispa &&
                                 visitSections.competitor &&
                                 visitSections.photos_location;

    if (!allSectionsComplete) {
      Alert.alert(
        'Visita Incompleta',
        'Por favor, asegúrate de completar todas las secciones antes de finalizar la visita. Debes tener información general, productos Chispa, productos de la competencia y al menos dos fotos y la ubicación registradas.'
      );
      return;
    }

    if (!currentCommerceId || !commerce) {
      Alert.alert('Error', 'Datos de comercio no disponibles para finalizar la visita.');
      return;
    }

    if (!location || photos.length < 2) {
      Alert.alert('Error', 'Faltan datos de ubicación o fotos. Por favor, completa la sección de Fotos y Ubicación.');
      return;
    }

    try {
      await finalizeVisit();
      Alert.alert('Éxito', 'Visita guardada correctamente.');
      navigation.popToTop();
    } catch (error) {
      console.error('Error al guardar la visita:', error);
      Alert.alert('Error', 'No se pudo guardar la visita. Inténtalo de nuevo.');
    }
  };

  // --- NUEVA FUNCIÓN PARA CANCELAR LA VISITA ---
  const handleCancelVisit = useCallback(() => {
    Alert.alert(
      'Confirmar Cancelación',
      '¿Estás seguro de que quieres cancelar la visita actual? Se perderá todo el progreso no guardado.',
      [
        {
          text: 'No, continuar',
          style: 'cancel',
        },
        {
          text: 'Sí, cancelar',
          onPress: () => {
            resetVisit(); // Limpia todos los datos de la visita en el contexto
            navigation.replace('CommerceList'); // Regresa a la lista de comercios
          },
          style: 'destructive',
        },
      ]
    );
  }, [resetVisit, navigation]);

  if (isLoadingCommerce) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando información del comercio...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'< Volver'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visitando:</Text>
        <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
        {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Secciones de la Visita</Text>

        {/* Sección Productos Chispa */}
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => navigateToSection('Visit')}
        >
          <Icon
            name="cube-scan"
            size={40}
            color={getSectionIconColor('chispa')}
            style={styles.itemIcon}
          />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>Productos Chispa</Text>
            <Text style={styles.itemDescription}>
              Registro de precios y stock de productos Chispa.
            </Text>
          </View>
          <Icon
            name="chevron-right"
            size={30}
            color="#6c757d"
          />
        </TouchableOpacity>

        {/* Sección Competencia */}
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => navigateToSection('Competitor')}
        >
          <Icon
            name="account-group"
            size={40}
            color={getSectionIconColor('competitor')}
            style={styles.itemIcon}
          />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>Competencia</Text>
            <Text style={styles.itemDescription}>
              Registro de precios de la competencia.
            </Text>
          </View>
          <Icon
            name="chevron-right"
            size={30}
            color="#6c757d"
          />
        </TouchableOpacity>

        {/* Sección Fotos y Ubicación */}
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => navigateToSection('PhotoAndLocation')}
        >
          <Icon
            name="camera-marker"
            size={40}
            color={getSectionIconColor('photos_location')}
            style={styles.itemIcon}
          />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemTitle}>Fotos y Ubicación</Text>
            <Text style={styles.itemDescription}>
              Captura de fotos y registro de ubicación de la visita
            </Text>
          </View>
          <Icon
            name="chevron-right"
            size={30}
            color="#6c757d"
          />
        </TouchableOpacity>

        {/* Botón Finalizar Visita */}
        <TouchableOpacity
          style={[
            styles.finalizeVisitButton,
            !(visitSections.info_general &&
              visitSections.chispa &&
              visitSections.competitor &&
              visitSections.photos_location)
              ? styles.finalizeVisitButtonDisabled
              : {},
            styles.centeredButton
          ]}
          onPress={handleFinalizeVisit}
          disabled={
            !(visitSections.info_general &&
              visitSections.chispa &&
              visitSections.competitor &&
              visitSections.photos_location)
          }
        >
          <Text style={[styles.finalizeVisitButtonText, styles.buttonTextCentered]}>Finalizar y Guardar Visita Completa</Text>
        </TouchableOpacity>

        {/* --- NUEVO BOTÓN: CANCELAR VISITA --- */}
        <TouchableOpacity
          style={[styles.cancelVisitButton, styles.centeredButton]}
          onPress={handleCancelVisit}
        >
          <Text style={[styles.cancelVisitButtonText, styles.buttonTextCentered]}>Cancelar Visita</Text>
        </TouchableOpacity>
        {/* ------------------------------------- */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#e9eff4',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
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
    marginTop: 10,
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
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemIcon: {
    marginRight: 15,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  finalizeVisitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: 'rgba(0, 123, 255, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  finalizeVisitButtonDisabled: {
    backgroundColor: '#a0c9f8',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  finalizeVisitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    // Mantén el textAlign: 'center' aquí o usa buttonTextCentered
  },
  centeredButton: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 350,
    minWidth: 200,
  },
  buttonTextCentered: {
    textAlign: 'center',
  },
  // --- NUEVOS ESTILOS PARA EL BOTÓN CANCELAR ---
  cancelVisitButton: {
    backgroundColor: '#dc3545', // Rojo para "Cancelar"
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15, // Un poco de espacio respecto al botón de finalizar
    shadowColor: 'rgba(220, 53, 69, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelVisitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    // Mantén el textAlign: 'center' aquí o usa buttonTextCentered
  },
});

export default VisitItemsScreen;