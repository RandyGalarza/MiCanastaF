import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import {
  obtenerCompras,
  obtenerMovimientosSaldo,
  obtenerPagosPendientes,
  obtenerSaldoUsuario,
  obtenerVentasComercio,
  recargarSaldoDemostracion,
  simularPagoReferencia,
} from '@/repositories/compraRepository';
import type { MovimientoSaldo, PagoPendiente } from '@/repositories/compraRepository';
import { actualizarPresupuesto, crearPresupuesto, obtenerPresupuestos } from '@/repositories/presupuestoRepository';
import { Compra, Presupuesto, VentaComercio } from '@/types/database';

const currency = (amount: number) => `$${Number(amount || 0).toLocaleString('es-CO')}`;
type SalesPeriod = 'month' | 'all';
type BudgetDraft = Pick<Presupuesto, 'nombre' | 'monto' | 'fecha_inicio' | 'fecha_fin'>;

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOfPurchase(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : localDate(date);
}

function monthRange(date = new Date()): Pick<BudgetDraft, 'fecha_inicio' | 'fecha_fin'> {
  return {
    fecha_inicio: localDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    fecha_fin: localDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getBudgetStatus(budget: Presupuesto, today: string): string {
  if (budget.fecha_fin < today) return 'Finalizado';
  if (budget.fecha_inicio > today) return 'Programado';
  return budget.pre_estado === 1 ? 'Activo' : 'Pausado';
}

export default function PresupuestoScreen() {
  const { user, isComercio } = useAuth();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [purchases, setPurchases] = useState<Compra[]>([]);
  const [sales, setSales] = useState<VentaComercio[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('month');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Presupuesto | null>(null);
  const [draft, setDraft] = useState<BudgetDraft>(() => ({ nombre: '', monto: 0, ...monthRange() }));
  const [amountText, setAmountText] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletMovements, setWalletMovements] = useState<MovimientoSaldo[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PagoPendiente[]>([]);
  const [topUpVisible, setTopUpVisible] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpError, setTopUpError] = useState('');
  const [walletActionError, setWalletActionError] = useState('');
  const [walletSaving, setWalletSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) {
      setPresupuestos([]);
      setPurchases([]);
      setSales([]);
      setWalletBalance(0);
      setWalletMovements([]);
      setPendingPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      if (isComercio) {
        setPresupuestos([]);
        setPurchases([]);
        setSales(user.id_comercio ? await obtenerVentasComercio(user.id_comercio) : []);
        setWalletBalance(0);
        setWalletMovements([]);
        setPendingPayments([]);
        return;
      }
      const [result, userPurchases, balance, movements, openPayments] = await Promise.all([
        obtenerPresupuestos(user.id_usuario),
        obtenerCompras(user.id_usuario),
        obtenerSaldoUsuario(user.id_usuario),
        obtenerMovimientosSaldo(user.id_usuario),
        obtenerPagosPendientes(user.id_usuario),
      ]);
      setPresupuestos(result);
      setPurchases(userPurchases);
      setWalletBalance(balance);
      setWalletMovements(movements);
      setPendingPayments(openPayments);
      setSelectedBudgetId((current) =>
        result.some((item) => item.id_presupuesto === current)
          ? current
          : result.find((item) => item.pre_estado === 1)?.id_presupuesto ?? result[0]?.id_presupuesto ?? null
      );
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user, isComercio]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const activos = useMemo(() => presupuestos.filter((item) => item.pre_estado === 1), [presupuestos]);
  const presupuestoActual = presupuestos.find((item) => item.id_presupuesto === selectedBudgetId)
    ?? activos[0]
    ?? presupuestos[0];
  const purchasesForBudget = useMemo(() => {
    if (!presupuestoActual) return [];
    return purchases.filter((purchase) => {
      const date = dateOfPurchase(purchase.fecha_compra);
      return date >= presupuestoActual.fecha_inicio && date <= presupuestoActual.fecha_fin;
    });
  }, [presupuestoActual, purchases]);
  const spent = purchasesForBudget.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
  const remaining = Math.max(0, Number(presupuestoActual?.monto || 0) - spent);
  const spentPercentage = presupuestoActual?.monto
    ? Math.min((spent / presupuestoActual.monto) * 100, 100)
    : 0;
  const today = localDate(new Date());
  const budgetStatus = presupuestoActual ? getBudgetStatus(presupuestoActual, today) : '';

  const startCreate = () => {
    setEditingBudget(null);
    setDraft({ nombre: 'Mercado del mes', monto: 0, ...monthRange() });
    setAmountText('');
    setFormError('');
    setFormVisible(true);
  };

  const startEdit = (budget: Presupuesto) => {
    setEditingBudget(budget);
    setDraft({
      nombre: budget.nombre,
      monto: budget.monto,
      fecha_inicio: budget.fecha_inicio,
      fecha_fin: budget.fecha_fin,
    });
    setAmountText(String(budget.monto));
    setFormError('');
    setFormVisible(true);
  };

  const saveBudget = async () => {
    if (!user || saving) return;
    const name = draft.nombre.trim();
    const amount = Number(amountText.replace(/\./g, '').replace(',', '.'));
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!name) {
      setFormError('Escribe un nombre para tu presupuesto.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Ingresa un monto mayor que cero.');
      return;
    }
    if (!datePattern.test(draft.fecha_inicio) || !datePattern.test(draft.fecha_fin)) {
      setFormError('Usa el formato de fecha AAAA-MM-DD.');
      return;
    }
    const start = new Date(`${draft.fecha_inicio}T12:00:00`);
    const end = new Date(`${draft.fecha_fin}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || localDate(start) !== draft.fecha_inicio || localDate(end) !== draft.fecha_fin) {
      setFormError('Revisa que las fechas del periodo sean válidas.');
      return;
    }
    if (draft.fecha_fin < draft.fecha_inicio) {
      setFormError('La fecha final debe ser igual o posterior a la fecha inicial.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingBudget) {
        await actualizarPresupuesto(
          editingBudget.id_presupuesto,
          name,
          amount,
          draft.fecha_inicio,
          draft.fecha_fin,
          editingBudget.pre_estado
        );
        setSelectedBudgetId(editingBudget.id_presupuesto);
      } else {
        const id = await crearPresupuesto(user.id_usuario, name, amount, draft.fecha_inicio, draft.fecha_fin);
        setSelectedBudgetId(id);
      }
      setFormVisible(false);
      await cargar();
    } catch (error) {
      console.error('No se pudo guardar el presupuesto:', error);
      setFormError('No pudimos guardar los cambios. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleBudgetStatus = async (budget: Presupuesto) => {
    try {
      await actualizarPresupuesto(
        budget.id_presupuesto,
        budget.nombre,
        budget.monto,
        budget.fecha_inicio,
        budget.fecha_fin,
        budget.pre_estado === 1 ? 0 : 1
      );
      await cargar();
    } catch (error) {
      console.error('No se pudo cambiar el estado del presupuesto:', error);
      setLoadError(true);
    }
  };

  const recargarSaldo = async () => {
    if (!user || walletSaving) return;
    const amount = Number(topUpAmount.replace(/\./g, '').replace(',', '.'));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setTopUpError('Ingresa un monto entero mayor que cero.');
      return;
    }
    setWalletSaving(true);
    setTopUpError('');
    setWalletActionError('');
    try {
      await recargarSaldoDemostracion(user.id_usuario, amount);
      setTopUpVisible(false);
      setTopUpAmount('');
      await cargar();
    } catch (error) {
      console.error('No se pudo recargar el saldo de prueba:', error);
      setTopUpError(error instanceof Error ? error.message : 'No se pudo recargar el saldo.');
    } finally {
      setWalletSaving(false);
    }
  };

  const confirmarPagoPendiente = async (payment: PagoPendiente) => {
    if (!user || walletSaving) return;
    setWalletSaving(true);
    setWalletActionError('');
    try {
      await simularPagoReferencia(payment.id_pago, user.id_usuario);
      await cargar();
    } catch (error) {
      console.error('No se pudo confirmar el pago de prueba:', error);
      setWalletActionError(error instanceof Error ? error.message : 'No se pudo confirmar el pago.');
    } finally {
      setWalletSaving(false);
    }
  };

  const currentMonthSales = useMemo(() => {
    const now = new Date();
    return sales.filter((sale) => {
      const date = new Date(sale.fecha_compra);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [sales]);
  const periodSales = salesPeriod === 'month' ? currentMonthSales : sales;
  const salesTotal = periodSales.reduce((sum, sale) => sum + sale.total, 0);
  const orderCount = periodSales.length;
  const unitsSold = periodSales.reduce(
    (sum, sale) => sum + sale.productos.reduce((lineSum, item) => lineSum + Number(item.cantidad), 0),
    0
  );
  const topProducts = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; total: number }>();
    for (const sale of periodSales) {
      for (const item of sale.productos) {
        const key = `${item.id_producto}:${item.nombre_producto}`;
        const aggregate = totals.get(key) ?? { name: item.nombre_producto, quantity: 0, total: 0 };
        aggregate.quantity += Number(item.cantidad);
        aggregate.total += item.subtotal;
        totals.set(key, aggregate);
      }
    }
    return [...totals.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 5);
  }, [periodSales]);

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}><Ionicons name="wallet" size={23} color="#15803d" /></View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{isComercio ? 'Ventas del comercio' : 'Mi presupuesto'}</Text>
          <Text style={styles.subtitle}>{isComercio ? 'Ingresos reportados por compras registradas' : 'Lleva el control de tu mercado'}</Text>
        </View>
        {user && !isComercio && (
          <Pressable onPress={startCreate} style={styles.newBudgetButton} accessibilityRole="button">
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.newBudgetButtonText}>Crear</Text>
          </Pressable>
        )}
      </View>

      {!user ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="person-outline" size={27} color="#16a34a" /></View>
          <Text style={styles.cardTitle}>Inicia sesión para ver tu saldo</Text>
          <Text style={styles.bodyText}>Tu presupuesto personal estará disponible aquí cuando ingreses a tu cuenta.</Text>
          <Link href="/login" style={styles.loginLink}>Iniciar sesión</Link>
        </View>
      ) : loading ? (
        <View style={styles.emptyCard}><ActivityIndicator color="#16a34a" /><Text style={styles.bodyText}>{isComercio ? 'Cargando tus ventas…' : 'Cargando tu presupuesto…'}</Text></View>
      ) : loadError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
          <Text style={styles.cardTitle}>No pudimos cargar tu presupuesto</Text>
          <Text style={styles.bodyText}>Intenta de nuevo en un momento.</Text>
          <Pressable onPress={() => void cargar()} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
          </Pressable>
        </View>
      ) : isComercio ? (
        user.id_comercio == null ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="storefront-outline" size={28} color="#16a34a" /></View>
            <Text style={styles.cardTitle}>Tu cuenta no tiene un comercio asignado</Text>
            <Text style={styles.bodyText}>Contacta al administrador para vincular tu usuario a un comercio.</Text>
          </View>
        ) : (
          <>
            <View style={styles.salesPeriodRow}>
              <PeriodButton label="Este mes" selected={salesPeriod === 'month'} onPress={() => setSalesPeriod('month')} />
              <PeriodButton label="Todo el historial" selected={salesPeriod === 'all'} onPress={() => setSalesPeriod('all')} />
            </View>

            <View style={styles.salesHero}>
              <View style={styles.salesLabelRow}><Ionicons name="trending-up-outline" size={17} color="#dcfce7" /><Text style={styles.salesLabel}>INGRESOS REGISTRADOS</Text></View>
              <Text style={styles.salesAmount}>{currency(salesTotal)}</Text>
              <Text style={styles.salesCaption}>{salesPeriod === 'month' ? 'Durante el mes actual' : 'Acumulado de todo el historial'}</Text>
              <View style={styles.salesStatsRow}>
                <View style={styles.salesStat}><Text style={styles.salesStatValue}>{orderCount}</Text><Text style={styles.salesStatLabel}>Compras</Text></View>
                <View style={styles.salesStatDivider} />
                <View style={styles.salesStat}><Text style={styles.salesStatValue}>{unitsSold}</Text><Text style={styles.salesStatLabel}>Unidades</Text></View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}><Ionicons name="information-circle-outline" size={20} color="#a16207" /></View>
              <View style={styles.infoCopy}>
                <Text style={styles.salesInfoTitle}>Estimación, no utilidad neta</Text>
                <Text style={styles.salesInfoText}>Se calcula con productos que los usuarios marcaron como comprados y precios de referencia. No confirma pagos ni descuenta costos del comercio.</Text>
              </View>
            </View>

            <View style={styles.manageCatalogCard}>
              <View style={styles.catalogCardIcon}><Ionicons name="pricetag-outline" size={20} color="#166534" /></View>
              <View style={styles.catalogCardCopy}>
                <Text style={styles.catalogCardTitle}>Catálogo y precios</Text>
                <Text style={styles.catalogCardText}>Mantén actualizados tus productos para mejorar estas estimaciones.</Text>
              </View>
              <Link href="/productos" style={styles.catalogLink}>Gestionar</Link>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.salesSectionHeading}>
                <Text style={styles.salesSectionTitle}>Productos más comprados</Text>
                <Text style={styles.salesSectionSubtitle}>Según las compras reportadas</Text>
              </View>
              {topProducts.length === 0 ? (
                <Text style={styles.noSalesText}>Aún no hay compras asociadas a tu comercio.</Text>
              ) : topProducts.map((item, index) => (
                <View key={`${item.name}-${index}`}>
                  {index > 0 && <View style={styles.summaryDivider} />}
                  <View style={styles.topProductRow}>
                    <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>
                    <Text numberOfLines={1} style={styles.topProductName}>{item.name}</Text>
                    <View style={styles.topProductNumbers}>
                      <Text style={styles.topProductQuantity}>{item.quantity} un.</Text>
                      <Text style={styles.topProductTotal}>{currency(item.total)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Compras recientes</Text>
            {periodSales.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={28} color="#16a34a" /></View>
                <Text style={styles.cardTitle}>Sin ventas en este periodo</Text>
                <Text style={styles.bodyText}>Cuando un usuario registre una compra de tus productos, aparecerá aquí.</Text>
              </View>
            ) : periodSales.slice(0, 10).map((sale) => (
              <View key={sale.id_compra} style={styles.saleRow}>
                <View style={styles.saleIcon}><Ionicons name="receipt-outline" size={18} color="#15803d" /></View>
                <View style={styles.saleCopy}>
                  <Text style={styles.saleName}>{sale.nombre_lista}</Text>
                  <Text style={styles.saleMeta}>{sale.numero_factura} · {new Date(sale.fecha_compra).toLocaleDateString('es-CO')}</Text>
                  <Text style={styles.saleMeta}>{sale.productos.length} {sale.productos.length === 1 ? 'producto' : 'productos'}</Text>
                </View>
                <Text style={styles.saleTotal}>{currency(sale.total)}</Text>
              </View>
            ))}
          </>
        )
      ) : presupuestoActual ? (
        <>
          <WalletSection
            balance={walletBalance}
            movements={walletMovements}
            pendingPayments={pendingPayments}
            actionError={walletActionError}
            saving={walletSaving}
            onTopUp={() => {
              setTopUpError('');
              setTopUpAmount('');
              setTopUpVisible(true);
            }}
            onSimulatePayment={(payment) => void confirmarPagoPendiente(payment)}
          />
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View style={styles.balanceLabelRow}><Ionicons name="wallet-outline" size={16} color="#dcfce7" /><Text style={styles.balanceLabel}>DISPONIBLE</Text></View>
              <View style={styles.activePill}><View style={[styles.activeDot, budgetStatus !== 'Activo' && styles.inactiveDot]} /><Text style={styles.activeText}>{budgetStatus}</Text></View>
            </View>
            <Text style={styles.balanceAmount}>{currency(remaining)}</Text>
            <Text style={styles.balanceName}>{presupuestoActual.nombre} · de {currency(presupuestoActual.monto)}</Text>
            <View style={styles.budgetProgressTrack}>
              <View style={[styles.budgetProgressFill, { width: `${spentPercentage}%` }, spent > presupuestoActual.monto && styles.budgetProgressOver]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Gastado {currency(spent)}</Text>
              <Text style={styles.progressLabel}>{Math.round(spentPercentage)}% usado</Text>
            </View>
            {spent > presupuestoActual.monto && (
              <View style={styles.overBudgetNote}>
                <Ionicons name="alert-circle-outline" size={15} color="#fff4cc" />
                <Text style={styles.overBudgetText}>Superaste el monto por {currency(spent - presupuestoActual.monto)}</Text>
              </View>
            )}
            <View style={styles.balanceDivider} />
            <View style={styles.periodRow}>
              <View><Text style={styles.periodLabel}>Desde</Text><Text style={styles.periodValue}>{formatDate(presupuestoActual.fecha_inicio)}</Text></View>
              <Ionicons name="arrow-forward" size={17} color="#bbf7d0" />
              <View><Text style={styles.periodLabel}>Hasta</Text><Text style={styles.periodValue}>{formatDate(presupuestoActual.fecha_fin)}</Text></View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}><Ionicons name="information-circle-outline" size={20} color="#0369a1" /></View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>¿Cómo calculamos tus gastos?</Text>
              <Text style={styles.infoText}>Sumamos las compras registradas entre las fechas de este presupuesto. Las compras no registradas no se incluyen.</Text>
            </View>
          </View>

          <View style={styles.sectionHeadingRow}>
            <View><Text style={styles.sectionTitle}>Resumen del presupuesto</Text><Text style={styles.sectionSubtitle}>Cifras del periodo seleccionado</Text></View>
            <Pressable onPress={() => startEdit(presupuestoActual)} style={styles.editBudgetButton} accessibilityRole="button" accessibilityLabel="Editar presupuesto">
              <Ionicons name="create-outline" size={17} color="#168344" />
              <Text style={styles.editBudgetText}>Editar</Text>
            </Pressable>
          </View>
          <View style={styles.summaryCard}>
            <SummaryRow icon="cash-outline" label="Monto asignado" value={currency(presupuestoActual.monto)} />
            <View style={styles.summaryDivider} />
            <SummaryRow icon="cart-outline" label="Compras registradas" value={currency(spent)} />
            <View style={styles.summaryDivider} />
            <SummaryRow icon="wallet-outline" label="Saldo disponible" value={currency(remaining)} />
            <View style={styles.summaryDivider} />
            <SummaryRow icon="receipt-outline" label="Compras en el periodo" value={String(purchasesForBudget.length)} />
          </View>

          <View style={styles.sectionHeadingRow}>
            <View><Text style={styles.sectionTitle}>Compras del periodo</Text><Text style={styles.sectionSubtitle}>Registradas entre las fechas del presupuesto</Text></View>
          </View>
          {purchasesForBudget.length === 0 ? (
            <View style={styles.emptyPurchasesCard}>
              <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={23} color="#168344" /></View>
              <Text style={styles.emptyPurchasesTitle}>Aún no hay compras registradas</Text>
              <Text style={styles.bodyText}>Cuando registres una compra dentro de este periodo, verás aquí el gasto y su factura.</Text>
              <Link href="/lista-compra" style={styles.secondaryActionLink}>Ir a mis listas</Link>
            </View>
          ) : purchasesForBudget.slice(0, 5).map((purchase) => (
            <Link
              key={purchase.id_compra}
              href={{ pathname: '/factura/[id]', params: { id: String(purchase.id_compra) } }}
              style={styles.purchaseRowLink}
            >
              <View style={styles.purchaseIcon}><Ionicons name="receipt-outline" size={18} color="#168344" /></View>
              <View style={styles.purchaseCopy}>
                <Text numberOfLines={1} style={styles.purchaseName}>{purchase.nombre_lista}</Text>
                <Text style={styles.purchaseDate}>{formatDate(dateOfPurchase(purchase.fecha_compra))} · {purchase.detalles.length} {purchase.detalles.length === 1 ? 'producto' : 'productos'}</Text>
              </View>
              <View style={styles.purchaseAmountWrap}>
                <Text style={styles.purchaseAmount}>{currency(purchase.total)}</Text>
                <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
              </View>
            </Link>
          ))}
          {presupuestos.length > 0 && (
            <>
              <View style={styles.sectionHeadingRow}>
                <View><Text style={styles.sectionTitle}>Mis presupuestos</Text><Text style={styles.sectionSubtitle}>Selecciona uno para consultar su resumen</Text></View>
              </View>
              <View style={styles.budgetList}>
                {presupuestos.map((budget) => {
                  const selected = budget.id_presupuesto === presupuestoActual.id_presupuesto;
                  const status = getBudgetStatus(budget, today);
                  return (
                    <View key={budget.id_presupuesto} style={[styles.budgetListItem, selected && styles.budgetListItemSelected]}>
                      <Pressable
                        onPress={() => setSelectedBudgetId(budget.id_presupuesto)}
                        style={styles.budgetSelectButton}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <View style={[styles.budgetListIcon, selected && styles.budgetListIconSelected]}>
                          <Ionicons name={selected ? 'wallet' : 'wallet-outline'} size={18} color={selected ? '#168344' : '#718076'} />
                        </View>
                        <View style={styles.budgetListCopy}>
                          <Text numberOfLines={1} style={styles.budgetListName}>{budget.nombre}</Text>
                          <Text style={styles.budgetListMeta}>{formatDate(budget.fecha_inicio)} – {formatDate(budget.fecha_fin)} · {status}</Text>
                        </View>
                        <Text style={styles.budgetListAmount}>{currency(budget.monto)}</Text>
                      </Pressable>
                      <View style={styles.budgetActions}>
                        <Pressable onPress={() => startEdit(budget)} style={styles.budgetActionButton} accessibilityRole="button" accessibilityLabel={`Editar ${budget.nombre}`}>
                          <Ionicons name="create-outline" size={17} color="#168344" />
                        </Pressable>
                        <Pressable onPress={() => void toggleBudgetStatus(budget)} style={styles.budgetActionButton} accessibilityRole="button" accessibilityLabel={`${budget.pre_estado === 1 ? 'Pausar' : 'Activar'} ${budget.nombre}`}>
                          <Ionicons name={budget.pre_estado === 1 ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={budget.pre_estado === 1 ? '#b45309' : '#168344'} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      ) : (
        <>
          <WalletSection
            balance={walletBalance}
            movements={walletMovements}
            pendingPayments={pendingPayments}
            actionError={walletActionError}
            saving={walletSaving}
            onTopUp={() => {
              setTopUpError('');
              setTopUpAmount('');
              setTopUpVisible(true);
            }}
            onSimulatePayment={(payment) => void confirmarPagoPendiente(payment)}
          />
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="pie-chart-outline" size={28} color="#16a34a" /></View>
            <Text style={styles.cardTitle}>Aún no tienes un presupuesto activo</Text>
            <Text style={styles.bodyText}>Cuando configures un presupuesto, aquí podrás consultar el monto asignado y tu saldo disponible.</Text>
            <View style={styles.suggestion}><Ionicons name="bulb-outline" size={18} color="#b45309" /><Text style={styles.suggestionText}>Define un monto para organizar mejor tus compras del mercado.</Text></View>
            <Pressable onPress={startCreate} style={styles.createBudgetCta} accessibilityRole="button">
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.createBudgetCtaText}>Crear mi presupuesto</Text>
            </Pressable>
            <Link href="/productos" style={styles.budgetCatalogLink}>Explorar productos del mercado</Link>
          </View>
        </>
      )}

      <View style={styles.tipCard}>
        <Ionicons name={isComercio ? 'storefront-outline' : 'sparkles-outline'} size={19} color="#15803d" />
        <Text style={styles.tipText}>
          {isComercio
            ? 'Consejo: mantén al día los productos y precios de tu catálogo para que las familias puedan comparar mejor.'
            : 'Consejo: consulta los precios del catálogo y compáralos con el monto que quieres destinar a tu mercado.'}
        </Text>
      </View>
    </ScrollView>
    <BudgetFormModal
      visible={formVisible}
      editing={Boolean(editingBudget)}
      draft={draft}
      amountText={amountText}
      error={formError}
      saving={saving}
      onClose={() => setFormVisible(false)}
      onSave={() => void saveBudget()}
      onChange={(field, value) => setDraft((current) => ({ ...current, [field]: field === 'monto' ? Number(value) : value }))}
      onAmountChange={setAmountText}
    />
    <TopUpModal
      visible={topUpVisible}
      amount={topUpAmount}
      error={topUpError}
      saving={walletSaving}
      onClose={() => setTopUpVisible(false)}
      onAmountChange={setTopUpAmount}
      onSave={() => void recargarSaldo()}
    />
    </>
  );
}

function WalletSection({
  balance,
  movements,
  pendingPayments,
  actionError,
  saving,
  onTopUp,
  onSimulatePayment,
}: {
  balance: number;
  movements: MovimientoSaldo[];
  pendingPayments: PagoPendiente[];
  actionError: string;
  saving: boolean;
  onTopUp: () => void;
  onSimulatePayment: (payment: PagoPendiente) => void;
}) {
  return (
    <View style={styles.walletSection}>
      <View style={styles.walletCard}>
        <View style={styles.walletCardTop}>
          <View style={styles.walletCardIcon}><Ionicons name="wallet-outline" size={21} color="#166534" /></View>
          <View style={styles.walletCardHeading}>
            <Text style={styles.walletCardTitle}>Saldo de la app</Text>
            <Text style={styles.walletCardCaption}>Solo en este dispositivo</Text>
          </View>
          <Pressable onPress={onTopUp} style={styles.walletTopUpButton} accessibilityRole="button">
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.walletTopUpText}>Recargar</Text>
          </Pressable>
        </View>
        <Text style={styles.walletBalance}>{currency(balance)}</Text>
        <View style={styles.walletDemoNote}>
          <Ionicons name="information-circle-outline" size={15} color="#854d0e" />
          <Text style={styles.walletDemoText}>Saldo local de prueba; no representa dinero real.</Text>
        </View>
      </View>

      {actionError ? (
        <View style={styles.walletActionError}>
          <Ionicons name="alert-circle-outline" size={16} color="#b91c1c" />
          <Text style={styles.walletActionErrorText}>{actionError}</Text>
        </View>
      ) : null}

      {pendingPayments.length > 0 && (
        <View style={styles.walletSubcard}>
          <Text style={styles.walletSubcardTitle}>Pagos presenciales de prueba pendientes</Text>
          {pendingPayments.map((payment) => (
            <View key={payment.id_pago} style={styles.walletPendingRow}>
              <View style={styles.walletPendingCopy}>
                <Text style={styles.walletMovementTitle}>{payment.nombre_lista} · {currency(payment.total)}</Text>
                <Text style={styles.walletMovementMeta}>{payment.referencia} · no válida para pago real</Text>
              </View>
              <Pressable
                onPress={() => onSimulatePayment(payment)}
                disabled={saving}
                style={[styles.walletSimulateButton, saving && styles.disabledButton]}
                accessibilityRole="button"
                accessibilityLabel={`Simular pago recibido para ${payment.referencia}`}
              >
                {saving ? <ActivityIndicator size="small" color="#166534" /> : <Text style={styles.walletSimulateText}>Simular pago</Text>}
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.walletSubcard}>
        <Text style={styles.walletSubcardTitle}>Movimientos recientes</Text>
        {movements.length === 0 ? (
          <Text style={styles.walletEmptyText}>Aquí aparecerán tus recargas y pagos de prueba.</Text>
        ) : movements.slice(0, 4).map((movement) => (
          <View key={movement.id_movimiento} style={styles.walletMovementRow}>
            <View style={[styles.walletMovementIcon, movement.monto < 0 && styles.walletDebitIcon]}>
              <Ionicons name={movement.monto < 0 ? 'cart-outline' : 'add'} size={17} color={movement.monto < 0 ? '#b45309' : '#168344'} />
            </View>
            <View style={styles.walletMovementCopy}>
              <Text numberOfLines={1} style={styles.walletMovementTitle}>{movement.descripcion}</Text>
              <Text style={styles.walletMovementMeta}>{formatDate(dateOfPurchase(movement.fecha))}</Text>
            </View>
            <Text style={[styles.walletMovementAmount, movement.monto < 0 && styles.walletDebitAmount]}>
              {movement.monto < 0 ? '−' : '+'}{currency(Math.abs(Number(movement.monto)))}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TopUpModal({
  visible,
  amount,
  error,
  saving,
  onClose,
  onAmountChange,
  onSave,
}: {
  visible: boolean;
  amount: string;
  error: string;
  saving: boolean;
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.topUpModal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.modalEyebrow}>BILLETERA DE PRUEBA</Text>
              <Text style={styles.modalTitle}>Recargar saldo</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose} accessibilityRole="button" accessibilityLabel="Cerrar recarga">
              <Ionicons name="close" size={20} color="#526257" />
            </Pressable>
          </View>
          <Text style={styles.topUpExplanation}>Añade saldo ficticio para probar el pago dentro de la app. No se realizará ningún cobro.</Text>
          <Text style={styles.fieldLabel}>Monto en pesos colombianos</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              value={amount}
              onChangeText={onAmountChange}
              placeholder="Ej. 50000"
              placeholderTextColor="#97a39a"
              style={styles.amountInput}
              keyboardType="number-pad"
              accessibilityLabel="Monto de la recarga de prueba"
            />
            <Text style={styles.currencySuffix}>COP</Text>
          </View>
          <View style={styles.topUpPresets}>
            {[20000, 50000, 100000].map((value) => (
              <Pressable key={value} onPress={() => onAmountChange(String(value))} style={styles.topUpPreset} accessibilityRole="button">
                <Text style={styles.topUpPresetText}>{currency(value)}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <View style={styles.formError}><Ionicons name="alert-circle-outline" size={17} color="#b42318" /><Text style={styles.formErrorText}>{error}</Text></View> : null}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} disabled={saving} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onSave} disabled={saving} style={[styles.saveBudgetButton, saving && styles.disabledButton]} accessibilityRole="button">
              {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="add-circle-outline" size={18} color="#ffffff" />}
              <Text style={styles.saveBudgetText}>{saving ? 'Recargando…' : 'Añadir saldo de prueba'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PeriodButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.periodFilter, selected && styles.periodFilterActive]}>
      <Text style={[styles.periodFilterText, selected && styles.periodFilterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BudgetFormModal({
  visible,
  editing,
  draft,
  amountText,
  error,
  saving,
  onClose,
  onSave,
  onChange,
  onAmountChange,
}: {
  visible: boolean;
  editing: boolean;
  draft: BudgetDraft;
  amountText: string;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (field: keyof BudgetDraft, value: string) => void;
  onAmountChange: (value: string) => void;
}) {
  const setPreset = (preset: 'month' | 'fortnight') => {
    const now = new Date();
    if (preset === 'month') {
      const range = monthRange(now);
      onChange('fecha_inicio', range.fecha_inicio);
      onChange('fecha_fin', range.fecha_fin);
      return;
    }

    const firstDay = now.getDate() <= 15 ? 1 : 16;
    const lastDay = now.getDate() <= 15 ? 15 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    onChange('fecha_inicio', localDate(new Date(now.getFullYear(), now.getMonth(), firstDay)));
    onChange('fecha_fin', localDate(new Date(now.getFullYear(), now.getMonth(), lastDay)));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.modalEyebrow}>{editing ? 'ACTUALIZA TU PLAN' : 'ORGANIZA TU MERCADO'}</Text>
              <Text style={styles.modalTitle}>{editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose} accessibilityRole="button" accessibilityLabel="Cerrar formulario">
              <Ionicons name="close" size={20} color="#526257" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalFields}>
            <Text style={styles.fieldLabel}>Nombre del presupuesto</Text>
            <TextInput
              value={draft.nombre}
              onChangeText={(value) => onChange('nombre', value)}
              placeholder="Ej. Mercado familiar"
              placeholderTextColor="#97a39a"
              style={styles.formInput}
              maxLength={50}
              accessibilityLabel="Nombre del presupuesto"
            />

            <Text style={styles.fieldLabel}>Monto que quieres destinar</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                value={amountText}
                onChangeText={onAmountChange}
                placeholder="Ej. 500000"
                placeholderTextColor="#97a39a"
                style={styles.amountInput}
                keyboardType="decimal-pad"
                accessibilityLabel="Monto del presupuesto en pesos"
              />
              <Text style={styles.currencySuffix}>COP</Text>
            </View>

            <View style={styles.periodPresetHeader}>
              <Text style={styles.fieldLabel}>Periodo del presupuesto</Text>
              <Text style={styles.dateFormatHint}>Formato AAAA-MM-DD</Text>
            </View>
            <View style={styles.presetRow}>
              <Pressable onPress={() => setPreset('month')} style={styles.presetButton} accessibilityRole="button">
                <Ionicons name="calendar-outline" size={15} color="#168344" />
                <Text style={styles.presetButtonText}>Este mes</Text>
              </Pressable>
              <Pressable onPress={() => setPreset('fortnight')} style={styles.presetButton} accessibilityRole="button">
                <Ionicons name="time-outline" size={15} color="#168344" />
                <Text style={styles.presetButtonText}>Esta quincena</Text>
              </Pressable>
            </View>
            <View style={styles.dateFieldsRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Desde</Text>
                <TextInput
                  value={draft.fecha_inicio}
                  onChangeText={(value) => onChange('fecha_inicio', value)}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#97a39a"
                  style={styles.formInput}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  accessibilityLabel="Fecha inicial"
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Hasta</Text>
                <TextInput
                  value={draft.fecha_fin}
                  onChangeText={(value) => onChange('fecha_fin', value)}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#97a39a"
                  style={styles.formInput}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  accessibilityLabel="Fecha final"
                />
              </View>
            </View>

            <View style={styles.formNote}>
              <Ionicons name="information-circle-outline" size={17} color="#2673a2" />
              <Text style={styles.formNoteText}>Los gastos se calculan con las compras que registres dentro de este periodo.</Text>
            </View>
            {error ? (
              <View style={styles.formError}>
                <Ionicons name="alert-circle-outline" size={17} color="#b42318" />
                <Text style={styles.formErrorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable onPress={onClose} disabled={saving} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onSave} disabled={saving} style={[styles.saveBudgetButton, saving && styles.disabledButton]} accessibilityRole="button">
              {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark" size={18} color="#ffffff" />}
              <Text style={styles.saveBudgetText}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear presupuesto'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={19} color="#16a34a" />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6' },
  content: { padding: 18, paddingTop: 24, paddingBottom: 32, gap: 15, width: '100%', maxWidth: 760, alignSelf: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  headingIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1 },
  newBudgetButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 13, borderRadius: 13, backgroundColor: '#168344' },
  newBudgetButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  title: { color: '#14532d', fontSize: 23, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 3 },
  walletSection: { gap: 10 },
  walletCard: { padding: 18, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dcebdc', boxShadow: '0px 4px 12px rgba(31, 56, 38, 0.05)' },
  walletCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletCardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#dcfce7' },
  walletCardHeading: { flex: 1, gap: 3 },
  walletCardTitle: { color: '#14532d', fontSize: 13, fontWeight: '800' },
  walletCardCaption: { color: '#718076', fontSize: 10 },
  walletTopUpButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#168344' },
  walletTopUpText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  walletBalance: { color: '#14532d', fontSize: 29, fontWeight: '800', marginTop: 13 },
  walletDemoNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  walletDemoText: { color: '#854d0e', fontSize: 10 },
  walletSubcard: { gap: 9, padding: 14, borderRadius: 17, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  walletSubcardTitle: { color: '#14532d', fontSize: 12, fontWeight: '800' },
  walletMovementRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 7, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  walletPendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  walletMovementIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#dcfce7' },
  walletDebitIcon: { backgroundColor: '#fef3c7' },
  walletMovementCopy: { flex: 1, gap: 3 },
  walletPendingCopy: { flex: 1, gap: 3 },
  walletMovementTitle: { color: '#334155', fontSize: 10, fontWeight: '700' },
  walletMovementMeta: { color: '#94a3b8', fontSize: 9 },
  walletMovementAmount: { color: '#168344', fontSize: 10, fontWeight: '800' },
  walletDebitAmount: { color: '#b45309' },
  walletEmptyText: { color: '#64748b', fontSize: 10, paddingVertical: 5 },
  walletSimulateButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 10, backgroundColor: '#dcfce7' },
  walletSimulateText: { color: '#166534', fontSize: 9, fontWeight: '800' },
  walletActionError: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 10, borderRadius: 12, backgroundColor: '#fef2f2' },
  walletActionErrorText: { flex: 1, color: '#991b1b', fontSize: 11, lineHeight: 16 },
  balanceCard: { backgroundColor: '#15803d', borderRadius: 22, padding: 20, boxShadow: '0px 5px 14px rgba(21, 128, 61, 0.18)' },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  balanceLabel: { color: '#dcfce7', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  activeDot: { width: 6, height: 6, backgroundColor: '#86efac', borderRadius: 3 },
  activeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  balanceAmount: { color: '#ffffff', fontSize: 34, fontWeight: '800', marginTop: 17 },
  balanceName: { color: '#dcfce7', fontSize: 13, marginTop: 3 },
  budgetProgressTrack: { height: 9, overflow: 'hidden', borderRadius: 6, marginTop: 18, backgroundColor: 'rgba(255,255,255,0.22)' },
  budgetProgressFill: { height: '100%', borderRadius: 6, backgroundColor: '#bbf7d0' },
  budgetProgressOver: { backgroundColor: '#fbbf24' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 7 },
  progressLabel: { color: '#dcfce7', fontSize: 10, fontWeight: '700' },
  overBudgetNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  overBudgetText: { color: '#fff4cc', fontSize: 10, fontWeight: '800' },
  inactiveDot: { backgroundColor: '#fbbf24' },
  balanceDivider: { height: 1, backgroundColor: 'rgba(220,252,231,0.25)', marginVertical: 17 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  periodLabel: { color: '#bbf7d0', fontSize: 10, marginBottom: 3 },
  periodValue: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14 },
  infoIcon: { marginTop: 1 },
  infoCopy: { flex: 1, gap: 3 },
  infoTitle: { color: '#1e3a8a', fontSize: 12, fontWeight: '800' },
  infoText: { color: '#1e40af', fontSize: 11, lineHeight: 16 },
  sectionTitle: { color: '#14532d', fontSize: 17, fontWeight: '800', marginTop: 3, marginBottom: -7 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  sectionSubtitle: { color: '#718076', fontSize: 11, marginTop: 4 },
  editBudgetButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 12, backgroundColor: '#eaf5e9' },
  editBudgetText: { color: '#168344', fontSize: 11, fontWeight: '800' },
  summaryCard: { backgroundColor: '#ffffff', paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#e7ece7' },
  summaryRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryLabel: { flex: 1, color: '#475569', fontSize: 13 },
  summaryValue: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: '#f1f5f9' },
  salesPeriodRow: { flexDirection: 'row', gap: 8 },
  periodFilter: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  periodFilterActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  periodFilterText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  periodFilterTextActive: { color: '#166534', fontWeight: '800' },
  salesHero: { backgroundColor: '#15803d', borderRadius: 22, padding: 20, boxShadow: '0px 5px 14px rgba(21, 128, 61, 0.18)' },
  salesLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  salesLabel: { color: '#dcfce7', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  salesAmount: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 16 },
  salesCaption: { color: '#dcfce7', fontSize: 11, marginTop: 3 },
  salesStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(220,252,231,0.25)' },
  salesStat: { minWidth: 72, gap: 3 },
  salesStatValue: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  salesStatLabel: { color: '#bbf7d0', fontSize: 10 },
  salesStatDivider: { width: 1, height: 31, backgroundColor: 'rgba(220,252,231,0.35)' },
  salesInfoTitle: { color: '#854d0e', fontSize: 12, fontWeight: '800' },
  salesInfoText: { color: '#854d0e', fontSize: 11, lineHeight: 16 },
  manageCatalogCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7', borderRadius: 18 },
  catalogCardIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#dcfce7' },
  catalogCardCopy: { flex: 1, gap: 3 },
  catalogCardTitle: { color: '#14532d', fontSize: 12, fontWeight: '800' },
  catalogCardText: { color: '#64748b', fontSize: 10, lineHeight: 14 },
  catalogLink: { color: '#ffffff', backgroundColor: '#16a34a', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, fontSize: 10, fontWeight: '700' },
  salesSectionHeading: { paddingVertical: 13 },
  salesSectionTitle: { color: '#14532d', fontSize: 14, fontWeight: '800' },
  salesSectionSubtitle: { color: '#64748b', fontSize: 10, marginTop: 3 },
  noSalesText: { color: '#64748b', fontSize: 11, paddingVertical: 16, textAlign: 'center' },
  topProductRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9 },
  rankBadge: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#dcfce7' },
  rankText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  topProductName: { flex: 1, color: '#334155', fontSize: 11, fontWeight: '600' },
  topProductNumbers: { alignItems: 'flex-end', gap: 2 },
  topProductQuantity: { color: '#64748b', fontSize: 9 },
  topProductTotal: { color: '#14532d', fontSize: 10, fontWeight: '800' },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14 },
  saleIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#dcfce7' },
  saleCopy: { flex: 1, gap: 3 },
  saleName: { color: '#1e293b', fontSize: 11, fontWeight: '800' },
  saleMeta: { color: '#64748b', fontSize: 9 },
  saleTotal: { color: '#14532d', fontSize: 11, fontWeight: '800' },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: '#e7ece7', gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#14532d', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  bodyText: { color: '#64748b', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  loginLink: { color: '#ffffff', backgroundColor: '#16a34a', overflow: 'hidden', borderRadius: 12, paddingHorizontal: 17, paddingVertical: 11, fontSize: 13, fontWeight: '700', marginTop: 3 },
  retryButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 12, backgroundColor: '#eaf5e9' },
  retryButtonText: { color: '#168344', fontSize: 12, fontWeight: '800' },
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderRadius: 12, padding: 11, marginTop: 4 },
  suggestionText: { flex: 1, color: '#854d0e', fontSize: 11, lineHeight: 16 },
  budgetCatalogLink: { color: '#ffffff', backgroundColor: '#168344', overflow: 'hidden', borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, fontWeight: '800', marginTop: 4 },
  createBudgetCta: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 13, backgroundColor: '#168344', marginTop: 5 },
  createBudgetCtaText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  emptyPurchasesCard: { alignItems: 'center', gap: 9, padding: 20, borderRadius: 19, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  emptyPurchasesTitle: { color: '#14532d', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  secondaryActionLink: { color: '#168344', backgroundColor: '#eaf5e9', overflow: 'hidden', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10, fontSize: 12, fontWeight: '800', marginTop: 3 },
  purchaseRowLink: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#e7ece7', backgroundColor: '#ffffff' },
  purchaseIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#eaf5e9' },
  purchaseCopy: { flex: 1, gap: 4 },
  purchaseName: { color: '#233329', fontSize: 12, fontWeight: '800' },
  purchaseDate: { color: '#718076', fontSize: 10 },
  purchaseAmountWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  purchaseAmount: { color: '#168344', fontSize: 12, fontWeight: '800' },
  budgetList: { gap: 9 },
  budgetListItem: { padding: 11, borderRadius: 17, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7' },
  budgetListItemSelected: { borderColor: '#91c99a', backgroundColor: '#fbfefb' },
  budgetSelectButton: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  budgetListIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f0f3ef' },
  budgetListIconSelected: { backgroundColor: '#e0f0df' },
  budgetListCopy: { flex: 1, gap: 4 },
  budgetListName: { color: '#233329', fontSize: 12, fontWeight: '800' },
  budgetListMeta: { color: '#718076', fontSize: 10 },
  budgetListAmount: { color: '#168344', fontSize: 12, fontWeight: '800' },
  budgetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 7 },
  budgetActionButton: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f3f6f2' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 27, 20, 0.45)' },
  modalCard: { width: '100%', maxWidth: 560, maxHeight: '92%', alignSelf: 'center', padding: 20, paddingBottom: 22, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#f9faf8' },
  topUpModal: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 10, padding: 20, paddingBottom: 22, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#f9faf8' },
  topUpExplanation: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: -7 },
  topUpPresets: { flexDirection: 'row', gap: 7 },
  topUpPreset: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#eaf5e9' },
  topUpPresetText: { color: '#168344', fontSize: 10, fontWeight: '800' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 17 },
  modalTitleCopy: { flex: 1, gap: 4 },
  modalEyebrow: { color: '#168344', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { color: '#193d27', fontSize: 21, fontWeight: '800' },
  modalClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#eaf0e9' },
  modalFields: { gap: 8, paddingBottom: 12 },
  fieldLabel: { color: '#33443a', fontSize: 12, fontWeight: '700', marginTop: 3 },
  formInput: { minHeight: 46, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: '#dce5dc', backgroundColor: '#ffffff', color: '#17251c', fontSize: 14 },
  amountInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: '#cde3cd', backgroundColor: '#ffffff' },
  currencyPrefix: { color: '#168344', fontSize: 17, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, minWidth: 0, paddingVertical: 10, color: '#17251c', fontSize: 17, fontWeight: '800' },
  currencySuffix: { color: '#718076', fontSize: 10, fontWeight: '700' },
  periodPresetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5 },
  dateFormatHint: { color: '#87938a', fontSize: 9 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  presetButton: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 12, backgroundColor: '#eaf5e9' },
  presetButtonText: { color: '#168344', fontSize: 10, fontWeight: '800' },
  dateFieldsRow: { flexDirection: 'row', gap: 9 },
  dateField: { flex: 1, gap: 5 },
  formNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, marginTop: 4, borderRadius: 13, backgroundColor: '#eef6fb' },
  formNoteText: { flex: 1, color: '#365e76', fontSize: 10, lineHeight: 15 },
  formError: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 12, backgroundColor: '#fff0ef' },
  formErrorText: { flex: 1, color: '#a1271c', fontSize: 11, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: 9, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e7ece7' },
  cancelButton: { minHeight: 46, minWidth: 95, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 13, backgroundColor: '#edf1ec' },
  cancelButtonText: { color: '#526257', fontSize: 12, fontWeight: '800' },
  saveBudgetButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, backgroundColor: '#168344' },
  saveBudgetText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#dcfce7', borderRadius: 14, padding: 13 },
  tipText: { flex: 1, color: '#166534', fontSize: 12, lineHeight: 18 },
});
