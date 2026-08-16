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
      report?: {
        get: () => Promise<{ enabled: boolean; repo: string; hasToken: boolean }>;
        set: (cfg: { enabled: boolean; repo?: string; token?: string }) => Promise<{
          enabled: boolean;
          repo: string;
          hasToken: boolean;
        }>;
      };
      logs?: {
        get: () => Promise<string[]>;
        open: () => Promise<boolean>;
      };
      update?: {
        launch: () => Promise<{ launched: boolean }>;
      };
      error?: {
        get: () => Promise<string>;
        copy: (text: string) => Promise<boolean>;
      };
    };
  }
}