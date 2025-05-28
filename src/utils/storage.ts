// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Commerce, Visit } from '../types/data'; // Asegúrate de que Commerce y Visit estén importados correctamente

// Claves para AsyncStorage
const COMMERCES_STORAGE_KEY = '@promotorapp:commerces';
const VISITS_STORAGE_KEY = '@promotorapp:visits'; // Nueva clave para almacenar visitas

// --- Funciones para Comercios ---

export const getCommerces = async (): Promise<Commerce[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(COMMERCES_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error reading commerces from storage", e);
    return [];
  }
};

export const saveCommerces = async (commerces: Commerce[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(commerces);
    await AsyncStorage.setItem(COMMERCES_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error("Error saving commerces to storage", e);
    throw e; // Re-lanza el error para que sea manejado por la UI
  }
};

// --- Nuevas Funciones para Visitas ---

// Función para obtener todas las visitas guardadas
export const getVisits = async (): Promise<Visit[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(VISITS_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error reading visits from storage", e);
    return [];
  }
};

// Función para guardar una nueva visita (añadirla a la lista existente)
export const saveVisit = async (newVisit: Visit): Promise<void> => {
  try {
    const existingVisits = await getVisits(); // Obtener visitas existentes
    existingVisits.push(newVisit); // Añadir la nueva visita al array

    const jsonValue = JSON.stringify(existingVisits);
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, jsonValue);
    console.log("Visit saved successfully!");
  } catch (e) {
    console.error("Error saving visit to storage", e);
    throw e; // Re-lanza el error para que sea manejado por la UI
  }
};