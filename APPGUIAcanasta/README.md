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
   cd APPGUIAcanasta
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
