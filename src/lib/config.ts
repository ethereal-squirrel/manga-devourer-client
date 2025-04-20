import { db } from "./database";

interface ConfigCallbacks {
  onServerUpdate: (value: string) => void;
  onDirectionUpdate: (value: "ltr" | "rtl") => void;
  onPageModeUpdate: (value: "single" | "double") => void;
  onResizeModeUpdate: (value: "contain" | "full") => void;
  onLocaleUpdate: (value: string) => void;
}

export class ConfigService {
  static async initializeConfig(callbacks: ConfigCallbacks) {
    await db.connect();
    const result = await db.select<Record<string, any>[]>(
      "SELECT * FROM config",
      []
    );

    if (result.length === 0) {
      await this.createInitialConfig();
    } else {
      this.processExistingConfig(result, callbacks);
    }
  }

  static async updateServerConfig(serverString: string): Promise<void> {
    await db.execute("UPDATE config SET value = $1 WHERE key = 'server'", [
      String(serverString),
    ]);
  }

  private static async createInitialConfig() {
    const defaultConfigs = [
      ["server", ""],
      ["language", "en"],
      ["direction", "ltr"],
      ["pageMode", "single"],
      ["resizeMode", "fit"],
    ];

    for (const [key, value] of defaultConfigs) {
      await db.execute("INSERT INTO config (key, value) VALUES ($1, $2)", [
        key,
        value,
      ]);
    }
  }

  private static processExistingConfig(
    configs: Record<string, any>[],
    callbacks: ConfigCallbacks
  ) {
    for (const config of configs) {
      switch (config.key) {
        case "server":
          callbacks.onServerUpdate(config.value);
          break;
        case "direction":
          callbacks.onDirectionUpdate(config.value as "ltr" | "rtl");
          break;
        case "pageMode":
          callbacks.onPageModeUpdate(config.value as "single" | "double");
          break;
        case "resizeMode":
          callbacks.onResizeModeUpdate(config.value as "contain" | "full");
          break;
        case "language":
          callbacks.onLocaleUpdate(config.value);
          break;
      }
    }
  }
}
