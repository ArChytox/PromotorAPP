// src/utils/idGenerator.ts
import 'react-native-get-random-values'; // Importar al principio para polyfill
import { v4 as uuidv4 } from 'uuid'; // Importar v4 para UUID

export const generateUniqueId = (): string => {
  return uuidv4();
};