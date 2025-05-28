// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Commerce, Visit } from '../types/data'; // Importamos también Visit

const COMMERCES_STORAGE_KEY = '@PromotorApp:commerces';
const VISITS_STORAGE_KEY = '@PromotorApp:visits'; // Nueva clave para las visitas

/**
 * Guarda la lista de comercios en AsyncStorage.
 * @param commerces La lista de comercios a guardar.
 */
export const saveCommerces = async (commerces: Commerce[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(commerces);
    await AsyncStorage.setItem(COMMERCES_STORAGE_KEY, jsonValue);
    console.log('Comercios guardados exitosamente.');
  } catch (e) {
    console.error('Error al guardar comercios:', e);
    throw new Error('No se pudieron guardar los comercios.');
  }
};

/**
 * Carga la lista de comercios desde AsyncStorage.
 * @returns Una promesa que resuelve con la lista de comercios o un array vacío si no hay.
 */
export const getCommerces = async (): Promise<Commerce[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(COMMERCES_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error al cargar comercios:', e);
    throw new Error('No se pudieron cargar los comercios.');
  }
};

/**
 * Guarda la lista de visitas en AsyncStorage.
 * @param visits La lista de visitas a guardar.
 */
export const saveVisits = async (visits: Visit[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(visits);
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, jsonValue);
    console.log('Visitas guardadas exitosamente.');
  } catch (e) {
    console.error('Error al guardar visitas:', e);
    throw new Error('No se pudieron guardar las visitas.');
  }
};

/**
 * Carga la lista de visitas desde AsyncStorage.
 * @returns Una promesa que resuelve con la lista de visitas o un array vacío si no hay.
 */
export const getVisits = async (): Promise<Visit[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(VISITS_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error al cargar visitas:', e);
    throw new Error('No se pudieron cargar las visitas.');
  }
};