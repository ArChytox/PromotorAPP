// src/screens/PhotoAndLocationScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { useVisit } from '../context/VisitContext';
import { Commerce } from '../types/data';
import { getCommerces } from '../utils/storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import MapView, { Marker } from 'react-native-maps';
// Importa useIsFocused si aún no lo tienes (necesitas @react-navigation/native)
import { useIsFocused } from '@react-navigation/native'; 


type PhotoAndLocationScreenProps = StackScreenProps<AppStackParamList, 'PhotoAndLocation'>;

const PhotoAndLocationScreen: React.FC<PhotoAndLocationScreenProps> = ({ navigation }) => {
  const {
    currentCommerceId,
    photos: contextPhotos,
    updatePhotos,
    location: contextLocation,
    updateLocation,
    markSectionComplete,
    resetVisit,
  } = useVisit();

  const isFocused = useIsFocused(); // Hook para saber si la pantalla está enfocada

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(false);

  const [photoBeforeUri, setPhotoBeforeUri] = useState<string | null>(contextPhotos[0] || null);
  const [photoAfterUri, setPhotoAfterUri] = useState<string | null>(contextPhotos[1] || null);

  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  // Cargar detalles del comercio
  useEffect(() => {
    const fetchCommerceDetails = async () => {
      try {
        if (!currentCommerceId) {
          console.warn('ID de comercio no proporcionado. Redirigiendo.');
          Alert.alert('Error de Sesión', 'No se pudo determinar el comercio actual. Por favor, reinicia la visita.', [
            { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
          ]);
          return;
        }
        const storedCommerces = await getCommerces();
        const foundCommerce = storedCommerces.find(c => c.id === currentCommerceId);
        if (foundCommerce) {
          setCommerce(foundCommerce);
        } else {
          console.warn('Comercio no encontrado para ID:', currentCommerceId);
          Alert.alert('Error de Sesión', 'El comercio no se encontró. Por favor, selecciona un comercio nuevamente.', [
            { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
          ]);
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio:', error);
        Alert.alert('Error', 'Hubo un problema al cargar los detalles del comercio.', [
          { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
        ]);
      } finally {
        setIsLoadingCommerce(false);
      }
    };

    fetchCommerceDetails();
  }, [currentCommerceId, navigation, resetVisit]);

  // Sincronizar estados locales de fotos con el contexto cuando la pantalla se enfoca
  useEffect(() => {
    setPhotoBeforeUri(contextPhotos[0] || null);
    setPhotoAfterUri(contextPhotos[1] || null);
  }, [contextPhotos]);

  // Establecer región del mapa si ya hay una ubicación en el contexto
  useEffect(() => {
    if (contextLocation) {
      setMapRegion({
        latitude: contextLocation.latitude,
        longitude: contextLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [contextLocation]);

  // Solicitar permisos de cámara al montar
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos de cámara', 'Necesitamos permisos de cámara para tomar fotos.');
      }
    })();
  }, []);

  // --- NUEVO LOGICA PARA OBTENER UBICACIÓN AUTOMÁTICAMENTE SOLO CUANDO LA PANTALLA ESTÁ ENFOCADA Y NO HAY UBICACIÓN PREVIA ---
  const handleGetLocation = async () => {
    setIsLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos de Ubicación', 'Necesitamos permisos para acceder a tu ubicación. La visita no podrá ser guardada completamente sin ellos.');
        setIsLocationLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: new Date().toISOString(),
      };
      updateLocation(newLocation); // Actualizar el contexto directamente
      setMapRegion({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      Alert.alert('Ubicación Obtenida', 'La ubicación actual ha sido registrada.');

      const hasBothPhotos = !!(photoBeforeUri && photoAfterUri);
      if (hasBothPhotos) {
        markSectionComplete('photos_location', true);
      } else {
        markSectionComplete('photos_location', false);
      }
    } catch (error) {
      console.error('Error al obtener la ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación. Asegúrate de tener el GPS activado y/o conexión a internet. Intenta de nuevo.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Este useEffect disparará la geolocalización cuando la pantalla se enfoca
  // y solo si no hay una ubicación ya registrada en el contexto.
  useEffect(() => {
    if (isFocused && !contextLocation) {
      handleGetLocation();
    }
  }, [isFocused, contextLocation]); // Depende de si la pantalla está enfocada y si ya hay ubicación


  const handleBackToVisitItems = useCallback(() => {
    const hasBothPhotos = !!(photoBeforeUri && photoAfterUri);
    const hasLocation = !!contextLocation;
    
    markSectionComplete('photos_location', hasBothPhotos && hasLocation);

    if (currentCommerceId) {
      navigation.navigate('VisitItems', { commerceId: currentCommerceId });
    } else {
      Alert.alert('Error de Sesión', 'El comercio actual no está definido. Por favor, reinicia la visita.', [
        { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
      ]);
    }
  }, [navigation, currentCommerceId, resetVisit, photoBeforeUri, photoAfterUri, contextLocation, markSectionComplete]);

  const handleTakePhoto = async (type: 'before' | 'after') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotoUri = result.assets[0].uri;

        let updatedBeforeUri = photoBeforeUri;
        let updatedAfterUri = photoAfterUri;

        if (type === 'before') {
          setPhotoBeforeUri(newPhotoUri);
          updatedBeforeUri = newPhotoUri;
        } else {
          setPhotoAfterUri(newPhotoUri);
          updatedAfterUri = newPhotoUri;
        }

        const photosToUpdate: string[] = [];
        if (updatedBeforeUri) photosToUpdate.push(updatedBeforeUri);
        if (updatedAfterUri) photosToUpdate.push(updatedAfterUri);
        
        updatePhotos(photosToUpdate);
        
        Alert.alert('Foto tomada', `La foto de ${type === 'before' ? 'antes' : 'después'} ha sido registrada.`);

        const hasBothPhotos = !!(updatedBeforeUri && updatedAfterUri);
        const hasLocation = !!contextLocation;
        if (hasBothPhotos && hasLocation) {
            markSectionComplete('photos_location', true);
        } else {
            markSectionComplete('photos_location', false);
        }
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };


  const handleSaveSectionAndNavigate = useCallback(async () => {
    if (photoBeforeUri && photoAfterUri && contextLocation) {
        markSectionComplete('photos_location', true); 
        Alert.alert('Sección Guardada', 'Las fotos y la ubicación han sido registradas. Puedes continuar con la visita.');
        navigation.navigate('VisitItems', { commerceId: currentCommerceId ?? undefined });
    } else {
        Alert.alert('Progreso Incompleto', 'Aún faltan elementos para completar esta sección. Por favor, toma ambas fotos y registra la ubicación.');
        markSectionComplete('photos_location', false);
    }
  }, [photoBeforeUri, photoAfterUri, contextLocation, markSectionComplete, navigation, currentCommerceId]);


  if (isLoadingCommerce) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando información del comercio...</Text>
      </View>
    );
  }

  const isSectionFullyComplete = (photoBeforeUri && photoAfterUri && contextLocation);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToVisitItems}>
          <Text style={styles.backButtonText}>{'< Volver'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fotos y Ubicación para:</Text>
        <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
        {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Captura de Fotos</Text>
        
        {/* Sección de Foto Antes */}
        <Text style={styles.photoTypeTitle}>Foto Antes:</Text>
        <TouchableOpacity style={styles.button} onPress={() => handleTakePhoto('before')}>
          <Text style={styles.buttonText}>Tomar Foto (Antes)</Text>
        </TouchableOpacity>
        <View style={styles.photosContainer}>
          {photoBeforeUri ? (
            <Image source={{ uri: photoBeforeUri }} style={styles.thumbnail} />
          ) : (
            <Text style={styles.placeholderText}>No se ha tomado la foto de antes.</Text>
          )}
        </View>

        {/* Sección de Foto Después */}
        <Text style={styles.photoTypeTitle}>Foto Después:</Text>
        <TouchableOpacity style={styles.button} onPress={() => handleTakePhoto('after')}>
          <Text style={styles.buttonText}>Tomar Foto (Después)</Text>
        </TouchableOpacity>
        <View style={styles.photosContainer}>
          {photoAfterUri ? (
            <Image source={{ uri: photoAfterUri }} style={styles.thumbnail} />
          ) : (
            <Text style={styles.placeholderText}>No se ha tomado la foto de después.</Text>
          )}
        </View>

        {(!photoBeforeUri || !photoAfterUri) && (
            <Text style={styles.warningText}>
                Debes tomar **ambas fotos** (antes y después) para que esta sección se marque como completa.
            </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Registro de Ubicación</Text>
        {/* Este botón ahora solo es un indicador, no se usa para iniciar la obtención */}
        <View
          style={[styles.button, styles.disabledButton]} // Un estilo para "deshabilitar" visualmente
          // onPress={handleGetLocation} // Comentado o eliminado
          // disabled={true} // Deshabilitado porque es automático
        >
          {isLocationLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{contextLocation ? 'Ubicación Obtenida Automáticamente' : 'Obteniendo Ubicación Automáticamente...'}</Text>
          )}
        </View>
        {contextLocation ? (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>Latitud: {contextLocation.latitude.toFixed(6)}</Text>
            <Text style={styles.locationText}>Longitud: {contextLocation.longitude.toFixed(6)}</Text>
            <Text style={styles.locationText}>Timestamp: {new Date(contextLocation.timestamp).toLocaleString()}</Text>
            {mapRegion && (
              <MapView
                style={styles.map}
                region={mapRegion}
                showsUserLocation={true}
              >
                <Marker
                  coordinate={{ latitude: contextLocation.latitude, longitude: contextLocation.longitude }}
                  title="Ubicación de Visita"
                />
              </MapView>
            )}
          </View>
        ) : (
          <Text style={styles.placeholderText}>Esperando ubicación...</Text>
        )}
      </View>

      <Text style={styles.infoText}>
        (Esta sección registra las fotos y la ubicación. La visita completa se guarda en la pantalla final de resumen.)
      </Text>

      <TouchableOpacity
        style={[styles.finalizeButton, !isSectionFullyComplete && styles.finalizeButtonDisabled, styles.centeredButton]}
        onPress={handleSaveSectionAndNavigate}
        disabled={!isSectionFullyComplete}
      >
        <Text style={[styles.finalizeButtonText, styles.buttonTextCentered]}>Guardar Fotos y Ubicación</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.goToItemsButton, styles.centeredButton]}
        onPress={handleBackToVisitItems}
      >
        <Text style={[styles.goToItemsButtonText, styles.buttonTextCentered]}>Volver a Ítems de Visita</Text>
      </TouchableOpacity>

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
    backgroundColor: '#28a745', // Verde para Fotos y Ubicación
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
  photoTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'left',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: 'rgba(0, 123, 255, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Nuevo estilo para simular un botón deshabilitado visualmente
  disabledButton: {
    backgroundColor: '#a0c7e8', // Un color más claro para indicar que es automático
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    minHeight: 120,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 15,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  locationInfo: {
    marginTop: 15,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0faff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a0d9ff',
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  finalizeButton: {
    backgroundColor: '#28a745',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: 'rgba(40, 167, 69, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  finalizeButtonDisabled: {
    backgroundColor: '#90ee90',
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
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  goToItemsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
});

export default PhotoAndLocationScreen;