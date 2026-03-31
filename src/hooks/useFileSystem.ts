import { useState, useCallback } from 'react';
import { AppData } from '../types';

declare global {
  interface Window {
    showOpenFilePicker: (options?: any) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker: (options?: any) => Promise<FileSystemFileHandle>;
  }
}

/**
 * A custom hook that provides an interface for interacting with the local file system
 * using the File System Access API. It allows users to select, read, and save
 * JSON files directly from their device.
 */
export function useFileSystem() {
  /** The handle to the currently opened file, used for incremental saves */
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  /** Whether the current browser supports the File System Access API */
  const [isSupported] = useState(() => 'showOpenFilePicker' in window);

  /**
   * Opens a file picker dialog, reads the selected JSON file, and returns its content.
   * @returns The parsed AppData from the file, or null if the selection failed.
   */
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

  /**
   * Saves the provided AppData to the currently opened file or prompts for a new file.
   * @param data The application state to be saved.
   */
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
