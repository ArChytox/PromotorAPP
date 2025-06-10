// PromotorAPP/src/services/dataService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase'; // Asegúrate de que esta ruta sea correcta y que supabase esté inicializado.
import NetInfo from '@react-native-community/netinfo';

const LOCAL_STORAGE_KEY_VISITS = '@promotor_visits';
const LOCAL_STORAGE_KEY_COMMERCES = '@promotor_commerces';

console.log("DEBUG [dataService]: Valor de 'supabase' después de la importación:", supabase);

// --- Funciones auxiliares para operaciones locales de AsyncStorage ---

/**
 * Obtiene todos los comercios guardados localmente desde AsyncStorage.
 * @returns {Promise<Array<object>>} - Un array de objetos de comercio.
 */
const getLocalCommerces = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(LOCAL_STORAGE_KEY_COMMERCES);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error al obtener comercios locales:', error);
        return [];
    }
};

/**
 * Obtiene todas las visitas guardadas localmente desde AsyncStorage.
 * @returns {Promise<Array<object>>} - Un array de objetos de visita.
 */
const getLocalVisits = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(LOCAL_STORAGE_KEY_VISITS);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error al obtener visitas locales:', error);
        return [];
    }
};

/**
 * Actualiza un comercio localmente con su ID de Supabase y lo marca como sincronizado.
 * Si el comercio ya tenía un ID de Supabase, lo actualiza. Si no, lo asigna.
 * @param {string} localId - El ID local del comercio a actualizar.
 * @param {string} supabaseId - El ID que Supabase le asignó al comercio.
 */
const updateLocalCommerceWithSupabaseId = async (localId, supabaseId) => {
    try {
        let currentCommerces = await getLocalCommerces();
        currentCommerces = currentCommerces.map(commerce =>
            commerce.id === localId ? { ...commerce, sincronizado: true, supabaseId: supabaseId, id: supabaseId } : commerce
        );
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(currentCommerces));
        console.log(`Comercio local original con ID "${localId}" actualizado con Supabase ID: "${supabaseId}" y marcado como sincronizado.`);
    } catch (error) {
        console.error('Error al actualizar comercio local con ID de Supabase:', error);
    }
};

/**
 * Marca una visita local como sincronizada en AsyncStorage.
 * @param {string} localId - El ID local de la visita a actualizar.
 */
const markVisitAsSynced = async (localId) => {
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
 * Función auxiliar para agregar o actualizar un comercio en el almacenamiento local.
 * Es útil cuando obtienes un comercio de Supabase y quieres asegurarte de que
 * esté actualizado en tu caché local.
 */
const upsertLocalCommerce = async (newOrUpdatedCommerce) => {
    try {
        let currentCommerces = await getLocalCommerces();
        // Buscar por id local o por supabaseId si ya está sincronizado
        const index = currentCommerces.findIndex(c =>
            String(c.id) === String(newOrUpdatedCommerce.id) ||
            (newOrUpdatedCommerce.supabaseId && String(c.supabaseId) === String(newOrUpdatedCommerce.supabaseId))
        );

        if (index > -1) {
            // Actualizar existente, manteniendo las propiedades que no vienen de Supabase
            currentCommerces[index] = {
                ...currentCommerces[index],
                ...newOrUpdatedCommerce,
                sincronizado: true, // Asegura que esté marcado como sincronizado
            };
            console.log(`Comercio ${newOrUpdatedCommerce.id || newOrUpdatedCommerce.supabaseId} actualizado en caché local.`);
        } else {
            // Añadir nuevo
            currentCommerces.push({ ...newOrUpdatedCommerce, sincronizado: true });
            console.log(`Comercio ${newOrUpdatedCommerce.id || newOrUpdatedCommerce.supabaseId} añadido a caché local.`);
        }
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(currentCommerces));
    } catch (error) {
        console.error('Error al agregar/actualizar comercio en caché local:', error);
    }
};

/**
 * Obtiene un comercio específico del AsyncStorage por su ID (local o Supabase).
 * @param {string} commerceId - El ID del comercio a buscar.
 * @returns {Promise<object | null>} - El objeto comercio si se encuentra, o null.
 */
const getLocalCommerceById = async (commerceId) => {
    try {
        const allLocalCommerces = await getLocalCommerces();
        const foundCommerce = allLocalCommerces.find(c => String(c.id) === String(commerceId) || String(c.supabaseId) === String(commerceId));
        if (foundCommerce) {
            console.log(`Comercio con ID ${commerceId} encontrado en caché local.`);
        } else {
            console.warn(`Comercio con ID ${commerceId} NO ENCONTRADO en caché local.`);
        }
        return foundCommerce || null;
    } catch (error) {
        console.error('Error al obtener comercio localmente por ID:', error);
        return null;
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

// --- Funciones para sincronización individual ---

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
            // Si el error es por duplicado (ej. se creó en otro lado entre fetch y sync)
            if (error.code === '23505' && error.details.includes('commerce_name_address_key')) { // Ajusta el nombre de la restricción única si es diferente
                console.warn(`Comercio con nombre y dirección duplicados. Asumiendo que ya existe en Supabase: ${commerce.name}, ${commerce.address}`);
                // Intentar buscar el comercio existente para obtener su supabaseId
                const { data: existingCommerce, error: searchError } = await supabase
                    .from('commerces')
                    .select('id')
                    .eq('name', commerce.name)
                    .eq('address', commerce.address)
                    .single();

                if (existingCommerce) {
                    await updateLocalCommerceWithSupabaseId(commerce.id, existingCommerce.id);
                    return true;
                } else {
                    console.error('No se pudo encontrar el comercio duplicado en Supabase. Se mantiene sin sincronizar localmente.');
                    return false;
                }
            }
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

        // Antes de insertar la visita principal, verificar si ya existe usando el id local
        // Esto es una estrategia simple para evitar duplicados si la app se reinicia y se intenta resincronizar lo mismo.
        // En Supabase no se puede insertar con un ID, el ID se autogenera.
        // La clave única debería ser una combinación de commerce_id, timestamp, promoter_id para visitas.
        // Asumo que el `visit.id` local NO se usa para la PK de Supabase.
        // Si tienes una clave única diferente en Supabase (ej: (commerce_id, timestamp, promoter_id)),
        // entonces el error '23505' se activará por esa clave.

        const { data: visitData, error: visitError } = await supabase
            .from('visits')
            .insert({
                commerce_id: finalCommerceIdForSupabase,
                commerce_name: visit.commerceName,
                timestamp: visit.timestamp,
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
                console.warn(`Visita con ID local "${visit.id}" ya parece existir en Supabase (error: ${visitError.message}). Marcando como sincronizada.`);
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
        // Asumiendo que `visit.photos` contiene URIs de las fotos cargadas a un bucket de Supabase
        // o si es una lista de URIs locales que deben ser procesadas/subidas antes por otra función.
        // Si `photo_before_uri` y `photo_after_uri` son las principales, asegúrate de que se inserten.
        // Aquí se asume que `visit.photos` es una lista de URIs secundarias o adicionales.
        const allPhotoUris = [visit.photo_before_uri, visit.photo_after_uri, ...(visit.photos || [])].filter(Boolean);

        if (allPhotoUris.length > 0) {
            const photoInserts = allPhotoUris.map(uri => ({
                visit_id: supabaseVisitId,
                photo_url: uri,
                timestamp: visit.timestamp, // Usa el timestamp de la visita
            }));
            const { error: photosError } = await supabase.from('visit_photos').insert(photoInserts);
            if (photosError) console.error('Error al insertar visit_photos:', photosError);
            else console.log('Visit_photos insertadas con éxito para visita:', supabaseVisitId);
        }

        // --- INSERCIÓN DE UBICACIÓN (visit_locations) ---
        if (visit.location && visit.location.latitude && visit.location.longitude) { // Asegura que haya datos de latitud/longitud
            const { error: locationError } = await supabase
                .from('visit_locations')
                .insert({
                    visit_id: supabaseVisitId,
                    latitude: visit.location.latitude,
                    longitude: visit.location.longitude,
                    timestamp: visit.location.timestamp || visit.timestamp, // Usa timestamp de location o de visita
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

// --- Funciones principales exportadas ---

/**
 * Guarda un nuevo comercio localmente en AsyncStorage y opcionalmente lo sincroniza si hay conexión.
 * @param {object} commerceData - Los datos del comercio a guardar.
 * @param {boolean} isConnected - Estado actual de conexión (desde useAuth).
 * @param {boolean} isAuthenticated - Estado actual de autenticación (desde useAuth).
 * @param {string} promoterRouteId - El ID de la ruta del promotor que está creando el comercio.
 * @returns {Promise<object>} - El comercio guardado con el estado de sincronización.
 */
const saveCommerceLocally = async (commerceData, isConnected, isAuthenticated, promoterRouteId) => {
    try {
        const currentCommerces = await getLocalCommerces();
        const newCommerce = {
            ...commerceData,
            id: commerceData.id || `local-commerce-${Date.now()}`,
            sincronizado: false, // Siempre se guarda como NO sincronizado inicialmente
            supabaseId: undefined, // Se establecerá después de la sincronización
            route_id: promoterRouteId, // Asigna el route_id al comercio local
            createdAt: commerceData.createdAt || new Date().toISOString(), // Asegura un timestamp
        };
        const updatedCommerces = [...currentCommerces, newCommerce];
        await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(updatedCommerces));
        console.log('Comercio guardado localmente:', newCommerce);

        // Intenta sincronizar inmediatamente si hay conexión Y autenticación
        if (isConnected && isAuthenticated) {
            console.log(`[dataService] Conexión (${isConnected}) y autenticación (${isAuthenticated}) detectadas. Intentando sincronización inmediata de comercio.`);
            const syncSuccess = await syncSingleCommerce(newCommerce);
            if (syncSuccess) {
                // Refresca el comercio local después de la sincronización para obtener el supabaseId actualizado
                const updatedCommercesAfterSync = await getLocalCommerces();
                const syncedCommerce = updatedCommercesAfterSync.find(c => c.id === newCommerce.id); // Ahora newCommerce.id podría ser el supabaseId
                return syncedCommerce || { ...newCommerce, sincronizado: true }; // Fallback en caso de que no se encuentre (poco probable)
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
const saveVisitLocally = async (visitData, isConnected, isAuthenticated) => {
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

/**
 * Obtiene un comercio específico por su ID de Supabase.
 * Prioriza la búsqueda en Supabase si hay conexión. Si falla o no hay conexión,
 * busca en el caché local.
 * @param {string} commerceId - El ID único del comercio a buscar.
 * @returns {Promise<object | null>} - El objeto comercio si se encuentra, o null.
 */
const getCommerceById = async (commerceId) => {
    try {
        const netInfoState = await NetInfo.fetch();
        const isConnected = netInfoState.isConnected;

        if (!supabase) {
            console.error("ERROR CRÍTICO: 'supabase' es undefined en getCommerceById. Verifique su inicialización.");
            return await getLocalCommerceById(commerceId);
        }

        if (isConnected) {
            console.log(`[dataService] Intentando obtener comercio con ID: ${commerceId} de Supabase.`);
            const { data, error } = await supabase
                .from('commerces')
                .select('*')
                .eq('id', commerceId) // Filtrado por ID
                .single(); // Esperamos un solo resultado

            if (error) {
                if (error.code === 'PGRST116') { // Código para "no rows found"
                    console.warn(`Comercio con ID ${commerceId} NO ENCONTRADO en Supabase. Intentando en caché local.`);
                } else {
                    console.error(`Error al obtener comercio con ID ${commerceId} de Supabase:`, error.message);
                }
                return await getLocalCommerceById(commerceId);
            }

            if (data) {
                console.log(`[dataService] Comercio con ID ${commerceId} obtenido de Supabase.`);
                const commerceToCache = {
                    id: data.id, // Supabase ID como ID local
                    supabaseId: data.id,
                    name: data.name,
                    address: data.address,
                    phone: data.phone,
                    category: data.category,
                    createdAt: data.createdAt,
                    sincronizado: true,
                    route_id: data.route_id,
                };
                await upsertLocalCommerce(commerceToCache);
                return commerceToCache;
            } else {
                console.warn(`Comercio con ID ${commerceId} no se encontró en Supabase. Intentando en caché local.`);
                return await getLocalCommerceById(commerceId);
            }

        } else {
            console.log(`[dataService] No hay conexión. Cargando comercio con ID ${commerceId} desde el caché local.`);
            return await getLocalCommerceById(commerceId);
        }
    } catch (error) {
        console.error('Error en getCommerceById:', error);
        return await getLocalCommerceById(commerceId);
    }
};

/**
 * Obtiene comercios de Supabase filtrados por route_id y los cachea localmente.
 * Si no hay conexión, los obtiene del caché local.
 * @param {string} routeId - El ID de la ruta para filtrar los comercios.
 * @returns {Promise<Array<object>>} - Un array de objetos de comercio.
 */
const getCommercesByRoute = async (routeId) => {
    try {
        const netInfoState = await NetInfo.fetch();
        const isConnected = netInfoState.isConnected;

        if (!supabase) {
            console.error("ERROR CRÍTICO: 'supabase' es undefined en getCommercesByRoute. Verifique su inicialización.");
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
                return await getLocalCommercesForRoute(routeId);
            }

            console.log(`[dataService] ${data.length} comercios obtenidos de Supabase para la ruta ${routeId}.`);

            // Mapear comercios de Supabase a formato local y marcarlos como sincronizados
            const syncedCommercesFromSupabase = data.map(commerce => ({
                id: commerce.id, // Supabase ID como ID local
                supabaseId: commerce.id,
                name: commerce.name,
                address: commerce.address,
                phone: commerce.phone,
                category: commerce.category,
                createdAt: commerce.createdAt,
                sincronizado: true,
                route_id: commerce.route_id,
            }));

            let localCommerces = await getLocalCommerces();
            const combinedCommercesMap = new Map();

            // Primero añadir todos los comercios sincronizados de Supabase
            syncedCommercesFromSupabase.forEach(c => combinedCommercesMap.set(c.id, c));

            // Luego añadir o actualizar comercios locales.
            // Si un comercio local tiene el mismo supabaseId que uno ya traído, se sobreescribe.
            // Si es un comercio local no sincronizado (`local-commerce-`), se añade si pertenece a la ruta.
            localCommerces.forEach(c => {
                if (c.sincronizado && c.supabaseId) {
                    // Si ya está sincronizado, la versión de Supabase ya lo gestionó.
                    // Pero si por alguna razón la versión local tiene datos más frescos, podríamos fusionarlos.
                    // Por simplicidad, la versión de Supabase prevalece si ya se añadió.
                    if (!combinedCommercesMap.has(c.supabaseId)) {
                        combinedCommercesMap.set(c.supabaseId, c);
                    }
                } else if (!c.sincronizado && c.id.startsWith('local-commerce-') && c.route_id === routeId) {
                    // Solo añadir comercios locales no sincronizados de esta ruta si no hay un equivalente de Supabase
                    // Esto es crucial para que los nuevos comercios se muestren antes de sincronizar
                    if (![...combinedCommercesMap.values()].some(sc => sc.name === c.name && sc.address === c.address && sc.route_id === c.route_id)) {
                        combinedCommercesMap.set(c.id, c);
                    }
                }
            });

            const finalCommercesToCache = Array.from(combinedCommercesMap.values());
            await AsyncStorage.setItem(LOCAL_STORAGE_KEY_COMMERCES, JSON.stringify(finalCommercesToCache));

            // Filtrar los comercios finales por la ruta solicitada antes de devolverlos
            // Esto asegura que solo se devuelvan los comercios relevantes para la ruta
            return finalCommercesToCache.filter(c => c.route_id === routeId);

        } else {
            console.log(`[dataService] No hay conexión. Cargando comercios de la ruta ${routeId} desde el caché local.`);
            return await getLocalCommercesForRoute(routeId);
        }
    } catch (error) {
        console.error('Error en getCommercesByRoute:', error);
        return await getLocalCommercesForRoute(routeId);
    }
};

/**
 * Obtiene los productos de la competencia desde Supabase.
 * @returns {Promise<Array<object>>} - Un array de objetos de productos de competencia.
 */
const getCompetitorProducts = async () => {
    try {
        if (!supabase) {
            console.error("ERROR CRÍTICO: 'supabase' es undefined en getCompetitorProducts. Verifique su inicialización.");
            return [];
        }
        console.log("dataService: Obteniendo productos de competencia de Supabase...");
        const { data, error } = await supabase
            .from('competitor_products') // <-- ASEGÚRATE DE QUE ESTE ES EL NOMBRE CORRECTO DE TU TABLA EN SUPABASE
            .select('*');

        if (error) {
            console.error("Error al obtener productos de competencia de Supabase:", error);
            throw error;
        }

        console.log("Productos de competencia obtenidos:", data);
        return data;
    } catch (err) {
        console.error("Excepción en getCompetitorProducts:", err);
        // Podrías considerar guardar un caché local de estos productos si no cambian a menudo.
        throw new Error("No se pudieron cargar los productos de la competencia.");
    }
};

/**
 * Obtiene los productos del promotor (tus propios productos) desde Supabase.
 * @returns {Promise<Array<object>>} - Un array de objetos de productos del promotor.
 */
const getPromoterProducts = async () => {
    try {
        if (!supabase) {
            console.error("ERROR CRÍTICO: 'supabase' es undefined en getPromoterProducts. Verifique su inicialización.");
            return [];
        }
        console.log("dataService: Obteniendo productos del promotor de Supabase...");
        const { data, error } = await supabase
            .from('products') // <-- ASEGÚRATE DE QUE ESTE ES EL NOMBRE CORRECTO DE TU TABLA DE PRODUCTOS
            .select('*');

        if (error) {
            console.error("Error al obtener productos del promotor de Supabase:", error);
            throw error;
        }

        console.log("Productos del promotor obtenidos:", data);
        return data;
    } catch (err) {
        console.error("Excepción en getPromoterProducts:", err);
        throw new Error("No se pudieron cargar los productos del promotor.");
    }
};

/**
 * Sincroniza comercios pendientes con Supabase.
 */
const syncPendingCommerces = async () => {
    const netInfoState = await NetInfo.fetch();
    if (!netInfoState.isConnected) {
        console.log('No hay conexión a internet. Sincronización de comercios pospuesta.');
        return;
    }

    if (!supabase) {
        console.error("ERROR CRÍTICO: 'supabase' es undefined en syncPendingCommerces. No se puede sincronizar.");
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
const syncPendingVisits = async () => {
    const netInfoState = await NetInfo.fetch();
    if (!netInfoState.isConnected) {
        console.log('No hay conexión a internet. Sincronización de visitas pospuesta.');
        return;
    }

    if (!supabase) {
        console.error("ERROR CRÍTICO: 'supabase' es undefined en syncPendingVisits. No se puede sincronizar.");
        return;
    }

    console.log('Iniciando sincronización de visitas pendientes...');
    const visitsToSync = (await getLocalVisits()).filter(visit => !visit.sincronizado);

    if (visitsToSync.length === 0) {
        console.log('No hay visitas pendientes para sincronizar.');
        return;
    }

    const localCommerces = await getLocalCommerces(); // Necesario para mapear commerceId si es local

    for (const visit of visitsToSync) {
        await syncSingleVisit(visit, localCommerces);
    }
    console.log('Sincronización masiva de visitas completada.');
};

/**
 * Función para limpiar AsyncStorage COMPLETAMENTE (usar con precaución en producción)
 */
const clearAllLocalData = async () => {
    try {
        await AsyncStorage.clear();
        console.log('Todos los datos de AsyncStorage han sido borrados.');
    } catch (error) {
        console.error('Error al borrar todos los datos de AsyncStorage:', error);
    }
};

// --- Exportación de todas las funciones como un objeto de servicio ---
export const dataService = {
    saveCommerceLocally,
    saveVisitLocally,
    getCommerceById,
    getCommercesByRoute,
    getLocalCommerces,
    getLocalVisits,
    updateLocalCommerceWithSupabaseId,
    markVisitAsSynced, // Mantengo esta por si se usa, aunque updateLocalCommerceWithSupabaseId ya hace la marcación para comercios
    syncPendingCommerces,
    syncPendingVisits,
    clearAllLocalData,
    getCompetitorProducts, // Nueva función para productos de competencia
    getPromoterProducts, // Función para tus propios productos
    // Opcional: podrías exportar las funciones individuales de sincronización si las necesitas directamente
    // syncSingleCommerce,
    // syncSingleVisit,
};