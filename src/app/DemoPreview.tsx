import { Player, type PlayerRef } from '@remotion/player';
import { Box, Clapperboard, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DEMO } from '../engine/composition/demo';
import { StoryComposition } from '../engine/composition/StoryComposition';

const duration = DEMO.durationInFrames / DEMO.fps;

function PlayerPane() {
  const player = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

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
        <div className="portrait">
          <Player
            ref={player}
            component={StoryComposition}
            compositionWidth={DEMO.width}
            compositionHeight={DEMO.height}
            durationInFrames={DEMO.durationInFrames}
            fps={DEMO.fps}
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
          max={DEMO.durationInFrames - 1}
          onChange={(event) => player.current?.seekTo(event.currentTarget.valueAsNumber)}
        />
        <span className="timecode">{(frame / DEMO.fps).toFixed(2)} / {duration.toFixed(2)} dtk</span>
      </div>
    </>
  );
}

export function DemoPreview({ unavailable }: { unavailable: string | null }) {
  return (
    <section className="panel preview-panel" aria-labelledby="preview-title">
      <header className="panel-heading preview-heading">
        <div className="heading-with-icon"><Clapperboard size={18} aria-hidden /><h2 id="preview-title">Preview 3D</h2></div>
        <span className="technical-tag">9:16</span>
      </header>
      {unavailable ? (
        <div className="stage">
          <div className="portrait preview-message" role="status">
            <Box size={28} aria-hidden />
            <p>{unavailable}</p>
          </div>
        </div>
      ) : <PlayerPane />}
    </section>
  );
}
