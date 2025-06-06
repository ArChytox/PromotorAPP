// PromotorAPP/src/services/supabase.js
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANTE: REEMPLAZA ESTOS VALORES CON TUS CLAVES REALES DE SUPABASE
// Encuéntralas en tu panel de Supabase: Project Settings -> API
const supabaseUrl = 'https://rlbmomerfewhjlxndfgk.supabase.co'; // <--- PEGA TU URL REAL AQUÍ
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYm1vbWVyZmV3aGpseG5kZmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODEyNDcsImV4cCI6MjA2NDQ1NzI0N30.sglCxIw8-FNnoU4DW--yvSjrbakqF0Fh7Q3swYOyZGY'; // <--- PEGA TU CLAVE ANON (PÚBLICA) REAL AQUÍ

// DEBUG: Verificación de que las claves se están cargando (solo para desarrollo)
// Puedes comentar o eliminar estas líneas en producción
console.log("DEBUG [supabase.js]: Supabase URL cargada:", supabaseUrl);
console.log("DEBUG [supabase.js]: Supabase Key cargada:", supabaseKey ? "Sí" : "No", "(Primeros 5 chars:", supabaseKey?.substring(0, 5), ")");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage, // Configura AsyncStorage para persistir la sesión en React Native
    autoRefreshToken: true, // Intenta refrescar el token de sesión automáticamente
    persistSession: true,   // Mantiene la sesión del usuario entre reinicios de la app
    detectSessionInUrl: false, // Importante para React Native, evita problemas con redirecciones URL
  },
});

// DEBUG: Verifica el valor de 'supabase' después de crearlo (solo para desarrollo)
// Puedes comentar o eliminar esta línea en producción
console.log("DEBUG [supabase.js]: Cliente Supabase creado:", supabase ? "Sí" : "No", supabase);