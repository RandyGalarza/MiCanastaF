import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { Producto, Comercio, Categoria } from '@/types/database';
import {
  crearProducto,
  obtenerProductos,
  actualizarProducto,
  eliminarProducto,
} from '@/repositories/productoRepository';
import { guardarOActualizarPrecio } from '@/repositories/precioRepository';
import { obtenerComercios } from '@/repositories/comercioRepository';
import { obtenerCategorias } from '@/repositories/categoriaRepository';
import { Toast, ToastType } from '@/components/toast';
import { ProductImage } from '@/components/product-image';
import { getDemoDiscount } from '@/utils/demo-prices';

const UNIDADES_COMUNES = [
  'Unidad',
  'Kilogramo (kg)',
  'Gramo (g)',
  'Libra (lb)',
  'Litro (L)',
  'Mililitro (ml)',
  'Paquete',
  'Bolsa',
  'Caja',
  'Lata',
  'Docena',
  'Otro',
] as const;

type OrdenProductos = 'relevancia' | 'nombre' | 'precio_asc' | 'precio_desc';

function normalizarTextoBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Mapeo inteligente de iconos predeterminados de la canasta familiar
 * cuando el producto no tiene una foto personalizada
 */
function getProductDefaultIcon(
  idCategoria: number,
  nombre: string
): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  const n = nombre.toLowerCase();

  if (n.includes('leche') || n.includes('queso') || n.includes('suero') || n.includes('mantequilla') || n.includes('yogurt')) {
    return { name: 'water-outline', color: '#0284c7', bg: '#e0f2fe' };
  }
  if (n.includes('huevo')) {
    return { name: 'ellipse-outline', color: '#d97706', bg: '#fef3c7' };
  }
  if (n.includes('carne') || n.includes('pollo') || n.includes('pechuga') || n.includes('salchicha')) {
    return { name: 'restaurant-outline', color: '#b91c1c', bg: '#fee2e2' };
  }
  if (n.includes('pescado') || n.includes('sierra') || n.includes('lisa') || n.includes('atun') || n.includes('camaron')) {
    return { name: 'fish-outline', color: '#0369a1', bg: '#e0f2fe' };
  }
  if (n.includes('platano') || n.includes('guineo') || n.includes('banano') || n.includes('limon') || n.includes('fruta')) {
    return { name: 'nutrition-outline', color: '#15803d', bg: '#dcfce7' };
  }
  if (n.includes('yuca') || n.includes('papa') || n.includes('tomate') || n.includes('cebolla') || n.includes('aji') || n.includes('ajo')) {
    return { name: 'leaf-outline', color: '#16a34a', bg: '#dcfce7' };
  }
  if (n.includes('pan') || n.includes('galleta') || n.includes('torta') || n.includes('arepa') || n.includes('harina')) {
    return { name: 'pizza-outline', color: '#b45309', bg: '#fef3c7' };
  }
  if (n.includes('cafe') || n.includes('tinto') || n.includes('chocolate')) {
    return { name: 'cafe-outline', color: '#78350f', bg: '#fef3c7' };
  }
  if (n.includes('gaseosa') || n.includes('agua') || n.includes('jugo') || n.includes('bebida')) {
    return { name: 'pint-outline', color: '#2563eb', bg: '#dbeafe' };
  }
  if (n.includes('jabon') || n.includes('detergente') || n.includes('crema') || n.includes('papel') || n.includes('limpido') || n.includes('cloro')) {
    return { name: 'sparkles-outline', color: '#7c3aed', bg: '#f3e8ff' };
  }
  if (idCategoria === 1 || n.includes('arroz') || n.includes('frijol') || n.includes('lenteja') || n.includes('arveja')) {
    return { name: 'cube-outline', color: '#d97706', bg: '#fef3c7' };
  }

  return { name: 'basket-outline', color: '#16a34a', bg: '#f0fdf4' };
}

export default function ProductosScreen() {
  const { user, isAdmin, isComercio } = useAuth();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const [categoriasFiltro, setCategoriasFiltro] = useState<number[]>([]);
  const [comerciosFiltro, setComerciosFiltro] = useState<number[]>([]);
  const [soloConPrecio, setSoloConPrecio] = useState(false);
  const [ordenProductos, setOrdenProductos] = useState<OrdenProductos>('relevancia');

  // Filtro para usuarios comercio: ver todos o ver solo los suyos
  const [soloMisProductos, setSoloMisProductos] = useState(false);

  // Modal para agregar o editar producto
  const [modalVisible, setModalVisible] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [precioInput, setPrecioInput] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('Unidad');
  const [otraUnidad, setOtraUnidad] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [mostrarDropdownUnidad, setMostrarDropdownUnidad] = useState(false);
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
  const categoriasPorId = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id_categoria, categoria])),
    [categorias]
  );
  const comerciosPorId = useMemo(
    () => new Map(comercios.map((comercio) => [comercio.id_comercio, comercio])),
    [comercios]
  );

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

  const seleccionarImagen = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso denegado',
          'Se necesita acceso a la galería para seleccionar la foto del producto.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagenUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
      showToast('No se pudo cargar la imagen', 'error');
    }
  };

  const abrirModalCrear = () => {
    setProductoEnEdicion(null);
    setNombre('');
    setMarca('');
    setPrecioInput('');
    setDescripcion('');
    setUnidadMedida('Unidad');
    setOtraUnidad('');
    setImagenUrl('');
    setMostrarDropdownUnidad(false);
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
    setPrecioInput(prod.precio ? String(prod.precio) : '');
    setDescripcion(prod.descripcion || '');
    setImagenUrl(prod.imagen_url || '');
    setMostrarDropdownUnidad(false);

    const matchUnidad = UNIDADES_COMUNES.find(
      (u) => u.toLowerCase() === (prod.unidad_medida || '').toLowerCase()
    );
    if (matchUnidad) {
      setUnidadMedida(matchUnidad);
      setOtraUnidad('');
    } else {
      setUnidadMedida('Otro');
      setOtraUnidad(prod.unidad_medida || '');
    }

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

    const unidadFinal =
      unidadMedida === 'Otro'
        ? otraUnidad.trim() || 'Otro'
        : unidadMedida;

    const comercioFinal = isComercio && miComercioId ? miComercioId : (comercioSeleccionado || 1);

    try {
      setGuardando(true);
      let targetProdId = productoEnEdicion?.id_producto;

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
          unidadFinal,
          marca.trim() || undefined,
          descripcion.trim() || undefined,
          imagenUrl.trim() || undefined
        );
        showToast('Producto actualizado exitosamente', 'success');
      } else {
        targetProdId = await crearProducto(
          categoriaSeleccionada,
          comercioFinal,
          nombre.trim(),
          unidadFinal,
          marca.trim() || undefined,
          descripcion.trim() || undefined,
          imagenUrl.trim() || undefined
        );
        showToast('Producto añadido exitosamente', 'success');
      }

      // Guardar precio si se especificó
      const precioNum = parseFloat(precioInput.replace(/[^0-9.]/g, ''));
      if (targetProdId && !isNaN(precioNum) && precioNum > 0) {
        await guardarOActualizarPrecio(targetProdId, comercioFinal, precioNum);
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

  const terminosBusqueda = normalizarTextoBusqueda(busqueda)
    .split(/\s+/)
    .filter(Boolean);
  const productosFiltrados = productos
    .filter((producto) => {
      if (isComercio && soloMisProductos && producto.id_comercio !== miComercioId) {
        return false;
      }
      if (categoriasFiltro.length > 0 && !categoriasFiltro.includes(producto.id_categoria)) {
        return false;
      }
      if (
        comerciosFiltro.length > 0 &&
        (producto.id_comercio === null || !comerciosFiltro.includes(producto.id_comercio))
      ) {
        return false;
      }

      const precio = Number(producto.precio);
      if (soloConPrecio && (!Number.isFinite(precio) || precio <= 0)) {
        return false;
      }

      const comercio = producto.id_comercio === null
        ? ''
        : comerciosPorId.get(producto.id_comercio)?.nombre ?? '';
      const categoria = categoriasPorId.get(producto.id_categoria)?.descripcion ?? '';
      const textoProducto = normalizarTextoBusqueda([
        producto.nombre,
        producto.marca ?? '',
        producto.descripcion ?? '',
        producto.unidad_medida,
        categoria,
        comercio,
      ].join(' '));

      return terminosBusqueda.every((termino) => textoProducto.includes(termino));
    })
    .sort((a, b) => {
      if (ordenProductos === 'nombre') {
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      }

      if (ordenProductos === 'precio_asc' || ordenProductos === 'precio_desc') {
        const precioA = Number(a.precio);
        const precioB = Number(b.precio);
        const tienePrecioA = Number.isFinite(precioA) && precioA > 0;
        const tienePrecioB = Number.isFinite(precioB) && precioB > 0;

        if (tienePrecioA !== tienePrecioB) return tienePrecioA ? -1 : 1;
        if (tienePrecioA && tienePrecioB && precioA !== precioB) {
          return ordenProductos === 'precio_asc' ? precioA - precioB : precioB - precioA;
        }
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      }

      if (terminosBusqueda.length > 0) {
        const score = (producto: Producto) => {
          const nombreNormalizado = normalizarTextoBusqueda(producto.nombre);
          const marcaNormalizada = normalizarTextoBusqueda(producto.marca ?? '');
          return terminosBusqueda.reduce(
            (total, termino) =>
              total +
              (nombreNormalizado === termino ? 5 : 0) +
              (nombreNormalizado.startsWith(termino) ? 3 : 0) +
              (nombreNormalizado.includes(termino) ? 2 : 0) +
              (marcaNormalizada.includes(termino) ? 1 : 0),
            0
          );
        };
        const diferenciaRelevancia = score(b) - score(a);
        if (diferenciaRelevancia !== 0) return diferenciaRelevancia;
      }

      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });

  const cantidadFiltrosActivos =
    categoriasFiltro.length +
    comerciosFiltro.length +
    Number(soloConPrecio) +
    Number(ordenProductos !== 'relevancia');

  const alternarCategoriaFiltro = (idCategoria: number) => {
    setCategoriasFiltro((actuales) =>
      actuales.includes(idCategoria)
        ? actuales.filter((id) => id !== idCategoria)
        : [...actuales, idCategoria]
    );
  };

  const alternarComercioFiltro = (idComercio: number) => {
    setComerciosFiltro((actuales) =>
      actuales.includes(idComercio)
        ? actuales.filter((id) => id !== idComercio)
        : [...actuales, idComercio]
    );
  };

  const limpiarBusquedaYFiltros = () => {
    setBusqueda('');
    setCategoriasFiltro([]);
    setComerciosFiltro([]);
    setSoloConPrecio(false);
    setOrdenProductos('relevancia');
  };

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      <Modal
        visible={filtrosVisibles}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltrosVisibles(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filtrar productos</Text>
                <Text style={styles.filterModalSubtitle}>
                  Puedes elegir varias opciones y quitarlas cuando quieras
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFiltrosVisibles(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar filtros"
                style={styles.closeFiltersButton}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterModalScroll}
              contentContainerStyle={styles.filterModalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.filterSectionTitle}>Categoría</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={[styles.chip, categoriasFiltro.length === 0 && styles.chipSelected]}
                  onPress={() => setCategoriasFiltro([])}
                  accessibilityRole="button"
                  accessibilityState={{ selected: categoriasFiltro.length === 0 }}
                >
                  <Text style={[styles.chipText, categoriasFiltro.length === 0 && styles.chipTextSelected]}>
                    Todas
                  </Text>
                </TouchableOpacity>
                {categorias.map((categoria) => {
                  const seleccionada = categoriasFiltro.includes(categoria.id_categoria);
                  return (
                  <TouchableOpacity
                    key={categoria.id_categoria}
                    style={[
                      styles.chip,
                      seleccionada && styles.chipSelected,
                    ]}
                    onPress={() => alternarCategoriaFiltro(categoria.id_categoria)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionada }}
                  >
                    <View style={styles.multiSelectChipContent}>
                      <Text
                        style={[
                          styles.chipText,
                          seleccionada && styles.chipTextSelected,
                        ]}
                      >
                        {categoria.descripcion}
                      </Text>
                      {seleccionada && <Ionicons name="checkmark-circle" size={14} color="#15803d" />}
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Comercio</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={[styles.chip, comerciosFiltro.length === 0 && styles.chipSelected]}
                  onPress={() => setComerciosFiltro([])}
                  accessibilityRole="button"
                  accessibilityState={{ selected: comerciosFiltro.length === 0 }}
                >
                  <Text style={[styles.chipText, comerciosFiltro.length === 0 && styles.chipTextSelected]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {comercios.map((comercio) => {
                  const seleccionado = comerciosFiltro.includes(comercio.id_comercio);
                  return (
                  <TouchableOpacity
                    key={comercio.id_comercio}
                    style={[
                      styles.chip,
                      seleccionado && styles.chipSelected,
                    ]}
                    onPress={() => alternarComercioFiltro(comercio.id_comercio)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionado }}
                  >
                    <View style={styles.multiSelectChipContent}>
                      <Text
                        style={[
                          styles.chipText,
                          seleccionado && styles.chipTextSelected,
                        ]}
                      >
                        {comercio.nombre}
                      </Text>
                      {seleccionado && <Ionicons name="checkmark-circle" size={14} color="#15803d" />}
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Precio</Text>
              <TouchableOpacity
                style={styles.priceFilterOption}
                onPress={() => setSoloConPrecio((actual) => !actual)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: soloConPrecio }}
              >
                <Ionicons
                  name={soloConPrecio ? 'checkbox' : 'square-outline'}
                  size={21}
                  color={soloConPrecio ? '#15803d' : '#64748b'}
                />
                <View style={styles.priceFilterCopy}>
                  <Text style={styles.priceFilterTitle}>Solo productos con precio</Text>
                  <Text style={styles.priceFilterHint}>Oculta productos cuyo precio está por consultar</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.filterSectionTitle}>Ordenar por</Text>
              <View style={styles.pickerRow}>
                {([
                  ['relevancia', 'Más relevantes'],
                  ['nombre', 'Nombre A-Z'],
                  ['precio_asc', 'Menor precio'],
                  ['precio_desc', 'Mayor precio'],
                ] as const).map(([orden, etiqueta]) => (
                  <TouchableOpacity
                    key={orden}
                    style={[styles.chip, ordenProductos === orden && styles.chipSelected]}
                    onPress={() => setOrdenProductos(orden)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ordenProductos === orden }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        ordenProductos === orden && styles.chipTextSelected,
                      ]}
                    >
                      {etiqueta}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={limpiarBusquedaYFiltros}
                accessibilityRole="button"
              >
                <Text style={styles.clearFiltersText}>Limpiar todo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setFiltrosVisibles(false)}
                accessibilityRole="button"
              >
                <Text style={styles.applyFiltersText}>
                  Ver {productosFiltrados.length} resultados
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Catálogo de Productos</Text>
          <Text style={styles.headerSubtitle}>
            {isAdmin
              ? 'Administrador: Control total del catálogo'
              : isComercio
              ? `Comercio: ${miComercio ? miComercio.nombre : 'Tu tienda'}`
              : 'Explora los mejores precios en Riohacha'}
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

      {/* Buscador y filtros */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Producto, marca, categoría o tienda"
            placeholderTextColor="#94a3b8"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar productos por nombre, marca, categoría o tienda"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={19} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.openFiltersButton, cantidadFiltrosActivos > 0 && styles.openFiltersButtonActive]}
          onPress={() => setFiltrosVisibles(true)}
          accessibilityRole="button"
          accessibilityLabel={
            cantidadFiltrosActivos > 0
              ? `Abrir filtros, ${cantidadFiltrosActivos} filtros activos`
              : 'Abrir filtros de productos'
          }
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={cantidadFiltrosActivos > 0 ? '#15803d' : '#334155'}
          />
          <Text
            style={[
              styles.openFiltersText,
              cantidadFiltrosActivos > 0 && styles.openFiltersTextActive,
            ]}
          >
            Filtros{cantidadFiltrosActivos > 0 ? ` (${cantidadFiltrosActivos})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.resultsSummary}>
        <Text style={styles.resultsSummaryText}>
          {productosFiltrados.length === 1
            ? '1 producto encontrado'
            : `${productosFiltrados.length} productos encontrados`}
        </Text>
        {(busqueda.trim().length > 0 || cantidadFiltrosActivos > 0) && (
          <TouchableOpacity
            onPress={limpiarBusquedaYFiltros}
            accessibilityRole="button"
            accessibilityLabel="Quitar búsqueda y todos los filtros"
          >
            <Text style={styles.clearSearchText}>Borrar búsqueda y filtros</Text>
          </TouchableOpacity>
        )}
      </View>
      {cantidadFiltrosActivos > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersContent}
          style={styles.activeFiltersScroll}
          keyboardShouldPersistTaps="handled"
        >
          {categoriasFiltro.map((idCategoria) => {
            const categoria = categoriasPorId.get(idCategoria);
            if (!categoria) return null;
            return (
              <TouchableOpacity
                key={`categoria-${idCategoria}`}
                style={styles.activeFilterChip}
                onPress={() => alternarCategoriaFiltro(idCategoria)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar filtro de categoría ${categoria.descripcion}`}
              >
                <Text style={styles.activeFilterChipText} numberOfLines={1}>
                  {categoria.descripcion}
                </Text>
                <Ionicons name="close-circle" size={16} color="#15803d" />
              </TouchableOpacity>
            );
          })}
          {comerciosFiltro.map((idComercio) => {
            const comercio = comerciosPorId.get(idComercio);
            if (!comercio) return null;
            return (
              <TouchableOpacity
                key={`comercio-${idComercio}`}
                style={styles.activeFilterChip}
                onPress={() => alternarComercioFiltro(idComercio)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar filtro de comercio ${comercio.nombre}`}
              >
                <Text style={styles.activeFilterChipText} numberOfLines={1}>
                  {comercio.nombre}
                </Text>
                <Ionicons name="close-circle" size={16} color="#15803d" />
              </TouchableOpacity>
            );
          })}
          {soloConPrecio && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => setSoloConPrecio(false)}
              accessibilityRole="button"
              accessibilityLabel="Quitar filtro de productos con precio"
            >
              <Text style={styles.activeFilterChipText}>Con precio</Text>
              <Ionicons name="close-circle" size={16} color="#15803d" />
            </TouchableOpacity>
          )}
          {ordenProductos !== 'relevancia' && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => setOrdenProductos('relevancia')}
              accessibilityRole="button"
              accessibilityLabel="Quitar orden personalizado"
            >
              <Text style={styles.activeFilterChipText}>
                {ordenProductos === 'nombre'
                  ? 'Nombre A-Z'
                  : ordenProductos === 'precio_asc'
                  ? 'Menor precio'
                  : 'Mayor precio'}
              </Text>
              <Ionicons name="close-circle" size={16} color="#15803d" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Banner para comercio */}
      {isComercio && (
        <View style={styles.comercioBanner}>
          <Ionicons name="storefront-outline" size={18} color="#0369a1" />
          <Text style={styles.comercioBannerText}>
            Gestionando los productos de {miComercio ? miComercio.nombre : 'tu comercio'}. Puedes añadir fotos reales y editar los precios.
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
              ? 'Prueba con otros términos o quita algunos filtros.'
              : soloMisProductos
              ? 'Aún no has registrado productos para tu comercio.'
              : 'No hay productos que coincidan con los filtros seleccionados.'}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.productList}
          contentContainerStyle={styles.listContent}
          data={productosFiltrados}
          keyExtractor={(item) => String(item.id_producto)}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const cat = categoriasPorId.get(item.id_categoria);
            const com = item.id_comercio === null ? undefined : comerciosPorId.get(item.id_comercio);
            const esMio = isComercio && item.id_comercio === miComercioId;
            const tengoPermiso = puedeGestionarProducto(item);
            const iconInfo = getProductDefaultIcon(item.id_categoria, item.nombre);
            const demoDiscount = getDemoDiscount(item.nombre, item.precio);

            return (
              <View
                key={item.id_producto}
                style={[
                  styles.productCard,
                  esMio && styles.productCardPropio,
                ]}
              >
                {/* Imagen del producto o Icono temático */}
                <View style={[styles.productImageWrapper, { backgroundColor: iconInfo.bg }]}>
                  <ProductImage
                    productName={item.nombre}
                    imageUrl={item.imagen_url}
                    style={styles.productImage}
                    fallback={
                    <Ionicons
                      name={iconInfo.name}
                      size={28}
                      color={iconInfo.color}
                    />
                    }
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
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                  ) : null}

                  {/* Precio del producto */}
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Precio:</Text>
                    {demoDiscount ? (
                      <View style={styles.discountPriceGroup}>
                        <Text style={styles.priceValue}>${demoDiscount.salePrice.toLocaleString('es-CO')}</Text>
                        <Text style={styles.originalPrice}>${demoDiscount.originalPrice.toLocaleString('es-CO')}</Text>
                        <View style={styles.discountBadge}><Text style={styles.discountBadgeText}>-{demoDiscount.percentage}% DEMO</Text></View>
                      </View>
                    ) : item.precio ? (
                      <Text style={styles.priceValue}>${Number(item.precio).toLocaleString('es-CO')}</Text>
                    ) : (
                      <Text style={styles.pricePending}>Por consultar</Text>
                    )}
                  </View>
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
          }}
        />
      )}

      {/* Modal para añadir / editar producto con selector de imagen */}
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
              {/* Selector / Vista Previa de Imagen del Producto */}
              <Text style={styles.fieldLabel}>Foto o Imagen del Producto</Text>
              <View style={styles.imagePickerRow}>
                <TouchableOpacity
                  style={styles.imagePreviewBox}
                  onPress={seleccionarImagen}
                  activeOpacity={0.8}
                >
                  {imagenUrl ? (
                    <Image
                      source={{ uri: imagenUrl }}
                      style={styles.previewImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color="#16a34a" />
                      <Text style={styles.imagePlaceholderText}>
                        Tocar para insertar imagen
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {imagenUrl ? (
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setImagenUrl('')}
                  >
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    <Text style={styles.removeImageText}>Quitar imagen</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>Nombre del Producto *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Arroz Blanco 1kg, Queso Costeño..."
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={styles.fieldLabel}>Marca (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Diana, Roa, Colanta, Alpina..."
                value={marca}
                onChangeText={setMarca}
              />

              <Text style={styles.fieldLabel}>Precio en Pesos Colombianos ($ COP) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 4500"
                keyboardType="numeric"
                value={precioInput}
                onChangeText={setPrecioInput}
              />

              <Text style={styles.fieldLabel}>Unidad de Medida *</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setMostrarDropdownUnidad(!mostrarDropdownUnidad)}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownLeft}>
                  <Ionicons name="scale-outline" size={18} color="#16a34a" />
                  <Text style={styles.dropdownTriggerText}>{unidadMedida}</Text>
                </View>
                <Ionicons
                  name={mostrarDropdownUnidad ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748b"
                />
              </TouchableOpacity>

              {mostrarDropdownUnidad && (
                <View style={styles.dropdownList}>
                  {UNIDADES_COMUNES.map((unidad) => {
                    const isSelected = unidadMedida === unidad;
                    return (
                      <TouchableOpacity
                        key={unidad}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setUnidadMedida(unidad);
                          setMostrarDropdownUnidad(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            isSelected && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {unidad}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#15803d" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {unidadMedida === 'Otro' && (
                <View style={styles.customUnitContainer}>
                  <Text style={styles.customUnitHint}>
                    Escribe la medida personalizada (ej. Atado, Ramillete, Mano):
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Escribe la unidad aquí..."
                    placeholderTextColor="#94a3b8"
                    value={otraUnidad}
                    onChangeText={setOtraUnidad}
                    autoFocus
                  />
                </View>
              )}

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

              <Text style={styles.fieldLabel}>Comercio Asociado</Text>
              {isComercio ? (
                <View style={styles.fixedComercioCard}>
                  <Ionicons name="storefront" size={18} color="#0369a1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fixedComercioName}>
                      {miComercio ? miComercio.nombre : 'Tu Comercio'}
                    </Text>
                    <Text style={styles.fixedComercioHint}>
                      Ligado automáticamente a tu cuenta de comercio en Riohacha.
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
    backgroundColor: '#f7f8f6',
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
    borderColor: '#e7ece7',
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8e1',
  },
  openFiltersButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  openFiltersButtonActive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  openFiltersText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  openFiltersTextActive: {
    color: '#15803d',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  resultsSummary: {
    minHeight: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  resultsSummaryText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  clearSearchText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
  },
  activeFiltersScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 20,
  },
  activeFilterChip: {
    maxWidth: 240,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  activeFilterChipText: {
    flexShrink: 1,
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
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
  productList: {
    flex: 1,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e7ece7',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
  },
  productCardPropio: {
    borderColor: '#bae6fd',
    backgroundColor: '#f8fafc',
  },
  productImageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
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
    fontSize: 15,
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
    marginTop: 4,
    lineHeight: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803d',
  },
  pricePending: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
  },
  discountPriceGroup: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  originalPrice: { color: '#94a3b8', fontSize: 11, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: '#fef3c7', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  discountBadgeText: { color: '#92400e', fontSize: 9, fontWeight: '800' },
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
    maxHeight: 460,
  },
  filterModalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 10px 25px rgba(0,0,0,0.15)',
  },
  filterModalSubtitle: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 12,
  },
  closeFiltersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  filterModalScroll: {
    flexShrink: 1,
  },
  filterModalContent: {
    paddingBottom: 12,
  },
  filterSectionTitle: {
    marginTop: 12,
    marginBottom: 3,
    color: '#14532d',
    fontSize: 14,
    fontWeight: '800',
  },
  priceFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  priceFilterCopy: {
    flex: 1,
  },
  priceFilterTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  priceFilterHint: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 11,
  },
  filterModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginTop: 8,
  },
  clearFiltersButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  clearFiltersText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  applyFiltersButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  applyFiltersText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  imagePickerRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreviewBox: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e1e8e1',
    borderStyle: 'dashed',
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
  },
  removeImageText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
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
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 4,
    overflow: 'hidden',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.08)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#334155',
  },
  dropdownItemTextSelected: {
    color: '#15803d',
    fontWeight: '700',
  },
  customUnitContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  customUnitHint: {
    fontSize: 12,
    color: '#15803d',
    marginBottom: 6,
    fontWeight: '500',
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
  multiSelectChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
