export type VideoCategory = 'sponsor' | 'intro' | 'outro' | 'self-promotion' | 'interaction-reminder' | 'preview' | 'filler';

export interface VideoSegment {
  start: number;
  end: number;
  category: VideoCategory;
  source?: string;
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  author?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  platform: string;
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  start: number;
  title: string;
}

export interface PlayerInstance {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  getPlaybackPosition(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  mute?(): void;
  unmute?(): void;
  isMuted?(): boolean;
  setPlaybackRate?(rate: number): void;
  getPlaybackRate?(): number;
  destroy(): void;
}

export interface PlatformAdapter {
  detect(url: string): boolean;
  normalizeUrl?(url: string): string | null;
  getVideoId?(url: string): string | null;
  getMetadata(url: string): Promise<VideoMetadata>;
  loadPlayer(container: HTMLElement, url: string, onProgress: (pos: number) => void): Promise<PlayerInstance>;
  cancelPlayerLoad?(container: HTMLElement): void;
  getSegments?(metadata: VideoMetadata): Promise<VideoSegment[]>;
}
