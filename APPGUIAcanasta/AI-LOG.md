# Registro de Auditoría de IA (AI-LOG)

**Estudiante(s):** Randy Galarza - Loreley Gonzales - Pedro Brugues
**Semana:** Final
**Proyecto:** MiCanasta

---

## 1. Solicitudes reales registradas

Se conservan los prompts iniciales ya consignados y se añaden las solicitudes posteriores de esta conversación. Algunos problemas se describen resumidamente en lugar de transcribir mensajes largos o capturas.

### Prompts iniciales

- **Inicio y requerimientos:**
  > “Comencemos con el desarrollo de este proyecto. Por ahora solo quiero que hagas esto y solo esto, también corregir algunos errores que encuentres, estoy usando SQLite para la base de datos local con expo-sqlite. Interfaz: registro, Login, Olvidar contraseña, Recuperar contraseña.”
- **Errores web de SQLite y Metro:**
  > “Unable to resolve module ./wa-sqlite/wa-sqlite.wasm” y “Worker chunk not found”.
- **Navegación y errores de rutas:**
  > Solicitud para mostrar una pantalla de prueba después del inicio de sesión y reporte de errores de exportación en Expo Router.
- **Interfaz del login:**
  > “Podemos poner una imagen o colores de fondo que tengan sentido con el login pero que no genere mucho impacto visual, también la función de ver contraseña cuando se está escribiendo.”

### Solicitudes posteriores

1. Asignar puntuaciones simuladas a los productos sin calificaciones reales, para que el asistente pudiera recomendarlos, diferenciándolas de opiniones de usuarios.
2. Ajustar el chat para que los mensajes no se salieran de sus burbujas y corregir el error de conexión que se mostraba al consultar el asistente.
3. Completar las funciones inspiradas en la lista de compra responsable y seguridad alimentaria: prioridades de productos, presupuesto por periodos, seguimiento de precios y recetas con perecederos, entre otras.
4. Cambiar Gemini por Groq usando `GROQ_API_KEY` como secreto de Supabase y actualizar la documentación de la aplicación.
5. Corregir el manejo de respuestas JSON inválidas del proveedor de IA.
6. Reducir el consumo de cuota: hasta 10 consultas diarias por cuenta, respuesta SQL local para preguntas simples de precios, contexto de cinco mensajes y respaldo ante HTTP 429; informar claramente cuando no haya cuota.
7. Completar con direcciones de referencia de Riohacha los comercios de demostración que solo tenían la ciudad y actualizar su visualización en el mapa.
8. Añadir la opción de guardar una dirección después de comprar.
9. Reportar que el chat Groq responde “Inicia sesión para usar el asistente” aunque la app muestre una cuenta iniciada; se pidió revisar el registro `AI-LOG.md` con los cambios realizados.

---

## 2. Ejemplos de prompts ficticios

**Los siguientes textos son ejemplos de redacción basados en las funciones descritas en el README. Son ficticios, no se enviaron durante el desarrollo y no deben citarse como prompts reales.**

### Acceso, navegación y plataforma

- “Como estudiante de Ingeniería de Sistemas, necesito revisar el registro, el inicio de sesión y la recuperación de contraseña con Supabase Auth. El perfil debe seguir disponible localmente y la app no debe guardar contraseñas.”
- “Ayúdame a comprobar que las pantallas de Expo Router funcionen en Android, iOS y web, usando SQLite en móvil y el adaptador local del navegador en web.”
- “Revisa la navegación móvil para que las pestañas principales sean fáciles de alcanzar en pantallas estrechas y agrega etiquetas accesibles para lectores de pantalla.”

### Catálogo, precios y recomendaciones

- “Implementa la búsqueda y los filtros del catálogo por producto, categoría y comercio, y permite escanear códigos EAN/UPC para encontrar un artículo.”
- “Necesito comparar los precios mínimos registrados, reportar un precio con fecha y permitir que otros usuarios lo confirmen. No presentes las confirmaciones como una verificación oficial.”
- “Separa las calificaciones reales de las puntuaciones simuladas por producto. El asistente puede usar la puntuación simulada para ordenar, pero debe aclarar que no es una opinión de usuarios.”
- “Agrega prioridades manuales básico, importante y puede esperar para que una lista sugerida respete primero lo esencial y no presente esa prioridad como una evaluación nutricional.”

### Listas, presupuesto y finanzas

- “Diseña el flujo para crear listas, cambiar cantidades, marcar productos comprados y estimar el total usando los precios actuales del catálogo.”
- “Quiero organizar el presupuesto por semana, quincena o mes. En la lista, muestra cuánto quedaría después de sumar la compra y los movimientos del periodo.”
- “Registra la compra con los precios y descuentos disponibles en ese momento y genera un comprobante consultable en el historial y compartible como PDF. Aclara que el pago de demostración no es dinero real.”
- “Ayúdame a llevar ingresos, gastos, deudas fiadas y metas de ahorro en el dispositivo, y a compartir un resumen de los últimos siete días.”

### Alimentación, hogar y comunidad

- “Propón una canasta semanal orientativa según el tamaño del hogar y los productos con precio. Permite ajustar las cantidades y evita presentarla como una recomendación nutricional profesional.”
- “Agrega el registro de alimentos perecederos con fecha de vencimiento y recordatorios locales en Android e iOS; explica qué pasa en web si no hay notificaciones.”
- “Filtra recetas costeñas por presupuesto y resalta los ingredientes que ya están registrados como perecederos para ayudar a reducir desperdicio.”
- “Diseña el hogar compartido con invitaciones por correo y acceso solo para miembros, cuidando que los movimientos personales no se mezclen con los compartidos.”
- “En el mapa de Riohacha, muestra comercios y compara productos con precios en común dentro de tres kilómetros cuando el usuario autorice la ubicación. Identifica claramente cualquier dirección que sea solo de demostración.”

### Asistente, privacidad y roles

- “Integra Groq en una Edge Function y no expongas `GROQ_API_KEY` en la aplicación. Limita la cuota diaria por cuenta, conserva solo los últimos mensajes necesarios y usa SQL local para preguntas simples de precios.”
- “Si Groq responde HTTP 429, intenta el proveedor de respaldo y muestra un mensaje amable al agotarse la cuota. No inventes productos ni precios que no existan en el catálogo.”
- “Comprueba que el asistente tenga una sesión válida de Supabase antes de llamar a la función; las cuentas de acceso rápido locales no deben saltarse la autenticación.”
- “Desde Cuenta, permite exportar los datos personales locales y solicitar su eliminación. Excluye contraseñas y evita borrar información de otros integrantes del hogar.”
- “En el panel de administración y el de comercios, muestra los datos según el rol y aclara que las ventas reportadas son estimaciones, no utilidad neta ni cobros confirmados.”

---

## 3. Cambios realizados

### Catálogo, recomendaciones y compras

- Se añadieron puntuaciones de demostración estables por producto, separadas de las calificaciones reales y etiquetadas como simuladas. El asistente puede usarlas como referencia sin presentarlas como opiniones de usuarios.
- Se incorporaron prioridades manuales de compra —básico, importante y puede esperar— y se usan al ordenar recomendaciones.
- Se mejoraron el presupuesto semanal/quincenal, el saldo proyectado de una compra, las confirmaciones de precios comunitarios y las coincidencias de recetas con perecederos.
- Se añadieron exportación de datos personales y eliminación de datos locales, con protecciones para hogares compartidos.
- Se actualizó el README principal y la guía de la aplicación con las funciones y limitaciones.

### Chat y servicios de IA

- El chat usa Groq mediante la Edge Function `gemini-chat`; `GROQ_API_KEY` se mantiene en los secretos del servidor. Se conserva Gemini como respaldo ante HTTP 429 de Groq.
- Se acotó el contexto enviado al modelo y se implementó una cuota de 10 consultas diarias por cuenta. Las preguntas sencillas de precios consultan el catálogo local mediante SQL.
- Se mejoraron los mensajes de error y la validación del JSON devuelto por el modelo.
- Se limitó el ancho de las burbujas y se permite que el texto largo se ajuste dentro del marco.
- Se detecta si falta una sesión válida de Supabase antes de llamar al asistente. Las cuentas de acceso rápido son locales y no crean esa sesión; el chat informa la limitación sin enviar una solicitud que terminaría en HTTP 401. Las consultas locales de precios siguen disponibles.

### Comercios y direcciones

- Se asignaron direcciones y coordenadas de referencia únicamente a comercios de demostración sin dirección completa. Se identifican como referencias no verificadas y se muestran en el mapa.
- Después de completar una compra, se puede guardar u omitir una dirección asociada a esa compra. Se almacena localmente, aparece en la factura/PDF y se incluye en exportación y eliminación de datos. No se sincroniza con Supabase, no se envía al comercio y no solicita ni confirma un envío.

### Cambios previos de la aplicación

- Se añadieron o ajustaron las pantallas iniciales de login, registro, recuperación de contraseña y navegación.
- Se corrigieron la inicialización asíncrona de SQLite, el adaptador web y los problemas de empaquetado de SQLite/WebAssembly descritos en el registro anterior.

---

## 4. Problemas detectados y tratamiento

1. **Errores de SQLite/WebAssembly en web:** se ajustó el adaptador web y el empaquetado para evitar depender de un worker que Metro no encontraba.
2. **JSON inválido del proveedor de IA:** se valida la estructura antes de usarla y se muestra un error controlado si la respuesta no es válida.
3. **Acceso rápido frente a sesión Supabase:** el acceso rápido de desarrollo solo establece el usuario local. Groq requiere una sesión de Supabase para identificar la cuenta y aplicar la cuota; ahora el cliente detecta ese caso y lo explica.
4. **Direcciones de comercios:** son referencias de demostración, no precios ni domicilios verificados; la interfaz lo aclara.
5. **Dirección poscompra:** guardar una dirección no equivale a solicitar, coordinar ni confirmar un servicio de entrega.

---

## 5. Validaciones

- `npx tsc --noEmit`: aprobado.
- `npx expo lint`: aprobado.
- `git diff --check` en los archivos de la corrección del chat y este registro: aprobado.

---
