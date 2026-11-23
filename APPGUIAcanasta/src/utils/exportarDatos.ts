import { Platform } from 'react-native';

export async function exportarArchivoJson(datos: unknown, nombreArchivo: string): Promise<void> {
  if (Platform.OS !== 'web') {
    const [{ File, Paths }, Sharing] = await Promise.all([
      import('expo-file-system'),
      import('expo-sharing'),
    ]);
    const file = new File(Paths.cache, nombreArchivo);
    try {
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(datos, null, 2));
      if (!await Sharing.isAvailableAsync()) {
        throw new Error('Compartir archivos no está disponible en este dispositivo.');
      }
      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'Exportar mis datos de Mi Canasta',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } finally {
      if (file.exists) file.delete();
    }
    return;
  }

  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('La descarga de archivos no está disponible en este navegador.');
  }

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
