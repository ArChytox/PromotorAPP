// src/screens/MyVisitsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator';

// Importa los tipos directamente de Supabase (Stored...) y Commerce
import {
  StoredVisit,
  StoredVisitLocation,
  StoredVisitPhoto,
  StoredProductVisit,
  StoredCompetitorProductVisit,
  Commerce // Para los comercios
} from '../types/data'; // Asegúrate de que estos tipos estén en data.ts y coincidan con tu DB

// Importa la instancia de Supabase
import { supabase } from '../services/supabase';

// --- CONSTANTES DE COLORES (NUEVAS: Extraídas de StyleSheet para consistencia) ---
const PRIMARY_BACKGROUND = '#e9eff4';
const HEADER_BLUE = '#007bff';
const TEXT_DARK = '#333';
const TEXT_MEDIUM = '#555';
const TEXT_LIGHT = '#fff';
const SHADOW_COLOR = '#000';
const SUCCESS_GREEN = '#28a745';
const INFO_GRAY = '#888';
const CARD_BACKGROUND = '#fff';
const BORDER_GRAY = '#e0e0e0';
const SUBTLE_TEXT_GRAY = '#666';
const DATETIME_TEXT_GRAY = '#888';
const LOCATION_TEXT_GRAY = '#555';

// Tipo de visita para esta pantalla, que agrupa toda la información relacionada
// Necesitamos una estructura que refleje lo que queremos mostrar, combinando los datos de Supabase
interface DisplayVisit {
  id: string;
  commerce_id: string;
  commerce_name: string;
  timestamp: string; // Fecha de inicio de visita
  end_timestamp: string;
  promoter_id: string | null;
  notes: string | null;
  is_synced: boolean;
  section_status: any; // O el tipo VisitSectionState si se mapea
  // Información relacionada, obtenida de las tablas unidas
  location?: StoredVisitLocation;
  photos: StoredVisitPhoto[];
  product_visits: StoredProductVisit[];
  competitor_product_visits: StoredCompetitorProductVisit[];
  // Información del comercio (obtenida de la tabla 'commerces')
  commerce_address?: string; // Para mostrar la dirección del comercio
}

type MyVisitsScreenProps = StackScreenProps<AppStackParamList, 'MyVisits'>;

const MyVisitsScreen: React.FC<MyVisitsScreenProps> = ({ navigation }) => {
  const [visits, setVisits] = useState<DisplayVisit[]>([]);
  const [commercesMap, setCommercesMap] = useState<Map<string, Commerce>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchVisitsAndCommerces = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Cargar todos los comercios primero para tener el mapa de nombres/direcciones
      const { data: commercesData, error: commercesError } = await supabase
        .from('commerces') // Asegúrate de que 'commerces' sea el nombre correcto de tu tabla de comercios
        .select('*');

      if (commercesError) {
        console.error('Error fetching commerces:', commercesError.message);
        throw new Error('No se pudieron cargar los comercios.');
      }

      const map = new Map<string, Commerce>();
      commercesData.forEach(c => map.set(c.id, c));
      setCommercesMap(map);

      // 2. Cargar las visitas con sus relaciones
      // Seleccionamos la visita principal y traemos los datos de las tablas relacionadas
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select(`
          *,
          visit_locations(*),
          visit_photos(*),
          product_visits(*),
          competitor_product_visits(*)
        `)
        .order('timestamp', { ascending: false }); // Ordenar por fecha más reciente primero

      if (visitsError) {
        console.error('Error fetching visits:', visitsError.message);
        throw new Error('No se pudieron cargar las visitas.');
      }

      // Mapear los datos para adaptarlos al tipo DisplayVisit y añadir la dirección del comercio
      const formattedVisits: DisplayVisit[] = visitsData.map(visit => {
        const commerceDetails = map.get(visit.commerce_id);
        
        // Supabase devuelve las relaciones como arrays, incluso si solo hay una.
        // Para location, si esperas una sola, toma la primera.
        const locationEntry = visit.visit_locations && visit.visit_locations.length > 0
          ? visit.visit_locations[0]
          : undefined;

        // photoBeforeUri y photoAfterUri no existen directamente en la DB.
        // Los inferimos de la lista de fotos.
        const hasPhotoBefore = visit.visit_photos?.some((photo: StoredVisitPhoto) => photo.type === 'before');
        const hasPhotoAfter = visit.visit_photos?.some((photo: StoredVisitPhoto) => photo.type === 'after');

        return {
          id: visit.id,
          commerce_id: visit.commerce_id,
          commerce_name: visit.commerce_name,
          timestamp: visit.timestamp,
          end_timestamp: visit.end_timestamp,
          promoter_id: visit.promoter_id,
          notes: visit.notes,
          is_synced: visit.is_synced,
          section_status: visit.section_status, // Mantenemos el JSONB tal cual
          location: locationEntry, // La primera ubicación (si existe)
          photos: visit.visit_photos || [],
          product_visits: visit.product_visits || [],
          competitor_product_visits: visit.competitor_product_visits || [],
          commerce_address: commerceDetails?.address || null, // Añadimos la dirección del comercio
          _hasPhotoBefore: hasPhotoBefore, // Campos auxiliares para renderizado
          _hasPhotoAfter: hasPhotoAfter,
        };
      });

      setVisits(formattedVisits);

    } catch (error: any) {
      console.error('Error loading visits or commerces:', error.message || error);
      Alert.alert('Error', `No se pudieron cargar las visitas o comercios: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial y recarga al enfocar la pantalla
    fetchVisitsAndCommerces();

    const unsubscribe = navigation.addListener('focus', () => {
      console.log('DEBUG: Screen focused, refetching visits.');
      fetchVisitsAndCommerces();
    });

    return unsubscribe;
  }, [fetchVisitsAndCommerces, navigation]);


  const renderVisitItem = ({ item }: { item: DisplayVisit }) => {
    const visitDate = new Date(item.timestamp);

    return (
      <View style={styles.visitItem}>
        <Text style={styles.visitCommerceName}>
          Visita a: **{item.commerce_name}**
        </Text>
        {item.commerce_address && <Text style={styles.visitCommerceAddress}>{item.commerce_address}</Text>}
        <Text style={styles.visitDateTime}>
          Fecha: {visitDate.toLocaleDateString()} Hora: {visitDate.toLocaleTimeString()}
        </Text>
        {item.location && (
          <Text style={styles.visitLocation}>
            Ubicación: {item.location.city_name || 'Desconocida'} ({item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)})
          </Text>
        )}
        <Text style={styles.visitSummary}>
          Productos Chispa registrados: {item.product_visits.length}
        </Text>
        <Text style={styles.visitSummary}>
          Productos Competencia registrados: {item.competitor_product_visits.length}
        </Text>
        {/* Usar los campos auxiliares para las fotos */}
        {item.photos?.some(p => p.type === 'before') && ( // Si existe una foto con type 'before'
            <Text style={styles.photoIndicator}>✔ Foto ANTES</Text>
        )}
        {item.photos?.some(p => p.type === 'after') && ( // Si existe una foto con type 'after'
            <Text style={styles.photoIndicator}>✔ Foto DESPUÉS</Text> 
        )}
        {item.photos?.some(p => p.type === 'shelf') && (
            <Text style={styles.photoIndicator}>✔ Foto EXHIBIDOR</Text>
        )}
        {item.photos?.some(p => p.type === 'other') && (
            <Text style={styles.photoIndicator}>✔ Otra FOTO</Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HEADER_BLUE} />
        <Text style={styles.loadingText}>Cargando visitas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ajustar la StatusBar para iOS */}
      {Platform.OS === 'ios' && <StatusBar barStyle="light-content" />}
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.goToCommercesButton}
          onPress={() => navigation.navigate('CommerceList')}
        >
          <Text style={styles.goToCommercesButtonText}>Ir a Comercios</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Visitas</Text>
      </View>

      {visits.length === 0 ? (
        <View style={styles.noVisitsContainer}>
          <Text style={styles.noVisitsText}>Aún no hay visitas registradas.</Text>
          <TouchableOpacity
            style={styles.goToCommercesButtonNoVisits}
            onPress={() => navigation.navigate('CommerceList')}
          >
            <Text style={styles.goToCommercesButtonText}>Registrar Nueva Visita</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visits}
          renderItem={renderVisitItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY_BACKGROUND,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: TEXT_MEDIUM,
  },
  header: {
    backgroundColor: HEADER_BLUE,
    paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight || 0) + 10) : 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    flex: 1,
    textAlign: 'center',
    marginRight: 60,
  },
  goToCommercesButton: {
    backgroundColor: SUCCESS_GREEN,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginRight: 10,
  },
  goToCommercesButtonText: {
    color: TEXT_LIGHT,
    fontSize: 15,
    fontWeight: 'bold',
  },
  noVisitsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noVisitsText: {
    textAlign: 'center',
    fontSize: 20,
    color: INFO_GRAY,
    marginBottom: 20,
  },
  goToCommercesButtonNoVisits: {
    backgroundColor: HEADER_BLUE,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  listContent: {
    padding: 15,
  },
  visitItem: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  visitCommerceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_DARK,
    marginBottom: 5,
  },
  visitCommerceAddress: {
    fontSize: 14,
    color: SUBTLE_TEXT_GRAY,
    marginBottom: 5,
  },
  visitDateTime: {
    fontSize: 13,
    color: DATETIME_TEXT_GRAY,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  visitLocation: {
    fontSize: 14,
    color: LOCATION_TEXT_GRAY,
    marginBottom: 5,
  },
  visitSummary: {
    fontSize: 14,
    color: TEXT_DARK,
    marginTop: 3,
  },
  photoIndicator: {
    fontSize: 12,
    color: SUCCESS_GREEN,
    marginTop: 2,
    fontWeight: '600',
  }
});

export default MyVisitsScreen;