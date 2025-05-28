// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CommerceSelectionScreen from '../screens/CommerceSelectionScreen';
import AddEditCommerceScreen from '../screens/AddEditCommerceScreen';
import VisitScreen from '../screens/VisitScreen';
import CompetitorScreen from '../screens/CompetitorScreen'; // Importamos la nueva pantalla de competencia
import { ProductVisitEntry } from '../types/data'; // Importamos ProductVisitEntry para los tipos

// Definir los tipos de parámetros para las rutas de este navegador.
export type AppStackParamList = {
  CommerceSelection: undefined;
  AddEditCommerce: { commerceId?: string } | undefined;
  Visit: { commerceId: string };
  Competitor: { commerceId: string; productEntries: ProductVisitEntry[] }; // La pantalla de competencia recibe los datos
};

const AppStack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="CommerceSelection" component={CommerceSelectionScreen} />
      <AppStack.Screen name="AddEditCommerce" component={AddEditCommerceScreen} />
      <AppStack.Screen name="Visit" component={VisitScreen} />
      {/* Añadimos la nueva pantalla de Competencia */}
      <AppStack.Screen name="Competitor" component={CompetitorScreen} />
    </AppStack.Navigator>
  );
};

export default AppNavigator;