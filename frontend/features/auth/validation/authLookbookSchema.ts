import { z } from 'zod';
import { LOOKBOOK_CAPTION_MAX, LOOKBOOK_LABEL_MAX } from '../types/authLookbook';

export const authLookbookSchema = z.object({
  caption: z.string().trim().max(LOOKBOOK_CAPTION_MAX, `Tối đa ${LOOKBOOK_CAPTION_MAX} ký tự`),
  label: z.string().trim().max(LOOKBOOK_LABEL_MAX, `Tối đa ${LOOKBOOK_LABEL_MAX} ký tự`),
});

export type AuthLookbookFormValues = z.infer<typeof authLookbookSchema>;
