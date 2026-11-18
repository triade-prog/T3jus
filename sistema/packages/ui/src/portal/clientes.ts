// Regras de tela dos Clientes do Portal (AP-01, AP-02, AP-04, AP-06), sem React, para testar
// sozinhas: rascunho do formulário, conferência com o esquema da API e os textos aprovados,
// campos que mudaram no conflito (PT-19) e os rótulos de próximo contato.

import {
  cadastrarClienteSchema, cpfValido, cnpjValido, diasEntre, ESTADOS_CIVIS, FALTANDO_QUALIFICACAO, formatarDocumento, ORIGENS, TOTAL_QUALIFICACAO,
  type DadosCliente, type FichaCliente, type ProxContato, type TipoCliente,
} from "@t3jus/domain";
import { formatarTelefone } from "../console/ficha.ts";

export const MAX_CONTATOS_CLIENTE = 10;

export interface ContatoRascunho {
  chave: number;
  id?: string;
  nome: string;
  papel: string;
  telefone: string;
  email: string;
}

export interface RascunhoCliente {
  tipo: TipoCliente;
  nome: string;
  documento: string;
  nacionalidade: string;
  estadoCivil: string;
  profissao: string;
  rg: string;
  rgOrgao: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  repNome: string;
  repCargo: string;
  repDocumento: string;
  repEstadoCivil: string;
  repProfissao: string;
  origem: string;
  origemIndicacao: string;
  contatos: ContatoRascunho[];
  /** Chave do contato principal. */
  principal: number;
}

type CampoTexto = Exclude<keyof RascunhoCliente, "tipo" | "contatos" | "principal">;

let proxima = 1;
export const novaChaveContato = () => proxima++;

export function rascunhoVazio(tipo: TipoCliente = "PF"): RascunhoCliente {
  const chave = novaChaveContato();
  return {
    tipo, nome: "", documento: "", nacionalidade: "", estadoCivil: "", profissao: "", rg: "", rgOrgao: "", cep: "", endereco: "", bairro: "",
    cidade: "", uf: "", repNome: "", repCargo: "", repDocumento: "", repEstadoCivil: "", repProfissao: "", origem: "", origemIndicacao: "",
    contatos: [{ chave, nome: "", papel: "", telefone: "", email: "" }], principal: chave,
  };
}

const cep = (c: string | null) => (c && c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : (c ?? ""));

export function rascunhoDaFicha(f: FichaCliente): RascunhoCliente {
  const contatos = f.contatos.map((c) => ({
    chave: novaChaveContato(), id: c.id, nome: c.nome, papel: c.papel ?? "", telefone: c.telefone ? formatarTelefone(c.telefone) : "", email: c.email ?? "",
    principal: c.principal,
  }));
  return {
    tipo: f.tipo, nome: f.nome, documento: formatarDocumento(f.documento), nacionalidade: f.nacionalidade ?? "", estadoCivil: f.estadoCivil ?? "",
    profissao: f.profissao ?? "", rg: f.rg ?? "", rgOrgao: f.rgOrgao ?? "", cep: cep(f.cep), endereco: f.endereco ?? "", bairro: f.bairro ?? "",
    cidade: f.cidade ?? "", uf: f.uf ?? "", repNome: f.repNome ?? "", repCargo: f.repCargo ?? "", repDocumento: formatarDocumento(f.repDocumento),
    repEstadoCivil: f.repEstadoCivil ?? "", repProfissao: f.repProfissao ?? "", origem: f.origem ?? "", origemIndicacao: f.origemIndicacao ?? "",
    contatos: contatos.map(({ principal: _p, ...c }) => c),
    principal: (contatos.find((c) => c.principal) ?? contatos[0])?.chave ?? 0,
  };
}

/** Erros do formulário pela chave ("nome", "contato.3.telefone", "contato.3.par"). */
export type ErrosCliente = Record<string, string>;

const TEXTOS: Partial<Record<CampoTexto | "contatos", string>> = {
  nome: "Escreva o nome completo do cliente.",
  nacionalidade: "Escreva a nacionalidade, como brasileira.",
  profissao: "Escreva a profissão com ao menos 2 letras.",
  rg: "Confira o RG: precisa de ao menos 3 caracteres.",
  rgOrgao: "Escreva o órgão emissor, como SSP/SP.",
  cep: "O CEP tem 8 números, como 04117-030.",
  endereco: "Escreva rua e número.",
  bairro: "Escreva o bairro.",
  cidade: "Escreva a cidade.",
  repNome: "Escreva o nome de quem assina pela empresa.",
  repCargo: "Escreva o cargo, como sócio-administrador.",
  repDocumento: "Confira o CPF: os dígitos não batem. Veja se algum número foi trocado, ou deixe em branco por agora.",
  repProfissao: "Escreva a profissão com ao menos 2 letras.",
  origemIndicacao: "Escreva quem indicou com ao menos 2 letras.",
  contatos: "Marque um contato principal.",
};

export function textoDocumento(tipo: TipoCliente): string {
  return tipo === "PJ"
    ? "Confira o CNPJ: os dígitos não batem. Veja se algum número foi trocado, ou deixe em branco por agora."
    : "Confira o CPF: o último dígito não bate com os anteriores. Veja se algum número foi trocado, ou deixe em branco por agora.";
}

/** "Dígitos conferidos" aparece só quando o número está completo e certo. */
export function documentoConfere(tipo: TipoCliente, valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  return tipo === "PJ" ? cnpjValido(d) : cpfValido(d);
}

/** O corpo da API, sem a versão: os contatos levam o principal e o id de quem já existia. */
export function corpoDoRascunho(r: RascunhoCliente) {
  const vazio = (s: string) => (s.trim() ? s : null);
  const base: Record<string, unknown> = {
    tipo: r.tipo, nome: r.nome, documento: vazio(r.documento), nacionalidade: vazio(r.nacionalidade), estadoCivil: vazio(r.estadoCivil),
    profissao: vazio(r.profissao), rg: vazio(r.rg), rgOrgao: vazio(r.rgOrgao), cep: vazio(r.cep), endereco: vazio(r.endereco), bairro: vazio(r.bairro),
    cidade: vazio(r.cidade), uf: vazio(r.uf), origem: vazio(r.origem), origemIndicacao: vazio(r.origemIndicacao),
    contatos: r.contatos.map((c) => ({
      ...(c.id ? { id: c.id } : {}), nome: c.nome, papel: vazio(c.papel), telefone: vazio(c.telefone), email: vazio(c.email), principal: c.chave === r.principal,
    })),
  };
  if (r.tipo === "PJ") {
    Object.assign(base, {
      repNome: vazio(r.repNome), repCargo: vazio(r.repCargo), repDocumento: vazio(r.repDocumento), repEstadoCivil: vazio(r.repEstadoCivil),
      repProfissao: vazio(r.repProfissao),
    });
  }
  return base;
}

/** Confere com o esquema da API e devolve o corpo pronto ou os erros, com os textos aprovados. */
export function conferirCliente(r: RascunhoCliente): { ok: true; corpo: DadosCliente } | { ok: false; erros: ErrosCliente } {
  const v = cadastrarClienteSchema.safeParse(corpoDoRascunho(r));
  if (v.success) return { ok: true, corpo: v.data };
  return { ok: false, erros: errosDosCaminhos(r, v.error.issues.map((i) => i.path as (string | number)[])) };
}

/** Os erros da tela a partir dos caminhos do esquema (ou dos campos que o servidor devolveu). */
export function errosDosCaminhos(r: RascunhoCliente, caminhos: (string | number)[][]): ErrosCliente {
  const erros: ErrosCliente = {};
  for (const [campo, n, sub] of caminhos) {
    if (campo === "contatos" && typeof n === "number") {
      const c = r.contatos[n];
      if (!c) continue;
      const quem = c.nome.trim().split(/\s+/)[0] || "este contato";
      if (sub === "telefone" && !c.telefone.trim() && !c.email.trim()) erros[`contato.${c.chave}.par`] = `Escreva um telefone ou um e-mail de ${quem}. Sem contato, o escritório não tem como falar.`;
      else if (sub === "telefone") erros[`contato.${c.chave}.telefone`] = "Confira o telefone, com o DDD.";
      else if (sub === "email") erros[`contato.${c.chave}.email`] = "Confira o e-mail: falta o @ ou o final, como .com.br.";
      else if (sub === "nome") erros[`contato.${c.chave}.nome`] = "Escreva o nome de quem atende por este contato.";
      else if (sub === "papel") erros[`contato.${c.chave}.papel`] = "O papel tem no máximo 60 letras.";
      continue;
    }
    if (campo === "documento") erros.documento = textoDocumento(r.tipo);
    else if (campo === "estadoCivil" || campo === "repEstadoCivil" || campo === "uf" || campo === "origem") erros[campo] = "Escolha uma das opções.";
    else if (typeof campo === "string" && campo in TEXTOS) erros[campo] = TEXTOS[campo as keyof typeof TEXTOS]!;
  }
  return erros;
}

/** Campos do servidor (snake_case) para os do formulário. */
export function campoDoServidor(c: string): string {
  return c.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());
}

const ROTULOS: Record<CampoTexto, string> = {
  nome: "Nome", documento: "CPF ou CNPJ", nacionalidade: "Nacionalidade", estadoCivil: "Estado civil", profissao: "Profissão", rg: "RG",
  rgOrgao: "Órgão emissor", cep: "CEP", endereco: "Endereço", bairro: "Bairro", cidade: "Cidade", uf: "UF", repNome: "Quem assina",
  repCargo: "Cargo de quem assina", repDocumento: "CPF de quem assina", repEstadoCivil: "Estado civil de quem assina",
  repProfissao: "Profissão de quem assina", origem: "Origem", origemIndicacao: "Quem indicou",
};

function legivel(campo: CampoTexto, v: string): string {
  if (!v.trim()) return "Em branco";
  if (campo === "estadoCivil" || campo === "repEstadoCivil") return ESTADOS_CIVIS[v as keyof typeof ESTADOS_CIVIS] ?? v;
  if (campo === "origem") return ORIGENS[v as keyof typeof ORIGENS] ?? v;
  return v.trim();
}

/** Campos que mudaram entre a versão salva e o que a pessoa escreveu (conflito, PT-19). */
export function diferencasCliente(salvo: RascunhoCliente, meu: RascunhoCliente): { chave: string; campo: string; salvo: string; meu: string }[] {
  const lista: { chave: string; campo: string; salvo: string; meu: string }[] = [];
  const norm = (k: CampoTexto, s: string) => (k === "documento" || k === "repDocumento" || k === "cep" ? s.replace(/\D/g, "") : s.trim());
  for (const k of Object.keys(ROTULOS) as CampoTexto[]) {
    if (norm(k, salvo[k]) !== norm(k, meu[k])) lista.push({ chave: k, campo: ROTULOS[k], salvo: legivel(k, salvo[k]), meu: legivel(k, meu[k]) });
  }
  const resumo = (r: RascunhoCliente) =>
    r.contatos.map((c) => `${c.nome.trim()}|${c.papel.trim()}|${c.telefone.replace(/\D/g, "")}|${c.email.trim().toLowerCase()}|${c.chave === r.principal}`).join(";");
  const nomes = (r: RascunhoCliente) => r.contatos.map((c) => c.nome.trim() || "sem nome").join(", ");
  if (resumo(salvo) !== resumo(meu)) lista.push({ chave: "contatos", campo: "Contatos", salvo: nomes(salvo), meu: nomes(meu) });
  return lista;
}

/** "13/11" e o rótulo: "vencido há 5 dias", "Hoje", "amanhã", "sexta". */
export function rotuloProx(p: Pick<ProxContato, "em">, hoje: string): { data: string; rotulo: string; tipo: "vencido" | "hoje" | "futuro"; dias: number } {
  const [a, m, d] = p.em.split("-");
  const dias = diasEntre(p.em, hoje);
  const data = `${d}/${m}${a === hoje.slice(0, 4) ? "" : `/${a}`}`;
  if (dias > 0) return { data, rotulo: dias === 1 ? "vencido há 1 dia" : `vencido há ${dias} dias`, tipo: "vencido", dias };
  if (dias === 0) return { data, rotulo: "Hoje", tipo: "hoje", dias };
  if (dias === -1) return { data, rotulo: "amanhã", tipo: "futuro", dias };
  if (dias >= -6) {
    const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${p.em}T12:00:00Z`)).replace("-feira", "");
    return { data, rotulo: semana, tipo: "futuro", dias };
  }
  return { data, rotulo: `em ${-dias} dias`, tipo: "futuro", dias };
}

/** "5 de 6" e os nomes do que falta, para a procuração (CH-08). */
export function prontosParaProcuracao(f: Pick<FichaCliente, "tipo" | "faltando">) {
  const total = TOTAL_QUALIFICACAO[f.tipo];
  return { prontos: total - f.faltando.length, total, faltam: f.faltando.map((k) => FALTANDO_QUALIFICACAO[k]) };
}

/** "profissão e RG". */
export function juntarComE(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;
}

/** "18/11/2026" vira "2026-11-18"; data que não existe vira null. */
export function lerData(texto: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(texto);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** "15:10" ou "15h10" vira "15:10". */
export function lerHora(texto: string): string | null {
  const m = /^\s*(\d{1,2})\s*[:h]\s*(\d{2})\s*$/i.exec(texto);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1]!.padStart(2, "0")}:${m[2]}`;
}

/** "2026-11-18" vira "18/11/2026". */
export function dataBr(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Agora em Brasília: data (dd/mm/aaaa) e hora (hh:mm) para o padrão da janela de registrar. */
export function agoraBrasilia(agora = new Date()): { data: string; hora: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(agora).map((x) => [x.type, x.value]),
  );
  return { data: `${p.day}/${p.month}/${p.year}`, hora: `${p.hour === "24" ? "00" : p.hour}:${p.minute}` };
}
