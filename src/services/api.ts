const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

function getToken(): string | null {
  return localStorage.getItem("geplan_token");
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch { /* not json */ }
    throw new Error(message);
  }

  if (res.status === 204) return {} as T;
  const json = await res.json();
  // Desempacota automaticamente o wrapper { data, message } do Laravel
  return ("data" in json ? json.data : json) as T;
}

export const api = {
  auth: {
    login: (login: string, senha: string, setor: string) =>
      request<{ token: string; user: object }>("/login", {
        method: "POST",
        body: JSON.stringify({ login, senha, setor }),
      }),
    logout: () => request("/logout", { method: "POST" }),
    me: () => request<{ user: object }>("/me"),
  },

  produtos: {
    list: (params?: string)          => request<object>(`/produtos${params ? `?${params}` : ""}`),
    get: (id: string)                => request<object>(`/produtos/${id}`),
    create: (data: object)           => request<object>("/produtos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<object>(`/produtos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string)             => request(`/produtos/${id}`, { method: "DELETE" }),
  },

  movimentos: {
    list: (params?: string)  => request<object>(`/movimentos${params ? `?${params}` : ""}`),
    create: (data: object)   => request<object>("/movimentos", { method: "POST", body: JSON.stringify(data) }),
  },

  saidas: {
    create: (data: object)   => request<object>("/saidas", { method: "POST", body: JSON.stringify(data) }),
    cupons: (params?: string) => request<object>(`/saidas/cupons${params ? `?${params}` : ""}`),
  },

  devolucoes: {
    create: (data: object)   => request<object>("/devolucoes", { method: "POST", body: JSON.stringify(data) }),
  },

  entregas: {
    list: (params?: string)  => request<object>(`/entregas${params ? `?${params}` : ""}`),
    confirm: (id: number, data: object) => request<object>(`/entregas/${id}/confirmar`, { method: "POST", body: JSON.stringify(data) }),
  },

  combustiveis: {
    list: (params?: string)  => request<object>(`/combustiveis${params ? `?${params}` : ""}`),
    create: (data: object)   => request<object>("/combustiveis", { method: "POST", body: JSON.stringify(data) }),
    saldo: ()                => request<object>("/combustiveis/saldo"),
  },

  pedidosOrcamento: {
    list:         ()                    => request<object[]>("/pedidos-orcamento"),
    create:       (data: object)        => request<object>("/pedidos-orcamento", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: number, data: object) => request<object>(`/pedidos-orcamento/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  funcionarios: {
    list: (params?: string)  => request<object>(`/funcionarios${params ? `?${params}` : ""}`),
    get: (id: number)        => request<object>(`/funcionarios/${id}`),
    create: (data: object)   => request<object>("/funcionarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/funcionarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  equipes: {
    list: ()                 => request<object>("/equipes"),
    create: (data: object)   => request<object>("/equipes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/equipes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  veiculos: {
    list: ()                 => request<object>("/veiculos"),
    create: (data: object)   => request<object>("/veiculos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/veiculos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  obras: {
    list: (params?: string)  => request<object>(`/obras${params ? `?${params}` : ""}`),
    get: (id: number)        => request<object>(`/obras/${id}`),
    create: (data: object)   => request<object>("/obras", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/obras/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  fornecedores: {
    list: (params?: string)  => request<object>(`/fornecedores${params ? `?${params}` : ""}`),
    create: (data: object)   => request<object>("/fornecedores", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/fornecedores/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  pedidosCompra: {
    list: (params?: string)  => request<object>(`/pedidos-compra${params ? `?${params}` : ""}`),
    get: (id: number)        => request<object>(`/pedidos-compra/${id}`),
    create: (data: object)   => request<object>("/pedidos-compra", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/pedidos-compra/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) =>
      request<object>(`/pedidos-compra/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },

  epi: {
    list: (params?: string)  => request<object>(`/epi${params ? `?${params}` : ""}`),
    create: (data: object)   => request<object>("/epi", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/epi/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  equipamentos: {
    list: ()                 => request<object>("/equipamentos"),
    create: (data: object)   => request<object>("/equipamentos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/equipamentos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  debitos: {
    list: (params?: string)  => request<object>(`/debitos${params ? `?${params}` : ""}`),
    create: (data: object)   => request<object>("/debitos", { method: "POST", body: JSON.stringify(data) }),
    pagar: (id: number)      => request<object>(`/debitos/${id}/pagar`, { method: "PATCH" }),
  },

  usuarios: {
    list: ()                 => request<object>("/usuarios"),
    create: (data: object)   => request<object>("/usuarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => request<object>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    resetSenha: (id: number, senha: string) =>
      request<object>(`/usuarios/${id}/senha`, { method: "PATCH", body: JSON.stringify({ senha }) }),
  },

  kobo: {
    suprimentos: () => request<object>("/kobo/suprimentos"),
    compras: ()     => request<object>("/kobo/compras"),
  },

  sc: {
    list:   (params?: string) => request<object[]>(`/sc${params ? `?${params}` : ""}`),
    show:   (id: number)      => request<object>(`/sc/${id}`),
    create: (data: object)    => request<object>("/sc", { method: "POST", body: JSON.stringify(data) }),
    cotacao:    (id: number, data: object) => request<object>(`/sc/${id}/cotacao`,     { method: "POST", body: JSON.stringify(data) }),
    aprovarMnt: (id: number, data: object) => request<object>(`/sc/${id}/aprovar-mnt`, { method: "POST", body: JSON.stringify(data) }),
    rejeitarMnt:(id: number, data: object) => request<object>(`/sc/${id}/rejeitar-mnt`,{ method: "POST", body: JSON.stringify(data) }),
    aprovarSup: (id: number, data: object) => request<object>(`/sc/${id}/aprovar-sup`, { method: "POST", body: JSON.stringify(data) }),
    comprar:    (id: number, data: object) => request<object>(`/sc/${id}/comprar`,     { method: "POST", body: JSON.stringify(data) }),
    entrada:    (id: number, data: object) => request<object>(`/sc/${id}/entrada`,     { method: "POST", body: JSON.stringify(data) }),
    entradaParcial: (id: number, data: object) => request<object>(`/sc/${id}/entrada-parcial`, { method: "POST", body: JSON.stringify(data) }),
  },

  sistema: {
    status: ()    => request<{ connected: boolean; message: string }>("/sistema/status"),
    backup: ()    => request<object>("/sistema/backup"),
    syncAll: ()   => request<object>("/sistema/sync", { method: "POST" }),
  },
};

export default api;
