// PromotorAPP/App.tsx
import 'react-native-gesture-handler';
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { VisitProvider } from './src/context/VisitContext';
import { ActivityIndicator, View, StyleSheet, Alert, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import NetInfo from '@react-native-community/netinfo';

import {
  getLocalCommerces,
  getLocalVisits,
  syncPendingCommerces,
  syncPendingVisits,
} from './src/services/dataService';

import { Commerce, Visit } from './src/types/data'; // Ya no necesitas los tipos de `ProductVisitEntry`, etc., aquí.

SplashScreen.preventAutoHideAsync();

const AppContent = () => {
    const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();
    const [appIsReady, setAppIsReady] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    // Estos useRef aseguran que ciertas acciones solo se ejecuten una vez o bajo condiciones específicas.
    const initialSyncAttempted = useRef(false);
    const hasCheckedAuth = useRef(false);
    const netInfoInitialized = useRef(false); // <--- NUEVO: Para controlar la suscripción de NetInfo

    useEffect(() => {
        console.log(`[AppContent State] appIsReady: ${appIsReady}, isLoadingAuth: ${isLoadingAuth}, isAuthenticated: ${isAuthenticated}, isConnected: ${isConnected}, isSyncing: ${isSyncing}, initialSyncAttempted: ${initialSyncAttempted.current}, hasCheckedAuth: ${hasCheckedAuth.current}`);
    }, [appIsReady, isLoadingAuth, isAuthenticated, isConnected, isSyncing, initialSyncAttempted.current, hasCheckedAuth.current]);

    const updateLocalDataCounts = async () => {
      const commerces: Commerce[] = await getLocalCommerces();
      const visits: Visit[] = await getLocalVisits();
      // console.log(`Comercios locales: ${commerces.length}, Visitas locales: ${visits.length}, Visitas pendientes: ${visits.filter((v: Visit) => !v.sincronizado).length}`);
    };

    const handleSyncAllData = useCallback(async (triggeredByNetInfo: boolean = false) => { // <--- Nuevo parámetro
      console.log(`DEBUG: handleSyncAllData llamado. isSyncing (estado actual): ${isSyncing}, isConnected: ${isConnected}, triggeredByNetInfo: ${triggeredByNetInfo}`);
      if (isSyncing) {
        console.log('Sincronización abortada: ya en curso.');
        setSyncStatus('Sincronización ya en curso.');
        return;
      }
      if (!isConnected) {
        console.log('Sincronización abortada: sin conexión.');
        setSyncStatus('Sincronización fallida: Sin conexión a internet.');
        return;
      }

      setIsSyncing(true);
      setSyncStatus('Sincronizando datos...');
      try {
        console.log('Iniciando sincronización de comercios pendientes...');
        await syncPendingCommerces();
        console.log('Iniciando sincronización de visitas pendientes...');
        await syncPendingVisits();

        setSyncStatus('Sincronización completa con éxito.');
        // Solo muestra la alerta si no fue un auto-sync silencioso
        if (!triggeredByNetInfo) { // <--- Modificado
          Alert.alert('Sincronización', 'Todos los datos pendientes han sido sincronizados.');
        }
      } catch (error) {
        console.error('Error durante la sincronización:', error);
        setSyncStatus('Error durante la sincronización. Ver consola para más detalles.');
        Alert.alert('Sincronización Fallida', 'Hubo un error al sincronizar los datos. Verifique su conexión y los logs.');
      } finally {
        setIsSyncing(false);
        await updateLocalDataCounts();
      }
    }, [isSyncing, isConnected]);

    // Primer useEffect: Preparación inicial de la app y suscripción a NetInfo
    useEffect(() => {
        console.log('[Prepare] Iniciando preparación de la app...');
        async function prepare() {
            try {
                await updateLocalDataCounts();
            } catch (e) {
                console.warn('[Prepare Error]', e);
            } finally {
                setAppIsReady(true);
                console.log('[Prepare] appIsReady establecido a true.');
            }
        }
        prepare();

        // Suscribirse a NetInfo solo una vez
        if (!netInfoInitialized.current) { // <--- NUEVO: Solo se suscribe si no se ha hecho antes
            console.log('[NetInfo] Suscribiéndose a NetInfo...');
            const unsubscribeNetInfo = NetInfo.addEventListener(state => {
                console.log(`[NetInfo] Estado de la conexión: ${state.isConnected ? 'Conectado' : 'Desconectado'}`);
                setIsConnected(!!state.isConnected);

                // Disparar sincronización automática SOLO si hay conexión y la app está lista
                // y no hay sincronización en curso. No necesitamos chequear autenticación aquí,
                // ya que si no está autenticado, la app no estará en el navegador principal.
                if (!!state.isConnected && appIsReady && !isSyncing) { // <--- Simplificado
                    console.log('[NetInfo AutoSync] Conexión detectada, intentando sincronización automática.');
                    handleSyncAllData(true); // <--- Pasa true para indicar que es auto-sync
                } else if (!state.isConnected) {
                    setSyncStatus('Sin conexión a internet. Los datos se guardarán localmente.');
                }
            });
            netInfoInitialized.current = true; // <--- Marca como inicializado
            return () => {
                console.log('[NetInfo] Desuscribiéndose de NetInfo...');
                unsubscribeNetInfo();
            };
        }
    }, [appIsReady, isSyncing, handleSyncAllData]); // handleSyncAllData es una dependencia para NetInfo

    // Segundo useEffect: Ocultar el SplashScreen
    useEffect(() => {
        console.log(`[HideSplash Effect] appIsReady: ${appIsReady}, isLoadingAuth: ${isLoadingAuth}`);
        if (appIsReady && !isLoadingAuth) {
            console.log('[HideSplash Effect] Ocultando SplashScreen...');
            SplashScreen.hideAsync();
        }
    }, [appIsReady, isLoadingAuth]);

    // Tercer useEffect: Disparar la sincronización inicial **UNA SOLA VEZ** al estar todo listo y autenticado
    useEffect(() => {
        console.log(`[Initial Sync Trigger Effect] appIsReady: ${appIsReady}, isLoadingAuth: ${isLoadingAuth}, isAuthenticated: ${isAuthenticated}, initialSyncAttempted: ${initialSyncAttempted.current}, isConnected: ${isConnected}`);

        // Primero, marca que se ha verificado el estado de autenticación (si aún no lo ha hecho)
        if (!isLoadingAuth && !hasCheckedAuth.current) {
            hasCheckedAuth.current = true;
            console.log('[Initial Sync Trigger Effect] Autenticación verificada por primera vez.');
        }

        // Si la app está lista, la autenticación ha sido verificada y no está cargando,
        // no se ha intentado la sincronización inicial, estamos conectados y autenticados,
        // entonces disparamos la sincronización.
        if (appIsReady && !isLoadingAuth && hasCheckedAuth.current && !initialSyncAttempted.current && isConnected && isAuthenticated) {
            console.log('[Initial Sync Trigger Effect] App lista, autenticación terminada y conectada. Disparando sincronización inicial...');
            handleSyncAllData();
            initialSyncAttempted.current = true; // Marca que ya se intentó la sincronización inicial
        }
    }, [appIsReady, isLoadingAuth, isAuthenticated, isConnected, handleSyncAllData]); // Dependencias para re-evaluar

    const onLayoutRootView = useCallback(async () => {
        // No hay necesidad de llamar a hideAsync aquí, lo hace el useEffect
    }, []);

    if (!appIsReady || isLoadingAuth) {
        return (
            <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={{ color: '#fff', marginTop: 10 }}>Cargando...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container} onLayout={onLayoutRootView}>
            <NavigationContainer>
                {isAuthenticated ? (
                    <VisitProvider>
                        <AppNavigator />
                    </VisitProvider>
                ) : (
                    <AuthNavigator />
                )}
            </NavigationContainer>
        </View>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0e43f1',
    },
});

export default App;