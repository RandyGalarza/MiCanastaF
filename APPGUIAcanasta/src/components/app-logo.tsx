import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

const LOGO_SOURCE = require('../../assets/images/logo-mi-canasta.svg');

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = 42, style }: AppLogoProps) {
  return (
    <Image
      source={LOGO_SOURCE}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessibilityLabel="Logo de Mi Canasta Familiar"
    />
  );
}
