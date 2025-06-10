// src/screens/CommerceListScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    ScrollView,
    Platform,
    StatusBar,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native'; // <-- ¡Ya lo tienes, perfecto!
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce } from '../types/data'; // Asegúrate de que 'address' esté en este tipo
import { useVisit } from '../context/VisitContext';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import NetInfo from '@react-native-community/netinfo';

// --- CONSTANTES DE COLORES ---
const PRIMARY_BLUE_SOFT = '#E3F2FD';
const DARK_BLUE = '#1565C0';
const ACCENT_BLUE = '#2196F3';
const SUCCESS_GREEN = '#66BB6A';
const WARNING_ORANGE = '#FFCA28';
const TEXT_DARK = '#424242';
const TEXT_LIGHT = '#FFFFFF';
const BORDER_COLOR = '#BBDEFB';
const LIGHT_GRAY_BACKGROUND = '#F5F5F5';
const ERROR_RED = '#EF5350'; // Agregado para mensajes de error

type CommerceListScreenProps = StackScreenProps<AppStackParamList, 'CommerceList'>;

const CommerceListScreen: React.FC<CommerceListScreenProps> = ({ navigation }) => {
    const { resetVisit, startNewVisit, currentCommerceId } = useVisit(); // Obtén currentCommerceId del contexto
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [commerces, setCommerces] = useState<Commerce[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [searchText, setSearchText] = useState<string>('');
    const hasAttemptedInitialLoad = useRef(false);
    const isFetching = useRef(false);
    // const lastRefreshTime = useRef(0); // Este ya no es tan crítico con useFocusEffect para limpieza

    // ✨ ✨ ✨ IMPLEMENTACIÓN CLAVE: REINICIAR EL CONTEXTO AL ENFOCAR LA PANTALLA ✨ ✨ ✨
    // Este hook se ejecuta cada vez que la pantalla se enfoca (visible y activa).
    useFocusEffect(
        useCallback(() => {
            console.log('[CommerceListScreen] useFocusEffect: Pantalla enfocada, reiniciando contexto de visita.');
            // Llama a la función para limpiar el ID del comercio y otros estados de visita.
            // Esto garantiza que al volver a esta pantalla, no haya un comercio "pre-seleccionado" del contexto.
            resetVisit(); 

            // Opcional: Puedes retornar una función de limpieza si necesitas hacer algo
            // cuando la pantalla pierde el foco (blur).
            return () => {
                console.log('[CommerceListScreen] useFocusEffect: Pantalla desenfocada.');
            };
        }, [resetVisit]) // Dependencia `resetVisit` para asegurar que el efecto se re-ejecute si la función cambia (poco probable, pero buena práctica).
    );

    const fetchCommerces = useCallback(async (isRefresh = false, forceFetch = false) => {
        // Evita múltiples llamadas concurrentes a fetchCommerces
        if (isFetching.current && !forceFetch) {
            console.log('[CommerceListScreen] fetchCommerces: Ya se está buscando o ya se hizo una carga inicial no forzada.');
            return;
        }

        // Verifica si el usuario está autenticado y tiene una ruta asignada antes de intentar cargar
        if (!isAuthenticated || !user?.route_id) {
            console.log('[CommerceListScreen] fetchCommerces: Usuario no autenticado o sin route_id. No se cargan comercios.');
            setIsLoading(false);
            setRefreshing(false);
            setCommerces([]); // Asegura que la lista esté vacía si no hay ruta asignada
            return;
        }

        isFetching.current = true; // Marca que una operación de búsqueda está en curso
        if (!isRefresh) setIsLoading(true); // Muestra el indicador de carga principal si no es un refresh
        if (isRefresh) setRefreshing(true); // Muestra el indicador de refresh si es un pull-to-refresh

        try {
            const netInfo = await NetInfo.fetch();
            const actualIsConnected = netInfo.isConnected && netInfo.isInternetReachable;

            console.log(`[CommerceListScreen] fetchCommerces: Estado real de conexión: ${actualIsConnected ? 'Conectado' : 'Desconectado'}`);

            if (actualIsConnected) {
                console.log(`[CommerceListScreen] fetchCommerces: Cargando comercios de Supabase para la ruta: ${user.route_id}`);
                // Obtiene comercios de la fuente de datos principal (Supabase)
                const loadedCommerces = (await dataService.getCommercesByRoute(user.route_id)) as Commerce[];
                console.log(`[CommerceListScreen] fetchCommerces: ${loadedCommerces.length} comercios obtenidos de Supabase.`);

                // Ordena los comercios por `created_at` de forma descendente
                const sortedCommerces = loadedCommerces.sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });

                // Actualiza el estado solo si la lista de comercios ha cambiado para evitar re-renders innecesarios
                setCommerces(prevCommerces => {
                    if (prevCommerces.length === sortedCommerces.length &&
                        prevCommerces.every((p, i) => p.id === sortedCommerces[i].id)) {
                        console.log('[CommerceListScreen] Comercios ya están actualizados, evitando re-render.');
                        return prevCommerces;
                    }
                    console.log('[CommerceListScreen] Actualizando lista de comercios.');
                    return sortedCommerces;
                });

            } else {
                // Si no hay conexión, intenta cargar desde el caché local
                console.log('[CommerceListScreen] fetchCommerces: Sin conexión a internet. Intentando cargar comercios locales.');
                Alert.alert(
                    'Sin Conexión',
                    'No hay conexión a internet. Los comercios se cargarán desde el caché local si están disponibles. Conéctate para obtener los comercios más recientes.',
                    [{ text: 'OK' }]
                );
                // Asumo que `dataService.getCommercesByRoute` ya tiene la lógica para cargar desde el caché offline
                const localCommerces = (await dataService.getCommercesByRoute(user.route_id)) as Commerce[];
                setCommerces(localCommerces.sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                }));
            }

        } catch (error: any) {
            console.error('Error al cargar comercios:', error);
            Alert.alert(
                'Error de Carga',
                'Ocurrió un error al intentar cargar los comercios. Puede que no tengas conexión a internet o haya un problema con el servidor.',
                [{ text: 'OK' }]
            );
            setCommerces([]); // Limpia la lista en caso de error
        } finally {
            isFetching.current = false; // Marca que la operación de búsqueda ha terminado
            setIsLoading(false); // Oculta el indicador de carga principal
            setRefreshing(false); // Oculta el indicador de refresh
            hasAttemptedInitialLoad.current = true; // Marca que ya se intentó la carga inicial
        }
    }, [isAuthenticated, user?.route_id]); // Dependencias para useCallback

    // useEffect para la carga inicial de comercios
    useEffect(() => {
        // Solo intentamos cargar si la autenticación ha terminado, el usuario está autenticado, tiene un route_id
        // y aún no hemos intentado una carga inicial exitosa.
        if (!authLoading && isAuthenticated && user?.route_id && !hasAttemptedInitialLoad.current) {
            console.log('[CommerceListScreen] useEffect (initial load): Disparando carga inicial de comercios.');
            fetchCommerces();
        } else if (!isAuthenticated && !authLoading) {
            // Si el usuario no está autenticado después de cargar la autenticación, deja de cargar
            setIsLoading(false);
        }
    }, [fetchCommerces, authLoading, isAuthenticated, user?.route_id]);

    // `onRefresh` para la funcionalidad pull-to-refresh
    const onRefresh = useCallback(() => {
        console.log('[CommerceListScreen] onRefresh: Disparando refresh manual.');
        fetchCommerces(true); // Llama a fetchCommerces con isRefresh = true
    }, [fetchCommerces]);

    // Maneja el inicio de una nueva visita para un comercio seleccionado
    const handleStartVisit = useCallback(async (commerce: Commerce) => {
        console.log('DEBUG: Intentando iniciar visita para:', commerce.name, 'con ID:', commerce.id);
        Alert.alert(
            'Iniciar Visita',
            `¿Deseas iniciar una visita para ${commerce.name}?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Sí',
                    onPress: async () => {
                        const netInfoState = await NetInfo.fetch();
                        if (!netInfoState.isConnected) {
                            Alert.alert('Sin Conexión', 'Necesitas conexión a internet para iniciar una nueva visita.');
                            return;
                        }
                        try {
                            // ✨ ✨ ✨ AJUSTE AQUÍ: Pasando también `commerce.address` a `startNewVisit` ✨ ✨ ✨
                            const success = await startNewVisit(commerce.id, commerce.name, commerce.address); 
                            if (success) {
                                navigation.navigate('VisitItems', { commerceId: commerce.id, commerceName: commerce.name });
                            } else {
                                Alert.alert('Error', 'No se pudo iniciar la visita. Asegúrate de tener los permisos de ubicación y conexión a internet.');
                            }
                        } catch (error) {
                            console.error('Error al iniciar visita:', error);
                            Alert.alert('Error crítico', 'Ocurrió un error inesperado al intentar iniciar la visita.');
                        }
                    },
                },
            ]
        );
    }, [navigation, startNewVisit]);

    // Navega a la pantalla de mis visitas
    const handleGoToMyVisits = useCallback(() => {
        navigation.navigate('MyVisits');
    }, [navigation]);

    // Filtra los comercios basados en el texto de búsqueda
    const filteredCommerces = commerces.filter(commerce =>
        commerce.name.toLowerCase().includes(searchText.toLowerCase()) ||
        commerce.address.toLowerCase().includes(searchText.toLowerCase())
    );

    // Renderiza cada elemento de comercio en la FlatList
    const renderCommerceItem = ({ item }: { item: Commerce }) => (
        <View style={styles.commerceItem}>
            <View style={styles.cardHeader}>
                <Text style={styles.commerceName}>{item.name}</Text>
                {/* Muestra la etiqueta "VISITA EN CURSO" si este es el comercio de la visita actual */}
                {currentCommerceId === item.id && (
                    <Text style={styles.currentVisitTag}>VISITA EN CURSO</Text>
                )}
            </View>
            <Text style={styles.commerceAddress}>{item.address}</Text>
            <Text style={styles.commerceDate}>
                Registrado: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Fecha desconocida'}
            </Text>
            <TouchableOpacity
                style={styles.startButton}
                onPress={() => handleStartVisit(item)}
            >
                <Text style={styles.startButtonText}>Iniciar Visita</Text>
            </TouchableOpacity>
        </View>
    );

    // Muestra indicadores de carga si la autenticación o los comercios están cargando
    if (isLoading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={DARK_BLUE} />
                <Text style={styles.loadingText}>
                    {authLoading ? 'Cargando sesión de usuario...' : 'Cargando comercios...'}
                </Text>
            </View>
        );
    }

    // Muestra un mensaje si el usuario no tiene una ruta asignada
    if (!user?.route_id) {
        return (
            <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>
                    ¡Ups! Parece que no tienes una ruta asignada aún.
                </Text>
                <Text style={styles.emptyListSubText}>
                    Por favor, contacta al administrador para que te asigne una ruta y puedas ver los comercios.
                </Text>
                <TouchableOpacity style={styles.myVisitsButton} onPress={onRefresh}>
                    <Text style={styles.myVisitsButtonText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Renderizado principal de la pantalla
    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>Comercios de tu Ruta</Text>
            </View>
            <TouchableOpacity style={styles.myVisitsButton} onPress={handleGoToMyVisits}>
                <Text style={styles.myVisitsButtonText}>Mis Visitas</Text>
            </TouchableOpacity>
            <TextInput
                style={styles.searchInput}
                placeholder="Buscar comercio por nombre o dirección..."
                placeholderTextColor={TEXT_DARK}
                value={searchText}
                onChangeText={setSearchText}
            />
            {/* Manejo de la lista vacía o sin resultados de búsqueda */}
            {filteredCommerces.length === 0 && searchText.length === 0 ? (
                <ScrollView
                    contentContainerStyle={styles.emptyListContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DARK_BLUE} colors={[DARK_BLUE]} />
                    }
                >
                    <Text style={styles.emptyListText}>No se encontraron comercios en tu ruta.</Text>
                    <Text style={styles.emptyListSubText}>
                        Tira hacia abajo para recargar o ajusta tu búsqueda.
                    </Text>
                </ScrollView>
            ) : filteredCommerces.length === 0 && searchText.length > 0 ? (
                <ScrollView
                    contentContainerStyle={styles.emptyListContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DARK_BLUE} colors={[DARK_BLUE]} />
                    }
                >
                    <Text style={styles.emptyListText}>No hay resultados para tu búsqueda.</Text>
                    <Text style={styles.emptyListSubText}>
                        Intenta con otra palabra clave.
                    </Text>
                </ScrollView>
            ) : (
                <FlatList
                    data={filteredCommerces}
                    renderItem={renderCommerceItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={DARK_BLUE}
                            colors={[DARK_BLUE]}
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY_BLUE_SOFT,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight ?? 0) + 10) : 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: PRIMARY_BLUE_SOFT,
    },
    loadingText: {
        fontSize: 18,
        color: TEXT_DARK,
        marginTop: 10,
    },
    titleContainer: {
        backgroundColor: DARK_BLUE,
        paddingVertical: 15,
        borderRadius: 10,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        textAlign: 'center',
    },
    myVisitsButton: {
        backgroundColor: SUCCESS_GREEN,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    myVisitsButtonText: {
        color: TEXT_LIGHT,
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchInput: {
        width: '100%',
        height: 50,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
        backgroundColor: LIGHT_GRAY_BACKGROUND,
        color: TEXT_DARK,
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    listContent: {
        paddingBottom: 20,
    },
    commerceItem: {
        backgroundColor: LIGHT_GRAY_BACKGROUND,
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    commerceName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DARK_BLUE,
        marginBottom: 5,
        flexShrink: 1, // Permite que el texto se encoja
    },
    commerceAddress: {
        fontSize: 14,
        color: TEXT_DARK,
        marginBottom: 10,
    },
    commerceDate: {
        fontSize: 12,
        color: '#888',
        marginBottom: 10,
    },
    startButton: {
        backgroundColor: WARNING_ORANGE,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 5,
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    startButtonText: {
        color: TEXT_DARK,
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyListContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 50,
        backgroundColor: PRIMARY_BLUE_SOFT,
    },
    emptyListText: {
        fontSize: 18,
        color: TEXT_DARK,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyListSubText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
    },
    currentVisitTag: { // Nuevo estilo para la etiqueta "VISITA EN CURSO"
        backgroundColor: ACCENT_BLUE,
        color: TEXT_LIGHT,
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 5,
        marginLeft: 10, // Espacio entre el nombre del comercio y la etiqueta
    },
});

export default CommerceListScreen;