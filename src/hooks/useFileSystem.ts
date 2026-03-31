import { useState, useCallback } from 'react';
import { AppData } from '../types';

declare global {
  interface Window {
    showOpenFilePicker: (options?: any) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker: (options?: any) => Promise<FileSystemFileHandle>;
  }
}

export function useFileSystem() {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isSupported] = useState(() => 'showOpenFilePicker' in window);

  const selectFile = useCallback(async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          },
        ],
        multiple: false,
      });
      setFileHandle(handle);
      
      const file = await handle.getFile();
      const content = await file.text();
      return JSON.parse(content) as AppData;
    } catch (err) {
      console.error('File selection failed:', err);
      return null;
    }
  }, []);

  const saveFile = useCallback(async (data: AppData) => {
    if (!fileHandle) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'ideamapper-data.json',
          types: [
            {
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        setFileHandle(handle);
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
      } catch (err) {
        console.error('File save failed:', err);
      }
      return;
    }

    try {
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (err) {
      console.error('Incremental save failed:', err);
    }
  }, [fileHandle]);

  return { isSupported, selectFile, saveFile, hasFile: !!fileHandle };
}
