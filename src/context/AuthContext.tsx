// @ts-nocheck
// PromotorAPP/src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet, Alert, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// IMPORTAR LA INSTANCIA DE SUPABASE Y LAS FUNCIONES DE SINCRONIZACIÓN
import { supabase } from '../services/supabase';
import { syncPendingCommerces, syncPendingVisits } from '../services/dataService';

// 1. Definir la interfaz (contrato) para el objeto de usuario autenticado
export interface User {
    id: string;
    email: string;
    username?: string;
    name?: string; 
    display_name?: string; // <-- Mantener para el uso interno de la app
    role?: string;
    route_id?: string | null; // <-- AÑADIDO: ID de la ruta asignada al promotor
}

// 2. Definir la interfaz (contrato) para el valor que el contexto proporcionará
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSyncing: boolean;
    isConnected: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    triggerSync: (reason?: string) => Promise<void>;
}

// 3. Crear el contexto de React
const AuthContext = createContext<AuthContextType | undefined>(undefined); // <-- Añadido tipo para createContext

// 4. Componente AuthProvider: Envuelve a la aplicación para proporcionar el contexto
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => { // <-- Añadido tipo para props
    const [user, setUser] = useState<User | null>(null); // <-- Añadido tipo
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnected, setIsConnected] = useState(true);

    const hasAttemptedInitialSync = useRef(false);

    // Función auxiliar para obtener el perfil completo del usuario, incluyendo el route_id
    const fetchUserProfile = useCallback(async (userId: string) => { // <-- AÑADIDO
        try {
            const { data, error } = await supabase
                .from('user_profiles') // Asegúrate que este es el nombre de tu tabla de perfiles
                // --- CAMBIO CLAVE AQUÍ: 'display_name' a 'name' ---
                .select('id, email, name, role, route_id') // Selecciona los campos necesarios, incluyendo route_id
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (data) {
                return {
                    id: data.id,
                    email: data.email || '',
                    // --- ASIGNACIÓN: Usa 'data.name' para 'display_name' ---
                    display_name: data.name || '', // Usa 'name' de la DB, pero guárdalo como 'display_name'
                    name: data.name || '', // También puedes guardar el 'name' original si lo necesitas por separado
                    role: data.role || 'user',
                    route_id: data.route_id, // <-- EL CAMPO CLAVE
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching user profile:', error.message);
            return null;
        }
    }, []);

    const triggerSync = useCallback(async (reason = 'desconocida') => {
        if (isSyncing) {
            console.log(`[Sync] Abortando sincronización (${reason}): ya en curso.`);
            return;
        }
        if (!isConnected) {
            console.log(`[Sync] Abortando sincronización (${reason}): sin conexión.`);
            return;
        }
        if (!isAuthenticated) {
            console.log(`[Sync] Abortando sincronización (${reason}): usuario no autenticado.`);
            return;
        }
        
        if (hasAttemptedInitialSync.current && reason === 'app_inicio_o_reconexion_automatica') {
            console.log(`[Sync] Sincronización automática de inicio ya intentada. Saltando. (Razón: ${reason})`);
            return;
        }

        setIsSyncing(true);
        console.log(`[Sync] Iniciando proceso de sincronización (razón: ${reason})...`);
        try {
            await syncPendingCommerces();
            await syncPendingVisits();
            console.log('[Sync] Sincronización completa.');
        } catch (error) {
            console.error('[Sync] Error durante la sincronización:', error.message);
            Alert.alert('Error de Sincronización', 'Hubo un problema al sincronizar los datos. Inténtalo de nuevo más tarde.');
        } finally {
            setIsSyncing(false);
            if (reason === 'app_inicio_o_reconexion_automatica' || reason === 'login_exitoso') {
                hasAttemptedInitialSync.current = true;
            }
        }
    }, [isSyncing, isConnected, isAuthenticated]);

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                throw error;
            }

            if (data.user) {
                // <-- MODIFICADO: Ahora obtenemos el perfil completo del usuario
                const userProfile = await fetchUserProfile(data.user.id);

                if (!userProfile) {
                    throw new Error('No se pudo cargar el perfil completo del usuario.');
                }
                
                const loggedInUser: User = { // <-- Añadido tipo
                    id: data.user.id,
                    email: data.user.email || '',
                    // username, name, display_name y role ahora vienen de userProfile
                    display_name: userProfile.display_name, 
                    name: userProfile.name, // Asegúrate de mantenerlo si lo necesitas
                    role: userProfile.role,
                    route_id: userProfile.route_id, // <-- EL CAMPO CLAVE
                };

                setUser(loggedInUser);
                setIsAuthenticated(true);
                await AsyncStorage.setItem('local_app_user_data', JSON.stringify(loggedInUser));

                Alert.alert('Éxito', `¡Inicio de sesión exitoso como ${loggedInUser.display_name || loggedInUser.email}!`);
                
                return true;
            } else {
                Alert.alert('Error', 'No se pudo obtener la información del usuario después del login.');
                return false;
            }
        } catch (error) {
            console.error('Error durante el login de Supabase:', error.message);
            Alert.alert('Error de Login', error.message || 'Error desconocido al iniciar sesión.');
            setUser(null);
            setIsAuthenticated(false);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                throw error;
            }

            setUser(null);
            setIsAuthenticated(false);
            await AsyncStorage.removeItem('local_app_user_data');
            Alert.alert('Sesión Cerrada', 'Has cerrado sesión exitosamente.');
            hasAttemptedInitialSync.current = false;
        } catch (error) {
            console.error('Error durante el logout de Supabase:', error.message);
            Alert.alert('Error de Logout', error.message || 'Error desconocido al cerrar sesión.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- EFECTOS DE CARGA Y SINCRONIZACIÓN ---

    // Efecto 1: Cargar el estado de autenticación de Supabase al iniciar la app
    useEffect(() => {
        const loadSupabaseSession = async () => {
            console.log('[AuthContext] Verificando sesión inicial de Supabase...');
            try {
                const storedLocalUser = await AsyncStorage.getItem('local_app_user_data');
                if (storedLocalUser) {
                    const parsedUser = JSON.parse(storedLocalUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                    console.log('[AuthContext] Usuario precargado de AsyncStorage:', parsedUser.email);
                }

                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[AuthContext] Error al obtener sesión de Supabase:', error.message);
                    setUser(null);
                    setIsAuthenticated(false);
                    await AsyncStorage.removeItem('local_app_user_data');
                } else if (session) {
                    console.log('[AuthContext] Sesión Supabase existente:', session.user?.email);
                    // <-- MODIFICADO: Ahora obtenemos el perfil completo del usuario
                    const userProfile = await fetchUserProfile(session.user.id);

                    if (!userProfile) {
                        throw new Error('No se pudo cargar el perfil completo del usuario para la sesión existente.');
                    }

                    const loadedUser: User = { // <-- Añadido tipo
                        id: session.user.id,
                        email: session.user.email || '',
                        // username, name, display_name y role ahora vienen de userProfile
                        display_name: userProfile.display_name,
                        name: userProfile.name, // Asegúrate de mantenerlo si lo necesitas
                        role: userProfile.role,
                        route_id: userProfile.route_id, // <-- EL CAMPO CLAVE
                    };
                    setUser(loadedUser);
                    setIsAuthenticated(true);
                    await AsyncStorage.setItem('local_app_user_data', JSON.stringify(loadedUser));
                } else {
                    console.log('[AuthContext] No hay sesión Supabase activa.');
                    setUser(null);
                    setIsAuthenticated(false);
                    await AsyncStorage.removeItem('local_app_user_data');
                }
            } catch (error) {
                console.error('[AuthContext] Error general en loadSupabaseSession:', error.message);
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
                console.log(`[AuthContext] Carga inicial de autenticación finalizada.`);
            }
        };

        loadSupabaseSession();

        // Listener para cambios de estado de autenticación de Supabase
        const { data: { subscription: authListenerSubscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`[AuthContext] Evento de Supabase auth: ${event}`);
                if (session) {
                    // <-- MODIFICADO: Ahora obtenemos el perfil completo del usuario
                    const userProfile = await fetchUserProfile(session.user.id);

                    if (!userProfile) {
                        console.error('No se pudo cargar el perfil completo del usuario en authStateChange.');
                        return; // No actualizar si no se puede obtener el perfil
                    }

                    const updatedUser: User = { // <-- Añadido tipo
                        id: session.user.id,
                        email: session.user.email || '',
                        // username, name, display_name y role ahora vienen de userProfile
                        display_name: userProfile.display_name,
                        name: userProfile.name, // Asegúrate de mantenerlo si lo necesitas
                        role: userProfile.role,
                        route_id: userProfile.route_id, // <-- EL CAMPO CLAVE
                    };
                    setUser(updatedUser);
                    setIsAuthenticated(true);
                    await AsyncStorage.setItem('local_app_user_data', JSON.stringify(updatedUser));
                    
                    console.log('[AuthContext] Disparando sincronización por cambio de estado de autenticación.');
                    triggerSync('login_exitoso');

                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                    await AsyncStorage.removeItem('local_app_user_data');
                    hasAttemptedInitialSync.current = false;
                }
            }
        );

        return () => {
            authListenerSubscription?.unsubscribe();
        };
    }, [fetchUserProfile, triggerSync]); // <-- Añadido fetchUserProfile a las dependencias

    // Efecto 2: Listener para el estado de la conexión a internet
    useEffect(() => {
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            const currentIsConnected = state.isConnected ?? true;
            console.log(`[NetInfo] Estado de conexión cambiado: ${currentIsConnected ? 'Conectado' : 'Desconectado'}`);
            setIsConnected(currentIsConnected);
        });

        NetInfo.fetch().then(state => {
            const currentIsConnected = state.isConnected ?? true;
            setIsConnected(currentIsConnected);
            console.log(`[NetInfo] Estado inicial de conexión: ${currentIsConnected ? 'Conectado' : 'Desconectado'}`);
        });

        return () => {
            unsubscribeNetInfo();
        };
    }, []);

    // Efecto 3: Disparar sincronización UNICAMENTE cuando la aplicación carga,
    // el usuario está autenticado, hay conexión, y la sincronización inicial NO ha sido intentada.
    useEffect(() => {
        console.log(`[Sync Effect Trigger] Evaluación: isLoading=${isLoading}, isAuthenticated=${isAuthenticated}, isConnected=${isConnected}, isSyncing=${isSyncing}, hasAttemptedInitialSync.current=${hasAttemptedInitialSync.current}`);

        if (!isLoading && isAuthenticated && isConnected && !hasAttemptedInitialSync.current) {
            console.log('[Sync Effect] Condiciones para SINCRONIZACIÓN INICIAL CUMPLIDAS. Disparando UNA VEZ.');
            triggerSync('app_inicio_o_reconexion_automatica');
        }
    }, [isLoading, isAuthenticated, isConnected, triggerSync]);

    const authContextValue = {
        user,
        isAuthenticated,
        isLoading,
        isSyncing,
        isConnected,
        login,
        logout,
        triggerSync,
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Cargando sesión...</Text>
            </View>
        );
    }

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// 5. Hook personalizado para consumir el contexto fácilmente
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

// Estilos para la pantalla de carga inicial del AuthProvider
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#3498db',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#ffffff',
    },
});