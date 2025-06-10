// src/screens/MyVisitsScreen.tsx
import React, { useState, useEffect, useCallback, ReactElement, JSXElementConstructor } from 'react';
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
  ListRenderItemInfo,
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
  Commerce
} from '../types/data';

// Importa la instancia de Supabase
import { supabase } from '../services/supabase';
// ¡IMPORTA EL HOOK useAuth AQUÍ!
import { useAuth } from '../context/AuthContext'; // <--- ¡Asegúrate que esta ruta es correcta!

// --- CONSTANTES DE COLORES ---
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

interface DisplayVisit {
  _hasPhotoAfter: React.JSX.Element;
  _hasPhotoBefore: React.JSX.Element;
  id: string;
  commerce_id: string;
  commerce_name: string;
  timestamp: string;
  end_timestamp: string;
  promoter_id: string | null;
  notes: string | null;
  is_synced: boolean;
  section_status: any;
  location?: StoredVisitLocation;
  photos: StoredVisitPhoto[];
  product_visits: StoredProductVisit[];
  competitor_product_visits: StoredCompetitorProductVisit[];
  commerce_address?: string;
}

type MyVisitsScreenProps = StackScreenProps<AppStackParamList, 'MyVisits'>;

const MyVisitsScreen: React.FC<MyVisitsScreenProps> = ({ navigation }) => {
  const [visits, setVisits] = useState<DisplayVisit[]>([]);
  const [commercesMap, setCommercesMap] = useState<Map<string, Commerce>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // 1. Obtener el usuario autenticado del AuthContext
  // ¡Ahora también obtenemos 'logout' del contexto!
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth(); // <--- CAMBIO AQUÍ

  const fetchVisitsAndCommerces = useCallback(async () => {
    // Si todavía estamos cargando la autenticación o no hay usuario autenticado, no hacemos la llamada
    if (authLoading || !isAuthenticated || !user?.id) {
      console.log('DEBUG: Auth not ready or user not authenticated. Skipping fetch visits.');
      setIsLoading(false); // Asegúrate de que el loading se detiene si no hay usuario
      return;
    }

    setIsLoading(true);
    try {
      // 1. Cargar todos los comercios primero para tener el mapa de nombres/direcciones
      const { data: commercesData, error: commercesError } = await supabase
        .from('commerces')
        .select('*');

      if (commercesError) {
        console.error('Error fetching commerces:', commercesError.message);
        throw new Error('No se pudieron cargar los comercios.');
      }

      const map = new Map<string, Commerce>();
      commercesData.forEach(c => map.set(c.id, c));
      setCommercesMap(map);

      // 2. Cargar las visitas con sus relaciones, APLICANDO EL FILTRO DEL PROMOTOR
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select(`
          *,
          visit_locations(*),
          visit_photos(*),
          product_visits(*),
          competitor_product_visits(*)
        `)
        .eq('promoter_id', user.id) // <--- ¡ESTE ES EL FILTRO CLAVE!
        .order('timestamp', { ascending: false });

      if (visitsError) {
        console.error('Error fetching visits:', visitsError.message);
        throw new Error('No se pudieron cargar las visitas.');
      }

      const formattedVisits: DisplayVisit[] = visitsData.map(visit => {
        const commerceDetails = map.get(visit.commerce_id);

        const locationEntry = visit.visit_locations && visit.visit_locations.length > 0
          ? visit.visit_locations[0]
          : undefined;

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
          section_status: visit.section_status,
          location: locationEntry,
          photos: visit.visit_photos || [],
          product_visits: visit.product_visits || [],
          competitor_product_visits: visit.competitor_product_visits || [],
          commerce_address: commerceDetails?.address,
          _hasPhotoBefore: hasPhotoBefore,
          _hasPhotoAfter: hasPhotoAfter,
        };
      });

      setVisits(formattedVisits);

    } catch (error: any) {
      console.error('Error loading visits or commerces:', error.message || error);
      Alert.alert('Error', `No se pudieron cargar las visitas o comercios: ${error.message || 'Error desconocido'}`);
      // Aquí, si hay un error en la carga y el usuario estaba autenticado, podría significar un problema de sesión
      // Podrías considerar llamar a logout() aquí también, dependiendo de la severidad del error.
      // Por ahora, solo informamos.
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated, authLoading]); // Asegúrate de que las dependencias de useCallback estén correctas

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('DEBUG: Screen focused or mounted, refetching visits.');
      // Asegúrate de que fetchVisitsAndCommerces se llama solo si user?.id tiene un valor válido
      // o si la lógica interna de fetchVisitsAndCommerces lo maneja.
      // La condición 'if (authLoading || !isAuthenticated || !user?.id)' dentro de fetchVisitsAndCommerces ya lo hace.
      fetchVisitsAndCommerces();
    });

    return unsubscribe;
  }, [fetchVisitsAndCommerces, navigation]);

  // Si la autenticación aún está en progreso, muestra un loading genérico
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HEADER_BLUE} />
        <Text style={styles.loadingText}>Verificando autenticación...</Text>
      </View>
    );
  }

  // Si el usuario no está autenticado después de cargar
  if (!isAuthenticated || !user?.id) {
    return (
      <View style={styles.noVisitsContainer}>
        <Text style={styles.noVisitsText}>Debes iniciar sesión para ver tus visitas.</Text>
        <TouchableOpacity
          style={styles.goToCommercesButtonNoVisits}
          onPress={() => {
            // ¡CAMBIO CLAVE AQUÍ!
            // En lugar de navigation.navigate('Login'), llama a logout.
            // Esto actualizará el estado de autenticación y AppContent redirigirá.
            logout();
          }}
        >
          <Text style={styles.goToCommercesButtonText}>Ir a Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Si está cargando las visitas pero ya se autenticó
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HEADER_BLUE} />
        <Text style={styles.loadingText}>Cargando tus visitas...</Text>
      </View>
    );
  }
  
  // ¡ATENCIÓN! Falta la implementación de renderVisitItem.
  // Esto causará un error en tiempo de ejecución si la lista tiene elementos.
  function renderVisitItem(info: ListRenderItemInfo<DisplayVisit>): ReactElement<unknown, string | JSXElementConstructor<any>> | null {
    // throw new Error('Function not implemented.'); // ¡ELIMINA ESTA LÍNEA!
    const visit = info.item;
    // Aquí deberías retornar el JSX para renderizar un solo elemento de la visita.
    // Por ejemplo:
    return (
      <TouchableOpacity
        style={styles.visitItem}
        onPress={() => navigation.navigate('VisitSummary', { visitId: visit.id })}
      >
        <Text style={styles.visitCommerceName}>{visit.commerce_name}</Text>
        {visit.commerce_address && <Text style={styles.visitCommerceAddress}>{visit.commerce_address}</Text>}
        <Text style={styles.visitDateTime}>
          {new Date(visit.timestamp).toLocaleString()} - {new Date(visit.end_timestamp).toLocaleString()}
        </Text>
        {/* Agrega más detalles de la visita aquí si es necesario */}
        {visit.notes && <Text style={styles.visitSummary}>Notas: {visit.notes}</Text>}
        {visit._hasPhotoBefore && <Text style={styles.photoIndicator}>Foto antes ✅</Text>}
        {visit._hasPhotoAfter && <Text style={styles.photoIndicator}>Foto después ✅</Text>}
      </TouchableOpacity>
    );
  }


  // El resto de tu componente (renderizado de la lista)
  return (
    <View style={styles.container}>
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
          <Text style={styles.noVisitsText}>Aún no tienes visitas registradas.</Text> 
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
          renderItem={renderVisitItem} // Asegúrate de que renderVisitItem esté implementado
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
    marginRight: 60, // Ajuste para el botón de volver
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