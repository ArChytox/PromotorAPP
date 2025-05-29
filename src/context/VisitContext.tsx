import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
// Asegúrate de que los tipos base estén definidos en types/data.ts
import { Visit, ProductEntry, CompetitorEntry, VisitLocation } from '../types/data'; // Ajustado ProductVisitEntry y CompetitorVisitEntry a ProductEntry y CompetitorEntry
// Asegúrate de que tienes esta función de guardado en utils/storage.ts
import { saveVisit } from '../utils/storage'; // Mantengo saveVisit, asumiendo que es la que usas

// ACTUALIZACIÓN IMPORTANTE: Define VisitSectionName de forma consistente
// También definimos el tipo para el estado de las secciones como un Record (objeto)
export type VisitSectionName = 'info_general' | 'chispa' | 'competitor' | 'photos_location';

// Type para el estado de las secciones en el contexto
interface VisitSectionsState {
  info_general: boolean;
  chispa: boolean;
  competitor: boolean;
  photos_location: boolean;
}

interface VisitContextType {
  currentCommerceId: string | null;
  setCurrentCommerceId: (id: string | null) => void;
  // CAMBIO CLAVE: visitSections ahora es un objeto con el estado de cada sección
  visitSections: VisitSectionsState;
  
  productEntries: ProductEntry[];
  updateProductEntries: (entries: ProductEntry[]) => void;

  competitorEntries: CompetitorEntry[];
  updateCompetitorEntries: (entries: CompetitorEntry[]) => void;

  photos: { uri: string; fileName: string }[]; // Asumiendo este tipo para las fotos
  updatePhotos: (photos: { uri: string; fileName: string }[]) => void;

  location: VisitLocation | null; // Asumiendo este tipo para la ubicación
  updateLocation: (location: VisitLocation | null) => void;

  // CAMBIO: el tipo de sectionName ahora usa VisitSectionName
  markSectionComplete: (sectionName: VisitSectionName, isComplete: boolean) => void;
  
  finalizeVisit: () => Promise<void>;
  resetVisit: () => void;
  
  // --- ¡AÑADIDO MINIMALMENTE! ---
  startNewVisit: (commerceId: string) => Promise<boolean>;
}

const VisitContext = createContext<VisitContextType | undefined>(undefined);

export const VisitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCommerceIdState, setCurrentCommerceIdState] = useState<string | null>(null); // Renombrado para claridad interna
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [competitorEntries, setCompetitorEntries] = useState<CompetitorEntry[]>([]);
  const [photos, setPhotos] = useState<{ uri: string; fileName: string }[]>([]);
  const [location, setLocation] = useState<VisitLocation | null>(null);

  // CAMBIO CRÍTICO: visitSections ahora es un objeto con el estado inicial
  const [visitSections, setVisitSections] = useState<VisitSectionsState>({
    info_general: false, // Asume que esta se marcará true cuando se seleccione el comercio
    chispa: false,
    competitor: false,
    photos_location: false,
  });

  // Función para establecer el ID del comercio (expuesta a través del contexto)
  const setCurrentCommerceId = useCallback((id: string | null) => {
    setCurrentCommerceIdState(id);
  }, []);

  // Función para resetear el estado de la visita
  const resetVisit = useCallback(() => {
    setCurrentCommerceIdState(null);
    setProductEntries([]);
    setCompetitorEntries([]);
    setPhotos([]);
    setLocation(null);
    // CAMBIO: Reinicia visitSections a su estado inicial como objeto
    setVisitSections({
      info_general: false,
      chispa: false,
      competitor: false,
      photos_location: false,
    });
    console.log('DEBUG: Estado de visita reseteado.');
  }, []);

  // --- ¡NUEVA FUNCIÓN startNewVisit AÑADIDA AQUÍ! ---
  const startNewVisit = useCallback(async (commerceId: string): Promise<boolean> => {
    console.log('DEBUG: VisitContext - Intentando iniciar nueva visita para commerceId:', commerceId);
    try {
      // Siempre resetea la visita al iniciar una nueva para asegurar un estado limpio
      resetVisit(); 
      setCurrentCommerceIdState(commerceId); // Establece el ID del comercio
      // Marca la sección info_general como completa al seleccionar el comercio
      setVisitSections(prev => ({ ...prev, info_general: true }));
      console.log('DEBUG: VisitContext - Nueva visita iniciada exitosamente.');
      return true; // Indica éxito
    } catch (error) {
      console.error('DEBUG: VisitContext - Error al iniciar nueva visita:', error);
      // No debería haber un error aquí a menos que resetVisit o setCurrentCommerceIdState fallen de alguna manera
      return false; // Indica fallo
    }
  }, [resetVisit]); // Dependencias: resetVisit para asegurar que se use la versión más reciente

  const updateProductEntries = useCallback((entries: ProductEntry[]) => {
    setProductEntries(entries);
  }, []);

  const updateCompetitorEntries = useCallback((entries: CompetitorEntry[]) => {
    setCompetitorEntries(entries);
  }, []);

  const updatePhotos = useCallback((newPhotos: { uri: string; fileName: string }[]) => {
    setPhotos(newPhotos);
  }, []);

  const updateLocation = useCallback((newLocation: VisitLocation | null) => {
    setLocation(newLocation);
  }, []);

  // CAMBIO: markSectionComplete ahora actualiza una propiedad del objeto `visitSections`
  const markSectionComplete = useCallback((sectionName: VisitSectionName, isComplete: boolean) => {
    setVisitSections(prevSections => ({
      ...prevSections,
      [sectionName]: isComplete, // Usa bracket notation para actualizar la propiedad dinámicamente
    }));
    console.log(`DEBUG: Sección ${sectionName} marcada como ${isComplete ? 'completa' : 'incompleta'}.`);
  }, []);

  const finalizeVisit = useCallback(async () => {
    if (!currentCommerceIdState) {
      console.error('No currentCommerceId set to finalize visit.');
      // Puedes usar un Alert aquí si quieres informar al usuario
      // Alert.alert('Error', 'No hay comercio seleccionado para finalizar la visita.');
      return; 
    }

    // Asegúrate de que tu tipo 'Visit' en data.ts sea compatible con esto
    const newVisit: Visit = {
      id: `${currentCommerceIdState}-${new Date().toISOString()}`, // ID único para la visita
      commerceId: currentCommerceIdState,
      commerceName: 'Nombre Desconocido', // Asegúrate de obtener el nombre real si es necesario para el guardado final
      timestamp: new Date().toISOString(),
      productEntries,
      competitorEntries,
      // Nota: Si tus `Visit` necesitan `photoBeforeUri` y `photoAfterUri`, debes ajustarlo aquí
      // Esto es un ejemplo, asume que `Visit` tiene una propiedad `photos: { uri: string; fileName: string }[]`
      photos: photos, 
      location: location,
      status: 'completed', // Añadir un estado de la visita si lo necesitas
    };

    try {
      // Asegúrate de que `saveVisit` pueda guardar un objeto `Visit`.
      // Si `saveVisit` en `utils/storage.ts` espera un array de visitas, necesitarás:
      // 1. Importar `getVisits` (si no lo tienes)
      // 2. const existingVisits = await getVisits();
      // 3. const updatedVisits = [...existingVisits, newVisit];
      // 4. await saveVisit(updatedVisits); // O `saveVisits` si tienes una función para arrays
      await saveVisit(newVisit); // Asumo que saveVisit guarda un solo objeto Visit
      
      console.log('DEBUG: Visit saved successfully:', newVisit.id);
      // Aquí podrías mostrar un Alert de éxito
      resetVisit(); // Resetear el contexto después de guardar
    } catch (error) {
      console.error('DEBUG: Error saving visit:', error);
      // Aquí podrías mostrar un Alert de error
      throw error; // Re-lanza el error para que la pantalla pueda manejarlo
    }
  }, [currentCommerceIdState, productEntries, competitorEntries, photos, location, resetVisit]);

  const contextValue = useMemo(() => ({
    currentCommerceId: currentCommerceIdState,
    setCurrentCommerceId,
    visitSections,
    productEntries,
    updateProductEntries,
    competitorEntries,
    updateCompetitorEntries,
    photos,
    updatePhotos,
    location,
    updateLocation,
    markSectionComplete,
    finalizeVisit,
    resetVisit,
    startNewVisit, // <-- ¡AHORA ESTÁ AQUÍ!
  }), [
    currentCommerceIdState,
    setCurrentCommerceId,
    visitSections,
    productEntries,
    updateProductEntries,
    competitorEntries,
    updateCompetitorEntries,
    photos,
    updatePhotos,
    location,
    updateLocation,
    markSectionComplete,
    finalizeVisit,
    resetVisit,
    startNewVisit, // <-- ¡Y AQUÍ EN LAS DEPENDENCIAS!
  ]);

  return (
    <VisitContext.Provider value={contextValue}>
      {children}
    </VisitContext.Provider>
  );
};

export const useVisit = () => {
  const context = useContext(VisitContext);
  if (context === undefined) {
    throw new Error('useVisit must be used within a VisitProvider');
  }
  return context;
};