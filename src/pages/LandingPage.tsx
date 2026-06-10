import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Package, Building2, Wrench, Shield, BarChart2, Users } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-[#EA6C0A]">⚙️</span>
            <span className="text-lg font-black tracking-widest">
              GE<span className="text-[#EA6C0A]">PLAN</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
            <a href="#setores" className="hover:text-white transition-colors">Setores</a>
            <a href="#sobre" className="hover:text-white transition-colors">Sobre</a>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 active:translate-y-0 px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-orange-500/20 transition-all duration-150"
          >
            Acessar o Sistema
            <ChevronRight size={16} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#EA6C0A]/10 border border-[#EA6C0A]/20 rounded-full px-4 py-1.5 text-xs font-bold text-[#EA6C0A] uppercase tracking-wider mb-6">
              ⚙️ Sistema de Gestão Operacional
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6">
              Controle total da{" "}
              <span className="text-[#EA6C0A]">operação</span>{" "}
              em campo
            </h1>
            <p className="text-lg text-slate-400 mb-10 leading-relaxed">
              GEPLAN integra almoxarifado, engenharia e manutenção em uma plataforma única.
              Estoque em tempo real, pedidos de compra, EPIs, frota e muito mais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-8 py-4 rounded-xl text-base font-bold shadow-2xl shadow-orange-500/25 hover:-translate-y-1 transition-all duration-200"
              >
                Acessar o Sistema
                <ChevronRight size={18} />
              </button>
              <a
                href="#servicos"
                className="flex items-center justify-center gap-2 border border-[#1E293B] hover:border-slate-500 px-8 py-4 rounded-xl text-base font-medium text-slate-400 hover:text-white transition-all duration-200"
              >
                Conhecer os módulos
              </a>
            </div>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-[#EA6C0A]/5 to-transparent pointer-events-none" />
      </section>

      {/* Stats */}
      <section className="border-y border-[#1E293B] bg-[#0A0F1D]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "3", label: "Setores integrados" },
              { value: "25+", label: "Módulos funcionais" },
              { value: "100%", label: "Baseado em nuvem" },
              { value: "24/7", label: "Disponibilidade" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-mono text-3xl font-black text-[#EA6C0A]">{stat.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-xs font-bold uppercase tracking-widest text-[#EA6C0A] mb-3">Áreas de Atuação</div>
          <h2 className="text-3xl md:text-4xl font-black">Gestão completa para o setor</h2>
          <div className="w-12 h-1 bg-[#EA6C0A] rounded mx-auto mt-4" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "🏔️",
              title: "Terraplanagem",
              description:
                "Controle de máquinas pesadas, consumo de combustível, equipes de campo e materiais para obras de movimento de terra.",
              items: ["Frota de equipamentos", "Controle de combustível", "Equipes por obra", "Histórico de manutenção"],
            },
            {
              icon: "🏗️",
              title: "Obras Públicas e Privadas",
              description:
                "Gestão de insumos, pedidos de compra, fornecedores e documentação para obras públicas e privadas de qualquer porte.",
              items: ["Solicitações de compra", "Gestão de fornecedores", "Centro de custo por obra", "Relatórios gerenciais"],
            },
            {
              icon: "🔧",
              title: "Conservação e Manutenção",
              description:
                "Controle de EPIs, débitos de oficina, pedidos de reposição e equipes de manutenção preventiva e corretiva.",
              items: ["Controle de EPIs", "Débitos de oficina", "Pedidos de reposição", "Equipamentos pesados"],
            },
          ].map((service) => (
            <div key={service.title} className="bg-[#0A0F1D] border border-[#1E293B] rounded-2xl p-8 hover:border-[#EA6C0A]/30 transition-colors group">
              <div className="text-4xl mb-5">{service.icon}</div>
              <h3 className="text-lg font-bold text-white mb-3">{service.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">{service.description}</p>
              <ul className="space-y-2">
                {service.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                    <span className="w-1 h-1 rounded-full bg-[#EA6C0A] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Setores */}
      <section id="setores" className="py-24 bg-[#0A0F1D]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-[#EA6C0A] mb-3">Módulos por Setor</div>
            <h2 className="text-3xl md:text-4xl font-black">Cada setor com seu painel</h2>
            <div className="w-12 h-1 bg-[#EA6C0A] rounded mx-auto mt-4" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Package size={24} />,
                label: "Almoxarifado",
                color: "#2563EB",
                modules: ["Dashboard de KPIs", "Entrada e Saída de materiais", "Controle de estoque", "Combustíveis", "Inventário físico", "Fichas de produtos", "Equipes e funcionários"],
              },
              {
                icon: <Building2 size={24} />,
                label: "Engenharia",
                color: "#EA6C0A",
                modules: ["Obras públicas e privadas", "Gestão de fornecedores", "Pedidos de compra", "Suprimentos KOBO", "Rel. de abastecimento", "Equipamentos pesados", "EPI & Segurança"],
              },
              {
                icon: <Wrench size={24} />,
                label: "Manutenção",
                color: "#10B981",
                modules: ["Meus pedidos", "Pedidos de compra", "Débitos de oficina", "Equipamentos pesados", "EPI & Segurança", "Controle de acesso", "Histórico de serviços"],
              },
            ].map((sector) => (
              <div key={sector.label} className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${sector.color}20`, color: sector.color }}
                >
                  {sector.icon}
                </div>
                <h3 className="font-bold text-white mb-4">{sector.label}</h3>
                <ul className="space-y-2">
                  {sector.modules.map((m) => (
                    <li key={m} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: sector.color }} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#EA6C0A] mb-3">Por que o GEPLAN</div>
            <h2 className="text-3xl md:text-4xl font-black mb-6">
              Estrutura primeiro.<br />Funcionalidades depois.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              O GEPLAN foi desenvolvido para empresas que precisam de controle operacional real,
              com rastreabilidade completa de materiais, pedidos, equipes e equipamentos — tudo em um
              único sistema com permissões por setor.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all"
            >
              Entrar no sistema
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Shield size={20} />, title: "Controle de Acesso", desc: "Permissões por setor e nível de usuário" },
              { icon: <BarChart2 size={20} />, title: "KPIs em Tempo Real", desc: "Painéis com dados atualizados ao vivo" },
              { icon: <Users size={20} />, title: "Multi-setor", desc: "Almoxarifado, Engenharia e Manutenção" },
              { icon: <Package size={20} />, title: "Estoque Inteligente", desc: "Alertas automáticos de reposição" },
            ].map((feature) => (
              <div key={feature.title} className="bg-[#0A0F1D] border border-[#1E293B] rounded-xl p-5">
                <div className="text-[#EA6C0A] mb-3">{feature.icon}</div>
                <div className="text-sm font-bold text-white mb-1">{feature.title}</div>
                <div className="text-xs text-slate-500">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#C75B12]/10 to-[#EA6C0A]/5 border-y border-[#1E293B]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-4">Pronto para começar?</h2>
          <p className="text-slate-400 mb-8">Acesse o sistema com suas credenciais corporativas.</p>
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-10 py-4 rounded-xl text-base font-bold shadow-2xl shadow-orange-500/25 hover:-translate-y-1 transition-all"
          >
            Acessar o Sistema
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0F1D] border-t border-[#1E293B] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#EA6C0A]">⚙️</span>
            <span className="font-black tracking-widest text-sm">
              GE<span className="text-[#EA6C0A]">PLAN</span>
            </span>
          </div>
          <p className="text-xs text-slate-600">
            GEPLAN &copy; {new Date().getFullYear()} &middot; ERP Corporativo para Infraestrutura &middot; Todos os direitos reservados.
          </p>
          <div className="text-xs text-slate-600">
            Terraplanagem · Obras · Manutenção
          </div>
        </div>
      </footer>
    </div>
  );
}
