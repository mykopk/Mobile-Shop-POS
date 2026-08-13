export const SOUND = {
  storageKey: "fig.sound.prefs",
  enabled: "Play sounds",
  kinds: [
    {
      value: "click",
      label: "Button clicks",
      description: "Short tick when pressing buttons",
    },
    {
      value: "success",
      label: "Success",
      description: "Chime when an action succeeds",
    },
    {
      value: "error",
      label: "Error",
      description: "Tone when an action fails",
    },
    {
      value: "pop",
      label: "Dialogs",
      description: "Pop when a dialog opens",
    },
  ] as const,
} as const;

export type SoundKind = "click" | "success" | "error" | "pop";
