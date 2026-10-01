# Registro de Auditoría de IA (AI-LOG)

**Estudiante(s):** Randy Galarza - Loreley Gonzales - Pedro Brugues  
**Semana:** 6  
**Proyecto:** MiCanasta  

---

## 1. Prompts Utilizados

- **Prompt 1 (Inicio y Requerimientos):**  
  > *"Comencemos con el desarrollo de este proyecto. por ahora solo quiero que hagas esto y solo esto, tambien corregir algunos errores que encuentres, estoy usando sqlite para la base de datos local con expo-sqlite. Interfaz: registro, Login, Olvidar contraseña, Recuperar contraseña."*

- **Prompt 2 (Resolución de error WebAssembly / Metro):**  
  > *"Resolution Error: Unable to resolve module ./wa-sqlite/wa-sqlite.wasm in node_modules/expo-sqlite/web/worker.ts"*

- **Prompt 3 (Resolución de error Worker chunk Web):**  
  > *"Server Error: Worker chunk not found for: node_modules/expo-sqlite/web/worker.ts"*

- **Prompt 4 (Navegación Post-Login y Limpieza de Rutas):**  
  > *"que despues de que inicie sesion  mande por ahora a una pantalla de prueba con un mensaje.Route './gastos.tsx' is missing the required default export... 'shadow*' 

- **Prompt 5 (UI/UX y Visibilidad de Contraseña):**  
  > *"podemos pone una imagen o colores de fondo que tengan sentido con el login pero que no genere mucho impacto visual, tambien la funcion de ver contraseña cuando se esta escribiendo"*

---

## 2. Código Generado vs. Código Modificado

### **Código Generado (Nuevo):**
1. `src/app/login.tsx`: Pantalla de inicio de sesión con validación de credenciales contra SQLite, ícono distintivo de canasta, diseño en tono verde fresco y botón para mostrar/ocultar contraseña.
2. `src/app/registro.tsx`: Formulario de registro de usuario que verifica duplicidad de correo en SQLite antes de insertar.
3. `src/app/olvidar-contrasena.tsx`: Pantalla para validar existencia de correo electrónico.
4. `src/app/recuperar-contrasena.tsx`: Formulario para actualizar la contraseña del usuario en SQLite.
5. `src/app/inicio.tsx`: Pantalla de prueba post-login con opción para cerrar sesión.
6. `metro.config.js`: Configuración personalizada para soportes `.wasm` y cabeceras de aislamiento COOP/COEP para el bundler de Expo.

### **Código Modificado (Existente):**
1. `src/app/_layout.tsx`: Se eliminó el uso de `top-level await` inválido e introdujo la inicialización asíncrona de SQLite y el sembrado de base de datos dentro del ciclo de vida de React (`useEffect`).
2. `src/repositories/usuarioRepository.ts`: Se añadió el método `actualizarContrasenaPorCorreo` para soportar la recuperación de contraseña.
3. `src/repositories/gastRepository.ts`: Se corrigieron errores de tipos TypeScript en los parámetros de la consulta de actualización.
4. `src/database/database.ts`: Se creó un adaptador multiplataforma (`WebDatabaseAdapter`) para garantizar que la app funcione sin errores en navegadores web y en dispositivos móviles.
5. `src/app/index.tsx`: Redirección automática de la ruta raíz a `/login`.

---

## 3. Alucinaciones o Errores Detectados

1. **Top-Level `await` en `_layout.tsx`:**  
   - *Error:* Se detectaron sentencias `await` ejecutadas en el ámbito global del archivo, lo cual rompía el ciclo de empaquetado en React Native / Expo Router.  
   - *Solución:* Se encapsularon dentro de una función asíncrona dentro de `useEffect`.

2. **Incompatibilidad de `expo-sqlite` en Navegadores Web (Worker Chunk & `.wasm`):**  
   - *Error:* Expo SQLite en la web requiere archivos WebAssembly (`wa-sqlite.wasm`) y Web Workers (`worker.ts`) que Metro no empaquetaba por defecto, provocando errores en ejecución Web.  
   - *Solución:* Se configuró `metro.config.js` para registrar `.wasm` y se creó un adaptador en memoria multiplataforma en `database.ts` que permite ejecutar la app sin bloqueos tanto en web como en Android/iOS.

3. **Propiedades de Estilo Deprecadas (`shadow*`):**  
   - *Error:* React Native advertía que las propiedades `shadowColor`, `shadowOffset`, `shadowOpacity` y `shadowRadius` están obsoletas.  
   - *Solución:* Se actualizaron los estilos de tarjetas y contenedores a `boxShadow: '0px 4px 12px rgba(22, 163, 74, 0.08)'`.

4. **Archivos de Ruta Vacíos sin `export default`:**  
   - *Error:* Expo Router lanzaba advertencias por archivos `.tsx` vacíos en `src/app/` que carecían de un componente por defecto.  
   - *Solución:* Se limpiaron los archivos de ruta vacíos para dejar limpia la tabla de rutas.