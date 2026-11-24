export const audioRoles = ['narration', 'music'] as const;
export type AudioRole = (typeof audioRoles)[number];
export const audioRoleLabel = { narration: 'Narasi', music: 'Musik' } as const;

export type AudioSettings = { startFrame: number; volume: number };
export type LocalAudioTrack = AudioSettings & {
  id: string;
  revision: number;
  projectId: string;
  role: AudioRole;
  blob: Blob;
  mime: 'audio/mpeg' | 'audio/wav';
  name: string;
  duration: number;
};
export type AudioSource = AudioSettings & { id: string; role: AudioRole; src: string };

export function validAudioSettings({ startFrame, volume }: AudioSettings, durationInFrames: number) {
  return Number.isSafeInteger(startFrame) && startFrame >= 0 && startFrame < durationInFrames
    && Number.isFinite(volume) && volume >= 0 && volume <= 1;
}

export function audioSource(track: LocalAudioTrack, src: string): AudioSource {
  const { id, role, startFrame, volume } = track;
  return { id, role, startFrame, volume, src };
}
