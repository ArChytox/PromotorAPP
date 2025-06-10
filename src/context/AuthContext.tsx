// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../services/supabase';

import { Alert } from 'react-native'; // Asegúrate de importar Alert

export interface User {
    id: string;
    email: string;
    username?: string;
    name?: string;
    display_name?: string;
    role?: string;
    route_id?: string | null;
}

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Siempre true al inicio
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnected, setIsConnected] = useState(true); // Asumir conectado hasta verificar

    // Refs para controlar el flujo y evitar duplicados
    const authStateSubscriptionRef = useRef<any>(null); // Para almacenar la suscripción de Supabase
    const initialLoadAttempted = useRef(false); // Para asegurar que la carga inicial solo se intente una vez
    const syncLock = useRef(false); // Bloqueo para la sincronización

    const fetchUserProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, email, name, role, route_id')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data ? {
                id: data.id,
                email: data.email || '',
                display_name: data.name || '',
                name: data.name || '',
                role: data.role || 'user',
                route_id: data.route_id,
            } : null;
        } catch (error: any) {
            console.error('Error fetching profile:', error.message);
            return null;
        }
    }, []); // Dependencias vacías: esta función es estable

    const triggerSync = useCallback(async (reason = 'unknown') => {
        if (syncLock.current || isSyncing || !isConnected || !user || !user.route_id) {
            console.log(`[Sync] Aborting sync (<span class="math-inline">\{reason\}\)\. Conditions\: lock\=</span>{syncLock.current}, isSyncing=<span class="math-inline">\{isSyncing\}, isConnected\=</span>{isConnected}, userPresent=<span class="math-inline">\{\!\!user\}, routeIdPresent\=</span>{!!user?.route_id}`);
            return;
        }

        syncLock.current = true; // Bloquear nuevas sincronizaciones
        setIsSyncing(true);
        console.log(`[Sync] Initiating sync (${reason})...`);

        try {
          //  await syncPendingCommerces();
            //await syncPendingVisits();
        } catch (error: any) {
            console.error('[Sync] Error:', error.message);
        } finally {
            setIsSyncing(false);
            // Pequeño retardo para evitar spam de sincronización.
            // Es un backoff simple, puedes ajustarlo si es necesario.
            setTimeout(() => {
                syncLock.current = false;
            }, 5000); // Esperar 5 segundos antes de permitir otra sincronización
        }
    }, [isSyncing, isConnected, user]); // Depende de estos estados y el objeto user

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            const userProfile = await fetchUserProfile(data.user.id);
            if (!userProfile) {
                await supabase.auth.signOut(); // Si no hay perfil, cerrar sesión.
                throw new Error('Perfil de usuario incompleto. Por favor, contacta a soporte.');
            }

            const loggedInUser: User = {
                id: data.user.id,
                email: data.user.email || '',
                display_name: userProfile.display_name,
                name: userProfile.name,
                role: userProfile.role,
                route_id: userProfile.route_id,
            };

            setUser(loggedInUser);
            setIsAuthenticated(true);
            await AsyncStorage.setItem('local_app_user_data', JSON.stringify(loggedInUser));

            if (isConnected && loggedInUser.route_id) {
                triggerSync('login_success');
            }

            return true;

        } catch (error: any) {
            console.error('Login error:', error.message);
            Alert.alert('Error de Inicio de Sesión', error.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [fetchUserProfile, isConnected, triggerSync]); // Depende de estas funciones/estados

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            setUser(null);
            setIsAuthenticated(false);
            await AsyncStorage.removeItem('local_app_user_data');
            Alert.alert('Sesión Cerrada', 'Has cerrado sesión correctamente.');

            // Resetear flags después de cerrar sesión
            initialLoadAttempted.current = false;
            syncLock.current = false;
        } catch (error: any) {
            console.error('Logout error:', error.message);
            Alert.alert('Error al Cerrar Sesión', error.message);
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependencias vacías: esta función es estable

    // EFFECT 1: Cargar la sesión inicial y establecer el listener de authStateChange UNA SOLA VEZ
    useEffect(() => {
        // Previene la doble ejecución si el componente se monta/desmonta rápidamente en desarrollo
        if (initialLoadAttempted.current) {
            setIsLoading(false); // Asegura que isLoading se desactiva si ya se intentó cargar
            return;
        }
        initialLoadAttempted.current = true; // Marca que el intento inicial ha comenzado

        const loadAndListen = async () => {
            setIsLoading(true);
            try {
                // 1. Intentar cargar desde AsyncStorage para una UI más rápida
                const storedUser = await AsyncStorage.getItem('local_app_user_data');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                    console.log('[AuthContext] Sesión restaurada desde AsyncStorage.');
                }

                // 2. Obtener sesión de Supabase y configurar el listener
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error || !session) {
                    console.log('[AuthContext] No hay sesión activa en Supabase o error.');
                    // Si no hay sesión o hay error, limpiar cualquier estado anterior
                    setUser(null);
                    setIsAuthenticated(false);
                    await AsyncStorage.removeItem('local_app_user_data');
                } else {
                    // Si hay sesión en Supabase, obtener perfil completo
                    const userProfile = await fetchUserProfile(session.user.id);
                    if (userProfile) {
                        const loadedUser: User = {
                            id: session.user.id,
                            email: session.user.email || '',
                            display_name: userProfile.display_name,
                            name: userProfile.name,
                            role: userProfile.role,
                            route_id: userProfile.route_id,
                        };
                        setUser(loadedUser);
                        setIsAuthenticated(true);
                        await AsyncStorage.setItem('local_app_user_data', JSON.stringify(loadedUser));
                        console.log('[AuthContext] Sesión activa de Supabase cargada.');
                    } else {
                        // Sesión pero perfil incompleto, cerrar sesión para evitar un estado inconsistente
                        console.warn('[AuthContext] Sesión Supabase activa pero perfil incompleto. Cerrando sesión.');
                        await supabase.auth.signOut();
                        setUser(null);
                        setIsAuthenticated(false);
                        await AsyncStorage.removeItem('local_app_user_data');
                    }
                }
            } catch (err: any) {
                console.error('[AuthContext] Error fatal al cargar/inicializar sesión:', err.message);
                setUser(null);
                setIsAuthenticated(false);
                await AsyncStorage.removeItem('local_app_user_data');
            } finally {
                setIsLoading(false); // La carga inicial ha terminado
                console.log('[AuthContext] Initial session load finished.');
            }
        };

        loadAndListen(); // Ejecutar la lógica de carga inicial

        // Configurar el listener de auth state change una sola vez
        authStateSubscriptionRef.current = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`[Auth State Change] Event: ${event}`);
                // setIsLoading(true); // Descomentar si el proceso dentro de onAuthStateChange es largo

                if (session) {
                    const userProfile = await fetchUserProfile(session.user.id);
                    if (!userProfile) {
                        console.warn('[Auth State Change] Perfil incompleto para el usuario logueado. Cerrando sesión.');
                        await supabase.auth.signOut(); // Forzar logout si el perfil es incompleto
                        setUser(null);
                        setIsAuthenticated(false);
                        await AsyncStorage.removeItem('local_app_user_data');
                        // setIsLoading(false);
                        return;
                    }

                    const updatedUser: User = {
                        id: session.user.id,
                        email: session.user.email || '',
                        display_name: userProfile.display_name,
                        name: userProfile.name,
                        role: userProfile.role,
                        route_id: userProfile.route_id,
                    };

                    // Solo actualizar el estado si el objeto de usuario realmente ha cambiado
                    // Esto evita renders innecesarios si la sesión se refresca sin cambios en el perfil
                    if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
                        setUser(updatedUser);
                        console.log('[Auth State Change] User state updated.');
                    }
                    setIsAuthenticated(true);
                    await AsyncStorage.setItem('local_app_user_data', JSON.stringify(updatedUser));


                    // Disparar sincronización solo si el evento es de login/sesión inicial/refresco y la conexión está bien
                    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
                        isConnected && updatedUser.route_id) {
                        triggerSync('auth_state_change');
                    }
                } else {
                    // Si no hay sesión (e.g., SIGNED_OUT), limpiar el estado local
                    if (user || isAuthenticated) { // Solo si previamente había un usuario logueado
                        console.log('[Auth State Change] Usuario desautenticado. Limpiando estado.');
                        setUser(null);
                        setIsAuthenticated(false);
                        await AsyncStorage.removeItem('local_app_user_data');
                    }
                }
                // setIsLoading(false); // Descomentar si se descomentó arriba
            }
        );

        // Función de limpieza para desuscribirse cuando el componente se desmonta
        return () => {
            console.log('[AuthContext] Cleaning up auth state subscription.');
            if (authStateSubscriptionRef.current) {
                authStateSubscriptionRef.current.data.subscription.unsubscribe();
            }
        };
    }, [fetchUserProfile, triggerSync, user, isAuthenticated, isConnected]); // Dependencias para reaccionar a cambios relevantes

    // EFFECT 2: Manejar cambios de estado de la red (separado para claridad)
    useEffect(() => {
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            const currentIsConnected = state.isConnected ?? true;
            if (isConnected !== currentIsConnected) {
                console.log(`[NetInfo] Connection changed to: ${currentIsConnected}`);
                setIsConnected(currentIsConnected);
                // Si la conexión se recupera y el usuario está autenticado, intenta sincronizar
                if (currentIsConnected && isAuthenticated && user?.route_id) {
                    triggerSync('app_reconnected');
                }
            }
        });

        // Obtener el estado inicial de la red
        NetInfo.fetch().then(state => {
            setIsConnected(state.isConnected ?? true);
            console.log(`[NetInfo] Initial connection state: ${state.isConnected ?? true}`);
        });

        return () => {
            console.log('[AuthContext] Cleaning up NetInfo subscription.');
            unsubscribeNetInfo();
        };
    }, [isConnected, isAuthenticated, user, triggerSync]); // Dependencias

    // Memoizar el valor del contexto para evitar re-renders innecesarios de los consumidores.
    const authContextValue = useMemo(() => ({
        user,
        isAuthenticated,
        isLoading,
        isSyncing,
        isConnected,
        login,
        logout,
        triggerSync,
    }), [user, isAuthenticated, isLoading, isSyncing, isConnected, login, logout, triggerSync]);

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
};