import {
  TabList,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { BrandColors } from '@/constants/theme';

const TAB_ICONS = {
  home: 'home-outline',
  products: 'basket-outline',
  shoppingList: 'cart-outline',
  stores: 'map-outline',
  chat: 'chatbubbles-outline',
  budget: 'wallet-outline',
  account: 'person-circle-outline',
} as const;

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isComercio } = useAuth();

  const bottomInset = Math.max(insets.bottom, 8);
  const labelFontSize = width < 360 ? 9 : 10;
  const tabListStyle = StyleSheet.flatten([
    styles.tabList,
    { height: 59 + bottomInset, paddingBottom: bottomInset },
  ]);

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList style={tabListStyle}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton label="Inicio" icon={TAB_ICONS.home} labelFontSize={labelFontSize} />
        </TabTrigger>
        <TabTrigger name="products" href="/productos" asChild>
          <TabButton label="Productos" icon={TAB_ICONS.products} labelFontSize={labelFontSize} />
        </TabTrigger>
        <TabTrigger name="shopping-list" href="/lista-compra" asChild>
          <TabButton label="Lista" icon={TAB_ICONS.shoppingList} labelFontSize={labelFontSize} />
        </TabTrigger>
        <TabTrigger name="stores" href="/mapa-tiendas" asChild>
          <TabButton label="Tiendas" icon={TAB_ICONS.stores} labelFontSize={labelFontSize} />
        </TabTrigger>
        <TabTrigger name="chat" href="/chat" asChild>
          <TabButton label="Chat IA" icon={TAB_ICONS.chat} labelFontSize={labelFontSize} />
        </TabTrigger>
        <TabTrigger name="budget" href="/presupuesto" asChild>
          {isComercio
            ? <TabButton label="Ventas" icon={TAB_ICONS.budget} labelFontSize={labelFontSize} />
            : <TabButton label="Saldo" icon={TAB_ICONS.budget} labelFontSize={labelFontSize} />}
        </TabTrigger>
        <TabTrigger name="account" href="/cuenta" asChild>
          <TabButton label="Cuenta" icon={TAB_ICONS.account} labelFontSize={labelFontSize} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  label: string;
  icon: (typeof TAB_ICONS)[keyof typeof TAB_ICONS];
  labelFontSize: number;
}

function TabButton({ label, icon, labelFontSize, isFocused, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityHint={`Abre la sección ${label}`}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        isFocused && styles.selectedTab,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconWrap, isFocused && styles.selectedIconWrap]}>
        <Ionicons name={icon} size={21} color={isFocused ? BrandColors.primary : BrandColors.muted} />
      </View>
      <Text style={[styles.label, { fontSize: labelFontSize }, isFocused && styles.selectedLabel]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  tabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 0,
    marginHorizontal: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
    paddingTop: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.surface,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 13,
    paddingHorizontal: 1,
    paddingVertical: 4,
  },
  selectedTab: {
    backgroundColor: BrandColors.primarySoft,
  },
  iconWrap: {
    width: 32,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  selectedIconWrap: {
    backgroundColor: '#dcebd8',
  },
  label: {
    color: BrandColors.muted,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
  selectedLabel: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
