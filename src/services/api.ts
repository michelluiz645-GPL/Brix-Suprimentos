export const API_URL = "";

async function request(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // Not JSON
    }
    throw new Error(errorJson?.message || errorJson?.error || errorText || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Read Key from DB
  async get(key: string): Promise<any> {
    return request(`/api/db/get/${encodeURIComponent(key)}`);
  },

  // Set Key in DB
  async set(key: string, data: any): Promise<{ success: boolean; cloudSynced: boolean }> {
    return request(`/api/db/set/${encodeURIComponent(key)}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Auth login
  async login(login: string, senha: string): Promise<{ success: boolean; user: any }> {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, senha }),
    });
  },

  // Kobo Toolbox Suprimentos
  async getKoboSuprimentos(): Promise<{ success: boolean; results: any[] }> {
    return request("/api/kobo/suprimentos");
  },

  // Kobo Toolbox Compras/Pedidos
  async getKoboCompras(): Promise<{ success: boolean; results: any[] }> {
    return request("/api/kobo/compras");
  },

  // Clear/Reset DB Sync status
  async syncAll(): Promise<{ success: boolean; total: number; synced: number; errors: string[] }> {
    return request("/api/db/sync-all", { method: "POST" });
  },

  // Check Supabase connection status
  async getStatus(): Promise<{ connected: boolean; message: string }> {
    return request("/api/db/status");
  },

  // Backup download link
  getBackupDownloadUrl(): string {
    return "/api/db/download-backup";
  }
};
export default api;
