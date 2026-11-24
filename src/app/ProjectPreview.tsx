import { Player, type PlayerRef } from '@remotion/player';
import { Box, Clapperboard, Pause, Play } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import type { Clip } from '../engine/composition/clip';
import { StoryComposition, type StoryCompositionProps } from '../engine/composition/StoryComposition';
import { getSceneAtFrame } from '../engine/timeline/scenes';
import { getPresets } from '../features/export/settings';
import { useStudioUi } from './studio-ui';

type PreviewProps = { clip: Clip; inputProps: StoryCompositionProps; player: RefObject<PlayerRef | null> };

const mobilePreviewQuery = '(width < 48rem)';

function watchPreviewViewport(change: () => void) {
  const query = window.matchMedia(mobilePreviewQuery);
  query.addEventListener('change', change);
  return () => query.removeEventListener('change', change);
}

function isMobilePreview() {
  return window.matchMedia(mobilePreviewQuery).matches;
}

function PlayerPane({ clip, inputProps, player, frame, onFrameChange }: PreviewProps & {
  frame: number;
  onFrameChange: (frame: number) => void;
}) {
  const [initialFrame] = useState(frame);
  const [playing, setPlaying] = useState(false);
  const { aspectRatio, ranges, fps, durationInFrames } = clip;
  const { width, height } = getPresets(aspectRatio)[0];
  // Half the composition dimensions on narrow screens, with the same aspect ratio and DPR 1.
  const scale = useSyncExternalStore(watchPreviewViewport, isMobilePreview) ? 0.5 : 1;

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const update = ({ detail }: { detail: { frame: number } }) => {
      onFrameChange(detail.frame);
      const scene = getSceneAtFrame(ranges, detail.frame)?.scene.id ?? null;
      if (useStudioUi.getState().currentScene !== scene) useStudioUi.setState({ currentScene: scene });
    };
    update({ detail: { frame: current.getCurrentFrame() } });
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    current.addEventListener('frameupdate', update);
    current.addEventListener('seeked', update);
    current.addEventListener('play', play);
    current.addEventListener('pause', pause);
    return () => {
      current.removeEventListener('frameupdate', update);
      current.removeEventListener('seeked', update);
      current.removeEventListener('play', play);
      current.removeEventListener('pause', pause);
    };
  }, [onFrameChange, player, ranges]);

  return (
    <>
      <div className="stage">
        <div className="preview-frame" data-ratio={aspectRatio}>
          <Player
            ref={player}
            component={StoryComposition}
            inputProps={inputProps}
            compositionWidth={width * scale}
            compositionHeight={height * scale}
            durationInFrames={durationInFrames}
            fps={fps}
            initialFrame={initialFrame}
            style={{ width: '100%', height: '100%' }}
            numberOfSharedAudioTags={2}
            clickToPlay={false}
            spaceKeyToPlayOrPause={false}
            loop
            errorFallback={() => (
              <p role="alert" className="preview-message">Preview gagal. Muat ulang halaman. Jika masalah muncul setelah menambah audio, coba ganti file audio.</p>
            )}
          />
        </div>
      </div>
      <div className="transport">
        <button type="button" className="play-control" aria-label={playing ? 'Jeda preview' : 'Putar preview'} onClick={(event) => player.current?.toggle(event)}>
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
        <input
          type="range"
          aria-label="Posisi frame preview"
          value={frame}
          min={0}
          max={durationInFrames - 1}
          onChange={(event) => player.current?.seekTo(event.currentTarget.valueAsNumber)}
        />
        <span className="timecode">{(frame / fps).toFixed(2)} / {(durationInFrames / fps).toFixed(2)} dtk</span>
      </div>
    </>
  );
}

export function ProjectPreview({ unavailable, clip, inputProps, player }: PreviewProps & { unavailable: string | null }) {
  const [frame, setFrame] = useState(0);
  return (
    <section className="panel preview-panel" aria-labelledby="preview-title">
      <header className="panel-heading preview-heading">
        <div className="heading-with-icon"><Clapperboard size={18} aria-hidden /><h2 id="preview-title">Preview 3D</h2></div>
        <span className="technical-tag">{clip.aspectRatio}</span>
      </header>
      {unavailable ? (
        <div className="stage">
          <div className="preview-frame preview-message" data-ratio={clip.aspectRatio} role="status">
            <Box size={28} aria-hidden />
            <p>{unavailable}</p>
          </div>
        </div>
      ) : <PlayerPane clip={clip} inputProps={inputProps} player={player} frame={frame} onFrameChange={setFrame} />}
    </section>
  );
}
