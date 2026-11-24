import { Clapperboard, CodeXml, Music2 } from 'lucide-react';
import type { PlayerRef } from '@remotion/player';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import type { Clip } from '../engine/composition/clip';
import { studioTabs, useStudioUi, type StudioTab } from './studio-ui';

const tabs = { story: { label: 'Story', Icon: CodeXml }, scenes: { label: 'Scenes', Icon: Clapperboard }, audio: { label: 'Audio', Icon: Music2 } };

function formatSeconds(frames: number, fps: number) {
  return `${(frames / fps).toFixed(2)} dtk`;
}

function SceneList({ clip, player, unavailable }: { clip: Clip; player: RefObject<PlayerRef | null>; unavailable: boolean }) {
  const current = useStudioUi((state) => state.currentScene);
  return (
    <div className="panel-content">
      <p className="helper">{clip.ranges.length || 1} scene · {clip.durationInFrames} frame · {formatSeconds(clip.durationInFrames, clip.fps)}</p>
      <ol className="scene-list">
        {clip.ranges.length === 0 ? (
          <li><button type="button" className="button secondary-button scene-button" disabled={unavailable} aria-current="step" onClick={() => { player.current?.pause(); player.current?.seekTo(0); }}>
            <span>Orbit 01</span><span className="mono">{formatSeconds(clip.durationInFrames, clip.fps)}</span>
          </button></li>
        ) : clip.ranges.map(({ scene, start }, index) => (
          <li key={scene.id}>
            <button type="button" className="button secondary-button scene-button" disabled={unavailable} aria-current={(!current && index === 0) || current === scene.id ? 'step' : undefined}
              onClick={() => { player.current?.pause(); player.current?.seekTo(start); }}>
              <span className="scene-text"><strong>{scene.name}</strong><small>Mulai {formatSeconds(start, clip.fps)}</small></span>
              <span className="mono">{formatSeconds(scene.durationFrames, clip.fps)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function EditorPanel({ children, audio, clip, player, unavailable }: { children: ReactNode; audio: ReactNode; clip: Clip; player: RefObject<PlayerRef | null>; unavailable: boolean }) {
  const tab = useStudioUi((state) => state.tab);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, id: StudioTab) {
    const index = studioTabs.indexOf(id);
    const last = studioTabs.length - 1;
    const next = {
      ArrowRight: studioTabs[(index + 1) % studioTabs.length],
      ArrowLeft: studioTabs[(index + last) % studioTabs.length],
      Home: studioTabs[0],
      End: studioTabs[last],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    useStudioUi.setState({ tab: next });
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <section className="panel editor-panel" aria-label="Editor proyek">
      <div className="editor-tabs grid grid-cols-3" role="tablist" aria-label="Editor proyek">
        {studioTabs.map((id) => {
          const { label, Icon } = tabs[id];
          return <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`editor-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onKeyDown={(event) => onTabKey(event, id)} onClick={() => useStudioUi.setState({ tab: id })}>
            <Icon size={16} aria-hidden />{label}
          </button>;
        })}
      </div>
      <div id="editor-story" role="tabpanel" aria-labelledby="tab-story" hidden={tab !== 'story'}>{children}</div>
      <div id="editor-scenes" role="tabpanel" aria-labelledby="tab-scenes" hidden={tab !== 'scenes'}>
        <SceneList clip={clip} player={player} unavailable={unavailable} />
      </div>
      <div id="editor-audio" role="tabpanel" aria-labelledby="tab-audio" hidden={tab !== 'audio'} tabIndex={0}>
        {audio}
      </div>
    </section>
  );
}
