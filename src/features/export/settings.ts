export const PRESETS = [
  { id: '720p', width: 720, height: 1280, videoBitrate: 4_000_000 },
  { id: '540p', width: 540, height: 960, videoBitrate: 2_500_000 },
] as const;

export type Preset = (typeof PRESETS)[number];
export type EncoderPreference = 'prefer-hardware' | 'no-preference';

export type PresetSupport =
  | { supported: true; encoder: EncoderPreference }
  | { supported: false; detail: string };

export function describeRenderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/webgl|context lost|context was lost/i.test(message)) {
    return 'WebGL berhenti. Tutup tab lain, muat ulang halaman, lalu coba 540p.';
  }
  if (/memory|quota|allocat/i.test(message)) {
    return 'Memori atau ruang penyimpanan terbatas. Kosongkan ruang dan coba 540p.';
  }
  if (/timeout|timed out|delayRender/i.test(message)) {
    return 'Render melewati batas waktu. Jaga tab tetap aktif dan coba 540p.';
  }
  return 'Ekspor gagal. Coba ulang dengan tab tetap aktif, atau pilih 540p jika tersedia.';
}

export function canRetryWithBrowserEncoder(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return ['NotSupportedError', 'EncodingError', 'OperationError', 'QuotaExceededError'].includes(error.name)
    || /encoder|encoding|codec/i.test(error.message);
}

export async function isMp4(blob: Blob): Promise<boolean> {
  return (await blob.slice(4, 8).text()) === 'ftyp' && blob.type === 'video/mp4';
}
