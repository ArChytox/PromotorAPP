import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// Importa los tipos que hemos definido y alineado con tu esquema de DB
import {
  ProductVisitEntry,
  CompetitorVisitEntry,
  PhotoEntry,
  LocationEntry,
  VisitSectionState,
} from '../types/data';
import { supabase } from '../services/supabase';

// --- FUNCIONES AUXILIARES PARA HORA LOCAL ---
// Función para formatear una fecha a una cadena ISO local sin el 'Z' o el offset.
// Esto asume que el Date objeto ya está en la hora local del dispositivo.
const getLocalDateTimeString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  // Formato: YYYY-MM-DDTHH:mm:ss.sss (sin Z y sin offset)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
};

// --- TIPOS DEL CONTEXTO ---
type VisitSectionsState = VisitSectionState;

interface VisitContextType {
  currentCommerceId: string | null;
  currentCommerceName: string | null;
  startVisitTimestamp: string | null;
  visitSections: VisitSectionsState;
  productEntries: ProductVisitEntry[];
  updateProductEntries: (entries: ProductVisitEntry[]) => void;
  competitorEntries: CompetitorVisitEntry[];
  updateCompetitorEntries: (entries: CompetitorVisitEntry[]) => void;
  photos: PhotoEntry[];
  addPhoto: (photo: PhotoEntry) => void;
  location: LocationEntry | null;
  updateLocation: (location: LocationEntry | null) => void;
  summaryNotes: string;
  updateSummaryNotes: (notes: string) => void;
  markSectionComplete: (sectionName: keyof VisitSectionsState, isComplete: boolean) => void;
  finalizeVisit: () => Promise<boolean>;
  resetVisit: () => void;
  startNewVisit: (commerceId: string, commerceName: string) => Promise<boolean>;
}

// --- ESTADOS INICIALES ---
const initialVisitSectionsState: VisitSectionsState = {
  info_general: 'pending',
  chispa: 'pending',
  competitor: 'pending',
  photos_location: 'pending',
  summary: 'pending',
};

// --- CREACIÓN DEL CONTEXTO ---
const VisitContext = createContext<VisitContextType | undefined>(undefined);

export const useVisit = () => {
  const context = useContext(VisitContext);
  if (!context) {
    throw new Error('useVisit debe ser usado dentro de un VisitProvider');
  }
  return context;
};

export const VisitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCommerceId, setCurrentCommerceId] = useState<string | null>(null);
  const [currentCommerceName, setCurrentCommerceName] = useState<string | null>(null);
  const [startVisitTimestamp, setStartVisitTimestamp] = useState<string | null>(null);
  const [visitSections, setVisitSections] = useState<VisitSectionsState>(initialVisitSectionsState);
  const [productEntries, setProductEntries] = useState<ProductVisitEntry[]>([]);
  const [competitorEntries, setCompetitorEntries] = useState<CompetitorVisitEntry[]>([]);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [location, setLocation] = useState<LocationEntry | null>(null);
  const [summaryNotes, setSummaryNotes] = useState<string>('');

  const [visitStartInfo, setVisitStartInfo] = useState<{ id: string; name: string; timestamp: string } | null>(null);

  // --- FUNCIONES DE ACTUALIZACIÓN ---
  const markSectionComplete = useCallback((sectionName: keyof VisitSectionsState, isComplete: boolean) => {
    console.log(`DEBUG: Marcando sección ${sectionName} como ${isComplete ? 'completa' : 'incompleta'}`);
    setVisitSections((prev) => ({
      ...prev,
      [sectionName]: isComplete ? 'completed' : 'pending',
    }));
  }, []);

  const updateProductEntries = useCallback((entries: ProductVisitEntry[]) => {
    console.log('DEBUG: Actualizando productEntries:', entries.length);
    setProductEntries(entries);
    markSectionComplete('chispa', entries.length > 0);
  }, [markSectionComplete]);

  const updateCompetitorEntries = useCallback((entries: CompetitorVisitEntry[]) => {
    console.log('DEBUG: Actualizando competitorEntries:', entries.length);
    setCompetitorEntries(entries);
    markSectionComplete('competitor', entries.length > 0);
  }, [markSectionComplete]);

  const addPhoto = useCallback((newPhoto: PhotoEntry) => {
    setPhotos(prevPhotos => {
      const existingIndex = prevPhotos.findIndex(p => p.type === newPhoto.type);
      if (existingIndex > -1) {
        const updatedPhotos = [...prevPhotos];
        updatedPhotos[existingIndex] = newPhoto;
        return updatedPhotos;
      }
      return [...prevPhotos, newPhoto];
    });
    console.log(`DEBUG: Foto de tipo '${newPhoto.type}' añadida/actualizada en contexto.`);
  }, []);

  const updateLocation = useCallback((newLocation: LocationEntry | null) => {
    console.log('DEBUG: Actualizando location:', newLocation ? 'presente' : 'nulo');
    setLocation(newLocation);
  }, []);

  const updateSummaryNotes = useCallback((notes: string) => {
    console.log('DEBUG: Actualizando summaryNotes. Longitud:', notes.length);
    setSummaryNotes(notes);
    markSectionComplete('summary', notes.trim().length > 0);
  }, [markSectionComplete]);

  const resetVisit = useCallback(() => {
    console.log('DEBUG: Reiniciando visita...');
    setCurrentCommerceId(null);
    setCurrentCommerceName(null);
    setStartVisitTimestamp(null);
    setVisitSections(initialVisitSectionsState);
    setProductEntries([]);
    setCompetitorEntries([]);
    setPhotos([]);
    setLocation(null);
    setSummaryNotes('');
    setVisitStartInfo(null);
  }, []);

  useEffect(() => {
    const handleVisitStart = async () => {
      if (visitStartInfo) {
        console.log(`DEBUG: Efecto de inicio de visita disparado para ${visitStartInfo.name} (${visitStartInfo.id})`);
        setCurrentCommerceId(visitStartInfo.id);
        setCurrentCommerceName(visitStartInfo.name);
        setStartVisitTimestamp(visitStartInfo.timestamp);
        markSectionComplete('info_general', true);

        console.log('DEBUG: Solicitando permisos de ubicación...');
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso de Ubicación Requerido', 'Necesitamos acceso a tu ubicación para registrar el punto de la visita. Por favor, habilita los permisos de ubicación en la configuración de tu dispositivo.');
          console.warn('DEBUG: Permiso de ubicación denegado.');
          setLocation(null);
        } else {
          console.log('DEBUG: Permisos de ubicación concedidos. Obteniendo ubicación actual...');
          try {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              timeInterval: 1000,
              distanceInterval: 1,
            });
            const { latitude, longitude } = currentLocation.coords;

            let addressName: string | null = null;
            let cityName: string | null = null;
            let stateName: string | null = null;

            try {
              const reverseGeocodeResult = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (reverseGeocodeResult && reverseGeocodeResult.length > 0) {
                const firstResult = reverseGeocodeResult[0];
                addressName = firstResult.name || firstResult.street || null;
                cityName = firstResult.city || null;
                stateName = firstResult.region || null;
                console.log('DEBUG: Geocodificación inversa exitosa:', firstResult);
              }
            } catch (geoError) {
              console.warn("WARN: Error al realizar geocodificación inversa:", geoError);
              Alert.alert("Error de Geocodificación", "No se pudo obtener la dirección completa para esta ubicación.");
            }

            const newLocationEntry: LocationEntry = {
              latitude: latitude,
              longitude: longitude,
              timestamp: getLocalDateTimeString(new Date(currentLocation.timestamp)),
              accuracy: currentLocation.coords.accuracy || null,
              altitude: currentLocation.coords.altitude || null,
              cityName: cityName,
              addressName: addressName,
              stateName: stateName,
            };
            setLocation(newLocationEntry);
            console.log('DEBUG: Ubicación capturada y geocodificada exitosamente:', newLocationEntry);
          } catch (locError) {
            console.error('ERROR al obtener la ubicación actual:', locError);
            Alert.alert('Error de Ubicación', 'No se pudo obtener tu ubicación actual. Asegúrate de tener el GPS activado y de estar al aire libre.');
            setLocation(null);
          }
        }
        setVisitStartInfo(null);
        console.log(`DEBUG: Procesamiento de inicio de visita completado para ${visitStartInfo.name} (${visitStartInfo.id})`);
      }
    };

    handleVisitStart();
  }, [visitStartInfo, markSectionComplete]);

  const startNewVisit = useCallback(async (commerceId: string, commerceName: string): Promise<boolean> => {
    try {
      console.log(`DEBUG: startNewVisit llamado para ${commerceName} (${commerceId})`);
      resetVisit();
      setVisitStartInfo({ id: commerceId, name: commerceName, timestamp: getLocalDateTimeString(new Date()) });
      return true;
    } catch (error) {
      console.error("ERROR al iniciar nueva visita:", error);
      Alert.alert("Error", "No se pudo iniciar la nueva visita. Inténtalo de nuevo.");
      return false;
    }
  }, [resetVisit]);

  useEffect(() => {
    const isLocationPresent = location !== null;
    const arePhotosTaken = photos.length > 0;

    const shouldBeComplete = isLocationPresent && arePhotosTaken;

    if ((visitSections.photos_location === 'completed') !== shouldBeComplete) {
      console.log(`DEBUG: Evaluando photos_location: Ubicación=${isLocationPresent}, Fotos=${arePhotosTaken}. Marcando como ${shouldBeComplete ? 'completed' : 'pending'}`);
      markSectionComplete('photos_location', shouldBeComplete);
    }
  }, [location, photos, markSectionComplete, visitSections.photos_location]);

  const uploadPhotoToSupabase = async (photoUri: string, filePath: string) => {
    try {
      console.log(`DEBUG: Subiendo foto desde URI local: ${photoUri} a ruta de Supabase: ${filePath}`);
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data, error } = await supabase.storage
        .from('visit-photos')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('visit-photos')
        .getPublicUrl(filePath);

      console.log('DEBUG: Foto subida exitosamente. URL pública:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;

    } catch (error: any) {
      console.error('ERROR al subir foto a Supabase Storage:', error);
      throw new Error(`No se pudo subir la foto: ${error.message}`);
    }
  };

  /**
   * Ejecuta el proceso de finalización de la visita y guardado en Supabase.
   * @returns {Promise<boolean>} True si la visita se guardó exitosamente, false en caso contrario.
   */
  const performFinalizeVisit = async (): Promise<boolean> => {
    if (!currentCommerceId || !currentCommerceName || !startVisitTimestamp) {
      Alert.alert('Error', 'No se puede finalizar la visita. Faltan datos esenciales (ID de comercio, nombre o timestamp de inicio).');
      return false;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('ERROR al obtener el usuario autenticado:', userError.message);
        Alert.alert('Error de Autenticación', 'No se pudo obtener la información del usuario. Por favor, intenta de nuevo o inicia sesión.');
        return false;
      }

      const promoterId = user?.id || null;

      console.log('DEBUG: Iniciando subida de fotos...');
      const uploadedPhotosUrls: { url: string; type: string; timestamp: string }[] = [];
      for (const photo of photos) {
        const fileExtension = photo.uri.split('.').pop();
        const fileName = `${currentCommerceId}-${new Date().getTime()}-${photo.type}.${fileExtension}`;
        const filePath = `${currentCommerceId}/${fileName}`;

        try {
          const publicUrl = await uploadPhotoToSupabase(photo.uri, filePath);
          uploadedPhotosUrls.push({ url: publicUrl, type: photo.type, timestamp: getLocalDateTimeString(new Date(photo.timestamp)) });
        } catch (uploadError: any) {
          console.error(`ERROR al subir la foto tipo ${photo.type}:`, uploadError.message);
          Alert.alert('Error al subir foto', `No se pudo subir la foto de tipo ${photo.type}. La visita se guardará sin esta foto. ${uploadError.message}`);
        }
      }
      console.log('DEBUG: Fotos procesadas. URLs:', uploadedPhotosUrls);

      const visitDataToInsert = {
        commerce_id: currentCommerceId,
        commerce_name: currentCommerceName,
        timestamp: startVisitTimestamp,
        end_timestamp: getLocalDateTimeString(new Date()),
        promoter_id: promoterId,
        notes: summaryNotes.trim().length > 0 ? summaryNotes : null,
        is_synced: true,
        section_status: visitSections,
      };

      console.log('DEBUG: Insertando visita principal:', visitDataToInsert);
      const { data: newVisitRow, error: visitError } = await supabase
        .from('visits')
        .insert([visitDataToInsert])
        .select('id');

      if (visitError || !newVisitRow || newVisitRow.length === 0) {
        console.error('ERROR al guardar la visita principal:', visitError);
        throw new Error(`Error al guardar la visita principal: ${visitError?.message}`);
      }

      const visitId = newVisitRow[0].id;
      console.log('DEBUG: Visita principal guardada con ID:', visitId);

      let allSubtasksSuccessful = true;

      if (location) {
        const locationDataToInsert = {
          visit_id: visitId,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          accuracy: location.accuracy,
          altitude: location.altitude,
          city_name: location.cityName,
          address_name: location.addressName,
          state_name: location.stateName,
        };
        console.log('DEBUG: Insertando ubicación:', locationDataToInsert);
        const { error: locationError } = await supabase
          .from('visit_locations')
          .insert([locationDataToInsert]);

        if (locationError) {
          console.error('ERROR al guardar ubicación:', locationError);
          Alert.alert('Error de Ubicación', `No se pudo guardar la ubicación: ${locationError.message}`);
          allSubtasksSuccessful = false;
        }
      }

      if (productEntries.length > 0) {
        const productEntriesToInsert = productEntries.map(entry => ({
          visit_id: visitId,
          product_id: entry.productId,
          product_name: entry.productName,
          currency: entry.currency,
          price: entry.price,
          shelf_stock: entry.shelfStock,
          general_stock: entry.generalStock,
        }));
        console.log('DEBUG: Insertando productos Chispa:', productEntriesToInsert);
        const { error: productError } = await supabase
          .from('product_visits')
          .insert(productEntriesToInsert);

        if (productError) {
          console.error('ERROR al guardar productos Chispa:', productError);
          Alert.alert('Error de Productos', `No se pudo guardar los productos Chispa: ${productError.message}`);
          allSubtasksSuccessful = false;
        }
      }

      if (competitorEntries.length > 0) {
        const competitorEntriesToInsert = competitorEntries.map(entry => ({
          visit_id: visitId,
          product_id: entry.productId,
          product_name: entry.productName,
          price: entry.price,
          currency: entry.currency,
        }));
        console.log('DEBUG: Insertando productos de competencia:', competitorEntriesToInsert);
        const { error: competitorError } = await supabase
          .from('competitor_product_visits')
          .insert(competitorEntriesToInsert);

        if (competitorError) {
          console.error('ERROR al guardar productos de competencia:', competitorError);
          Alert.alert('Error de Competencia', `No se pudo guardar los productos de competencia: ${competitorError.message}`);
          allSubtasksSuccessful = false;
        }
      }

      if (uploadedPhotosUrls.length > 0) {
        const photosToInsert = uploadedPhotosUrls.map(photo => ({
          visit_id: visitId,
          photo_url: photo.url,
          timestamp: photo.timestamp,
          type: photo.type,
        }));
        console.log('DEBUG: Insertando URLs de fotos:', photosToInsert);
        const { error: photosError } = await supabase
          .from('visit_photos')
          .insert(photosToInsert);

        if (photosError) {
          console.error('ERROR al guardar URLs de fotos:', photosError);
          Alert.alert('Error de Fotos', `No se pudieron guardar las referencias de las fotos: ${photosError.message}`);
          allSubtasksSuccessful = false;
        }
      }

      if (allSubtasksSuccessful) {
        Alert.alert('¡Éxito!', 'La visita y todos sus detalles han sido guardados exitosamente.');
      } else {
        Alert.alert('Visita Guardada con Advertencias', 'La visita principal fue guardada, pero hubo problemas al guardar algunos detalles (fotos, ubicación, productos). Revisa los logs.');
      }
      return true;
    } catch (error: any) {
      console.error('Error durante el proceso de guardado completo:', error.message);
      Alert.alert('Error Crítico', `No se pudo guardar la visita completamente: ${error.message}`);
      return false;
    }
  };

  const finalizeVisit = useCallback(async (): Promise<boolean> => {
    if (!currentCommerceId || !currentCommerceName || !startVisitTimestamp) {
      Alert.alert('Error', 'No se puede finalizar la visita. Faltan datos esenciales (ID de comercio, nombre o timestamp de inicio).');
      return false;
    }

    const mandatorySectionsCompleted =
      visitSections.chispa === 'completed' &&
      visitSections.competitor === 'completed' &&
      visitSections.photos_location === 'completed' &&
      visitSections.info_general === 'completed';

    if (!mandatorySectionsCompleted) {
      return new Promise((resolve) => {
        Alert.alert(
          'Atención',
          'Hay secciones obligatorias de la visita que no están completadas (Fotos y Ubicación, Chispa, Competencia, Info General). ¿Deseas guardar de todos modos?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Guardar de todos modos',
              onPress: async () => {
                const success = await performFinalizeVisit();
                if (success) {
                  resetVisit();
                }
                resolve(success);
              },
            },
          ],
          { cancelable: true }
        );
      });
    }

    const success = await performFinalizeVisit();
    if (success) {
      resetVisit();
    }
    return success;
  }, [currentCommerceId, currentCommerceName, startVisitTimestamp, productEntries, competitorEntries, photos, location, visitSections, summaryNotes, performFinalizeVisit, resetVisit]);

  const contextValue: VisitContextType = useMemo(() => ({
    currentCommerceId,
    currentCommerceName,
    startVisitTimestamp,
    visitSections,
    productEntries,
    updateProductEntries,
    competitorEntries,
    updateCompetitorEntries,
    photos,
    addPhoto,
    location,
    updateLocation,
    summaryNotes,
    updateSummaryNotes,
    markSectionComplete,
    finalizeVisit,
    resetVisit,
    startNewVisit,
  }), [
    currentCommerceId,
    currentCommerceName,
    startVisitTimestamp,
    visitSections,
    productEntries,
    updateProductEntries,
    competitorEntries,
    updateCompetitorEntries,
    photos,
    addPhoto,
    location,
    updateLocation,
    summaryNotes,
    updateSummaryNotes,
    markSectionComplete,
    finalizeVisit,
    resetVisit,
    startNewVisit,
  ]);

  return (
    <VisitContext.Provider value={contextValue}>
      {children}
    </VisitContext.Provider>
  );
};