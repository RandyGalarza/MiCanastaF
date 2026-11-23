import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/database/supabaseClient';
import { obtenerPopularidadProductos } from '@/repositories/compraRepository';
import {
  obtenerResumenCalificaciones,
} from '@/repositories/calificacionProductoRepository';
import { crearListaCompraPresupuestada } from '@/repositories/listacompraRepository';
import {
  buscarPreciosDeCatalogo,
  obtenerCatalogoParaRecomendacion,
} from '@/repositories/productoRepository';
import {
  obtenerPrioridadesProductos,
  PrioridadProducto,
} from '@/repositories/prioridadProductoRepository';
import { getDemoProductRating } from '@/utils/demo-product-ratings';
import {
  extraerPresupuestoDeMensaje,
  parsearMontoPresupuesto,
  PlanListaRecomendada,
  ProductoContextoAsistente,
  validarPlanLista,
} from '@/utils/shopping-advisor';

type DisplayPlan = PlanListaRecomendada & {
  nombre: string;
  guardada: boolean;
  id_lista?: number;
};
type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  plan?: DisplayPlan;
};
type ChatRequestMessage = { role: 'assistant' | 'user'; content: string };
type AssistantReply = { reply: string; items: unknown; list_name: string };

class ChatAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatAuthenticationError';
  }
}

const INITIAL_MESSAGES: ChatMessage[] = [{
  id: 'welcome',
  role: 'assistant',
  text: '¡Hola! Puedo recomendarte productos según sus precios, compras y calificaciones reales cuando existan. Si no hay opiniones, usaré una puntuación simulada, claramente identificada como referencia y no como valoración de usuarios. También puedo proponerte una lista dentro de tu presupuesto.',
}];

const SUGGESTIONS = [
  '¿Qué productos tienen mejor puntuación de referencia y precio?',
  '¿Cuáles son los productos más comprados y mejor calificados por usuarios?',
  '¿Cómo puedo ahorrar en las compras del hogar?',
];

const PRIORITY_BONUS: Record<PrioridadProducto, number> = {
  basico: 6,
  importante: 3,
  puede_esperar: -3,
};

function currency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

function extraerTerminosConsultaPrecio(texto: string): string[] | null {
  const normalized = texto.toLocaleLowerCase('es-CO');
  const esConsultaPrecio = /\b(cu[aá]nto|precios?|vale|valen|cuesta|cuestan|costo|costar)\b/.test(normalized) ||
    /\ba c[oó]mo (?:est[aá]|vale)\b/.test(normalized);
  if (!esConsultaPrecio || /\b(comparar|compara|diferencia|entre|mejor|barato|barata)\b/.test(normalized)) {
    return null;
  }

  const palabrasIgnoradas = new Set([
    'a', 'al', 'como', 'cómo', 'cuanto', 'cuánto', 'cuanta', 'cuánta', 'cuantos',
    'cuántos', 'cuantas', 'cuántas', 'cual', 'cuál', 'cuales', 'cuáles',
    'costo', 'costar', 'cuesta', 'cuestan', 'de', 'del', 'dime', 'el', 'es', 'esta',
    'está', 'estan', 'están', 'favor', 'hay', 'hoy', 'la', 'las', 'los', 'me', 'por',
    'precio', 'precios',
    'puede', 'puedes', 'que', 'sale', 'salen', 'tiene', 'tienen', 'vale', 'valen',
    'unidad', 'unidades', 'kilo', 'kilos', 'libra', 'libras', 'gramo', 'gramos',
    'litro', 'litros', 'kg', 'y',
  ]);
  const palabras = normalized.match(/[a-záéíóúüñ0-9]+/g) ?? [];
  const terminos = [...new Set(palabras.filter((palabra) =>
    palabra.length > 1 && !palabrasIgnoradas.has(palabra)
  ))];
  return terminos.length > 0 ? terminos : null;
}

function respuestaPreciosEncontrados(
  productos: Awaited<ReturnType<typeof buscarPreciosDeCatalogo>>
): string {
  if (productos.length === 1) {
    const producto = productos[0];
    return `El precio más bajo registrado de ${producto.nombre} es ${currency(producto.precio)} por ${producto.unidad_medida}. Los precios pueden cambiar.`;
  }

  const lineas = productos.slice(0, 5).map((producto) =>
    `- ${producto.nombre}: ${currency(producto.precio)} por ${producto.unidad_medida}`
  );
  const aclaracion = productos.length > 1
    ? ' Hay varias presentaciones; dime cuál te interesa para precisarlo.'
    : '';
  return `Estos son los precios más bajos registrados:\n${lineas.join('\n')}.${aclaracion} Los precios pueden cambiar.`;
}

function esSolicitudDeLista(texto: string): boolean {
  return /\b(lista|mercado|canasta)\b/i.test(texto) &&
    /\b(arma|armar|armame|crea|crear|haz|hazme|prepara|recomiend|organiza|presupuesto|seg[uú]n)\b/i.test(texto);
}

function requiereContextoProductos(texto: string, solicitaLista: boolean): boolean {
  return solicitaLista ||
    /\b(productos?|precios?|cu[aá]nto|calificaci[oó]n|puntuaci[oó]n|populares?|baratos?|baratas?|comparar|recomiend)\b/i.test(texto);
}

async function obtenerMensajeErrorFuncion(
  error: FunctionsHttpError | FunctionsRelayError
): Promise<string> {
  const response = error.context as Response;
  try {
    const body: unknown = await response.clone().json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error;
    }
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }
  } catch (parseError) {
    console.warn('No se pudo leer el detalle del error de Groq:', parseError);
  }
  return `El servicio de Supabase respondió con un error (HTTP ${response.status}).`;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const messageSequence = useRef(0);

  const buildCatalogContext = async (): Promise<ProductoContextoAsistente[]> => {
    const [catalog, ratings, popularity, priorities] = await Promise.all([
      obtenerCatalogoParaRecomendacion(),
      obtenerResumenCalificaciones(),
      obtenerPopularidadProductos(),
      user
        ? obtenerPrioridadesProductos(user.id_usuario)
        : Promise.resolve<Record<number, PrioridadProducto>>({}),
    ]);

    return catalog.map((product) => {
      const rating = ratings[product.id_producto];
      const sales = popularity[product.id_producto];
      return {
        ...product,
        promedio_calificacion: rating?.promedio ?? 0,
        cantidad_calificaciones: rating?.cantidad ?? 0,
        calificacion_demo: getDemoProductRating(product.id_producto),
        unidades_vendidas: sales?.unidadesVendidas ?? 0,
        compras_registradas: sales?.comprasRegistradas ?? 0,
        prioridad_hogar: priorities[product.id_producto] ?? null,
      };
    }).sort((left, right) => {
      const score = (product: ProductoContextoAsistente) =>
        (product.prioridad_hogar ? PRIORITY_BONUS[product.prioridad_hogar] : 0) +
        (product.cantidad_calificaciones > 0
          ? product.promedio_calificacion / 5
          : product.calificacion_demo / 5) +
        Math.log1p(product.unidades_vendidas) +
        10 / (product.precio + 10);
      return score(right) - score(left);
    }).slice(0, 30);
  };

  const sendMessage = async (value = message, listBudget?: number) => {
    const question = value.trim();
    if (!question || sending) return;

    const extractedBudget = extraerPresupuestoDeMensaje(question);
    const hasListTerm = /\b(lista|mercado|canasta)\b/i.test(question);
    const requestsList = listBudget != null ||
      esSolicitudDeLista(question) ||
      (hasListTerm && extractedBudget != null);
    const budget = listBudget ?? (requestsList ? extractedBudget : null);
    messageSequence.current += 1;
    const id = `message-${messageSequence.current}`;
    const conversation: ChatRequestMessage[] = messages
      .filter((item) => item.id !== 'welcome')
      .slice(-4)
      .map((item) => ({ role: item.role, content: item.text }));
    conversation.push({ role: 'user', content: question });

    setMessage('');
    setSending(true);
    setMessages((current) => [...current, { id: `${id}-user`, role: 'user', text: question }]);
    try {
      const priceTerms = extraerTerminosConsultaPrecio(question);
      if (priceTerms) {
        const priceMatches = await buscarPreciosDeCatalogo(priceTerms);
        if (priceMatches.length > 0) {
          setMessages((current) => [...current, {
            id: `${id}-assistant`,
            role: 'assistant',
            text: respuestaPreciosEncontrados(priceMatches),
          }]);
          return;
        }
        if (priceTerms.length === 1) {
          setMessages((current) => [...current, {
            id: `${id}-assistant`,
            role: 'assistant',
            text: `No encontré un precio registrado para "${priceTerms[0]}". Revisa el nombre o consulta el catálogo de productos.`,
          }]);
          return;
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error('No se pudo verificar tu sesión. Cierra sesión e inténtalo de nuevo.');
      }
      if (!session?.access_token) {
        throw new ChatAuthenticationError(
          'El acceso rápido de demostración no tiene una sesión de Supabase y no puede usar el asistente. Inicia sesión con una cuenta registrada.'
        );
      }

      const catalog = requiereContextoProductos(question, requestsList)
        ? await buildCatalogContext()
        : [];
      if (requestsList && budget != null && catalog.length === 0) {
        throw new Error('No hay productos con precio vigente en el catálogo para armar una lista.');
      }

      const { data, error } = await supabase.functions.invoke<AssistantReply>('gemini-chat', {
        body: {
          messages: conversation,
          contexto: {
            solicitar_lista: requestsList,
            presupuesto: budget,
            productos: catalog.map((product) => ({
              id_producto: product.id_producto,
              nombre: product.nombre,
              categoria: product.categoria,
              unidad: product.unidad_medida,
              marca: product.marca ?? '',
              precio: product.precio,
              promedio_calificacion: product.promedio_calificacion,
              cantidad_calificaciones: product.cantidad_calificaciones,
              calificacion_demo: product.calificacion_demo,
              unidades_vendidas: product.unidades_vendidas,
              compras_registradas: product.compras_registradas,
              prioridad_hogar: product.prioridad_hogar,
            })),
          },
        },
      });
      if (error) {
        if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
          const response = error.context as Response;
          if (response.status === 401) {
            throw new ChatAuthenticationError(
              'Supabase no reconoció tu sesión. Cierra sesión y vuelve a iniciar sesión con tu cuenta.'
            );
          }
          throw new Error(await obtenerMensajeErrorFuncion(error));
        }
        if (error instanceof FunctionsFetchError) {
          throw new Error('No se pudo conectar con Supabase. Verifica tu conexión a internet e inténtalo de nuevo.');
        }
        throw new Error('No se pudo contactar con el servicio de recomendaciones. Inténtalo de nuevo.');
      }
      if (
        typeof data?.reply !== 'string' ||
        !data.reply.trim() ||
        !Array.isArray(data.items) ||
        typeof data.list_name !== 'string'
      ) {
        throw new Error('El asistente devolvió una respuesta incompleta.');
      }

      let plan: DisplayPlan | undefined;
      if (requestsList && budget != null) {
        const validPlan = validarPlanLista(data.items, catalog, budget);
        plan = {
          ...validPlan,
          nombre: data.list_name.trim().slice(0, 60) || 'Lista recomendada por el asistente',
          guardada: false,
        };
      }
      setMessages((current) => [
        ...current,
        { id: `${id}-assistant`, role: 'assistant', text: data.reply.trim(), plan },
      ]);
    } catch (error) {
      if (!(error instanceof ChatAuthenticationError)) {
        console.error('Error en el chat Groq:', error);
      }
      setMessages((current) => [...current, {
        id: `${id}-assistant`,
        role: 'assistant',
        text: error instanceof Error
          ? error.message
          : 'No pude completar la consulta. Inténtalo de nuevo.',
      }]);
    } finally {
      setSending(false);
    }
  };

  const requestBudgetList = () => {
    const budget = parsearMontoPresupuesto(budgetInput);
    if (budget == null) return;
    setBudgetModalVisible(false);
    void sendMessage(
      `Crea una lista de compra para el mercado con un tope de ${currency(budget)} COP. Prioriza productos bien calificados, populares y de buena relación precio-calidad.`,
      budget
    );
  };

  const savePlan = async (messageId: string, plan: DisplayPlan) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setSavingPlanId(messageId);
      const saved = await crearListaCompraPresupuestada(
        user.id_usuario,
        plan.nombre,
        plan.presupuesto,
        plan.productos.map(({ producto, cantidad }) => ({
          id_producto: producto.id_producto,
          cantidad,
        }))
      );
      setMessages((current) => current.map((item) => item.id !== messageId || !item.plan
        ? item
        : {
          ...item,
          plan: {
            ...item.plan,
            total: saved.total,
            productos: item.plan.productos.map((linea) => ({
              ...linea,
              producto: {
                ...linea.producto,
                precio: saved.precios[linea.producto.id_producto],
              },
            })),
            guardada: true,
            id_lista: saved.id_lista,
          },
        }));
    } catch (error) {
      console.error('No se pudo guardar la lista recomendada:', error);
      messageSequence.current += 1;
      setMessages((current) => [...current, {
        id: `save-error-${messageSequence.current}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'No se pudo guardar la lista.',
      }]);
    } finally {
      setSavingPlanId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Ionicons name="sparkles" size={22} color="#16a34a" /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">Asistente de canasta</Text>
            <Text style={styles.subtitle}>Groq · Catálogo y compras de la aplicación</Text>
        </View>
        <Pressable
          onPress={() => setBudgetModalVisible(true)}
          style={styles.createListButton}
          accessibilityRole="button"
          accessibilityLabel="Crear lista según un presupuesto"
          accessibilityHint="Abre el formulario para indicar cuánto quieres gastar"
        >
          <Ionicons name="list-outline" size={17} color="#166534" />
          <Text style={styles.createListButtonText}>Crear lista</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        accessibilityLabel="Conversación con el asistente de canasta"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((item) => {
          const isUser = item.role === 'user';
          return (
            <View key={item.id} style={styles.messageGroup}>
              <View style={[styles.messageRow, isUser && styles.userRow]}>
                {!isUser && <View style={styles.smallAvatar}><Ionicons name="sparkles" size={14} color="#16a34a" /></View>}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                  <Text
                    style={[styles.messageText, isUser && styles.userMessageText]}
                    accessibilityLabel={`${isUser ? 'Tú' : 'Asistente'}: ${item.text}`}
                    accessibilityLiveRegion={isUser ? undefined : 'polite'}
                  >
                    {item.text}
                  </Text>
                </View>
              </View>
              {item.plan && (
                <View style={styles.planCard}>
                  <View style={styles.planHeading}>
                    <View style={styles.planHeadingIcon}><Ionicons name="basket-outline" size={18} color="#15803d" /></View>
                    <View style={styles.planHeadingCopy}>
                      <Text style={styles.planTitle} accessibilityRole="header">{item.plan.nombre}</Text>
                      <Text style={styles.planSubtitle}>Precios mínimos registrados · pueden variar</Text>
                    </View>
                  </View>
                  {item.plan.productos.map(({ producto, cantidad, motivo }) => (
                    <View key={producto.id_producto} style={styles.planProduct}>
                      <View style={styles.planProductCopy}>
                        <Text style={styles.planProductName}>{producto.nombre} · {cantidad} {producto.unidad_medida}</Text>
                        <Text style={styles.planReason}>{motivo}</Text>
                      </View>
                      <Text style={styles.planProductPrice}>{currency(producto.precio * cantidad)}</Text>
                    </View>
                  ))}
                  <View style={styles.planTotalRow}>
                    <Text style={styles.planTotalLabel}>Total estimado</Text>
                    <Text style={styles.planTotal} accessibilityLabel={`Total estimado ${currency(item.plan.total)}`}>{currency(item.plan.total)}</Text>
                  </View>
                  <Text style={styles.planBudget}>Tope: {currency(item.plan.presupuesto)} · Disponible: {currency(item.plan.presupuesto - item.plan.total)}</Text>
                  {item.plan.guardada ? (
                    <View style={styles.savedNotice} accessible accessibilityLabel="Lista guardada en tus listas de compra">
                      <Ionicons name="checkmark-circle" size={17} color="#15803d" />
                      <Text style={styles.savedNoticeText}>Lista guardada en tus listas de compra.</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => void savePlan(item.id, item.plan!)}
                      disabled={savingPlanId === item.id}
                      style={[styles.savePlanButton, savingPlanId === item.id && styles.disabledButton]}
                      accessibilityRole="button"
                      accessibilityLabel={savingPlanId === item.id ? 'Guardando lista recomendada' : user ? `Guardar la lista ${item.plan.nombre}` : 'Iniciar sesión para guardar la lista recomendada'}
                      accessibilityHint="Añade esta lista recomendada a tus listas de compra"
                      accessibilityState={{ disabled: savingPlanId === item.id, busy: savingPlanId === item.id }}
                    >
                      <Ionicons name={user ? 'save-outline' : 'log-in-outline'} size={17} color="#ffffff" />
                      <Text style={styles.savePlanButtonText}>
                        {savingPlanId === item.id ? 'Guardando…' : user ? 'Guardar esta lista' : 'Inicia sesión para guardarla'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}
        {sending && <Text style={styles.typing} accessibilityLiveRegion="polite" accessibilityLabel="Groq está revisando el catálogo">Groq está revisando el catálogo…</Text>}
        {messages.length === 1 && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <Pressable key={suggestion} onPress={() => void sendMessage(suggestion)} style={styles.suggestion} accessibilityRole="button" accessibilityLabel={suggestion} accessibilityHint="Envía esta pregunta al asistente">
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Pregunta por productos o precios..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
          editable={!sending}
          maxLength={1500}
          accessibilityLabel="Escribe una pregunta para el asistente"
          accessibilityHint="Escribe tu consulta y pulsa Enviar pregunta"
          returnKeyType="send"
          onSubmitEditing={() => void sendMessage()}
        />
        <Pressable
          onPress={() => void sendMessage()}
          disabled={!message.trim() || sending}
          style={[styles.sendButton, (!message.trim() || sending) && styles.sendDisabled]}
          accessibilityRole="button"
          accessibilityLabel={sending ? 'Enviando pregunta al asistente' : 'Enviar pregunta al asistente'}
          accessibilityState={{ disabled: !message.trim() || sending, busy: sending }}
        >
          <Ionicons name="arrow-up" size={20} color="#ffffff" />
        </Pressable>
      </View>
      <Text style={styles.note}>
        Se envían a Groq los productos, precios, compras agregadas, prioridades manuales y puntuaciones simuladas de productos sin calificaciones. Las puntuaciones no son opiniones reales. El monto del presupuesto solo se comparte al pedir una lista; no se envían tus movimientos personales.
      </Text>

      <Modal
        visible={budgetModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}><Ionicons name="wallet-outline" size={22} color="#15803d" /></View>
              <Pressable onPress={() => setBudgetModalVisible(false)} accessibilityRole="button" accessibilityLabel="Cerrar formulario de presupuesto" hitSlop={8}>
                <Ionicons name="close" size={23} color="#64748b" />
              </Pressable>
            </View>
            <Text style={styles.modalTitle} accessibilityRole="header">Arma tu lista con presupuesto</Text>
            <Text style={styles.modalDescription}>Indica el tope para esta compra. La lista se mostrará como borrador y podrás revisarla antes de guardarla.</Text>
            <TextInput
              value={budgetInput}
              onChangeText={setBudgetInput}
              placeholder="Ej. 50000"
              placeholderTextColor="#94a3b8"
              style={styles.budgetInput}
              keyboardType="numeric"
              editable={!sending}
              accessibilityLabel="Presupuesto máximo en pesos colombianos"
              accessibilityHint="Escribe el límite de gasto para esta compra"
              returnKeyType="done"
              onSubmitEditing={requestBudgetList}
            />
            <Text style={styles.privacyNote}>Ese monto y el catálogo se envían a Groq para preparar la recomendación. Tus movimientos personales no se comparten.</Text>
            <Pressable
              onPress={requestBudgetList}
              disabled={!parsearMontoPresupuesto(budgetInput) || sending}
              style={[styles.modalAction, (!parsearMontoPresupuesto(budgetInput) || sending) && styles.disabledButton]}
              accessibilityRole="button"
              accessibilityLabel={sending ? 'Preparando lista recomendada' : 'Crear borrador de lista'}
              accessibilityState={{ disabled: !parsearMontoPresupuesto(budgetInput) || sending, busy: sending }}
            >
              <Ionicons name="sparkles" size={18} color="#ffffff" />
              <Text style={styles.modalActionText}>{sending ? 'Preparando…' : 'Crear borrador'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6', paddingTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e7ece7' },
  headerCopy: { flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#14532d', fontSize: 17, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 10, marginTop: 2 },
  createListButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 },
  createListButtonText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  messages: { flexGrow: 1, justifyContent: 'flex-end', padding: 18, gap: 16 },
  messageGroup: { gap: 9 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%' },
  userRow: { justifyContent: 'flex-end' },
  smallAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  bubble: { flexShrink: 1, minWidth: 0, maxWidth: '90%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  assistantBubble: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7', borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: '#16a34a', borderBottomRightRadius: 5 },
  messageText: { flexShrink: 1, color: '#334155', fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#ffffff' },
  suggestions: { gap: 8, marginLeft: 34, marginTop: 4 },
  suggestion: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#cde8d1', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#f0fdf4' },
  suggestionText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  typing: { color: '#64748b', fontSize: 12, alignSelf: 'center' },
  planCard: { marginLeft: 34, maxWidth: '92%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dcecdf', borderRadius: 16, padding: 13, gap: 10 },
  planHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  planHeadingIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  planHeadingCopy: { flex: 1 },
  planTitle: { color: '#14532d', fontSize: 14, fontWeight: '700' },
  planSubtitle: { color: '#64748b', fontSize: 10, marginTop: 2 },
  planProduct: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  planProductCopy: { flex: 1 },
  planProductName: { color: '#334155', fontSize: 12, fontWeight: '600' },
  planReason: { color: '#64748b', fontSize: 10, lineHeight: 14, marginTop: 2 },
  planProductPrice: { color: '#166534', fontSize: 12, fontWeight: '700' },
  planTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 9, borderTopWidth: 1, borderTopColor: '#dcecdf' },
  planTotalLabel: { color: '#334155', fontSize: 13, fontWeight: '700' },
  planTotal: { color: '#15803d', fontSize: 14, fontWeight: '800' },
  planBudget: { color: '#64748b', fontSize: 11 },
  savePlanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  savePlanButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  savedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 9 },
  savedNoticeText: { color: '#166534', fontSize: 11, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, padding: 8, borderWidth: 1, borderColor: '#e1e8e1', borderRadius: 24, backgroundColor: '#ffffff' },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, color: '#334155', fontSize: 14 },
  sendButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: '#86efac' },
  note: { color: '#64748b', fontSize: 10, lineHeight: 14, textAlign: 'center', paddingTop: 8, paddingBottom: 10, paddingHorizontal: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#14532d', fontSize: 18, fontWeight: '700' },
  modalDescription: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  budgetInput: { borderWidth: 1, borderColor: '#dcecdf', borderRadius: 12, padding: 12, color: '#0f172a', fontSize: 16 },
  privacyNote: { color: '#64748b', fontSize: 10, lineHeight: 14 },
  modalAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12 },
  modalActionText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
});
