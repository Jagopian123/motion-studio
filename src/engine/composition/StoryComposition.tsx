import { Audio } from '@remotion/media';
import { useMemo } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import type { AudioSource } from '../../features/audio/audio-track';
import type { ProjectDocument } from '../schema/story-v1';
import { getSceneRanges } from '../timeline/scenes';
import { JsonScene } from './JsonScene';
import { OrbitDemo } from './OrbitDemo';

export type StoryCompositionProps = { project: ProjectDocument | null; audio: AudioSource[] };

function JsonStory({ project }: { project: ProjectDocument }) {
  const ranges = useMemo(() => getSceneRanges(project.scenes), [project]);
  return ranges.map(({ scene, start }) => (
    <Sequence key={scene.id} name={scene.name} from={start} durationInFrames={scene.durationFrames}>
      <JsonScene scene={scene} />
    </Sequence>
  ));
}

export function StoryComposition({ project, audio }: StoryCompositionProps) {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill data-motion-composition>
      {project ? <JsonStory project={project} /> : <OrbitDemo />}
      {audio.map(({ id, role, src, startFrame, volume }) => startFrame < durationInFrames && (
        <Audio key={id} name={role} src={src} from={startFrame} durationInFrames={durationInFrames - startFrame} volume={volume} />
      ))}
    </AbsoluteFill>
  );
}
