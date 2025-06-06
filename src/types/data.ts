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
  uri: string; // URI local (file:///)
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
  stateName: string | null; // <-- ¡NUEVA PROPIEDAD AGREGADA AQUÍ!
}

// --- Tipos para el estado de la sección ---
export type VisitSectionStatusType = 'completed' | 'pending' | 'error'; // Ajustado para ser más general
export interface VisitSectionState {
  chispa: VisitSectionStatusType;
  competitor: VisitSectionStatusType;
  photos_location: VisitSectionStatusType;
  info_general: VisitSectionStatusType;
  summary: VisitSectionStatusType;
}

// --- Tipos de Datos tal como se almacenan en Supabase ---

// Visit principal (para la tabla `visits`)
export interface StoredVisit {
  id?: string; // El ID lo genera Supabase
  commerce_id: string;
  commerce_name: string;
  timestamp: string; // start_timestamp
  end_timestamp: string;
  promoter_id: string | null;
  notes?: string | null; // Si añades esta columna
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
  photo_url: string; // La URL pública/firmada de Supabase Storage
  timestamp: string; // Cuando se tomó la foto
  type: 'before' | 'after' | 'shelf' | 'other'; // Asegúrate de que tu tabla `visit_photos` tenga esta columna
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
  cityName: string | null;
  addressName: string | null;
  state_name: string | null; // <-- ¡NUEVA PROPIEDAD AGREGADA AQUÍ! (Usando snake_case para la BD)
  created_at?: string;
}

// Si tienes una tabla de Comercios (basado en tu definición)
export interface Commerce {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  category: string | null;
  created_at?: string;
  user_id?: string | null;
}

// Si tienes una tabla de productos (Chispa) (basado en tu definición)
export interface ChispaPresentation {
  id: string;
  name: string;
}

// Definición de CompetitorProduct (se mantuvo una única definición ya que la estructura es la misma para UI y DB)
export interface CompetitorProduct {
  id: string;
  name: string;
}