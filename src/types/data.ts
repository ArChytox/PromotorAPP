// src/types/data.ts

// Definición para el tipo de Comercio
export interface Commerce {
  id: string;
  name: string;
  address: string;
  phone?: string;
  category: string;
}

// Definición para una "Presentación Chispa"
export interface ChispaPresentation {
  id: string;
  name: string;
}

// Definición para la entrada de visita de una presentación específica (Chispa)
export interface ProductVisitEntry {
  productId: string; // ID de la presentación Chispa
  productName: string; // Nombre de la presentación para facilitar la visualización
  price: number; // Precio registrado
  shelfStock: number; // Stock en anaqueles
  generalStock: number; // Stock general/inventario
}

// --- NUEVOS TIPOS PARA COMPETENCIA ---

// Definición para un Producto de la Competencia
export interface CompetitorProduct {
  id: string;
  name: string;
}

// Definición para la entrada de visita de un producto de la competencia
export interface CompetitorVisitEntry {
  productId: string; // ID del producto de la competencia
  productName: string; // Nombre del producto de la competencia
  price: number; // Precio registrado para el competidor
}

// --- FIN NUEVOS TIPOS ---


// Definición para una Visita completa a un Comercio
export interface Visit {
  id: string; // ID único de la visita
  commerceId: string; // ID del comercio visitado
  timestamp: string; // Fecha y hora de la visita (ISO string)
  productEntries: ProductVisitEntry[]; // Array de productos Chispa registrados en esta visita
  competitorEntries: CompetitorVisitEntry[]; // <--- NUEVO: Array de productos de la competencia
  // Puedes añadir más campos a la visita si es necesario (ej: observaciones, promotorId, etc.)
  promoterId?: string; // Por si quieres asociar el promotor
}