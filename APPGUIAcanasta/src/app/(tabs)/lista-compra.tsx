import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { agregarProductoALista, actualizarCantidadItem, crearListaCompra, eliminarListaCompra, marcarItemComprado, obtenerItemsLista, obtenerListasCompra, ItemListaCompra } from '@/repositories/listacompraRepository';
import {
  crearReferenciaPagoDemostracion,
  obtenerPagosPendientes,
  obtenerSaldoUsuario,
  pagarCompraConSaldo,
  simularPagoReferencia,
} from '@/repositories/compraRepository';
import type { PagoPendiente } from '@/repositories/compraRepository';
import { obtenerProductos } from '@/repositories/productoRepository';
import { ListaCompra, Producto } from '@/types/database';
import { displayPrice, getDemoDiscount } from '@/utils/demo-prices';
import { ProductImage } from '@/components/product-image';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;

export default function ListaCompraScreen() {
  const { user } = useAuth();
  const [lists, setLists] = useState<ListaCompra[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [items, setItems] = useState<ItemListaCompra[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [newListName, setNewListName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentError, setPaymentError] = useState('');
  const [pendingPayments, setPendingPayments] = useState<PagoPendiente[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PagoPendiente | null>(null);

  const loadLists = useCallback(async () => {
    if (!user) {
      setLists([]);
      setItems([]);
      setSelectedListId(null);
      setPendingPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [userLists, catalog, userPendingPayments] = await Promise.all([
        obtenerListasCompra(user.id_usuario),
        obtenerProductos(),
        obtenerPagosPendientes(user.id_usuario),
      ]);
      setLists(userLists);
      setProducts(catalog.filter((product) => product.pro_estado === 1));
      setPendingPayments(userPendingPayments);
      const nextId = userLists.some((list) => list.id_lista === selectedListId)
        ? selectedListId
        : userLists[0]?.id_lista ?? null;
      setSelectedListId(nextId);
      if (nextId !== null) setItems(await obtenerItemsLista(nextId));
      else setItems([]);
    } catch (err) {
      console.error('No se pudieron cargar las listas:', err);
      setError('No se pudieron cargar tus listas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedListId]);

  useFocusEffect(useCallback(() => { void loadLists(); }, [loadLists]));

  const selectList = async (listId: number) => {
    setSelectedListId(listId);
    setError('');
    try {
      setItems(await obtenerItemsLista(listId));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los productos de esta lista.');
    }
  };

  const createList = async () => {
    const name = newListName.trim();
    if (!user || !name || saving) return;
    setSaving(true);
    setError('');
    try {
      const id = await crearListaCompra(user.id_usuario, name);
      setNewListName('');
      const userLists = await obtenerListasCompra(user.id_usuario);
      setLists(userLists);
      setSelectedListId(id);
      setItems([]);
    } catch (err) {
      console.error(err);
      setError('No se pudo crear la lista. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const addProduct = async (productId: number) => {
    if (selectedListId === null || saving) return;
    setSaving(true);
    try {
      await agregarProductoALista(selectedListId, productId);
      setItems(await obtenerItemsLista(selectedListId));
    } catch (err) {
      console.error(err);
      setError('No se pudo agregar el producto a la lista.');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (item: ItemListaCompra, changes: { quantity?: number; checked?: boolean }) => {
    try {
      if (changes.quantity !== undefined) await actualizarCantidadItem(item.id_detalle, changes.quantity);
      if (changes.checked !== undefined) await marcarItemComprado(item.id_detalle, changes.checked);
      if (selectedListId !== null) setItems(await obtenerItemsLista(selectedListId));
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el producto.');
    }
  };

  const startCheckout = async () => {
    if (!user || selectedListId === null || saving) return;
    setPaymentError('');
    setSelectedPayment(null);
    try {
      setWalletBalance(await obtenerSaldoUsuario(user.id_usuario));
      setPaymentModalVisible(true);
    } catch (err) {
      console.error('No se pudo consultar la billetera:', err);
      setError('No se pudo consultar el saldo. Intenta de nuevo.');
    }
  };

  const getSelectedListName = () => lists.find((list) => list.id_lista === selectedListId)?.nombre;

  const payWithWallet = async () => {
    if (!user || selectedListId === null || saving) return;
    setSaving(true);
    setPaymentError('');
    try {
      const listName = getSelectedListName();
      if (!listName) throw new Error('Selecciona una lista válida para continuar.');
      const purchaseId = await pagarCompraConSaldo(user.id_usuario, selectedListId, listName, items);
      setPaymentModalVisible(false);
      router.push({ pathname: '/factura/[id]', params: { id: String(purchaseId) } });
    } catch (err) {
      console.error('No se pudo pagar con saldo:', err);
      setPaymentError(err instanceof Error ? err.message : 'No se pudo completar el pago con saldo.');
    } finally {
      setSaving(false);
    }
  };

  const createTestReference = async () => {
    if (!user || selectedListId === null || saving) return;
    setSaving(true);
    setPaymentError('');
    try {
      const listName = getSelectedListName();
      if (!listName) throw new Error('Selecciona una lista válida para continuar.');
      const payment = await crearReferenciaPagoDemostracion(user.id_usuario, selectedListId, listName, items);
      setPendingPayments((current) => [payment, ...current]);
      setSelectedPayment(payment);
    } catch (err) {
      console.error('No se pudo crear la referencia de prueba:', err);
      setPaymentError(err instanceof Error ? err.message : 'No se pudo crear la referencia de prueba.');
    } finally {
      setSaving(false);
    }
  };

  const continuePendingPayment = (payment: PagoPendiente) => {
    setPaymentError('');
    setSelectedPayment(payment);
    setPaymentModalVisible(true);
  };

  const confirmTestPayment = async () => {
    if (!user || !selectedPayment || saving) return;
    setSaving(true);
    setPaymentError('');
    try {
      const purchaseId = await simularPagoReferencia(selectedPayment.id_pago, user.id_usuario);
      setPaymentModalVisible(false);
      setSelectedPayment(null);
      await loadLists();
      router.push({ pathname: '/factura/[id]', params: { id: String(purchaseId) } });
    } catch (err) {
      console.error('No se pudo completar el pago de prueba:', err);
      setPaymentError(err instanceof Error ? err.message : 'No se pudo completar el pago de prueba.');
    } finally {
      setSaving(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setSelectedPayment(null);
    setPaymentError('');
  };

  const removeCurrentList = async () => {
    if (selectedListId === null || lists.length < 2) return;
    try {
      await eliminarListaCompra(selectedListId);
      const remaining = await obtenerListasCompra(user!.id_usuario);
      setLists(remaining);
      setSelectedListId(remaining[0]?.id_lista ?? null);
      setItems(remaining[0] ? await obtenerItemsLista(remaining[0].id_lista) : []);
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar la lista.');
    }
  };

  const checkedCount = items.filter((item) => item.comprado === 1).length;
  const total = items.reduce((sum, item) => sum + (displayPrice(item.nombre, item.precio) || 0) * Number(item.cantidad), 0);
  const checkedTotal = items
    .filter((item) => item.comprado === 1)
    .reduce((sum, item) => sum + (displayPrice(item.nombre, item.precio) || 0) * Number(item.cantidad), 0);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const alreadyInList = new Set(items.map((item) => item.id_producto));
    return products
      .filter((product) => !alreadyInList.has(product.id_producto))
      .filter((product) => !query || `${product.nombre} ${product.marca || ''}`.toLocaleLowerCase().includes(query))
      .slice(0, 30);
  }, [products, items, search]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIcon}><Ionicons name="person-outline" size={28} color="#16a34a" /></View>
        <Text style={styles.headingTitle}>Tus listas te esperan</Text>
        <Text style={styles.mutedText}>Inicia sesión para crear y guardar listas de compra en tu cuenta.</Text>
        <Link href="/login" style={styles.loginButton}>Iniciar sesión</Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="cart" size={24} color="#15803d" /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.headingTitle}>Lista de compra</Text>
          <Text style={styles.mutedText}>Tus listas guardadas en tu cuenta</Text>
        </View>
        <Pressable onPress={() => router.push('/historial-compras')} style={styles.historyButton} accessibilityRole="button">
          <Ionicons name="receipt-outline" size={17} color="#166534" />
          <Text style={styles.historyButtonText}>Historial</Text>
        </Pressable>
      </View>

      <View style={styles.createCard}>
        <Text style={styles.sectionTitle}>Crear una lista</Text>
        <View style={styles.createRow}>
          <TextInput value={newListName} onChangeText={setNewListName} placeholder="Ej. Mercado de la semana" placeholderTextColor="#94a3b8" style={styles.input} maxLength={60} returnKeyType="done" onSubmitEditing={createList} />
          <Pressable onPress={createList} disabled={!newListName.trim() || saving} style={[styles.createButton, (!newListName.trim() || saving) && styles.disabledButton]}>
            {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="add" size={22} color="#ffffff" />}
          </Pressable>
        </View>
      </View>

      {error ? <View style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={17} color="#b91c1c" /><Text style={styles.errorText}>{error}</Text></View> : null}
      {pendingPayments.length > 0 && (
        <View style={styles.pendingPaymentsCard}>
          <View style={styles.pendingPaymentsHeading}>
            <Ionicons name="time-outline" size={18} color="#a16207" />
            <Text style={styles.pendingPaymentsTitle}>Referencias de prueba pendientes</Text>
          </View>
          {pendingPayments.map((payment) => (
            <View key={payment.id_pago} style={styles.pendingPaymentRow}>
              <View style={styles.pendingPaymentCopy}>
                <Text style={styles.pendingPaymentName}>{payment.nombre_lista} · {currency(payment.total)}</Text>
                <Text style={styles.pendingPaymentReference}>{payment.referencia}</Text>
              </View>
              <Pressable
                onPress={() => continuePendingPayment(payment)}
                style={styles.pendingPaymentButton}
                accessibilityRole="button"
                accessibilityLabel={`Continuar pago de prueba ${payment.referencia}`}
              >
                <Text style={styles.pendingPaymentButtonText}>Continuar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingCard}><ActivityIndicator color="#16a34a" /><Text style={styles.mutedText}>Cargando tus listas…</Text></View>
      ) : lists.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="list-outline" size={27} color="#16a34a" /></View>
          <Text style={styles.cardTitle}>Aún no tienes listas</Text>
          <Text style={styles.mutedText}>Crea tu primera lista arriba y agrega productos del catálogo.</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listPicker}>
            {lists.map((list) => (
              <Pressable key={list.id_lista} onPress={() => void selectList(list.id_lista)} style={[styles.listChip, selectedListId === list.id_lista && styles.listChipSelected]}>
                <Ionicons name="list-outline" size={15} color={selectedListId === list.id_lista ? '#166534' : '#64748b'} />
                <Text numberOfLines={1} style={[styles.listChipText, selectedListId === list.id_lista && styles.listChipTextSelected]}>{list.nombre}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderCopy}>
                <Text style={styles.listTitle}>{lists.find((list) => list.id_lista === selectedListId)?.nombre}</Text>
                <Text style={styles.listSubtitle}>{checkedCount} de {items.length} productos marcados</Text>
              </View>
              {lists.length > 1 && <Pressable onPress={() => void removeCurrentList()} accessibilityRole="button" accessibilityLabel="Eliminar esta lista" style={styles.deleteButton}><Ionicons name="trash-outline" size={18} color="#b91c1c" /></Pressable>}
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${items.length ? checkedCount / items.length * 100 : 0}%` }]} /></View>

            {items.length === 0 ? (
              <View style={styles.emptyList}><Ionicons name="basket-outline" size={25} color="#94a3b8" /><Text style={styles.mutedText}>Esta lista está vacía. Busca productos abajo para agregarlos.</Text></View>
            ) : items.map((item) => (
              <View key={item.id_detalle} style={styles.itemRow}>
                <Pressable onPress={() => void updateItem(item, { checked: item.comprado !== 1 })} style={[styles.checkbox, item.comprado === 1 && styles.checkboxChecked]} accessibilityRole="checkbox" accessibilityState={{ checked: item.comprado === 1 }}>
                  {item.comprado === 1 && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                </Pressable>
                <ProductImage
                  productName={item.nombre}
                  style={styles.productIcon}
                  fallback={<Ionicons name="basket-outline" size={19} color="#16a34a" />}
                />
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemName, item.comprado === 1 && styles.itemPurchased]}>{item.nombre}</Text>
                  <Text style={styles.itemDetail}>{displayPrice(item.nombre, item.precio) === null ? 'Precio por consultar' : currency((displayPrice(item.nombre, item.precio) || 0) * Number(item.cantidad))} · {item.unidad_medida}{item.nombre_comercio ? ` · ${item.nombre_comercio}` : ''}</Text>
                </View>
                <View style={styles.quantityControl}>
                  <Pressable onPress={() => void updateItem(item, { quantity: Number(item.cantidad) - 1 })} style={styles.quantityButton}><Ionicons name="remove" size={16} color="#166534" /></Pressable>
                  <Text style={styles.quantity}>{item.cantidad}</Text>
                  <Pressable onPress={() => void updateItem(item, { quantity: Number(item.cantidad) + 1 })} style={styles.quantityButton}><Ionicons name="add" size={16} color="#166534" /></Pressable>
                </View>
              </View>
            ))}
            <View style={styles.totalRow}><Ionicons name="calculator-outline" size={18} color="#15803d" /><Text style={styles.totalLabel}>Estimado según precios disponibles</Text><Text style={styles.totalValue}>{currency(total)}</Text></View>
            <Pressable
              onPress={() => void startCheckout()}
              disabled={checkedCount === 0 || saving}
              style={[styles.purchaseButton, (checkedCount === 0 || saving) && styles.disabledButton]}
              accessibilityRole="button"
              accessibilityLabel={`Elegir cómo pagar ${checkedCount} productos marcados`}>
              {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="card-outline" size={18} color="#ffffff" />}
              <Text style={styles.purchaseButtonText}>{saving ? 'Preparando pago…' : `Elegir cómo pagar (${checkedCount})`}</Text>
            </Pressable>
            <Text style={styles.purchaseHint}>Se cobrarán solo los productos marcados, con los precios de referencia del catálogo.</Text>
          </View>

          <View style={styles.catalogHeader}>
            <View><Text style={styles.sectionTitle}>Agregar productos</Text><Text style={styles.catalogSubtitle}>Elige artículos del catálogo para esta lista</Text></View>
          </View>
          <View style={styles.searchBox}><Ionicons name="search-outline" size={18} color="#64748b" /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar producto o marca" placeholderTextColor="#94a3b8" style={styles.searchInput} /></View>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProducts}><Text style={styles.mutedText}>{search ? 'No hay coincidencias en el catálogo.' : 'Ya agregaste todos los productos disponibles.'}</Text></View>
          ) : filteredProducts.map((product) => <ProductRow key={product.id_producto} product={product} onAdd={() => void addProduct(product.id_producto)} disabled={saving} />)}
        </>
      )}
      <PaymentMethodModal
        visible={paymentModalVisible}
        total={selectedPayment?.total ?? checkedTotal}
        balance={walletBalance}
        pendingPayment={selectedPayment}
        error={paymentError}
        saving={saving}
        onClose={closePaymentModal}
        onPayWithWallet={() => void payWithWallet()}
        onCreateReference={() => void createTestReference()}
        onConfirmTestPayment={() => void confirmTestPayment()}
        onGoToBudget={() => {
          closePaymentModal();
          router.push('/presupuesto');
        }}
      />
    </ScrollView>
  );
}

function PaymentMethodModal({
  visible,
  total,
  balance,
  pendingPayment,
  error,
  saving,
  onClose,
  onPayWithWallet,
  onCreateReference,
  onConfirmTestPayment,
  onGoToBudget,
}: {
  visible: boolean;
  total: number;
  balance: number;
  pendingPayment: PagoPendiente | null;
  error: string;
  saving: boolean;
  onClose: () => void;
  onPayWithWallet: () => void;
  onCreateReference: () => void;
  onConfirmTestPayment: () => void;
  onGoToBudget: () => void;
}) {
  const insufficientBalance = balance < total;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.paymentBackdrop}>
        <View style={styles.paymentModal}>
          <View style={styles.paymentModalHeader}>
            <View style={styles.paymentModalIcon}><Ionicons name={pendingPayment ? 'receipt-outline' : 'card-outline'} size={21} color="#168344" /></View>
            <View style={styles.paymentModalHeading}>
              <Text style={styles.paymentModalTitle}>{pendingPayment ? 'Referencia de prueba' : 'Elige cómo pagar'}</Text>
              <Text style={styles.mutedText}>Total: {currency(total)}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.paymentClose} accessibilityRole="button" accessibilityLabel="Cerrar opciones de pago">
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          {pendingPayment ? (
            <>
              <View style={styles.referenceBox}>
                <Text style={styles.referenceLabel}>REFERENCIA SIMULADA</Text>
                <Text selectable style={styles.referenceValue}>{pendingPayment.referencia}</Text>
                <Text style={styles.paymentDisclaimer}>No es una referencia bancaria ni permite pagar en un punto físico. Solo sirve para probar el flujo de la aplicación.</Text>
              </View>
              <Pressable onPress={onConfirmTestPayment} disabled={saving} style={[styles.walletPayButton, saving && styles.disabledButton]} accessibilityRole="button">
                {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark-circle-outline" size={19} color="#ffffff" />}
                <Text style={styles.walletPayText}>{saving ? 'Confirmando…' : 'Simular pago recibido'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.walletOption}>
                <View style={styles.walletOptionTop}>
                  <View style={styles.walletOptionIcon}><Ionicons name="wallet-outline" size={20} color="#168344" /></View>
                  <View style={styles.walletOptionCopy}>
                    <Text style={styles.walletOptionTitle}>Saldo de la app</Text>
                    <Text style={styles.walletOptionBalance}>{currency(balance)} disponibles</Text>
                  </View>
                </View>
                {insufficientBalance ? (
                  <Pressable onPress={onGoToBudget} style={styles.topUpLink} accessibilityRole="button">
                    <Text style={styles.topUpLinkText}>Saldo insuficiente · Recargar saldo de prueba</Text>
                    <Ionicons name="chevron-forward" size={16} color="#168344" />
                  </Pressable>
                ) : (
                  <Pressable onPress={onPayWithWallet} disabled={saving} style={[styles.walletPayButton, saving && styles.disabledButton]} accessibilityRole="button">
                    {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="lock-closed-outline" size={17} color="#ffffff" />}
                    <Text style={styles.walletPayText}>Pagar {currency(total)}</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.paymentDivider}><View style={styles.paymentDividerLine} /><Text style={styles.paymentDividerText}>O</Text><View style={styles.paymentDividerLine} /></View>
              <Pressable onPress={onCreateReference} disabled={saving} style={[styles.referenceButton, saving && styles.disabledButton]} accessibilityRole="button">
                <Ionicons name="document-text-outline" size={18} color="#166534" />
                <View style={styles.referenceButtonCopy}>
                  <Text style={styles.referenceButtonTitle}>Referencia para pago presencial</Text>
                  <Text style={styles.referenceButtonSubtitle}>Genera una referencia demostrativa</Text>
                </View>
                {saving ? <ActivityIndicator size="small" color="#168344" /> : <Ionicons name="chevron-forward" size={17} color="#64748b" />}
              </Pressable>
              <Text style={styles.paymentDisclaimer}>Prototipo: las recargas, el saldo y la referencia son simulados. No se mueve dinero real ni se confirma un pago bancario.</Text>
            </>
          )}

          {error ? <View style={styles.paymentError}><Ionicons name="alert-circle-outline" size={16} color="#b91c1c" /><Text style={styles.paymentErrorText}>{error}</Text></View> : null}
          <Pressable onPress={onClose} disabled={saving} style={styles.paymentCancel} accessibilityRole="button">
            <Text style={styles.paymentCancelText}>{pendingPayment ? 'Dejar pendiente' : 'Cancelar'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ProductRow({ product, onAdd, disabled }: { product: Producto; onAdd: () => void; disabled: boolean }) {
  const discount = getDemoDiscount(product.nombre, product.precio);
  return (
    <View style={styles.productRow}>
      <ProductImage
        productName={product.nombre}
        imageUrl={product.imagen_url}
        style={styles.productIcon}
        fallback={<Ionicons name="basket-outline" size={19} color="#16a34a" />}
      />
      <View style={styles.productCopy}>
        <Text numberOfLines={1} style={styles.productName}>{product.nombre}</Text>
        <Text style={styles.productPrice}>{discount ? `${currency(discount.salePrice)} · ${discount.percentage}% demo (antes ${currency(discount.originalPrice)})` : product.precio ? currency(product.precio) : 'Precio por consultar'} · {product.unidad_medida}</Text>
      </View>
      <Pressable onPress={onAdd} disabled={disabled} style={[styles.addButton, disabled && styles.disabledButton]} accessibilityRole="button" accessibilityLabel={`Agregar ${product.nombre}`}>
        <Ionicons name="add" size={20} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: { padding: 18, paddingTop: 24, paddingBottom: 36, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f8f6', padding: 28, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  historyButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11, backgroundColor: '#dcfce7' },
  historyButtonText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  headingTitle: { color: '#14532d', fontSize: 23, fontWeight: '800' },
  mutedText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  createCard: { padding: 16, backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e7ece7', gap: 10 },
  sectionTitle: { color: '#14532d', fontSize: 16, fontWeight: '800' },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 11, paddingHorizontal: 12, color: '#0f172a', fontSize: 13, backgroundColor: '#f8fafc' },
  createButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.55 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  errorText: { flex: 1, color: '#991b1b', fontSize: 12 },
  pendingPaymentsCard: { padding: 14, gap: 10, borderRadius: 16, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  pendingPaymentsHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pendingPaymentsTitle: { color: '#854d0e', fontSize: 12, fontWeight: '800' },
  pendingPaymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#fef3c7' },
  pendingPaymentCopy: { flex: 1, gap: 3 },
  pendingPaymentName: { color: '#334155', fontSize: 11, fontWeight: '700' },
  pendingPaymentReference: { color: '#92400e', fontSize: 9 },
  pendingPaymentButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fef3c7' },
  pendingPaymentButtonText: { color: '#854d0e', fontSize: 10, fontWeight: '800' },
  loadingCard: { padding: 24, backgroundColor: '#ffffff', borderRadius: 16, alignItems: 'center', gap: 10 },
  emptyCard: { alignItems: 'center', gap: 9, padding: 23, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  emptyIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#14532d', fontSize: 16, fontWeight: '800' },
  loginButton: { color: '#ffffff', backgroundColor: '#16a34a', paddingHorizontal: 17, paddingVertical: 11, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontWeight: '700', marginTop: 3 },
  listPicker: { gap: 8, paddingRight: 6 },
  listChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 210, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  listChipSelected: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  listChipText: { flexShrink: 1, color: '#64748b', fontSize: 12, fontWeight: '600' },
  listChipTextSelected: { color: '#166534', fontWeight: '800' },
  listCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e7ece7', boxShadow: '0px 4px 14px rgba(31, 56, 38, 0.05)' },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listHeaderCopy: { flex: 1 },
  listTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  listSubtitle: { color: '#64748b', fontSize: 11, marginTop: 3 },
  deleteButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#f1f5f9', overflow: 'hidden', marginTop: 14, marginBottom: 7 },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  emptyList: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  itemRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  checkbox: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  itemCopy: { flex: 1 },
  itemName: { color: '#1e293b', fontSize: 13, fontWeight: '700' },
  itemPurchased: { color: '#94a3b8', textDecorationLine: 'line-through' },
  itemDetail: { color: '#94a3b8', fontSize: 10, marginTop: 3 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quantityButton: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  quantity: { minWidth: 15, textAlign: 'center', color: '#334155', fontSize: 12, fontWeight: '700' },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 7, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 13, marginTop: 3 },
  totalLabel: { flex: 1, color: '#64748b', fontSize: 10 },
  totalValue: { color: '#15803d', fontSize: 13, fontWeight: '800' },
  purchaseButton: { minHeight: 46, marginTop: 13, borderRadius: 12, backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  purchaseButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  purchaseHint: { color: '#64748b', fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 7 },
  paymentBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  paymentModal: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 13, padding: 20, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#ffffff' },
  paymentModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentModalIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#dcfce7' },
  paymentModalHeading: { flex: 1, gap: 3 },
  paymentModalTitle: { color: '#14532d', fontSize: 17, fontWeight: '800' },
  paymentClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#f1f5f9' },
  walletOption: { gap: 11, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#dcfce7', backgroundColor: '#f7fdf8' },
  walletOptionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletOptionIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#dcfce7' },
  walletOptionCopy: { flex: 1, gap: 3 },
  walletOptionTitle: { color: '#14532d', fontSize: 12, fontWeight: '800' },
  walletOptionBalance: { color: '#64748b', fontSize: 11 },
  walletPayButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: '#16a34a' },
  walletPayText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  topUpLink: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#ffffff' },
  topUpLinkText: { color: '#166534', fontSize: 10, fontWeight: '700' },
  paymentDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentDividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  paymentDividerText: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  referenceButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderRadius: 14, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  referenceButtonCopy: { flex: 1, gap: 3 },
  referenceButtonTitle: { color: '#166534', fontSize: 11, fontWeight: '800' },
  referenceButtonSubtitle: { color: '#64748b', fontSize: 9 },
  referenceBox: { alignItems: 'center', gap: 8, padding: 15, borderRadius: 15, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  referenceLabel: { color: '#92400e', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  referenceValue: { color: '#78350f', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  paymentDisclaimer: { color: '#64748b', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  paymentError: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 10, borderRadius: 11, backgroundColor: '#fef2f2' },
  paymentErrorText: { flex: 1, color: '#991b1b', fontSize: 11, lineHeight: 16 },
  paymentCancel: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#f1f5f9' },
  paymentCancelText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  catalogHeader: { marginTop: 4 },
  catalogSubtitle: { color: '#64748b', fontSize: 11, marginTop: 3 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e1e8e1', borderRadius: 14, backgroundColor: '#ffffff' },
  searchInput: { flex: 1, height: '100%', color: '#0f172a', fontSize: 12 },
  emptyProducts: { padding: 16, alignItems: 'center' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  productIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  productCopy: { flex: 1, gap: 3 },
  productName: { color: '#1e293b', fontSize: 12, fontWeight: '700' },
  productPrice: { color: '#64748b', fontSize: 10 },
  addButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
});
