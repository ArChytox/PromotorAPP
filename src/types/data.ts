// src/types/data.ts

// Definición para el tipo de Comercio
export interface Commerce {
  id: string;
  name: string;
  address: string;
  phone?: string;
  category?: string;
  createdAt: string;
}

// Definición para una "Presentación Chispa"
export interface ChispaPresentation {
  id: string;
  name: string;
}

// Definición para la entrada de visita de una presentación específica (Chispa)
export interface ProductVisitEntry {
  productId: string;
  productName: string;
  currency: 'USD' | 'VES';
  price: number | null;     // <--- ¡IMPORTANTE!
  shelfStock: number | null; // <--- ¡IMPORTANTE!
  generalStock: number | null; // <--- ¡IMPORTANTE!
}

// --- TIPOS PARA COMPETENCIA ---
// Definición para un Producto de la Competencia
export interface CompetitorProduct {
  id: string;
  name: string;
}

// Definición para la entrada de visita de un producto de la competencia
export interface CompetitorVisitEntry {
  productId: string;
  productName: string;
  price: number;
  currency: 'USD' | 'VES';
}
// --- FIN TIPOS COMPETENCIA ---

// --- NUEVOS TIPOS PARA FOTOS Y UBICACIÓN ---
// Tipo para una entrada individual de foto
export interface PhotoEntry {
  uri: string;
  timestamp: string;
  base64: string; // Si guardas la base64
}

// Definición para los datos de ubicación
export interface LocationEntry {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number | null;
  altitude?: number | null;
  cityName?: string;
}

// **NUEVA INTERFAZ**: Para el estado de cada sección de la visita
export interface VisitSectionStatus {
  name: 'chispa' | 'competitor' | 'photos_location' | 'info_general';
  isComplete: boolean;
  icon: string; // Por ejemplo, 'info-circle', 'cube-scan', 'account-group', 'camera'
  color: string; // Por ejemplo, '#28a745', '#dc3545', '#ffc107', '#007bff'
}

// **NUEVA INTERFAZ**: Agrupa fotos y ubicación, como VisitContext la usa internamente
export interface PhotoAndLocationEntry {
  photos: string[]; // Arreglo de URIs de las fotos
  location: LocationEntry | null;
}
// --- FIN NUEVOS TIPOS ---

// Definición para una Visita completa a un Comercio
export interface Visit {
  id: string;
  commerceId: string;
  commerceName: string; // ¡Ahora requerido!
  timestamp: string;
  productEntries: ProductVisitEntry[];
  competitorEntries: CompetitorVisitEntry[];
  photos: string[]; // URIs de las fotos
  location: LocationEntry | null;
  sectionStatus: VisitSectionStatus[]; // Estado de las secciones de la visita
  promoterId?: string; // ID del promotor (opcional)
  photoBeforeUri?: string; // URI de la foto antes (opcional)
  photoAfterUri?: string; // URI de la foto después (opcional)
}