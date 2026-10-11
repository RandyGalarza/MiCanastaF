import { StyleSheet, Text, View } from 'react-native';

export function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>¡Bienvenido a Mi Canasta Familiar!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    color: '#1a253c',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
});
