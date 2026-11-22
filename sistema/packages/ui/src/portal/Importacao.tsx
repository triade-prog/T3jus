"use client";
// Importar planilha (F3.55, VA-05), desenho aprovado em docs/design/aprovadas/portal-importacao
// (33 decisões no NOTAS.md). Quatro passos: o arquivo, as colunas, a prévia e importar. O
// arquivo é lido na API, na memória, e só as células chegam ao banco; nada entra no cadastro
// antes de a pessoa conferir a prévia. Depois: o resultado, o histórico e o desfazer (7 dias).

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  dataBr, formatarDocumento, LIMITE_ARQUIVO_BYTES, NOMES_CAMPO_IMPORTACAO, ORIGENS, reais,
  NOMES_ORIGEM_IMPORTACAO, telefoneBr,
  type CampoImportacao, type OrigemDados, type TipoContato, type ColunaImportacao, type DecisaoLinha, type Importacao, type LinhaPrevia, type LinhasFora, type OQueImportar,
  type ParesImportacao, type ParValor, type PlanoDesfazer, type PreviaImportacao, type ProblemaLinha, type ResumoPrevia,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { dataCurta, hora } from "../console/tempo.ts";
import { Aviso, Carregando, ErroAoCarregar, ErroCampo, Estado, Janela } from "../console/pecas.tsx";
import { Chips, Selo } from "./Comercial.tsx";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { salvar } from "./FinanceiroResumo.tsx";
import {
  abaFora, abaModelo, camposDoGrupo, condicaoTexto, ehCampoContrato, explicaProblema, faltaLigar, NOMES_OBRIGATORIO, NOMES_TIPO_IMPORTADO,
  nomeArquivoFora, nomeDoMes, obrigatorios, ondeLigado, resumoParcelas, ROTAS_IMPORTACAO, SELO_PROBLEMA, type Obrigatorio,
} from "./importacao.ts";
import { chamarPortal, irPara, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal, type EscritorioPortal } from "./Moldura.tsx";
import { planilhaXlsx } from "./planilha.ts";
import { PassoAbas } from "./ImportacaoSistemas.tsx";
import {
  AvisoDespesas, EntrouFinanceiro, FinanceiroEspera, LinhaDoLancamento, PassoColunasFinanceiro, ResumoFinanceiro, SemLinhasFinanceiro,
} from "./ImportacaoFinanceiro.tsx";
import { AvisoArquivados, EntrouCasos, LinhaDoCaso, PassoColunasCasos, ProcessosEsperam, ResumoCasos, SemLinhasCasos } from "./ImportacaoCasos.tsx";

export const API = "/v1/escritorio/importacoes";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
const prazoCurto = (iso: string) => dataCurta(iso);
/** "hoje, 15h42" ou "12/11, 10h05", no horário de Brasília. */
export function quando(iso: string) {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  return dia.format(new Date(iso)) === dia.format(new Date()) ? `hoje, ${hora(iso)}` : `${dataCurta(iso)}, ${hora(iso)}`;
}

const LGPD_ARQ = (
  <>
    <b>O arquivo não fica guardado.</b> Ele é lido no servidor, no Brasil, e apagado quando a importação termina ou é cancelada. Se você sair no
    meio, ele é apagado em 24 horas. Fica registrado só o nome do arquivo, quem enviou e quando.
  </>
);

// ------------------------------------------------------------------------------- peças comuns

export function Lgpd({ icone = "escudo", children }: { icone?: NomeIcone; children: ReactNode }) {
  return (
    <p className="im-lgpd">
      <Icone nome={icone} className="ico" />
      <span>{children}</span>
    </p>
  );
}

export function Folha({ id, titulo, sub, acoes, children, estilo }: {
  id: string; titulo: string; sub?: ReactNode; acoes?: ReactNode; children: ReactNode; estilo?: React.CSSProperties;
}) {
  return (
    <section className="folha" aria-labelledby={id} style={estilo}>
      <div className="folha-cab">
        <div>
          <h2 id={id}>{titulo}</h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {acoes ? <div className="acoes">{acoes}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Grade({ principal, lateral, rotulo = "Como funciona a importação" }: { principal: ReactNode; lateral: ReactNode; rotulo?: string }) {
  return (
    <div className="hn-grade">
      <div className="hn-col">{principal}</div>
      <aside className="hn-col" aria-label={rotulo}>{lateral}</aside>
    </div>
  );
}

const TITULO_ORIGEM: Record<OrigemDados, string> = { PLANILHA: "Importar planilha", ASTREA: "Importar do Astrea", ADVBOX_PLANILHA: "Importar do ADVBOX" };
const ICONE_ORIGEM: Record<OrigemDados, NomeIcone> = { PLANILHA: "doc", ASTREA: "enviar", ADVBOX_PLANILHA: "doc" };
/** Onde começa cada origem (o passo 1). */
export const INICIO_ORIGEM: Record<OrigemDados, string> = { PLANILHA: ROTAS_IMPORTACAO.planilha, ASTREA: ROTAS_IMPORTACAO.astrea, ADVBOX_PLANILHA: ROTAS_IMPORTACAO.advbox };
/** O nome curto do sistema, para "Pelo modelo do Astrea". */
export const SISTEMA_ORIGEM: Record<OrigemDados, string> = { PLANILHA: "", ASTREA: "Astrea", ADVBOX_PLANILHA: "ADVBOX" };

/** O selo da origem (decisão 4 do F3.56), escrito em tudo o que veio de outro sistema. */
export function SeloOrigem({ origem, leve = false }: { origem: OrigemDados; leve?: boolean }) {
  return (
    <span className={`is-orig${leve ? " is-orig-l" : ""}`}>
      <Icone nome={ICONE_ORIGEM[origem]} className="ico" />
      <span className="sr">Origem: </span>{NOMES_ORIGEM_IMPORTACAO[origem]}
    </span>
  );
}

export function CabFluxo({ lede, origem = "PLANILHA", titulo }: { lede?: string; origem?: OrigemDados; titulo?: string }) {
  const sistema = origem !== "PLANILHA";
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">{sistema || titulo ? "Clientes · Importar dados" : "Clientes"}</p>
        <h1>{titulo ?? TITULO_ORIGEM[origem]}</h1>
        <span className="fio" aria-hidden="true" />
        {lede ? <p className="lede">{lede}</p> : null}
        {sistema ? <p style={{ marginTop: 12 }}><SeloOrigem origem={origem} /></p> : null}
      </div>
    </div>
  );
}

const NOMES_PASSOS = ["O arquivo", "As colunas", "A prévia", "Importar"];
const NOMES_PASSOS_BACKUP = ["O backup", "Abas e colunas", "A prévia", "Importar"];

/** Os quatro passos (decisão 2). Os feitos levam de volta, quando dá. */
export function Passos({ atual, escolhas = [], voltar = [], origem = "PLANILHA" }: {
  atual: number; escolhas?: string[]; voltar?: (string | undefined)[]; origem?: OrigemDados;
}) {
  return (
    <ol className="im-passos" aria-label={`Passo ${Math.min(atual, 4)} de 4`}>
      {(origem === "ASTREA" ? NOMES_PASSOS_BACKUP : NOMES_PASSOS).map((nome, i) => {
        const n = i + 1;
        const conteudo = (
          <>
            <span className="im-n" aria-hidden="true">{n}</span>
            <span style={{ minWidth: 0 }}>
              <b>{nome}</b>
              {escolhas[i] ? <small>{escolhas[i]}</small> : null}
            </span>
          </>
        );
        if (n < atual) {
          const href = voltar[i];
          return (
            <li key={nome} className="feito">
              {href ? (
                <a href={href}>{conteudo}<span className="sr"> (feito; voltar a este passo)</span></a>
              ) : (
                <span className="im-pi">{conteudo}<span className="sr"> (feito)</span></span>
              )}
            </li>
          );
        }
        return (
          <li key={nome} aria-current={n === atual ? "step" : undefined}>
            <span className="im-pi">{conteudo}{n === atual ? <span className="sr"> (passo atual)</span> : null}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ExplicaFluxo() {
  return (
    <section className="explica campo-ambar" aria-labelledby="t-ex">
      <p className="sobretitulo">Como funciona</p>
      <h2 id="t-ex">Nada entra até você conferir.</h2>
      <ul>
        <li><Icone nome="enviar" className="ico" /><span><b>1. O arquivo.</b> Envie a planilha do jeito que ela está, ou a planilha-modelo preenchida.</span></li>
        <li><Icone nome="fluxo" className="ico" /><span><b>2. As colunas.</b> O T3jus liga cada coluna a um campo pelo nome dela. Você confere e ajusta.</span></li>
        <li><Icone nome="olho" className="ico" /><span><b>3. A prévia.</b> Cada linha aparece pronta, com aviso ou com erro. Corrija ali mesmo ou pule a linha.</span></li>
        <li><Icone nome="check" className="ico" /><span><b>4. Importar.</b> Entra tudo de uma vez. Dá para desfazer em até 7 dias, sem apagar nada em silêncio.</span></li>
      </ul>
    </section>
  );
}

function QuemImporta({ contratos }: { contratos: boolean }) {
  return (
    <Folha id="t-quem" titulo="Quem pode importar">
      <ul className="im-regras" style={{ padding: "0 24px 20px" }}>
        <li><Icone nome="pessoas" className="ico" /><span><b>Clientes:</b> todos da equipe, como no cadastro de um por um.</span></li>
        {contratos ? <li><Icone nome="pena" className="ico" /><span><b>Contratos:</b> quem tem a área Contratos.</span></li> : null}
        <li><Icone nome="historico" className="ico" /><span><b>Desfazer:</b> quem importou ou o sócio dono, em até 7 dias.</span></li>
      </ul>
    </Folha>
  );
}

/** Uma moldura de página de Clientes, com o escritório carregado. */
export function Pagina({ trilha, children }: { trilha: { nome: string; href?: string }[]; children: (e: EscritorioPortal) => ReactNode }) {
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  const t = [{ nome: "Clientes", href: ROTAS_PORTAL.clientes }, ...trilha];
  return (
    <MolduraPortal atual="clientes" trilha={t} escritorio={escritorio} pagina="co-equipe co-carteira">
      {erro ? <ErroAoCarregar oque="o Portal" aoTentar={recarregar} /> : !escritorio ? <Carregando rotulo="Carregando…" linhas={3} /> : children(escritorio)}
    </MolduraPortal>
  );
}

// ------------------------------------------------------------------------------- passo 1: o arquivo

export const PROBLEMAS_ARQUIVO: Record<string, { titulo: string; texto: (nome: string) => string }> = {
  ARQUIVO_FORMATO: {
    titulo: "Este arquivo não é uma planilha.",
    texto: (n) => `“${n}” não é .xlsx nem .csv. Envie a planilha em .xlsx ou .csv. No Google Planilhas: Arquivo › Fazer download › Microsoft Excel (.xlsx). Nada foi importado e o arquivo já foi apagado.`,
  },
  ARQUIVO_VAZIO: {
    titulo: "A planilha está vazia.",
    texto: () => "A primeira aba não tem linhas abaixo dos nomes das colunas. Veja se os dados estão em outra aba: o passo 2 deixa escolher. Nada foi importado.",
  },
  ARQUIVO_GRANDE: {
    titulo: "A planilha é grande demais.",
    texto: () => "Passa de 5 MB ou de 2.000 linhas. Divida em duas planilhas (por exemplo, clientes de A a L e de M a Z) e importe uma depois da outra. Nada foi importado.",
  },
  ARQUIVO_PROTEGIDO: {
    titulo: "A planilha está protegida por senha.",
    texto: () => "Abra no Excel, tire a senha em Arquivo › Informações e envie de novo. O T3jus não pede a senha. Nada foi importado e o arquivo já foi apagado.",
  },
  SEM_CABECALHO: {
    titulo: "Faltam os nomes das colunas.",
    texto: () => "A primeira linha precisa trazer o nome de cada coluna, como “Nome” e “CPF”. Sem eles, não dá para ligar as colunas. Nada foi importado.",
  },
};

const OUTROS_PROBLEMAS: [string, string, string][] = [
  ["Planilha vazia", "A primeira aba não tem linhas abaixo dos nomes das colunas. Veja se os dados estão em outra aba: o passo 2 deixa escolher.", "ARQUIVO_VAZIO"],
  ["Grande demais", "Passa de 5 MB ou de 2.000 linhas. Divida em duas planilhas (por exemplo, clientes de A a L e de M a Z) e importe uma depois da outra.", "ARQUIVO_GRANDE"],
  ["Protegida por senha", "Abra no Excel, tire a senha em Arquivo › Informações e envie de novo. O T3jus não pede a senha.", "ARQUIVO_PROTEGIDO"],
  ["Sem os nomes das colunas", "A primeira linha precisa trazer o nome de cada coluna, como “Nome” e “CPF”. Sem eles, não dá para ligar as colunas.", "SEM_CABECALHO"],
];

export function kb(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ImportarPlanilha({ id, modelo = false, passo, aba }: {
  id?: string; modelo?: boolean; passo?: "abas" | "colunas" | "previa"; aba?: number;
}) {
  return (
    <Pagina trilha={[{ nome: id ? "Importar dados" : "Importar planilha" }]}>
      {(e) => (id ? <ImportacaoComecada id={id} passo={passo ?? "colunas"} aba={aba} escritorio={e} /> : <PassoArquivo escritorio={e} modeloAberto={modelo} />)}
    </Pagina>
  );
}

export function PassoArquivo({ escritorio, modeloAberto }: { escritorio: EscritorioPortal; modeloAberto: boolean }) {
  const temContratos = escritorio.areas.includes("CONTRATOS");
  const [oQue, setOQue] = useState<OQueImportar>(temContratos ? "CLIENTES_CONTRATOS" : "CLIENTES");
  const [lendo, setLendo] = useState<{ nome: string; tamanho: number } | null>(null);
  const [erro, setErro] = useState<{ motivo: string; nome: string; texto?: string } | null>(null);
  const [verModelo, setVerModelo] = useState(modeloAberto);
  const [arrastando, setArrastando] = useState(false);
  const [ultimas, setUltimas] = useState<Importacao[] | null>(null);
  const cancelar = useRef<AbortController | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const ehContratos = oQue === "CLIENTES_CONTRATOS";

  useEffect(() => {
    let vivo = true;
    void chamarPortal<{ importacoes: Importacao[] }>(API).then((r) => {
      if (vivo && r.ok) setUltimas(r.dados.importacoes.slice(0, 2));
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function enviar(arquivo: File) {
    setErro(null);
    if (arquivo.size === 0) return setErro({ motivo: "ARQUIVO_VAZIO", nome: arquivo.name });
    if (arquivo.size > LIMITE_ARQUIVO_BYTES) return setErro({ motivo: "ARQUIVO_GRANDE", nome: arquivo.name });
    const ac = new AbortController();
    cancelar.current = ac;
    setLendo({ nome: arquivo.name, tamanho: arquivo.size });
    const r = await chamarPortal<Importacao>(`${API}?oQue=${oQue}&nome=${encodeURIComponent(arquivo.name.slice(0, 200))}`, { bruto: arquivo, sinal: ac.signal });
    cancelar.current = null;
    if (ac.signal.aborted) return setLendo(null);
    if (r.ok) return irPara(ROTAS_IMPORTACAO.passo(r.dados.id, "colunas"));
    setLendo(null);
    const motivo = typeof r.erro.detalhes?.motivo === "string" ? r.erro.detalhes.motivo : "";
    setErro({ motivo, nome: arquivo.name, texto: PROBLEMAS_ARQUIVO[motivo] ? undefined : textoDoErro(r.erro) });
  }

  function escolheu(lista: FileList | null) {
    const a = lista?.[0];
    if (a) void enviar(a);
    if (entrada.current) entrada.current.value = "";
  }

  const soltar = (
    <div className={`soltar${arrastando ? " e-arrastando" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); escolheu(e.dataTransfer.files); }}>
      <Icone nome="enviar" className="ico" />
      <p><strong className="so-pc-t">Arraste a planilha para cá ou</strong></p>
      <input ref={entrada} className="sr" type="file" id="im-arq" aria-describedby="im-regra"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(e) => escolheu(e.target.files)} />
      <label className="btn btn-sec" htmlFor="im-arq"><Icone nome="mais" className="ico" />Escolher a planilha</label>
      <p className="ajuda" id="im-regra">Arquivo .xlsx ou .csv, até 5 MB e 2.000 linhas.</p>
    </div>
  );

  const problema = erro ? PROBLEMAS_ARQUIVO[erro.motivo] : undefined;
  const blocoArquivo = lendo ? (
    <>
      <div className="im-arq">
        <span className="im-ci"><Icone nome="doc" className="ico" /></span>
        <span><strong>{lendo.nome}</strong><small>{kb(lendo.tamanho)} · enviado agora</small></span>
      </div>
      <div className="pt-gerando" role="status" aria-live="polite">
        <p><b>Lendo a planilha.</b> Costuma levar poucos segundos; com 2.000 linhas, até um minuto.</p>
        <div className="pt-barra-indet" aria-hidden="true" />
      </div>
      <div>
        <button className="btn btn-sec" type="button" onClick={() => cancelar.current?.abort()}>
          <Icone nome="xis" className="ico" />
          Cancelar e apagar o arquivo
        </button>
      </div>
    </>
  ) : (
    <>
      {erro ? (
        <Aviso tom="urgencia" titulo={problema?.titulo ?? "Não deu para ler a planilha."}>
          {problema ? problema.texto(erro.nome) : `${erro.texto ?? ""} Nada foi importado.`}
        </Aviso>
      ) : null}
      {soltar}
      {erro?.motivo ? (
        <p className="ajuda" style={{ fontFamily: "ui-monospace,Menlo,Consolas,monospace", fontSize: 12, color: "var(--texto-2)" }}>{erro.motivo}</p>
      ) : (
        <ul className="im-lim" aria-label="Antes de enviar">
          <li><Icone nome="doc" className="ico" /><span><b>.xlsx ou .csv.</b> No Google Planilhas: Arquivo › Fazer download › Microsoft Excel.</span></li>
          <li><Icone nome="filtro" className="ico" /><span><b>Até 5 MB e 2.000 linhas.</b> Se passar, divida em duas planilhas e importe uma depois da outra.</span></li>
          <li><Icone nome="funcoes" className="ico" /><span><b>A primeira linha traz os nomes das colunas.</b> Se houver mais de uma aba, você escolhe no passo 2.</span></li>
        </ul>
      )}
    </>
  );

  const dono = escritorio.socios[0];
  const principal = (
    <Folha id="t-env" titulo="Enviar a planilha" sub="Clientes e contratos que já estão numa planilha entram de uma vez, sem redigitar.">
      <div className="im-bloco">
        <h3><span className="disco" aria-hidden="true"><span>1</span></span>O que importar</h3>
        {temContratos ? (
          <fieldset className="im-opcoes" disabled={!!lendo}>
            <legend className="sr">O que importar</legend>
            <div className="im-ops">
              <label className="opcao">
                <input className="marcar" type="radio" name="im-oque" value="CLIENTES" checked={oQue === "CLIENTES"} onChange={() => setOQue("CLIENTES")} />
                <span>Só clientes<small>Nome, contatos e qualificação. Uma linha por cliente.</small></span>
              </label>
              <label className="opcao">
                <input className="marcar" type="radio" name="im-oque" value="CLIENTES_CONTRATOS" checked={oQue === "CLIENTES_CONTRATOS"} onChange={() => setOQue("CLIENTES_CONTRATOS")} />
                <span>Clientes e contratos<small>Uma linha por contrato; o cliente se repete pelo CPF ou CNPJ. As parcelas vão para o Financeiro.</small></span>
              </label>
            </div>
          </fieldset>
        ) : (
          <>
            <p>Você vai importar <b style={{ color: "var(--texto)", fontWeight: 500 }}>clientes</b>: nome, contatos e a qualificação para procuração e contrato. Uma linha por cliente.</p>
            <p className="im-cadeado">
              <Icone nome="cadeado" className="ico" />
              <span>
                <b>Contratos ficam na área Contratos, que não está liberada para você.</b> Se a planilha tiver colunas de contrato ou de origem do cliente
                (área Comercial), elas ficam de fora, e a prévia mostra isso.{dono ? ` Quem libera é ${dono}, o sócio dono.` : " Quem libera é o sócio dono."}
              </span>
            </p>
          </>
        )}
      </div>
      {lendo ? null : (
        <div className="im-bloco">
          <h3><span className="disco" aria-hidden="true"><span>2</span></span>A planilha</h3>
          <p>Não precisa mudar a sua planilha: no próximo passo você liga as colunas dela aos campos do T3jus. Se for começar do zero, use a planilha-modelo.</p>
          <div className="im-modelo">
            <span className="im-ci"><Icone nome="doc" className="ico" /></span>
            <span>
              <strong>Planilha-modelo de {ehContratos ? "clientes e contratos" : "clientes"}</strong>
              <small>Com os nomes das colunas, uma linha de exemplo e as listas (estado civil, UF, tipo de honorário). Abre no Excel e no Google Planilhas.</small>
            </span>
            <span className="im-mac">
              <button className="btn btn-fantasma" type="button" onClick={() => setVerModelo(true)}><Icone nome="olho" className="ico" />Ver as colunas</button>
              <button className="btn btn-sec" type="button" onClick={() => baixarModelo(ehContratos)}><Icone nome="baixar" className="ico" />Baixar (.xlsx)</button>
            </span>
          </div>
        </div>
      )}
      <div className="im-bloco" aria-busy={lendo ? true : undefined}>
        <h3><span className="disco" aria-hidden="true"><span>3</span></span>O arquivo</h3>
        {blocoArquivo}
        <Lgpd>{LGPD_ARQ}</Lgpd>
      </div>
      {lendo ? null : (
        <div className="im-pe">
          <span className="im-pe-t">Ao escolher o arquivo, a leitura começa sozinha. Nada entra no cadastro neste passo.</span>
          <a className="btn btn-fantasma" href={ROTAS_PORTAL.clientes}>Cancelar</a>
          <button className="btn btn-pri" type="button" onClick={() => entrada.current?.click()}><Icone nome="dir" className="ico" />Enviar e continuar</button>
        </div>
      )}
    </Folha>
  );

  const lateral = (
    <>
      {erro ? (
        <Folha id="t-msgs" titulo="Outros problemas de arquivo" sub="Cada um diz o que fazer. Em todos, nada é importado e o arquivo é apagado.">
          <ul className="im-msgs">
            {OUTROS_PROBLEMAS.filter(([, , c]) => c !== erro.motivo).map(([a, b, c]) => <li key={c}><b>{a}</b>{b} <code>{c}</code></li>)}
          </ul>
        </Folha>
      ) : null}
      <ExplicaFluxo />
      {lendo ? null : <QuemImporta contratos={temContratos} />}
      {!lendo && ultimas?.length ? (
        <Folha id="t-ult" titulo="Importações anteriores">
          <ul className="im-ok">
            {ultimas.map((u) => (
              <li key={u.id}>
                <Icone nome="historico" className="ico" />
                <span>
                  <b>{u.arquivo}</b>
                  <small>{dataCurta(u.importadoEm ?? u.criadoEm)} · {u.por.nome} · {u.desfeita ? "desfeita" : plural(u.resumo?.clientes ?? 0, "cliente", "clientes")}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="hn-pe" style={{ paddingTop: 12 }}><Icone nome="dir" className="ico" /><a href={ROTAS_IMPORTACAO.historico}>Ver todas as importações</a></p>
        </Folha>
      ) : null}
    </>
  );

  return (
    <div className="im">
      <CabFluxo lede="Clientes e contratos de uma planilha do Excel ou do Google Planilhas, conferidos numa prévia antes de salvar." />
      <Passos atual={1} escolhas={[lendo?.nome ?? ""]} />
      <Grade principal={principal} lateral={lateral} />
      <JanelaModelo aberta={verModelo} contratos={ehContratos} aoFechar={() => setVerModelo(false)} />
    </div>
  );
}

function baixarModelo(contratos: boolean) {
  salvar(contratos ? "planilha-modelo-clientes-e-contratos.xlsx" : "planilha-modelo-clientes.xlsx", XLSX, planilhaXlsx(abaModelo(contratos)));
}

const MOD_CLI: [string, string, string][] = [
  ["Nome ou razão social", "Sim", "Rosa Almeida"],
  ["CPF ou CNPJ", "Não", "529.982.247-25"],
  ["Telefone ou WhatsApp", "Telefone ou e-mail", "(11) 98451-2290"],
  ["E-mail", "Telefone ou e-mail", "rosa.almeida@exemplo.com.br"],
  ["Com quem falar e papel (empresa)", "Não", "Rogério Dias · sócio"],
  ["Nacionalidade, estado civil, profissão", "Não", "Brasileira · Casado(a) · Professora"],
  ["RG e órgão emissor", "Não", "32.418.776-5 · SSP/SP"],
  ["CEP, endereço, bairro, cidade, UF", "Não", "05425-070 · Rua Cardeal Arcoverde, 1200, ap. 54 · Pinheiros · São Paulo · SP"],
  ["Origem e quem indicou", "Não (área Comercial)", "Indicação de cliente · Irene Castro"],
];
const MOD_CTR: [string, string, string][] = [
  ["Objeto do contrato", "Sim, se houver contrato", "Aposentadoria por idade"],
  ["Tipo de honorário", "Sim, se houver contrato", "Fixo, Parcelado, Mensal ou Êxito"],
  ["Valor", "Sim, se houver contrato", "R$ 4.800,00 (total, mensal) ou 30% (êxito)"],
  ["Número de parcelas e 1º vencimento", "No parcelado", "6 · 10/09/2026"],
  ["Parcelas já pagas", "Não", "2"],
  ["Data da assinatura", "Não", "02/09/2026 (sem ela, entra em elaboração)"],
  ["Responsável pelo contrato", "Sim, ou um padrão no passo 2", "Marina Ribeiro"],
];

function JanelaModelo({ aberta, contratos, aoFechar }: { aberta: boolean; contratos: boolean; aoFechar: () => void }) {
  const grupo = (t: string, itens: [string, string, string][]) => (
    <>
      <tr className="im-mod-g"><th colSpan={3} scope="colgroup">{t}</th></tr>
      {itens.map(([a, b, c]) => (
        <tr key={a}><th scope="row">{a}</th><td data-r="Obrigatória">{b}</td><td data-r="Exemplo">{c}</td></tr>
      ))}
    </>
  );
  return (
    <Janela id="janela-modelo" aberta={aberta} aoFechar={aoFechar} sobretitulo="Importar planilha" titulo="Colunas da planilha-modelo" descricao="janela-modelo-d"
      aoEnviar={() => baixarModelo(contratos)}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Fechar</button>
          <button className="btn btn-pri" type="submit"><Icone nome="baixar" className="ico" />Baixar a planilha-modelo</button>
        </>
      }>
      <p id="janela-modelo-d">
        Os nomes das colunas não precisam ser estes: no passo 2 você liga cada coluna ao campo certo. Só o nome do cliente e um telefone ou e-mail são sempre
        obrigatórios.
      </p>
      <table className="im-mod">
        <caption className="sr">Colunas da planilha-modelo</caption>
        <colgroup><col style={{ width: "36%" }} /><col style={{ width: "24%" }} /><col style={{ width: "40%" }} /></colgroup>
        <thead><tr><th scope="col">Coluna</th><th scope="col">Obrigatória</th><th scope="col">Exemplo</th></tr></thead>
        <tbody>
          {grupo("Cliente", MOD_CLI)}
          {contratos ? grupo("Contrato (deixe vazio se a linha for só do cliente)", MOD_CTR) : null}
        </tbody>
      </table>
      <ul className="im-regras" style={{ marginTop: 14 }}>
        <li><Icone nome="doc" className="ico" /><span><b>Uma linha por contrato.</b> Cliente com dois contratos: repita o CPF ou CNPJ em duas linhas. Cliente sem contrato: deixe as colunas de contrato vazias.</span></li>
        <li><Icone nome="pena" className="ico" /><span><b>Quatro dos sete tipos de honorário vêm da planilha:</b> fixo, parcelado, mensal e êxito em percentual. Sucumbência, por ato e percentual recorrente se completam na ficha do contrato, depois.</span></li>
        <li><Icone nome="moeda" className="ico" /><span><b>Valores com centavos.</b> “4800”, “4.800,00” e “R$ 4.800,00” valem o mesmo. O parcelado é dividido em centavos exatos, como no contrato feito à mão.</span></li>
      </ul>
    </Janela>
  );
}

// ------------------------------------------------------------------------------- importação começada

function ImportacaoComecada({ id, passo, aba, escritorio }: { id: string; passo: "abas" | "colunas" | "previa"; aba?: number; escritorio: EscritorioPortal }) {
  const [imp, setImp] = useState<Importacao | "erro" | null>(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<Importacao>(`${API}/${encodeURIComponent(id)}`).then((r) => {
      if (!vivo) return;
      if (r.ok && (r.dados.situacao === "CONCLUIDA" || r.dados.situacao === "DESFEITA")) return irPara(ROTAS_IMPORTACAO.resultado(id));
      setImp(r.ok ? r.dados : "erro");
    });
    return () => {
      vivo = false;
    };
  }, [id, vez]);
  if (imp === null) return <Carregando rotulo="Carregando a importação…" linhas={4} />;
  if (imp === "erro") return <ErroAoCarregar oque="a importação" aoTentar={() => setVez((v) => v + 1)} />;
  if (imp.situacao !== "PREVIA" || !imp.colunas) {
    return (
      <div className="im">
        <CabFluxo origem={imp.origem} />
        <section className="folha">
          <Estado icone="historico" moldura titulo={imp.situacao === "EXPIRADA" ? "Esta prévia passou de 24 horas e foi apagada" : "Esta importação foi cancelada"}
            acoes={<a className="btn btn-pri" href={INICIO_ORIGEM[imp.origem]}><Icone nome="enviar" className="ico" />{imp.origem === "ASTREA" ? "Enviar o backup de novo" : "Enviar a planilha de novo"}</a>}>
            O arquivo e as correções da prévia já foram apagados. Nada entrou no cadastro. {imp.origem === "ASTREA" ? "Envie o backup de novo para recomeçar." : "Envie a planilha de novo para recomeçar."}
          </Estado>
        </section>
      </div>
    );
  }
  if (passo === "previa" && imp.temPrevia) return <PassoPrevia imp={imp} />;
  if (passo === "abas" && imp.abasSistema && imp.origem === "ASTREA") return <PassoAbas imp={imp} />;
  if (imp.oQue === "CASOS") return <PassoColunasCasos imp={imp} />;
  if (imp.oQue === "FINANCEIRO") return <PassoColunasFinanceiro imp={imp} />;
  return <PassoColunas imp={imp} escritorio={escritorio} abaInicial={aba} />;
}

// ------------------------------------------------------------------------------- passo 2: colunas

type Escolhas = { responsavel: Record<string, string>; tipo: Record<string, string>; origem: Record<string, string>; tipoContato: Record<string, string> };
const GRUPOS_PARES = ["responsavel", "tipo", "origem", "tipoContato"] as const;

/** O que cada tipo de contato do backup vira (decisão 9 do F3.56). */
const NOMES_TIPO_CONTATO: Record<TipoContato, string> = { CLIENTE: "Cliente", PARTE_CONTRARIA: "Parte contrária", FORA: "Não importar" };
const AJUDA_TIPO_CONTATO: Record<TipoContato, string> = {
  CLIENTE: "",
  PARTE_CONTRARIA: "Não viram clientes. A parte contrária entra no caso de cada processo, na prévia dos processos.",
  FORA: "Ficam de fora: o cadastro de clientes não guarda terceiros.",
};

const TEXTO_FORA = { OBSERVACAO: "Observação livre não entra: pode trazer dado que o cadastro não pede (LGPD).", AREA: "A área entra no Jurídico, quando o caso for cadastrado." };

/** A ligação sugerida pelos nomes, sem os campos que a pessoa não pode importar e sem repetir campo. */
function ligacaoSugerida(cols: ColunaImportacao[], contratos: boolean, comercial: boolean): Record<string, CampoImportacao | ""> {
  const usado = new Set<string>();
  const r: Record<string, CampoImportacao | ""> = {};
  for (const c of cols) {
    const s = c.modelo ?? c.sugestao;
    const pode = s && (contratos || !ehCampoContrato(s)) && (comercial || (s !== "origem" && s !== "origem_indicacao")) && !usado.has(s);
    r[String(c.indice)] = pode ? s : "";
    if (pode) usado.add(s);
  }
  return r;
}

function PassoColunas({ imp, escritorio, abaInicial }: { imp: Importacao; escritorio: EscritorioPortal; abaInicial?: number }) {
  const [aba, setAba] = useState(imp.aba);
  const sistema = SISTEMA_ORIGEM[imp.origem];
  const backup = imp.origem === "ASTREA";
  const [colunas, setColunas] = useState<ColunaImportacao[]>(imp.colunas ?? []);
  const [ligacao, setLigacao] = useState<Record<string, CampoImportacao | "">>(() => {
    const r: Record<string, CampoImportacao | ""> = {};
    for (const c of imp.colunas ?? []) r[String(c.indice)] = (imp.ligacao[String(c.indice)] as CampoImportacao | undefined) ?? "";
    return r;
  });
  const [pares, setPares] = useState<ParesImportacao | null>(null);
  const [escolhas, setEscolhas] = useState<Escolhas>({
    responsavel: { ...(imp.pares.responsavel ?? {}) }, tipo: { ...(imp.pares.tipo ?? {}) }, origem: { ...(imp.pares.origem ?? {}) },
    tipoContato: { ...(imp.pares.tipoContato ?? {}) },
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ campos: Obrigatorio[]; texto?: string } | null>(null);
  const [versao, setVersao] = useState(imp.versao);
  const topo = useRef<HTMLDivElement>(null);
  const contratos = imp.contratos;
  const letras = colunas.map((c) => c.letra);

  // Os pares (e as colunas da aba) vêm do servidor sempre que a ligação muda.
  const chave = JSON.stringify([aba, ligacao]);
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => {
      const lig = Object.fromEntries(Object.entries(ligacao).filter(([, v]) => v));
      void chamarPortal<ParesImportacao>(`${API}/${imp.id}/pares`, { corpo: { aba, ligacao: lig } }).then((r) => {
        if (!vivo || !r.ok) return;
        // A API anterior ao F3.56 não manda o tipo de contato.
        const d: ParesImportacao = { ...r.dados, tipoContato: r.dados.tipoContato ?? [] };
        setPares(d);
        setEscolhas((e) => {
          const n: Escolhas = { responsavel: { ...e.responsavel }, tipo: { ...e.tipo }, origem: { ...e.origem }, tipoContato: { ...e.tipoContato } };
          for (const g of GRUPOS_PARES) {
            for (const p of d[g]) if (n[g][p.chave] === undefined) n[g][p.chave] = p.sugestao ?? "";
          }
          return n;
        });
      });
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, imp.id]);

  // A aba escolhida no passo das abas do backup.
  useEffect(() => {
    if (abaInicial !== undefined && abaInicial !== imp.aba && imp.abas?.some((a) => a.indice === abaInicial)) void trocarAba(abaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaInicial]);

  async function trocarAba(nova: number) {
    setAba(nova);
    setErro(null);
    const r = await chamarPortal<ParesImportacao>(`${API}/${imp.id}/pares`, { corpo: { aba: nova, ligacao: {} } });
    if (!r.ok) return;
    setColunas(r.dados.colunas);
    setLigacao(ligacaoSugerida(r.dados.colunas, contratos, imp.comercial));
  }

  function ligar(indice: number, campo: CampoImportacao | "") {
    setLigacao((l) => {
      const n = { ...l };
      // Um campo só numa coluna: escolher o mesmo campo em outra solta a anterior.
      if (campo) for (const k of Object.keys(n)) if (n[k] === campo) n[k] = "";
      n[String(indice)] = campo;
      return n;
    });
  }

  const tiposEscolhidos = pares ? pares.tipo.map((p) => escolhas.tipo[p.chave] ?? "") : Object.values(escolhas.tipo);
  const falta = faltaLigar(ligacao, contratos, tiposEscolhidos);
  const semResponsavel = contratos && pares ? pares.responsavel.some((p) => !escolhas.responsavel[p.chave] && (p.chave !== "" || !Object.values(ligacao).includes("responsavel"))) : false;
  const faltaTudo: Obrigatorio[] = [...falta, ...(semResponsavel ? (["responsavel"] as const) : [])];

  async function verPrevia() {
    setErro(null);
    if (faltaTudo.length) {
      setErro({ campos: faltaTudo });
      topo.current?.scrollIntoView({ block: "start" });
      return;
    }
    setEnviando(true);
    const lig = Object.fromEntries(Object.entries(ligacao).filter(([, v]) => v));
    const r = await chamarPortal<ResumoPrevia & { versao: number }>(`${API}/${imp.id}/colunas`, {
      metodo: "PATCH", corpo: { versao, aba, ligacao: lig, pares: escolhas },
    });
    if (r.ok) return irPara(ROTAS_IMPORTACAO.passo(imp.id, "previa"));
    setEnviando(false);
    const campos = Array.isArray(r.erro.detalhes?.campos) ? (r.erro.detalhes.campos as Obrigatorio[]) : [];
    if (r.status === 409) {
      const a = await chamarPortal<Importacao>(`${API}/${imp.id}`);
      if (a.ok) setVersao(a.dados.versao);
    }
    setErro({ campos, texto: campos.length ? undefined : textoDoErro(r.erro) });
    topo.current?.scrollIntoView({ block: "start" });
  }

  const ligadasPeloModelo = colunas.filter((c) => ligacao[String(c.indice)] && ligacao[String(c.indice)] === c.modelo).length;
  const ligadasPeloNome = colunas.filter((c) => ligacao[String(c.indice)] && ligacao[String(c.indice)] !== c.modelo && ligacao[String(c.indice)] === c.sugestao).length;
  const ligadas = colunas.filter((c) => ligacao[String(c.indice)]).length;
  // O grupo de cada coluna sai da sugestão (estável enquanto a pessoa ajusta).
  const doContrato = (c: ColunaImportacao) => contratos && (ehCampoContrato(c.sugestao) || c.foraMotivo === "AREA" || ehCampoContrato(ligacao[String(c.indice)]));
  const colsCli = colunas.filter((c) => !doContrato(c));
  const colsCtr = colunas.filter(doContrato);
  const abaAtual = imp.abas?.find((a) => a.indice === aba);
  const linhasAba = abaAtual?.linhas ?? imp.linhasLidas ?? 0;

  function textoFora(c: ColunaImportacao): string | null {
    if (ligacao[String(c.indice)]) return null;
    if (c.foraMotivo) return TEXTO_FORA[c.foraMotivo];
    if (c.sugestao && ehCampoContrato(c.sugestao) && !contratos) {
      return escritorio.areas.includes("CONTRATOS") ? "Nesta importação entram só clientes." : "Contratos ficam na área Contratos, que não está liberada para você.";
    }
    if ((c.sugestao === "origem" || c.sugestao === "origem_indicacao") && !imp.comercial) return "A origem é da área Comercial, que não está liberada para você.";
    return null;
  }

  const tabela = (cols: ColunaImportacao[], grupo: "cliente" | "contrato", cap: string) => {
    const opcoes: CampoImportacao[] = grupo === "contrato" ? camposDoGrupo("contrato", imp.comercial) : [
      ...camposDoGrupo("cliente", imp.comercial),
      ...(backup ? (["tipo_contato"] as const) : []),
    ];
    return (
      <table className="hn-tab im-map">
        <caption className="sr">{cap}</caption>
        <colgroup><col style={{ width: "22%" }} /><col style={{ width: "20%" }} /><col style={{ width: "38%" }} /><col style={{ width: "20%" }} /></colgroup>
        <thead><tr><th scope="col">Coluna</th><th scope="col">Primeiro valor</th><th scope="col">Vai para</th><th scope="col">Como foi ligada</th></tr></thead>
        <tbody>
          {cols.map((c) => {
            const v = ligacao[String(c.indice)] ?? "";
            const fora = textoFora(c);
            const sel = `im-c-${c.letra}`;
            // Coluna sem sugestão pode ir para qualquer campo que a pessoa pode importar.
            const ops: CampoImportacao[] = !c.sugestao && !c.foraMotivo && contratos && grupo === "cliente"
              ? [...opcoes, ...camposDoGrupo("contrato", imp.comercial)] : opcoes;
            return (
              <tr key={c.indice} className={v ? "" : "im-ign"}>
                <td>
                  <div className="im-col">
                    <span className="im-letra" aria-hidden="true">{c.letra}</span>
                    <span><b>{c.nome}</b><span className="sr">, coluna {c.letra}</span><small className="im-ex-cel">1º valor: {c.exemplo ?? "vazio"}</small></span>
                  </div>
                </td>
                <td data-r="Primeiro valor"><span className="im-ex">{c.exemplo ?? "—"}</span></td>
                <td data-r="Vai para">
                  <div className="campo">
                    <label className="sr" htmlFor={sel}>Coluna {c.letra}, {c.nome}: vai para</label>
                    <select className="entrada" id={sel} value={v} onChange={(e) => ligar(c.indice, e.target.value as CampoImportacao | "")}>
                      <option value="">Não importar</option>
                      {ops.map((o) => <option key={o} value={o}>{NOMES_CAMPO_IMPORTACAO[o]}</option>)}
                    </select>
                  </div>
                </td>
                <td data-r="Como foi ligada">
                  {!v ? (
                    <div className="im-sit"><Selo tom="neutro" icone="xis">Fica de fora</Selo>{fora ? <small>{fora}</small> : null}</div>
                  ) : v === c.modelo ? (
                    <div className="im-sit im-sit-nome"><span className="hn-selo"><Icone nome="check" className="ico" />Pelo modelo do {sistema}</span></div>
                  ) : v === c.sugestao ? (
                    <div className="im-sit im-sit-nome"><span className="hn-selo"><Icone nome="check" className="ico" />Pelo nome</span></div>
                  ) : (
                    <div className="im-sit"><span className="hn-selo"><Icone nome="lapis" className="ico" />Por você</span></div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const nomeColuna = (campo: CampoImportacao) => {
    const k = Object.entries(ligacao).find(([, v]) => v === campo)?.[0];
    const c = colunas.find((x) => String(x.indice) === k);
    return c ? c.nome : NOMES_CAMPO_IMPORTACAO[campo];
  };

  const blocoPares = pares && (pares.responsavel.length || pares.tipo.length || pares.origem.length || pares.tipoContato.length) ? (
    <Folha id="t-pares" titulo={sistema ? "Valores que viram itens do T3jus" : "Valores que viram itens das listas do T3jus"}
      sub={sistema ? `Cada valor diferente do ${backup ? "backup" : "arquivo"}, com quantas linhas o usam. Ligue uma vez; vale para todas as linhas.`
        : "Cada valor diferente da planilha, com quantas linhas o usam. Estado civil e UF são reconhecidos sozinhos."}>
      <div style={{ paddingBottom: 12 }}>
        {pares.tipoContato.length ? (
          <GrupoPares titulo={`${imp.abas?.find((a) => a.indice === aba)?.nome ?? "Contatos"} · coluna “${nomeColuna("tipo_contato")}”`} itens={pares.tipoContato}
            escolhido={escolhas.tipoContato} prefixo="k" opcoes={Object.entries(NOMES_TIPO_CONTATO).map(([v, t]) => ({ v, t }))} vazio="Cliente"
            ajuda={(p) => AJUDA_TIPO_CONTATO[(escolhas.tipoContato[p.chave] || "CLIENTE") as TipoContato]}
            rotuloDe={(p) => (p.chave === "" ? "Sem o tipo" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, tipoContato: { ...e.tipoContato, [k]: v } }))} />
        ) : null}
        {pares.responsavel.length ? (
          <GrupoPares titulo={Object.values(ligacao).includes("responsavel") ? `Coluna “${nomeColuna("responsavel")}”` : "Responsável pelos contratos"}
            itens={pares.responsavel} escolhido={escolhas.responsavel} prefixo="r"
            opcoes={pares.equipe.map((p) => ({ v: p.id, t: p.nome }))} vazio="Escolha quem fica"
            ajuda={(p) => (p.chave === "" ? (Object.values(ligacao).includes("responsavel") ? "Linhas sem o advogado na planilha." : "Nenhuma coluna traz o responsável: escolha um para todos.") : p.sugestao ? "" : "Não está na Equipe. Os contratos dele ficam com quem você escolher.")}
            rotuloDe={(p) => (p.chave === "" ? "Sem o responsável" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, responsavel: { ...e.responsavel, [k]: v } }))} />
        ) : null}
        {pares.tipo.length ? (
          <GrupoPares titulo={`Coluna “${nomeColuna("tipo")}”`} itens={pares.tipo} escolhido={escolhas.tipo} prefixo="t"
            opcoes={Object.entries(NOMES_TIPO_IMPORTADO).map(([v, t]) => ({ v, t }))} vazio="Não reconhecido (a linha fica com erro)"
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, tipo: { ...e.tipo, [k]: v } }))} />
        ) : null}
        {pares.origem.length ? (
          <GrupoPares titulo={`Coluna “${nomeColuna("origem")}”`} itens={pares.origem} escolhido={escolhas.origem} prefixo="o"
            opcoes={Object.entries(ORIGENS).map(([v, t]) => ({ v, t }))} vazio="Deixar vazio"
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, origem: { ...e.origem, [k]: v } }))} />
        ) : null}
      </div>
    </Folha>
  ) : null;

  const aviso = erro ? (
    <div style={{ padding: "0 24px 16px" }}>
      {erro.campos.length ? (
        <Aviso tom="urgencia" titulo={`Falta ligar ${plural(erro.campos.length, "campo obrigatório", "campos obrigatórios")}. A prévia ainda não foi feita.`}
          acoes={
            <ul className="im-resumo" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {erro.campos.map((c) => <li key={c}>{NOMES_OBRIGATORIO[c]}</li>)}
            </ul>
          } />
      ) : (
        <Aviso tom="urgencia" titulo="A prévia não foi feita.">{erro.texto}</Aviso>
      )}
    </div>
  ) : null;

  const principal = (
    <>
      <Folha id="t-col" titulo="Ligue as colunas aos campos do T3jus" sub={`${imp.arquivo} · ${plural(linhasAba, "linha", "linhas")} · ${plural(colunas.length, "coluna", "colunas")}`}
        estilo={{ overflow: "hidden" }}>
        <div ref={topo} className="im-aba">
          {imp.abas && imp.abas.length > 1 && !backup ? (
            <div className="campo">
              <label htmlFor="im-aba">Aba da planilha</label>
              <select className="entrada" id="im-aba" value={aba} onChange={(e) => void trocarAba(Number(e.target.value))}>
                {imp.abas.map((a) => <option key={a.indice} value={a.indice}>{a.nome} ({plural(a.linhas, "linha", "linhas")})</option>)}
              </select>
            </div>
          ) : null}
          {sistema ? (
            <p>Ligamos {plural(ligadasPeloModelo, "coluna", "colunas")} da aba {imp.abas?.find((a) => a.indice === aba)?.nome ?? ""} pelo modelo do {sistema}{ligadasPeloNome ? ` e ${ligadasPeloNome} pelo nome` : ""}{ligadas > ligadasPeloModelo + ligadasPeloNome ? `; você ligou mais ${ligadas - ligadasPeloModelo - ligadasPeloNome}` : ""}. Confira cada uma e ajuste o que precisar.</p>
          ) : (
            <p>Ligamos {ligadasPeloNome} de {plural(colunas.length, "coluna", "colunas")} pelo nome{ligadas > ligadasPeloNome ? ` e você ligou mais ${ligadas - ligadasPeloNome}` : ""}. Confira cada uma e ajuste o que precisar.</p>
          )}
        </div>
        {aviso}
        <p className="im-grupo-t"><Icone nome="pessoas" className="ico" />Cliente · {plural(colsCli.length, "coluna", "colunas")}</p>
        {tabela(colsCli, "cliente", "Colunas do cliente")}
        {contratos && colsCtr.length ? (
          <>
            <p className="im-grupo-t"><Icone nome="pena" className="ico" />Contrato · {plural(colsCtr.length, "coluna", "colunas")}</p>
            {tabela(colsCtr, "contrato", "Colunas do contrato")}
          </>
        ) : null}
        <div className="im-pe">
          <span className="im-pe-t">As colunas que ficam de fora não são lidas. Nada entrou no cadastro ainda.</span>
          <a className="btn btn-fantasma" href={backup ? ROTAS_IMPORTACAO.abas(imp.id) : INICIO_ORIGEM[imp.origem]}><Icone nome="esquerda" className="ico" />Voltar</a>
          <button className="btn btn-pri" type="button" disabled={enviando} onClick={() => void verPrevia()}>
            <Icone nome="olho" className="ico" />
            {enviando ? "Conferindo as linhas…" : "Ver a prévia"}
          </button>
        </div>
      </Folha>
      {blocoPares}
    </>
  );

  const item = (o: Obrigatorio) => {
    const onde = o === "responsavel"
      ? (Object.values(ligacao).includes("responsavel") ? ondeLigado(ligacao, letras, o) : pares?.responsavel.every((p) => escolhas.responsavel[p.chave]) ? "Um padrão para todos" : "")
      : ondeLigado(ligacao, letras, o);
    const faltando = faltaTudo.includes(o);
    return faltando ? (
      <li key={o} className="im-falta"><Icone nome="alerta" className="ico" /><span><b>{NOMES_OBRIGATORIO[o]}</b><small>{o === "responsavel" ? "Escolha nos valores abaixo" : "Nenhuma coluna ligada"}</small></span></li>
    ) : (
      <li key={o}><Icone nome="check" className="ico" /><span>{NOMES_OBRIGATORIO[o]}<small>{onde || "Não se aplica a estes tipos"}</small></span></li>
    );
  };
  const obr = obrigatorios(contratos);
  const lateral = (
    <>
      <Folha id="t-obr" titulo="O que é obrigatório" sub={faltaTudo.length ? `Falta ligar ${faltaTudo.length}.` : "Tudo ligado."}>
        <p className="im-ok-t">Cliente</p>
        <ul className="im-ok">{obr.filter((o) => o === "nome" || o === "contato").map(item)}</ul>
        {contratos ? (
          <>
            <p className="im-ok-t">Contrato</p>
            <ul className="im-ok">{obr.filter((o) => o !== "nome" && o !== "contato").map(item)}</ul>
            {!Object.values(ligacao).includes("assinatura") ? (
              <p className="hn-pe"><Icone nome="ajuda" className="ico" /><span>Sem a coluna da data da assinatura, os contratos entram em elaboração e só vão ao Financeiro quando a assinatura for registrada, como no contrato feito à mão.</span></p>
            ) : null}
          </>
        ) : null}
      </Folha>
      <ExplicaFluxo />
    </>
  );

  return (
    <div className="im">
      <CabFluxo origem={imp.origem} />
      <Passos atual={2} escolhas={[imp.arquivo]} voltar={[INICIO_ORIGEM[imp.origem]]} origem={imp.origem} />
      <Grade principal={principal} lateral={lateral} rotulo="O que é obrigatório" />
    </div>
  );
}

export function GrupoPares({ titulo, itens, escolhido, opcoes, vazio, prefixo, ajuda, rotuloDe, aoEscolher }: {
  titulo: string; itens: ParValor[]; escolhido: Record<string, string>; opcoes: { v: string; t: string }[]; vazio: string; prefixo: string;
  ajuda?: (p: ParValor) => string; rotuloDe?: (p: ParValor) => string; aoEscolher: (chave: string, valor: string) => void;
}) {
  return (
    <>
      <p className="im-grupo-t"><Icone nome="funcoes" className="ico" />{titulo}</p>
      <ul className="im-pares">
        {itens.map((p, i) => {
          const id = `im-p${prefixo}${i}`;
          const aj = ajuda?.(p);
          const rot = rotuloDe ? rotuloDe(p) : `“${p.valor}”`;
          return (
            <li key={p.chave}>
              <span className="im-de"><b>{rot}</b><small>{plural(p.n, "linha", "linhas")}</small></span>
              <span className="im-seta" aria-hidden="true"><Icone nome="seta" className="ico" /></span>
              <div className="campo">
                <label className="sr" htmlFor={id}>{rot} vira</label>
                <select className="entrada" id={id} value={escolhido[p.chave] ?? ""} aria-describedby={aj ? `${id}-aj` : undefined}
                  onChange={(e) => aoEscolher(p.chave, e.target.value)}>
                  <option value="">{vazio}</option>
                  {opcoes.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                </select>
                {aj ? <p className="ajuda" id={`${id}-aj`}>{aj}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ------------------------------------------------------------------------------- passo 3: a prévia

type Filtro = "todas" | "ERRO" | "AVISO" | "PRONTA" | "PULADA";
export type Aberta = { numero: number; modo: "corrigir" | "decidir" | "gera" } | null;

const CAMPOS_ERRO_EXTRA: Partial<Record<string, CampoImportacao[]>> = {
  CONTATO_OBRIGATORIO: ["telefone", "email"],
  PARCELAS_INVALIDAS: ["parcelas"],
  PRIMEIRO_FALTA: ["primeiro"],
  VALOR_FALTA: ["valor"],
  OBJETO_FALTA: ["objeto"],
  TIPO_FALTA: ["tipo"],
  NOME_FALTA: ["nome"],
  RESPONSAVEL_FALTA: ["responsavel"],
  SEM_ASSINATURA: ["assinatura"],
  CLIENTE_FALTA: ["cliente", "cliente_documento"],
  CLIENTE_NAO_ENCONTRADO: ["cliente", "cliente_documento"],
  CLIENTE_AMBIGUO: ["cliente", "cliente_documento"],
};

/** Os campos que o "Corrigir" abre: os dos problemas, mais o telefone quando ele é o assunto. */
function camposParaCorrigir(l: LinhaPrevia): CampoImportacao[] {
  const r: CampoImportacao[] = [];
  for (const p of l.problemas) {
    const extra = l.lancamento && !p.codigo.startsWith("CLIENTE_") ? undefined : CAMPOS_ERRO_EXTRA[p.codigo];
    for (const c of extra ?? [p.campo]) if (!r.includes(c)) r.push(c);
  }
  if (r.includes("documento") && !r.includes("telefone")) r.push("telefone");
  return r;
}

function PassoPrevia({ imp: inicial }: { imp: Importacao }) {
  const [imp, setImp] = useState(inicial);
  const [resumo, setResumo] = useState<ResumoPrevia | null>(null);
  const [linhas, setLinhas] = useState<LinhaPrevia[] | null>(null);
  const [total, setTotal] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [erroCarga, setErroCarga] = useState(false);
  const [aberta, setAberta] = useState<Aberta>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [avisoTopo, setAvisoTopo] = useState<{ tom: "urgencia" | "atencao" | "sucesso"; titulo: string; texto?: string } | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [importando, setImportando] = useState(false);
  const [falhou, setFalhou] = useState<ErroApi | null>(null);
  const [vez, setVez] = useState(0);
  const ids = useId();
  const casos = imp.oQue === "CASOS";
  const fin = imp.oQue === "FINANCEIRO";
  /** As prévias que nascem da dos clientes do backup: os processos e o financeiro. */
  const filha = casos || fin;
  const sistema = SISTEMA_ORIGEM[imp.origem];

  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);

  const consulta = useCallback((desde = 0) => {
    const p = new URLSearchParams();
    if (filtro !== "todas") p.set("situacao", filtro);
    if (q) p.set("q", q.slice(0, 120));
    if (desde) p.set("desde", String(desde));
    const s = p.toString();
    return `${API}/${imp.id}/linhas${s ? `?${s}` : ""}`;
  }, [filtro, q, imp.id]);

  useEffect(() => {
    let vivo = true;
    void chamarPortal<PreviaImportacao>(consulta()).then((r) => {
      if (!vivo) return;
      if (!r.ok) return setErroCarga(true);
      setErroCarga(false);
      setImp(r.dados.importacao);
      setResumo(r.dados);
      setLinhas(r.dados.linhas);
      setTotal(r.dados.total);
    });
    return () => {
      vivo = false;
    };
  }, [consulta, vez]);

  async function mais() {
    const ultima = linhas?.at(-1)?.numero ?? 0;
    const r = await chamarPortal<PreviaImportacao>(consulta(ultima));
    if (r.ok) setLinhas((ls) => [...(ls ?? []), ...r.dados.linhas]);
  }

  async function mudarLinha(numero: number, dados: { campos?: Partial<Record<CampoImportacao, string>>; decisao?: DecisaoLinha | null }) {
    setOcupado(numero);
    const r = await chamarPortal<ResumoPrevia & { linha: LinhaPrevia; versao: number }>(`${API}/${imp.id}/linhas/${numero}`, { metodo: "PATCH", corpo: dados });
    setOcupado(null);
    if (!r.ok) return { erro: textoDoErro(r.erro) };
    setResumo(r.dados);
    setImp((i) => ({ ...i, versao: r.dados.versao }));
    setLinhas((ls) => ls?.map((l) => (l.numero === numero ? r.dados.linha : l)) ?? null);
    // O mesmo CPF em outra linha muda o "um cliente só" das outras: relê a página.
    if (dados.campos && "documento" in dados.campos) setVez((v) => v + 1);
    setAberta(null);
    return {};
  }

  async function juntarTodas() {
    setOcupado(-1);
    const r = await chamarPortal<ResumoPrevia & { decididas: number }>(`${API}/${imp.id}/decisoes`, { corpo: { codigo: casos ? "CASO_DUPLICADO" : "DUPLICADO", decisao: "JUNTAR" } });
    setOcupado(null);
    if (!r.ok) return setAvisoTopo({ tom: "urgencia", titulo: "Não deu para juntar.", texto: textoDoErro(r.erro) });
    setAvisoTopo(casos
      ? { tom: "sucesso", titulo: `${plural(r.dados.decididas, "linha juntada", "linhas juntadas")} aos casos que já existiam.`, texto: "Cada cliente se liga ao caso que já está no Jurídico; nenhum caso novo é criado para elas." }
      : { tom: "sucesso", titulo: `${plural(r.dados.decididas, "linha juntada", "linhas juntadas")} aos cadastros que já existiam.`, texto: "Só os campos vazios de cada cadastro vão receber o dado da planilha." });
    setVez((v) => v + 1);
  }

  async function importar() {
    setConfirmar(false);
    setImportando(true);
    setFalhou(null);
    const r = await chamarPortal<Importacao>(`${API}/${imp.id}/importar`, { corpo: { versao: imp.versao } });
    if (r.ok) return irPara(ROTAS_IMPORTACAO.resultado(imp.id));
    setImportando(false);
    if (r.status === 409 || r.status === 422) {
      setAvisoTopo({ tom: "atencao", titulo: textoDoErro(r.erro), texto: "Confira de novo as linhas com aviso e com erro antes de importar." });
      setVez((v) => v + 1);
      return;
    }
    setFalhou(r.erro);
  }

  const escolhas = [imp.arquivo, `${plural(Object.values(imp.ligacao).filter(Boolean).length, "coluna ligada", "colunas ligadas")}`, resumo ? `${plural(resumo.contagens.lidas, "linha conferida", "linhas conferidas")}` : ""];
  const voltar = [filha && imp.pai ? ROTAS_IMPORTACAO.resultado(imp.pai) : INICIO_ORIGEM[imp.origem], imp.origem === "ASTREA" && !filha ? ROTAS_IMPORTACAO.abas(imp.id) : ROTAS_IMPORTACAO.passo(imp.id, "colunas"), ROTAS_IMPORTACAO.passo(imp.id, "previa")];

  if (importando || falhou) {
    return (
      <div className="im">
        <CabFluxo origem={imp.origem} />
        <Passos atual={4} escolhas={[...escolhas, falhou ? "não feita" : "em andamento"]} voltar={voltar} origem={imp.origem} />
        {falhou ? (
          <div className="estado estado-erro" role="alert">
            <span className="icone-estado"><Icone nome="alerta" className="ico" /></span>
            <h2>A importação não foi feita</h2>
            <p>
              O servidor parou no meio e desfez tudo: {casos ? "nenhum caso entrou no Jurídico" : fin ? "nada entrou nas fichas" : "nenhum cliente, contrato ou parcela entrou"}. As suas correções e decisões da prévia continuam guardadas por
              24 horas. Tente de novo; se continuar, mande o código ao suporte.
            </p>
            <div className="acoes">
              <button className="btn btn-pri" type="button" onClick={() => void importar()}><Icone nome="reenviar" className="ico" />Tentar de novo</button>
              <button className="btn btn-sec" type="button" onClick={() => { setFalhou(null); setVez((v) => v + 1); }}><Icone nome="esquerda" className="ico" />Voltar à prévia</button>
            </div>
            <p className="codigo">Código para o suporte: IMP-{imp.id.slice(0, 4).toUpperCase()}-{falhou.codigo}</p>
          </div>
        ) : (
          <Grade principal={
            <Folha id="t-imp" titulo="Importando" sub={imp.arquivo}>
              <div className="im-prog" aria-busy="true">
                <div className="pt-gerando" role="status" aria-live="polite">
                  <p><b>Importando {plural(resumo?.contagens.prontas ?? 0, "linha", "linhas")}.</b> {casos ? "Cada processo vira um caso no Jurídico, ligado ao cliente." : fin ? "Cada lançamento vai para o histórico da ficha do cliente." : "Clientes primeiro, depois os contratos e as parcelas."}</p>
                  <div className="pt-barra-indet" aria-hidden="true" />
                </div>
                <Lgpd><b>Ou entra tudo ou nada.</b> Se algo falhar no meio, nada fica pela metade e a prévia continua guardada.</Lgpd>
              </div>
            </Folha>
          } lateral={<ExplicaFluxo />} />
        )}
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="im">
        <CabFluxo origem={imp.origem} />
        <Passos atual={3} escolhas={escolhas} voltar={voltar} origem={imp.origem} />
        <ErroAoCarregar oque="a prévia" aoTentar={() => setVez((v) => v + 1)} />
      </div>
    );
  }
  if (!resumo || !linhas) return <Carregando rotulo="Carregando a prévia…" linhas={5} />;

  const c = resumo.contagens;
  const final = c.erro === 0 && c.aviso === 0;
  const fora = c.erro + c.aviso + c.puladas;
  const lidas = casos ? { r: "processos lidos", sub: "só os ativos" } : fin ? { r: "lançamentos lidos", sub: "aba Lançamentos, sem as despesas" } : { r: "linhas lidas", sub: "da planilha" };
  const nums: { n: number; dc: string; r: string; sub: string; f: Filtro }[] = final
    ? [
        { n: c.lidas, dc: "", r: lidas.r, sub: lidas.sub, f: "todas" },
        { n: c.prontas, dc: "hn-d-vinho", r: "vão entrar", sub: `${c.prontas - c.corrigidas - c.decididas} prontas, ${c.corrigidas} corrigidas e ${c.decididas} decididas`, f: "PRONTA" },
        { n: 0, dc: "hn-d-hoje", r: "com aviso", sub: "todas decididas", f: "AVISO" },
        { n: c.puladas, dc: "", r: "puladas", sub: "vão para a planilha de fora", f: "PULADA" },
      ]
    : [
        { n: c.lidas, dc: "", r: lidas.r, sub: lidas.sub, f: "todas" },
        { n: c.prontas, dc: "hn-d-vinho", r: "prontas", sub: "entram como estão", f: "PRONTA" },
        { n: c.aviso, dc: "hn-d-hoje", r: "com aviso", sub: "você decide", f: "AVISO" },
        { n: c.erro, dc: "hn-d-urg", r: "com erro", sub: "corrija ou pule", f: "ERRO" },
      ];
  const duplicadas = filtro === "AVISO" ? linhas.filter((l) => l.situacao === "AVISO" && (casos ? l.casoExistente && l.problemas.some((p) => p.codigo === "CASO_DUPLICADO") : l.duplicado) && !l.decisao).length : 0;
  const contTexto: Record<Filtro, string> = {
    todas: `${plural(total, "linha", "linhas")} na ordem da planilha · a linha 1 tem os nomes das colunas`,
    ERRO: `${plural(total, "linha com erro", "linhas com erro")}. Cada uma diz o que está errado. Linha com erro não entra até ser corrigida ou pulada.`,
    AVISO: `${plural(total, "linha com aviso", "linhas com aviso")}. Elas podem entrar como estão; o aviso pede que você confira antes.`,
    PRONTA: `${plural(total, "linha pronta", "linhas prontas")}: entram como estão.`,
    PULADA: `${plural(total, "linha pulada", "linhas puladas")}: ficam de fora e vão para a planilha de linhas que não entraram.`,
  };

  const principal = (
    <>
      {avisoTopo ? (
        <Aviso tom={avisoTopo.tom} titulo={avisoTopo.titulo}>{avisoTopo.texto}</Aviso>
      ) : (
        <Aviso tom="info" className="im-nada" titulo="Nada foi salvo ainda.">
          Confira, corrija ou pule as linhas com problema. A prévia fica guardada por 24 horas só para você; depois, é apagada com o arquivo.
        </Aviso>
      )}
      <section className="folha" aria-labelledby="t-prev" style={{ overflow: "hidden" }}>
        <h2 id="t-prev" className="sr">Linhas da planilha</h2>
        <form className="im-ferr" role="search" onSubmit={(e) => e.preventDefault()}>
          <div className="campo-busca">
            <label className="sr" htmlFor={`${ids}-b`}>{casos ? "Buscar na prévia por caso, número ou cliente" : fin ? "Buscar na prévia por cliente ou descrição" : "Buscar na prévia por nome, CPF ou número da linha"}</label>
            <Icone nome="busca" className="ico" />
            <input className="entrada" id={`${ids}-b`} type="search" placeholder={casos ? "Caso, número ou cliente" : fin ? "Cliente ou descrição" : "Nome, CPF ou número da linha"} autoComplete="off" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Chips rotulo="Mostrar" atual={filtro} aoEscolher={(v) => { setFiltro(v as Filtro); setAberta(null); }}
            opcoes={[
              { v: "todas", t: `Todas (${c.lidas})` },
              { v: "ERRO", t: `Com erro (${c.erro})` },
              { v: "AVISO", t: `Com aviso (${c.aviso})` },
              { v: "PRONTA", t: `Prontas (${c.prontas})` },
              ...(c.puladas ? [{ v: "PULADA", t: `Puladas (${c.puladas})` }] : []),
            ]} />
        </form>
        <p className="im-cont" role="status">{q ? `${plural(total, "linha encontrada", "linhas encontradas")} para “${q}”` : contTexto[filtro]}</p>
        {duplicadas > 1 && casos ? (
          <p className="im-massa">
            <Icone nome="balanca" className="ico" />
            <span><b>{plural(duplicadas, "linha", "linhas")}</b> têm o mesmo número de um caso que já está no Jurídico. Dá para juntar todas de uma vez: cada cliente se liga ao caso que existe.</span>
            <button className="btn btn-sec" type="button" disabled={ocupado === -1} onClick={() => void juntarTodas()}><Icone nome="check" className="ico" />Juntar as {duplicadas}</button>
          </p>
        ) : duplicadas > 1 ? (
          <p className="im-massa">
            <Icone nome="pessoas" className="ico" />
            <span><b>{plural(duplicadas, "linha", "linhas")}</b> têm o mesmo CPF de um cliente já cadastrado. Dá para juntar todas de uma vez: só entram os campos vazios de cada cadastro.</span>
            <button className="btn btn-sec" type="button" disabled={ocupado === -1} onClick={() => void juntarTodas()}><Icone nome="check" className="ico" />Juntar as {duplicadas}</button>
          </p>
        ) : null}
        {linhas.length ? (
          <>
            <div className="im-cab-l" aria-hidden="true"><span>Linha</span><span>{casos ? "Caso" : fin ? "Lançamento" : "Cliente"}</span><span>{casos ? "Cliente e responsável" : fin ? "Cliente e caso" : imp.contratos ? "Contrato e o que gera no Financeiro" : "Contatos"}</span><span>Situação</span></div>
            <ul className="im-linhas" aria-label={casos ? "Processos" : fin ? "Lançamentos" : "Linhas da planilha"}>
              {linhas.map((l) => fin ? (
                <LinhaDoLancamento key={l.numero} l={l} aberta={aberta?.numero === l.numero && aberta.modo === "corrigir" ? "corrigir" : null} ocupado={ocupado === l.numero}
                  aoAbrir={(modo) => setAberta(modo ? { numero: l.numero, modo } : null)} aoMudar={(d) => mudarLinha(l.numero, d)} />
              ) : casos ? (
                <LinhaDoCaso key={l.numero} l={l} origem={sistema} aberta={aberta?.numero === l.numero ? aberta.modo : null} ocupado={ocupado === l.numero}
                  aoAbrir={(modo) => setAberta(modo ? { numero: l.numero, modo } : null)} aoMudar={(d) => mudarLinha(l.numero, d)} />
              ) : (
                <LinhaDaPrevia key={l.numero} l={l} contratos={imp.contratos} aberta={aberta?.numero === l.numero ? aberta.modo : null} ocupado={ocupado === l.numero}
                  aoAbrir={(modo) => setAberta(modo ? { numero: l.numero, modo } : null)} aoMudar={(d) => mudarLinha(l.numero, d)} linhasDe={linhas} />
              ))}
            </ul>
          </>
        ) : casos ? <SemLinhasCasos q={q} /> : fin ? <SemLinhasFinanceiro q={q} /> : (
          <Estado icone="busca" titulo="Nenhuma linha aqui">{q ? "Nenhuma linha com esse nome, CPF ou número." : "Nenhuma linha nesta situação."}</Estado>
        )}
        {linhas.length < total ? (
          <div className="mais">
            <span>Mostrando {linhas.length} de {total}</span>
            <button className="btn btn-sec" type="button" onClick={() => void mais()}><Icone nome="baixo" className="ico" />Mostrar mais</button>
          </div>
        ) : null}
      </section>
    </>
  );

  const nImportar = c.prontas;
  const lateral = (
    <section className="folha hn-resumo im-res" aria-labelledby="t-res">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-res">O que vai entrar</h2>
          <p className="sub">Conta feita no servidor, em centavos exatos. Nada foi salvo.</p>
        </div>
      </div>
      {fin ? <ResumoFinanceiro resumo={resumo} final={final} despesas={imp.foraTipo && "DESPESAS" in imp.foraTipo ? imp.foraTipo.DESPESAS : 0} />
        : casos ? <ResumoCasos resumo={resumo} final={final} origem={sistema} /> : (
      <div className="hn-res-bloco">
        <h3>Clientes</h3>
        <p className="hn-res-grande">{(resumo.clientes.novos + resumo.clientes.juntados).toLocaleString("pt-BR")}</p>
        <ul>
          <li><b>{resumo.clientes.novos}</b> {resumo.clientes.novos === 1 ? "novo" : "novos"}{final ? "" : ", das linhas prontas"}</li>
          {resumo.clientes.juntados ? <li><b>{resumo.clientes.juntados}</b> juntados a cadastros que já existiam (só os campos vazios)</li> : null}
          {!final && c.aviso ? <li>mais o que você decidir {c.aviso === 1 ? "no" : "nos"} <b>{c.aviso}</b> {c.aviso === 1 ? "aviso" : "avisos"}</li> : null}
        </ul>
      </div>
      )}
      {imp.contratos ? (
        <>
          <div className="hn-res-bloco">
            <h3>Contratos</h3>
            <p className="hn-res-grande">{resumo.contratos.ativos + resumo.contratos.elaboracao}</p>
            <ul>
              <li><b>{resumo.contratos.ativos}</b> {resumo.contratos.ativos === 1 ? "ativo" : "ativos"}, com a data da assinatura</li>
              {resumo.contratos.elaboracao ? <li><b>{resumo.contratos.elaboracao}</b> em elaboração, sem a data: não vão ao Financeiro ainda</li> : null}
            </ul>
          </div>
          <div className="hn-res-bloco">
            <h3>No Financeiro</h3>
            <p className="hn-res-grande">{reais(resumo.financeiro.valor)}</p>
            <ul>
              <li><b>{resumo.financeiro.parcelas}</b> {resumo.financeiro.parcelas === 1 ? "parcela" : "parcelas"} a receber</li>
              {resumo.financeiro.vencidas ? <li><b>{resumo.financeiro.vencidas}</b> {resumo.financeiro.vencidas === 1 ? "já vencida entra" : "já vencidas entram"} em atraso</li> : null}
              {resumo.contratos.mensais ? <li><b>{resumo.contratos.mensais}</b> {resumo.contratos.mensais === 1 ? "mensalidade" : "mensalidades"}, todo mês</li> : null}
              {resumo.contratos.exitos ? <li><b>{resumo.contratos.exitos}</b> {resumo.contratos.exitos === 1 ? "êxito depende" : "êxitos dependem"} do caso</li> : null}
            </ul>
          </div>
          {resumo.meses.some((m) => m.valor) ? (
            <div className="hn-res-bloco">
              <h3>Próximos três meses</h3>
              <ul className="hn-prog">
                {resumo.meses.map((m) => (
                  <li key={m.mes}><time>{nomeDoMes(m.mes)}</time><span>parcelas e mensalidades</span><b>{reais(m.valor)}</b></li>
                ))}
              </ul>
            </div>
          ) : null}
          {resumo.financeiro.pagasAntes ? (
            <div className="hn-res-bloco">
              <h3>Pago antes do T3jus</h3>
              <p><b style={{ fontWeight: 600 }}>{reais(resumo.financeiro.valorPagoAntes)}</b> em {plural(resumo.financeiro.pagasAntes, "parcela", "parcelas")}.</p>
              <p><small>Fica em cada contrato como informação. Não entra no Caixa nem gera recibo.</small></p>
            </div>
          ) : null}
        </>
      ) : null}
      <div className="im-res-acao">
        <button className="btn btn-pri" type="button" disabled={!nImportar} onClick={() => setConfirmar(true)}>
          <Icone nome="check" className="ico" />
          Importar {plural(nImportar, final ? "linha" : "linha pronta", final ? "linhas" : "linhas prontas")}
        </button>
        <p>
          {final
            ? fora ? `${plural(fora, "linha pulada fica", "linhas puladas ficam")} de fora; no fim você baixa a planilha delas, com o motivo.` : "Todas as linhas vão entrar."
            : `${[c.erro ? `${plural(c.erro, "linha com erro", "linhas com erro")}` : "", c.aviso ? `${plural(c.aviso, "com aviso", "com aviso")}` : ""].filter(Boolean).join(" e ")} ainda pedem você. Se importar agora, elas ficam de fora e vão para a planilha de linhas que não entraram.`}
        </p>
      </div>
    </section>
  );

  return (
    <div className="im">
      <CabFluxo origem={imp.origem} />
      <Passos atual={3} escolhas={escolhas} voltar={voltar} origem={imp.origem} />
      <nav className="folha hn-numeros" aria-label="Resumo da prévia">
        {nums.map((x) => (
          <a key={x.r} href="#t-prev" aria-current={filtro === x.f ? "true" : undefined} onClick={(e) => { e.preventDefault(); setFiltro(x.f); setAberta(null); }}>
            <span className={`disco ${x.dc}`} aria-hidden="true"><span>{x.n}</span></span>
            <span className="r"><b>{x.r}</b>{x.sub}</span>
            <span className="sr">: {x.n}</span>
          </a>
        ))}
      </nav>
      <ForaDoTipo imp={imp} />
      <Grade principal={principal} lateral={lateral} rotulo="O que vai entrar" />
      <JanelaConfirmar aberta={confirmar} imp={imp} resumo={resumo} aoFechar={() => setConfirmar(false)} aoImportar={() => void importar()} />
    </div>
  );
}

/** Os contatos do backup que não viraram clientes (decisão 9 do F3.56). */
function ForaDoTipo({ imp }: { imp: Importacao }) {
  const t = imp.foraTipo;
  if (t && "ARQUIVADOS" in t) return <AvisoArquivados n={t.ARQUIVADOS} />;
  if (imp.oQue === "FINANCEIRO") return <AvisoDespesas n={t && "DESPESAS" in t ? t.DESPESAS : 0} />;
  if (t && "DESPESAS" in t) return null;
  const f = t;
  if (!f || f.PARTE_CONTRARIA + f.FORA === 0) return null;
  const partes = [f.PARTE_CONTRARIA ? plural(f.PARTE_CONTRARIA, "parte contrária", "partes contrárias") : "", f.FORA ? plural(f.FORA, "terceiro", "terceiros") : ""].filter(Boolean).join(" e ");
  return (
    <Aviso tom="info" titulo={f.PARTE_CONTRARIA + f.FORA === 1 ? "1 contato do backup não é cliente e ficou de fora da prévia."
      : `${plural(f.PARTE_CONTRARIA + f.FORA, "", "contatos do backup não são clientes e ficaram de fora da prévia.")}`}>
      São {partes}, pelo tipo de contato que você ligou no passo 2. Eles não entram no cadastro de clientes.
      {f.PARTE_CONTRARIA ? " As partes contrárias entram nos casos, na prévia dos processos." : ""}
    </Aviso>
  );
}

function LinhaDaPrevia({ l, contratos, aberta, ocupado, aoAbrir, aoMudar, linhasDe }: {
  l: LinhaPrevia; contratos: boolean; aberta: "corrigir" | "decidir" | "gera" | null; ocupado: boolean;
  aoAbrir: (m: "corrigir" | "decidir" | "gera" | null) => void;
  aoMudar: (d: { campos?: Partial<Record<CampoImportacao, string>>; decisao?: DecisaoLinha | null }) => Promise<{ erro?: string }>;
  linhasDe: LinhaPrevia[];
}) {
  const ct = l.contrato;
  const contato = l.cliente.contatos[0];
  const doc = l.cliente.documento ? `${l.cliente.tipo === "PJ" ? "CNPJ" : "CPF"} ${formatarDocumento(l.cliente.documento)}` : "";
  const errDoc = l.problemas.find((p) => p.campo === "documento" && p.nivel === "ERRO");
  const nomeMesma = l.mesmaDe ? linhasDe.find((x) => x.numero === l.mesmaDe)?.cliente.nome ?? l.cliente.nome : null;
  const sub = l.mesmaDe ? (
    <>mesmo documento da linha {l.mesmaDe}: um cliente só</>
  ) : (
    <>
      {errDoc ? <>{l.cliente.tipo === "PJ" ? "CNPJ" : "CPF"} <span className="im-errado">{errDoc.valor}</span></> : doc}
      {(errDoc || doc) && (contato?.telefone || contato?.email || contato?.nome) ? " · " : ""}
      {l.cliente.tipo === "PJ" && contato?.nome ? `${contato.nome}${contato.papel ? `, ${contato.papel}` : ""}` : contato?.telefone ? telefoneBr(contato.telefone) : contato?.email ?? ""}
      {!contato?.telefone && !contato?.email && !l.problemas.some((p) => p.codigo === "CONTATO_OBRIGATORIO") ? "" : ""}
    </>
  );

  let gera: ReactNode = "—";
  if (ct?.gera) {
    const g = ct.gera;
    if (ct.tipo === "EXITO") gera = <>Depende do caso<small>a etapa se liga na ficha</small></>;
    else if (!ct.assinatura) gera = "Nada por enquanto";
    else if (ct.tipo === "MENSAL") gera = <><b>Todo mês</b>, {reais(ct.valor ?? 0)}{g.proxima ? <small>a partir de {dataBr(g.proxima)}</small> : null}</>;
    else gera = (
      <>
        <b>{plural(g.parcelas, "parcela", "parcelas")}</b>{g.pagasAntes ? " a vencer" : ""}, {reais(g.valor)}
        {g.vencidas ? <small>{plural(g.vencidas, "já vencida entra", "já vencidas entram")} em atraso</small>
          : g.pagasAntes ? <small>({plural(g.pagasAntes, "paga antes", "pagas antes")})</small>
          : g.parcelas === 1 && g.proxima ? <small>{dataBr(g.proxima)}</small> : null}
      </>
    );
  } else if (ct?.tipo === "EXITO") gera = <>Depende do caso<small>a etapa se liga na ficha</small></>;

  const erros = l.problemas.filter((p) => p.nivel === "ERRO");
  const avisos = l.problemas.filter((p) => p.nivel === "AVISO");
  const principalP: ProblemaLinha | undefined = erros[0] ?? avisos[0];
  const botoes = (...bs: ReactNode[]) => <div className="im-acoes-l">{bs}</div>;
  const btn = (rot: string, icone: NomeIcone, f: () => void, k: string) => (
    <button key={k} className="btn btn-sec" type="button" disabled={ocupado} onClick={f}><Icone nome={icone} className="ico" />{rot}</button>
  );

  let sit: ReactNode;
  let cls = "";
  if (l.situacao === "PULADA") {
    sit = (
      <div className="im-prob">
        <Selo tom="neutro" icone="xis">Pulada</Selo>
        {principalP ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>{SELO_PROBLEMA[principalP.codigo]}</p> : null}
        {botoes(btn("Incluir de novo", "reenviar", () => void aoMudar({ decisao: null }), "inc"))}
      </div>
    );
  } else if (l.situacao === "ERRO" && principalP) {
    cls = "im-l-erro";
    sit = (
      <div className="im-prob">
        <Selo tom="urgente" icone="alerta">{SELO_PROBLEMA[principalP.codigo]}{erros.length > 1 ? ` e mais ${erros.length - 1}` : ""}</Selo>
        {aberta === "corrigir" ? <p>Corrigindo abaixo.</p> : principalP.valor && principalP.campo !== "documento" ? <p>{explicaProblema(principalP, l)}</p> : null}
        {aberta === "corrigir" ? null : botoes(btn("Corrigir", "lapis", () => aoAbrir("corrigir"), "c"), btn("Pular", "xis", () => void aoMudar({ decisao: "PULAR" }), "p"))}
      </div>
    );
  } else if (l.situacao === "AVISO" && principalP) {
    cls = "im-l-aviso";
    const icone: NomeIcone = principalP.codigo === "DUPLICADO" || principalP.codigo === "TELEFONE_DE_OUTRO" ? "pessoas" : "relogio";
    const acoes = (() => {
      if (aberta) return null;
      switch (principalP.codigo) {
        case "DUPLICADO": return botoes(btn("Decidir", "dir", () => aoAbrir("decidir"), "d"));
        case "TELEFONE_DE_OUTRO": return botoes(btn("Deixar assim", "check", () => void aoMudar({ decisao: "SEGUIR" }), "s"), btn("Corrigir", "lapis", () => aoAbrir("corrigir"), "c"));
        case "SEM_ASSINATURA": return botoes(btn("Pôr a data", "lapis", () => aoAbrir("corrigir"), "c"), btn("Deixar assim", "check", () => void aoMudar({ decisao: "SEGUIR" }), "s"));
        default: return botoes(btn("Corrigir", "lapis", () => aoAbrir("corrigir"), "c"), btn("Deixar vazio", "check", () => void aoMudar({ decisao: "SEGUIR" }), "s"));
      }
    })();
    sit = (
      <div className="im-prob">
        <Selo tom="atencao" icone={icone}>{SELO_PROBLEMA[principalP.codigo]}</Selo>
        <p>{aberta ? (aberta === "decidir" ? "Decidindo abaixo." : "Corrigindo abaixo.") : explicaProblema(principalP, l)}</p>
        {acoes}
      </div>
    );
  } else {
    const corrigida = l.corrigidas[0];
    sit = (
      <div className="im-prob">
        <Selo tom="ok" icone="check">Pronta</Selo>
        {l.mesmaDe ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>Entra como mais um contrato de {nomeMesma}.</p> : null}
        {corrigida ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>Corrigida por você: {NOMES_CAMPO_IMPORTACAO[corrigida.campo].toLowerCase()} era “{corrigida.antes ?? "vazio"}”.</p> : null}
        {l.decisao === "JUNTAR" && l.duplicado ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>Junta ao cadastro de {l.duplicado.nome}.</p> : null}
        {l.decisao === "NOVO" ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>Entra como outro cliente.</p> : null}
        {ct?.gera && ct.gera.lista.length > 1 && aberta !== "gera" ? botoes(btn("Ver o que gera", "olho", () => aoAbrir("gera"), "g")) : null}
        {l.decisao && aberta !== "gera" ? botoes(btn("Mudar a decisão", "lapis", () => void aoMudar({ decisao: null }), "m")) : null}
      </div>
    );
  }

  return (
    <li className={cls || undefined}>
      <div className="im-c im-c-n"><span className="im-r">Linha</span><span className="im-nl">{l.numero}</span></div>
      <div className="im-c"><span className="im-r">Cliente</span><span className="im-nome">{l.cliente.nome || "Sem o nome"}</span><small>{sub}</small></div>
      {contratos ? (
        <div className="im-c">
          <span className="im-r">Contrato e o que gera</span>
          {ct ? (
            <>
              <span className="im-ctr">{ct.objeto || "Sem o objeto"}</span>
              <small>{condicaoTexto(ct)}{ct.responsavel ? ` · ${ct.responsavel.nome}` : ""}</small>
              <span className="im-gera"><Icone nome="carteira" className="ico ico-s" /><span>{gera}</span></span>
            </>
          ) : (
            <><span className="im-ctr">Sem contrato</span><small>a linha traz só o cliente</small></>
          )}
        </div>
      ) : (
        <div className="im-c">
          <span className="im-r">Contatos</span>
          <span className="im-ctr">{contato?.telefone ? telefoneBr(contato.telefone) : "Sem telefone"}</span>
          <small>{contato?.email ?? "sem e-mail"}</small>
        </div>
      )}
      <div className="im-c"><span className="im-r">Situação</span>{sit}</div>
      {aberta === "corrigir" ? <Corrigir l={l} ocupado={ocupado} aoFechar={() => aoAbrir(null)} aoMudar={aoMudar} /> : null}
      {aberta === "decidir" && l.duplicado ? <Decidir l={l} ocupado={ocupado} aoFechar={() => aoAbrir(null)} aoMudar={aoMudar} /> : null}
      {aberta === "gera" && ct?.gera ? <OQueGera l={l} aoFechar={() => aoAbrir(null)} /> : null}
    </li>
  );
}

export function Corrigir({ l, ocupado, aoFechar, aoMudar }: {
  l: LinhaPrevia; ocupado: boolean; aoFechar: () => void;
  aoMudar: (d: { campos?: Partial<Record<CampoImportacao, string>>; decisao?: DecisaoLinha | null }) => Promise<{ erro?: string }>;
}) {
  const campos = camposParaCorrigir(l);
  const [valores, setValores] = useState<Partial<Record<CampoImportacao, string>>>(() => Object.fromEntries(campos.map((c) => [c, l.valores[c] ?? ""])));
  const [erro, setErro] = useState("");
  const id = `im-ab-${l.numero}`;
  async function salvarCorrecao() {
    setErro("");
    const r = await aoMudar({ campos: valores, decisao: null });
    if (r.erro) setErro(r.erro);
  }
  const semDoc = campos.includes("documento");
  return (
    <div className="im-aberto" role="group" aria-labelledby={id}>
      <h4 id={id}>Corrigir a linha {l.numero}<small>A correção vale só para esta importação. A sua planilha não muda.</small></h4>
      <div className="im-campos">
        {campos.map((c, i) => {
          const p = l.problemas.find((x) => x.campo === c || (CAMPOS_ERRO_EXTRA[x.codigo] ?? []).includes(c));
          const cid = `im-${c}-${l.numero}`;
          const tipo = c === "email" ? "email" : c === "telefone" ? "tel" : "text";
          const im = c === "documento" || c === "cliente_documento" || c === "parcelas" || c === "pagas" ? "numeric" : c === "telefone" ? "tel" : undefined;
          return (
            <div key={c} className="campo c3">
              <label htmlFor={cid}>{NOMES_CAMPO_IMPORTACAO[c]}</label>
              <input className="entrada" id={cid} type={tipo} inputMode={im} autoFocus={i === 0} value={valores[c] ?? ""}
                aria-invalid={p ? true : undefined} aria-describedby={p ? `${cid}-er` : undefined}
                placeholder={c === "primeiro" || c === "assinatura" || c === "distribuido_em" || c === "lanc_data" ? "10/09/2026" : undefined}
                onChange={(e) => setValores((v) => ({ ...v, [c]: e.target.value }))} />
              {p ? <ErroCampo id={`${cid}-er`}>{explicaProblema(p, l)}</ErroCampo> : null}
            </div>
          );
        })}
      </div>
      {erro ? <Aviso tom="urgencia" titulo="A correção não foi salva.">{erro}</Aviso> : null}
      <div className="im-aberto-pe">
        <span className="im-pe-t">{semDoc ? "Sem CPF, o cliente entra e a ficha mostra que falta para a procuração." : "Se a correção ainda tiver problema, a linha continua marcada."}</span>
        <button className="btn btn-fantasma" type="button" disabled={ocupado} onClick={aoFechar}><Icone nome="xis" className="ico" />Fechar</button>
        <button className="btn btn-fantasma" type="button" disabled={ocupado} onClick={() => void aoMudar({ decisao: "PULAR" })}>Pular esta linha</button>
        <button className="btn btn-pri" type="button" disabled={ocupado} onClick={() => void salvarCorrecao()}><Icone nome="check" className="ico" />Salvar a correção</button>
      </div>
    </div>
  );
}

function Decidir({ l, ocupado, aoFechar, aoMudar }: {
  l: LinhaPrevia; ocupado: boolean; aoFechar: () => void;
  aoMudar: (d: { decisao?: DecisaoLinha | null }) => Promise<{ erro?: string }>;
}) {
  const d = l.duplicado!;
  const [escolha, setEscolha] = useState<DecisaoLinha>("JUNTAR");
  const [erro, setErro] = useState("");
  const id = `im-ab-${l.numero}`;
  const entra = d.comparar.filter((x) => x.resultado === "ENTRA").map((x) => NOMES_CAMPO_IMPORTACAO[x.campo].toLowerCase());
  const valor = (campo: CampoImportacao, v: string) => (campo === "documento" ? formatarDocumento(v) : campo === "telefone" ? telefoneBr(v) : v);
  return (
    <div className="im-aberto" role="group" aria-labelledby={id}>
      <h4 id={id}>Linha {l.numero} e {d.nome}<small>{d.situacao === "ATIVO" ? "Ativo" : "Inativo"}, cliente desde {dataCurta(d.desde)}{d.contratos.length ? `, com ${d.contratos.length === 1 ? "o contrato" : "os contratos"} ${d.contratos.join(", ")}` : ""}</small></h4>
      <table className="comparar im-cmp">
        <caption className="sr">Linha {l.numero} comparada ao cadastro de {d.nome}</caption>
        <colgroup><col style={{ width: "22%" }} /><col style={{ width: "39%" }} /><col style={{ width: "39%" }} /></colgroup>
        <thead><tr><th scope="col">Campo</th><th scope="col">Na planilha (linha {l.numero})</th><th scope="col">Já cadastrado</th></tr></thead>
        <tbody>
          {d.comparar.map((x) => (
            <tr key={x.campo}>
              <th scope="row">{NOMES_CAMPO_IMPORTACAO[x.campo]}</th>
              <td data-r="Na planilha">{x.resultado === "ENTRA" ? <span className="im-entra">{valor(x.campo, x.planilha)}</span> : valor(x.campo, x.planilha)}</td>
              <td data-r="Já cadastrado">
                {x.resultado === "IGUAL" ? <span className="im-igual"><Icone nome="check" className="ico" />igual</span>
                  : x.resultado === "ENTRA" ? <>vazio · <b style={{ fontWeight: 500 }}>entra o da planilha</b></>
                  : <>{valor(x.campo, x.cadastrado ?? "")} <span className="im-igual">fica este</span></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <fieldset className="im-decide">
        <legend>O que fazer com a linha {l.numero}?</legend>
        {([
          ["JUNTAR", `Juntar ao cadastro de ${d.nome} (recomendado)`, `O contrato entra na ficha dele. Da planilha, só entra o que está vazio no cadastro${entra.length ? `: aqui, ${entra.join(", ")}` : ""}. Nada do cadastro é trocado.`],
          ["NOVO", "Criar outro cliente", "Só se não for a mesma pessoa. As duas fichas ficam com o aviso de possível duplicado."],
          ["PULAR", "Pular a linha", "A linha fica de fora e vai para a planilha de linhas que não entraram."],
        ] as [DecisaoLinha, string, string][]).map(([v, t, s]) => (
          <label key={v} className="opcao">
            <input className="marcar" type="radio" name={`im-d${l.numero}`} value={v} checked={escolha === v} onChange={() => setEscolha(v)} />
            <span>{t}<small>{s}</small></span>
          </label>
        ))}
      </fieldset>
      {erro ? <Aviso tom="urgencia" titulo="A decisão não foi salva.">{erro}</Aviso> : null}
      <div className="im-aberto-pe">
        <span className="im-pe-t">A decisão fica registrada na importação.</span>
        <button className="btn btn-fantasma" type="button" disabled={ocupado} onClick={aoFechar}><Icone nome="xis" className="ico" />Fechar</button>
        <button className="btn btn-pri" type="button" disabled={ocupado}
          onClick={() => void aoMudar({ decisao: escolha }).then((r) => r.erro && setErro(r.erro))}>
          <Icone nome="check" className="ico" />Confirmar a decisão
        </button>
      </div>
    </div>
  );
}

function OQueGera({ l, aoFechar }: { l: LinhaPrevia; aoFechar: () => void }) {
  const ct = l.contrato!;
  const g = ct.gera!;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const id = `im-ab-${l.numero}`;
  const n = g.lista.length;
  return (
    <div className="im-aberto" role="group" aria-labelledby={id}>
      <h4 id={id}>O que a linha {l.numero} gera<small>O número do contrato (C-…) sai na importação, na sequência do escritório.</small></h4>
      <dl className="im-dl">
        <div><dt>Objeto</dt><dd>{ct.objeto}</dd></div>
        <div><dt>Responsável</dt><dd>{ct.responsavel?.nome ?? "—"}</dd></div>
        <div><dt>Assinado em</dt><dd>{ct.assinatura ? `${dataBr(ct.assinatura)} · entra ativo` : "sem a data · entra em elaboração"}</dd></div>
        <div><dt>Condição</dt><dd>{condicaoTexto(ct)}</dd></div>
        {ct.primeiro ? <div><dt>1º vencimento</dt><dd>{dataBr(ct.primeiro)}</dd></div> : null}
        <div><dt>Parcelas já pagas</dt><dd>{ct.pagas}</dd></div>
      </dl>
      <ul className="im-gera-l" aria-label="Parcelas do contrato">
        {g.lista.map((p) => (
          <li key={p.n} className={p.pagoAntes ? "im-g-pago" : undefined}>
            <time>{dataBr(p.vencimento)}</time>
            <span>Parcela {p.n} de {n}{p.pagoAntes ? " · paga antes do T3jus" : p.vencimento < hoje ? " · vencida, entra em A receber como atrasada" : ""}</span>
            <span>{p.pagoAntes ? <Selo tom="neutro" icone="check">informação</Selo> : p.vencimento < hoje ? <Selo tom="urgente" icone="alerta">em atraso</Selo> : <Selo tom="em-dia">a vencer</Selo>}</span>
            <b>{reais(p.valor)}</b>
          </li>
        ))}
        <li className="im-g-tot"><time>Total</time><span>soma das {n} parcelas</span><span /><b>{reais(g.lista.reduce((a, p) => a + p.valor, 0))}</b></li>
      </ul>
      {ct.tipo === "PARCELADO" && ct.valor ? (
        <p className="hn-gera"><Icone nome="moeda" className="ico" /><span>{reais(ct.valor)} em {n} dá {resumoParcelas(g.lista.map((p) => p.valor))}: o centavo que sobra vai para as primeiras, e a soma fecha no total.</span></p>
      ) : null}
      <div className="aviso-acoes"><button className="btn btn-sec" type="button" onClick={aoFechar}><Icone nome="xis" className="ico" />Fechar</button></div>
    </div>
  );
}

function JanelaConfirmar({ aberta, imp, resumo, aoFechar, aoImportar }: {
  aberta: boolean; imp: Importacao; resumo: ResumoPrevia; aoFechar: () => void; aoImportar: () => void;
}) {
  const c = resumo.contagens;
  const fora = c.erro + c.aviso + c.puladas;
  const [agora] = useState(() => Date.now());
  const prazo = new Date(agora + 7 * 86_400_000).toISOString();
  return (
    <Janela id="janela-confirmar" aberta={aberta} aoFechar={aoFechar} sobretitulo={TITULO_ORIGEM[imp.origem] ?? "Importar planilha"} titulo={`Importar ${plural(c.prontas, "linha", "linhas")}?`}
      descricao="janela-confirmar-d" aoEnviar={aoImportar}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}><Icone nome="esquerda" className="ico" />Voltar à prévia</button>
          <button className="btn btn-pri" type="submit" data-foco><Icone nome="check" className="ico" />Importar {plural(c.prontas, "linha", "linhas")}</button>
        </>
      }>
      <p id="janela-confirmar-d">{imp.oQue === "CASOS" ? "Os processos" : imp.oQue === "FINANCEIRO" ? "Os lançamentos" : "Da planilha"} {imp.arquivo}, com as correções e decisões que você fez na prévia.</p>
      <ul className="im-desf">
        {imp.oQue === "CASOS" ? (
          <li><Icone nome="balanca" className="ico" /><span><b>{plural((resumo.casos?.novos ?? 0) + (resumo.casos?.juntados ?? 0), "caso", "casos")} no Jurídico:</b> {resumo.casos?.novos ?? 0} {(resumo.casos?.novos ?? 0) === 1 ? "novo, sem contrato" : "novos, sem contrato"}{resumo.casos?.juntados ? ` e ${resumo.casos.juntados} que já existiam ganham o cliente` : ""}. Nenhuma mensagem vai ao cliente.</span></li>
        ) : imp.oQue === "FINANCEIRO" ? (
          <>
            <li><Icone nome="carteira" className="ico" /><span><b>{plural(resumo.financeiroAntigo?.recebidos ?? 0, "recebido", "recebidos")}, {reais(resumo.financeiroAntigo?.valorRecebido ?? 0)}:</b> no histórico de cada ficha, como “pago antes do T3jus”. Fora do Caixa e sem recibo.</span></li>
            <li><Icone nome="pena" className="ico" /><span><b>{plural(resumo.financeiroAntigo?.lembretes ?? 0, "lembrete de contrato", "lembretes de contrato")}</b> pelo que está em aberto ({reais(resumo.financeiroAntigo?.valorEmAberto ?? 0)}). Nada vira cobrança e nenhuma mensagem vai ao cliente.</span></li>
          </>
        ) : null}
        {imp.oQue === "CASOS" || imp.oQue === "FINANCEIRO" ? null : <li><Icone nome="pessoas" className="ico" /><span><b>{plural(resumo.clientes.novos + resumo.clientes.juntados, "cliente", "clientes")}:</b> {resumo.clientes.novos} {resumo.clientes.novos === 1 ? "novo" : "novos"}{resumo.clientes.juntados ? ` e ${resumo.clientes.juntados} juntados a cadastros que já existiam (só os campos vazios)` : ""}.</span></li>}
        {imp.contratos ? (
          <>
            <li><Icone nome="pena" className="ico" /><span><b>{plural(resumo.contratos.ativos + resumo.contratos.elaboracao, "contrato", "contratos")}:</b> {resumo.contratos.ativos} ativos{resumo.contratos.elaboracao ? ` e ${resumo.contratos.elaboracao} em elaboração, que vão ao Financeiro quando a assinatura for registrada` : ""}.</span></li>
            <li><Icone nome="carteira" className="ico" /><span><b>{plural(resumo.financeiro.parcelas, "parcela", "parcelas")} a receber, {reais(resumo.financeiro.valor)}.</b>{resumo.financeiro.vencidas ? ` ${plural(resumo.financeiro.vencidas, "já vencida entra", "já vencidas entram")} em atraso.` : ""}{resumo.financeiro.pagasAntes ? ` O que foi pago antes do T3jus (${reais(resumo.financeiro.valorPagoAntes)}) fica só como informação nos contratos.` : ""}</span></li>
          </>
        ) : null}
        {fora ? <li><Icone nome="xis" className="ico" /><span><b>{plural(fora, "linha fica", "linhas ficam")} de fora.</b> No fim você baixa a planilha delas, com o motivo.</span></li> : null}
      </ul>
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <Lgpd><b>Ou entra tudo ou nada.</b> Se algo falhar no meio, nada fica pela metade. Ao terminar, o arquivo é apagado do servidor.</Lgpd>
        <Lgpd icone="historico">Dá para desfazer até <b>{prazoCurto(prazo)}</b> (7 dias), em Clientes › Importações{imp.oQue === "CASOS" || imp.oQue === "FINANCEIRO" ? ", sem mexer nos clientes" : ""}. A importação fica no histórico com o seu nome e a hora.</Lgpd>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------------- resultado

async function baixarFora(imp: Importacao): Promise<string | null> {
  const r = await chamarPortal<LinhasFora>(`${API}/${imp.id}/fora`);
  if (!r.ok) return textoDoErro(r.erro);
  salvar(nomeArquivoFora(r.dados.arquivo), XLSX, planilhaXlsx(abaFora(r.dados)));
  return null;
}

export function ResultadoImportacao({ id }: { id: string }) {
  const [imp, setImp] = useState<Importacao | "erro" | null>(null);
  const [fora, setFora] = useState<LinhasFora | null>(null);
  const [vez, setVez] = useState(0);
  const [desfazer, setDesfazer] = useState(false);
  const [erroBaixar, setErroBaixar] = useState("");
  useEffect(() => {
    let vivo = true;
    void chamarPortal<Importacao>(`${API}/${encodeURIComponent(id)}`).then((r) => {
      if (!vivo) return;
      if (r.ok && r.dados.situacao === "PREVIA") return irPara(ROTAS_IMPORTACAO.passo(id, r.dados.temPrevia ? "previa" : "colunas"));
      setImp(r.ok ? r.dados : "erro");
      // "Desfazer a importação" da ficha do contrato (F3.84) chega com ?desfazer=1 e abre a janela.
      if (r.ok && r.dados.podeDesfazer && new URLSearchParams(window.location.search).has("desfazer")) setDesfazer(true);
      if (r.ok && r.dados.fora > 0 && r.dados.situacao === "CONCLUIDA") {
        void chamarPortal<LinhasFora>(`${API}/${encodeURIComponent(id)}/fora`).then((f) => vivo && f.ok && setFora(f.dados));
      }
    });
    return () => {
      vivo = false;
    };
  }, [id, vez]);

  return (
    <Pagina trilha={[{ nome: "Importações", href: ROTAS_IMPORTACAO.historico }, { nome: "Importação" }]}>
      {() => {
        if (imp === null) return <Carregando rotulo="Carregando a importação…" linhas={4} />;
        if (imp === "erro") return <ErroAoCarregar oque="a importação" aoTentar={() => setVez((v) => v + 1)} />;
        const r = imp.resumo;
        if (imp.situacao === "CANCELADA" || imp.situacao === "EXPIRADA" || !r) {
          return (
            <section className="folha">
              <Estado icone="historico" moldura titulo="Esta importação não foi feita"
                acoes={<a className="btn btn-pri" href={ROTAS_IMPORTACAO.enviar}><Icone nome="enviar" className="ico" />Importar planilha</a>}>
                A prévia foi cancelada ou passou de 24 horas. Nada entrou no cadastro.
              </Estado>
            </section>
          );
        }
        const quandoFoi = quando(imp.importadoEm ?? imp.criadoEm);
        const novos = r.clientes - r.juntados;
        const casos = imp.oQue === "CASOS";
        const fin = imp.oQue === "FINANCEIRO";
        return (
          <div className="im">
            <Passos atual={5} origem={imp.origem} escolhas={[imp.arquivo, "", `${plural(r.linhas + r.fora, "linha conferida", "linhas conferidas")}`, imp.desfeita ? "desfeita" : `feita ${quandoFoi}`]} />
            <div className="cabeca-ambar campo-ambar cabeca-equipe im-fim">
              <div>
                <p className="sobretitulo">{imp.origem !== "PLANILHA" ? `${NOMES_ORIGEM_IMPORTACAO[imp.origem]} · ` : ""}Importação de {quandoFoi}</p>
                <h1>{imp.desfeita ? "Importação desfeita" : "Importação concluída"}</h1>
                <span className="fio" aria-hidden="true" />
                <div className="im-fim-num">
                  <div>
                    <span className="disco hn-d-vinho" aria-hidden="true"><span>{r.linhas}</span></span>
                    <span><b>{r.linhas === 1 ? "linha entrou" : "linhas entraram"}</b><small>{casos ? `${plural(r.casos ?? 0, "caso novo", "casos novos")} no Jurídico` : fin ? `${plural(r.lembretes ?? 0, "lembrete de contrato", "lembretes de contrato")} nas fichas` : `${plural(r.clientes, "cliente", "clientes")}${imp.contratos ? ` e ${plural(r.contratos, "contrato", "contratos")}` : ""}`}</small></span>
                  </div>
                  <div>
                    <span className="disco" aria-hidden="true"><span>{r.fora}</span></span>
                    <span><b>{r.fora === 1 ? "ficou de fora" : "ficaram de fora"}</b><small>{r.fora ? "com o motivo na planilha abaixo" : "nenhuma"}</small></span>
                  </div>
                </div>
                <p className="sr">{plural(r.linhas, "linha entrou", "linhas entraram")} e {plural(r.fora, "ficou", "ficaram")} de fora.</p>
              </div>
            </div>
            {imp.desfeita ? (
              <Aviso tom="atencao" icone="historico" titulo={`Desfeita em ${quando(imp.desfeita.em)}, por ${imp.desfeita.por.nome}.`}>
                Motivo: “{imp.desfeita.motivo}”. {fin ? "O histórico financeiro e os lembretes saíram das fichas; o lembrete que já tinha virado contrato ficou." : casos ? "Os casos foram para Encerrados, marcados “importação desfeita”, e os casos que já existiam perderam só o cliente ligado." : "Os clientes ficaram inativos, os contratos encerrados e as parcelas canceladas, tudo com o motivo e no histórico."}
              </Aviso>
            ) : null}
            {!imp.desfeita ? <ProcessosEsperam imp={imp} /> : null}
            {!imp.desfeita ? <FinanceiroEspera imp={imp} /> : null}
            <Grade rotulo="Arquivo e desfazer"
              principal={
                <>
                  <Folha id="t-entrou" titulo="O que entrou" sub={imp.desfeita ? "O que a importação criou saiu do uso do dia a dia e ficou no histórico." : casos ? "Tudo já está no Jurídico." : fin ? "Tudo já está nas fichas dos clientes, só como informação." : "Tudo já está no cadastro, nos contratos e no Financeiro."}>
                    {fin ? <EntrouFinanceiro imp={imp} /> : casos ? <EntrouCasos imp={imp} /> : (
                    <ul className="im-entrou">
                      <li>
                        <span className="im-ci"><Icone nome="pessoa-mais" className="ico" /></span>
                        <span><strong>{plural(novos, "cliente novo", "clientes novos")}</strong><small>Na lista, o filtro “Desta importação” mostra só eles. A ficha diz que vieram da planilha.</small></span>
                        <a className="btn btn-sec" href={ROTAS_IMPORTACAO.clientes(imp.id)}>Ver clientes</a>
                      </li>
                      {r.juntados ? (
                        <li>
                          <span className="im-ci"><Icone nome="pessoas" className="ico" /></span>
                          <span><strong>{plural(r.juntados, "cadastro completado", "cadastros completados")}</strong><small>Só os campos vazios receberam o dado da planilha. O que mudou está no histórico de cada ficha.</small></span>
                          <a className="btn btn-sec" href={ROTAS_IMPORTACAO.clientes(imp.id, true)}>Ver {r.juntados === 1 ? "o cadastro" : `os ${r.juntados}`}</a>
                        </li>
                      ) : null}
                      {imp.contratos ? (
                        <>
                          <li>
                            <span className="im-ci"><Icone nome="pena" className="ico" /></span>
                            <span>
                              <strong>{plural(r.contratos, "contrato", "contratos")}</strong>
                              <small>{r.ativos} ativos{r.contratos - r.ativos ? ` e ${r.contratos - r.ativos} em elaboração, à espera da assinatura` : ""}.{r.exitos ? ` Nos ${r.exitos} êxitos, a etapa que gera a cobrança se liga na ficha.` : ""}</small>
                            </span>
                            <a className="btn btn-sec" href={ROTAS_CONTRATOS.contratos}>Ver contratos</a>
                          </li>
                          <li>
                            <span className="im-ci"><Icone nome="carteira" className="ico" /></span>
                            <span>
                              <strong>{plural(r.parcelas, "parcela", "parcelas")} · {reais(r.valor)}</strong>
                              <small>Em A receber.{r.vencidas ? ` ${r.vencidas === 1 ? "A já vencida aparece como atrasada" : `As ${r.vencidas} já vencidas aparecem como atrasadas`}, para a cobrança começar.` : ""}{r.valorPagoAntes ? ` O que foi pago antes do T3jus (${reais(r.valorPagoAntes)}) fica só como informação.` : ""}</small>
                            </span>
                            <a className="btn btn-sec" href={ROTAS_FINANCEIRO.receber}>Ver A receber</a>
                          </li>
                        </>
                      ) : null}
                    </ul>
                    )}
                  </Folha>
                  {r.fora ? (
                    <Folha id="t-fora" titulo="Ficaram de fora" sub={plural(r.fora, "linha", "linhas")}>
                      {fora ? (
                        <ul className="im-fora">
                          {fora.linhas.slice(0, 3).map((l) => (
                            <li key={l.numero}>
                              <b>Linha {l.numero}</b>
                              <span>{(casos ? l.valores.caso_nome ?? l.valores.numero ?? l.valores.cliente : fin ? l.valores.lanc_descricao ?? l.valores.cliente : l.valores.nome) ?? "Sem o nome"}<small>{(l.problemas.filter((p) => p.nivel === "ERRO")[0] ?? l.problemas[0]) ? SELO_PROBLEMA[(l.problemas.filter((p) => p.nivel === "ERRO")[0] ?? l.problemas[0])!.codigo] : "Não entrou"}{l.situacao === "PULADA" ? " · pulada" : ""}</small></span>
                            </li>
                          ))}
                          {fora.linhas.length > 3 ? (
                            <li><b>+ {fora.linhas.length - 3}</b><span>Linhas {fora.linhas.slice(3, 8).map((l) => l.numero).join(", ")}{fora.linhas.length > 8 ? " e outras" : ""}<small>na planilha, com o motivo</small></span></li>
                          ) : null}
                        </ul>
                      ) : null}
                      {imp.desfazerAte && new Date(imp.desfazerAte) > new Date() ? (
                        <div className="hn-folha-acao">
                          <button className="btn btn-sec" type="button" onClick={() => void baixarFora(imp).then((e) => setErroBaixar(e ?? ""))}>
                            <Icone nome="baixar" className="ico" />Baixar {r.fora === 1 ? "a linha" : `as ${r.fora} linhas`}, com o motivo (.xlsx)
                          </button>
                          <p>Corrija na planilha e importe só elas. Este arquivo tem apenas as linhas de fora e fica disponível até {prazoCurto(imp.desfazerAte)}; depois, é apagado.</p>
                          {erroBaixar ? <Aviso tom="urgencia" titulo="Não deu para baixar.">{erroBaixar}</Aviso> : null}
                        </div>
                      ) : (
                        <div className="hn-folha-acao"><p>A planilha das linhas de fora ficou disponível por 7 dias e já foi apagada.</p></div>
                      )}
                    </Folha>
                  ) : null}
                </>
              }
              lateral={
                <>
                  <Folha id="t-arq" titulo="O arquivo foi apagado">
                    <div style={{ padding: "0 24px 20px" }}>
                      <Lgpd><b>{imp.arquivo}</b> foi apagado do servidor às {hora(imp.importadoEm ?? imp.criadoEm)}. Ficou registrado só o nome do arquivo, quem importou e quando.</Lgpd>
                    </div>
                  </Folha>
                  {imp.podeDesfazer && imp.desfazerAte ? (
                    <Folha id="t-desf" titulo="Desfazer esta importação" sub={`Até ${prazoCurto(imp.desfazerAte)}`}>
                      <div className="hn-folha-acao">
                        <p>{fin ? "O histórico financeiro e os lembretes de contrato saem das fichas. Os clientes ficam como estão." : casos ? "Os casos vão para Encerrados, marcados “importação desfeita”, e os que já existiam perdem só o cliente ligado. Os clientes ficam como estão." : "Os clientes ficam inativos, os contratos encerrados e as parcelas canceladas, tudo com o motivo e no histórico."} Nada é apagado em silêncio. O que alguém já mexeu depois fica como está.</p>
                        <button className="btn btn-perigo" type="button" onClick={() => setDesfazer(true)}><Icone nome="historico" className="ico" />Desfazer importação</button>
                      </div>
                    </Folha>
                  ) : null}
                </>
              } />
            <JanelaDesfazer imp={desfazer ? imp : null} aoFechar={() => setDesfazer(false)} aoFeito={() => { setDesfazer(false); setVez((v) => v + 1); }} />
          </div>
        );
      }}
    </Pagina>
  );
}

// ------------------------------------------------------------------------------- histórico e desfazer

export function ImportacoesHistorico() {
  const [lista, setLista] = useState<Importacao[] | "erro" | null>(null);
  const [vez, setVez] = useState(0);
  const [desfazer, setDesfazer] = useState<Importacao | null>(null);
  const [feito, setFeito] = useState("");
  useEffect(() => {
    let vivo = true;
    void chamarPortal<{ importacoes: Importacao[] }>(API).then((r) => vivo && setLista(r.ok ? r.dados.importacoes : "erro"));
    return () => {
      vivo = false;
    };
  }, [vez]);

  return (
    <Pagina trilha={[{ nome: "Importações" }]}>
      {() => (
        <div className="im">
          <div className="cabeca-ambar campo-ambar cabeca-equipe hn-cab-ambar">
            <div>
              <p className="sobretitulo">Clientes</p>
              <h1>Importações</h1>
              <span className="fio" aria-hidden="true" />
              <p className="lede">Cada planilha importada pelo escritório, com quem, quando e o que entrou. Desfazer vale por 7 dias.</p>
            </div>
            <a className="btn btn-escuro" href={ROTAS_IMPORTACAO.enviar} style={{ marginBottom: 6 }}><Icone nome="enviar" className="ico" />Importar dados</a>
          </div>
          {feito ? <Aviso tom="sucesso" titulo="Importação desfeita.">{feito}</Aviso> : null}
          {lista === null ? <Carregando rotulo="Carregando as importações…" linhas={3} /> : lista === "erro" ? <ErroAoCarregar oque="as importações" aoTentar={() => setVez((v) => v + 1)} /> : (
            <section className="folha" aria-labelledby="t-hist" style={{ overflow: "hidden" }}>
              <h2 id="t-hist" className="sr">Importações</h2>
              {lista.length ? (
                <table className="hn-tab im-hist">
                  <caption className="sr">Importações do escritório</caption>
                  <colgroup><col style={{ width: "26%" }} /><col style={{ width: "14%" }} /><col style={{ width: "20%" }} /><col style={{ width: "21%" }} /><col style={{ width: "19%" }} /></colgroup>
                  <thead><tr><th scope="col">Arquivo</th><th scope="col">Origem</th><th scope="col">O que entrou</th><th scope="col">Situação</th><th scope="col">Ações</th></tr></thead>
                  <tbody>
                    {lista.map((i) => <LinhaHistorico key={i.id} i={i} aoDesfazer={() => setDesfazer(i)} />)}
                  </tbody>
                </table>
              ) : (
                <Estado icone="historico" titulo="Nenhuma planilha importada ainda"
                  acoes={<a className="btn btn-pri" href={ROTAS_IMPORTACAO.enviar}><Icone nome="enviar" className="ico" />Importar planilha</a>}>
                  Clientes e contratos que já estão numa planilha entram de uma vez, conferidos numa prévia antes de salvar.
                </Estado>
              )}
              <p className="hn-pe">
                <Icone nome="escudo" className="ico" />
                <span>O arquivo enviado nunca fica guardado. Aqui ficam o nome dele, quem importou, quando e o que entrou. Cada cliente e contrato importado leva isso na própria ficha.</span>
              </p>
            </section>
          )}
          <JanelaDesfazer imp={desfazer} aoFechar={() => setDesfazer(null)}
            aoFeito={(f) => { setDesfazer(null); setFeito(f.lancamentos !== undefined ? `${plural(f.lancamentos, "lançamento saiu", "lançamentos saíram")} das fichas${f.lembretes ? `, com ${plural(f.lembretes, "lembrete de contrato", "lembretes de contrato")}` : ""}. Tudo com o motivo e no histórico.` : f.casos !== undefined ? `${plural(f.casos, "caso foi", "casos foram")} para Encerrados${f.ligacoes ? `, e ${plural(f.ligacoes, "caso que já existia perdeu", "casos que já existiam perderam")} o cliente ligado` : ""}. Tudo com o motivo e no histórico.` : `${plural(f.clientes, "cliente ficou inativo", "clientes ficaram inativos")}${f.contratos ? `, ${plural(f.contratos, "contrato encerrado", "contratos encerrados")}` : ""}. Tudo com o motivo e no histórico.`); setVez((v) => v + 1); }} />
        </div>
      )}
    </Pagina>
  );
}

function LinhaHistorico({ i, aoDesfazer }: { i: Importacao; aoDesfazer: () => void }) {
  const [erro, setErro] = useState("");
  const r = i.resumo;
  const oQue = r && i.oQue === "FINANCEIRO" ? [plural((r.recebidos ?? 0) + (r.emAberto ?? 0), "lançamento", "lançamentos"), r.lembretes ? plural(r.lembretes, "lembrete", "lembretes") : ""].filter(Boolean).join(", ")
    : r && i.oQue === "CASOS" ? [plural(r.casos ?? 0, "caso", "casos"), r.juntadosCasos ? `${r.juntadosCasos} ${r.juntadosCasos === 1 ? "juntado" : "juntados"}` : ""].filter(Boolean).join(", ")
    : r ? [plural(r.clientes, "cliente", "clientes"), i.contratos ? plural(r.contratos, "contrato", "contratos") : "", i.contratos && r.parcelas ? plural(r.parcelas, "parcela", "parcelas") : ""].filter(Boolean).join(", ") : "—";
  const prazoAberto = !!i.desfazerAte && new Date(i.desfazerAte) > new Date();
  return (
    <tr className={i.desfeita ? "im-desfeita" : undefined}>
      <td>
        <div className="esc"><div><b><a href={ROTAS_IMPORTACAO.resultado(i.id)}>{i.arquivo}</a></b><small>{quando(i.importadoEm ?? i.criadoEm)} · {i.por.nome}</small></div></div>
      </td>
      <td data-r="Origem"><SeloOrigem origem={i.origem} leve /></td>
      <td data-r="O que entrou">
        <div>{oQue}<small>{i.desfeita ? (i.oQue === "FINANCEIRO" ? "saíram das fichas ao desfazer" : i.oQue === "CASOS" ? "todos encerrados ao desfazer" : "todos inativados ao desfazer") : i.fora ? `${plural(i.fora, "linha", "linhas")} de fora` : "nenhuma linha de fora"}</small></div>
      </td>
      <td data-r="Situação">
        {i.desfeita ? (
          <div className="im-sit"><Selo tom="neutro" icone="historico">Desfeita</Selo><small>{quando(i.desfeita.em)}, por {i.desfeita.por.nome}: “{i.desfeita.motivo}”</small></div>
        ) : (
          <div className="im-sit"><Selo tom="ok" icone="check">Concluída</Selo><small>{prazoAberto ? `desfazer até ${prazoCurto(i.desfazerAte!)}` : `o prazo de desfazer acabou em ${i.desfazerAte ? prazoCurto(i.desfazerAte) : "—"}`}</small></div>
        )}
      </td>
      <td data-r="Ações">
        {!i.desfeita && prazoAberto && (i.fora || i.podeDesfazer) ? (
          <div className="im-acoes-l">
            {i.fora ? <button className="btn btn-sec" type="button" onClick={() => void baixarFora(i).then((e) => setErro(e ?? ""))}><Icone nome="baixar" className="ico" />Linhas de fora</button> : null}
            {i.podeDesfazer ? <button className="btn btn-perigo" type="button" onClick={aoDesfazer}><Icone nome="historico" className="ico" />Desfazer</button> : null}
            {erro ? <small role="alert">{erro}</small> : null}
          </div>
        ) : <span className="hn-sem">—</span>}
      </td>
    </tr>
  );
}

function JanelaDesfazer({ imp, aoFechar, aoFeito }: { imp: Importacao | null; aoFechar: () => void; aoFeito: (f: PlanoDesfazer) => void }) {
  const [plano, setPlano] = useState<PlanoDesfazer | "erro" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const id = imp?.id;
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    void Promise.resolve().then(() => {
      if (!vivo) return;
      setPlano(null);
      setMotivo("");
      setErro("");
      setErroMotivo("");
    });
    void chamarPortal<PlanoDesfazer>(`${API}/${id}/desfazer`).then((r) => vivo && setPlano(r.ok ? r.dados : "erro"));
    return () => {
      vivo = false;
    };
  }, [id]);

  async function enviar() {
    if (!imp) return;
    setErro("");
    if (motivo.trim().length < 3) return setErroMotivo("Escreva o motivo, com pelo menos 3 letras. Ele fica no histórico e em cada ficha.");
    setErroMotivo("");
    setEnviando(true);
    const r = await chamarPortal<Importacao & { feito: PlanoDesfazer }>(`${API}/${imp.id}/desfazer`, { corpo: { motivo: motivo.trim() } });
    setEnviando(false);
    if (!r.ok) return setErro(textoDoErro(r.erro));
    aoFeito(r.dados.feito);
  }

  const p = plano && plano !== "erro" ? plano : null;
  const quandoFoi = imp ? quando(imp.importadoEm ?? imp.criadoEm) : "";
  return (
    <Janela id="janela-desfazer" aberta={!!imp} aoFechar={aoFechar} alerta sobretitulo={`Importação de ${quandoFoi}`} titulo="Desfazer a importação?"
      descricao="janela-desfazer-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
          <button className="btn btn-perigo" type="submit" disabled={enviando || !p}><Icone nome="historico" className="ico" />{enviando ? "Desfazendo…" : "Desfazer importação"}</button>
        </>
      }>
      <p id="janela-desfazer-d">
        Nada é apagado em silêncio. O que a importação de {imp?.arquivo} criou sai do uso do dia a dia e fica no histórico. Só quem importou ou o sócio dono pode
        desfazer{imp?.desfazerAte ? `, até ${prazoCurto(imp.desfazerAte)}` : ""}.
      </p>
      {plano === "erro" ? <Aviso tom="urgencia" titulo="Não deu para conferir o que muda.">Feche e tente de novo em instantes.</Aviso> : !p ? (
        <p className="sr" role="status">Conferindo o que muda…</p>
      ) : (
        <>
          <ul className="im-desf">
            {p.lancamentos !== undefined ? (
              <>
                <li><Icone nome="carteira" className="ico" /><span><b>{plural(p.lancamentos, "lançamento sai", "lançamentos saem")} das fichas</b>: o histórico do sistema antigo deixa de aparecer.</span></li>
                {p.lembretes ? <li><Icone nome="pena" className="ico" /><span><b>{plural(p.lembretes, "lembrete de contrato sai", "lembretes de contrato saem")}</b> das fichas.</span></li> : null}
                <li><Icone nome="pessoas" className="ico" /><span><b>Os clientes ficam como estão.</b> Eles vieram de outra importação, que tem o seu próprio desfazer.</span></li>
              </>
            ) : p.casos !== undefined ? (
              <>
                <li><Icone nome="balanca" className="ico" /><span><b>{plural(p.casos, "caso vai", "casos vão")} para Encerrados</b>, marcados “importação desfeita”, sem resultado. Saem da lista do dia a dia.</span></li>
                {p.ligacoes ? <li><Icone nome="trocar" className="ico" /><span><b>{plural(p.ligacoes, "caso que já existia perde", "casos que já existiam perdem")}</b> só o cliente que a importação ligou.</span></li> : null}
                <li><Icone nome="pessoas" className="ico" /><span><b>Os clientes ficam como estão.</b> Eles vieram de outra importação, que tem o seu próprio desfazer.</span></li>
              </>
            ) : <li><Icone nome="pessoas" className="ico" /><span><b>{plural(p.clientes, "cliente novo fica inativo", "clientes novos ficam inativos")}</b>, com o motivo. Saem da lista do dia a dia e continuam no filtro Inativos.</span></li>}
            {p.juntados ? <li><Icone nome="trocar" className="ico" /><span><b>{p.juntados === 1 ? "O cadastro completado volta ao que era:" : `Os ${p.juntados} cadastros completados voltam ao que eram:`}</b> os campos que a planilha preencheu ficam vazios de novo.</span></li> : null}
            {p.contratos ? <li><Icone nome="pena" className="ico" /><span><b>{plural(p.contratos, "contrato fica encerrado", "contratos ficam encerrados")}</b>, e {plural(p.parcelas, "a parcela, cancelada", "as parcelas, canceladas")}, com o motivo.</span></li> : null}
          </ul>
          {p.mexidos.length ? (
            <div style={{ margin: "14px 0" }}>
              <Aviso tom="atencao" titulo={`${plural(p.mexidos.length, "item já foi mexido", "itens já foram mexidos")} depois da importação e ${p.mexidos.length === 1 ? "fica" : "ficam"} como está.`}>
                {p.mexidos.slice(0, 6).map((m) => m.tipo === "LEMBRETE" ? `Lembrete de ${m.nome}, que virou contrato` : `${m.tipo === "CLIENTE" ? "Cliente" : m.tipo === "CASO" ? "Caso" : "Contrato"} ${m.nome}`).join("; ")}{p.mexidos.length > 6 ? ` e mais ${p.mexidos.length - 6}` : ""}. Decida um por um, na ficha de cada um.
              </Aviso>
            </div>
          ) : null}
          <div className="campo c6" style={{ marginTop: 14 }}>
            <div className="campo-linha">
              <label htmlFor="im-motivo">Motivo</label>
              <span className="contador" aria-hidden="true">{motivo.length} de 300</span>
            </div>
            <textarea className="entrada" id="im-motivo" data-foco maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={erroMotivo ? true : undefined} aria-describedby={erroMotivo ? "im-motivo-aj im-motivo-er" : "im-motivo-aj"} />
            <p className="ajuda" id="im-motivo-aj">Fica no histórico e em cada ficha. Ex.: “importei a aba errada”.</p>
            {erroMotivo ? <ErroCampo id="im-motivo-er">{erroMotivo}</ErroCampo> : null}
          </div>
          {erro ? <Aviso tom="urgencia" titulo="A importação não foi desfeita.">{erro}</Aviso> : null}
        </>
      )}
    </Janela>
  );
}

/** Na ficha do cliente e do contrato (decisão 29): "veio da planilha …, importada por … em …". */
export function OrigemPlanilha({ id }: { id: string | null }) {
  const [origem, setOrigem] = useState<{ id: string; arquivo: string; em: string; por: { nome: string } } | null>(null);
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    void chamarPortal<{ origem: typeof origem }>(`${API}/${encodeURIComponent(id)}/origem`).then((r) => vivo && r.ok && setOrigem(r.dados.origem));
    return () => {
      vivo = false;
    };
  }, [id]);
  if (!origem) return null;
  return (
    <>
      <span className="sep" aria-hidden="true" />
      <span>veio da planilha <a href={ROTAS_IMPORTACAO.resultado(origem.id)}>{origem.arquivo}</a>, importada por {origem.por.nome} em {dataCurta(origem.em)}</span>
    </>
  );
}
