// src/types/data.ts

// --- Entradas de la UI / Contexto (cómo los manejas en tu aplicación) ---

export interface ProductVisitEntry {
  productId: string; // Asumimos que es UUID en la BD
  productName: string;
  currency: string;
  price: number | null;
  shelfStock: number | null;
  generalStock: number | null;
}

export interface CompetitorVisitEntry {
  productId: string; // Asumimos que es UUID en la BD
  productName: string;
  price: number;
  currency: string;
}

export interface PhotoEntry {
  uri: string; // URI local (file:///) o URL pública de Supabase después de la subida
  timestamp: string;
  type: 'before' | 'after' | 'shelf' | 'other'; // Definir tipos de fotos
}

export interface LocationEntry {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy: number | null;
  altitude: number | null;
  cityName: string | null;
  addressName: string | null;
  stateName: string | null;
}

// --- Tipos para el estado de la sección ---
export type VisitSectionStatusType = 'completed' | 'pending' | 'error';
export interface VisitSectionState {
  chispa: VisitSectionStatusType;
  competitor: VisitSectionStatusType;
  photos_location: VisitSectionStatusType;
  info_general: VisitSectionStatusType;
  summary: VisitSectionStatusType;
}

// --- Tipo de Visita Completa (usado en el contexto/para almacenamiento local) ---
// Este tipo combina todos los datos de una visita antes de ser desglosados
// para su almacenamiento relacional en Supabase.
export interface Visit {
  id: string; // Se genera un ID único para cada visita (ej. UUID)
  commerceId: string;
  commerceName: string;
  timestamp: string; // Hora de inicio de la visita (ISO local)
  endTimestamp?: string; // Hora de finalización (se establece al finalizar)
  promoterId?: string | null; // ID del usuario que realiza la visita
  notes?: string | null; // Notas generales de la visita
  productEntries: ProductVisitEntry[]; // Detalles de productos Chispa
  competitorEntries: CompetitorVisitEntry[]; // Detalles de la competencia
  photos: PhotoEntry[]; // Fotos tomadas durante la visita
  location: LocationEntry | null; // Datos de ubicación geográfica
  sectionStatus: VisitSectionState; // Estado de completitud de las secciones
  isSynced: boolean; // Indica si la visita ha sido sincronizada con Supabase
}


// --- Tipos de Datos tal como se almacenan en Supabase ---

// Visit principal (para la tabla `visits`)
export interface StoredVisit {
  id?: string; // El ID lo genera Supabase (en este caso, lo pasamos nosotros)
  commerce_id: string;
  commerce_name: string;
  timestamp: string; // start_timestamp
  end_timestamp: string;
  promoter_id: string | null;
  notes?: string | null;
  is_synced: boolean;
  section_status: VisitSectionState; // Usa el tipo de estado de sección más general
}

// Para la tabla `product_visits`
export interface StoredProductVisit {
  id?: string;
  visit_id: string; // FK
  product_id: string; // FK a chispa_presentations (UUID)
  product_name: string;
  currency: string;
  price: number | null;
  shelf_stock: number | null;
  general_stock: number | null;
  created_at?: string;
}

// Para la tabla `competitor_product_visits`
export interface StoredCompetitorProductVisit {
  id?: string;
  visit_id: string; // FK
  product_id: string; // FK a competitor_products (UUID)
  product_name: string;
  price: number;
  currency: string;
  created_at?: string;
}

// Para la tabla `visit_photos`
export interface StoredVisitPhoto {
  id?: string;
  visit_id: string; // FK
  photo_url: string; // La URL pública de Supabase Storage
  timestamp: string; // Cuando se tomó la foto
  type: 'before' | 'after' | 'shelf' | 'other';
  created_at?: string;
}

// Para la tabla `visit_locations`
export interface StoredVisitLocation {
  id?: string;
  visit_id: string; // FK
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy: number | null;
  altitude: number | null;
  city_name: string | null;
  address_name: string | null;
  state_name: string | null; // Usando snake_case para la BD
  created_at?: string;
}

// Si tienes una tabla de Comercios
export interface Commerce {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  category: string | null;
  created_at?: string;
  user_id?: string | null;
}

// Si tienes una tabla de productos (Chispa)
export interface ChispaPresentation {
  id: string;
  name: string;
}

// Definición de CompetitorProduct
export interface CompetitorProduct {
  id: string;
  name: string;
}