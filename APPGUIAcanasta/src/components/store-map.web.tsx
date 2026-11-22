import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export function StoreMap() {
  return <View style={styles.container}><Ionicons name="map-outline" size={38} color="#168344"/><Text style={styles.title}>Mapa disponible en la aplicación móvil</Text><Text style={styles.body}>En web puedes consultar la lista de comercios y sus precios.</Text></View>;
}

const styles = StyleSheet.create({ container: { flex: 1, margin: 16, borderRadius: 20, backgroundColor: '#e8f0e8', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 25 }, title: { color: '#14532d', fontSize: 15, fontWeight: '800', textAlign: 'center' }, body: { color: '#718076', fontSize: 11, textAlign: 'center' } });
