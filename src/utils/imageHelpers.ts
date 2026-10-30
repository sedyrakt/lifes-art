// src/utils/imageHelpers.ts

export const getCacheBustedUrl = (url: string): string => {
  if (!url) return url;
  return url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
};

export const revokeBlobUrl = (url: string | null) => {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) return { valid: false, error: 'Aucun fichier sélectionné' };
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'L\'image ne doit pas dépasser 5MB' };
  }
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Le fichier doit être une image' };
  }
  return { valid: true };
};