// src/screens/PhotoAndLocationScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { saveVisit, getCommerces } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { ProductVisitEntry, CompetitorVisitEntry, Visit, LocationData, Commerce } from '../types/data'; // Importa Commerce

type PhotoAndLocationScreenProps = StackScreenProps<
  AppStackParamList,
  'PhotoAndLocation'
>;

const PhotoAndLocationScreen: React.FC<PhotoAndLocationScreenProps> = ({
  navigation,
  route,
}) => {
  const { commerceId, productEntries, competitorEntries } = route.params;

  const [photoBeforeUri, setPhotoBeforeUri] = useState<string | null>(null);
  const [photoAfterUri, setPhotoAfterUri] = useState<string | null>(null);

  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [commerce, setCommerce] = useState<Commerce | null>(null); // Añade estado para el objeto Commerce
  const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true); // Nuevo estado de carga para el comercio


  // Mueve getLocationHandler ANTES del useEffect que lo llama
  const getLocationHandler = useCallback(async (): Promise<LocationData | null> => {
    setIsLoadingLocation(true);
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 1,
      });

      let city: string | undefined;
      try {
        const geocodedLocation = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocodedLocation && geocodedLocation.length > 0 && geocodedLocation[0].city) {
          city = geocodedLocation[0].city;
        } else if (geocodedLocation && geocodedLocation.length > 0 && geocodedLocation[0].subregion) {
          city = geocodedLocation[0].subregion;
        }
      } catch (geocodeError) {
        console.error('Error al obtener la información de la ciudad:', geocodeError);
        Alert.alert('Error de geocodificación', 'No se pudo obtener el nombre de la ciudad.');
        city = 'Desconocida';
      }

      const newLocationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        cityName: city,
      };
      setCurrentLocation(newLocationData);
      return newLocationData;
    } catch (error) {
      console.error('Error al obtener la ubicación principal:', error);
      Alert.alert(
        'Error de ubicación',
        'No se pudo obtener la ubicación actual. Asegúrate de tener el GPS activado.'
      );
      setCurrentLocation(null);
      return null;
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // --- COMIENZO DE LA LÓGICA DE CARGA DE COMERCIO Y PERMISOS ---
      try {
        const storedCommerces = await getCommerces();
        const foundCommerce = storedCommerces.find(c => c.id === commerceId);
        if (foundCommerce) {
          setCommerce(foundCommerce);
        } else {
          console.warn('Comercio no encontrado en PhotoAndLocationScreen.');
        }
      } catch (error) {
        console.error('Error al cargar detalles del comercio en PhotoAndLocationScreen:', error);
      } finally {
        setIsLoadingCommerce(false);
      }
      // --- FIN DE LA LÓGICA DE CARGA DE COMERCIO ---


      // Lógica de permisos
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'Permiso de cámara denegado',
          'Necesitamos acceso a tu cámara para tomar fotos.'
        );
      }

      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert(
          'Permiso de ubicación denegado',
          'Necesitamos acceso a tu ubicación para guardar los datos de la visita.'
        );
      }

      if (locationStatus === 'granted') {
        await getLocationHandler();
      }
    })();
  }, [commerceId, getLocationHandler]);

  const takePhoto = async (type: 'before' | 'after') => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Usamos MediaTypeOptions por compatibilidad
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      if (type === 'before') {
        setPhotoBeforeUri(result.assets[0].uri);
      } else {
        setPhotoAfterUri(result.assets[0].uri);
      }
    }
  };

  const handleSaveFinal = async () => {
    setIsSaving(true);
    let finalLocation: LocationData | null = currentLocation;

    try {
      if (!finalLocation) {
        finalLocation = await getLocationHandler();
      }

      if (!finalLocation) {
        Alert.alert(
          'Ubicación requerida',
          'No se pudo obtener la ubicación. Por favor, asegúrate de tener el GPS activado y los permisos concedidos.'
        );
        setIsSaving(false);
        return;
      }

      const finalVisitData: Visit = {
        id: uuidv4(),
        commerceId: commerceId,
        productEntries: productEntries,
        competitorEntries: competitorEntries,
        photoBeforeUri: photoBeforeUri || undefined,
        photoAfterUri: photoAfterUri || undefined,
        location: finalLocation,
        timestamp: new Date().toISOString(),
        promoterId: undefined,
      };

      await saveVisit(finalVisitData);

      Alert.alert('Éxito', 'Visita guardada correctamente.');
      navigation.popToTop();
    } catch (error) {
      console.error('Error al guardar la visita:', error);
      Alert.alert('Error', 'No se pudo guardar la visita.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scrollViewContainer} contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>{'< Volver'}</Text>
      </TouchableOpacity>

      {/* --- NUEVO ENCABEZADO CON ESTILOS SIMILARES AL COMPETITOR SCREEN --- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finalizar Visita para:</Text>
        {isLoadingCommerce ? (
          <Text style={styles.commerceName}>Cargando...</Text>
        ) : (
          <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
        )}
        {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
      </View>
      {/* --- FIN DEL NUEVO ENCABEZADO --- */}

      {/* Botón y preview para la foto ANTES */}
      <TouchableOpacity style={styles.button} onPress={() => takePhoto('before')} disabled={isSaving}>
        <Text style={styles.buttonText}>
          {photoBeforeUri ? 'Volver a Tomar Foto ANTES' : 'Tomar Foto ANTES'}
        </Text>
      </TouchableOpacity>
      {photoBeforeUri && <Image source={{ uri: photoBeforeUri }} style={styles.photoPreview} />}

      {/* Botón y preview para la foto DESPUÉS */}
      <TouchableOpacity style={styles.button} onPress={() => takePhoto('after')} disabled={isSaving}>
        <Text style={styles.buttonText}>
          {photoAfterUri ? 'Volver a Tomar Foto DESPUÉS' : 'Tomar Foto DESPUÉS'}
        </Text>
      </TouchableOpacity>
      {photoAfterUri && <Image source={{ uri: photoAfterUri }} style={styles.photoPreview} />}

      {/* Sección de Ubicación */}
      <TouchableOpacity
        style={styles.button}
        onPress={getLocationHandler}
        disabled={isLoadingLocation || isSaving}
      >
        {isLoadingLocation ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {currentLocation ? 'Ubicación Obtenida' : 'Obtener Ubicación'}
          </Text>
        )}
      </TouchableOpacity>
      {currentLocation && (
        <Text style={styles.locationText}>
          Ubicación: {currentLocation.latitude.toFixed(4)},{' '}
          {currentLocation.longitude.toFixed(4)}
          {currentLocation.cityName && `\nCiudad: ${currentLocation.cityName}`}
          {`\n(${new Date(currentLocation.timestamp).toLocaleTimeString()})`}
        </Text>
      )}

      {/* Botón de Guardar Final */}
      <TouchableOpacity
        style={styles.saveFinalButton}
        onPress={handleSaveFinal}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveFinalButtonText}>Guardar Visita</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 40, // Mantener padding superior para el ScrollView
    alignItems: 'center',
    paddingBottom: 40,
  },
  // --- NUEVOS ESTILOS DEL ENCABEZADO (Copiados y adaptados) ---
  header: {
    backgroundColor: '#ffc107', // Fondo amarillo para la pantalla final también
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative', // Para posicionar el backButton
    width: '100%', // Asegura que el header ocupe todo el ancho
  },
  backButton: {
    position: 'absolute',
    left: 10,
    top: 15,
    padding: 5,
    zIndex: 1, // Asegura que esté por encima del header
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
    textAlign: 'center', // Centrar el texto
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
  // --- FIN DE NUEVOS ESTILOS DEL ENCABEZADO ---

  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  photoPreview: {
    width: '80%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationText: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  saveFinalButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  saveFinalButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default PhotoAndLocationScreen;