import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { Comercio, Usuario, Categoria } from '@/types/database';
import {
  crearComercio,
  obtenerComercios,
  eliminarComercio,
  actualizarComercio,
} from '@/repositories/comercioRepository';
import { obtenerUsuarios, eliminarUsuario } from '@/repositories/usuarioRepository';
import { obtenerProductos } from '@/repositories/productoRepository';
import { obtenerResumenComprasSistema } from '@/repositories/compraRepository';
import {
  crearCategoria,
  obtenerCategorias,
  eliminarCategoria,
} from '@/repositories/categoriaRepository';
import { Toast, ToastType } from '@/components/toast';

type AdminTab = 'comercios' | 'usuarios' | 'categorias';

export default function AdminScreen() {
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('comercios');
  const [cargando, setCargando] = useState(false);

  // Datos
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productosActivos, setProductosActivos] = useState(0);
  const [comprasRegistradas, setComprasRegistradas] = useState({ cantidad: 0, total: 0 });
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalComercio, setModalComercio] = useState(false);
  const [comercioEnEdicion, setComercioEnEdicion] = useState<Comercio | null>(null);
  const [comNombre, setComNombre] = useState('');
  const [comDireccion, setComDireccion] = useState('');
  const [comTelefono, setComTelefono] = useState('');
  const [comTipo, setComTipo] = useState('Supermercado');

  const [modalCategoria, setModalCategoria] = useState(false);
  const [catDescripcion, setCatDescripcion] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  };

  const cargarDatos = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setCargando(true);
      const [coms, usus, cats, prods, resumenCompras] = await Promise.all([
        obtenerComercios(),
        obtenerUsuarios(),
        obtenerCategorias(),
        obtenerProductos(),
        obtenerResumenComprasSistema(),
      ]);
      setComercios(coms || []);
      setUsuarios(usus || []);
      setCategorias(cats || []);
      setProductosActivos(prods.filter((product) => product.pro_estado === 1).length);
      setComprasRegistradas(resumenCompras);
    } catch (e) {
      console.error(e);
      showToast('Error cargando información administrativa', 'error');
    } finally {
      setCargando(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    let active = true;
    if (isAdmin) {
      (async () => {
        try {
          setCargando(true);
          const [coms, usus, cats, prods, resumenCompras] = await Promise.all([
            obtenerComercios(),
            obtenerUsuarios(),
            obtenerCategorias(),
            obtenerProductos(),
            obtenerResumenComprasSistema(),
          ]);
          if (active) {
            setComercios(coms || []);
            setUsuarios(usus || []);
            setCategorias(cats || []);
            setProductosActivos(prods.filter((product) => product.pro_estado === 1).length);
            setComprasRegistradas(resumenCompras);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (active) setCargando(false);
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [isAdmin]);

  // Si no es admin: pantalla bloqueada
  if (!isAdmin) {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedCard}>
          <View style={styles.restrictedIconWrapper}>
            <Ionicons name="lock-closed" size={48} color="#dc2626" />
          </View>
          <Text style={styles.restrictedTitle}>Acceso Restringido</Text>
          <Text style={styles.restrictedDesc}>
            Este módulo es de uso exclusivo para Administradores de Mi Canasta Familiar.
          </Text>
          <Text style={styles.restrictedHint}>
            {user
              ? `Tu cuenta (${user.correo}) tiene perfil de ${user.rol === 'comercio' ? 'Comercio' : user.rol === 'admin' ? 'Administrador' : 'Usuario'}.`
              : 'Por favor inicia sesión con una cuenta de Administrador.'}
          </Text>
        </View>
      </View>
    );
  }

  // Acciones Comercios
  const abrirNuevoComercio = () => {
    setComercioEnEdicion(null);
    setComNombre('');
    setComDireccion('');
    setComTelefono('');
    setComTipo('Supermercado');
    setModalComercio(true);
  };

  const abrirEdicionComercio = (comercio: Comercio) => {
    setComercioEnEdicion(comercio);
    setComNombre(comercio.nombre);
    setComDireccion(comercio.direccion ?? '');
    setComTelefono(comercio.telefono ?? '');
    setComTipo(comercio.tipo_comercio ?? '');
    setModalComercio(true);
  };

  const handleGuardarComercio = async () => {
    if (!comNombre.trim()) {
      showToast('El nombre del comercio es requerido', 'error');
      return;
    }
    try {
      setGuardando(true);
      if (comercioEnEdicion) {
        await actualizarComercio(
          comercioEnEdicion.id_comercio,
          comNombre.trim(),
          comDireccion.trim() || undefined,
          comTelefono.trim() || undefined,
          comTipo.trim() || undefined
        );
        showToast('Datos del comercio actualizados', 'success');
      } else {
        await crearComercio(
          comNombre.trim(),
          comDireccion.trim() || undefined,
          comTelefono.trim() || undefined,
          comTipo.trim() || 'Supermercado'
        );
        showToast('Comercio agregado', 'success');
      }
      setComercioEnEdicion(null);
      setComNombre('');
      setComDireccion('');
      setComTelefono('');
      setModalComercio(false);
      await cargarDatos();
    } catch (e) {
      console.error(e);
      showToast('Error al guardar los datos del comercio', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const query = busqueda.trim().toLocaleLowerCase();
  const comerciosVisibles = comercios.filter((item) =>
    `${item.nombre} ${item.tipo_comercio ?? ''} ${item.direccion ?? ''}`.toLocaleLowerCase().includes(query)
  );
  const usuariosVisibles = usuarios.filter((item) =>
    `${item.nombre} ${item.apellido} ${item.correo} ${item.rol}`.toLocaleLowerCase().includes(query)
  );
  const categoriasVisibles = categorias.filter((item) => item.descripcion.toLocaleLowerCase().includes(query));

  const handleEliminarComercio = (c: Comercio) => {
    const doDelete = async () => {
      try {
        await eliminarComercio(c.id_comercio);
        showToast('Comercio eliminado', 'success');
        await cargarDatos();
      } catch (e) {
        console.error(e);
        showToast('Error al eliminar comercio', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Deseas dar de baja el comercio "${c.nombre}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Eliminar Comercio', `¿Deseas dar de baja "${c.nombre}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Acciones Categorías
  const handleCrearCategoria = async () => {
    if (!catDescripcion.trim()) {
      showToast('La descripción de la categoría es requerida', 'error');
      return;
    }
    try {
      setGuardando(true);
      await crearCategoria(catDescripcion.trim());
      showToast('Categoría creada', 'success');
      setCatDescripcion('');
      setModalCategoria(false);
      await cargarDatos();
    } catch (e) {
      console.error(e);
      showToast('Error al crear categoría', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCategoria = (cat: Categoria) => {
    const doDelete = async () => {
      try {
        await eliminarCategoria(cat.id_categoria);
        showToast('Categoría eliminada', 'success');
        await cargarDatos();
      } catch (e) {
        console.error(e);
        showToast('No se puede eliminar: tiene productos asociados', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Deseas eliminar la categoría "${cat.descripcion}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Eliminar Categoría', `¿Deseas eliminar "${cat.descripcion}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Acciones Usuarios
  const handleDarBajaUsuario = (u: Usuario) => {
    if (u.id_usuario === user?.id_usuario) {
      showToast('No puedes darte de baja a ti mismo', 'error');
      return;
    }

    const doDelete = async () => {
      try {
        await eliminarUsuario(u.id_usuario);
        showToast('Usuario dado de baja', 'success');
        await cargarDatos();
      } catch (e) {
        console.error(e);
        showToast('Error al actualizar usuario', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Deseas dar de baja al usuario "${u.nombre} ${u.apellido}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Dar de baja usuario', `¿Deseas dar de baja a ${u.nombre} ${u.apellido}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      {/* Cabecera Admin */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.adminTitleRow}>
            <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
            <Text style={styles.headerTitle}>Panel Administrativo</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Usuarios, comercios, catálogo y actividad de compras
          </Text>
        </View>
        <TouchableOpacity onPress={() => void cargarDatos()} disabled={cargando} style={styles.refreshButton} accessibilityRole="button" accessibilityLabel="Actualizar resumen administrativo">
          <Ionicons name="refresh-outline" size={19} color="#166534" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        style={styles.summaryScroll}
        contentContainerStyle={styles.summaryStrip}
        showsHorizontalScrollIndicator={false}>
        <AdminMetric icon="storefront-outline" label="Comercios" value={comercios.length} tint="green" />
        <AdminMetric icon="people-outline" label="Usuarios" value={usuarios.length} tint="blue" />
        <AdminMetric icon="basket-outline" label="Productos activos" value={productosActivos} tint="amber" />
        <AdminMetric icon="pricetags-outline" label="Categorías" value={categorias.length} tint="purple" />
        <AdminMetric icon="receipt-outline" label="Compras registradas" value={comprasRegistradas.cantidad} tint="green" />
        <AdminMetric icon="cash-outline" label="Valor de compras" value={`$${comprasRegistradas.total.toLocaleString('es-CO')}`} tint="blue" />
      </ScrollView>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#64748b" />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={`Buscar ${activeTab === 'comercios' ? 'comercios' : activeTab === 'usuarios' ? 'usuarios' : 'categorías'}`}
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {busqueda ? <TouchableOpacity onPress={() => setBusqueda('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda"><Ionicons name="close-circle" size={18} color="#94a3b8" /></TouchableOpacity> : null}
      </View>

      {/* Selector de Pestañas */}
      <View style={styles.tabsNav}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'comercios' && styles.tabButtonActive]}
          onPress={() => setActiveTab('comercios')}
        >
          <Ionicons
            name="storefront-outline"
            size={18}
            color={activeTab === 'comercios' ? '#16a34a' : '#64748b'}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'comercios' && styles.tabButtonTextActive]}
          >
            Comercios ({comercios.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'usuarios' && styles.tabButtonActive]}
          onPress={() => setActiveTab('usuarios')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'usuarios' ? '#16a34a' : '#64748b'}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'usuarios' && styles.tabButtonTextActive]}
          >
            Usuarios ({usuarios.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'categorias' && styles.tabButtonActive]}
          onPress={() => setActiveTab('categorias')}
        >
          <Ionicons
            name="pricetags-outline"
            size={18}
            color={activeTab === 'categorias' ? '#16a34a' : '#64748b'}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'categorias' && styles.tabButtonTextActive]}
          >
            Categorías ({categorias.length})
          </Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentList}>
          {/* SECCIÓN COMERCIOS */}
          {activeTab === 'comercios' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Comercios Afiliados</Text>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={abrirNuevoComercio}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Nuevo Comercio</Text>
                </TouchableOpacity>
              </View>

              {comerciosVisibles.length === 0 ? (
                <Text style={styles.emptyNotice}>{query ? 'No encontramos comercios con esa búsqueda.' : 'No hay comercios registrados.'}</Text>
              ) : (
                comerciosVisibles.map((c) => (
                  <View key={c.id_comercio} style={styles.itemCard}>
                    <View style={styles.itemIconWrapper}>
                      <Ionicons name="storefront" size={22} color="#16a34a" />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{c.nombre}</Text>
                      {c.tipo_comercio && (
                        <Text style={styles.itemSub}>{c.tipo_comercio}</Text>
                      )}
                      {c.direccion && (
                        <Text style={styles.itemDetail}>📍 {c.direccion}</Text>
                      )}
                      {c.telefono && (
                        <Text style={styles.itemDetail}>📞 {c.telefono}</Text>
                      )}
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={() => abrirEdicionComercio(c)} style={styles.itemEditBtn} accessibilityRole="button" accessibilityLabel={`Editar ${c.nombre}`}>
                        <Ionicons name="create-outline" size={19} color="#166534" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEliminarComercio(c)} style={styles.itemDeleteBtn} accessibilityRole="button" accessibilityLabel={`Dar de baja ${c.nombre}`}>
                        <Ionicons name="trash-outline" size={19} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* SECCIÓN USUARIOS */}
          {activeTab === 'usuarios' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Usuarios del Sistema</Text>
              </View>

              {usuariosVisibles.length === 0 ? (
                <Text style={styles.emptyNotice}>{query ? 'No encontramos usuarios con esa búsqueda.' : 'No hay usuarios activos.'}</Text>
              ) : (
                usuariosVisibles.map((u) => {
                  const esAdmin = u.rol === 'admin';
                  const esComercio = u.rol === 'comercio';
                  const comAsociado = comercios.find((c) => c.id_comercio === u.id_comercio);

                  return (
                    <View key={u.id_usuario} style={styles.itemCard}>
                      <View
                        style={[
                          styles.itemIconWrapper,
                          esAdmin
                            ? styles.adminIconWrapper
                            : esComercio
                            ? styles.comercioIconWrapper
                            : null,
                        ]}
                      >
                        <Ionicons
                          name={
                            esAdmin
                              ? 'shield-checkmark'
                              : esComercio
                              ? 'storefront'
                              : 'person'
                          }
                          size={22}
                          color={
                            esAdmin
                              ? '#b45309'
                              : esComercio
                              ? '#0284c7'
                              : '#16a34a'
                          }
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={styles.itemName}>
                            {u.nombre} {u.apellido}
                          </Text>
                          <View
                            style={[
                              styles.miniRoleBadge,
                              esAdmin
                                ? styles.adminMiniBadge
                                : esComercio
                                ? styles.comercioMiniBadge
                                : styles.userMiniBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniRoleText,
                                esAdmin
                                  ? styles.adminMiniText
                                  : esComercio
                                  ? styles.comercioMiniText
                                  : styles.userMiniText,
                              ]}
                            >
                              {esAdmin ? 'Admin' : esComercio ? 'Comercio' : 'Usuario'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.itemSub}>{u.correo}</Text>
                        {esComercio && (
                          <Text style={styles.itemDetail}>
                            🏬 Tienda: {comAsociado ? comAsociado.nombre : 'No asignado'}
                          </Text>
                        )}
                        {u.telefono && (
                          <Text style={styles.itemDetail}>📞 {u.telefono}</Text>
                        )}
                        <Text style={styles.itemDetail}>
                          Registrado: {u.fecha_creacion}
                        </Text>
                      </View>

                      {!esAdmin && (
                        <TouchableOpacity
                          onPress={() => handleDarBajaUsuario(u)}
                          style={styles.itemDeleteBtn}
                        >
                          <Ionicons name="person-remove-outline" size={19} color="#dc2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* SECCIÓN CATEGORÍAS */}
          {activeTab === 'categorias' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categorías de Productos</Text>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setModalCategoria(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Nueva Categoría</Text>
                </TouchableOpacity>
              </View>

              {categoriasVisibles.length === 0 ? (
                <Text style={styles.emptyNotice}>{query ? 'No encontramos categorías con esa búsqueda.' : 'No hay categorías registradas.'}</Text>
              ) : (
                categoriasVisibles.map((cat) => (
                  <View key={cat.id_categoria} style={styles.itemCard}>
                    <View style={styles.itemIconWrapper}>
                      <Ionicons name="pricetag" size={22} color="#16a34a" />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{cat.descripcion}</Text>
                      <Text style={styles.itemDetail}>ID: #{cat.id_categoria}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleEliminarCategoria(cat)}
                      style={styles.itemDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={19} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL CREAR COMERCIO */}
      <Modal
        visible={modalComercio}
        animationType="slide"
        transparent
        onRequestClose={() => setModalComercio(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{comercioEnEdicion ? 'Editar Comercio' : 'Registrar Comercio'}</Text>
              <TouchableOpacity onPress={() => setModalComercio(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.fieldLabel}>Nombre del Comercio *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Supermercado Éxito"
                value={comNombre}
                onChangeText={setComNombre}
              />

              <Text style={styles.fieldLabel}>Tipo de Comercio</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Supermercado, Tienda de Barrio, Mayorista"
                value={comTipo}
                onChangeText={setComTipo}
              />

              <Text style={styles.fieldLabel}>Dirección</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Calle 45 # 12-34"
                value={comDireccion}
                onChangeText={setComDireccion}
              />

              <Text style={styles.fieldLabel}>Teléfono</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 3001234567"
                keyboardType="phone-pad"
                value={comTelefono}
                onChangeText={setComTelefono}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalComercio(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleGuardarComercio}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{comercioEnEdicion ? 'Guardar cambios' : 'Guardar'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR CATEGORÍA */}
      <Modal
        visible={modalCategoria}
        animationType="slide"
        transparent
        onRequestClose={() => setModalCategoria(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Categoría</Text>
              <TouchableOpacity onPress={() => setModalCategoria(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Descripción *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Frutas y Verduras, Granos, Lácteos"
              value={catDescripcion}
              onChangeText={setCatDescripcion}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalCategoria(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCrearCategoria}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AdminMetric({
  icon,
  label,
  value,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  tint: 'green' | 'blue' | 'amber' | 'purple';
}) {
  const background = tint === 'blue'
    ? styles.metricIcon_blue
    : tint === 'amber'
      ? styles.metricIcon_amber
      : tint === 'purple'
        ? styles.metricIcon_purple
        : styles.metricIcon_green;
  const color = tint === 'blue' ? '#0369a1' : tint === 'amber' ? '#b45309' : tint === 'purple' ? '#7e22ce' : '#15803d';
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, background]}><Ionicons name={icon} size={17} color={color} /></View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headerCopy: { flex: 1 },
  refreshButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#dcfce7' },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#16a34a',
    marginTop: 2,
  },
  summaryScroll: { height: 116, flexGrow: 0, flexShrink: 0, marginBottom: 2 },
  summaryStrip: { minHeight: 116, alignItems: 'center', gap: 9, paddingHorizontal: 20 },
  metricCard: { width: 112, height: 100, padding: 11, borderRadius: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dcfce7', gap: 5 },
  metricIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  metricIcon_green: { backgroundColor: '#dcfce7' },
  metricIcon_blue: { backgroundColor: '#e0f2fe' },
  metricIcon_amber: { backgroundColor: '#fef3c7' },
  metricIcon_purple: { backgroundColor: '#f3e8ff' },
  metricValue: { color: '#14532d', fontSize: 16, fontWeight: '800' },
  metricLabel: { color: '#64748b', fontSize: 9, fontWeight: '600' },
  searchBox: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 11, paddingHorizontal: 12, borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, backgroundColor: '#ffffff' },
  searchInput: { flex: 1, minHeight: 40, color: '#0f172a', fontSize: 12 },
  tabsNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#dcfce7',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#14532d',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#15803d',
    fontSize: 14,
  },
  contentList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyNotice: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 24,
    fontSize: 14,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminIconWrapper: {
    backgroundColor: '#fef3c7',
  },
  comercioIconWrapper: {
    backgroundColor: '#e0f2fe',
  },
  itemInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 1,
    fontWeight: '500',
  },
  itemDetail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  miniRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniRoleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  adminMiniBadge: {
    backgroundColor: '#fef3c7',
  },
  adminMiniText: {
    color: '#b45309',
  },
  comercioMiniBadge: {
    backgroundColor: '#e0f2fe',
  },
  comercioMiniText: {
    color: '#0284c7',
  },
  userMiniBadge: {
    backgroundColor: '#f1f5f9',
  },
  userMiniText: {
    color: '#64748b',
  },
  itemDeleteBtn: {
    padding: 8,
  },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  itemEditBtn: { padding: 8 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '90%',
    padding: 20,
    boxShadow: '0px 10px 25px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14532d',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    minWidth: 90,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Restringido
  restrictedContainer: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  restrictedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0px 4px 12px rgba(220, 38, 38, 0.1)',
  },
  restrictedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  restrictedDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  restrictedHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
