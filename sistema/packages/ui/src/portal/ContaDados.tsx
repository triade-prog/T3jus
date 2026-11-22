"use client";
// Os dados de cada advogado para os documentos (EX-15), tela aprovada em
// docs/design/aprovadas/portal-conta-dados (Carol, 22/11/2026): o cabeçalho próprio (cd-), com a
// frase como sai no contrato e na procuração; o quadro "Seus dados para os documentos"; o
// formulário com a prévia da procuração; e as mesmas peças na ficha da pessoa na Equipe.
// A própria pessoa e a sócia dona salvam; o que falta não bloqueia e sai marcado. O servidor
// confere tudo de novo (0760_pessoa_dados_documento.sql).

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CAMPOS_MUDADOS_DADOS, CODIGOS_ESTADO_CIVIL, ESTADOS_CIVIS_ADVOGADO, MENSAGENS_DADOS_DOCUMENTO, TOTAL_DADOS_DOCUMENTO, UFS_BRASIL,
  enderecoDoAdvogado, estadoCivilNaTela, faltasDoAdvogado, formatarDocumento, listaFaltas, pedacosQualificacaoAdvogado,
  type DadosDocumentoPessoa, type EnderecoEscritorio, type EstadoCivil, type InscricaoOab, type MudancaDadosDocumento, type Tratamento,
  type UfBrasil,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro } from "../console/pecas.tsx";
import { chamarPortal } from "./Moldura.tsx";

const UFS = Object.keys(UFS_BRASIL).sort() as UfBrasil[];
const diaBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const horaBr = (iso: string) => {
  const d = new Date(iso);
  return `${diaBr(d.toLocaleDateString("sv-SE", { timeZone: "America/Bahia" }))} às ${d.toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`;
};
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

/** O e-mail longo quebra depois do @ e antes dos pontos (decisão 2). */
function EmailQuebra({ email }: { email: string }) {
  const [u, d = ""] = email.split("@");
  const partes = (s: string) => s.split(".").flatMap((x, i) => (i ? [<wbr key={`w${i}`} />, `.${x}`] : [x]));
  return (
    <>
      {partes(u ?? "")}@<wbr />
      {partes(d)}
    </>
  );
}

/** A frase de qualificação, com o nome em negrito e o que falta marcado (decisão 4). */
export function FraseQualificacao({ dados, oab, escritorio, papel = false }: {
  dados: DadosDocumentoPessoa;
  oab: readonly InscricaoOab[];
  escritorio: EnderecoEscritorio;
  /** Na prévia em papel, os valores do cadastro vêm sublinhados. */
  papel?: boolean;
}) {
  return (
    <>
      {pedacosQualificacaoAdvogado(dados, oab, escritorio).map((p, i) =>
        p.tipo === "nome" ? (
          papel ? <mark key={i}><b>{p.texto}</b></mark> : <strong key={i}>{p.texto}</strong>
        ) : p.tipo === "falta" ? (
          <mark key={i} className="cd-falta">{p.texto}</mark>
        ) : p.tipo === "valor" && papel ? (
          <mark key={i}>{p.texto}</mark>
        ) : (
          <span key={i}>{p.texto}</span>
        ),
      )}
    </>
  );
}

const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);

/** O cabeçalho: faixa vinho (quem é) e faixa âmbar (como sai no documento). */
export function CabecalhoDados({ voce, nome, papel, email, desde, dados, oab, escritorio, voltar, editando, aoCompletar, semOab }: {
  voce: boolean;
  nome: string;
  papel: string;
  email: string | null;
  desde: string;
  dados: DadosDocumentoPessoa;
  oab: readonly InscricaoOab[];
  escritorio: EnderecoEscritorio;
  voltar?: { href: string; rotulo: string };
  editando?: boolean;
  aoCompletar?: () => void;
  /** O texto da faixa de quem não tem OAB (decisão 17). */
  semOab?: ReactNode;
}) {
  const faltas = faltasDoAdvogado(dados, oab, escritorio);
  const n = TOTAL_DADOS_DOCUMENTO - faltas.length;
  const sobre = editando ? (voce ? "Sua conta · editando seus dados" : "Equipe · editando os dados") : voce ? "Sua conta" : "Pessoa da equipe";
  const topo = (
    <div className="cd-topo campo-vinho">
      <Icone nome="cracha" className="ico estatua" />
      <div className="cd-quem">
        {voltar ? (
          <a className="cd-voltar" href={voltar.href}>
            <Icone nome="esquerda" className="ico ico-s" />
            {voltar.rotulo}
          </a>
        ) : null}
        <p className="sobretitulo">{sobre}</p>
        <h1>{nome}</h1>
        <p className="cd-meta">
          <span className="selo">{papel}</span>
          {email ? (
            <span>
              <EmailQuebra email={email} />
            </span>
          ) : null}
          <span>na equipe desde {diaBr(desde)}</span>
        </p>
      </div>
      {editando || !oab.length ? null : (
        <div className="cd-conta">
          <span className={`disco${faltas.length ? "" : " cd-ok"}`} aria-hidden="true">
            <span>{n}</span>
          </span>
          <p>
            <b>de {TOTAL_DADOS_DOCUMENTO} dados</b>
            {faltas.length ? `${plural(faltas.length, "falta", "faltam")} ${faltas.length} para os documentos` : "completos para os documentos"}
            <span className="sr">: {n} de {TOTAL_DADOS_DOCUMENTO} dados preenchidos</span>
          </p>
        </div>
      )}
    </div>
  );
  if (editando) return <header className="cd-cab">{topo}</header>;
  return (
    <header className="cd-cab">
      {topo}
      <section className="cd-faixa campo-ambar" aria-labelledby="t-sai">
        {oab.length ? (
          <>
            <p className="sobretitulo" id="t-sai">
              {voce ? "Como você sai" : `Como ${primeiro(nome)} sai`} no contrato e na procuração
            </p>
            <p className="cd-frase">
              <FraseQualificacao dados={dados} oab={oab} escritorio={escritorio} />.
            </p>
            <div className="cd-faixa-pe">
              {faltas.length ? (
                <>
                  <p>
                    <b>
                      {plural(faltas.length, "Falta", "Faltam")} {faltas.length} de {TOTAL_DADOS_DOCUMENTO}: {listaFaltas(faltas, voce)}.
                    </b>{" "}
                    Dá para gerar documentos assim: o que falta sai marcado, para completar à mão ou no Word.
                  </p>
                  {aoCompletar ? (
                    <button className="btn btn-pri" type="button" data-muda onClick={aoCompletar}>
                      <Icone nome="lapis" className="ico" />
                      {voce ? "Completar agora" : `Completar os dados de ${primeiro(nome)}`}
                    </button>
                  ) : null}
                </>
              ) : (
                <p>É assim que sai na qualificação do contrato de honorários, da procuração e das petições. Vale para os documentos gerados daqui em diante.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="sobretitulo" id="t-sai">
              Documentos do escritório
            </p>
            <p className="cd-vazia">{voce ? "Você não assina contratos nem procurações" : `${primeiro(nome)} não assina contratos nem procurações`}</p>
            <div className="cd-faixa-pe">
              <p>{semOab}</p>
            </div>
          </>
        )}
      </section>
    </header>
  );
}

function FaltaDd({ o }: { o: string }) {
  return (
    <>
      <span className="selo selo-atencao">Falta</span>
      <span className="cd-sai">
        sai como <span className="cd-nw">[{o}: falta]</span>
      </span>
    </>
  );
}

/** As duas colunas de leitura: quem é e onde atende (decisões 5 a 8). */
function LinhasDados({ voce, nome, dados, escritorio }: { voce: boolean; nome: string; dados: DadosDocumentoPessoa; escritorio: EnderecoEscritorio }) {
  const g = dados.tratamento;
  const conc = g === "ADVOGADA" ? "inscrita, portadora" : g === "ADVOGADO" ? "inscrito, portador" : "";
  const e = enderecoDoAdvogado(dados, escritorio);
  const cpfOk = !!dados.cpf && faltasDoAdvogado(dados, [{ uf: "SP" }], escritorio).indexOf("CPF") < 0;
  const pn = primeiro(nome);
  const q: [string, ReactNode][] = [
    ["Nome completo", dados.nomeCompleto.trim() ? (
      <>
        {dados.nomeCompleto}
        <small>No T3jus, {voce ? "você aparece" : "aparece"} como “{nome}”</small>
      </>
    ) : <FaltaDd o="NOME COMPLETO" />],
    [voce ? "Como o documento te chama" : "Como o documento o chama", g ? (
      <>
        {g === "ADVOGADA" ? "Advogada" : "Advogado"}
        <small>Concordância: {conc}</small>
      </>
    ) : <FaltaDd o="TRATAMENTO" />],
    ["Nacionalidade", dados.nacionalidade?.trim() ? dados.nacionalidade.trim().charAt(0).toUpperCase() + dados.nacionalidade.trim().slice(1) : <FaltaDd o="NACIONALIDADE" />],
    ["Estado civil", dados.estadoCivil ? estadoCivilNaTela(dados.estadoCivil, g) : <FaltaDd o="ESTADO CIVIL" />],
    ["CPF", cpfOk ? formatarDocumento(dados.cpf) : <FaltaDd o="CPF" />],
    ["RG", dados.rg?.trim() && dados.rgOrgao?.trim() ? `${dados.rg.trim()} · ${dados.rgOrgao.trim()}` : <FaltaDd o="RG" />],
  ];
  const w: [string, ReactNode][] = [
    ["Endereço profissional", e ? (
      <>
        {e}
        <small>{dados.enderecoDoEscritorio ? "O do escritório. Muda junto se o escritório mudar." : "Endereço próprio, diferente do escritório."}</small>
      </>
    ) : <FaltaDd o="ENDEREÇO PROFISSIONAL" />],
    ["E-mail profissional", dados.emailProfissional ? <EmailQuebra email={dados.emailProfissional} /> : <span className="cd-opc">Não informado (opcional)</span>],
    ["Telefone profissional", dados.telefoneProfissional ? telefoneFmt(dados.telefoneProfissional) : <span className="cd-opc">Não informado (opcional)</span>],
  ];
  const dl = (xs: [string, ReactNode][]) => (
    <dl className="cd-dl">
      {xs.map(([a, b]) => (
        <div key={a}>
          <dt>{a}</dt>
          <dd>{b}</dd>
        </div>
      ))}
    </dl>
  );
  return (
    <div className="cd-grupos">
      <div>
        <h3 className="cd-h3">{voce ? "Quem você é" : `Quem ${pn} é`}</h3>
        {dl(q)}
      </div>
      <div>
        <h3 className="cd-h3">{voce ? "Onde você atende" : `Onde ${pn} atende`}</h3>
        {dl(w)}
      </div>
    </div>
  );
}

function telefoneFmt(t: string): string {
  const d = t.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

/** A barra de tons com o número escrito ao lado (decisão 6). */
function Progresso({ faltas }: { faltas: ReturnType<typeof faltasDoAdvogado> }) {
  const n = TOTAL_DADOS_DOCUMENTO - faltas.length;
  return (
    <div className={`cd-prog${faltas.length ? "" : " ok"}`}>
      <div className="cd-tons" aria-hidden="true">
        {Array.from({ length: TOTAL_DADOS_DOCUMENTO }, (_, i) => (
          <i key={i} className={i < n ? undefined : "v"} />
        ))}
      </div>
      <p>
        {faltas.length ? (
          <>
            <b>
              {plural(faltas.length, "Falta", "Faltam")} {faltas.length} de {TOTAL_DADOS_DOCUMENTO} dados:
            </b>{" "}
            {listaFaltas(faltas)}. Não bloqueia: os documentos saem com a marca no lugar, como no cadastro do cliente.
          </>
        ) : (
          <>
            <b>{TOTAL_DADOS_DOCUMENTO} de {TOTAL_DADOS_DOCUMENTO} dados preenchidos.</b> A qualificação sai completa nos documentos.
          </>
        )}
      </p>
    </div>
  );
}

const DE_UF: Partial<Record<UfBrasil, string>> = {};
/** "seccional da Bahia" a partir do nome da UF. */
function seccionalDe(uf: UfBrasil): string {
  if (DE_UF[uf]) return DE_UF[uf]!;
  const nome = UFS_BRASIL[uf];
  const fem = ["Bahia", "Paraíba"].includes(nome);
  const sem = ["Alagoas", "Goiás", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pernambuco", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"].includes(nome);
  return `${fem ? "da" : sem ? "de" : "do"} ${nome}`;
}

/** A lista das inscrições, com Editar e Remover na Equipe. */
export function InscricoesDados({ nome, oab, aoEditar, aoRemover }: {
  nome: string;
  oab: readonly InscricaoOab[];
  aoEditar?: (i: InscricaoOab) => void;
  aoRemover?: (i: InscricaoOab) => void;
}) {
  return (
    <ul className="cd-insc">
      {oab.map((i) => (
        <li key={i.id}>
          <span className="cd-uf" aria-hidden="true">{i.uf}</span>
          <div className="cd-q">
            <strong>{i.texto}</strong>
            <small>
              {i.tipo === "PRINCIPAL" ? "Principal" : "Suplementar"} · seccional {seccionalDe(i.uf)}
            </small>
          </div>
          {aoEditar || aoRemover ? (
            <div className="cd-bts">
              {aoEditar ? (
                <button className="btn btn-sec btn-compacto" type="button" aria-label={`Editar a inscrição ${i.texto} de ${primeiro(nome)}`} onClick={() => aoEditar(i)}>
                  <Icone nome="lapis" className="ico ico-s" />
                  Editar
                </button>
              ) : null}
              {aoRemover ? (
                <button className="btn btn-perigo btn-compacto" type="button" aria-label={`Remover a inscrição ${i.texto} de ${primeiro(nome)}`} onClick={() => aoRemover(i)}>
                  Remover
                </button>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** O quadro de leitura "Seus dados para os documentos" (decisões 5 a 8 e 11). */
export function QuadroDados({ voce, nome, dados, oab, escritorio, aoEditar, blocoOab, ultima }: {
  voce: boolean;
  nome: string;
  dados: DadosDocumentoPessoa;
  oab: readonly InscricaoOab[];
  escritorio: EnderecoEscritorio;
  aoEditar?: () => void;
  /** O bloco da OAB: só para conferir (Sua conta) ou com as ações (Equipe). */
  blocoOab: ReactNode;
  ultima?: string | null;
}) {
  const pn = primeiro(nome);
  return (
    <section className="folha" aria-labelledby="t-dados" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-dados">{voce ? "Seus dados para os documentos" : `Dados de ${pn} para os documentos`}</h2>
          <p className="sub">
            {voce
              ? "Saem na qualificação do contrato de honorários, da procuração e das petições que você assina. Só você e a sócia dona veem e mudam."
              : `Os mesmos que ${pn} vê em Sua conta. Vocês podem completar; a última mudança vale.`}
          </p>
        </div>
        {aoEditar ? (
          <div className="acoes">
            <button className="btn btn-sec" type="button" data-muda onClick={aoEditar}>
              <Icone nome="lapis" className="ico" />
              {voce ? "Editar dados" : "Completar dados"}
              {voce ? null : <span className="sr"> de {pn}</span>}
            </button>
          </div>
        ) : null}
      </div>
      <Progresso faltas={faltasDoAdvogado(dados, oab, escritorio)} />
      <LinhasDados voce={voce} nome={nome} dados={dados} escritorio={escritorio} />
      {blocoOab}
      <p className="cd-pe">
        <Icone nome="cadeado" className="ico" />
        <span>
          CPF e RG servem só para os documentos que o escritório gera. Clientes não veem esta página. {ultima ?? "Cada mudança fica no histórico da equipe, com quem fez e quando."}
        </span>
      </p>
    </section>
  );
}

/** Quem não tem OAB: nada a preencher (decisão 17). */
export function QuadroSemOab() {
  return (
    <section className="folha" aria-labelledby="t-dados" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-dados">Seus dados para os documentos</h2>
          <p className="sub">Só para quem assina documentos como advogado.</p>
        </div>
      </div>
      <Estado icone="balanca" titulo="Nada a preencher por aqui">
        Os dados para os documentos (nome completo, estado civil, CPF, RG e endereço profissional) só são pedidos de quem assina como advogado. Quando a
        sócia dona cadastrar uma OAB para você na Equipe, este quadro abre para você completar.
      </Estado>
    </section>
  );
}

/** A lateral "Onde estes dados entram" (decisão 11). */
export function OndeEntram() {
  const itens: [Parameters<typeof Icone>[0]["nome"], string, string][] = [
    ["pena", "Contrato de honorários", "Na qualificação da contratada, “por seus advogados”, e na assinatura."],
    ["doc", "Procuração", "Como outorgado, com o endereço onde recebe intimações."],
    ["balanca", "Petições", "No fecho, com nome completo e OAB; e-mail e telefone só se o modelo pedir."],
  ];
  return (
    <section className="folha" aria-labelledby="t-usos">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-usos" style={{ fontSize: 20 }}>Onde estes dados entram</h2>
        </div>
      </div>
      <ul className="cd-usos">
        {itens.map(([ico, t, s]) => (
          <li key={t}>
            <span className="cd-ic" aria-hidden="true">
              <Icone nome={ico} className="ico" />
            </span>
            <div>
              <strong>{t}</strong>
              <span>{s}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="cd-pe">
        <Icone nome="historico" className="ico" />
        <span>Documentos já gerados não mudam: cada arquivo guarda os dados do dia em que foi gerado.</span>
      </p>
    </section>
  );
}

/** "Rafael preencheu o RG, em Sua conta". */
function textoMudanca(m: MudancaDadosDocumento, nome: string): string {
  const quem = m.por?.nome ?? "Alguém";
  const campos = m.campos.map((c) => CAMPOS_MUDADOS_DADOS[c]);
  const lista = campos.length <= 1 ? (campos[0] ?? "os dados") : `${campos.slice(0, -1).join(", ")} e ${campos.at(-1)}`;
  return `${quem} mudou ${lista}${m.por?.nome === nome ? "" : ` de ${primeiro(nome)}`}, ${m.onde === "CONTA" ? "em Sua conta" : "na Equipe"}`;
}

/** As últimas mudanças dos dados (decisão 19), na lateral da ficha. */
export function UltimasMudancas({ nome, mudancas }: { nome: string; mudancas: MudancaDadosDocumento[] }) {
  return (
    <section className="folha" aria-labelledby="t-hi">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-hi" style={{ fontSize: 20 }}>Últimas mudanças</h2>
        </div>
      </div>
      {mudancas.length ? (
        <ul className="cd-hist">
          {mudancas.map((m, i) => (
            <li key={i}>
              {textoMudanca(m, nome)}
              <small>{horaBr(m.em)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cd-pe" style={{ borderTop: 0, paddingTop: 0 }}>
          <span>Ninguém mudou os dados para os documentos ainda.</span>
        </p>
      )}
    </section>
  );
}

export function ultimaMudanca(nome: string, mudancas?: MudancaDadosDocumento[]): string | null {
  const m = mudancas?.[0];
  return m ? `Última mudança: ${textoMudanca(m, nome)}, em ${diaBr(m.em)}.` : null;
}

// ------------------------------------------------------------------------------- formulário

type Rascunho = {
  nomeCompleto: string; tratamento: Tratamento | ""; nacionalidade: string; estadoCivil: EstadoCivil | ""; cpf: string; rg: string; rgOrgao: string;
  enderecoDoEscritorio: boolean; cep: string; endereco: string; bairro: string; cidade: string; uf: UfBrasil | ""; emailProfissional: string; telefoneProfissional: string;
};
type CampoForm = Exclude<keyof Rascunho, "enderecoDoEscritorio">;

function cpfMascara(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

function doRascunho(d: DadosDocumentoPessoa): Rascunho {
  return {
    nomeCompleto: d.nomeCompleto ?? "", tratamento: d.tratamento ?? "", nacionalidade: d.nacionalidade ?? "", estadoCivil: d.estadoCivil ?? "",
    cpf: d.cpf ? cpfMascara(d.cpf) : "", rg: d.rg ?? "", rgOrgao: d.rgOrgao ?? "", enderecoDoEscritorio: d.enderecoDoEscritorio,
    cep: d.cep ? d.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : "", endereco: d.endereco ?? "", bairro: d.bairro ?? "", cidade: d.cidade ?? "",
    uf: (d.uf as UfBrasil) ?? "", emailProfissional: d.emailProfissional ?? "", telefoneProfissional: d.telefoneProfissional ? telefoneFmt(d.telefoneProfissional) : "",
  };
}

const nulo = (s: string) => (s.trim() ? s.trim() : null);
function paraDados(r: Rascunho, base: DadosDocumentoPessoa): DadosDocumentoPessoa {
  return {
    ...base, nomeCompleto: r.nomeCompleto.trim(), tratamento: r.tratamento || null, nacionalidade: nulo(r.nacionalidade), estadoCivil: r.estadoCivil || null,
    cpf: nulo(r.cpf.replace(/\D/g, "")), rg: nulo(r.rg), rgOrgao: nulo(r.rgOrgao), enderecoDoEscritorio: r.enderecoDoEscritorio,
    cep: nulo(r.cep.replace(/\D/g, "")), endereco: nulo(r.endereco), bairro: nulo(r.bairro), cidade: nulo(r.cidade), uf: r.uf || null,
    emailProfissional: nulo(r.emailProfissional), telefoneProfissional: nulo(r.telefoneProfissional.replace(/\D/g, "")),
  };
}

const ROTULO_ERRO: Record<CampoForm, string> = {
  nomeCompleto: "Nome completo", tratamento: "Como o documento chama", nacionalidade: "Nacionalidade", estadoCivil: "Estado civil", cpf: "CPF", rg: "RG",
  rgOrgao: "Órgão emissor", cep: "CEP", endereco: "Endereço", bairro: "Bairro", cidade: "Cidade", uf: "UF", emailProfissional: "E-mail profissional",
  telefoneProfissional: "Telefone profissional",
};

/** O que a tela já confere antes de mandar (o servidor confere tudo de novo). */
function conferir(r: Rascunho): Partial<Record<CampoForm, string>> {
  const e: Partial<Record<CampoForm, string>> = {};
  const nome = r.nomeCompleto.trim();
  if (!nome) e.nomeCompleto = "NOME_COMPLETO_OBRIGATORIO";
  else if (nome.length < 5 || nome.length > 120 || /\d/.test(nome)) e.nomeCompleto = "NOME_COMPLETO_INVALIDO";
  const cpf = r.cpf.replace(/\D/g, "");
  if (cpf && faltasDoAdvogado({ ...paraDados(r, VAZIO), cpf }, [{ uf: "SP" }], { endereco: "x", cidade: null, uf: null }).includes("CPF")) e.cpf = "CPF_INVALIDO";
  if (!r.enderecoDoEscritorio) {
    const cep = r.cep.replace(/\D/g, "");
    if (cep && cep.length !== 8) e.cep = "CEP_INVALIDO";
    if (!r.cidade.trim()) e.cidade = "ENDERECO_INCOMPLETO";
    if (!r.uf) e.uf = "ENDERECO_INCOMPLETO";
  }
  const em = r.emailProfissional.trim();
  if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) e.emailProfissional = "EMAIL_INVALIDO";
  const tel = r.telefoneProfissional.replace(/\D/g, "");
  if (tel && (tel.length < 10 || tel.length > 11)) e.telefoneProfissional = "TELEFONE_INVALIDO";
  return e;
}
const VAZIO: DadosDocumentoPessoa = {
  nomeCompleto: "", tratamento: null, nacionalidade: null, estadoCivil: null, cpf: null, rg: null, rgOrgao: null, enderecoDoEscritorio: true, cep: null,
  endereco: null, bairro: null, cidade: null, uf: null, emailProfissional: null, telefoneProfissional: null, atualizadoEm: null, atualizadoPor: null, versao: 0,
};

/** O formulário com a prévia da procuração ao lado (decisões 12 a 16). */
export function FormDados({ voce, nome, escritorioNome, dados, oab, escritorio, api, oabAcao, aoCancelar, aoSalvo }: {
  voce: boolean;
  nome: string;
  escritorioNome: string;
  dados: DadosDocumentoPessoa;
  oab: readonly InscricaoOab[];
  escritorio: EnderecoEscritorio;
  /** "/v1/escritorio/conta/dados" ou "/v1/escritorio/equipe/pessoas/:id/dados". */
  api: string;
  /** O caminho para mudar a OAB (só a sócia dona). */
  oabAcao?: ReactNode;
  aoCancelar: () => void;
  aoSalvo: (d: DadosDocumentoPessoa) => void;
}) {
  const ids = useId();
  const [r, setR] = useState<Rascunho>(() => doRascunho(dados));
  const [erros, setErros] = useState<Partial<Record<CampoForm, string>>>({});
  const [resumo, setResumo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [conflito, setConflito] = useState<DadosDocumentoPessoa | null>(null);
  const [falhou, setFalhou] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const pn = primeiro(nome);

  useEffect(() => {
    form.current?.querySelector<HTMLElement>("input")?.focus();
  }, []);

  const mudar = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => {
    setR((x) => ({ ...x, [k]: v }));
    if (erros[k as CampoForm]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  const previa = paraDados(r, dados);
  const faltas = faltasDoAdvogado(previa, oab, escritorio);
  const n = TOTAL_DADOS_DOCUMENTO - faltas.length;

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    if (enviando) return;
    setFalhou(false);
    const e = conferir(r);
    if (Object.values(e).some(Boolean)) {
      setErros(e);
      setResumo(true);
      focarPrimeiroErro(form.current);
      return;
    }
    setEnviando(true);
    const base = conflito ?? dados;
    const d = paraDados(r, base);
    const resp = await chamarPortal<DadosDocumentoPessoa>(api, {
      metodo: "PUT",
      corpo: {
        versao: base.versao, nomeCompleto: d.nomeCompleto, tratamento: d.tratamento, nacionalidade: d.nacionalidade, estadoCivil: d.estadoCivil, cpf: d.cpf,
        rg: d.rg, rgOrgao: d.rgOrgao, enderecoDoEscritorio: d.enderecoDoEscritorio, cep: d.cep, endereco: d.endereco, bairro: d.bairro, cidade: d.cidade,
        uf: d.uf, emailProfissional: d.emailProfissional, telefoneProfissional: d.telefoneProfissional,
      },
    });
    setEnviando(false);
    if (resp.ok) {
      aoSalvo(resp.dados);
      return;
    }
    const det = resp.erro.detalhes;
    if (resp.status === 409 && det && typeof det.atual === "object") {
      setConflito(det.atual as DadosDocumentoPessoa);
      return;
    }
    const motivos = det?.motivos as Record<string, string> | undefined;
    if (motivos) {
      setErros(motivos as Partial<Record<CampoForm, string>>);
      setResumo(true);
      focarPrimeiroErro(form.current);
      return;
    }
    setFalhou(true);
  }

  const msg = (k: CampoForm) => (erros[k] ? MENSAGENS_DADOS_DOCUMENTO[erros[k]!] ?? "Confira este campo." : undefined);
  const campo = (k: CampoForm, rotulo: string, o: { classe: string; ajuda?: string; modo?: "numeric" | "tel" | "email"; auto?: string; tipo?: string; opcional?: boolean; mascara?: (v: string) => string }) => {
    const id = `${ids}-${k}`;
    const e = msg(k);
    return (
      <div className={`campo ${o.classe}`}>
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
        </label>
        <input className="entrada" id={id} type={o.tipo ?? "text"} value={r[k]} inputMode={o.modo} autoComplete={o.auto ?? "off"}
          onChange={(ev) => mudar(k, (o.mascara ? o.mascara(ev.target.value) : ev.target.value) as never)}
          aria-invalid={e ? true : undefined} aria-describedby={descritoPor(!e && o.ajuda && `${id}-aj`, e && `${id}-er`)} />
        {!e && o.ajuda ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };
  const selecao = (k: "estadoCivil" | "uf", rotulo: string, opcoes: [string, string][], classe: string) => {
    const id = `${ids}-${k}`;
    const e = msg(k);
    return (
      <div className={`campo ${classe}`}>
        <label htmlFor={id}>{rotulo}</label>
        <select className="entrada" id={id} value={r[k]} onChange={(ev) => mudar(k, ev.target.value as never)}
          aria-invalid={e ? true : undefined} aria-describedby={descritoPor(e && `${id}-er`)}>
          <option value="">Escolha</option>
          {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };
  const comErro = (Object.keys(erros) as CampoForm[]).filter((k) => erros[k]);
  const endEsc = enderecoDoAdvogado({ ...VAZIO, enderecoDoEscritorio: true }, escritorio);

  return (
    <div className="cd-ed">
      <section className="folha cd-a-form" aria-labelledby="t-form">
        <div className="folha-cab">
          <div>
            <h2 id="t-form">{voce ? "Seus dados para os documentos" : `Dados de ${pn} para os documentos`}</h2>
            <p className="sub">Os campos sem “(opcional)” entram na qualificação. Só o nome completo é obrigatório; o que ficar em branco sai marcado como falta.</p>
          </div>
        </div>
        <form ref={form} className="form-folha" id={`${ids}-form`} noValidate onSubmit={(ev) => void salvar(ev)}>
          {conflito ? (
            <div className="c6">
              <Aviso tom="atencao" titulo="Os dados mudaram enquanto você editava.">
                {conflito.atualizadoPor?.nome ?? "Outra pessoa"} salvou antes{conflito.atualizadoEm ? `, em ${horaBr(conflito.atualizadoEm)}` : ""}. O que você escreveu continua aqui: salve de
                novo para ficar com a sua versão, ou cancele para ver a dela.
              </Aviso>
            </div>
          ) : null}
          {falhou ? (
            <div className="c6">
              <Aviso tom="urgencia" titulo="Não deu para salvar agora.">Seus dados não foram salvos. Tente de novo em instantes.</Aviso>
            </div>
          ) : null}
          {resumo && comErro.length ? (
            <div className="c6">
              <Aviso tom="urgencia" titulo={faltaAcertar(comErro.length)}
                acoes={
                  <ul>
                    {comErro.map((k) => (
                      <li key={k}><a href={`#${ids}-${k}`}>{ROTULO_ERRO[k]}</a></li>
                    ))}
                  </ul>
                }>
                Seus dados ainda não foram salvos.
              </Aviso>
            </div>
          ) : null}
          <h3 className="cd-h3 cd-sec c6">{voce ? "Quem você é" : `Quem ${pn} é`}</h3>
          {campo("nomeCompleto", "Nome completo", {
            classe: "c6", auto: voce ? "name" : "off",
            ajuda: `Como na carteira da OAB. Nos documentos, sai em maiúsculas. No T3jus, ${voce ? "você continua aparecendo" : `${pn} continua aparecendo`} como “${nome}”.`,
          })}
          <fieldset className="cd-trat c6" aria-describedby={`${ids}-trat-aj`}>
            <legend>Como o documento {voce ? "te" : "o"} chama</legend>
            <div className="cd-trat-ops">
              {(["ADVOGADA", "ADVOGADO"] as const).map((t) => (
                <label key={t} className="opcao">
                  <input className="marcar" type="radio" name={`${ids}-trat`} checked={r.tratamento === t} onChange={() => mudar("tratamento", t)} />
                  <span>
                    {t === "ADVOGADA" ? "Advogada" : "Advogado"}
                    <small>{t === "ADVOGADA" ? "inscrita, portadora, casada" : "inscrito, portador, casado"}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="ajuda" id={`${ids}-trat-aj`}>Acerta a concordância da frase inteira.</p>
          </fieldset>
          {campo("nacionalidade", "Nacionalidade", { classe: "c2", ajuda: "Ex.: brasileira." })}
          {selecao("estadoCivil", "Estado civil", CODIGOS_ESTADO_CIVIL.map((k) => [k, ESTADOS_CIVIS_ADVOGADO[k]]), "c2")}
          {campo("cpf", "CPF", { classe: "c2", modo: "numeric", ajuda: "Conferimos os dígitos.", mascara: cpfMascara })}
          {campo("rg", "RG", { classe: "c3" })}
          {campo("rgOrgao", "Órgão emissor e UF", { classe: "c3", ajuda: "Ex.: SSP/BA." })}
          <h3 className="cd-h3 cd-sec c6">{voce ? "Onde você atende" : `Onde ${pn} atende`}</h3>
          <div className="c6">
            <label className="opcao">
              <input className="marcar" type="checkbox" checked={r.enderecoDoEscritorio} onChange={(ev) => mudar("enderecoDoEscritorio", ev.target.checked)} />
              <span>Usar o endereço do escritório</span>
            </label>
            {r.enderecoDoEscritorio ? (
              <p className="cd-end-ok">
                {endEsc ?? "O escritório ainda não tem endereço em Escritório; o documento sai com a marca."} Se o escritório mudar de endereço, {voce ? "os seus documentos mudam" : "os documentos mudam"} junto.
              </p>
            ) : null}
          </div>
          {r.enderecoDoEscritorio ? null : (
            <>
              {campo("cep", "CEP", { classe: "c2", modo: "numeric", opcional: true })}
              {campo("endereco", "Endereço", { classe: "c4", ajuda: "Rua, número e sala." })}
              {campo("bairro", "Bairro", { classe: "c2" })}
              {campo("cidade", "Cidade", { classe: "c2" })}
              {selecao("uf", "UF", UFS.map((u) => [u, u]), "c2")}
            </>
          )}
          {campo("emailProfissional", "E-mail profissional", { classe: "c3", tipo: "email", modo: "email", opcional: true, ajuda: "Só sai se o modelo pedir." })}
          {campo("telefoneProfissional", "Telefone profissional", { classe: "c3", tipo: "tel", modo: "tel", opcional: true, ajuda: "Só sai se o modelo pedir." })}
          <h3 className="cd-h3 cd-sec c6">{voce ? "Sua OAB" : `OAB de ${pn}`}</h3>
          <div className="cd-oab-ler c6">
            {oab[0] ? <span className="cd-uf" aria-hidden="true">{oab[0].uf}</span> : null}
            <p>
              <b>{oab.length ? oab.map((i) => i.texto).join(" e ") : "Sem OAB cadastrada"}</b>
              {voce ? "Para conferir. Quem muda a OAB é a sócia dona, na Equipe." : "As inscrições se mudam no quadro de inscrições da ficha."}
            </p>
            {oabAcao}
          </div>
        </form>
      </section>
      <aside className="cd-a-prev" aria-label="Prévia">
        <section className="folha" aria-labelledby="t-prev">
          <div className="folha-cab" style={{ paddingBottom: 10 }}>
            <div>
              <h2 id="t-prev" style={{ fontSize: 20 }}>
                {voce ? "Como você sai" : `Como ${pn} sai`} no contrato e na procuração
              </h2>
              <p className="sub">Prévia da procuração. Muda enquanto {voce ? "você digita" : "se digita"}.</p>
            </div>
          </div>
          <div className="cd-papel" aria-live="polite">
            <p className="cd-tim">
              <span>{escritorioNome}</span>
              <span>Procuração</span>
            </p>
            <p>
              <b>{r.tratamento === "ADVOGADO" ? "OUTORGADO" : r.tratamento === "ADVOGADA" ? "OUTORGADA" : "OUTORGADO(A)"}:</b>{" "}
              <FraseQualificacao dados={previa} oab={oab} escritorio={escritorio} papel />, onde recebe intimações.
            </p>
          </div>
          <p className="cd-conta-prev" aria-live="polite">
            <b>{n} de {TOTAL_DADOS_DOCUMENTO} dados.</b>{" "}
            {faltas.length
              ? `${plural(faltas.length, "Falta", "Faltam")}: ${listaFaltas(faltas, voce)}. ${faltas.includes("NOME_COMPLETO") ? "O nome completo é obrigatório para salvar." : "Dá para salvar assim."}`
              : "A qualificação sai completa."}
          </p>
        </section>
      </aside>
      <section className="folha cd-a-pe" aria-label="Salvar">
        <div className="cd-pe-bts">
          <p>Vale para os documentos gerados daqui em diante. Os já gerados não mudam. A mudança fica no histórico da equipe.</p>
          <div className="cd-bts">
            <button className="btn btn-fantasma" type="button" onClick={aoCancelar}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" form={`${ids}-form`} aria-busy={enviando || undefined}>
              <Icone nome="check" className="ico" />
              {enviando ? "Salvando…" : voce ? "Salvar dados" : `Salvar dados de ${pn}`}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
