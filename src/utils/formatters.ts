export function formatCurrency(value: number | string): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  } catch {
    return `R$ ${value}`;
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function epiStatus(proxima_troca: string): "ok" | "alerta" | "vencido" {
  if (!proxima_troca) return "ok";
  const diff = new Date(proxima_troca).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "vencido";
  if (days <= 30) return "alerta";
  return "ok";
}
