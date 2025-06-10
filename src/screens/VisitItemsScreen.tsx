import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    StatusBar,
    RefreshControl // Added for pull-to-refresh
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import { AppStackParamList } from '../navigation/AppNavigator';
import { Commerce } from '../types/data';
import { dataService } from '../services/dataService';

import { useVisit } from '../context/VisitContext';
import MapView, { Marker } from 'react-native-maps';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
const ERROR_RED = '#DC3545';
const DISABLED_GRAY = '#EEEEEE';
const DISABLED_TEXT_GRAY = '#B0B0B0';

type VisitItemsScreenProps = StackScreenProps<AppStackParamList, 'VisitItems'>;

const VisitItemsScreen: React.FC<VisitItemsScreenProps> = ({ route, navigation }) => {
    const { commerceId: routeCommerceId, commerceName: routeCommerceName } = route.params;

    const {
        currentCommerceId,
        currentCommerceName,
        productEntries,
        competitorEntries,
        photos,
        location,
        visitSections,
        summaryNotes,
        startNewVisit,
        finalizeVisit,
        resetVisit,
    } = useVisit();

    const [commerce, setCommerce] = useState<Commerce | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh

    // Use useFocusEffect for actions that should happen when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            let isMounted = true; // Flag to prevent state updates on unmounted component

            const loadAndInitializeVisit = async () => {
                console.log('--- DEBUG VisitItemsScreen: useFocusEffect - Iniciando carga/inicialización ---');
                if (isRedirecting) return; // Prevent re-execution if already redirecting

                setIsLoading(true); // Start loading state
                setCommerce(null); // Clear previous commerce data

                try {
                    if (!routeCommerceId) {
                        console.error('VisitItemsScreen: routeCommerceId es nulo o indefinido. Redirigiendo.');
                        if (isMounted) setIsRedirecting(true);
                        Alert.alert('Error', 'ID de comercio no proporcionado. Por favor, intenta de nuevo.',
                            [{ text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }]
                        );
                        return;
                    }

                    // 1. Fetch Commerce Details
                    console.log(`DEBUG VisitItemsScreen: Obteniendo comercio con ID ${routeCommerceId} de Supabase.`);
                    const foundCommerce = await dataService.getCommerceById(routeCommerceId) as Commerce;

                    if (!foundCommerce) {
                        console.warn(`VisitItemsScreen: Comercio con ID ${routeCommerceId} NO ENCONTRADO en Supabase. Redirigiendo.`);
                        if (isMounted) setIsRedirecting(true);
                        Alert.alert('Error', 'El comercio seleccionado no se encontró. Por favor, intenta de nuevo.',
                            [{ text: 'OK', onPress: () => { navigation.replace('CommerceList'); resetVisit(); } }]
                        );
                        return;
                    }

                    if (isMounted) {
                        setCommerce(foundCommerce);
                        console.log(`DEBUG VisitItemsScreen: Comercio (${foundCommerce.name}) encontrado y establecido en estado local.`);
                    }

                    // 2. Initialize or Confirm Visit in Context
                    // Only start a new visit if the context doesn't match the route's commerce
                    // or if there's no current visit in context.
                    if (!currentCommerceId || String(currentCommerceId) !== String(routeCommerceId)) {
                        console.log(`DEBUG VisitItemsScreen: currentCommerceId (${currentCommerceId}) !== routeCommerceId (${routeCommerceId}). Llamando a startNewVisit.`);
                        // Pass the address to startNewVisit if available, otherwise it can fetch it
                        const visitStartedSuccessfully = await startNewVisit(
                            routeCommerceId,
                            routeCommerceName,
                            foundCommerce.address // Pass the address from the fetched commerce
                        );

                        if (!visitStartedSuccessfully) {
                            console.error('ERROR VisitItemsScreen: startNewVisit falló. Redirigiendo.');
                            if (isMounted) setIsRedirecting(true);
                            Alert.alert('Error al iniciar', 'No se pudo iniciar la visita correctamente. Por favor, intenta de nuevo.');
                            navigation.replace('CommerceList');
                            return;
                        }
                        console.log('DEBUG VisitItemsScreen: startNewVisit completado exitosamente.');
                    } else {
                        console.log('DEBUG VisitItemsScreen: Visita ya en curso para el mismo comercio en contexto. No es necesario iniciar de nuevo.');
                    }

                } catch (error) {
                    console.error('ERROR VisitItemsScreen: Fallo en el proceso de carga de detalles/inicialización:', error);
                    if (isMounted) setIsRedirecting(true);
                    Alert.alert('Error', 'Hubo un problema al cargar los datos del comercio. Por favor, reinicia la aplicación.');
                    resetVisit(); // Ensure context is clean
                    navigation.replace('CommerceList');
                } finally {
                    if (isMounted) {
                        setIsLoading(false); // End loading state
                        setRefreshing(false); // End refreshing state
                        console.log('DEBUG VisitItemsScreen: Proceso de carga de detalles/inicialización FINALIZADO.');
                    }
                }
            };

            loadAndInitializeVisit();

            return () => {
                isMounted = false; // Cleanup: Set flag to false when component unmounts or loses focus
                console.log('DEBUG VisitItemsScreen: Pantalla desenfocada o desmontada.');
            };
        }, [routeCommerceId, routeCommerceName, navigation, startNewVisit, currentCommerceId, resetVisit, isRedirecting]) // Add isRedirecting to dependencies
    );

    // Function for pull-to-refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Simply re-run the useFocusEffect logic by calling the setup function again.
        // This will re-fetch data and re-initialize the context if needed.
        // The useFocusEffect's useCallback will handle the dependencies.
        // The `isMounted` flag within useFocusEffect will prevent issues.
        // You don't need to call loadAndInitializeVisit directly here,
        // as changing `refreshing` state might trigger a re-render which
        // in turn might trigger useFocusEffect depending on other states.
        // The more robust way is to just let the dependencies of useFocusEffect handle it,
        // or extract loadAndInitializeVisit out of the useFocusEffect for direct call if needed.
        // For simplicity, let's keep it simple: the useFocusEffect will be triggered by
        // a relevant state change if we needed to pass a specific "refresh" trigger.
        // But for now, we rely on existing dependencies.
        // A better approach might be to have a dedicated 'refresh' function in the context.
        console.log('DEBUG VisitItemsScreen: Iniciando pull-to-refresh...');
        // Manually trigger the initial loading logic again
        // by making a state change that's part of the dependencies, or by extracting the function.
        // For now, let's just re-fetch the commerce details, as the context
        // should already be correctly set up from the initial focus effect.
        try {
            if (currentCommerceId) {
                const refreshedCommerce = await dataService.getCommerceById(currentCommerceId);
                if (refreshedCommerce) {
                    setCommerce(refreshedCommerce as Commerce);
                    Alert.alert('Actualizado', 'Datos del comercio refrescados.');
                } else {
                    Alert.alert('Error', 'No se pudo refrescar los datos del comercio.');
                }
            }
        } catch (error) {
            console.error('Error durante el refresco:', error);
            Alert.alert('Error', 'Error al refrescar los datos.');
        } finally {
            setRefreshing(false);
            console.log('DEBUG VisitItemsScreen: Refresco completado.');
        }

    }, [currentCommerceId]);


    const getSectionIcon = useCallback((sectionName: keyof typeof visitSections) => {
        if (visitSections[sectionName] === 'completed') {
            return <Icon name="check-circle" size={30} color={SUCCESS_GREEN} />;
        }
        return <Icon name="clock" size={30} color={WARNING_ORANGE} />;
    }, [visitSections]);

    const handleFinalizePress = async () => {
        setIsSaving(true);
        try {
            const success = await finalizeVisit();
            if (success) {
                console.log('DEBUG: Visita finalizada y guardada con éxito. Navegando a CommerceList.');
                navigation.replace('CommerceList');
            } else {
                console.log('DEBUG: Finalización de visita no exitosa o cancelada por el usuario. No se navega.');
            }
        } catch (error) {
            console.error('Error al finalizar la visita desde VisitItemsScreen:', error);
            Alert.alert('Error', 'Hubo un problema al guardar la visita. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    const getLocationAndPhotosStatusText = useCallback(() => {
        const isLocationCaptured = location !== null;
        const numPhotos = photos.length;

        if (visitSections.photos_location === 'completed') {
            return `Completado: ${numPhotos} foto(s) y ubicación.`;
        } else if (visitSections.photos_location === 'pending') {
            if (isLocationCaptured && numPhotos > 0) {
                return `Ubicación capturada. ${numPhotos} foto(s) tomada(s).`;
            } else if (isLocationCaptured) {
                return `Ubicación capturada. Fotos pendientes.`;
            } else if (numPhotos > 0) {
                return `Ubicación pendiente. ${numPhotos} foto(s) tomada(s).`;
            }
            return 'Ubicación y fotos pendientes.';
        } else if (visitSections.photos_location === 'error') {
            return 'Error al capturar fotos/ubicación.';
        }
        return 'Estado desconocido.';
    }, [location, photos, visitSections.photos_location]);

    if (isLoading || isRedirecting) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={DARK_BLUE} />
                <Text style={styles.loadingText}>
                    {isRedirecting ? 'Redirigiendo...' : 'Cargando visita...'}
                </Text>
            </View>
        );
    }

    if (!commerce) {
        console.error('VisitItemsScreen: El objeto comercio es null después de la carga inicial y no se ha redirigido. Esto indica un fallo inesperado.');
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Error crítico: Comercio no disponible.</Text>
                <TouchableOpacity onPress={() => navigation.replace('CommerceList')} style={{marginTop: 20, padding: 10, backgroundColor: ACCENT_BLUE, borderRadius: 5}}>
                    <Text style={{color: TEXT_LIGHT}}>Volver a la lista de comercios</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const mapRegion = location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        }
        : undefined;

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DARK_BLUE} colors={[DARK_BLUE]} />
            }
        >
            {isSaving && (
                <View style={styles.overlayLoadingContainer}>
                    <ActivityIndicator size="large" color={DARK_BLUE} />
                    <Text style={styles.overlayLoadingText}>Guardando visita...</Text>
                </View>
            )}

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => { navigation.goBack(); }}>
                    <Text style={styles.backButtonText}>{'< Volver'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visitando:</Text>
                <Text style={styles.commerceName}>{currentCommerceName || commerce.name || 'Comercio Desconocido'}</Text>
                {commerce.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Progreso de la Visita</Text>

                <TouchableOpacity
                    style={styles.sectionButton}
                    onPress={() => navigation.navigate('Visit', { commerceId: currentCommerceId ?? '' })}
                >
                    <View style={styles.sectionContent}>
                        <Text style={styles.sectionButtonText}>Presentaciones Chispa</Text>
                        {getSectionIcon('chispa')}
                    </View>
                    <Text style={styles.sectionDetailText}>
                        {productEntries.length} presentación(es) registrada(s)
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sectionButton}
                    onPress={() => navigation.navigate('Competitor', { commerceId: currentCommerceId ?? '' })}
                >
                    <View style={styles.sectionContent}>
                        <Text style={styles.sectionButtonText}>Productos de Competencia</Text>
                        {getSectionIcon('competitor')}
                    </View>
                    <Text style={styles.sectionDetailText}>
                        {competitorEntries.length} producto(s) de competencia registrado(s)
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sectionButton}
                    onPress={() => {
                        navigation.navigate('PhotoAndLocation', { commerceId: currentCommerceId ?? '' });
                    }}
                >
                    <View style={styles.sectionContent}>
                        <Text style={styles.sectionButtonText}>Fotos y Ubicación</Text>
                        {getSectionIcon('photos_location')}
                    </View>
                    <Text style={styles.sectionDetailText}>
                        {getLocationAndPhotosStatusText()}
                    </Text>
                    {location && (location.addressName || location.cityName || location.stateName) && (
                        <View>
                            {location.addressName && (
                                <Text style={styles.locationDetailText}>
                                    Dirección: {location.addressName}
                                </Text>
                            )}
                            {location.cityName && (
                                <Text style={styles.locationDetailText}>
                                    Ciudad: {location.cityName}
                                </Text>
                            )}
                            {location.stateName && (
                                <Text style={styles.locationDetailText}>
                                    Estado: {location.stateName}
                                </Text>
                            )}
                            <Text style={styles.locationDetailText}>
                                Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
                            </Text>
                        </View>
                    )}

                    {mapRegion && (
                        <View style={styles.mapContainer}>
                            <MapView
                                style={styles.miniMap}
                                initialRegion={mapRegion}
                                scrollEnabled={false}
                                zoomEnabled={false}
                                pitchEnabled={false}
                                rotateEnabled={false}
                            >
                                <Marker coordinate={mapRegion} />
                            </MapView>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sectionButton}
                    onPress={() => {
                        navigation.navigate('VisitSummary');
                    }}
                >
                    <View style={styles.sectionContent}>
                        <Text style={styles.sectionButtonText}>Resumen y Notas</Text>
                        {getSectionIcon('summary')}
                    </View>
                    <Text style={styles.sectionDetailText}>
                        Estado: {visitSections.summary === 'completed' ? 'Completado' : 'Pendiente'} (Opcional)
                    </Text>
                    <Text style={styles.sectionDetailText}>
                        {summaryNotes.length > 0 ? `(${summaryNotes.length} caracteres)` : '(Sin notas)'}
                    </Text>
                </TouchableOpacity>

            </View>

            <TouchableOpacity
                style={[styles.finalizeButton, isSaving && styles.finalizeButtonDisabled]}
                onPress={handleFinalizePress}
                disabled={isSaving}
            >
                {isSaving ? (
                    <ActivityIndicator size="small" color={TEXT_LIGHT} />
                ) : (
                    <Text style={styles.finalizeButtonText}>Finalizar Visita y Guardar</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.cancelButton, isSaving && styles.cancelButtonDisabled]}
                onPress={() => Alert.alert(
                    'Cancelar Visita',
                    '¿Estás seguro de que quieres cancelar esta visita? Se perderán todos los datos no guardados.',
                    [
                        { text: 'No', style: 'cancel' },
                        { text: 'Sí', onPress: () => { resetVisit(); navigation.replace('CommerceList'); } }
                    ]
                )}
                disabled={isSaving}
            >
                <Text style={styles.cancelButtonText}>Cancelar Visita</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: PRIMARY_BLUE_SOFT,
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: PRIMARY_BLUE_SOFT,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 18,
        color: DARK_BLUE,
    },
    overlayLoadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(227, 242, 253, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    overlayLoadingText: {
        fontSize: 16,
        color: TEXT_DARK,
        marginTop: 10,
        fontWeight: '600',
    },
    header: {
        backgroundColor: DARK_BLUE,
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        position: 'relative',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 15,
    },
    backButton: {
        position: 'absolute',
        left: 10,
        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 15,
        padding: 5,
    },
    backButtonText: {
        color: TEXT_LIGHT,
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        marginTop: 5,
    },
    commerceName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: TEXT_LIGHT,
        marginTop: 5,
        textAlign: 'center',
    },
    commerceAddress: {
        fontSize: 16,
        color: BORDER_COLOR,
        marginTop: 5,
        textAlign: 'center',
    },
    card: {
        backgroundColor: LIGHT_GRAY_BACKGROUND,
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: DARK_BLUE,
        marginBottom: 15,
        textAlign: 'center',
    },
    sectionButton: {
        backgroundColor: TEXT_LIGHT,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_DARK,
        flex: 1,
    },
    sectionDetailText: {
        fontSize: 14,
        color: TEXT_DARK,
        marginTop: 5,
        textAlign: 'right',
    },
    locationDetailText: {
        fontSize: 13,
        color: TEXT_DARK,
        marginTop: 3,
        textAlign: 'right',
        fontStyle: 'italic',
    },
    mapContainer: {
        marginTop: 10,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    miniMap: {
        height: 150,
        width: '100%',
    },
    finalizeButton: {
        backgroundColor: SUCCESS_GREEN,
        paddingVertical: 18,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 10,
        shadowColor: 'rgba(0,0,0, 0.4)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    finalizeButtonDisabled: {
        backgroundColor: DISABLED_GRAY,
    },
    finalizeButtonText: {
        color: TEXT_LIGHT,
        fontSize: 20,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: ERROR_RED,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 20,
        shadowColor: 'rgba(0,0,0, 0.4)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    cancelButtonDisabled: {
        backgroundColor: DISABLED_GRAY,
    },
    cancelButtonText: {
        color: TEXT_LIGHT,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default VisitItemsScreen;