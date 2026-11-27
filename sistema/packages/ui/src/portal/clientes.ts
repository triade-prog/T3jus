// Regras de tela dos Clientes do Portal (AP-01, AP-02, AP-04, AP-06), sem React, para testar
// sozinhas: rascunho do formulário, conferência com o esquema da API e os textos aprovados,
// campos que mudaram no conflito (PT-19) e os rótulos de próximo contato.

import {
  CAPACIDADES, MODOS_CURATELA, PAPEIS_RESPONSAVEL, cadastrarClienteSchema, cpfValido, cnpjValido, diaBrasilia, diasEntre, ESTADOS_CIVIS, FALTANDO_QUALIFICACAO, formatarDocumento, hojeBrasilia, nascimentoNoFuturo, ORIGENS, TIPOS_DOCUMENTO_PESSOAL, TOTAL_QUALIFICACAO,
  type DadosCliente, type FichaCliente, type ProxContato, type SituacaoCliente, type TipoCliente, type TipoDocumentoPessoal,
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

/**
 * Os tipos que os seletores de documento pessoal oferecem (Documentos pessoais e a lista por área).
 * O termo de curatela (F3.118) fica de fora: só aparece nas telas do responsável legal.
 */
export const TIPOS_NO_SELETOR = Object.keys(TIPOS_DOCUMENTO_PESSOAL) as TipoDocumentoPessoal[];

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
  /** Quem assina (F3.98): PLENA, MENOR ou CURATELA. A data é escrita como dd/mm/aaaa. */
  capacidade: string;
  nascimento: string;
  rlPapel: string;
  rlNome: string;
  rlDocumento: string;
  rlRg: string;
  rlRgOrgao: string;
  rlNacionalidade: string;
  rlEstadoCivil: string;
  rlProfissao: string;
  rlMoraJunto: boolean;
  rlCep: string;
  rlEndereco: string;
  rlBairro: string;
  rlCidade: string;
  rlUf: string;
  curModo: string;
  curProcesso: string;
  curVara: string;
  contatos: ContatoRascunho[];
  /** Chave do contato principal. */
  principal: number;
}

type CampoTexto = Exclude<keyof RascunhoCliente, "tipo" | "contatos" | "principal" | "rlMoraJunto">;

const QUEM_ASSINA_VAZIO = {
  capacidade: "PLENA", nascimento: "", rlPapel: "", rlNome: "", rlDocumento: "", rlRg: "", rlRgOrgao: "", rlNacionalidade: "", rlEstadoCivil: "",
  rlProfissao: "", rlMoraJunto: true, rlCep: "", rlEndereco: "", rlBairro: "", rlCidade: "", rlUf: "", curModo: "REPRESENTA", curProcesso: "", curVara: "",
};

let proxima = 1;
export const novaChaveContato = () => proxima++;

export function rascunhoVazio(tipo: TipoCliente = "PF"): RascunhoCliente {
  const chave = novaChaveContato();
  return {
    tipo, nome: "", documento: "", nacionalidade: "", estadoCivil: "", profissao: "", rg: "", rgOrgao: "", cep: "", endereco: "", bairro: "",
    cidade: "", uf: "", repNome: "", repCargo: "", repDocumento: "", repEstadoCivil: "", repProfissao: "", origem: "", origemIndicacao: "",
    ...QUEM_ASSINA_VAZIO,
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
    capacidade: f.capacidade ?? "PLENA", nascimento: f.nascimento ? dataBr(f.nascimento) : "", rlPapel: f.rlPapel ?? "", rlNome: f.rlNome ?? "",
    rlDocumento: formatarDocumento(f.rlDocumento), rlRg: f.rlRg ?? "", rlRgOrgao: f.rlRgOrgao ?? "", rlNacionalidade: f.rlNacionalidade ?? "",
    rlEstadoCivil: f.rlEstadoCivil ?? "", rlProfissao: f.rlProfissao ?? "", rlMoraJunto: f.rlMoraJunto ?? true, rlCep: cep(f.rlCep ?? null),
    rlEndereco: f.rlEndereco ?? "", rlBairro: f.rlBairro ?? "", rlCidade: f.rlCidade ?? "", rlUf: f.rlUf ?? "", curModo: f.curModo ?? "REPRESENTA",
    curProcesso: f.curProcesso ?? "", curVara: f.curVara ?? "",
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
  nascimento: "Escreva a data de nascimento, como 14/03/2014. É com ela que o T3jus sabe quem assina.",
  rlNome: "Escreva o nome de quem assina. Sem ele, a procuração não tem quem assine.",
  rlPapel: "Escolha quem é.",
  rlDocumento: "Confira o CPF: os dígitos não batem. Veja se algum número foi trocado, ou deixe em branco por agora.",
  rlRg: "Confira o RG: precisa de ao menos 3 caracteres.",
  rlRgOrgao: "Escreva o órgão emissor, como SSP/SP.",
  rlNacionalidade: "Escreva a nacionalidade, como brasileira.",
  rlProfissao: "Escreva a profissão com ao menos 2 letras.",
  rlCep: "O CEP tem 8 números, como 04117-030.",
  rlEndereco: "Escreva rua e número.",
  rlBairro: "Escreva o bairro.",
  rlCidade: "Escreva a cidade.",
  curProcesso: "Confira o número do processo.",
  curVara: "Escreva a vara e a comarca.",
};

/**
 * O rótulo da situação do cadastro (D6 da revisão das F3.181 a F3.190, junto com a F3.188, AP-01): o mesmo
 * no aviso de duplicado do cadastro e no aviso do mesmo CPF da janela de exclusão. Antes, o aviso de
 * duplicado mostrava o arquivado a pedido como "Inativo".
 */
export function rotuloSituacao(s: SituacaoCliente): string {
  return s === "ATIVO" ? "Ativo" : s === "INATIVO" ? "Inativo" : s === "ARQUIVADO" ? "Arquivado a pedido" : "Excluído a pedido";
}

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
  if (r.tipo === "PF" && r.capacidade !== "PLENA") {
    const menor = r.capacidade === "MENOR";
    Object.assign(base, {
      capacidade: r.capacidade,
      // Data que não existe vai como foi escrita: o esquema recusa e o erro fica no campo.
      nascimento: menor && r.nascimento.trim() ? (lerData(r.nascimento) ?? r.nascimento.trim()) : null,
      rlPapel: vazio(r.rlPapel), rlNome: vazio(r.rlNome), rlDocumento: vazio(r.rlDocumento), rlRg: vazio(r.rlRg), rlRgOrgao: vazio(r.rlRgOrgao),
      rlNacionalidade: vazio(r.rlNacionalidade), rlEstadoCivil: vazio(r.rlEstadoCivil), rlProfissao: vazio(r.rlProfissao), rlMoraJunto: r.rlMoraJunto,
      ...(r.rlMoraJunto ? {} : {
        rlCep: vazio(r.rlCep), rlEndereco: vazio(r.rlEndereco), rlBairro: vazio(r.rlBairro), rlCidade: vazio(r.rlCidade), rlUf: vazio(r.rlUf),
      }),
      ...(menor ? {} : { curModo: vazio(r.curModo), curProcesso: vazio(r.curProcesso), curVara: vazio(r.curVara) }),
    });
  }
  if (r.tipo === "PJ") {
    Object.assign(base, {
      repNome: vazio(r.repNome), repCargo: vazio(r.repCargo), repDocumento: vazio(r.repDocumento), repEstadoCivil: vazio(r.repEstadoCivil),
      repProfissao: vazio(r.repProfissao),
    });
  }
  return base;
}

/** Confere com o esquema da API e devolve o corpo pronto ou os erros, com os textos aprovados. */
export function conferirCliente(r: RascunhoCliente, hoje: string = hojeBrasilia()): { ok: true; corpo: DadosCliente } | { ok: false; erros: ErrosCliente } {
  const v = cadastrarClienteSchema.safeParse(corpoDoRascunho(r));
  // A data depois de hoje o banco também recusa; aqui o erro aparece sem ir ao servidor (F3.162).
  const futuro = dataNoFuturo(r, hoje);
  if (v.success && !futuro) return { ok: true, corpo: v.data };
  const erros = v.success ? {} : errosDosCaminhos(r, v.error.issues.map((i) => i.path as (string | number)[]), hoje);
  if (futuro) erros.nascimento = TEXTO_DATA_NO_FUTURO;
  return { ok: false, erros };
}

/** Texto do D25 (NOTAS, item 10) para a data de nascimento depois de hoje: no quadro e no erro do campo. */
export const TEXTO_DATA_NO_FUTURO = "Esta data ainda não chegou.";

function dataNoFuturo(r: RascunhoCliente, hoje: string): boolean {
  if (r.tipo !== "PF" || r.capacidade !== "MENOR") return false;
  const iso = lerData(r.nascimento);
  return !!iso && nascimentoNoFuturo(iso, hoje);
}

/** Os erros da tela a partir dos caminhos do esquema (ou dos campos que o servidor devolveu). */
export function errosDosCaminhos(r: RascunhoCliente, caminhos: (string | number)[][], hoje: string = hojeBrasilia()): ErrosCliente {
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
    else if (campo === "estadoCivil" || campo === "repEstadoCivil" || campo === "uf" || campo === "origem" || campo === "rlEstadoCivil" || campo === "rlUf")
      erros[campo] = "Escolha uma das opções.";
    else if (campo === "capacidade") erros.capacidade = "Escolha quem assina.";
    else if (campo === "nascimento" && dataNoFuturo(r, hoje)) erros.nascimento = TEXTO_DATA_NO_FUTURO;
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
  capacidade: "O cliente assina por si?", nascimento: "Data de nascimento", rlPapel: "Quem é", rlNome: "Nome de quem assina",
  rlDocumento: "CPF de quem assina", rlRg: "RG de quem assina", rlRgOrgao: "Órgão do RG de quem assina", rlNacionalidade: "Nacionalidade de quem assina",
  rlEstadoCivil: "Estado civil de quem assina", rlProfissao: "Profissão de quem assina", rlCep: "CEP de quem assina", rlEndereco: "Endereço de quem assina",
  rlBairro: "Bairro de quem assina", rlCidade: "Cidade de quem assina", rlUf: "UF de quem assina", curModo: "O que diz o termo",
  curProcesso: "Processo da curatela", curVara: "Vara da curatela",
};

function legivel(campo: CampoTexto, v: string): string {
  if (!v.trim()) return "Em branco";
  if (campo === "estadoCivil" || campo === "repEstadoCivil" || campo === "rlEstadoCivil") return ESTADOS_CIVIS[v as keyof typeof ESTADOS_CIVIS] ?? v;
  if (campo === "capacidade") return CAPACIDADES[v as keyof typeof CAPACIDADES] ?? v;
  if (campo === "rlPapel") return PAPEIS_RESPONSAVEL[v as keyof typeof PAPEIS_RESPONSAVEL] ?? v;
  if (campo === "curModo") return MODOS_CURATELA[v as keyof typeof MODOS_CURATELA] ?? v;
  if (campo === "origem") return ORIGENS[v as keyof typeof ORIGENS] ?? v;
  return v.trim();
}

/** Campos que mudaram entre a versão salva e o que a pessoa escreveu (conflito, PT-19). */
export function diferencasCliente(salvo: RascunhoCliente, meu: RascunhoCliente): { chave: string; campo: string; salvo: string; meu: string }[] {
  const lista: { chave: string; campo: string; salvo: string; meu: string }[] = [];
  const norm = (k: CampoTexto, s: string) => (k === "documento" || k === "repDocumento" || k === "cep" || k === "rlDocumento" || k === "rlCep" ? s.replace(/\D/g, "") : s.trim());
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
export function prontosParaProcuracao(f: Pick<FichaCliente, "tipo" | "faltando" | "totalQualificacao">) {
  const total = f.totalQualificacao ?? TOTAL_QUALIFICACAO[f.tipo];
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

/** "2026-11-18" vira "18/11/2026"; um instante vira o dia de Brasília (F3.175). */
export function dataBr(iso: string): string {
  const [a, m, d] = diaBrasilia(iso).split("-");
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
