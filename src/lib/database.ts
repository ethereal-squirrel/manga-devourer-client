import Database from "@tauri-apps/plugin-sql";

class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    if (!this.db) {
      this.db = await Database.load("sqlite:library.db");
    }
  }

  public async execute(query: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      await this.connect();
    }
    return this.db!.execute(query, params);
  }

  public async select<T = any>(query: string, params: any[] = []): Promise<T> {
    if (!this.db) {
      await this.connect();
    }
    return this.db!.select<T>(query, params);
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const db = DatabaseService.getInstance();
