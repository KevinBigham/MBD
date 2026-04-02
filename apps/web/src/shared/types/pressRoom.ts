export type PressRoomSource = 'briefing' | 'news';
export type PressRoomTag = 'BREAKING' | 'ANALYSIS' | 'RECAP' | 'RUMOR';

export interface PressRoomEntry {
  id: string;
  source: PressRoomSource;
  category: string;
  tag: PressRoomTag;
  priority: number;
  headline: string;
  body: string;
  timestamp: string;
  relatedTeamIds: string[];
  relatedPlayerIds: string[];
}
