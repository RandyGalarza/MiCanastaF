import { Alert, Platform } from 'react-native';

export function mostrarAlerta(
  titulo: string,
  mensaje: string,
  botones?: { text: string; onPress?: () => void }[]
) {
  if (Platform.OS === 'web') {
    if (botones && botones.length > 0) {
      window.alert(`${titulo}\n\n${mensaje}`);
      // Ejecutar la acción del botón de confirmación/continuar en Web
      const accionPrincipal = botones[botones.length - 1];
      if (accionPrincipal && accionPrincipal.onPress) {
        accionPrincipal.onPress();
      }
    } else {
      window.alert(`${titulo}\n\n${mensaje}`);
    }
  } else {
    Alert.alert(titulo, mensaje, botones);
  }
}
