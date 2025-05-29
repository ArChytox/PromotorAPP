// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Importa tus pantallas existentes
import CommerceListScreen from '../screens/CommerceListScreen';
import AddEditCommerceScreen from '../screens/AddEditCommerceScreen';
import MyVisitsScreen from '../screens/MyVisitsScreen';

// Importa las pantallas para el flujo de la visita
import VisitItemsScreen from '../screens/VisitItemsScreen';
import VisitScreen from '../screens/VisitScreen'; // Asumo que VisitScreen es para 'Productos Chispa'
import CompetitorScreen from '../screens/CompetitorScreen';
import PhotoAndLocationScreen from '../screens/PhotoAndLocationScreen';

// Define los parámetros esperados para cada ruta.
export type AppStackParamList = {
    CommerceList: undefined;
    // Permite que commerceId sea opcional para "añadir", o que el objeto params sea undefined
    AddEditCommerce: { commerceId?: string } | undefined; 
    MyVisits: undefined;

    // --- Pantallas para el Flujo de Visitas (commerceId ahora es REQUERIDO) ---
    // Esto asume que una visita siempre se inicia para un comercio específico
    VisitItems: { commerceId: string }; 
    Visit: { commerceId: string };
    Competitor: { commerceId: string }; 
    PhotoAndLocation: { commerceId: string }; 
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="CommerceList" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="CommerceList" component={CommerceListScreen} />
            <Stack.Screen name="AddEditCommerce" component={AddEditCommerceScreen} />
            <Stack.Screen name="MyVisits" component={MyVisitsScreen} />

            {/* --- Pantallas para el Flujo de Visitas --- */}
            <Stack.Screen
                name="VisitItems"
                component={VisitItemsScreen}
                options={{ title: 'Items de Visita' }}
            />
            <Stack.Screen
                name="Visit" 
                component={VisitScreen}
                options={{ title: 'Productos Chispa' }}
            />
            <Stack.Screen
                name="Competitor"
                component={CompetitorScreen}
                options={{ title: 'Productos Competencia' }}
            />
            <Stack.Screen
                name="PhotoAndLocation"
                component={PhotoAndLocationScreen}
                options={{ title: 'Fotos y Ubicación' }}
            />
        </Stack.Navigator>
    );
};

export default AppNavigator;