import type { LocalAudioTrack } from './audio-track';

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const wavMimes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/vnd.wave'];
const mp3Mimes = ['audio/mpeg', 'audio/mp3', 'audio/x-mp3'];

export async function readAudioFile(file: File): Promise<Pick<LocalAudioTrack, 'blob' | 'mime' | 'name' | 'duration'>> {
  if (file.size > MAX_AUDIO_BYTES) throw new Error('Ukuran audio maksimal 25 MiB per file.');
  if (file.size === 0) throw new Error('File audio kosong.');
  const extension = /\.(mp3|wav)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (extension !== 'wav' && extension !== 'mp3') throw new Error('Pilih file MP3 atau WAV.');
  const mimes = extension === 'wav' ? wavMimes : mp3Mimes;
  if (file.type && file.type !== 'application/octet-stream' && !mimes.includes(file.type)) {
    throw new Error('Jenis file (MIME) tidak sesuai dengan ekstensi audio.');
  }

  const { Input, BlobSource, AudioSampleSink, MP3, WAVE } = await import('mediabunny');
  const format = extension === 'wav' ? WAVE : MP3;
  const input = new Input({ source: new BlobSource(file), formats: [format] });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) throw new Error('Decoder tidak mendukung file.');
    const first = await track.getFirstTimestamp();
    const sample = await new AudioSampleSink(track).getSample(first);
    if (!sample) throw new Error('Sampel audio tidak dapat dibaca.');
    sample.close();
    const duration = await track.computeDuration() - first;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Durasi audio tidak valid.');
    const mime = extension === 'wav' ? 'audio/wav' : 'audio/mpeg';
    return { blob: file.slice(0, file.size, mime), mime, name: file.name, duration };
  } catch {
    throw new Error('Audio gagal didekode. Pilih MP3 atau WAV yang bisa diputar di browser ini.');
  } finally {
    input.dispose();
  }
}
