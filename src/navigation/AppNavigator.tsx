// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
// ¡IMPORTANTE! NO importamos NavigationContainer aquí. Solo en App.tsx.
import CommerceListScreen from '../screens/CommerceListScreen';
import AddEditCommerceScreen from '../screens/AddEditCommerceScreen';
import VisitScreen from '../screens/VisitScreen';
import CompetitorScreen from '../screens/CompetitorScreen';
import PhotoAndLocationScreen from '../screens/PhotoAndLocationScreen';

// Importar los tipos necesarios para las props de navegación
import { ProductVisitEntry, CompetitorVisitEntry } from '../types/data';

export type AppStackParamList = {
  CommerceList: undefined;
  AddEditCommerce: { commerceId?: string } | undefined;
  Visit: { commerceId: string };
  Competitor: { commerceId: string; productEntries: ProductVisitEntry[] };
  PhotoAndLocation: {
    commerceId: string;
    productEntries: ProductVisitEntry[];
    competitorEntries: CompetitorVisitEntry[];
  };
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
  return (
    // Asegúrate de que no haya NADA aquí, solo el Stack.Navigator
    <Stack.Navigator initialRouteName="CommerceList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommerceList" component={CommerceListScreen} />
      <Stack.Screen name="AddEditCommerce" component={AddEditCommerceScreen} />
      <Stack.Screen name="Visit" component={VisitScreen} />
      <Stack.Screen name="Competitor" component={CompetitorScreen} />
      <Stack.Screen name="PhotoAndLocation" component={PhotoAndLocationScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;