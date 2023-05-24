import { useCallback } from 'react';

export interface PickFile {
  (options: { accept?: string; multiple: true }): Promise<File[]>;
  (options: { accept?: string; multiple?: false }): Promise<File>;
  (options: { accept?: string; multiple?: boolean }): Promise<File | File[]>;
}

export default function usePickFile() {
  return useCallback<PickFile>(({ accept, multiple } = {}) => {
    return new Promise<any>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept ?? '';
      input.multiple = multiple ?? false;
      input.onchange = () => {
        if (input.files?.[0]) {
          const result = multiple ? Array.from(input.files) : input.files[0];
          resolve(result);
        }
      };
      input.click();
    });
  }, []);
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = (e) => reject(e.target?.error);
  });
}
