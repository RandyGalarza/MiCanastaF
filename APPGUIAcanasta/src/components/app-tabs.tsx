import {
  TabList,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS = {
  home: 'home-outline',
  products: 'basket-outline',
  shoppingList: 'cart-outline',
  budget: 'wallet-outline',
  account: 'person-circle-outline',
} as const;

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.tabList, { paddingBottom: Math.max(insets.bottom, 8) }])}>
          <TabTrigger name="home" href="/" asChild>
            <TabButton label="Inicio" icon={TAB_ICONS.home} />
          </TabTrigger>
          <TabTrigger name="products" href="/productos" asChild>
            <TabButton label="Productos" icon={TAB_ICONS.products} />
          </TabTrigger>
          <TabTrigger name="shopping-list" href="/lista-compra" asChild>
            <TabButton label="Lista" icon={TAB_ICONS.shoppingList} />
          </TabTrigger>
          <TabTrigger name="budget" href="/presupuesto" asChild>
            <TabButton label="Presupuesto" icon={TAB_ICONS.budget} />
          </TabTrigger>
          <TabTrigger name="account" href="/cuenta" asChild>
            <TabButton label="Cuenta" icon={TAB_ICONS.account} />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  label: string;
  icon: (typeof TAB_ICONS)[keyof typeof TAB_ICONS];
}

function TabButton({ label, icon, isFocused, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        isFocused && styles.selectedTab,
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={20} color={isFocused ? '#16a34a' : '#64748b'} />
      <Text style={[styles.label, isFocused && styles.selectedLabel]} numberOfLines={1}>
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
    justifyContent: 'space-around',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 12,
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
  selectedTab: {
    backgroundColor: '#dcfce7',
  },
  label: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedLabel: {
    color: '#14532d',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
