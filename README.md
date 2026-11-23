# Mi Canasta Familiar

Aplicación móvil y web para organizar las compras y finanzas cotidianas del hogar, comparar precios registrados y reducir el desperdicio de alimentos. Está orientada a familias de Riohacha y funciona en español.

La guía técnica detallada, instalación, configuración de Supabase y limitaciones están en [`APPGUIAcanasta/README.md`](./APPGUIAcanasta/README.md).

## Funcionalidades

### Catálogo y precios comunitarios

- Explorar, buscar y filtrar productos por nombre, categoría y comercio; consultar unidad, marca e imagen cuando están disponibles.
- Escanear códigos EAN/UPC para buscar artículos o completar el código de un producto.
- Comparar precios mínimos registrados en el catálogo. Los precios pueden cambiar y no necesariamente representan el precio vigente en la tienda.
- Reportar precios y confirmar reportes de otros usuarios. Cada autor empieza con cero confirmaciones y no puede confirmar su propio reporte; las confirmaciones no equivalen a una verificación oficial.
- Calificar productos de 1 a 5 estrellas. La app separa el promedio real de las puntuaciones de demostración, que no son opiniones ni una evaluación de calidad.
- Marcar cada producto manualmente como básico, importante o puede esperar. Estas preferencias pueden influir en las recomendaciones, pero no son una evaluación nutricional.
- Consultar en el mapa los comercios geolocalizados y comparar productos con precio en común dentro de 3 km cuando se permite el acceso a la ubicación.

### Listas, presupuestos y compras

- Crear listas de compra, ajustar cantidades, marcar artículos como comprados y consultar el costo estimado con los precios del catálogo.
- Organizar el presupuesto por periodo mensual, quincenal o semanal. La lista muestra un saldo proyectado al sumar la compra y los movimientos considerados en el periodo.
- Registrar compras e historial con el precio y los detalles disponibles al momento de la compra. Se puede guardar opcionalmente una dirección local asociada a cada compra; la app no gestiona envíos. Consultar la factura de la app y compartirla como PDF en móvil o imprimirla/guardarla desde el navegador.
- Consultar un informe mensual que compara compras registradas con precios actuales del catálogo. Es una estimación; no confirma ahorros ni pagos.
- Compartir el resumen semanal de ingresos y gastos mediante las aplicaciones disponibles, incluido WhatsApp si está instalado.

### Alimentación y economía del hogar

- Generar una canasta semanal orientativa según el tamaño del hogar y los productos con precio en el catálogo; se puede ajustar antes de crear una lista.
- Registrar perecederos y fechas de vencimiento, marcar alimentos consumidos y recibir recordatorios locales en Android/iOS cuando se concede el permiso de notificaciones.
- Consultar recetas económicas costeñas filtradas por presupuesto. La app resalta coincidencias con perecederos no consumidos; las cantidades son orientativas y no sustituyen asesoría nutricional.
- Registrar ingresos y gastos personales localmente por fecha y categoría, consultar el balance mensual y el historial, y compartir un resumen de los últimos siete días.
- Llevar un registro local de fiados por tienda y su estado de pago; crear metas de ahorro y registrar aportes.

### Hogar compartido

- Crear un hogar, invitar por correo y aceptar invitaciones para compartir ingresos y gastos con otros miembros.
- Consultar los movimientos compartidos del hogar. Esta función requiere correo confirmado y conexión a internet; los movimientos personales siguen almacenándose localmente.

### Asistente de compras

- Consultar el catálogo con Groq (`openai/gpt-oss-20b`) mediante una Supabase Edge Function.
- Recibir recomendaciones a partir de precios del catálogo, calificaciones reales cuando existan, compras agregadas registradas, puntuaciones simuladas claramente identificadas y prioridades manuales del hogar.
- Solicitar una lista para un presupuesto. La app valida productos, cantidades y total antes de permitir guardarla.
- Consultar precios de productos con una búsqueda SQL local; las preguntas sencillas de precio no consumen cuota de IA.
- Cada cuenta tiene hasta 10 consultas de IA por día, con reinicio a medianoche de Colombia. El chat envía como máximo los últimos cinco mensajes y limita el catálogo de contexto.
- Si Groq responde HTTP 429, la función intenta responder con Gemini. La clave `GROQ_API_KEY` y la clave de respaldo `GEMINI_API_KEY` se configuran como secretos de la Edge Function y nunca en la aplicación.
- El monto solo se envía al pedir una lista; no se envían los movimientos personales.

### Cuentas, roles y administración

- Crear cuenta, iniciar sesión y recuperar la contraseña mediante Supabase Auth.
- Exportar un archivo JSON con el perfil y los datos personales presentes en el dispositivo. La exportación local no incluye datos que solo existan en la nube del hogar compartido ni credenciales.
- Solicitar la eliminación de la cuenta y sus datos personales. Para proteger a otros miembros, el borrado se bloquea si la cuenta creó o administra un hogar compartido o registró movimientos allí.
- El rol administrador consulta resúmenes de comercios, usuarios, productos, categorías y compras registradas; también puede buscar y gestionar la información disponible en el panel.
- El rol comercio consulta ventas estimadas a partir de compras reportadas por usuarios y los productos asociados. Son importes brutos estimados: no confirman cobros ni representan utilidad neta.

### Accesibilidad y plataformas

- Interfaz adaptable a móvil y web, con áreas táctiles amplias, etiquetas para lectores de pantalla, anuncios de estado y compatibilidad con el tamaño de texto del sistema.
- Lectura en voz alta cuando el dispositivo dispone de una voz compatible.
- SQLite en Android/iOS y almacenamiento local en web. Algunas funciones, como el hogar compartido, Auth, Groq y el mapa, requieren conexión.
- Mapas nativos en móvil y Leaflet en web. Para habilitar Google Maps en Android se configura `GOOGLE_MAPS_API_KEY` antes de generar el build; iOS usa el mapa nativo de Apple.

## Tecnologías

- React Native, Expo SDK 57 y Expo Router.
- TypeScript.
- SQLite con `expo-sqlite` y almacenamiento local web.
- Supabase Auth, Postgres, Row Level Security y Edge Functions.
- Groq Chat Completions API.
- Mapas: `react-native-maps` y Leaflet.

## Requisitos y ejecución

Se requiere Node.js, npm y una configuración de proyecto Supabase. Para ejecutar simuladores nativos localmente se necesita el entorno de plataforma correspondiente; iOS requiere macOS.

```bash
cd APPGUIAcanasta
npm install
npx expo start
```

Opciones de desarrollo:

```bash
npx expo start --web
npx expo start --android
npx expo start --ios
```

Validaciones:

```bash
npx expo lint
npx tsc --noEmit
```

## Configuración de Supabase

1. Define `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el entorno local de Expo. Son valores públicos del cliente, no claves de servicio.
2. Ejecuta [`APPGUIAcanasta/supabase_schema.sql`](./APPGUIAcanasta/supabase_schema.sql) en el SQL Editor de Supabase para crear/actualizar las tablas, políticas del hogar compartido y funciones necesarias, incluida la eliminación de cuenta.
3. Despliega la función de chat:

   ```bash
   supabase functions deploy gemini-chat --project-ref <PROJECT_REF>
   ```

4. Configura `GROQ_API_KEY` y `GEMINI_API_KEY` en Supabase → Edge Function Secrets. No las guardes en `.env`, `EXPO_PUBLIC_*` ni en el repositorio. La función conserva el nombre `gemini-chat` por compatibilidad con la app.
5. Habilita Email en Supabase Auth y configura SMTP y las Redirect URLs para la URL web y los esquemas/callbacks de la app. Sin ello, el registro con confirmación y la recuperación por correo no se completan.
6. Para Android, configura `GOOGLE_MAPS_API_KEY` en el entorno de compilación y vuelve a generar el build nativo.

## Alcance y datos demostrativos

- Los descuentos y pagos/recargas son demostrativos; no se procesa dinero real. La factura de la app no reemplaza la factura fiscal del comercio.
- Las puntuaciones de demostración no representan valoraciones de usuarios. Las ventas de comercios y los informes comparativos son estimaciones derivadas de registros de la aplicación.
- Las alertas de perecederos solo se programan en Android/iOS; en web los alimentos se guardan sin notificaciones.
- El hogar compartido requiere internet. Las tablas privadas del hogar usan RLS para miembros; otras políticas de sincronización heredadas todavía permiten acceso anónimo y requieren una migración general antes de considerar protegidos todos los datos sincronizados por Supabase.
- La eliminación de cuentas requiere aplicar el esquema actualizado. No elimina datos comunitarios del hogar compartido: bloquea la operación cuando borrar la cuenta afectaría a otros miembros.
- Wayuunaiki aún no está disponible como traducción revisada por la comunidad.

## Integrantes

- Randy Galarza
- Loreley Gonzales
- Pedro Brugues
