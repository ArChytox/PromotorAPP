import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Importa tus pantallas existentes
import CommerceListScreen from '../screens/CommerceListScreen';
import MyVisitsScreen from '../screens/MyVisitsScreen';

// Importa las pantallas para el flujo de visita
import VisitItemsScreen from '../screens/VisitItemsScreen';
import VisitScreen from '../screens/VisitScreen'; // Pantalla para "Productos Chispa"
import CompetitorScreen from '../screens/CompetitorScreen';
import PhotoAndLocationScreen from '../screens/PhotoAndLocationScreen';
import VisitSummaryScreen from '../screens/VisitSummaryScreen'; 

// Define los parámetros esperados para cada ruta
export type AppStackParamList = {
    CommerceList: undefined;
    MyVisits: undefined;

    // --- Pantallas para el flujo de visitas ---
    VisitItems: { commerceId: string; commerceName: string };
    Visit: { commerceId: string }; // Productos Chispa
    Competitor: { commerceId: string };
    PhotoAndLocation: { commerceId: string };
    VisitSummary: undefined; // Resumen de la visita, no necesita parámetros
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="CommerceList" screenOptions={{ headerShown: false }}>
            {/* Pantalla principal */}
            <Stack.Screen name="CommerceList" component={CommerceListScreen} />

            {/* Mis Visitas */}
            <Stack.Screen name="MyVisits" component={MyVisitsScreen} />

            {/* --- Flujo de Visita --- */}
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
            <Stack.Screen
                name="VisitSummary"
                component={VisitSummaryScreen}
                options={{ title: 'Resumen de Visita' }}
            />
        </Stack.Navigator>
    );
};

export default AppNavigator;