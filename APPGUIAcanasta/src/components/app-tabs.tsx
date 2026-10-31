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
import { useAuth } from '@/contexts/auth-context';

const TAB_ICONS = {
  home: 'home-outline',
  products: 'basket-outline',
  shoppingList: 'cart-outline',
  chat: 'chatbubbles-outline',
  budget: 'wallet-outline',
  admin: 'shield-outline',
  account: 'person-circle-outline',
} as const;

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { isAdmin, isComercio } = useAuth();

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
          <TabTrigger name="chat" href="/chat" asChild>
            <TabButton label="Chat IA" icon={TAB_ICONS.chat} />
          </TabTrigger>
          <TabTrigger name="budget" href="/presupuesto" asChild>
            {isComercio
              ? <TabButton label="Ventas" icon={TAB_ICONS.budget} />
              : <Pressable style={styles.hiddenTabTrigger} />}
          </TabTrigger>
          {isAdmin && (
            <TabTrigger name="admin" href={'/admin' as any} asChild>
              <TabButton label="Admin" icon={TAB_ICONS.admin} />
            </TabTrigger>
          )}
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
      <View style={[styles.iconWrap, isFocused && styles.selectedIconWrap]}>
        <Ionicons name={icon} size={19} color={isFocused ? '#168344' : '#718076'} />
      </View>
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
  hiddenTabTrigger: {
    display: 'none',
  },
  tabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 4,
    marginHorizontal: 12,
    marginBottom: 5,
    paddingTop: 7,
    paddingHorizontal: 7,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e7ece7',
    boxShadow: '0px 4px 16px rgba(31, 56, 38, 0.10)',
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 16,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  selectedTab: {
    backgroundColor: '#f0f7ef',
  },
  iconWrap: {
    width: 30,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  selectedIconWrap: {
    backgroundColor: '#e0f0df',
  },
  label: {
    color: '#718076',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedLabel: {
    color: '#23663a',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
