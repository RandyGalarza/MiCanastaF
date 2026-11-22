# 🧺 Mi Canasta Familiar

Aplicación móvil y web guiada para la gestión, control e inteligencia de compras de la canasta familiar.

Para ver la documentación completa y el código fuente del proyecto, ingresa a la carpeta del proyecto: [`APPGUIAcanasta`](./APPGUIAcanasta/).

---


## 🚀 Características y Funcionalidades Actuales

- **Registro e inicio de sesión:** Supabase Auth administra el correo y la contraseña; la sesión se conserva en SecureStore en iOS/Android y en el almacenamiento del navegador en web. El perfil de la app se mantiene en la base local.
- **Recuperación de contraseña:** Supabase envía el enlace al correo y solo permite cambiar la clave después de validar la sesión devuelta por ese enlace. Las cuentas antiguas locales se migran al ingresar su clave anterior una vez.
- **Visualización de Contraseña:** Opción para alternar la visibilidad de caracteres al escribir la contraseña.
- **Persistencia Local y Multiplataforma:** Uso de SQLite (`expo-sqlite`) para almacenamiento nativo en Android/iOS y un adaptador multiplataforma para navegación Web.
- **Navegación principal:** Barra inferior con accesos directos a Inicio, Productos, Lista, Tiendas, Chat, Saldo (Ventas para comercios) y Cuenta; Administración aparece para su rol. En pantallas angostas la barra permite desplazamiento horizontal. El inicio resume el saldo disponible del presupuesto activo y ofrece cuatro accesos principales.
- **Identidad visual:** Paleta cálida con verde de confianza y acentos naranja y amarillo. El inicio prioriza montos legibles, mensajes sencillos y botones amplios; se conserva la tipografía del sistema para respetar sus ajustes de accesibilidad y mantener la app ligera.
- **Modelo de datos:** SQLite utiliza las entidades del modelo del PDF: usuarios, presupuestos, categorías, productos, comercios, precios, listas y facturas con sus detalles. Se conserva `contrasena` en usuarios para mantener el acceso actual.
- **Registro e historial de compras:** Desde una lista se registran los productos marcados como comprados; la factura conserva el precio, comercio y descuento aplicado al momento de la compra, aunque luego cambie el catálogo.
- **Ingresos y gastos del hogar:** Registra movimientos por categoría, consulta el balance mensual y suma los gastos adicionales al presupuesto. Estos registros se guardan localmente y no se sincronizan con Supabase. Las compras de listas ya cuentan en el presupuesto; evita registrarlas también como gasto.
- **Hogar y prevención de desperdicio:** Registra alimentos perecederos y sus fechas; en Android/iOS se puede programar un aviso local para el día de vencimiento, y el recordatorio diario de gastos no cancela estas alertas. La canasta semanal es orientativa, ajustable por integrantes del hogar y usa los precios actuales del catálogo. El tamaño del hogar se guarda localmente.
- **Informe mensual comparativo:** Estima una posible diferencia frente a otros precios actuales del catálogo para los productos de compras registradas. No usa descuentos demostrativos ni confirma pagos o ahorros reales.
- **Hogar compartido:** Comparte ingresos y gastos con otros miembros mediante invitación al correo de su cuenta. Solo los miembros pueden leer los movimientos del hogar; la administración invita y los movimientos se guardan en línea. El hogar compartido requiere correo confirmado y conexión a internet; los movimientos personales existentes siguen siendo locales.
- **Accesibilidad:** Los flujos de movimientos y las nuevas pantallas ofrecen etiquetas para lectores de pantalla, confirmación legible y audible de montos, estados de presupuesto con texto e icono y áreas táctiles de al menos 48 dp. El texto sigue la escala configurada en el sistema.
- **Finanzas cotidianas:** Registra fiados por tienda, marca las deudas pagadas y crea metas de ahorro con aportes y barra de progreso. Los movimientos, deudas y metas se guardan en el dispositivo.
- **Recetas económicas:** Filtra ideas costeñas por presupuesto usando productos y precios del catálogo. El cálculo considera comprar un empaque de cada ingrediente; las orientaciones nutricionales son generales.
- **Escáner y mapa:** Escanea códigos EAN/UPC para buscar productos del catálogo o completar su código. El mapa muestra comercios geolocalizados y compara productos con precio en común dentro de 3 km cuando se permite el acceso a la ubicación.
- **Compartir resumen semanal:** Desde Ingresos y gastos puedes compartir los últimos siete días mediante las aplicaciones disponibles en el dispositivo, incluido WhatsApp si está instalado.
- **Calificaciones de productos:** Cada usuario con sesión puede asignar de 1 a 5 estrellas a cada producto. La app muestra el promedio real por separado de una calificación de demostración positiva, estable por producto y no usada por Gemini. Vuelve a ejecutar `supabase_schema.sql` para compartir las calificaciones reales entre dispositivos.
- **Asistente Gemini:** El chat usa una Supabase Edge Function para enviar la conversación y datos del catálogo a Gemini 3.6 Flash. Recomienda con precios vigentes del catálogo, calificaciones de usuarios y compras reportadas en la app. Permite generar una lista como borrador con un tope indicado por el usuario; la app valida productos, cantidades y total antes de guardarla. `GEMINI_API_KEY` permanece como secreto del servidor y no se incluye en la app. El monto solo se comparte al generar una lista; no se envían movimientos personales.
- **Factura en pantalla y PDF:** Cada compra queda disponible en el historial y muestra su detalle. En Android/iOS se genera un PDF para compartir; en web se abre la impresión del navegador para imprimirlo o guardarlo como PDF.
- **Sincronización de datos:** Ejecuta el script actualizado [`supabase_schema.sql`](./supabase_schema.sql) en el SQL Editor del proyecto para habilitar la sincronización de compras, calificaciones y reportes de precios. El script elimina la columna con contraseñas que se habían sincronizado anteriormente; las nuevas contraseñas nunca se guardan en esa tabla.
- **Despliegue del chat:** Despliega `supabase/functions/gemini-chat` con `supabase functions deploy gemini-chat --project-ref <PROJECT_REF>`. Confirma en Supabase Dashboard → Edge Function Secrets que `GEMINI_API_KEY` está configurada para ese proyecto.
- **Configuración de correo de Auth:** En Supabase, habilita Email en Authentication → Providers y configura SMTP para entregar correos reales. En Authentication → URL Configuration, agrega `appguiacanasta://**` a Redirect URLs; en Expo Go agrega también el callback `exp://<IP>:<PUERTO>/--/login` y `exp://<IP>:<PUERTO>/--/recuperar-contrasena` que genere la app; para web agrega las URL de callback generadas en desarrollo y la URL real de la app publicada. Sin las URL permitidas y SMTP, el registro con confirmación y la recuperación por correo no se completan.
- **Panel administrativo:** Resumen de comercios, usuarios, productos, categorías y compras registradas; búsqueda por sección, edición de comercios y gestión existente de altas/bajas.
- **Panel de ventas para comercios:** La pestaña Ventas muestra ingresos estimados por mes o historial, compras reportadas por los usuarios y los productos más comprados. Se requiere asociar artículos a un comercio para atribuirlos.

> Los descuentos actuales son promociones demostrativas calculadas sobre precios de referencia; las facturas de la app son comprobantes y no reemplazan la factura fiscal del comercio.
> Los ingresos del panel de comercio son importes brutos estimados de compras reportadas por usuarios; no son utilidad neta y no confirman cobros.
> Las recargas y pagos disponibles en la app son simulaciones de demostración; no procesan dinero real.
> Las alertas de perecederos requieren permiso de notificaciones y solo se programan en Android/iOS. En web, los alimentos se guardan, pero no se envían notificaciones.
> La versión wayuunaiki aún requiere traducción y revisión comunitaria; no se muestran traducciones inventadas ni se promete una voz que el dispositivo no tenga instalada.
> Para activar Hogar compartido, ejecuta el [`supabase_schema.sql`](./supabase_schema.sql) actualizado. Sus tablas privadas usan políticas RLS para miembros autenticados; las políticas anónimas heredadas de las demás tablas de sincronización aún requieren una migración general aparte.
> Las cuentas de acceso rápido son solo para desarrollo. Las políticas actuales de sincronización de datos Supabase aún permiten acceso anónimo para conservar la sincronización existente; Supabase Auth no debe considerarse protección de los datos sincronizados hasta migrar esas políticas a RLS por usuario.

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** React Native con [Expo SDK 57](https://expo.dev)
- **Enrutamiento:** Expo Router (File-based routing)
- **Base de Datos:** SQLite (`expo-sqlite`)
- **Estilos:** React Native StyleSheet (Paleta ecológica y limpia)
- **Iconografía:** `@expo/vector-icons` (Ionicons)

---

## 🏁 Cómo Ejecutar el Proyecto

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar la aplicación:**
   ```bash
   npx expo start
   ```

3. **Ejecutar en web:**
   ```bash
   npx expo start --web
   ```

4. **Ejecutar en Android:**
   ```bash
   npx expo start --android
   ```

5. **Habilitar Google Maps en Android:** Configura `GOOGLE_MAPS_API_KEY` en el entorno de compilación (por ejemplo, en las variables de entorno de EAS) y genera un nuevo build nativo. La clave no debe incluirse en el repositorio. iOS usa el mapa nativo de Apple.
