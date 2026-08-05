import { z } from 'zod';

export const OcrTransactionItemSchema = z.object({
  nama_desa: z.string().min(2, "Nama desa minimal 2 karakter"),
  kegiatan: z.string().optional().default("Penyaluran Alokasi Dana Desa"),
  nominal: z.number().positive("Nominal harus bernilai positif"),
  no_rekening: z.string().optional().default("00000000")
});

export const OcrResultSchema = z.object({
  status: z.enum(["success", "error", "warning"]),
  raw_text: z.string().optional().default(""),
  metadata_sumber_dana: z.string().optional().default("ADD"),
  metadata_tahun_anggaran: z.string().optional().default("2026"),
  metadata_no_surat: z.string().optional().default(""),
  data: z.array(OcrTransactionItemSchema).min(1, "Minimal 1 transaksi desa teridentifikasi")
});

export type OcrTransactionItem = z.infer<typeof OcrTransactionItemSchema>;
export type OcrResult = z.infer<typeof OcrResultSchema>;

/**
 * Dual-Engine Schema Fallback Guardrail
 * Multi-pass verification: validates raw OCR JSON output against Zod schema.
 * If schema validation fails or optional fields are missing, sanitizes output or applies fallback defaults.
 */
export function validateAndSanitizeOcrResult(input: unknown): { valid: boolean; data?: OcrResult; errors?: string[] } {
  const parseResult = OcrResultSchema.safeParse(input);
  if (parseResult.success) {
    return { valid: true, data: parseResult.data };
  }

  // Fallback Sanitization for partial OCR data
  const rawObj = input as any;
  if (rawObj && typeof rawObj === 'object' && Array.isArray(rawObj.data)) {
    const sanitizedItems: OcrTransactionItem[] = rawObj.data.map((item: any) => ({
      nama_desa: String(item.nama_desa || 'Desa Tanpa Nama'),
      kegiatan: String(item.kegiatan || 'Penyaluran Dana Desa'),
      nominal: Number(item.nominal) || 0,
      no_rekening: String(item.no_rekening || '00000000')
    })).filter((item: OcrTransactionItem) => item.nominal > 0);

    if (sanitizedItems.length > 0) {
      return {
        valid: true,
        data: {
          status: 'success',
          raw_text: String(rawObj.raw_text || ''),
          metadata_sumber_dana: String(rawObj.metadata_sumber_dana || 'ADD'),
          metadata_tahun_anggaran: String(rawObj.metadata_tahun_anggaran || '2026'),
          metadata_no_surat: String(rawObj.metadata_no_surat || ''),
          data: sanitizedItems
        }
      };
    }
  }

  return {
    valid: false,
    errors: parseResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
  };
}
