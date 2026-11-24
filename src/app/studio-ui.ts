import { create } from 'zustand';

export const studioTabs = ['story', 'scenes', 'audio'] as const;
export type StudioTab = typeof studioTabs[number];

export const useStudioUi = create<{
  tab: StudioTab;
  modal: 'projects' | 'export' | null;
  currentScene: string | null;
}>(() => ({ tab: 'story', modal: null, currentScene: null }));
