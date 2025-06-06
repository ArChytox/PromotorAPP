import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/AppNavigator'; // <--- CORREGIDO AQUÍ
import { useVisit } from '../context/VisitContext'; // <--- Y AQUÍ

// --- CONSTANTES DE COLORES ---
const PRIMARY_BLUE_SOFT = '#E3F2FD';
const DARK_BLUE = '#1565C0';
const ACCENT_BLUE = '#2196F3';
const SUCCESS_GREEN = '#66BB6A';
const WARNING_ORANGE = '#FFCA28';
const TEXT_DARK = '#424242';
const TEXT_LIGHT = '#FFFFFF';
const BORDER_COLOR = '#BBDEFB';
const LIGHT_GRAY_BACKGROUND = '#F5F5F5';
const ERROR_RED = '#DC3545';
const DISABLED_GRAY = '#EEEEEE';
const DISABLED_TEXT_GRAY = '#B0B0B0';

type VisitSummaryScreenProps = StackScreenProps<AppStackParamList, 'VisitSummary'>;

const VisitSummaryScreen: React.FC<VisitSummaryScreenProps> = ({ navigation }) => {
  const { summaryNotes, updateSummaryNotes, markSectionComplete } = useVisit();
  const [notes, setNotes] = useState<string>(summaryNotes);

  useEffect(() => {
    setNotes(summaryNotes);
  }, [summaryNotes]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (notes !== summaryNotes) {
        updateSummaryNotes(notes);
        markSectionComplete('summary', notes.trim().length > 0);
        console.log('DEBUG VisitSummaryScreen: Notas guardadas y estado de resumen actualizado.');
      }
    });

    return unsubscribe;
  }, [navigation, notes, summaryNotes, updateSummaryNotes, markSectionComplete]);

  const handleSaveAndGoBack = () => {
    updateSummaryNotes(notes);
    markSectionComplete('summary', notes.trim().length > 0);
    console.log('DEBUG VisitSummaryScreen: Notas guardadas y estado de resumen actualizado manualmente.');
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.fullScreenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleSaveAndGoBack}>
            <Text style={styles.backButtonText}>{'< Volver y Guardar'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resumen y Notas{"\n"}de la Visita</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionDescription}>
            Agrega cualquier nota o comentario adicional sobre la visita. Esto es opcional.
          </Text>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Escribe tus notas aquí..."
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
            placeholderTextColor={DISABLED_TEXT_GRAY}
          />
          <Text style={styles.charCount}>
            Caracteres: {notes.length}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveAndGoBack}
        >
          <Text style={styles.saveButtonText}>Guardar Notas</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: PRIMARY_BLUE_SOFT,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: DARK_BLUE,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
    paddingLeft: 20,
    paddingRight: 20,
    height: 150,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 50 : 50,
    justifyContent: 'flex-start',
  },
  backButton: {
    position: 'absolute',
    left: 10,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
    padding: 5,
  },
  backButtonText: {
    color: TEXT_LIGHT,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 50,
    lineHeight: 30,
  },
  card: {
    backgroundColor: LIGHT_GRAY_BACKGROUND,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
    marginTop: 30,
  },
  sectionDescription: {
    fontSize: 16,
    color: TEXT_DARK,
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  notesInput: {
    minHeight: 150,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: TEXT_DARK,
    backgroundColor: TEXT_LIGHT,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 14,
    color: TEXT_DARK,
    marginTop: 10,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: ACCENT_BLUE,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: 'rgba(0,0,0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    elevation: 4,
  },
  saveButtonText: {
    color: TEXT_LIGHT,
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default VisitSummaryScreen;