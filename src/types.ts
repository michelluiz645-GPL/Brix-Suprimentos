export enum UserLevel {
  ADMIN = "ADMIN",
  OPERADOR = "OPERADOR",
}

export interface User {
  login: string;
  nome: string;
  nivel: UserLevel | string;
  setor: "ALMOXARIFADO" | "ENGENHARIA" | "MANUTENCAO" | string;
  modulos: string[];
  senha?: string;
}

export interface Product {
  nome: string;
  categoria: string;
  unid: string;
  preco: number;
  estoque: number;
  estoque_min: number;
  estoque_max: number;
  codigo_produto: string; // Internal product code
  armario: string;
  prateleira: string;
  dias_validade_epi: number;
}

export interface Movement {
  tipo: "ENTRADA" | "SAÍDA" | "DEVOLUÇÃO" | string;
  numero_nf?: string;
  numero_pedido?: string;
  codigo: string;
  nome: string;
  unid: string;
  qtd: number;
  preco: number;
  fornecedor?: string;
  nf?: string;
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
  nome: string;
  funcao: string;
  equipe_num: string;
  cpf?: string;
  tel?: string;
  status: string;
  demitido: boolean;
}

export interface Team {
  nome: string;
  responsavel?: string;
  veiculo?: string;
  tipo?: string;
}

export type Crew = Team;

export interface Vehicle {
  placa: string;
  modelo: string;
  tipo: string;
  equipe?: string;
  ano?: string;
  status: string;
}

export interface FuelMovement {
  tipo: "ENTRADA" | "SAÍDA" | "ABASTECIMENTO EXTERNO" | string;
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

export interface EpiExpiry {
  funcionario: string;
  epi: string;
  data_entrega: string;
  proxima_troca: string;
  responsavel: string;
  obs?: string;
  registrado_por: string;
}

export interface Supplier {
  nome: string;
  cnpj?: string;
  tel?: string;
  email?: string;
  contato?: string;
  cidade?: string;
  estado?: string;
  obs?: string;
  status: string;
  criado_em?: string;
  criado_por?: string;
}

export interface SCItext {
  nome: string;
  qtd: string;
  unidade: string;
  fabricante?: string;
  part_number?: string;
  aplicacao?: string;
  foto_url?: string | null;
  data_item?: string;
  ultimo_preco?: number;
  ultimo_fornecedor?: string;
  ultima_compra?: string;
  valor_estimado?: number;
}

export interface EngineeringSC {
  id: string;
  num_sc: string;
  data_pedido: string;
  data_desejada: string;
  solicitante: string;
  funcao?: string;
  setor_origem: string;
  obra?: string;
  centro_custo?: string;
  tipo_sc: string;
  urgencia: string;
  local_entrega?: string;
  ponto_ref?: string;
  horario?: string;
  os?: string;
  motivo_geral: string;
  itens: SCItext[];
  status: "PENDENTE APROVAÇÃO" | "APROVADA" | "REJEITADA" | "CONCLUÍDA" | string;
  obs_aprovacao?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  sc_b64?: string;
}

export interface PCItem {
  nome: string;
  qtd: string;
  unidade: string;
  preco_unit: number;
  desconto: number;
  data_entrega?: string;
}

export interface EngineeringPC {
  id: string;
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
  pc_b64?: string;
}

export interface Project {
  id: string;
  setor: string;
  nome: string;
  descricao?: string;
  responsavel?: string;
  data_inicio?: string;
  data_prev?: string;
  status: "ATIVA" | "CONCLUÍDA" | "SUSPENSA" | string;
  criado_em?: string;
  criado_por?: string;
}

export interface MaintenanceDebitItem {
  nome: string;
  qtd: number;
  unid: string;
  preco: number;
  colaborador_epi?: string;
  destino?: string;
  destino_frota?: string;
  epi_vencimento?: string;
  categoria?: string;
  frota?: string;
  categoria_debito?: string;
}

export interface MaintenanceDebit {
  numero: string;
  pedido_origem: string;
  data: string;
  equipe: string;
  nome_equipe: string;
  colaborador: string;
  almoxarifado: string;
  itens: MaintenanceDebitItem[];
  total: number;
  status: "ABERTO" | "PAGO" | string;
  registrado_por: string;
  data_pagamento?: string;
}

export interface Equipment {
  nome: string;
  tipo: string;
  serie?: string;
  equipe?: string;
  obs?: string;
  status: string;
}

export interface EquipmentMovement {
  data: string;
  equipamento: string;
  tipo: string;
  responsavel: string;
  obs?: string;
}

export interface MaterialObra {
  codigo: string;
  nome: string;
  categoria: string;
  unidade: string;
  norma?: string;
  especificacao?: string;
  obs?: string;
  status: "ATIVO" | "INATIVO" | string;
  criado_em?: string;
  criado_por?: string;
}

export interface SlipHistory {
  numero: string;
  data: string;
  equipe: string;
  nome_equipe: string;
  colaborador: string;
  total: string;
  itens: number;
  cupom_b64: string;
}
