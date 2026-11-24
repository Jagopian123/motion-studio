import { characterPresets, type ProjectDocument, type StoryScene } from './story-v1';

export type StoryIssue = { path: readonly (string | number)[]; message: string };

type Report = (path: StoryIssue['path'], message: string) => void;

function validateKeyframes(
  keyframes: readonly { frame: number }[],
  duration: number,
  path: StoryIssue['path'],
  report: Report,
) {
  let previous = -1;
  keyframes.forEach(({ frame }, index) => {
    const framePath = [...path, index, 'frame'];
    if (index === 0 && frame !== 0) report(framePath, 'Keyframe pertama harus berada pada frame 0.');
    if (frame <= previous) report(framePath, 'Frame keyframe harus unik dan berurutan naik.');
    if (frame >= duration) report(framePath, `Frame harus lebih kecil dari durasi scene (${duration}).`);
    previous = frame;
  });
}

function validateNodes(scene: StoryScene, report: Report) {
  const indexes = new Map<string, number>();
  scene.nodes.forEach((node, index) => {
    if (indexes.has(node.id)) report(['nodes', index, 'id'], `ID node "${node.id}" sudah dipakai.`);
    else indexes.set(node.id, index);
  });

  const visited = new Set<number>();
  const visiting = new Set<number>();
  function visit(index: number) {
    if (visited.has(index)) return;
    const node = scene.nodes[index]!;
    visiting.add(index);
    if (node.parentId !== undefined) {
      const parent = indexes.get(node.parentId);
      if (parent === undefined) report(['nodes', index, 'parentId'], `Parent "${node.parentId}" tidak ditemukan.`);
      else if (visiting.has(parent)) report(['nodes', index, 'parentId'], `Parent "${node.parentId}" membentuk siklus.`);
      else visit(parent);
    }
    visiting.delete(index);
    visited.add(index);
  }

  scene.nodes.forEach((node, index) => {
    visit(index);
    if (node.kind === 'mesh' && node.geometry.type === 'cylinder'
      && node.geometry.radiusTop === 0 && node.geometry.radiusBottom === 0) {
      report(['nodes', index, 'geometry', 'radiusTop'], 'Setidaknya satu radius silinder harus lebih besar dari nol.');
    }
    if (node.kind === 'preset' && node.action && !characterPresets.some((preset) => preset === node.preset)) {
      report(['nodes', index, 'action'], `Preset "${node.preset}" tidak mendukung action.`);
    }
    const properties = new Set<string>();
    node.tracks.forEach((track, trackIndex) => {
      const path = ['nodes', index, 'tracks', trackIndex];
      if (properties.has(track.property)) report([...path, 'property'], `Track "${track.property}" sudah ada.`);
      properties.add(track.property);
      validateKeyframes(track.keyframes, scene.durationFrames, [...path, 'keyframes'], report);
    });
  });
}

function validateCaptions(scene: StoryScene, report: Report) {
  const ranges = scene.captions.map(({ startFrame, endFrame }, index) => ({ startFrame, endFrame, index }));
  ranges.sort((a, b) => a.startFrame - b.startFrame);
  let latestEnd = 0;
  for (const { startFrame, endFrame, index } of ranges) {
    if (endFrame > scene.durationFrames) {
      report(['captions', index, 'endFrame'], `Akhir caption melebihi durasi scene (${scene.durationFrames}).`);
    }
    if (endFrame <= startFrame) {
      report(['captions', index, 'endFrame'], 'Akhir caption harus lebih besar dari awal.');
      continue;
    }
    if (startFrame < latestEnd) report(['captions', index, 'startFrame'], 'Waktu caption bertumpang tindih.');
    latestEnd = Math.max(latestEnd, endFrame);
  }
}

export function validateStorySemantics(project: ProjectDocument): StoryIssue[] {
  const issues: StoryIssue[] = [];
  const sceneIds = new Set<string>();
  let total = 0;
  const limit = project.fps * 60;

  project.scenes.forEach((scene, index) => {
    const report: Report = (path, message) => issues.push({ path: ['scenes', index, ...path], message });
    total += scene.durationFrames;
    if (scene.durationFrames > limit) report(['durationFrames'], `Durasi scene melebihi ${limit} frame pada ${project.fps} FPS.`);
    if (sceneIds.has(scene.id)) report(['id'], `ID scene "${scene.id}" sudah dipakai.`);
    sceneIds.add(scene.id);

    if (scene.world.fog && scene.world.fog.far <= scene.world.fog.near) {
      report(['world', 'fog', 'far'], 'Jarak far harus lebih besar dari near.');
    }
    validateKeyframes(scene.camera.keyframes, scene.durationFrames, ['camera', 'keyframes'], report);
    scene.camera.keyframes.forEach(({ position, target }, keyframe) => {
      if (position[0] === target[0] && position[1] === target[1] && position[2] === target[2]) {
        report(['camera', 'keyframes', keyframe, 'target'], 'Target kamera harus berbeda dari posisi kamera.');
      }
    });
    validateNodes(scene, report);
    validateCaptions(scene, report);
  });

  if (total > limit) issues.unshift({ path: ['scenes'], message: `Total ${total} frame melebihi batas ${limit} frame (60 detik).` });
  return issues;
}
