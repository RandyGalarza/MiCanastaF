# 🧺 Mi Canasta Familiar

Aplicación móvil y web guiada para la gestión, control e inteligencia de compras de la canasta familiar.

Para ver la documentación completa y el código fuente del proyecto, ingresa a la carpeta del proyecto: [`APPGUIAcanasta`](./APPGUIAcanasta/).

---


## 🚀 Características y Funcionalidades Actuales

- **Registro de Usuario:** Creación de cuenta con nombre, apellido, correo, teléfono y contraseña almacenada en base de datos local.
- **Inicio de Sesión:** Autenticación local segura con validación de estado activo.
- **Recuperación de Contraseña:** Proceso de verificación por correo electrónico y actualización de clave.
- **Visualización de Contraseña:** Opción para alternar la visibilidad de caracteres al escribir la contraseña.
- **Persistencia Local y Multiplataforma:** Uso de SQLite (`expo-sqlite`) para almacenamiento nativo en Android/iOS y un adaptador multiplataforma para navegación Web.
- **Navegación principal:** Barra inferior con estilo verde a juego con el login. Inicio abre con un mensaje de bienvenida; Productos, Lista de compra y Presupuesto son pantallas iniciales. Cuenta permite acceder al inicio de sesión sin exigirlo al abrir la app, muestra el perfil activo y ofrece cerrar sesión.
- **Modelo de datos:** SQLite utiliza las entidades del modelo del PDF: usuarios, presupuestos, categorías, productos, comercios, precios, listas y facturas con sus detalles. Se conserva `contrasena` en usuarios para mantener el acceso actual.
- **Registro e historial de compras:** Desde una lista se registran los productos marcados como comprados; la factura conserva el precio, comercio y descuento aplicado al momento de la compra, aunque luego cambie el catálogo.
- **Factura en pantalla y PDF:** Cada compra queda disponible en el historial y muestra su detalle. En Android/iOS se genera un PDF para compartir; en web se abre la impresión del navegador para imprimirlo o guardarlo como PDF.
- **Sincronización de compras:** Para sincronizar compras nuevas con Supabase, ejecuta el script actualizado [`supabase_schema.sql`](./supabase_schema.sql) en el SQL Editor del proyecto.
- **Panel administrativo:** Resumen de comercios, usuarios, productos, categorías y compras registradas; búsqueda por sección, edición de comercios y gestión existente de altas/bajas.
- **Panel de ventas para comercios:** La pestaña Ventas muestra ingresos estimados por mes o historial, compras reportadas por los usuarios y los productos más comprados. Se requiere asociar artículos a un comercio para atribuirlos.

> Los descuentos actuales son promociones demostrativas calculadas sobre precios de referencia; las facturas de la app son comprobantes y no reemplazan la factura fiscal del comercio.
> Los ingresos del panel de comercio son importes brutos estimados de compras reportadas por usuarios; no son utilidad neta y no confirman cobros.

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
