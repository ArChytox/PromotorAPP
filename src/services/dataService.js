// @ts-nocheck
// PromotorAPP/src/services/dataService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import NetInfo from '@react-native-community/netinfo';

const LOCAL_STORAGE_KEY_VISITS = '@promotor_visits';
const LOCAL_STORAGE_KEY_COMMERCES = '@promotor_commerces';

console.log("DEBUG [dataService]: Valor de 'supabase' después de la importación:", supabase);

// --- Funciones auxiliares para la sincronización inmediata ---

/**
 * Intenta sincronizar un comercio individual con Supabase.
 * Se reutiliza la lógica de syncPendingCommerces pero para un solo elemento.
 * @param {object} commerce - El objeto comercio a sincronizar.
 * @returns {Promise<boolean>} - True si la sincronización fue exitosa, false en caso contrario.
 */
const syncSingleCommerce = async (commerce) => {
    try {
        if (!supabase) {
            console.error("ERROR CRÍTICO: 'supabase' es undefined en syncSingleCommerce. Verifique su inicialización.");
            return false;
        }

        const commerceDataForSupabase = {
            name: commerce.name,
            address: commerce.address,
            phone: commerce.phone,
            category: commerce.category,
            createdAt: commerce.createdAt,
            route_id: commerce.route_id, // Incluye route_id para la inserción/actualización en Supabase
        };

        let supabaseResponse;
        if (commerce.supabaseId) {
            console.log(`[dataService] Sincronizando: Actualizando comercio con Supabase ID: ${commerce.supabaseId}`);
            supabaseResponse = await supabase
                .from('commerces')
                .update(commerceDataForSupabase)
                .eq('id', commerce.supabaseId)
                .select()
                .single();
        } else {
            console.log(`[dataService] Sincronizando: Insertando nuevo comercio local ID: ${commerce.id}`);
            supabaseResponse = await supabase
                .from('commerces')
                .insert(commerceDataForSupabase)
                .select()
                .single();
        }

        const { data, error } = supabaseResponse;

        if (error) {
            console.error('Error al insertar/actualizar comercio individual en Supabase:', error);
            return false;
        } else {
            const syncedCommerceSupabaseId = data.id;
            console.log(`Comercio con ID local "${commerce.id}" sincronizado individualmente. Nuevo/Actualizado ID Supabase: "${syncedCommerceSupabaseId}"`);
            await updateLocalCommerceWithSupabaseId(commerce.id, syncedCommerceSupabaseId);
            return true;
        }
    } catch (error) {
        console.error('Error de red o API al sincronizar comercio individual:', error);
        return false;
    }
};

/**
 * Intenta sincronizar una visita individual con Supabase.
 * Se reutiliza la lógica de syncPendingVisits pero para un solo elemento.
 * @param {object} visit - El objeto visita a sincronizar.
 * @param {Array<object>} localCommerces - Lista de comercios locales para resolver IDs.
 * @returns {Promise<boolean>} - True si la sincronización fue exitosa, false en caso contrario.
 */
const syncSingleVisit = async (visit, localCommerces) => {
    try {
        if (!supabase) {
            console.error("ERROR CRÍTICO: 'supabase' es undefined en syncSingleVisit. Verifique su inicialización.");
            return false;
        }

        let finalCommerceIdForSupabase = visit.commerceId;

        // Si el commerceId de la visita es un ID local, buscamos su Supabase ID correspondiente
        if (visit.commerceId.startsWith('local-commerce-')) {
            const correspondingCommerce = localCommerces.find(c => c.id === visit.commerceId);
            if (correspondingCommerce && correspondingCommerce.sincronizado && correspondingCommerce.supabaseId) {
                finalCommerceIdForSupabase = correspondingCommerce.supabaseId;
                console.log(`DEBUG: Visita ${visit.id}: Comercio local "${visit.commerceId}" mapeado a SupabaseId: "${finalCommerceIdForSupabase}"`);
            } else {
                console.warn(`Visita ${visit.id}: Comercio asociado ("${visit.commerceId}") aún no sincronizado o no tiene SupabaseId. No se puede sincronizar la visita individualmente.`);
                return false; // No se puede sincronizar si el comercio padre no está listo
            }
        } else {
            console.log(`DEBUG: Visita ${visit.id}: commerceId "${visit.commerceId}" no es local. Usando tal cual.`);
        }

        const { data: visitData, error: visitError } = await supabase
            .from('visits')
            .insert({
                commerce_id: finalCommerceIdForSupabase,
                commerce_name: visit.commerceName,
                timestamp: visit.timestamp, // Este valor ahora se garantiza que está en UTC
                promoter_id: visit.promoterId,
                product_entries: visit.productEntries || [],
                competitor_entries: visit.competitorEntries || [],
                photos: visit.photos || [],
                location: visit.location || {},
                section_status: visit.sectionStatus || {},
                photo_before_uri: visit.photoBeforeUri,
                photo_after_uri: visit.photo_after_uri,
            })
            .select()
            .single();

        if (visitError) {
            if (visitError.code === '23505') { // Código para duplicado (primary key/unique constraint violation)
                console.warn(`Visita con ID local "${visit.id}" ya parece existir en Supabase (error: ${visitError.message}).`);
                await markVisitAsSynced(visit.id); // Si ya existe, asumimos que está sincronizada
                return true;
            }
            console.error('Error al insertar visita principal individualmente en Supabase:', visitError);
            return false;
        }

        const supabaseVisitId = visitData.id;
        console.log(`Visita principal con ID local "${visit.id}" sincronizada individualmente. ID Supabase: "${supabaseVisitId}"`);

        // --- Inserción de sub-tablas (product_visits, competitor_product_visits, visit_photos, visit_locations) ---
        // Estas inserciones deben hacerse después de que la visita principal haya sido creada en Supabase.

        // --- INSERCIÓN DE PRODUCTOS (product_visits) ---
        if (visit.productEntries && visit.productEntries.length > 0) {
            const productInserts = visit.productEntries.map(entry => ({
                visit_id: supabaseVisitId,
                product_id: entry.productId,
                product_name: entry.productName,
                currency: entry.currency,
                price: entry.price,
                shelf_stock: entry.shelfStock,
                general_stock: entry.generalStock,
            }));
            const { error: productsError } = await supabase.from('product_visits').insert(productInserts);
            if (productsError) console.error('Error al insertar product_visits:', productsError);
            else console.log('Product_visits insertados con éxito para visita:', supabaseVisitId);
        }

        // --- INSERCIÓN DE COMPETENCIA (competitor_product_visits) ---
        if (visit.competitorEntries && visit.competitorEntries.length > 0) {
            const competitorInserts = visit.competitorEntries.map(entry => ({
                visit_id: supabaseVisitId,
                product_id: entry.productId,
                product_name: entry.productName,
                price: entry.price,
                currency: entry.currency,
            }));
            const { error: competitorError } = await supabase.from('competitor_product_visits').insert(competitorInserts);
            if (competitorError) console.error('Error al insertar competitor_product_visits:', competitorError);
            else console.log('Competitor_product_visits insertados con éxito para visita:', supabaseVisitId);
        }

        // --- INSERCIÓN DE FOTOS (visit_photos) ---
        if (visit.photos && visit.photos.length > 0) {
            for (const photoUri of visit.photos) {
                const { error: photoError } = await supabase
                    .from('visit_photos')
                    .insert({
                        visit_id: supabaseVisitId,
                        photo_url: photoUri,
                        timestamp: visit.timestamp, // Asegúrate de que este timestamp también sea UTC
                    });
                if (photoError) console.error('Error al insertar visit_photo:', photoError);
                else console.log('Visit_photo insertada con éxito para visita:', supabaseVisitId);
            }
        }

        // --- INSERCIÓN DE UBICACIÓN (visit_locations) ---
        if (visit.location) {
            const { error: locationError } = await supabase
                .from('visit_locations')
                .insert({
                    visit_id: supabaseVisitId,
                    latitude: visit.location.latitude,
                    longitude: visit.location.longitude,
                    timestamp: visit.location.timestamp || visit.timestamp, // Asegúrate de que este timestamp también sea UTC, o usa el de la visita
                    accuracy: visit.location.accuracy,
                    altitude: visit.location.altitude,
                    city_name: visit.location.cityName,
                    address_name: visit.location.addressName,
                });
            if (locationError) console.error('Error al insertar visit_location:', locationError);
            else console.log('Visit_location insertada con éxito para visita:', supabaseVisitId);
        }

        await markVisitAsSynced(visit.id);
        console.log(`Visita completa con ID local "${visit.id}" sincronizada y marcada.`);
        return true;
    } catch (error) {
        console.error(`Error general al sincronizar visita individual con ID local "${visit.id}":`, error);
        return false;
    }
};


// --- Modificaciones en saveCommerceLocally y saveVisitLocally ---

/**
 * Guarda un nuevo comercio localmente en AsyncStorage y opcionalmente lo sincroniza si hay conexión.
 * @param {object} commerceData - Los datos del comercio a guardar.
 * @param {boolean} isConnected - Estado actual de conexión (desde useAuth).
 * @param {boolean} isAuthenticated - Estado actual de autenticación (desde useAuth).
 * @param {string} promoterRouteId - El ID de la ruta del promotor que está creando el comercio.
 * @returns {Promise<object>} - El comercio guardado con el estado de sincronización.
 */
export const saveCommerceLocally = async (commerceData, isConnected, isAuthenticated, promoterRouteId) => {
    try {
        const currentCommerces = await getLocalCommerces();
        const newCommerce = {
            ...commerceData,
            id: commerceData.id || `local-commerce-${Date.now()}`,
            sincronizado: false, // Siempre se guarda como NO sincronizado inicialmente
            supabaseId: undefined,
            route_id: promoterRouteId, // Asigna el route_id al comercio local
        };
        const updatedCommerces = [...currentCommerces, newCommerce];
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(updatedCommerces));
        console.log('Comercio guardado localmente:', newCommerce);

        // Intenta sincronizar inmediatamente si hay conexión Y autenticación
        if (isConnected && isAuthenticated) {
            console.log(`[dataService] Conexión (${isConnected}) y autenticación (${isAuthenticated}) detectadas. Intentando sincronización inmediata de comercio.`);
            const syncSuccess = await syncSingleCommerce(newCommerce);
            if (syncSuccess) {
                const updatedCommercesAfterSync = await getLocalCommerces();
                const syncedCommerce = updatedCommercesAfterSync.find(c => c.id === newCommerce.id);
                return syncedCommerce || { ...newCommerce, sincronizado: true }; // Fallback
            }
        } else {
            console.log(`[dataService] Sincronización inmediata de comercio NO intentada. Conectado: ${isConnected}, Autenticado: ${isAuthenticated}.`);
        }
        return newCommerce; // Si no hay conexión o falla la sincronización, devuelve el comercio tal cual
    } catch (error) {
        console.error('Error al guardar comercio localmente:', error);
        throw error;
    }
};

/**
 * Guarda una nueva visita localmente en AsyncStorage y opcionalmente la sincroniza si hay conexión.
 * @param {object} visitData - Los datos de la visita a guardar.
 * @param {boolean} isConnected - Estado actual de conexión (desde useAuth).
 * @param {boolean} isAuthenticated - Estado actual de autenticación (desde useAuth).
 * @returns {Promise<object>} - La visita guardada con el estado de sincronización.
 */
export const saveVisitLocally = async (visitData, isConnected, isAuthenticated) => {
    try {
        const currentVisits = await getLocalVisits();
        const existingVisitIndex = currentVisits.findIndex(v => v.id === visitData.id);
        let newVisit;

        if (existingVisitIndex > -1) {
            // Si la visita ya existe, la actualizamos
            newVisit = {
                ...currentVisits[existingVisitIndex],
                ...visitData,
                sincronizado: false, // Siempre marca como no sincronizada al guardar/actualizar
                // Asegura que el timestamp principal sea UTC
                timestamp: visitData.timestamp || currentVisits[existingVisitIndex].timestamp || new Date().toISOString(),
                fecha_creacion_local: currentVisits[existingVisitIndex].fecha_creacion_local || new Date().toISOString(),
            };
            currentVisits[existingVisitIndex] = newVisit;
        } else {
            // Si es una visita nueva, la añadimos
            newVisit = {
                ...visitData,
                id: visitData.id || `local-visit-${Date.now()}`, // Asegura un ID único local
                sincronizado: false,
                // Genera el timestamp principal en UTC si no viene en visitData
                timestamp: visitData.timestamp || new Date().toISOString(),
                fecha_creacion_local: new Date().toISOString(),
            };
            currentVisits.push(newVisit);
        }
        
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_VISITS, JSON.stringify(currentVisits));
        console.log('Visita guardada localmente:', newVisit);

        // Intenta sincronizar inmediatamente si hay conexión Y autenticación
        if (isConnected && isAuthenticated) {
            console.log(`[dataService] Conexión (${isConnected}) y autenticación (${isAuthenticated}) detectadas. Intentando sincronización inmediata de visita.`);
            const localCommerces = await getLocalCommerces(); // Necesario para mapear commerceId si es local
            const syncSuccess = await syncSingleVisit(newVisit, localCommerces);
            if (syncSuccess) {
                const updatedVisitsAfterSync = await getLocalVisits();
                const syncedVisit = updatedVisitsAfterSync.find(v => v.id === newVisit.id);
                return syncedVisit || { ...newVisit, sincronizado: true }; // Fallback
            }
        } else {
            console.log(`[dataService] Sincronización inmediata de visita NO intentada. Conectado: ${isConnected}, Autenticado: ${isAuthenticated}.`);
        }
        return newVisit;
    } catch (error) {
        console.error('Error al guardar visita localmente:', error);
        throw error;
    }
};

// --- NUEVA FUNCIÓN: getCommercesByRoute ---

/**
 * Obtiene comercios de Supabase filtrados por route_id y los cachea localmente.
 * Si no hay conexión, los obtiene del caché local.
 * @param {string} routeId - El ID de la ruta para filtrar los comercios.
 * @returns {Promise<Array<object>>} - Un array de objetos de comercio.
 */
export const getCommercesByRoute = async (routeId) => {
    try {
        const netInfoState = await NetInfo.fetch();
        const isConnected = netInfoState.isConnected;

        if (!supabase) {
            console.error("ERROR CRÍTICO: 'supabase' es undefined en getCommercesByRoute. Verifique su inicialización.");
            // Si Supabase no está inicializado, solo podemos devolver los comercios locales.
            return await getLocalCommercesForRoute(routeId);
        }

        if (isConnected) {
            console.log(`[dataService] Intentando obtener comercios de Supabase para route_id: ${routeId}`);
            const { data, error } = await supabase
                .from('commerces')
                .select('*')
                .eq('route_id', routeId); // FILTRADO POR route_id

            if (error) {
                console.error(`Error al obtener comercios de Supabase para la ruta ${routeId}:`, error.message);
                // Si falla la consulta a Supabase, intentamos cargar desde el caché local.
                return await getLocalCommercesForRoute(routeId);
            }

            console.log(`[dataService] ${data.length} comercios obtenidos de Supabase para la ruta ${routeId}.`);
            // Actualizar el caché local con los comercios de Supabase
            let localCommerces = await getLocalCommerces();

            const syncedCommercesFromSupabase = data.map(commerce => ({
                id: commerce.id, // Supabase ID como ID local
                supabaseId: commerce.id,
                name: commerce.name,
                address: commerce.address,
                phone: commerce.phone,
                category: commerce.category,
                createdAt: commerce.createdAt,
                sincronizado: true,
                route_id: commerce.route_id, // Asegura que el route_id venga de Supabase
            }));

            const combinedCommerces = {};

            // Añadir comercios de Supabase al mapa
            syncedCommercesFromSupabase.forEach(c => {
                combinedCommerces[c.id] = c;
            });

            // Añadir o actualizar comercios locales no sincronizados que pertenecen a esta ruta
            localCommerces.forEach(c => {
                // Si el comercio es local-commerce- y pertenece a la ruta del promotor
                // Y si no existe ya una versión sincronizada de este comercio en combinedCommerces
                if (!c.sincronizado && c.id.startsWith('local-commerce-') && c.route_id === routeId) {
                    combinedCommerces[c.id] = c; // Mantiene el comercio local no sincronizado
                }
            });
            
            const finalCommercesToCache = Object.values(combinedCommerces);
            await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(finalCommercesToCache));
            
            return finalCommercesToCache;

        } else {
            console.log(`[dataService] No hay conexión. Cargando comercios de la ruta ${routeId} desde el caché local.`);
            // Si no hay conexión, simplemente carga los comercios relevantes del AsyncStorage
            return await getLocalCommercesForRoute(routeId);
        }
    } catch (error) {
        console.error('Error en getCommercesByRoute:', error);
        // En caso de cualquier error, intenta cargar del caché local como fallback
        return await getLocalCommercesForRoute(routeId);
    }
};

/**
 * Obtiene comercios del AsyncStorage que pertenecen a una ruta específica.
 * @param {string} routeId - El ID de la ruta.
 * @returns {Promise<Array<object>>} - Un array de objetos de comercio.
 */
const getLocalCommercesForRoute = async (routeId) => {
    try {
        const allLocalCommerces = await getLocalCommerces();
        // Filtra los comercios locales para incluir solo los de la ruta especificada
        return allLocalCommerces.filter(commerce => commerce.route_id === routeId);
    } catch (error) {
        console.error('Error al obtener comercios locales por ruta:', error);
        return [];
    }
};

// --- RESTO DEL CÓDIGO ---

/**
 * Obtiene todos los comercios guardados localmente desde AsyncStorage.
 * @returns {Promise<Array<object>>} - Un array de objetos de comercio.
 */
export const getLocalCommerces = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(LOCAL_STORAGE_KEY_COMMERCES);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error al obtener comercios locales:', error);
        return [];
    }
};

/**
 * Actualiza un comercio localmente con su ID de Supabase.
 * @param {string} localId - El ID local del comercio a actualizar.
 * @param {string} supabaseId - El ID que Supabase le asignó al comercio.
 */
export const updateLocalCommerceWithSupabaseId = async (localId, supabaseId) => {
    try {
        let currentCommerces = await getLocalCommerces();
        currentCommerces = currentCommerces.map(commerce =>
            commerce.id === localId ? { ...commerce, sincronizado: true, supabaseId: supabaseId, id: supabaseId } : commerce // Actualizar 'id' local a 'supabaseId'
        );
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(currentCommerces));
        console.log(`Comercio local original con ID "${localId}" actualizado con Supabase ID: "${supabaseId}" y marcado como sincronizado.`);
    } catch (error) {
        console.error('Error al actualizar comercio local con ID de Supabase:', error);
    }
};


/**
 * Obtiene todas las visitas guardadas localmente desde AsyncStorage.
 * @returns {Promise<Array<object>>} - Un array de objetos de visita.
 */
export const getLocalVisits = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(LOCAL_STORAGE_KEY_VISITS);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error al obtener visitas locales:', error);
        return [];
    }
};

/**
 * Marca un comercio local como sincronizado en AsyncStorage.
 * (Esta función ahora es menos crítica si se usa `updateLocalCommerceWithSupabaseId`,
 * pero la mantenemos por si la usas en otro lado sin actualizar el ID).
 * @param {string} localId - El ID local del comercio a actualizar.
*/
export const markCommerceAsSynced = async (localId) => {
    try {
        let currentCommerces = await getLocalCommerces();
        currentCommerces = currentCommerces.map(commerce =>
            commerce.id === localId ? { ...commerce, sincronizado: true } : commerce
        );
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(currentCommerces));
        console.log(`Comercio con ID ${localId} marcado como sincronizado.`);
    } catch (error) {
        console.error('Error al marcar comercio como sincronizado:', error);
    }
};

/**
 * Marca una visita local como sincronizada en AsyncStorage.
 * @param {string} localId - El ID local de la visita a actualizar.
 */
export const markVisitAsSynced = async (localId) => {
    try {
        let currentVisits = await getLocalVisits();
        currentVisits = currentVisits.map(visit =>
            visit.id === localId ? { ...visit, sincronizado: true } : visit
        );
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_VISITS, JSON.stringify(currentVisits));
        console.log(`Visita con ID ${localId} marcada como sincronizada.`);
    } catch (error) {
        console.error('Error al marcar visita como sincronizada:', error);
    }
};

/**
 * Sincroniza comercios pendientes con Supabase.
 */
export const syncPendingCommerces = async () => {
    const netInfoState = await NetInfo.fetch();
    if (!netInfoState.isConnected) {
        console.log('No hay conexión a internet. Sincronización de comercios pospuesta.');
        return;
    }

    console.log('Iniciando sincronización de comercios pendientes...');
    const commercesToSync = (await getLocalCommerces()).filter(c => !c.sincronizado);

    if (commercesToSync.length === 0) {
        console.log('No hay comercios pendientes para sincronizar.');
        return;
    }

    for (const commerce of commercesToSync) {
        await syncSingleCommerce(commerce);
    }
    console.log('Sincronización masiva de comercios completada.');
};

/**
 * Sincroniza las visitas pendientes con Supabase.
 */
export const syncPendingVisits = async () => {
    const netInfoState = await NetInfo.fetch();
    if (!netInfoState.isConnected) {
        console.log('No hay conexión a internet. Sincronización de visitas pospuesta.');
        return;
    }

    console.log('Iniciando sincronización de visitas pendientes...');
    const visitsToSync = (await getLocalVisits()).filter(visit => !visit.sincronizado);

    if (visitsToSync.length === 0) {
        console.log('No hay visitas pendientes para sincronizar.');
        return;
    }

    const localCommerces = await getLocalCommerces();

    for (const visit of visitsToSync) {
        await syncSingleVisit(visit, localCommerces);
    }
    console.log('Sincronización masiva de visitas completada.');
};

// Función para limpiar AsyncStorage COMPLETAMENTE (usar con precaución en producción)
export const clearAllLocalData = async () => {
    try {
        await AsyncStorage.clear();
        console.log('Todos los datos de AsyncStorage han sido borrados.');
    } catch (error) {
        console.error('Error al borrar todos los datos de AsyncStorage:', error);
    }
};