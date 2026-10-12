export interface AuthLookbook {
  imageUrl: string | null;
  caption: string | null;
  label: string | null;
}

export const DEFAULT_LOOKBOOK_CAPTION = 'Áo khoác len, màu đất';
export const DEFAULT_LOOKBOOK_LABEL = 'N° 014';
export const LOOKBOOK_CAPTION_MAX = 200;
export const LOOKBOOK_LABEL_MAX = 40;
