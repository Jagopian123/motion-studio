import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { OrthographicCamera, PerspectiveCamera } from 'three';
import type { StoryScene } from '../schema/story-v1';
import { evaluateCamera } from '../timeline/animation';

function applyCameraPose(view: PerspectiveCamera | OrthographicCamera, pose: ReturnType<typeof evaluateCamera>, aspect: number) {
  view.position.set(...pose.position);
  // Two valid keyframes can cross the target in between. Three's lookAt uses
  // a fixed -Z direction at coincidence, so the result stays seek-independent.
  view.lookAt(...pose.target);
  if (pose.type === 'perspective' && view instanceof PerspectiveCamera) {
    view.fov = pose.fov;
    view.aspect = aspect;
  } else if (pose.type === 'orthographic' && view instanceof OrthographicCamera) {
    const halfHeight = pose.orthoSize / 2;
    view.top = halfHeight;
    view.bottom = -halfHeight;
    view.left = -halfHeight * aspect;
    view.right = halfHeight * aspect;
  }
  view.updateProjectionMatrix();
}

export function SceneCamera({ camera, frame, aspect }: { camera: StoryScene['camera']; frame: number; aspect: number }) {
  const view = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    applyCameraPose(view, evaluateCamera(camera, frame), aspect);
    invalidate();
  }, [aspect, camera, frame, invalidate, view]);

  return null;
}
