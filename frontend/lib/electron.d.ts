export {};

declare global {
  interface Window {
    fig?: {
      isElectron?: boolean;
      platform?: string;
      runtime?: {
        get: () => Promise<{ mode: "local" | "hosted"; hostedUrl: string }>;
        set: (cfg: { mode: "local" | "hosted"; hostedUrl: string }) => Promise<unknown>;
      };
      logs?: {
        get: () => Promise<string[]>;
        open: () => Promise<boolean>;
      };
    };
  }
}