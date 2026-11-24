import { Player, type PlayerRef } from '@remotion/player';
import { Box, Clapperboard, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Clip } from '../engine/composition/clip';
import { StoryComposition, type StoryCompositionProps } from '../engine/composition/StoryComposition';
import { getSceneAtFrame } from '../engine/timeline/scenes';
import { getPresets } from '../features/export/settings';

function PlayerPane({ clip, inputProps }: { clip: Clip; inputProps: StoryCompositionProps }) {
  const player = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { aspectRatio, ranges, fps, durationInFrames } = clip;
  const { width, height } = getPresets(aspectRatio)[0];
  const currentScene = getSceneAtFrame(ranges, frame)?.scene.id;

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const update = ({ detail }: { detail: { frame: number } }) => setFrame(detail.frame);
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
  }, []);

  return (
    <>
      <div className="stage">
        <div className="preview-frame" data-ratio={aspectRatio}>
          <Player
            ref={player}
            component={StoryComposition}
            inputProps={inputProps}
            compositionWidth={width}
            compositionHeight={height}
            durationInFrames={durationInFrames}
            fps={fps}
            style={{ width: '100%', height: '100%' }}
            initiallyMuted
            numberOfSharedAudioTags={0}
            clickToPlay={false}
            spaceKeyToPlayOrPause={false}
            loop
            errorFallback={() => (
              <p role="alert" className="preview-message">Preview 3D gagal. Muat ulang halaman atau tutup tab lain.</p>
            )}
          />
        </div>
      </div>
      <div className="transport">
        <button type="button" className="play-control" aria-label={playing ? 'Jeda preview' : 'Putar preview'} onClick={() => player.current?.toggle()}>
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
      {ranges.length > 0 && (
        <div className="scene-list" role="group" aria-label="Pilih scene">
          {ranges.map(({ scene, start }) => (
            <button
              key={scene.id}
              type="button"
              className="button secondary-button"
              aria-current={currentScene === scene.id ? 'step' : undefined}
              onClick={() => { player.current?.pause(); player.current?.seekTo(start); }}
            >
              {scene.name}<span className="timecode">{(start / fps).toFixed(2)} dtk</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function ProjectPreview({ unavailable, clip, inputProps }: { unavailable: string | null; clip: Clip; inputProps: StoryCompositionProps }) {
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
      ) : <PlayerPane clip={clip} inputProps={inputProps} />}
    </section>
  );
}
