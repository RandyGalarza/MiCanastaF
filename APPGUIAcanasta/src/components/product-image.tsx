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
import { getVerifiedProductImage } from '@/utils/product-images';

type ProductImageProps = {
  productName: string;
  brand?: string | null;
  sizeLabel?: string | null;
  imageUrl?: string | null;
  fallback: ReactNode;
  style: StyleProp<ViewStyle>;
};

export function ProductImage({ productName, brand, sizeLabel, imageUrl, fallback, style }: ProductImageProps) {
  const isCatalogIllustration = !imageUrl || imageUrl.startsWith('catalog:');
  const illustration = getProductIllustration(productName);
  const exactProductImage = getVerifiedProductImage(productName, brand);
  const photo = imageUrl ? undefined : getProductPhoto(productName);
  const imageUri = imageUrl || photo?.uri;
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [exactImageFailed, setExactImageFailed] = useState(false);
  const [creditVisible, setCreditVisible] = useState(false);
  const imageFailed = imageUri !== undefined && failedUri === imageUri;
  const fallbackPhoto = imageUrl ? getProductPhoto(productName) : undefined;
  const displayedUri = imageFailed ? fallbackPhoto?.uri : imageUri;
  const displayedPhoto = imageFailed ? fallbackPhoto : photo;

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
        onPress={displayedPhoto ? () => setCreditVisible(true) : undefined}
        style={[style, styles.imageFrame]}
        accessibilityRole={displayedPhoto ? 'button' : 'image'}
        accessibilityLabel={displayedPhoto ? `Ver crédito de la foto de ${productName}` : productName}
      >
        {exactProductImage && !exactImageFailed ? (
          <Image source={{ uri: exactProductImage }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" onError={() => setExactImageFailed(true)} />
        ) : isCatalogIllustration || imageFailed ? (
          <View style={[styles.productIllustration, { backgroundColor: illustration.background }]}>
            <View style={[
              styles.mockPackage,
              { backgroundColor: illustration.packageColor },
              /aceite|aceituna|vinagre|detergente l[ií]quido|lavaloza|champ[uú]/i.test(productName) && styles.mockBottle,
            ]}>
              {/aceite|aceituna|vinagre|detergente l[ií]quido|lavaloza|champ[uú]/i.test(productName) ? <View style={styles.mockCap} /> : null}
              <Text style={styles.mockBrand} numberOfLines={1}>{brand || 'Genérico'}</Text>
              <Text style={styles.productEmoji} accessibilityLabel={productName}>{illustration.emoji}</Text>
              <Text style={styles.mockName} numberOfLines={2}>{shortProductName(productName)}</Text>
              {productSize(productName, sizeLabel) ? <Text style={styles.mockSize} numberOfLines={1}>{productSize(productName, sizeLabel)}</Text> : null}
            </View>
          </View>
        ) : displayedUri ? (
          <Image
            source={{ uri: displayedUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
            onError={() => {
              if (displayedUri === imageUri) setFailedUri(imageUri);
            }}
          />
        ) : (
          <View style={styles.fallback}>{fallback}</View>
        )}
        {displayedPhoto ? (
          <View style={styles.creditBadge}>
            <Ionicons name="information-circle" size={15} color="#ffffff" />
          </View>
        ) : null}
      </Pressable>

      {displayedPhoto ? (
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
              {displayedPhoto ? (
                <>
                  <Text style={styles.creditProduct}>{productName} · imagen ilustrativa</Text>
                  <Text style={styles.creditText}>Autor: {displayedPhoto.author}</Text>
                  <Text style={styles.creditText}>Licencia: {displayedPhoto.license}</Text>
                  <Pressable onPress={() => void openSource()} style={styles.sourceButton} accessibilityRole="link">
                    <Text style={styles.sourceButtonText}>Ver foto original y licencia en Wikimedia Commons</Text>
                    <Ionicons name="open-outline" size={16} color="#15803d" />
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function getProductIllustration(name: string): { emoji: string; background: string; packageColor: string } {
  const text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const products: [RegExp, string, string, string][] = [
    [/arroz|frijol|lenteja|garbanzo|arveja|grano/, '🫘', '#fff7ed', '#f8fafc'],
    [/pasta|espagueti|macarron/, '🍝', '#fff7ed', '#fef3c7'],
    [/avena|cereal|granola/, '🥣', '#fefce8', '#fef9c3'],
    [/harina|panela|azucar/, '🌾', '#fefce8', '#fffbeb'],
    [/pan\b|arepa|galleta|brownie/, '🍞', '#fff7ed', '#fed7aa'],
    [/leche|queso|yog|suero|crema|mantequilla/, '🧀', '#fffbeb', '#fef3c7'],
    [/huevo/, '🥚', '#fffbeb', '#fff7ed'],
    [/carne|res|cerdo|molida/, '🥩', '#fef2f2', '#fecaca'],
    [/pollo|gallina/, '🍗', '#fff7ed', '#ffedd5'],
    [/pescado|atun/, '🐟', '#eff6ff', '#bfdbfe'],
    [/salchicha|jamon|chorizo|mortadela|salchichon|tocino/, '🥓', '#fef2f2', '#fecaca'],
    [/naranja|mandarina|limon|maracuya/, '🍊', '#fff7ed', '#fed7aa'],
    [/banano|platano/, '🍌', '#fefce8', '#fef08a'],
    [/manzana/, '🍎', '#fef2f2', '#fecaca'],
    [/mango|papaya|guayaba|lulo|mora|uva|fresa|pina|aguacate|fruta/, '🍍', '#f0fdf4', '#bbf7d0'],
    [/tomate/, '🍅', '#fef2f2', '#fecaca'],
    [/papa|yuca|name|arracacha/, '🥔', '#fefce8', '#fde68a'],
    [/cebolla|ajo|lechuga|verdura|ahuyama|mazorca/, '🥬', '#f0fdf4', '#bbf7d0'],
    [/aceite/, '🫒', '#f0fdf4', '#fef3c7'],
    [/cafe/, '☕', '#f5f5f4', '#d6d3d1'],
    [/cerveza|vino|ron|aguardiente|whisky|tequila/, '🍾', '#f0fdf4', '#bbf7d0'],
    [/jugo|bebida|gaseosa|agua/, '🧃', '#eff6ff', '#bfdbfe'],
    [/jab[oó]n|champ[uú]|desodorante|perfume|crema de belleza/, '🧴', '#fdf2f8', '#fbcfe8'],
    [/dental|cepillo/, '🪥', '#eff6ff', '#bfdbfe'],
    [/papel higienico|toalla higienica|panal/, '🧻', '#f8fafc', '#e2e8f0'],
    [/detergente|limpiador|suavizante|lavaplatos|desinfectante|aseo/, '🧼', '#eff6ff', '#bfdbfe'],
    [/perro|gato|mascota|arena sanitaria/, '🐾', '#fefce8', '#fde68a'],
    [/nevera|lavadora|estufa|microondas|licuadora|plancha|televisor|computador|celular|vehiculo|motocicleta|bicicleta/, '🛒', '#f1f5f9', '#cbd5e1'],
  ];
  const match = products.find(([pattern]) => pattern.test(text));
  return match ? { emoji: match[1], background: match[2], packageColor: match[3] } : { emoji: '🛍️', background: '#f0fdf4', packageColor: '#dcfce7' };
}

function shortProductName(name: string): string {
  return name.replace(/\b\d+(?:[.,]\d+)?\s?(?:ml|l|g|kg)\b/gi, '').trim();
}

function productSize(name: string, unit?: string | null): string | null {
  return name.match(/\b\d+(?:[.,]\d+)?\s?(?:ml|l|g|kg)\b/i)?.[0] ?? unit ?? null;
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
  productIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockPackage: {
    width: 54,
    height: 76,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.12)',
  },
  mockBottle: { width: 38, height: 76, borderRadius: 9, paddingTop: 8 },
  mockCap: { position: 'absolute', top: -4, width: 13, height: 7, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: '#334155' },
  mockBrand: { maxWidth: '100%', color: '#14532d', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  mockName: { color: '#334155', fontSize: 6, lineHeight: 7, fontWeight: '700', textAlign: 'center' },
  mockSize: { marginTop: 1, color: '#64748b', fontSize: 5, fontWeight: '700' },
  productEmoji: {
    fontSize: 40,
    lineHeight: 52,
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
