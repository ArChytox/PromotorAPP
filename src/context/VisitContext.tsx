// src/context/VisitContext.tsx
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useNetInfo } from '@react-native-community/netinfo';

// Importa los tipos que hemos definido
import {
    ProductVisitEntry,
    CompetitorVisitEntry,
    PhotoEntry,
    LocationEntry,
    VisitSectionState,
    Visit, // Importa el tipo Visit completo
} from '../types/data'; // Asegúrate de que la ruta sea correcta
import { supabase } from '../services/supabase'; // Asegúrate de que la ruta sea correcta

// Importa las funciones de storage refactorizadas
import {
    saveVisitLocally,
    updateVisitLocally,
    getVisits,
} from '../utils/storage'; // Asegúrate de que la ruta sea correcta
import { generateUniqueId } from '../utils/idGenerator'; // Asegúrate de que la ruta sea correcta

// --- FUNCIONES AUXILIARES PARA HORA LOCAL ---
// Función para formatear una fecha a una cadena ISO local sin el 'Z' o el offset.
const getLocalDateTimeString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
};

// --- TIPOS DEL CONTEXTO ---
type VisitSectionsState = VisitSectionState;

interface VisitContextType {
    currentCommerceId: string | null;
    currentCommerceName: string | null;
    currentCommerceAddress: string | null; // ✨ CAMBIO 1: Nueva propiedad para la dirección del comercio
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
    startNewVisit: (commerceId: string, commerceName: string, commerceAddress: string) => Promise<boolean>; // ✨ CAMBIO 2: Añade commerceAddress al parámetro
    // currentVisit ya no es necesario aquí, ya que el estado se descompone
    // currentVisit: Visit | null; // Puedes dejarlo si quieres una representación consolidada del estado
}

// --- ESTADOS INICIALES ---
const initialVisitSectionsState: VisitSectionState = {
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
    const { isConnected } = useNetInfo();

    const [currentCommerceId, setCurrentCommerceId] = useState<string | null>(null);
    const [currentCommerceName, setCurrentCommerceName] = useState<string | null>(null);
    const [currentCommerceAddress, setCurrentCommerceAddress] = useState<string | null>(null); // ✨ CAMBIO 3: Nuevo estado para la dirección
    const [startVisitTimestamp, setStartVisitTimestamp] = useState<string | null>(null);
    const [visitSections, setVisitSections] = useState<VisitSectionState>(initialVisitSectionsState);
    const [productEntries, setProductEntries] = useState<ProductVisitEntry[]>([]);
    const [competitorEntries, setCompetitorEntries] = useState<CompetitorVisitEntry[]>([]);
    const [photos, setPhotos] = useState<PhotoEntry[]>([]);
    const [location, setLocation] = useState<LocationEntry | null>(null);
    const [summaryNotes, setSummaryNotes] = useState<string>('');

    // Estado para la visita actual que se está construyendo (su ID único)
    const [currentBuildingVisitId, setCurrentBuildingVisitId] = useState<string | null>(null);

    // --- FUNCIONES DE ACTUALIZACIÓN ---
    const markSectionComplete = useCallback((sectionName: keyof VisitSectionState, isComplete: boolean) => {
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
        setCurrentCommerceAddress(null); // ✨ CAMBIO 4: Resetear la dirección también
        setStartVisitTimestamp(null);
        setVisitSections(initialVisitSectionsState);
        setProductEntries([]);
        setCompetitorEntries([]);
        setPhotos([]);
        setLocation(null);
        setSummaryNotes('');
        setCurrentBuildingVisitId(null); // Reiniciar ID de la visita en construcción
    }, []);

    // --- Lógica para obtener ubicación al iniciar visita ---
    useEffect(() => {
        const fetchLocationOnStart = async () => {
            // Solo obtener ubicación si es el inicio de una nueva visita y aún no se ha obtenido
            if (currentCommerceId && !location && currentBuildingVisitId && startVisitTimestamp) {
                console.log('DEBUG: Solicitando permisos de ubicación para nueva visita...');
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
            }
        };

        // Solo ejecutar si hay un ID de visita en construcción y no se ha obtenido la ubicación
        if (currentBuildingVisitId && !location) {
            fetchLocationOnStart();
        }
    }, [currentCommerceId, currentBuildingVisitId, location, startVisitTimestamp]);


    // Controla el estado de la sección photos_location
    useEffect(() => {
        const isLocationPresent = location !== null;
        const arePhotosTaken = photos.length > 0; // Considera si necesitas ambas fotos (before y after) para marcarla completa.
                                                  // Si es así, la lógica en PhotoAndLocationScreen ya lo maneja para `markSectionComplete`.

        const shouldBeComplete = isLocationPresent && arePhotosTaken;

        if ((visitSections.photos_location === 'completed') !== shouldBeComplete) {
            console.log(`DEBUG: Evaluando photos_location: Ubicación=${isLocationPresent}, Fotos=${arePhotosTaken}. Marcando como ${shouldBeComplete ? 'completed' : 'pending'}`);
            markSectionComplete('photos_location', shouldBeComplete);
        }
    }, [location, photos, markSectionComplete, visitSections.photos_location]);

    const startNewVisit = useCallback(async (commerceId: string, commerceName: string, commerceAddress: string): Promise<boolean> => { // ✨ CAMBIO 5: Añade commerceAddress al parámetro
        try {
            console.log(`DEBUG: startNewVisit llamado para ${commerceName} (${commerceId}), dirección: ${commerceAddress}`);
            resetVisit(); // Asegura un estado limpio
            const visitId = generateUniqueId(); // Genera un ID único para esta visita
            setCurrentBuildingVisitId(visitId); // Guarda el ID de la visita que se está construyendo
            setCurrentCommerceId(commerceId);
            setCurrentCommerceName(commerceName);
            setCurrentCommerceAddress(commerceAddress); // ✨ CAMBIO 6: Guarda la dirección en el estado
            setStartVisitTimestamp(getLocalDateTimeString(new Date()));
            markSectionComplete('info_general', true);
            // La ubicación se obtendrá en el useEffect de fetchLocationOnStart
            return true;
        } catch (error) {
            console.error("ERROR al iniciar nueva visita:", error);
            Alert.alert("Error", "No se pudo iniciar la nueva visita. Inténtalo de nuevo.");
            return false;
        }
    }, [resetVisit, markSectionComplete]);

    const uploadPhotoToSupabase = async (photoUri: string, filePath: string): Promise<string> => {
        try {
            console.log(`DEBUG: Subiendo foto desde URI local: ${photoUri} a ruta de Supabase: ${filePath}`);
            const base64 = await FileSystem.readAsStringAsync(photoUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const { error } = await supabase.storage
                .from('visit-photos')
                .upload(filePath, decode(base64), {
                    contentType: 'image/jpeg',
                    upsert: false, // No sobrescribir si ya existe, lanzar error
                });

            if (error) {
                if (error.message.includes('Duplicate')) {
                    console.warn(`WARN: La foto ${filePath} ya existe en Supabase Storage. Usando URL existente.`);
                    // Si ya existe, no es un error crítico, simplemente no la subimos de nuevo.
                    // Podrías intentar obtener la URL pública si la necesitas aquí.
                } else {
                    throw error;
                }
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
     * Sincroniza una visita completa con Supabase (incluyendo la subida de fotos y detalles).
     * Esta función debe ser llamada cuando haya conexión y la visita esté lista para ser subida.
     * @param visit La visita completa a sincronizar.
     * @returns {Promise<boolean>} True si la sincronización fue exitosa, false en caso contrario.
     */
    const syncVisitToSupabase = useCallback(async (visit: Visit): Promise<boolean> => {
        if (!isConnected) {
            console.warn(`[syncVisitToSupabase] No hay conexión para sincronizar la visita ${visit.id}.`);
            return false;
        }

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.error('ERROR al obtener el usuario para sincronizar visita:', userError.message);
                throw new Error('Usuario no autenticado para sincronización.');
            }
            const promoterId = user?.id || null;

            // 1. Subir fotos a Supabase Storage y actualizar sus URIs a URLs públicas
            const photosWithPublicUrls: PhotoEntry[] = [];
            for (const photo of visit.photos) {
                // Solo intentar subir si la URI es local (ej. no es una URL http/https ya)
                if (photo.uri.startsWith('file://')) {
                    const fileExtension = photo.uri.split('.').pop();
                    // Usamos una ruta única incluyendo el visit.id y un timestamp para evitar conflictos.
                    const fileName = `${visit.commerceId}/${visit.id}-${new Date().getTime()}-${photo.type}.${fileExtension}`;
                    try {
                        const publicUrl = await uploadPhotoToSupabase(photo.uri, fileName);
                        photosWithPublicUrls.push({ ...photo, uri: publicUrl }); // Reemplazar URI local con URL pública
                    } catch (uploadError: any) {
                        console.warn(`WARN: No se pudo subir la foto tipo ${photo.type} para visita ${visit.id}:`, uploadError.message);
                        // Si falla la subida, la foto conservará su URI local (y no se agregará a photosWithPublicUrls)
                        // Esto implica que si falla la subida, la foto no se registrará en la tabla `visit_photos`.
                        // Podrías añadir una lógica para guardar las URIs locales que no se subieron para reintentos futuros.
                    }
                } else {
                    photosWithPublicUrls.push(photo); // Ya es una URL pública, no necesita subir
                }
            }

            // 2. Preparar datos para la inserción/actualización de la visita principal
            const visitDataToUpsert = {
                id: visit.id,
                commerce_id: visit.commerceId,
                commerce_name: visit.commerceName,
                timestamp: visit.timestamp,
                end_timestamp: visit.endTimestamp || getLocalDateTimeString(new Date()),
                promoter_id: promoterId,
                notes: visit.notes && visit.notes.trim().length > 0 ? visit.notes : null,
                is_synced: true, // Se marca como true al intentar sincronizar con Supabase
                section_status: visit.sectionStatus,
            };

            // 3. Insertar/Actualizar la visita principal en Supabase (tabla 'visits')
            const { error: visitError } = await supabase
                .from('visits')
                .upsert([visitDataToUpsert], { onConflict: 'id' }); // Conflict si ID ya existe

            if (visitError) {
                console.error(`ERROR al guardar/actualizar visita principal ${visit.id} en Supabase:`, visitError);
                throw new Error(`Error Supabase [visits]: ${visitError.message}`);
            }
            console.log(`DEBUG: Visita principal ${visit.id} guardada/actualizada en Supabase.`);

            let allSubtasksSuccessful = true; // Para rastrear el éxito de las sub-inserciones

            // 4. Insertar/Actualizar detalles (ubicación, productos, competencia, fotos)
            // Para estas tablas dependientes, normalmente se insertan nuevos registros por cada visita.
            // Si necesitas actualizar, podrías usar upsert y una columna única por visita (ej. visit_id)
            // o borrar los registros previos asociados a visit_id antes de reinsertar.
            // Para simplificar, asumimos que cada finalización es un nuevo conjunto de detalles.

            if (visit.location) {
                const locationDataToInsert = {
                    visit_id: visit.id,
                    latitude: visit.location.latitude,
                    longitude: visit.location.longitude,
                    timestamp: visit.location.timestamp,
                    accuracy: visit.location.accuracy,
                    altitude: visit.location.altitude,
                    city_name: visit.location.cityName,
                    address_name: visit.location.addressName,
                    state_name: visit.location.stateName,
                };
                const { error: locationError } = await supabase
                    .from('visit_locations')
                    .insert([locationDataToInsert]);

                if (locationError) {
                    console.warn(`ERROR al guardar ubicación para visita ${visit.id}:`, locationError.message);
                    allSubtasksSuccessful = false;
                } else {
                    console.log(`DEBUG: Ubicación para visita ${visit.id} guardada.`);
                }
            }

            if (visit.productEntries.length > 0) {
                const productEntriesToInsert = visit.productEntries.map(entry => ({
                    visit_id: visit.id,
                    product_id: entry.productId,
                    product_name: entry.productName,
                    currency: entry.currency,
                    price: entry.price,
                    shelf_stock: entry.shelfStock,
                    general_stock: entry.generalStock,
                }));
                const { error: productError } = await supabase
                    .from('product_visits')
                    .insert(productEntriesToInsert);

                if (productError) {
                    console.warn(`ERROR al guardar productos Chispa para visita ${visit.id}:`, productError.message);
                    allSubtasksSuccessful = false;
                } else {
                    console.log(`DEBUG: Productos Chispa para visita ${visit.id} guardados.`);
                }
            }

            if (visit.competitorEntries.length > 0) {
                const competitorEntriesToInsert = visit.competitorEntries.map(entry => ({
                    visit_id: visit.id,
                    product_id: entry.productId,
                    product_name: entry.productName,
                    price: entry.price,
                    currency: entry.currency,
                }));
                const { error: competitorError } = await supabase
                    .from('competitor_product_visits')
                    .insert(competitorEntriesToInsert);

                if (competitorError) {
                    console.warn(`ERROR al guardar productos de competencia para visita ${visit.id}:`, competitorError.message);
                    allSubtasksSuccessful = false;
                } else {
                    console.log(`DEBUG: Productos de competencia para visita ${visit.id} guardados.`);
                }
            }

            if (photosWithPublicUrls.length > 0) { // Usar las URLs públicas obtenidas
                const photosToInsert = photosWithPublicUrls.map(photo => ({
                    visit_id: visit.id,
                    photo_url: photo.uri, // Ahora `uri` contiene la URL pública
                    timestamp: photo.timestamp,
                    type: photo.type,
                }));
                const { error: photosError } = await supabase
                    .from('visit_photos')
                    .insert(photosToInsert);

                if (photosError) {
                    console.warn(`ERROR al guardar URLs de fotos para visita ${visit.id}:`, photosError.message);
                    allSubtasksSuccessful = false;
                } else {
                    console.log(`DEBUG: URLs de fotos para visita ${visit.id} guardadas.`);
                }
            }

            // Si llegamos aquí, la visita principal está sincronizada, y los detalles también (o fallaron de forma aislada).
            // Actualizar la visita local para marcarla como sincronizada
            await updateVisitLocally({ ...visit, isSynced: true });
            console.log(`DEBUG: Visita ${visit.id} marcada como sincronizada localmente.`);

            return allSubtasksSuccessful; // Retorna true si todo fue bien, false si hubo algún detalle que falló
        } catch (error: any) {
            console.error(`Error durante la sincronización de visita ${visit.id} con Supabase:`, error.message);
            // Si la sincronización falla, la visita permanece como isSynced: false en el storage local.
            return false;
        }
    }, [isConnected]);

    /**
     * Procesa la finalización de la visita, guardando localmente y luego intentando sincronizar.
     * @returns {Promise<boolean>} True si la visita fue guardada localmente (y potencialmente sincronizada), false si hubo un error crítico.
     */
    const finalizeVisit = useCallback(async (): Promise<boolean> => {
        if (!currentCommerceId || !currentCommerceName || !startVisitTimestamp || !currentBuildingVisitId) {
            Alert.alert('Error', 'No se puede finalizar la visita. Faltan datos esenciales.');
            return false;
        }

        const visitToSave: Visit = {
            id: currentBuildingVisitId, // Usar el ID que se generó al inicio
            commerceId: currentCommerceId,
            commerceName: currentCommerceName,
            timestamp: startVisitTimestamp,
            endTimestamp: getLocalDateTimeString(new Date()),
            promoterId: (await supabase.auth.getUser()).data.user?.id || null, // Obtener ID del promotor en este momento
            notes: summaryNotes.trim().length > 0 ? summaryNotes : null,
            productEntries: productEntries,
            competitorEntries: competitorEntries,
            photos: photos,
            location: location,
            sectionStatus: visitSections,
            isSynced: false, // Por defecto, no sincronizada hasta que `syncVisitToSupabase` lo confirme
        };

        const mandatorySectionsCompleted =
            visitSections.chispa === 'completed' &&
            visitSections.competitor === 'completed' &&
            visitSections.photos_location === 'completed' &&
            visitSections.info_general === 'completed';

        let finalSuccess = false;

        const attemptFinalize = async () => {
            try {
                // 1. Guardar la visita localmente PRIMERO
                await saveVisitLocally(visitToSave);
                console.log(`DEBUG: Visita ${visitToSave.id} guardada localmente.`);
                Alert.alert('Visita Guardada', 'La visita ha sido guardada en tu dispositivo.');

                // 2. Intentar sincronizar si hay conexión
                if (isConnected) {
                    console.log(`DEBUG: Intentando sincronizar visita ${visitToSave.id} con Supabase...`);
                    const syncSuccess = await syncVisitToSupabase(visitToSave);
                    if (syncSuccess) {
                        Alert.alert('Sincronización Exitosa', 'La visita ha sido sincronizada con el servidor.');
                    } else {
                        Alert.alert('Advertencia de Sincronización', 'La visita se guardó localmente, pero hubo problemas al sincronizarla con el servidor. Se intentará de nuevo más tarde.');
                    }
                } else {
                    Alert.alert('Modo Offline', 'No hay conexión a internet. La visita ha sido guardada localmente y se sincronizará automáticamente cuando haya conexión.');
                }
                finalSuccess = true;
            } catch (error: any) {
                console.error('ERROR al guardar/sincronizar visita:', error.message);
                Alert.alert('Error Crítico', `No se pudo guardar la visita: ${error.message}`);
                finalSuccess = false;
            } finally {
                if (finalSuccess) { // Solo resetear si el guardado local fue exitoso
                    resetVisit();
                }
            }
        };

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
                                await attemptFinalize();
                                resolve(finalSuccess); // Resuelve con el resultado del intento de finalización
                            },
                        },
                    ],
                    { cancelable: true }
                );
            });
        } else {
            await attemptFinalize();
            return finalSuccess;
        }
    }, [
        currentCommerceId,
        currentCommerceName,
        startVisitTimestamp,
        currentBuildingVisitId,
        summaryNotes,
        productEntries,
        competitorEntries,
        photos,
        location,
        visitSections,
        isConnected,
        resetVisit,
        syncVisitToSupabase,
    ]);

    // Lógica para sincronizar visitas pendientes al iniciar la app o recuperar conexión
    const processPendingVisits = useCallback(async () => {
        if (!isConnected) {
            console.log('[VisitContext] No hay conexión. Sincronización de pendientes pospuesta.');
            return;
        }

        console.log('[VisitContext] Conexión detectada. Procesando visitas pendientes...');
        try {
            const allLocalVisits = await getVisits();
            const pendingVisits = allLocalVisits.filter(visit => !visit.isSynced);

            if (pendingVisits.length === 0) {
                console.log('[VisitContext] No hay visitas pendientes de sincronizar.');
                return;
            }

            for (const visit of pendingVisits) {
                console.log(`[VisitContext] Intentando sincronizar visita pendiente: ${visit.id}`);
                const success = await syncVisitToSupabase(visit);
                if (!success) {
                    console.warn(`[VisitContext] La visita ${visit.id} no pudo sincronizarse en este intento.`);
                    // Podrías añadir aquí una lógica de reintentos con backoff o un contador de intentos.
                }
            }
            console.log('[VisitContext] Proceso de sincronización de visitas pendientes completado.');
        } catch (error) {
            console.error('[VisitContext] Error al procesar visitas pendientes:', error);
        }
    }, [isConnected, syncVisitToSupabase]);

    useEffect(() => {
        // Al montar el proveedor o cuando la conexión cambia, intenta sincronizar pendientes.
        processPendingVisits();
    }, [processPendingVisits]);

    const contextValue: VisitContextType = useMemo(() => ({
        currentCommerceId,
        currentCommerceName,
        currentCommerceAddress, // ✨ CAMBIO 7: Añade la nueva propiedad al valor del contexto
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
        currentCommerceAddress, // ✨ CAMBIO 8: Incluirla en las dependencias de useMemo
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