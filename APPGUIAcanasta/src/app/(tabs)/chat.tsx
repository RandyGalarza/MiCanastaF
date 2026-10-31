import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const EXAMPLE_MESSAGES = [
  { id: 'welcome', role: 'assistant', text: '¡Hola! Soy tu asistente de compras. Pronto podré ayudarte a comparar precios y planear tu canasta.' },
  { id: 'example', role: 'user', text: '¿Qué puedo comprar para una semana?' },
  { id: 'reply', role: 'assistant', text: 'Aquí aparecerán recomendaciones para tu canasta familiar.' },
];

export default function ChatScreen() {
  const [message, setMessage] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Ionicons name="sparkles" size={22} color="#16a34a" /></View>
        <View>
          <Text style={styles.title}>Asistente IA</Text>
          <Text style={styles.subtitle}>Vista previa · Próximamente</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.messages}>
        {EXAMPLE_MESSAGES.map((item) => {
          const isUser = item.role === 'user';
          return (
            <View key={item.id} style={[styles.messageRow, isUser && styles.userRow]}>
              {!isUser && <View style={styles.smallAvatar}><Ionicons name="sparkles" size={14} color="#16a34a" /></View>}
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
          editable={false}
          accessibilityLabel="Chat de ejemplo, próximamente disponible"
        />
        <Pressable style={styles.sendButton} disabled accessibilityLabel="Enviar mensaje próximamente">
          <Ionicons name="arrow-up" size={20} color="#ffffff" />
        </Pressable>
      </View>
      <Text style={styles.note}>El chat estará disponible próximamente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f6', paddingTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e7ece7' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#14532d', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  messages: { flexGrow: 1, justifyContent: 'flex-end', padding: 18, gap: 16 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '88%' },
  userRow: { alignSelf: 'flex-end' },
  smallAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  assistantBubble: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ece7', borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: '#16a34a', borderBottomRightRadius: 5 },
  messageText: { color: '#334155', fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#ffffff' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, padding: 8, borderWidth: 1, borderColor: '#e1e8e1', borderRadius: 24, backgroundColor: '#ffffff' },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, color: '#64748b', fontSize: 14 },
  sendButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#86efac', alignItems: 'center', justifyContent: 'center' },
  note: { color: '#94a3b8', fontSize: 11, textAlign: 'center', paddingTop: 8, paddingBottom: 10 },
});
