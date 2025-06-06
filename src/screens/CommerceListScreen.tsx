// src/screens/CommerceListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
    Platform, // Importado para StatusBar
    StatusBar, // Importado para StatusBar
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce } from '../types/data';
import { useVisit } from '../context/VisitContext';
import { useAuth } from '../context/AuthContext';
import { getCommercesByRoute } from '../services/dataService';
import { saveCommerces } from '../utils/storage'; // <-- IMPORTANTE: Importamos saveCommerces desde storage.ts

// --- NUEVAS CONSTANTES DE COLORES PARA ESTA PANTALLA ---
const PRIMARY_BLUE_SOFT = '#E3F2FD';
const DARK_BLUE = '#1565C0';
const ACCENT_BLUE = '#2196F3';
const SUCCESS_GREEN = '#66BB6A';
const WARNING_ORANGE = '#FFCA28';
const TEXT_DARK = '#424242';
const TEXT_LIGHT = '#FFFFFF';
const BORDER_COLOR = '#BBDEFB';
const LIGHT_GRAY_BACKGROUND = '#F5F5F5';

type CommerceListScreenProps = StackScreenProps<AppStackParamList, 'CommerceList'>;

const CommerceListScreen: React.FC<CommerceListScreenProps> = ({ navigation }) => {
    const { setCurrentCommerceId, resetVisit, startNewVisit } = useVisit();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    const [commerces, setCommerces] = useState<Commerce[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [searchText, setSearchText] = useState<string>('');

    const fetchCommerces = useCallback(async () => {
        if (!isAuthenticated || !user || !user.route_id) {
            console.log('[CommerceListScreen] Usuario no autenticado o sin route_id. No se cargan comercios.');
            setIsLoading(false);
            setRefreshing(false);
            setCommerces([]);
            return;
        }

        try {
            // Solo establecer isLoading a true si no es un refresh
            if (!refreshing) setIsLoading(true);
            
            console.log(`[CommerceListScreen] Cargando comercios para la ruta: ${user.route_id}`);
            const fetchedCommerces = await getCommercesByRoute(user.route_id);

            // <-- CAMBIO CRÍTICO AQUÍ: Guardar los comercios obtenidos en AsyncStorage
            await saveCommerces(fetchedCommerces); 
            console.log(`[CommerceListScreen] ${fetchedCommerces.length} comercios obtenidos de Supabase y GUARDADOS en AsyncStorage.`);
            // --- FIN CAMBIO CRÍTICO ---
            
            const sortedCommerces = fetchedCommerces.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            setCommerces(sortedCommerces);
        } catch (error) {
            console.error('Error al cargar y guardar comercios por ruta:', error);
            Alert.alert('Error', 'No se pudieron cargar los comercios de tu ruta. Inténtalo de nuevo.');
            setCommerces([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [isAuthenticated, user, refreshing]); // Añadido 'refreshing' a las dependencias

    useEffect(() => {
        if (!authLoading) {
            fetchCommerces();
        }
    }, [fetchCommerces, authLoading]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (!authLoading) {
                fetchCommerces();
            }
        });
        return unsubscribe;
    }, [navigation, fetchCommerces, authLoading]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCommerces();
    }, [fetchCommerces]);

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
                        try {
                            const success = await startNewVisit(commerce.id, commerce.name);
                            console.log('DEBUG: Resultado de startNewVisit:', success);

                            if (success) {
                                console.log('DEBUG: Navegando a VisitItems con commerceId:', commerce.id, 'y commerceName:', commerce.name);
                                navigation.navigate('VisitItems', { commerceId: commerce.id, commerceName: commerce.name });
                            } else {
                                console.log('DEBUG: startNewVisit devolvió false, mostrando alerta de error.');
                                Alert.alert('Error', 'No se pudo iniciar la visita. Asegúrate de tener los permisos de ubicación y conexión a internet.');
                            }
                        } catch (error) {
                            console.error('DEBUG: Error inesperado al iniciar visita en handleStartVisit:', error);
                            Alert.alert('Error crítico', 'Ocurrió un error inesperado al intentar iniciar la visita.');
                        }
                    },
                },
            ]
        );
    }, [navigation, startNewVisit]);

    const handleGoToMyVisits = useCallback(() => {
        navigation.navigate('MyVisits');
    }, [navigation]);

    const handleAddCommerce = useCallback(() => {
        navigation.navigate('AddEditCommerce');
    }, [navigation]);

    const filteredCommerces = commerces.filter(commerce =>
        commerce.name.toLowerCase().includes(searchText.toLowerCase()) ||
        commerce.address.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderCommerceItem = ({ item }: { item: Commerce }) => (
        <View style={styles.commerceItem}>
            <Text style={styles.commerceName}>{item.name}</Text>
            <Text style={styles.commerceAddress}>{item.address}</Text>
            <Text style={styles.commerceDate}>
                Registrado: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Fecha desconocida'}
            </Text>
            <TouchableOpacity
                style={styles.startButton}
                onPress={() => handleStartVisit(item)}
            >
                <Text style={styles.startButtonText}>Iniciar Visita</Text>
            </TouchableOpacity>
        </View>
    );

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

    return (
        <View style={styles.container}>
            {/* Título Principal */}
            <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>Comercios de tu Ruta</Text> 
            </View>

            {/* Botón Mis Visitas */}
            <TouchableOpacity style={styles.myVisitsButton} onPress={handleGoToMyVisits}>
                <Text style={styles.myVisitsButtonText}>Mis Visitas</Text>
            </TouchableOpacity>

            {/* Botón Agregar Comercio */}
            <TouchableOpacity style={styles.addCommerceButton} onPress={handleAddCommerce}>
                <Text style={styles.addCommerceButtonText}>+ Agregar Comercio</Text>
            </TouchableOpacity>

            {/* Campo de Búsqueda */}
            <TextInput
                style={styles.searchInput}
                placeholder="Buscar comercio por nombre o dirección..."
                placeholderTextColor={TEXT_DARK}
                value={searchText}
                onChangeText={setSearchText}
            />

            {/* Lista de Comercios */}
            {filteredCommerces.length === 0 ? (
                <ScrollView
                    contentContainerStyle={styles.emptyListContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    <Text style={styles.emptyListText}>No se encontraron comercios en tu ruta.</Text>
                    <Text style={styles.emptyListSubText}>
                        Tira hacia abajo para recargar o ajusta tu búsqueda.
                    </Text>
                </ScrollView>
            ) : (
                <FlatList
                    data={filteredCommerces}
                    renderItem={renderCommerceItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
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
        paddingTop: 40,
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
        shadowColor: 'rgba(0,0,0,0.2)',
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
    addCommerceButton: {
        backgroundColor: ACCENT_BLUE,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        width: '100%',
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    addCommerceButtonText: {
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
    commerceName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DARK_BLUE,
        marginBottom: 5,
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
});

export default CommerceListScreen;