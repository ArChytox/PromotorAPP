// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Commerce, Visit } from '../types/data';
import { supabase } from '../services/supabase'; // ¡CAMBIO AQUÍ! Importa tu cliente Supabase

// Claves para AsyncStorage
const COMMERCES_STORAGE_KEY = '@promotorapp:commerces';
const VISITS_STORAGE_KEY = '@promotorapp:visits'; // Clave para almacenar visitas

// --- Funciones para Comercios ---

export const getCommerces = async (): Promise<Commerce[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(COMMERCES_STORAGE_KEY);
    const commerces = jsonValue != null ? JSON.parse(jsonValue) : [];
    console.log(`[Storage] Comercios obtenidos de AsyncStorage: ${commerces.length}`);
    return commerces;
  } catch (e) {
    console.error("[Storage] Error al leer comercios desde AsyncStorage:", e);
    return [];
  }
};

export const saveCommerces = async (commerces: Commerce[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(commerces);
    await AsyncStorage.setItem(COMMERCES_STORAGE_KEY, jsonValue);
    console.log(`[Storage] ${commerces.length} comercios guardados exitosamente en AsyncStorage.`);
  } catch (e) {
    console.error("[Storage] Error al guardar comercios en AsyncStorage:", e);
    throw e; // Re-lanza el error para que sea manejado por la UI
  }
};

// --- Funciones para Visitas (almacenamiento local) ---

/**
 * Obtiene todas las visitas guardadas en AsyncStorage.
 */
export const getVisits = async (): Promise<Visit[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(VISITS_STORAGE_KEY);
    const visits = jsonValue != null ? JSON.parse(jsonValue) : [];
    console.log(`[Storage] Visitas obtenidas de AsyncStorage: ${visits.length}`);
    return visits;
  } catch (e) {
    console.error("[Storage] Error al leer visitas desde AsyncStorage:", e);
    return [];
  }
};

/**
 * Guarda una nueva visita en AsyncStorage. Si ya existe una visita con el mismo ID, la actualiza.
 * @param newVisit El objeto de la visita a guardar.
 */
export const saveVisitLocally = async (newVisit: Visit): Promise<void> => {
  try {
    const existingVisits = await getVisits();
    const filteredVisits = existingVisits.filter(visit => visit.id !== newVisit.id);
    filteredVisits.push(newVisit); // Añadir la nueva visita o actualizarla

    const jsonValue = JSON.stringify(filteredVisits);
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, jsonValue);
    console.log(`[Storage] Visita ${newVisit.id} guardada/actualizada exitosamente en AsyncStorage.`);
  } catch (e) {
    console.error("[Storage] Error al guardar visita localmente:", e);
    throw e;
  }
};

/**
 * Actualiza una visita existente en AsyncStorage.
 * @param updatedVisit La visita con los datos actualizados.
 */
export const updateVisitLocally = async (updatedVisit: Visit): Promise<void> => {
  try {
    const existingVisits = await getVisits();
    const updatedVisits = existingVisits.map(visit =>
      visit.id === updatedVisit.id ? updatedVisit : visit
    );
    const jsonValue = JSON.stringify(updatedVisits);
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, jsonValue);
    console.log(`[Storage] Visita ${updatedVisit.id} actualizada exitosamente en AsyncStorage.`);
  } catch (e) {
    console.error(`[Storage] Error al actualizar visita ${updatedVisit.id} en AsyncStorage:`, e);
    throw e;
  }
};

// --- Funciones para Visitas (interacción con Supabase) ---

/**
 * Guarda una visita específica en Supabase.
 * Usa upsert para insertar o actualizar si el ID de visita ya existe.
 * @param visit El objeto de la visita a guardar en Supabase.
 */
export const saveVisitToSupabase = async (visit: Visit): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('visits') // Reemplaza 'visits' con el nombre de tu tabla en Supabase
      .upsert([
        {
          id: visit.id,
          commerce_id: visit.commerceId,
          commerce_name: visit.commerceName,
          timestamp: visit.timestamp,
          end_timestamp: visit.endTimestamp, // Asegúrate de que este campo exista en la visita
          promoter_id: visit.promoterId, // Asegúrate de que este campo exista en la visita
          notes: visit.notes,
          is_synced: true, // Siempre true al guardar en Supabase
          section_status: visit.sectionStatus,
        },
      ], { onConflict: 'id' }); // Conflict en 'id' para upsert

    if (error) {
      console.error('Error de inserción/actualización en Supabase (visits):', error.message);
      throw error;
    }
    console.log('Datos de visita principal insertados/actualizados en Supabase:', data);

    // --- Guardar detalles de la visita en tablas separadas ---
    // (Asumimos que estas tablas se insertan o se actualizan limpiando las previas por visit_id)

    // Ubicación
    if (visit.location) {
      const { error: locationError } = await supabase
        .from('visit_locations')
        .insert([
          {
            visit_id: visit.id,
            latitude: visit.location.latitude,
            longitude: visit.location.longitude,
            timestamp: visit.location.timestamp,
            accuracy: visit.location.accuracy,
            altitude: visit.location.altitude,
            city_name: visit.location.cityName,
            address_name: visit.location.addressName,
            state_name: visit.location.stateName,
          },
        ]);
      if (locationError) {
        console.warn('Error al guardar ubicación en Supabase:', locationError.message);
        // No lanzamos error para no detener la sincronización de otros detalles
      }
    }

    // Productos Chispa
    if (visit.productEntries && visit.productEntries.length > 0) {
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
        console.warn('Error al guardar productos Chispa en Supabase:', productError.message);
      }
    }

    // Productos de Competencia
    if (visit.competitorEntries && visit.competitorEntries.length > 0) {
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
        console.warn('Error al guardar productos de competencia en Supabase:', competitorError.message);
      }
    }

    // Fotos (se asume que las URIs de las fotos ya son URLs públicas en este punto)
    if (visit.photos && visit.photos.length > 0) {
      const photosToInsert = visit.photos.map(photo => ({
        visit_id: visit.id,
        photo_url: photo.uri, // Aquí ya debería ser la URL pública
        timestamp: photo.timestamp,
        type: photo.type,
      }));
      const { error: photosError } = await supabase
        .from('visit_photos')
        .insert(photosToInsert);
      if (photosError) {
        console.warn('Error al guardar URLs de fotos en Supabase:', photosError.message);
      }
    }

    console.log(`[Storage] Visita ${visit.id} y sus detalles procesados en Supabase.`);

  } catch (error) {
    console.error('Fallo general al guardar visita en Supabase:', error);
    throw error;
  }
};

/**
 * Función para obtener visitas de Supabase (si necesitas cargarlas).
 * Mapea los datos de Supabase a tu tipo 'Visit'.
 */
export const getVisitsFromSupabase = async (): Promise<Visit[]> => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        visit_locations (latitude, longitude, timestamp, accuracy, altitude, city_name, address_name, state_name),
        product_visits (product_id, product_name, currency, price, shelf_stock, general_stock),
        competitor_product_visits (product_id, product_name, price, currency),
        visit_photos (photo_url, timestamp, type)
      `); // Selecciona todas las columnas y relaciones

    if (error) {
      console.error('Error al obtener visitas de Supabase:', error.message);
      throw error;
    }

    // Mapea los datos de Supabase a tu tipo 'Visit'
    const visits: Visit[] = data.map((item: any) => ({
      id: item.id,
      commerceId: item.commerce_id,
      commerceName: item.commerce_name,
      timestamp: item.timestamp,
      endTimestamp: item.end_timestamp,
      promoterId: item.promoter_id,
      notes: item.notes,
      isSynced: item.is_synced,
      sectionStatus: item.section_status,
      productEntries: item.product_visits || [],
      competitorEntries: item.competitor_product_visits || [],
      photos: item.visit_photos ? item.visit_photos.map((photo: any) => ({
        uri: photo.photo_url,
        timestamp: photo.timestamp,
        type: photo.type,
      })) : [],
      location: item.visit_locations ? {
        latitude: item.visit_locations.latitude,
        longitude: item.visit_locations.longitude,
        timestamp: item.visit_locations.timestamp,
        accuracy: item.visit_locations.accuracy,
        altitude: item.visit_locations.altitude,
        cityName: item.visit_locations.city_name,
        addressName: item.visit_locations.address_name,
        stateName: item.visit_locations.state_name,
      } : null,
    }));

    console.log(`[Storage] ${visits.length} visitas obtenidas de Supabase.`);
    return visits;
  } catch (error) {
    console.error('Error al obtener visitas de Supabase:', error);
    return [];
  }
};

// Esta función ya no es necesaria como independiente si saveVisitToSupabase usa upsert
// pero la mantengo si la quieres para algo específico en el futuro.
export const updateVisitInSupabase = async (visit: Visit): Promise<void> => {
    try {
        const { error } = await supabase
            .from('visits')
            .update({
                commerce_id: visit.commerceId,
                commerce_name: visit.commerceName,
                timestamp: visit.timestamp,
                end_timestamp: visit.endTimestamp,
                promoter_id: visit.promoterId,
                notes: visit.notes,
                is_synced: visit.isSynced,
                section_status: visit.sectionStatus,
            })
            .eq('id', visit.id);

        if (error) {
            console.error('Error de actualización en Supabase (visits):', error.message);
            throw error;
        }
        console.log('Visita actualizada en Supabase:', visit.id);
    } catch (error) {
        console.error('Fallo al actualizar visita en Supabase:', error);
        throw error;
    }
};