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
  StatusBar,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { useVisit } from '../context/VisitContext';
import { Commerce, PhotoEntry } from '../types/data';
// import { getCommerces } from '../utils/storage'; // ✨ ELIMINAR ESTA IMPORTACIÓN ✨
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- CONSTANTES DE COLORES ---
const PRIMARY_BLUE_SOFT = '#E3F2FD';
const DARK_BLUE = '#1565C0';
const ACCENT_BLUE = '#2196F3';
const SUCCESS_GREEN = '#66BB6A';
const WARNING_ORANGE = '#FFCA28';
const TEXT_DARK = '#424242';
const TEXT_LIGHT = '#FFFFFF';
const BORDER_COLOR = '#BBDEFB';
const LIGHT_GRAY_BACKGROUND = '#F5F5F5';
const ERROR_RED = '#DC3545';
const PLACEHOLDER_GRAY = '#9E9E9E';
const DISABLED_GRAY = '#EEEEEE';
const DISABLED_TEXT_GRAY = '#B0B0B0';
const PHOTO_SECTION_BLUE = '#007bff';

type PhotoAndLocationScreenProps = StackScreenProps<AppStackParamList, 'PhotoAndLocation'>;

const PhotoAndLocationScreen: React.FC<PhotoAndLocationScreenProps> = ({ navigation }) => {
  const {
    currentCommerceId,
    currentCommerceName,
    currentCommerceAddress, // ✨ Asegúrate de que esta propiedad exista en VisitContext ✨
    photos: contextPhotos,
    addPhoto,
    markSectionComplete,
    resetVisit,
  } = useVisit();

  // Ya no necesitamos un estado `commerce` local, ni `isLoadingCommerce` para esto
  // La información del comercio ahora proviene directamente del contexto.

  const photoBeforeUri = contextPhotos.find(p => p.type === 'before')?.uri || null;
  const photoAfterUri = contextPhotos.find(p => p.type === 'after')?.uri || null;

  // ✨ Eliminar este useEffect para cargar detalles del comercio, ya no es necesario ✨
  // useEffect(() => {
  //   const fetchCommerceDetails = async () => {
  //     try {
  //       if (!currentCommerceId) {
  //         Alert.alert('Error de Sesión', 'No se pudo determinar el comercio actual. Por favor, reinicia la visita.', [
  //           { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
  //         ]);
  //         return;
  //       }
  //       const storedCommerces = await getCommerces(); // ✨ ESTO ES LO QUE YA NO DEBEMOS USAR ✨
  //       const foundCommerce = storedCommerces.find(c => c.id === currentCommerceId);
  //       if (foundCommerce) {
  //         setCommerce(foundCommerce);
  //       } else {
  //         Alert.alert('Error de Sesión', 'El comercio no se encontró. Por favor, selecciona un comercio nuevamente.', [
  //           { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
  //         ]);
  //       }
  //     } catch (error) {
  //       console.error('Error al cargar detalles del comercio:', error);
  //       Alert.alert('Error', 'Hubo un problema al cargar los detalles del comercio.', [
  //         { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
  //       ]);
  //     } finally {
  //       setIsLoadingCommerce(false);
  //     }
  //   };
  //   fetchCommerceDetails();
  // }, [currentCommerceId, navigation, resetVisit]);


  // Solicitar permisos de cámara al montar (esto sigue siendo válido)
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert('Permisos de cámara', 'Necesitamos permisos de cámara para tomar fotos.');
      }
    })();
  }, []);

  // Lógica para marcar la sección como completa o incompleta
  useEffect(() => {
    const hasBothPhotos = !!(photoBeforeUri && photoAfterUri);
    markSectionComplete('photos_location', hasBothPhotos);
  }, [photoBeforeUri, photoAfterUri, markSectionComplete]);


  // Lógica para volver a la pantalla de ítems de visita (Botón "Volver")
  const handleBackToVisitItems = useCallback(() => {
    if (currentCommerceId) {
      navigation.goBack();
    } else {
      Alert.alert('Error de Sesión', 'El comercio actual no está definido. Por favor, reinicia la visita.', [
        { text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }
      ]);
    }
  }, [navigation, currentCommerceId, resetVisit]);

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
        const timestamp = new Date().toISOString();

        const newPhotoEntry: PhotoEntry = {
          uri: newPhotoUri,
          timestamp: timestamp,
          type: type,
        };

        addPhoto(newPhotoEntry);
        Alert.alert('Foto tomada', `La foto de ${type === 'before' ? 'antes' : 'después'} ha sido registrada.`);
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleSaveSectionAndNavigate = useCallback(() => {
    const hasBothPhotos = !!(photoBeforeUri && photoAfterUri);

    if (hasBothPhotos) {
      Alert.alert('Sección Guardada', 'Las fotos han sido registradas. Puedes continuar con la visita.');
      if (currentCommerceId) {
        navigation.goBack();
      }
    } else {
      let errorMessage = 'Aún faltan elementos para completar esta sección:\n';
      if (!photoBeforeUri) errorMessage += '- Foto de Antes\n';
      if (!photoAfterUri) errorMessage += '- Foto de Después\n';

      Alert.alert('Progreso Incompleto', errorMessage.trim());
    }
  }, [photoBeforeUri, photoAfterUri, navigation, currentCommerceId]);


  // ✨ Ya no necesitamos isLoadingCommerce, verificamos directamente si tenemos el ID del comercio ✨
  if (!currentCommerceId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DARK_BLUE} />
        <Text style={styles.loadingText}>Verificando información del comercio...</Text>
        <Text style={styles.loadingText}>Si esto persiste, por favor, reinicia la visita.</Text>
      </View>
    );
  }

  // La sección se considera completa si ambas fotos están presentes.
  const isSectionFullyComplete = (!!photoBeforeUri && !!photoAfterUri);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 }} />
        <TouchableOpacity style={styles.backButton} onPress={handleBackToVisitItems}>
          <Icon name="arrow-left" size={28} color={TEXT_LIGHT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fotos para:</Text>
        <Text style={styles.commerceName}>{currentCommerceName || 'Comercio Desconocido'}</Text>
        {currentCommerceAddress && <Text style={styles.commerceAddress}>{currentCommerceAddress}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Captura de Fotos</Text>

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

      <TouchableOpacity
        style={[styles.finalizeButton, !isSectionFullyComplete && styles.finalizeButtonDisabled, styles.centeredButton]}
        onPress={handleSaveSectionAndNavigate}
        disabled={!isSectionFullyComplete}
      >
        <Text style={[styles.finalizeButtonText, styles.buttonTextCentered]}>Guardar Fotos y Continuar</Text>
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
    backgroundColor: PRIMARY_BLUE_SOFT,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE_SOFT,
  },
  loadingText: {
    fontSize: 18,
    color: TEXT_DARK,
    marginTop: 10,
    textAlign: 'center', // Centrar el texto para una mejor visualización
  },
  header: {
    backgroundColor: PHOTO_SECTION_BLUE,
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
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginTop: 5,
  },
  commerceName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginTop: 5,
    textAlign: 'center',
  },
  commerceAddress: {
    fontSize: 16,
    color: BORDER_COLOR,
    marginTop: 5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: LIGHT_GRAY_BACKGROUND,
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
    color: DARK_BLUE,
    marginBottom: 15,
    textAlign: 'center',
  },
  photoTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TEXT_DARK,
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'left',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 5,
  },
  button: {
    backgroundColor: ACCENT_BLUE,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  buttonText: {
    color: TEXT_LIGHT,
    fontSize: 18,
    fontWeight: 'bold',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    minHeight: 120,
    alignItems: 'center',
    backgroundColor: TEXT_LIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    margin: 5,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  placeholderText: {
    fontSize: 16,
    color: PLACEHOLDER_GRAY,
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 15,
    color: ERROR_RED,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    color: TEXT_DARK,
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  finalizeButton: {
    backgroundColor: SUCCESS_GREEN,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  finalizeButtonDisabled: {
    backgroundColor: DISABLED_GRAY,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  finalizeButtonText: {
    color: TEXT_LIGHT,
    fontSize: 20,
    fontWeight: 'bold',
  },
  goToItemsButton: {
    backgroundColor: DARK_BLUE,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: 'rgba(0,0,0, 0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  goToItemsButtonText: {
    color: TEXT_LIGHT,
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