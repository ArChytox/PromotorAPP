// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Commerce, Visit } from '../types/data'; // Asegúrate de que Commerce y Visit estén importados correctamente
import { supabase } from '../services/supabase'; // ¡CAMBIO AQUÍ! Importa tu cliente Supabase desde la nueva ruta

// Claves para AsyncStorage
const COMMERCES_STORAGE_KEY = '@promotorapp:commerces';
const VISITS_STORAGE_KEY = '@promotorapp:visits'; // Nueva clave para almacenar visitas

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

// --- Funciones para Visitas ---

// Función para obtener todas las visitas guardadas en AsyncStorage
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
 * Guarda una nueva visita en AsyncStorage y luego intenta guardarla en Supabase.
 * @param newVisit El objeto de la visita a guardar.
 */
export const saveVisit = async (newVisit: Visit): Promise<void> => {
  try {
    // 1. Guardar en AsyncStorage (localmente)
    const existingVisits = await getVisits(); // Obtener visitas existentes
    // Asegurarse de que no estamos duplicando la visita si ya fue guardada localmente antes de un reintento
    const filteredVisits = existingVisits.filter(visit => visit.id !== newVisit.id);
    filteredVisits.push(newVisit); // Añadir la nueva visita o actualizarla

    const jsonValue = JSON.stringify(filteredVisits);
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, jsonValue);
    console.log("Visit saved successfully to AsyncStorage!");

    // 2. Intentar guardar en Supabase DESPUÉS de guardar localmente
    await saveVisitToSupabase(newVisit);
    console.log("Visit also sent to Supabase successfully!");

  } catch (e) {
    console.error("Error al guardar visita (local o Supabase):", e);
    // IMPORTANTE: Si falla el guardado en Supabase, la visita YA ESTÁ en AsyncStorage.
    // Aquí podrías implementar una cola de reintentos para visitas no sincronizadas.
    throw e; // Re-lanza el error para que sea manejado por la UI si es necesario
  }
};

/**
 * Función para guardar una visita específica en Supabase.
 * Se llama desde `saveVisit` o de forma independiente si se desea.
 * @param visit El objeto de la visita a guardar en Supabase.
 */
export const saveVisitToSupabase = async (visit: Visit): Promise<void> => {
  try {
    // Asegúrate de que los nombres de las columnas en Supabase coincidan con los nombres aquí.
    // Los campos de array de objetos (productEntries, competitorEntries, sectionStatus)
    // y el objeto location_data deben ser de tipo JSONB en Supabase.
    // El campo photos debe ser de tipo TEXT[] (array de texto) en Supabase.
    const { data, error } = await supabase
      .from('visits') // Reemplaza 'visits' con el nombre de tu tabla en Supabase
      .insert([
        {
          id: visit.id,
          commerce_id: visit.commerceId,
          commerce_name: visit.commerceName,
          timestamp: visit.timestamp,
          product_entries: visit.productEntries,
          competitor_entries: visit.competitorEntries,
          photos_uris: visit.photos, // Asumiendo que `visit.photos` es un array de URIs (string[])
          location_data: visit.location,
          section_status: visit.sectionStatus,
          // Añadir created_at y updated_at si tu tabla los maneja
          // created_at: new Date().toISOString(),
          // updated_at: new Date().toISOString(),
        },
      ])
      .select(); // Opcional: para obtener los datos insertados y confirmarlos

    if (error) {
      console.error('Error de inserción en Supabase:', error.message);
      throw error;
    }

    console.log('Datos insertados en Supabase:', data);
  } catch (error) {
    console.error('Fallo al guardar visita en Supabase:', error);
    throw error;
  }
};


// Opcional: Función para obtener visitas de Supabase (si necesitas cargarlas)
export const getVisitsFromSupabase = async (): Promise<Visit[]> => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('*'); // Selecciona todas las columnas de la tabla 'visits'

    if (error) {
      console.error('Error al obtener visitas de Supabase:', error.message);
      throw error;
    }

    // Mapea los datos de Supabase a tu tipo 'Visit' si los nombres de columna son diferentes
    const visits: Visit[] = data.map((item: any) => ({
      id: item.id,
      commerceId: item.commerce_id,
      commerceName: item.commerce_name,
      timestamp: item.timestamp,
      productEntries: item.product_entries || [], // Asegura un array vacío si es nulo
      competitorEntries: item.competitor_entries || [],
      photos: item.photos_uris || [],
      location: item.location_data || null,
      sectionStatus: item.section_status || {}, // Asumiendo que sectionStatus es un objeto
    }));

    console.log(`[Storage] ${visits.length} visitas obtenidas de Supabase.`);
    return visits;
  } catch (error) {
    console.error('Error al obtener visitas de Supabase:', error);
    return [];
  }
};