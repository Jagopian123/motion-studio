import { useMemo } from 'react';
import { Sequence } from 'remotion';
import type { ProjectDocument } from '../schema/story-v1';
import { getSceneRanges } from '../timeline/scenes';
import { JsonScene } from './JsonScene';
import { OrbitDemo } from './OrbitDemo';

export type StoryCompositionProps = { project: ProjectDocument | null };

function JsonStory({ project }: { project: ProjectDocument }) {
  const ranges = useMemo(() => getSceneRanges(project.scenes), [project]);
  return ranges.map(({ scene, start }) => (
    <Sequence key={scene.id} name={scene.name} from={start} durationInFrames={scene.durationFrames}>
      <JsonScene scene={scene} />
    </Sequence>
  ));
}

export function StoryComposition({ project }: StoryCompositionProps) {
  return project ? <JsonStory project={project} /> : <OrbitDemo />;
}
