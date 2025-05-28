// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CommerceListScreen from '../screens/CommerceListScreen';
import AddEditCommerceScreen from '../screens/AddEditCommerceScreen';
import VisitScreen from '../screens/VisitScreen';
import CompetitorScreen from '../screens/CompetitorScreen';
import PhotoAndLocationScreen from '../screens/PhotoAndLocationScreen';
import MyVisitsScreen from '../screens/MyVisitsScreen';
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
  MyVisits: undefined;
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
  return (
    // Asegúrate de que NO haya NADA aquí, solo el Stack.Navigator
    <Stack.Navigator initialRouteName="CommerceList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommerceList" component={CommerceListScreen} />
      <Stack.Screen name="AddEditCommerce" component={AddEditCommerceScreen} />
      <Stack.Screen name="Visit" component={VisitScreen} />
      <Stack.Screen name="Competitor" component={CompetitorScreen} />
      <Stack.Screen name="PhotoAndLocation" component={PhotoAndLocationScreen} />
      <Stack.Screen name="MyVisits" component={MyVisitsScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;