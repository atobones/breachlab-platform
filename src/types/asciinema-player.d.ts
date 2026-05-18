// Type stubs for asciinema-player (v3 / no shipped d.ts at install time).
//
// We only use `create(source, target, opts)` and its returned object's
// `.dispose()` method, so the surface stays minimal. If we adopt more
// of the public API later, extend here.

declare module "asciinema-player" {
  export type CastSource =
    | { url: string }
    | { data: string }
    | { data: Uint8Array }
    | { fetch: (init?: RequestInit) => Promise<Response> };

  export type Theme =
    | "asciinema"
    | "dracula"
    | "monokai"
    | "nord"
    | "solarized-dark"
    | "solarized-light"
    | "tango";

  export type PlayerOptions = {
    autoPlay?: boolean;
    preload?: boolean;
    loop?: boolean | number;
    startAt?: number | string;
    speed?: number;
    idleTimeLimit?: number;
    theme?: Theme | string;
    poster?: string;
    fit?: "false" | "width" | "height" | "both" | false;
    terminalFontSize?: string;
    terminalFontFamily?: string;
    terminalLineHeight?: number;
    cols?: number;
    rows?: number;
    title?: string;
    author?: string;
    authorURL?: string;
    authorImgURL?: string;
    pauseOnMarkers?: boolean;
    markers?: Array<[number, string]>;
    logger?: Console;
  };

  export type PlayerHandle = {
    play(): Promise<void>;
    pause(): void;
    seek(time: number | string): Promise<void>;
    getCurrentTime(): number;
    getDuration(): number;
    dispose(): void;
    addEventListener(name: string, handler: (...args: unknown[]) => void): void;
    removeEventListener(
      name: string,
      handler: (...args: unknown[]) => void,
    ): void;
  };

  export function create(
    src: CastSource,
    element: HTMLElement,
    opts?: PlayerOptions,
  ): PlayerHandle;
}

declare module "asciinema-player/dist/bundle/asciinema-player.css" {
  const css: string;
  export default css;
}
