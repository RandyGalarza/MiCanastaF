import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { getProductPhoto } from '@/utils/product-photos';

type ProductImageProps = {
  productName: string;
  imageUrl?: string | null;
  fallback: ReactNode;
  style: StyleProp<ViewStyle>;
};

export function ProductImage({ productName, imageUrl, fallback, style }: ProductImageProps) {
  const photo = imageUrl ? undefined : getProductPhoto(productName);
  const imageUri = imageUrl || photo?.uri;
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [creditVisible, setCreditVisible] = useState(false);
  const imageFailed = imageUri !== undefined && failedUri === imageUri;

  const openSource = async () => {
    if (!photo) return;
    try {
      await Linking.openURL(photo.sourceUrl);
    } catch (error) {
      console.error('No se pudo abrir la fuente de la foto:', error);
      Alert.alert('No se pudo abrir la fuente', 'Intenta abrir de nuevo el enlace a Wikimedia Commons.');
    }
  };

  return (
    <>
      <Pressable
        onPress={photo ? () => setCreditVisible(true) : undefined}
        style={[style, styles.imageFrame]}
        accessibilityRole={photo ? 'button' : 'image'}
        accessibilityLabel={photo ? `Ver crédito de la foto de ${productName}` : productName}
      >
        {imageUri && !imageFailed ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
            onError={() => setFailedUri(imageUri)}
          />
        ) : (
          <View style={styles.fallback}>{fallback}</View>
        )}
        {photo && !imageFailed ? (
          <View style={styles.creditBadge}>
            <Ionicons name="information-circle" size={15} color="#ffffff" />
          </View>
        ) : null}
      </Pressable>

      {photo ? (
        <Modal
          visible={creditVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreditVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setCreditVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar créditos de la foto"
            />
            <View style={styles.creditCard}>
              <View style={styles.creditHeading}>
                <View style={styles.creditIcon}>
                  <Ionicons name="image-outline" size={20} color="#15803d" />
                </View>
                <Text style={styles.creditTitle}>Crédito de la foto</Text>
                <Pressable
                  onPress={() => setCreditVisible(false)}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </Pressable>
              </View>
              <Text style={styles.creditProduct}>{productName} · imagen ilustrativa</Text>
              <Text style={styles.creditText}>Autor: {photo.author}</Text>
              <Text style={styles.creditText}>Licencia: {photo.license}</Text>
              <Pressable onPress={() => void openSource()} style={styles.sourceButton} accessibilityRole="link">
                <Text style={styles.sourceButtonText}>Ver foto original y licencia en Wikimedia Commons</Text>
                <Ionicons name="open-outline" size={16} color="#15803d" />
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  imageFrame: {
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  creditCard: {
    gap: 10,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  creditHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creditIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#dcfce7',
  },
  creditTitle: {
    flex: 1,
    color: '#14532d',
    fontSize: 16,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  creditProduct: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  creditText: {
    color: '#64748b',
    fontSize: 12,
  },
  sourceButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
  },
  sourceButtonText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
});
