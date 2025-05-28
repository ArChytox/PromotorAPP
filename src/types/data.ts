// src/types/data.ts

// Definición para el tipo de Comercio
export interface Commerce {
  id: string;
  name: string;
  address: string;
  phone?: string;
  category: string;
}

// Definición para una "Presentación Chispa" (anteriormente SparkProduct)
export interface ChispaPresentation {
  id: string;
  name: string;
}

// Definición para la entrada de visita de una presentación específica
export interface ProductVisitEntry {
  productId: string; // ID de la presentación
  productName: string; // Nombre de la presentación para facilitar la visualización
  price: number; // Precio registrado
  shelfStock: number; // Stock en anaqueles
  generalStock: number; // Stock general/inventario
}

// Definición para una Visita completa a un Comercio
export interface Visit {
  id: string; // ID único de la visita
  commerceId: string; // ID del comercio visitado
  timestamp: string; // Fecha y hora de la visita (ISO string)
  productEntries: ProductVisitEntry[]; // Array de productos registrados en esta visita
  // competidorData: any[]; // <--- Esto se añadirá en pantallas posteriores
  // Puedes añadir más campos a la visita si es necesario (ej: observaciones, promotorId, etc.)
  promoterId?: string; // Por si quieres asociar el promotor
}