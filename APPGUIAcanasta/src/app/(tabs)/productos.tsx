import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { Producto, Comercio, Categoria } from '@/types/database';
import {
  crearProducto,
  obtenerProductos,
  actualizarProducto,
  eliminarProducto,
} from '@/repositories/productoRepository';
import { obtenerComercios } from '@/repositories/comercioRepository';
import { obtenerCategorias } from '@/repositories/categoriaRepository';
import { Toast, ToastType } from '@/components/toast';

export default function ProductosScreen() {
  const { user, isAdmin, isComercio } = useAuth();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Filtro para usuarios comercio: ver todos o ver solo los suyos
  const [soloMisProductos, setSoloMisProductos] = useState(false);

  // Modal para agregar o editar producto
  const [modalVisible, setModalVisible] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('Unidad');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [comercioSeleccionado, setComercioSeleccionado] = useState<number | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  };

  // Determinar el comercio asociado al usuario actual si es rol 'comercio'
  const miComercioId = user?.id_comercio ?? null;
  const miComercio = comercios.find((c) => c.id_comercio === miComercioId);

  const puedeGestionarProducto = (prod: Producto): boolean => {
    if (isAdmin) return true;
    if (isComercio && miComercioId !== null && prod.id_comercio === miComercioId) {
      return true;
    }
    return false;
  };

  const puedeAgregar = isAdmin || (isComercio && miComercioId !== null);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const [prods, coms, cats] = await Promise.all([
        obtenerProductos(),
        obtenerComercios(),
        obtenerCategorias(),
      ]);
      setProductos(prods || []);
      setComercios(coms || []);
      setCategorias(cats || []);
    } catch (error) {
      console.error(error);
      showToast('Error cargando los productos', 'error');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setCargando(true);
        const [prods, coms, cats] = await Promise.all([
          obtenerProductos(),
          obtenerComercios(),
          obtenerCategorias(),
        ]);
        if (active) {
          setProductos(prods || []);
          setComercios(coms || []);
          setCategorias(cats || []);
          if (cats && cats.length > 0) {
            setCategoriaSeleccionada(cats[0].id_categoria);
          }
          if (coms && coms.length > 0) {
            setComercioSeleccionado(coms[0].id_comercio);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setCargando(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const abrirModalCrear = () => {
    setProductoEnEdicion(null);
    setNombre('');
    setMarca('');
    setDescripcion('');
    setUnidadMedida('Unidad');
    if (categorias.length > 0) {
      setCategoriaSeleccionada(categorias[0].id_categoria);
    }
    if (isComercio && miComercioId) {
      setComercioSeleccionado(miComercioId);
    } else if (comercios.length > 0) {
      setComercioSeleccionado(comercios[0].id_comercio);
    }
    setModalVisible(true);
  };

  const abrirModalEditar = (prod: Producto) => {
    if (!puedeGestionarProducto(prod)) {
      showToast('No tienes permiso para editar este producto', 'error');
      return;
    }
    setProductoEnEdicion(prod);
    setNombre(prod.nombre);
    setMarca(prod.marca || '');
    setDescripcion(prod.descripcion || '');
    setUnidadMedida(prod.unidad_medida || 'Unidad');
    setCategoriaSeleccionada(prod.id_categoria);
    setComercioSeleccionado(prod.id_comercio ?? (miComercioId || 1));
    setModalVisible(true);
  };

  const handleGuardarProducto = async () => {
    if (!puedeAgregar && !productoEnEdicion) {
      showToast('No tienes permisos para agregar productos', 'error');
      return;
    }
    if (!nombre.trim()) {
      showToast('El nombre del producto es obligatorio', 'error');
      return;
    }
    if (!categoriaSeleccionada) {
      showToast('Selecciona o registra una categoría', 'error');
      return;
    }

    // Para usuario comercio, forzar siempre su comercio asignado
    const comercioFinal = isComercio && miComercioId ? miComercioId : (comercioSeleccionado || 1);

    try {
      setGuardando(true);
      if (productoEnEdicion) {
        if (!puedeGestionarProducto(productoEnEdicion)) {
          showToast('No tienes permiso para editar este producto', 'error');
          return;
        }
        await actualizarProducto(
          productoEnEdicion.id_producto,
          categoriaSeleccionada,
          comercioFinal,
          nombre.trim(),
          unidadMedida.trim() || 'Unidad',
          marca.trim() || undefined,
          descripcion.trim() || undefined
        );
        showToast('Producto actualizado exitosamente', 'success');
      } else {
        await crearProducto(
          categoriaSeleccionada,
          comercioFinal,
          nombre.trim(),
          unidadMedida.trim() || 'Unidad',
          marca.trim() || undefined,
          descripcion.trim() || undefined
        );
        showToast('Producto añadido exitosamente', 'success');
      }

      setModalVisible(false);
      await cargarDatos();
    } catch (error) {
      console.error(error);
      showToast('No se pudo guardar el producto', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarProducto = async (prod: Producto) => {
    if (!puedeGestionarProducto(prod)) {
      showToast('No tienes permiso para eliminar este producto', 'error');
      return;
    }

    const doDelete = async () => {
      try {
        await eliminarProducto(prod.id_producto);
        showToast('Producto eliminado', 'success');
        await cargarDatos();
      } catch (err) {
        console.error(err);
        showToast('Error al eliminar', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Estás seguro de eliminar el producto "${prod.nombre}"?`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Confirmar eliminación',
        `¿Deseas eliminar el producto "${prod.nombre}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  // Filtrado de productos por texto y por pestaña de "Mis Productos" (si es comercio)
  const productosFiltrados = productos.filter((p) => {
    if (isComercio && soloMisProductos) {
      if (p.id_comercio !== miComercioId) return false;
    }
    const matchBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.marca && p.marca.toLowerCase().includes(busqueda.toLowerCase()));
    return matchBusqueda;
  });

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Catálogo de Productos</Text>
          <Text style={styles.headerSubtitle}>
            {isAdmin
              ? 'Administrador: Control total del catálogo'
              : isComercio
              ? `Comercio: ${miComercio ? miComercio.nombre : 'Tu tienda'}`
              : 'Explora los mejores precios de la canasta'}
          </Text>
        </View>

        {puedeAgregar && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={abrirModalCrear}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Añadir</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro rápido para rol comercio */}
      {isComercio && miComercioId && (
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, !soloMisProductos && styles.filterTabActive]}
            onPress={() => setSoloMisProductos(false)}
          >
            <Ionicons
              name="globe-outline"
              size={15}
              color={!soloMisProductos ? '#15803d' : '#64748b'}
            />
            <Text
              style={[
                styles.filterTabText,
                !soloMisProductos && styles.filterTabTextActive,
              ]}
            >
              Todos los productos ({productos.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, soloMisProductos && styles.filterTabActive]}
            onPress={() => setSoloMisProductos(true)}
          >
            <Ionicons
              name="storefront"
              size={15}
              color={soloMisProductos ? '#15803d' : '#64748b'}
            />
            <Text
              style={[
                styles.filterTabText,
                soloMisProductos && styles.filterTabTextActive,
              ]}
            >
              Mis Productos ({productos.filter((p) => p.id_comercio === miComercioId).length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o marca..."
          placeholderTextColor="#94a3b8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Banner explicativo según rol */}
      {!isAdmin && !isComercio && (
        <View style={styles.userBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#15803d" />
          <Text style={styles.userBannerText}>
            {user
              ? 'Has iniciado como Usuario Común. Puedes consultar productos y agregarlos a tu lista de compras.'
              : 'Inicia sesión como Administrador o Comercio para gestionar productos.'}
          </Text>
        </View>
      )}

      {isComercio && (
        <View style={styles.comercioBanner}>
          <Ionicons name="storefront-outline" size={18} color="#0369a1" />
          <Text style={styles.comercioBannerText}>
            Como comercio, puedes añadir nuevos productos a tu catálogo y editar o eliminar exclusivamente los productos asociados a tu establecimiento ({miComercio ? miComercio.nombre : 'tu comercio'}).
          </Text>
        </View>
      )}

      {/* Lista de productos */}
      {cargando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : productosFiltrados.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="basket-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No hay productos disponibles</Text>
          <Text style={styles.emptySubtitle}>
            {busqueda
              ? 'No hay coincidencias con tu búsqueda.'
              : soloMisProductos
              ? 'Aún no has registrado productos para tu comercio.'
              : 'Aún no se han agregado productos.'}
          </Text>
          {soloMisProductos && puedeAgregar && (
            <TouchableOpacity
              style={[styles.addButton, { marginTop: 14 }]}
              onPress={abrirModalCrear}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Añadir mi primer producto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {productosFiltrados.map((item) => {
            const cat = categorias.find((c) => c.id_categoria === item.id_categoria);
            const com = comercios.find((c) => c.id_comercio === item.id_comercio);
            const esMio = isComercio && item.id_comercio === miComercioId;
            const tengoPermiso = puedeGestionarProducto(item);

            return (
              <View
                key={item.id_producto}
                style={[
                  styles.productCard,
                  esMio && styles.productCardPropio,
                ]}
              >
                <View style={[styles.productIconWrapper, esMio && styles.productIconWrapperPropio]}>
                  <Ionicons
                    name={esMio ? 'storefront' : 'basket'}
                    size={24}
                    color={esMio ? '#0284c7' : '#16a34a'}
                  />
                </View>

                <View style={styles.productInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.productName}>{item.nombre}</Text>
                    {esMio && (
                      <View style={styles.badgePropio}>
                        <Text style={styles.badgePropioText}>Tu Comercio</Text>
                      </View>
                    )}
                  </View>

                  {item.marca ? (
                    <Text style={styles.productBrand}>Marca: {item.marca}</Text>
                  ) : null}

                  <View style={styles.tagRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.unidad_medida}</Text>
                    </View>
                    {cat && (
                      <View style={[styles.tag, styles.categoryTag]}>
                        <Text style={styles.categoryTagText}>{cat.descripcion}</Text>
                      </View>
                    )}
                    {com && (
                      <View style={[styles.tag, styles.comercioTag]}>
                        <Ionicons name="storefront-outline" size={11} color="#92400e" />
                        <Text style={styles.comercioTagText}>{com.nombre}</Text>
                      </View>
                    )}
                  </View>

                  {item.descripcion ? (
                    <Text style={styles.productDesc}>{item.descripcion}</Text>
                  ) : null}
                </View>

                {tengoPermiso && (
                  <View style={styles.actionsColumn}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => abrirModalEditar(item)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="pencil-outline" size={18} color="#0284c7" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleEliminarProducto(item)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal para añadir / editar producto */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {productoEnEdicion ? 'Editar Producto' : 'Añadir Nuevo Producto'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Nombre del Producto *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Arroz Blanco 1kg"
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={styles.fieldLabel}>Marca (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Diana, Roa, Alpina..."
                value={marca}
                onChangeText={setMarca}
              />

              <Text style={styles.fieldLabel}>Unidad de Medida *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Unidad, Kg, Litro, Libra"
                value={unidadMedida}
                onChangeText={setUnidadMedida}
              />

              <Text style={styles.fieldLabel}>Categoría</Text>
              <View style={styles.pickerRow}>
                {categorias.map((cat) => (
                  <Pressable
                    key={cat.id_categoria}
                    onPress={() => setCategoriaSeleccionada(cat.id_categoria)}
                    style={[
                      styles.chip,
                      categoriaSeleccionada === cat.id_categoria && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        categoriaSeleccionada === cat.id_categoria && styles.chipTextSelected,
                      ]}
                    >
                      {cat.descripcion}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Selector de comercio: Solo editable por Administrador */}
              <Text style={styles.fieldLabel}>Comercio Asociado</Text>
              {isComercio ? (
                <View style={styles.fixedComercioCard}>
                  <Ionicons name="storefront" size={18} color="#0369a1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fixedComercioName}>
                      {miComercio ? miComercio.nombre : 'Tu Comercio'}
                    </Text>
                    <Text style={styles.fixedComercioHint}>
                      Ligado automáticamente a tu cuenta de comercio.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pickerRow}>
                  {comercios.map((com) => (
                    <Pressable
                      key={com.id_comercio}
                      onPress={() => setComercioSeleccionado(com.id_comercio)}
                      style={[
                        styles.chip,
                        comercioSeleccionado === com.id_comercio && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          comercioSeleccionado === com.id_comercio && styles.chipTextSelected,
                        ]}
                      >
                        {com.nombre}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Detalles sobre el producto..."
                multiline
                numberOfLines={3}
                value={descripcion}
                onChangeText={setDescripcion}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleGuardarProducto}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {productoEnEdicion ? 'Actualizar' : 'Guardar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 10,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    boxShadow: '0px 2px 6px rgba(22, 163, 74, 0.25)',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  filterTabActive: {
    backgroundColor: '#dcfce7',
  },
  filterTabText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#14532d',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  userBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#15803d',
    lineHeight: 16,
  },
  comercioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  comercioBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 16,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dcfce7',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
  },
  productCardPropio: {
    borderColor: '#bae6fd',
    backgroundColor: '#f8fafc',
  },
  productIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productIconWrapperPropio: {
    backgroundColor: '#e0f2fe',
  },
  productInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgePropio: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  badgePropioText: {
    fontSize: 10,
    color: '#0284c7',
    fontWeight: '700',
  },
  productBrand: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  categoryTag: {
    backgroundColor: '#e0f2fe',
  },
  categoryTagText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  comercioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
  },
  comercioTagText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '600',
  },
  productDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 16,
  },
  actionsColumn: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 8,
  },
  editButton: {
    padding: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    padding: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  modalScroll: {
    maxHeight: 420,
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
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
  },
  chipTextSelected: {
    color: '#15803d',
    fontWeight: '700',
  },
  fixedComercioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginTop: 4,
  },
  fixedComercioName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
  },
  fixedComercioHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
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
});
