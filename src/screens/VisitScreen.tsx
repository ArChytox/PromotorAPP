import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';
import { ProductVisitEntry, Commerce, ChispaPresentation } from '../types/data';
import { supabase } from '../services/supabase';
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useVisit } from '../context/VisitContext';
import { dataService } from '../services/dataService'; // <--- ¡CAMBIO CLAVE AQUÍ!
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
const PLACEHOLDER_GRAY = '#9E9E9E';
const DISABLED_GRAY = '#EEEEEE';
const DISABLED_TEXT_GRAY = '#B0B0B0';

type VisitScreenProps = StackScreenProps<AppStackParamList, 'Visit'>;

const VisitScreen: React.FC<VisitScreenProps> = ({ navigation }) => {
    const {
        currentCommerceId,
        currentCommerceName,
        productEntries: initialProductEntries,
        updateProductEntries,
        markSectionComplete,
        resetVisit,
    } = useVisit();

    const [commerce, setCommerce] = useState<Commerce | null>(null);
    const [isLoadingCommerce, setIsLoadingCommerce] = useState<boolean>(true);
    const [chispaPresentations, setChispaPresentations] = useState<ChispaPresentation[]>([]);
    const [isLoadingChispaPresentations, setIsLoadingChispaPresentations] = useState<boolean>(true);

    const [showOverlayLoading, setShowOverlayLoading] = useState<boolean>(true);

    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [productPrice, setProductPrice] = useState<string>('');
    const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'VES'>('USD');
    const [shelfStock, setShelfStock] = useState<string>('');
    const [generalStock, setGeneralStock] = useState<string>('');
    const [collectedProductEntries, setCollectedProductEntries] = useState<ProductVisitEntry[]>(initialProductEntries);
    const [isSinStockSelected, setIsSinStockSelected] = useState<boolean>(false);

    // Sincronizar entradas de producto del contexto
    useEffect(() => {
        setCollectedProductEntries(initialProductEntries);
    }, [initialProductEntries]);

    // Cargar detalles del comercio (AHORA USANDO dataService.getCommerceById)
    useEffect(() => {
        const fetchCommerceDetails = async () => {
            try {
                if (!currentCommerceId) {
                    console.warn('ID de comercio no proporcionado a VisitScreen desde el contexto. Redirigiendo.');
                    Alert.alert('Error de Sesión', 'No se pudo determinar el comercio actual. Por favor, reinicia la visita.', [{
                        text: 'OK',
                        onPress: () => {
                            navigation.replace('CommerceList');
                            resetVisit();
                        }
                    }]);
                    return;
                }
                // *** CAMBIO CLAVE AQUÍ: Usar dataService.getCommerceById ***
                const foundCommerce = await dataService.getCommerceById(currentCommerceId);

                if (foundCommerce) {
                    setCommerce(foundCommerce);
                } else {
                    console.warn('Comercio no encontrado en VisitScreen para ID:', currentCommerceId);
                    Alert.alert('Error de Sesión', 'El comercio no se encontró. Por favor, selecciona un comercio nuevamente.', [{
                        text: 'OK',
                        onPress: () => {
                            navigation.replace('CommerceList');
                            resetVisit();
                        }
                    }]);
                }
            } catch (error) {
                console.error('Error al cargar detalles del comercio en VisitScreen:', error);
                Alert.alert('Error', 'Hubo un problema al cargar los detalles del comercio.', [{
                    text: 'OK',
                    onPress: () => {
                        navigation.replace('CommerceList');
                        resetVisit();
                    }
                }]);
            } finally {
                setIsLoadingCommerce(false);
                if (!isLoadingChispaPresentations) {
                    setShowOverlayLoading(false);
                }
            }
        };

        if (currentCommerceId) {
            fetchCommerceDetails();
        } else {
            setIsLoadingCommerce(false);
            setShowOverlayLoading(false);
        }
    }, [currentCommerceId, navigation, resetVisit, isLoadingChispaPresentations]);

    // Cargar presentaciones Chispa desde Supabase
    useEffect(() => {
        const fetchChispaPresentations = async () => {
            setIsLoadingChispaPresentations(true);
            const { data, error } = await supabase
                .from('chispa_presentations')
                .select('id, name')
                .order('name', { ascending: true });

            if (error) {
                console.error('Error al cargar presentaciones Chispa desde Supabase:', error);
                Alert.alert('Error de Carga', 'No se pudieron cargar las presentaciones de productos Chispa. Por favor, inténtalo de nuevo.');
            } else {
                setChispaPresentations(data || []);
            }
            setIsLoadingChispaPresentations(false);
            if (!isLoadingCommerce) {
                setShowOverlayLoading(false);
            }
        };

        fetchChispaPresentations();
    }, [isLoadingCommerce]);

    // CAMBIO CLAVE: Navegar de vuelta a VisitItems y actualizar el contexto
    const navigateToVisitItems = useCallback(() => {
        // Actualiza el contexto con las entradas de productos recopiladas
        updateProductEntries(collectedProductEntries);
        if (currentCommerceId && currentCommerceName) {
            navigation.navigate('VisitItems', { commerceId: currentCommerceId, commerceName: currentCommerceName });
        } else {
            Alert.alert('Error de Sesión', 'El comercio actual o su nombre no están definidos. Por favor, reinicia la visita.', [{
                text: 'OK',
                onPress: () => {
                    navigation.replace('CommerceList');
                    resetVisit();
                }
            }]);
        }
    }, [navigation, currentCommerceId, currentCommerceName, collectedProductEntries, updateProductEntries, resetVisit]);


    const handleBackToVisitItems = navigateToVisitItems;
    const handleGoToVisitItems = navigateToVisitItems;


    const handleAddProductEntry = () => {
        if (!selectedProductId) {
            Alert.alert('Error', 'Por favor, selecciona una presentación Chispa.');
            return;
        }

        const selectedProduct = chispaPresentations.find(
            (p) => p.id === selectedProductId
        );

        if (!selectedProduct) {
            Alert.alert('Error interno', 'Presentación Chispa seleccionada no válida.');
            return;
        }

        let parsedPrice: number | null = null;
        let parsedShelfStock: number | null = null;
        let parsedGeneralStock: number | null = null;

        if (selectedProduct.name === 'SIN STOCK') {
            parsedPrice = null;
            parsedShelfStock = null;
            parsedGeneralStock = null;
        } else {
            if (!productPrice.trim() || !shelfStock.trim() || !generalStock.trim()) {
                Alert.alert('Error', 'Por favor, completa todos los campos (precio, stock anaqueles, stock general).');
                return;
            }

            parsedPrice = parseFloat(productPrice.replace(',', '.'));
            parsedShelfStock = parseInt(shelfStock, 10);
            parsedGeneralStock = parseInt(generalStock, 10);

            if (isNaN(parsedPrice) || parsedPrice < 0 ||
                isNaN(parsedShelfStock) || parsedShelfStock < 0 ||
                isNaN(parsedGeneralStock) || parsedGeneralStock < 0) {
                Alert.alert('Error', 'Por favor, ingresa valores numéricos válidos y no negativos para precio y stocks.');
                return;
            }
        }

        const newEntry: ProductVisitEntry = {
            productId: selectedProductId,
            productName: selectedProduct.name,
            price: parsedPrice,
            currency: selectedCurrency,
            shelfStock: parsedShelfStock,
            generalStock: parsedGeneralStock,
        };

        const existingEntryIndex = collectedProductEntries.findIndex(
            (entry) => entry.productId === newEntry.productId
        );

        let updatedEntries: ProductVisitEntry[];
        if (existingEntryIndex > -1) {
            updatedEntries = [...collectedProductEntries];
            updatedEntries[existingEntryIndex] = newEntry;
            Alert.alert('Actualizado', `"${newEntry.productName}" ha sido actualizado.`);
        } else {
            updatedEntries = [...collectedProductEntries, newEntry];
            Alert.alert('Añadido', `Presentación "${newEntry.productName}" añadida.`);
        }
        setCollectedProductEntries(updatedEntries);

        // Limpiar campos después de añadir
        setSelectedProductId(null);
        setProductPrice('');
        setSelectedCurrency('USD');
        setShelfStock('');
        setGeneralStock('');
        setIsSinStockSelected(false);
    };

    // NUEVA FUNCIÓN: Eliminar una entrada de producto Chispa
    const handleRemoveProductEntry = (productIdToRemove: string) => {
        Alert.alert(
            'Confirmar Eliminación',
            '¿Estás seguro de que quieres eliminar esta entrada de producto?',
            [{
                text: 'Cancelar',
                style: 'cancel',
            },
            {
                text: 'Eliminar',
                onPress: () => {
                    const updatedEntries = collectedProductEntries.filter(
                        (entry) => entry.productId !== productIdToRemove
                    );
                    setCollectedProductEntries(updatedEntries);
                    updateProductEntries(updatedEntries);
                    Alert.alert('Eliminado', 'La entrada ha sido eliminada.');
                },
                style: 'destructive',
            },
            ], { cancelable: true }
        );
    };


    const handleFinalizeSectionAndContinue = () => {
        if (collectedProductEntries.length === 0) {
            Alert.alert('Atención', 'Debes añadir al menos una presentación Chispa antes de continuar.');
            markSectionComplete('chispa', false);
            return;
        }

        updateProductEntries(collectedProductEntries);
        markSectionComplete('chispa', true);
        if (currentCommerceId && currentCommerceName) {
            navigation.navigate('VisitItems', { commerceId: currentCommerceId, commerceName: currentCommerceName });
        } else {
            Alert.alert('Error de Sesión', 'El comercio actual o su nombre no están definidos. Por favor, reinicia la visita.', [{
                text: 'OK',
                onPress: () => {
                    navigation.replace('CommerceList');
                    resetVisit();
                }
            }]);
        }
    };

    const renderProductEntryItem = ({ item }: { item: ProductVisitEntry }) => (
        <View style={styles.productEntryItem}>
            <View style={styles.productEntryDetails}>
                <Text style={styles.productEntryText}>** {item.productName} **</Text>
                <Text style={styles.productEntryDetail}>
                    Precio: {item.price !== null ? `${item.currency === 'USD' ? '$' : 'BsF'} ${item.price?.toFixed(2)}` : 'N/A'}
                </Text>
                <Text style={styles.productEntryDetail}>
                    Anaqueles: {item.shelfStock !== null ? item.shelfStock : 'N/A'}
                </Text>
                <Text style={styles.productEntryDetail}>
                    General: {item.generalStock !== null ? item.generalStock : 'N/A'}
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => handleRemoveProductEntry(item.productId)}
                style={styles.deleteButton}
            >
                <Icon name="close-circle" size={28} color={ERROR_RED} />
            </TouchableOpacity>
        </View>
    );

    const availablePresentations = chispaPresentations.filter(
        (presentation) => !collectedProductEntries.some(entry => entry.productId === presentation.id)
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {showOverlayLoading && (
                <View style={styles.overlayLoadingContainer}>
                    <ActivityIndicator size="large" color={DARK_BLUE} />
                    <Text style={styles.overlayLoadingText}>Cargando...</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBackToVisitItems}>
                        <Text style={styles.backButtonText}>{'< Volver'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Productos Chispa para:</Text>
                    <Text style={styles.commerceName}>{commerce?.name || 'Comercio Desconocido'}</Text>
                    {commerce?.address && <Text style={styles.commerceAddress}>{commerce.address}</Text>}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Registro de Productos Chispa</Text>

                    <Text style={styles.inputLabel}>Seleccionar Presentación Chispa *</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedProductId}
                            onValueChange={(itemValue) => {
                                setSelectedProductId(itemValue);
                                setProductPrice('');
                                setShelfStock('');
                                setGeneralStock('');
                                setSelectedCurrency('USD');
                                const product = chispaPresentations.find(p => p.id === itemValue);
                                setIsSinStockSelected(product?.name === 'SIN STOCK');
                            }}
                            style={styles.picker}
                            itemStyle={styles.pickerItem}
                        >
                            <Picker.Item label="-- Selecciona una Presentación --" value={null} />
                            {availablePresentations.map((presentation) => (
                                <Picker.Item key={presentation.id} label={presentation.name} value={presentation.id} />
                            ))}
                        </Picker>
                    </View>

                    {selectedProductId && !isSinStockSelected && (
                        <View>
                            <Text style={styles.inputLabel}>Precio Producto *</Text>
                            <View style={styles.currencyToggleContainer}>
                                <TouchableOpacity
                                    style={[styles.currencyButton, selectedCurrency === 'USD' && styles.currencyButtonSelected]}
                                    onPress={() => setSelectedCurrency('USD')}
                                >
                                    <Text style={[styles.currencyButtonText, selectedCurrency === 'USD' && styles.currencyButtonTextSelected]}>$ USD</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.currencyButton, selectedCurrency === 'VES' && styles.currencyButtonSelected]}
                                    onPress={() => setSelectedCurrency('VES')}
                                >
                                    <Text style={[styles.currencyButtonText, selectedCurrency === 'VES' && styles.currencyButtonTextSelected]}>BsF VES</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Precio del producto"
                                placeholderTextColor={PLACEHOLDER_GRAY}
                                value={productPrice}
                                onChangeText={setProductPrice}
                                keyboardType="numeric"
                                returnKeyType="done"
                            />

                            <Text style={styles.inputLabel}>Stock en Anaqueles *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Cantidad en anaqueles"
                                placeholderTextColor={PLACEHOLDER_GRAY}
                                value={shelfStock}
                                onChangeText={setShelfStock}
                                keyboardType="numeric"
                                returnKeyType="done"
                            />

                            <Text style={styles.inputLabel}>Stock General *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Cantidad en depósito/general"
                                placeholderTextColor={PLACEHOLDER_GRAY}
                                value={generalStock}
                                onChangeText={setGeneralStock}
                                keyboardType="numeric"
                                returnKeyType="done"
                                onSubmitEditing={handleAddProductEntry}
                            />
                        </View>
                    )}

                    {selectedProductId && isSinStockSelected && (
                        <Text style={styles.infoText}>
                            Has seleccionado "SIN STOCK". Los campos de precio y stock se ignorarán para esta entrada.
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.addButton, !selectedProductId && styles.addButtonDisabled]}
                        onPress={handleAddProductEntry}
                        disabled={!selectedProductId}
                    >
                        <Text style={styles.addButtonText}>+ Añadir Presentación Chispa</Text>
                    </TouchableOpacity>
                </View>

                {collectedProductEntries.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Presentaciones Chispa Añadidas</Text>
                        <FlatList
                            data={collectedProductEntries}
                            renderItem={renderProductEntryItem}
                            keyExtractor={(item, index) => item.productId + index.toString()}
                            contentContainerStyle={styles.collectedProductsList}
                            scrollEnabled={false}
                        />
                    </View>
                )}

                <Text style={styles.infoText}>
                    (Todos los datos aún no se han guardado definitivamente. Se guardarán al finalizar la visita.)
                </Text>

                <TouchableOpacity
                    style={[styles.finalizeButton, collectedProductEntries.length === 0 && styles.finalizeButtonDisabled, styles.centeredButton]}
                    onPress={handleFinalizeSectionAndContinue}
                    disabled={collectedProductEntries.length === 0}
                >
                    <Text style={[styles.finalizeButtonText, styles.buttonTextCentered]}>Finalizar Sección Chispa y Continuar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.goToItemsButton, styles.centeredButton]}
                    onPress={handleGoToVisitItems}
                >
                    <Text style={[styles.goToItemsButton, styles.buttonTextCentered]}>Ir a Items de Visita</Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY_BLUE_SOFT,
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 20,
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
    },
    backButton: {
        position: 'absolute',
        left: 10,
        top: 15,
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
    noDataText: {
        fontSize: 16,
        color: TEXT_DARK,
        textAlign: 'center',
        fontStyle: 'italic',
        paddingVertical: 10,
    },
    collectedProductsList: {
        marginTop: 10,
    },
    productEntryItem: {
        backgroundColor: PRIMARY_BLUE_SOFT,
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productEntryDetails: {
        flex: 1,
    },
    productEntryText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: DARK_BLUE,
        marginBottom: 5,
    },
    productEntryDetail: {
        fontSize: 15,
        color: TEXT_DARK,
    },
    infoText: {
        fontSize: 13,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 15,
        fontStyle: 'italic',
    },
    placeholderText: {
        fontSize: 16,
        color: TEXT_DARK,
        textAlign: 'center',
        paddingVertical: 10,
    },
    inputLabel: {
        width: '100%',
        textAlign: 'left',
        marginBottom: 5,
        fontSize: 15,
        color: TEXT_DARK,
        fontWeight: '600',
        marginTop: 10,
    },
    pickerContainer: {
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 20,
        backgroundColor: TEXT_LIGHT,
        overflow: 'hidden',
        shadowColor: 'rgba(0,0,0,0.03)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    picker: {
        height: 55,
        width: '100%',
        color: TEXT_DARK,
    },
    pickerItem: {
        fontSize: 17,
        color: TEXT_DARK,
    },
    input: {
        width: '100%',
        height: 55,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 18,
        marginBottom: 20,
        fontSize: 17,
        color: TEXT_DARK,
        backgroundColor: TEXT_LIGHT,
        shadowColor: 'rgba(0,0,0,0.03)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    currencyToggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
        backgroundColor: LIGHT_GRAY_BACKGROUND,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER_COLOR,
    },
    currencyButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: BORDER_COLOR,
    },
    currencyButtonSelected: {
        backgroundColor: ACCENT_BLUE,
        borderColor: ACCENT_BLUE,
    },
    currencyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: TEXT_DARK,
    },
    currencyButtonTextSelected: {
        color: TEXT_LIGHT,
    },
    addButton: {
        backgroundColor: WARNING_ORANGE,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: 'rgba(0,0,0, 0.4)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    addButtonDisabled: {
        backgroundColor: '#FFEBEE',
        shadowOpacity: 0.2,
        elevation: 2,
    },
    addButtonText: {
        color: TEXT_DARK,
        fontSize: 19,
        fontWeight: 'bold',
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
        width: '100%',
    },
    finalizeButtonDisabled: {
        backgroundColor: '#B2DFDB',
        shadowOpacity: 0.2,
        elevation: 2,
    },
    finalizeButtonText: {
        color: TEXT_LIGHT,
        fontSize: 20,
        fontWeight: 'bold',
    },
    goToItemsButton: {
        backgroundColor: ACCENT_BLUE,
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
        width: '100%',
    },
    centeredButton: {
        alignSelf: 'center',
        maxWidth: 350,
        minWidth: 200,
    },
    buttonTextCentered: {
        textAlign: 'center',
    },
    deleteButton: {
        marginLeft: 15,
        padding: 5,
    },
});

export default VisitScreen;