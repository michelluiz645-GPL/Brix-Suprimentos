export enum UserLevel {
  ADMIN    = "ADMIN",
  OPERADOR = "OPERADOR",
}

export type Setor = "ALMOXARIFADO" | "ENGENHARIA" | "MANUTENCAO";

export type Papel =
  | "op_manutencao"
  | "admin_manutencao"
  | "op_suprimentos"
  | "admin_suprimentos"
  | "almoxarife"
  | "admin_geral";

export const PAPEL_LABELS: Record<Papel, string> = {
  op_manutencao:    "Operacional Manutenção",
  admin_manutencao: "Admin Manutenção",
  op_suprimentos:   "Operacional Suprimentos",
  admin_suprimentos:"Admin Suprimentos",
  almoxarife:       "Almoxarife",
  admin_geral:      "Administrador Geral",
};

export type ResponsabilidadePedidoOrcamento =
  | "solicitante"
  | "cotador"
  | "aprovador_manutencao"
  | "aprovador_suprimentos"
  | "comprador";

export const RESPONSABILIDADE_PEDIDO_ORCAMENTO_LABELS: Record<ResponsabilidadePedidoOrcamento, string> = {
  solicitante:            "Solicitante (Manutenção)",
  cotador:                "Cotador (Suprimentos)",
  aprovador_manutencao:   "Aprovador — Manutenção Gestor",
  aprovador_suprimentos:  "Aprovador — Suprimentos Gestor",
  comprador:              "Comprador (Suprimentos)",
};

export interface User {
  id?: number;
  login: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  nivel: UserLevel | string;
  papel?: Papel | string;
  setor: Setor | string;
  modulos: string[];
  responsabilidades?: Record<string, string[]>;
  senha?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  setor: Setor | string;
}

export interface ProdutoVariacao {
  id?: number;
  marca: string;
  codigo_fabricante?: string;
  preco: number;
  estoque: number;
  status?: "ATIVO" | "INATIVO";
}

export interface Product {
  id?: number;
  codigo_produto: string;
  nome: string;
  categoria: string;
  unid: string;
  estoque_min: number;
  estoque_max: number;
  armario: string;
  prateleira: string;
  dias_validade_epi?: number;
  status?: "ATIVO" | "INATIVO";
  variacoes: ProdutoVariacao[];
  // Agregados calculados pelo backend a partir das variações (marcas) ativas
  estoque_total?: number;
  valor_total?: number;
  preco_min?: number;
  preco_max?: number;
}

export interface Movement {
  id?: number;
  tipo: "ENTRADA" | "SAÍDA" | "DEVOLUÇÃO" | "AJUSTE" | string;
  numero_nf?: string;
  numero_pedido?: string;
  codigo: string;
  nome: string;
  unid: string;
  qtd: number;
  preco: number;
  fornecedor?: string;
  obs?: string;
  almoxarifado: string;
  responsavel?: string;
  resp_almox?: string;
  data: string;
  usuario: string;
  equipe?: string;
  nome_equipe?: string;
  colaborador?: string;
  colaborador_epi?: string;
  destino_frota?: string;
  destino?: string;
  tipo_saida?: string;
  entregador?: string;
  epi_vencimento?: string;
}

export interface Employee {
  id?: number;
  nome: string;
  funcao: string;
  equipe_num: string;
  cpf?: string;
  tel?: string;
  status: "ATIVO" | "INATIVO" | string;
  demitido: boolean;
}

export interface Team {
  id?: number;
  nome: string;
  numero: string;
  responsavel?: string;
  veiculo?: string;
  tipo?: string;
}

export interface Vehicle {
  id?: number;
  placa: string;
  modelo: string;
  tipo: string;
  equipe?: string;
  ano?: string;
  status: "ATIVO" | "INATIVO" | string;
}

export interface FuelMovement {
  id?: number;
  tipo: "ENTRADA" | "ABASTECIMENTO" | string;
  combustivel: string;
  quantidade: number;
  valor: number;
  fornecedor?: string;
  responsavel: string;
  data: string;
  usuario: string;
  frota?: string;
  equipe?: string;
  km_ho?: string;
}

export interface DeliveryItem {
  nome: string;
  qtd: number;
  unid: string;
  preco: number;
  colaborador_epi?: string;
  destino?: string;
  destino_frota?: string;
  epi_vencimento?: string;
  categoria?: string;
}

export interface Delivery {
  id?: number;
  numero_pedido: string;
  equipe: string;
  nome_equipe: string;
  colaborador: string;
  entregador: string;
  resp_almox: string;
  registrado_por: string;
  data_saida: string;
  almoxarifado: string;
  itens: DeliveryItem[];
  status: "PENDENTE" | "ENTREGUE" | string;
  data_confirmacao?: string;
  confirmado_por?: string;
}

export interface EpiRecord {
  id?: number;
  funcionario: string;
  epi: string;
  data_entrega: string;
  proxima_troca: string;
  responsavel: string;
  obs?: string;
  registrado_por: string;
}

export interface Supplier {
  id?: number;
  nome: string;
  cnpj?: string;
  tel?: string;
  email?: string;
  contato?: string;
  cidade?: string;
  estado?: string;
  obs?: string;
  status: "ATIVO" | "INATIVO" | string;
  criado_em?: string;
  criado_por?: string;
}

export interface PCItem {
  nome: string;
  qtd: string;
  unidade: string;
  preco_unit: number;
  desconto: number;
  data_entrega?: string;
}

export interface PurchaseOrder {
  id?: number;
  num_pc: string;
  data_pedido: string;
  solicitante: string;
  setor_origem: string;
  obra?: string;
  centro_custo?: string;
  num_sc_ref?: string;
  forn_nome: string;
  forn_cnpj?: string;
  forn_tel?: string;
  forn_contato?: string;
  forn_email?: string;
  local_entrega?: string;
  data_desejada?: string;
  cond_pagamento?: string;
  frete: number;
  outras_despesas: number;
  desconto_total: number;
  itens: PCItem[];
  status: "PENDENTE" | "APROVADO" | "CONCLUÍDO" | "CANCELADO" | string;
}

export interface Project {
  id?: number;
  setor: string;
  nome: string;
  tipo?: "PUBLICA" | "PRIVADA" | string;
  descricao?: string;
  responsavel?: string;
  data_inicio?: string;
  data_prev?: string;
  centro_custo?: string;
  status: "ATIVA" | "CONCLUÍDA" | "SUSPENSA" | string;
  criado_em?: string;
  criado_por?: string;
}

export interface Equipment {
  id?: number;
  nome: string;
  tipo: string;
  serie?: string;
  equipe?: string;
  obs?: string;
  status: "ATIVO" | "INATIVO" | string;
}

export interface MaintenanceDebit {
  id?: number;
  numero: string;
  pedido_origem: string;
  data: string;
  equipe: string;
  nome_equipe: string;
  colaborador: string;
  almoxarifado: string;
  itens: DeliveryItem[];
  total: number;
  status: "ABERTO" | "PAGO" | string;
  registrado_por: string;
  data_pagamento?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
