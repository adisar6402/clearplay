import type { PlatformAdapter, VideoMetadata, PlayerInstance, VideoSegment } from '@clearplay/core';

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YouTubePlayerOptions {
  height: string;
  width: string;
  videoId: string;
  playerVars: {
    autoplay: number;
    modestbranding: number;
    rel: number;
    playsinline: number;
    enablejsapi: number;
    origin?: string;
    widget_referrer?: string;
  };
  events: {
    onReady: () => void;
    onError: (event: unknown) => void;
  };
}

interface YouTubeErrorEvent {
  data?: number;
}

function isYouTubeErrorEvent(event: unknown): event is YouTubeErrorEvent {
  return typeof event === 'object' && event !== null && ('data' in event) &&
    (event.data === undefined || typeof event.data === 'number');
}

interface YouTubeApi {
  Player: new (container: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | undefined;
const activePlayers = new WeakMap<HTMLElement, YouTubePlayer>();
const playerLoadVersions = new WeakMap<HTMLElement, number>();
const pendingPlayerLoads = new WeakMap<HTMLElement, () => void>();

function createCancelledLoadError() {
  const error = new Error('The player load was superseded.');
  error.name = 'AbortError';
  return error;
}

function getApplicationOrigin() {
  return window.location.protocol === 'http:' || window.location.protocol === 'https:'
    ? window.location.origin
    : undefined;
}

function logYouTubeDiagnostic(message: string, details: Record<string, unknown> = {}) {
  console.debug(`[ClearPlay YouTube] ${message}`, details);
}

function loadYouTubeApi(): Promise<YouTubeApi> {
  const currentApi = window.YT;
  if (currentApi?.Player) return Promise.resolve(currentApi);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const finish = () => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player API is unavailable.'));
    };

    window.onYouTubeIframeAPIReady = finish;
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube player API could not be loaded.'));
      document.head.appendChild(script);
    }
  }).catch((error) => {
    youtubeApiPromise = undefined;
    throw error;
  });

  return youtubeApiPromise;
}

export class YouTubeAdapter implements PlatformAdapter {
  detect(url: string): boolean {
    return this.extractId(url) !== null;
  }

  normalizeUrl(url: string): string | null {
    const id = this.extractId(url);
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
  }

  getVideoId(url: string): string | null {
    return this.extractId(url);
  }

  async getMetadata(url: string): Promise<VideoMetadata> {
    const id = this.extractId(url);
    if (!id) throw new Error('Invalid YouTube URL');

    let title = 'YouTube video';
    let author: string | undefined;
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (response.ok) {
        const data = await response.json() as { title?: string; author_name?: string; thumbnail_url?: string };
        title = data.title?.trim() || title;
        author = data.author_name?.trim() || undefined;
      }
    } catch {
      // The player remains usable when metadata services are unavailable.
    }

    return {
      id,
      url,
      title,
      author,
      platform: 'youtube',
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
    };
  }

  async getSegments(): Promise<VideoSegment[]> {
    // Segment data must come from a legitimate provider. No provider is wired
    // into the MVP yet, so returning an empty list is an intentional degrade.
    return [];
  }

  async loadPlayer(container: HTMLElement, url: string, onProgress: (pos: number) => void): Promise<PlayerInstance> {
    const id = this.extractId(url);
    if (!id) throw new Error('Invalid YouTube URL');

    const loadVersion = (playerLoadVersions.get(container) || 0) + 1;
    playerLoadVersions.set(container, loadVersion);

    const isCurrentLoad = () => playerLoadVersions.get(container) === loadVersion;

    const youtube = await loadYouTubeApi();
    if (!isCurrentLoad()) {
      throw createCancelledLoadError();
    }
    logYouTubeDiagnostic('initializing player', {
      videoId: id,
      loadVersion,
      containerConnected: container.isConnected,
      containerChildCount: container.childElementCount,
      applicationOrigin: getApplicationOrigin(),
      documentReferrer: document.referrer || '(empty)',
      userAgent: navigator.userAgent
    });
    pendingPlayerLoads.get(container)?.();
    const previousPlayer = activePlayers.get(container);
    previousPlayer?.destroy();
    container.replaceChildren();

    return new Promise((resolve, reject) => {
      let settled = false;
      let interval: number | undefined;
      let player: YouTubePlayer | null = null;
      const applicationOrigin = getApplicationOrigin();
      // YouTube expects widget_referrer to be the embedding page URL. Keep
      // origin as the security boundary, and use the full URL for analytics.
      const widgetReferrer = applicationOrigin ? window.location.href : undefined;
      const cancelPendingLoad = () => {
        if (settled) return;
        settled = true;
        if (pendingPlayerLoads.get(container) === cancelPendingLoad) pendingPlayerLoads.delete(container);
        if (isCurrentLoad()) playerLoadVersions.set(container, loadVersion + 1);
        player?.destroy();
        reject(createCancelledLoadError());
      };
      pendingPlayerLoads.set(container, cancelPendingLoad);

      try {
        player = new youtube.Player(container, {
          height: '100%',
          width: '100%',
          videoId: id,
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            ...(applicationOrigin ? { origin: applicationOrigin, widget_referrer: widgetReferrer } : {})
          },
          events: {
            onReady: () => {
              const iframe = container.querySelector<HTMLIFrameElement>('iframe');
              if (iframe) iframe.referrerPolicy = 'strict-origin-when-cross-origin';
              logYouTubeDiagnostic('player ready', {
                videoId: id,
                loadVersion,
                containerConnected: container.isConnected,
                iframeConnected: Boolean(iframe?.isConnected),
                iframeSrc: iframe?.src || '(iframe src unavailable)',
                iframeReferrerPolicy: iframe?.referrerPolicy || '(unset)'
              });
              if (settled) return;
              if (!isCurrentLoad()) {
                settled = true;
                if (pendingPlayerLoads.get(container) === cancelPendingLoad) pendingPlayerLoads.delete(container);
                player?.destroy();
                reject(createCancelledLoadError());
                return;
              }
              settled = true;
              pendingPlayerLoads.delete(container);
              const readyPlayer = player;
              if (!readyPlayer) {
                reject(new Error('YouTube could not create a player.'));
                return;
              }
              const instance: PlayerInstance = {
                play: () => readyPlayer.playVideo(),
                pause: () => readyPlayer.pauseVideo(),
                seek: (s: number) => readyPlayer.seekTo(s, true),
                getPlaybackPosition: () => readyPlayer.getCurrentTime(),
                getDuration: () => readyPlayer.getDuration(),
                setVolume: (v: number) => readyPlayer.setVolume(v),
                mute: () => readyPlayer.mute(),
                unmute: () => readyPlayer.unMute(),
                isMuted: () => readyPlayer.isMuted(),
                setPlaybackRate: (rate: number) => readyPlayer.setPlaybackRate(rate),
                getPlaybackRate: () => readyPlayer.getPlaybackRate(),
                destroy: () => {
                  if (interval !== undefined) window.clearInterval(interval);
                  if (activePlayers.get(container) === readyPlayer) activePlayers.delete(container);
                  readyPlayer.destroy();
                }
              };
              interval = window.setInterval(() => {
                if (readyPlayer.getPlayerState() === youtube.PlayerState.PLAYING) onProgress(readyPlayer.getCurrentTime());
              }, 1000);
              activePlayers.set(container, readyPlayer);
              resolve(instance);
            },
            onError: (event: unknown) => {
              const errorEvent = isYouTubeErrorEvent(event) ? event : {};
              const iframe = container.querySelector<HTMLIFrameElement>('iframe');
              logYouTubeDiagnostic('player error', {
                videoId: id,
                loadVersion,
                errorCode: errorEvent.data ?? '(missing)',
                containerConnected: container.isConnected,
                iframeConnected: Boolean(iframe?.isConnected),
                iframeSrc: iframe?.src || '(iframe src unavailable)',
                applicationOrigin,
                documentReferrer: document.referrer || '(empty)'
              });
              if (settled) return;
              settled = true;
              if (pendingPlayerLoads.get(container) === cancelPendingLoad) pendingPlayerLoads.delete(container);
              player?.destroy();
              if (!isCurrentLoad()) {
                reject(createCancelledLoadError());
                return;
              }
              reject(new Error('YouTube could not play this video. Check that it is public and embeddable.'));
            }
          }
        });
        const iframe = container.querySelector<HTMLIFrameElement>('iframe');
        if (iframe) iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        logYouTubeDiagnostic('iframe created', {
          videoId: id,
          loadVersion,
          containerConnected: container.isConnected,
          iframeConnected: Boolean(iframe?.isConnected),
          iframeSrc: iframe?.src || '(iframe src unavailable)',
          iframeReferrerPolicy: iframe?.referrerPolicy || '(unset)',
          applicationOrigin,
          autoplay: 0,
          muted: false
        });
      } catch (reason) {
        settled = true;
        if (pendingPlayerLoads.get(container) === cancelPendingLoad) pendingPlayerLoads.delete(container);
        reject(reason);
      }
    });
  }

  cancelPlayerLoad(container: HTMLElement): void {
    const nextVersion = (playerLoadVersions.get(container) || 0) + 1;
    playerLoadVersions.set(container, nextVersion);
    pendingPlayerLoads.get(container)?.();
  }

  private extractId(url: string): string | null {
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      let id = '';
      if (host === 'youtu.be') id = parsed.pathname.slice(1);
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        id = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] || '';
      }
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
      return null;
    }
  }
}
