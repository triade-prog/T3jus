"use client";
// Importar do Astrea (F3.56), parte 3: o financeiro antigo entra só como informação (pergunta 2 do
// desenho aprovado em docs/design/aprovadas/portal-importacao-sistemas, estado previa-financeiro).
// Como os processos, a aba Lançamentos do backup vira mais uma prévia depois dos clientes. O
// recebido fica na ficha como "pago antes do T3jus", fora do Caixa e sem recibo; o que está em
// aberto não vira cobrança: vira um lembrete na ficha para criar o contrato (FI-01); as despesas do
// escritório ficam de fora. Aqui ficam as peças só do financeiro, e a folha da ficha do cliente.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CAMPOS_LANCAMENTO_IMPORTACAO, dataBr, diaBrasilia, MOTIVOS_DISPENSA, NOMES_CAMPO_IMPORTACAO, reais,
  type CampoImportacao, type ColunaImportacao, type DecisaoLinha, type FinanceiroAnterior, type Importacao, type LinhaPrevia,
  type ParesImportacao, type ProblemaLinha, type ResumoPrevia,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Estado } from "../console/pecas.tsx";
import { Selo } from "./Comercial.tsx";
import { ROTAS_PASSO } from "./fichaLigada.ts";
import { explicaProblema, ROTAS_IMPORTACAO } from "./importacao.ts";
import { chamarPortal, irPara } from "./Moldura.tsx";
import { API, CabFluxo, Corrigir, Folha, Grade, GrupoPares, Lgpd, Passos, plural, SISTEMA_ORIGEM } from "./Importacao.tsx";
import { JanelaDispensar, type AlvoDispensa } from "./LembretesContrato.tsx";
import { quandoDispensado, ROTAS_LEMBRETES } from "./lembretes.ts";

type EscolhasLanc = { lancSituacao: Record<string, string>; lancTipo: Record<string, string> };
const SITUACOES_LANC = [{ v: "PAGO", t: "Pago: fica no histórico da ficha" }, { v: "EM_ABERTO", t: "Em aberto: vira lembrete de contrato" }];
const TIPOS_LANC = [{ v: "RECEITA", t: "Receita: entra como informação" }, { v: "DESPESA", t: "Despesa do escritório: fica de fora" }];
type ObrigatorioLanc = "cliente" | "lanc_valor" | "lanc_situacao";
const NOMES_OBRIGATORIO_LANC: Record<ObrigatorioLanc, string> = { cliente: "Cliente (nome ou CPF)", lanc_valor: "Valor", lanc_situacao: "Pago ou em aberto" };

/** O selo de cada problema da linha do lançamento (os textos do financeiro, não os do contrato). */
const SELO_LANC: Partial<Record<string, string>> = {
  VALOR_FALTA: "Sem o valor", VALOR_INVALIDO: "Valor ilegível", CAMPO_INVALIDO: "Data que não dá para ler",
  CLIENTE_FALTA: "Sem o cliente", CLIENTE_NAO_ENCONTRADO: "Sem cliente", CLIENTE_AMBIGUO: "Dois clientes com o nome",
};

// ------------------------------------------------------------------------------- passo 2: as colunas dos lançamentos

export function PassoColunasFinanceiro({ imp }: { imp: Importacao }) {
  const sistema = SISTEMA_ORIGEM[imp.origem];
  const colunas: ColunaImportacao[] = imp.colunas ?? [];
  const [ligacao, setLigacao] = useState<Record<string, CampoImportacao | "">>(() => {
    const r: Record<string, CampoImportacao | ""> = {};
    for (const c of colunas) r[String(c.indice)] = (imp.ligacao[String(c.indice)] as CampoImportacao | undefined) ?? "";
    return r;
  });
  const [pares, setPares] = useState<ParesImportacao | null>(null);
  const [escolhas, setEscolhas] = useState<EscolhasLanc>({ lancSituacao: { ...(imp.pares.lancSituacao ?? {}) }, lancTipo: { ...(imp.pares.lancTipo ?? {}) } });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ campos: ObrigatorioLanc[]; texto?: string } | null>(null);
  const [versao, setVersao] = useState(imp.versao);
  const topo = useRef<HTMLDivElement>(null);

  const chave = JSON.stringify(ligacao);
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => {
      const lig = Object.fromEntries(Object.entries(ligacao).filter(([, v]) => v));
      void chamarPortal<ParesImportacao>(`${API}/${imp.id}/pares`, { corpo: { aba: imp.aba, ligacao: lig } }).then((r) => {
        if (!vivo || !r.ok) return;
        const d = r.dados;
        setPares(d);
        setEscolhas((e) => {
          const n: EscolhasLanc = { lancSituacao: { ...e.lancSituacao }, lancTipo: { ...e.lancTipo } };
          for (const g of ["lancSituacao", "lancTipo"] as const) for (const p of d[g] ?? []) if (n[g][p.chave] === undefined) n[g][p.chave] = p.sugestao ?? "";
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

  function ligar(indice: number, campo: CampoImportacao | "") {
    setLigacao((l) => {
      const n = { ...l };
      if (campo) for (const k of Object.keys(n)) if (n[k] === campo) n[k] = "";
      n[String(indice)] = campo;
      return n;
    });
  }

  const ligados = new Set(Object.values(ligacao).filter(Boolean));
  const falta: ObrigatorioLanc[] = [
    ...(ligados.has("cliente") || ligados.has("cliente_documento") ? [] : (["cliente"] as const)),
    ...(ligados.has("lanc_valor") ? [] : (["lanc_valor"] as const)),
    ...(ligados.has("lanc_situacao") ? [] : (["lanc_situacao"] as const)),
  ];
  const despesas = pares?.lancTipo
    ? pares.lancTipo.filter((p) => (escolhas.lancTipo[p.chave] || p.sugestao) === "DESPESA").reduce((a, p) => a + p.n, 0) : 0;

  async function verPrevia() {
    setErro(null);
    if (falta.length) {
      setErro({ campos: falta });
      topo.current?.scrollIntoView({ block: "start" });
      return;
    }
    setEnviando(true);
    const lig = Object.fromEntries(Object.entries(ligacao).filter(([, v]) => v));
    const r = await chamarPortal<ResumoPrevia & { versao: number }>(`${API}/${imp.id}/colunas`, {
      metodo: "PATCH", corpo: { versao, aba: imp.aba, ligacao: lig, pares: escolhas },
    });
    if (r.ok) return irPara(ROTAS_IMPORTACAO.passo(imp.id, "previa"));
    setEnviando(false);
    const campos = Array.isArray(r.erro.detalhes?.campos) ? (r.erro.detalhes.campos as ObrigatorioLanc[]) : [];
    if (r.status === 409) {
      const a = await chamarPortal<Importacao>(`${API}/${imp.id}`);
      if (a.ok) setVersao(a.dados.versao);
    }
    setErro({ campos, texto: campos.length ? undefined : textoDoErro(r.erro) });
    topo.current?.scrollIntoView({ block: "start" });
  }

  const ligadasPeloModelo = colunas.filter((c) => ligacao[String(c.indice)] && ligacao[String(c.indice)] === c.modelo).length;
  const ligadas = colunas.filter((c) => ligacao[String(c.indice)]).length;
  const nomeColuna = (campo: CampoImportacao) => {
    const k = Object.entries(ligacao).find(([, v]) => v === campo)?.[0];
    return colunas.find((x) => String(x.indice) === k)?.nome ?? NOMES_CAMPO_IMPORTACAO[campo];
  };
  const linhasAba = imp.abas?.find((a) => a.indice === imp.aba)?.linhas ?? imp.linhasLidas ?? 0;

  const tabela = (
    <table className="hn-tab im-map" data-cartoes="520">
      <caption className="sr">Colunas dos lançamentos</caption>
      <colgroup><col style={{ width: "18%" }} /><col style={{ width: "26%" }} /><col style={{ width: "38%" }} /><col style={{ width: "18%" }} /></colgroup>
      <thead><tr><th scope="col">Coluna</th><th scope="col">Primeiro valor</th><th scope="col">Vai para</th><th scope="col">Como foi ligada</th></tr></thead>
      <tbody>
        {colunas.map((c) => {
          const v = ligacao[String(c.indice)] ?? "";
          const sel = `im-c-${c.letra}`;
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
                    {CAMPOS_LANCAMENTO_IMPORTACAO.map((o) => <option key={o} value={o}>{NOMES_CAMPO_IMPORTACAO[o]}</option>)}
                  </select>
                </div>
              </td>
              <td data-r="Como foi ligada">
                {!v ? (
                  <div className="im-sit"><Selo tom="neutro" icone="xis">Fica de fora</Selo>{c.foraMotivo === "OBSERVACAO" ? <small>Observação livre não entra: pode trazer dado que a ficha não pede (LGPD).</small> : null}</div>
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

  const temPares = pares && ((pares.lancSituacao ?? []).length || (pares.lancTipo ?? []).length);
  const blocoPares = temPares ? (
    <Folha id="t-pares" titulo="Valores que viram itens do T3jus" sub="Cada valor diferente da aba Lançamentos, com quantos lançamentos o usam. Ligue uma vez; vale para todos.">
      <div style={{ paddingBottom: 12 }}>
        {(pares.lancSituacao ?? []).length ? (
          <GrupoPares titulo={`Coluna “${nomeColuna("lanc_situacao")}”`} itens={pares.lancSituacao ?? []} escolhido={escolhas.lancSituacao} prefixo="s"
            opcoes={SITUACOES_LANC} vazio="Em aberto: vira lembrete de contrato"
            rotuloDe={(p) => (p.chave === "" ? "Sem a situação" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, lancSituacao: { ...e.lancSituacao, [k]: v } }))} />
        ) : null}
        {(pares.lancTipo ?? []).length ? (
          <GrupoPares titulo={`Coluna “${nomeColuna("lanc_tipo")}”`} itens={pares.lancTipo ?? []} escolhido={escolhas.lancTipo} prefixo="t"
            opcoes={TIPOS_LANC} vazio="Receita: entra como informação"
            ajuda={(p) => ((escolhas.lancTipo[p.chave] || p.sugestao) === "DESPESA" ? "Aparecem na prévia e ficam de fora: o Caixa começa no T3jus." : "")}
            rotuloDe={(p) => (p.chave === "" ? "Sem o tipo" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, lancTipo: { ...e.lancTipo, [k]: v } }))} />
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
              {erro.campos.map((c) => <li key={c}>{NOMES_OBRIGATORIO_LANC[c] ?? c}</li>)}
            </ul>
          } />
      ) : (
        <Aviso tom="urgencia" titulo="A prévia não foi feita.">{erro.texto}</Aviso>
      )}
    </div>
  ) : null;

  const voltar = imp.pai ? ROTAS_IMPORTACAO.resultado(imp.pai) : ROTAS_IMPORTACAO.astrea;
  const principal = (
    <>
      <Folha id="t-col" titulo="Ligue as colunas aos campos do lançamento" sub={`${imp.arquivo} · ${plural(linhasAba, "lançamento", "lançamentos")} · ${plural(colunas.length, "coluna", "colunas")}`}
        estilo={{ overflow: "hidden" }}>
        <div ref={topo} className="im-aba">
          <p>
            Ligamos {plural(ligadasPeloModelo, "coluna", "colunas")} da aba Lançamentos pelo modelo do {sistema}{ligadas > ligadasPeloModelo ? `; mais ${ligadas - ligadasPeloModelo} pelo nome ou por você` : ""}.
            Cada lançamento se liga a um cliente já cadastrado pelo CPF, CNPJ ou nome e, se tiver o número do processo, ao caso. Confira e ajuste o que precisar.
          </p>
        </div>
        {aviso}
        <p className="im-grupo-t"><Icone nome="carteira" className="ico" />Lançamento · {plural(colunas.length, "coluna", "colunas")}</p>
        {tabela}
        <div className="im-pe">
          <span className="im-pe-t">As colunas que ficam de fora não são lidas. Nada entrou nas fichas ainda.</span>
          <a className="btn btn-fantasma" href={voltar}><Icone nome="esquerda" className="ico" />Voltar</a>
          <button className="btn btn-pri" type="button" disabled={enviando} onClick={() => void verPrevia()}>
            <Icone nome="olho" className="ico" />
            {enviando ? "Conferindo os lançamentos…" : "Ver a prévia"}
          </button>
        </div>
      </Folha>
      {blocoPares}
    </>
  );

  const lateral = (
    <>
      <Folha id="t-obr" titulo="O que é obrigatório" sub={falta.length ? `Falta ligar ${falta.length}.` : "Tudo ligado."}>
        <ul className="im-ok">
          {(["cliente", "lanc_valor", "lanc_situacao"] as const).map((o) => falta.includes(o) ? (
            <li key={o} className="im-falta"><Icone nome="alerta" className="ico" /><span><b>{NOMES_OBRIGATORIO_LANC[o]}</b><small>Nenhuma coluna ligada</small></span></li>
          ) : (
            <li key={o}><Icone nome="check" className="ico" /><span>{NOMES_OBRIGATORIO_LANC[o]}<small>{o === "cliente" ? `Pelo ${[ligados.has("cliente") ? "nome" : "", ligados.has("cliente_documento") ? "CPF ou CNPJ" : ""].filter(Boolean).join(" e ")}` : `Coluna “${nomeColuna(o)}”`}</small></span></li>
          ))}
        </ul>
        <p className="hn-pe"><Icone nome="ajuda" className="ico" /><span>Sem a coluna do tipo, todos os lançamentos contam como receita. Sem a descrição, cada um entra como “Lançamento do sistema antigo”.</span></p>
      </Folha>
      <Folha id="t-so-info" titulo="Só como informação">
        <div style={{ padding: "0 24px 20px", display: "grid", gap: 10 }}>
          <p style={{ margin: 0 }}>O que foi recebido fica no histórico da ficha como <b>“pago antes do T3jus”</b>. O que está em aberto <b>não vira cobrança</b>: vira um lembrete na ficha para criar o contrato.</p>
          {despesas ? <p style={{ margin: 0 }}>{plural(despesas, "despesa do escritório aparece", "despesas do escritório aparecem")} na prévia e {despesas === 1 ? "fica" : "ficam"} de fora.</p> : null}
          <Lgpd icone="carteira"><b>Nada entra no Caixa</b> nem em A receber, e nenhum recibo é gerado. Assim o contador não recebe pagamento repetido.</Lgpd>
        </div>
      </Folha>
    </>
  );

  return (
    <div className="im">
      <CabFluxo origem={imp.origem} titulo={`Importar o financeiro do ${sistema}`} />
      <Passos atual={2} escolhas={[imp.arquivo]} voltar={[voltar]} origem={imp.origem} />
      <Grade principal={principal} lateral={lateral} rotulo="O que é obrigatório" desce />
    </div>
  );
}

// ------------------------------------------------------------------------------- passo 3: a linha de um lançamento

type MudarLinha = (d: { campos?: Partial<Record<CampoImportacao, string>>; decisao?: DecisaoLinha | null }) => Promise<{ erro?: string }>;
export type AbertaLancamento = "corrigir" | null;

const seloLanc = (p: ProblemaLinha) => SELO_LANC[p.codigo] ?? p.codigo;

export function LinhaDoLancamento({ l, aberta, ocupado, aoAbrir, aoMudar }: {
  l: LinhaPrevia; aberta: AbertaLancamento; ocupado: boolean; aoAbrir: (m: AbertaLancamento) => void; aoMudar: MudarLinha;
}) {
  const x = l.lancamento;
  const erros = l.problemas.filter((p) => p.nivel === "ERRO");
  const avisos = l.problemas.filter((p) => p.nivel === "AVISO");
  const principalP: ProblemaLinha | undefined = erros[0] ?? avisos[0];
  const botoes = (...bs: ReactNode[]) => <div className="im-acoes-l">{bs}</div>;
  const btn = (rot: string, icone: NomeIcone, f: () => void, chave: string) => (
    <button key={chave} className="btn btn-sec" type="button" disabled={ocupado} onClick={f}><Icone nome={icone} className="ico" />{rot}</button>
  );
  const semCliente = l.problemas.some((p) => p.codigo.startsWith("CLIENTE_"));
  const aberto = x?.situacao === "EM_ABERTO";

  let sit: ReactNode;
  let cls = "";
  const despesa = l.situacao === "FORA_REGRA";
  if (despesa) {
    // F3.117 (estado previa-financeiro): a despesa do escritório aparece e nunca entra; não há o que decidir.
    cls = "im-l-pulada";
    sit = (
      <div className="im-prob">
        <Selo tom="neutro" icone="xis">Fica de fora</Selo>
        <p>Despesa do escritório: o Caixa começa no T3jus.</p>
      </div>
    );
  } else if (l.situacao === "PULADA") {
    sit = (
      <div className="im-prob">
        <Selo tom="neutro" icone="xis">Pulada</Selo>
        {principalP ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>{seloLanc(principalP)}</p> : null}
        {botoes(btn("Incluir de novo", "reenviar", () => void aoMudar({ decisao: null }), "inc"))}
      </div>
    );
  } else if (l.situacao === "ERRO" && principalP) {
    cls = "im-l-erro";
    sit = (
      <div className="im-prob">
        <Selo tom={semCliente ? "atencao" : "urgente"} icone={semCliente ? "pessoas" : "alerta"}>{seloLanc(principalP)}{erros.length > 1 ? ` e mais ${erros.length - 1}` : ""}</Selo>
        {aberta === "corrigir" ? <p>Corrigindo abaixo.</p> : <p>{explicaProblema(principalP, l)}</p>}
        {aberta === "corrigir" ? null : botoes(btn(semCliente ? "Escolher o cliente" : "Corrigir", semCliente ? "dir" : "lapis", () => aoAbrir("corrigir"), "c"), btn("Pular", "xis", () => void aoMudar({ decisao: "PULAR" }), "p"))}
      </div>
    );
  } else if (l.situacao === "AVISO" && principalP) {
    cls = "im-l-aviso";
    sit = (
      <div className="im-prob">
        <Selo tom="atencao" icone="relogio">{seloLanc(principalP)}</Selo>
        <p>{aberta === "corrigir" ? "Corrigindo abaixo." : explicaProblema(principalP, l)}</p>
        {aberta ? null : botoes(btn("Corrigir", "lapis", () => aoAbrir("corrigir"), "c"), btn("Deixar vazio", "check", () => void aoMudar({ decisao: "SEGUIR" }), "s"))}
      </div>
    );
  } else if (aberto) {
    cls = "im-l-aviso";
    sit = (
      <div className="im-prob">
        <Selo tom="atencao" icone="relogio">Em aberto</Selo>
        <p>Não vira cobrança. Vira um lembrete na ficha: crie o contrato para cobrar.</p>
        {l.decisao ? botoes(btn("Mudar a decisão", "lapis", () => void aoMudar({ decisao: null }), "m")) : null}
      </div>
    );
  } else {
    sit = (
      <div className="im-prob">
        <Selo tom="neutro" icone="doc">Informação</Selo>
        <p>Fica no histórico da ficha, como “pago antes do T3jus”.</p>
        {l.decisao ? botoes(btn("Mudar a decisão", "lapis", () => void aoMudar({ decisao: null }), "m")) : null}
      </div>
    );
  }

  const quando = x?.data ? `${aberto ? (x.data < hojeIso() ? "venceu em" : "vence em") : despesa ? "pago em" : "recebido em"} ${dataBr(x.data)}` : aberto ? "sem a data" : "sem a data do pagamento";
  return (
    <li className={cls || undefined}>
      <div className="im-c im-c-n"><span className="im-r">Linha</span><span className="im-nl">L{l.numero}</span></div>
      <div className="im-c">
        <span className="im-r">Lançamento</span>
        <span className="im-nome">{x?.descricao || l.valores.lanc_descricao || "Lançamento"}</span>
        <small>{[quando, x?.valor ? reais(x.valor) : l.valores.lanc_valor ? `“${l.valores.lanc_valor}”` : "sem o valor"].join(" · ")}</small>
      </div>
      <div className="im-c">
        <span className="im-r">Cliente e caso</span>
        <span className="im-ctr">{despesa ? (l.cliente.nome || "Sem cliente") : semCliente ? "Cliente não encontrado" : l.cliente.nome || "Sem o cliente"}</span>
        <small>{despesa ? "Despesa do escritório" : semCliente ? l.valores.cliente || l.valores.cliente_documento || "" : x?.caso?.nome ?? (l.valores.numero ? `Processo ${l.valores.numero}, não está no Jurídico` : "Sem caso")}</small>
      </div>
      <div className="im-c"><span className="im-r">Situação</span>{sit}</div>
      {aberta === "corrigir" ? <Corrigir l={l} ocupado={ocupado} aoFechar={() => aoAbrir(null)} aoMudar={aoMudar} /> : null}
    </li>
  );
}

function hojeIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export function SemLinhasFinanceiro({ q }: { q: string }) {
  return <Estado icone="busca" titulo="Nenhum lançamento aqui">{q ? "Nenhum lançamento com esse cliente, caso ou valor." : "Nenhum lançamento nesta situação."}</Estado>;
}

// ------------------------------------------------------------------------------- passo 3: o resumo ao lado

export function ResumoFinanceiro({ resumo, final, despesas }: { resumo: ResumoPrevia; final: boolean; despesas: number }) {
  const f = resumo.financeiroAntigo ?? { recebidos: 0, valorRecebido: 0, emAberto: 0, valorEmAberto: 0, lembretes: 0, clientes: 0 };
  const c = resumo.contagens;
  return (
    <>
      <div className="hn-res-bloco">
        <h3>Histórico financeiro</h3>
        <p className="hn-res-grande">{(f.recebidos + f.emAberto).toLocaleString("pt-BR")}</p>
        <ul>
          <li><b>{f.recebidos.toLocaleString("pt-BR")}</b> {f.recebidos === 1 ? "recebido" : "recebidos"}, {reais(f.valorRecebido)}, só como informação</li>
          <li><b>{f.emAberto.toLocaleString("pt-BR")}</b> em aberto, {reais(f.valorEmAberto)}: {plural(f.lembretes, "vira lembrete", "viram lembretes")} para criar o contrato</li>
          {despesas ? <li><b>{despesas.toLocaleString("pt-BR")}</b> {despesas === 1 ? "despesa do escritório aparece" : "despesas do escritório aparecem"} na prévia e {despesas === 1 ? "fica" : "ficam"} de fora</li> : null}
          <li>de <b>{plural(f.clientes, "cliente", "clientes")}</b> já cadastrados</li>
          {!final && c.aviso ? <li>mais o que você decidir {c.aviso === 1 ? "no" : "nos"} <b>{c.aviso}</b> {c.aviso === 1 ? "aviso" : "avisos"}</li> : null}
        </ul>
      </div>
      <div className="hn-res-bloco">
        <h3>O que não entra</h3>
        <ul>
          <li><b>Nenhum contrato</b> e nenhuma parcela em A receber</li>
          <li><b>Nada no Caixa</b> e nenhum recibo</li>
          <li><b>Nenhuma mensagem</b> ao cliente pelo WhatsApp</li>
        </ul>
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------- o financeiro que espera

/** No resultado dos clientes do backup: "Depois, o financeiro", com mais uma prévia (pergunta 2). */
export function FinanceiroEspera({ imp }: { imp: Importacao }) {
  const f = imp.filhaFinanceiro;
  if (!f) return null;
  const href = f.situacao === "PREVIA" ? ROTAS_IMPORTACAO.passo(f.id, "colunas") : ROTAS_IMPORTACAO.resultado(f.id);
  if (f.situacao === "CANCELADA" || f.situacao === "EXPIRADA") {
    return (
      <Aviso tom="info" icone="carteira" titulo="O financeiro do backup não foi importado.">
        A prévia dele passou de 24 horas ou foi cancelada. Para trazê-lo, envie o backup de novo: os clientes que já entraram são reconhecidos pelo CPF.
      </Aviso>
    );
  }
  if (f.situacao !== "PREVIA") {
    return (
      <Aviso tom="sucesso" icone="carteira" titulo={f.situacao === "DESFEITA" ? "O financeiro deste backup foi importado e depois desfeito." : "O financeiro deste backup já está nas fichas."}
        acoes={<a className="btn btn-sec" href={href}>Ver a importação do financeiro</a>} />
    );
  }
  return (
    <section className="folha" aria-labelledby="t-fin" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span className="im-ci"><Icone nome="carteira" className="ico" /></span>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h2 id="t-fin" style={{ margin: 0, fontSize: 18 }}>Depois, o financeiro</h2>
          <p style={{ margin: "4px 0 0" }}>
            {f.linhas ? `${plural(f.linhas, "lançamento", "lançamentos")} da aba Lançamentos esperam` : "A aba Lançamentos do backup espera"} numa prévia própria. Entram só como informação na ficha
            de cada cliente: o recebido como “pago antes do T3jus” e o que está em aberto como lembrete para criar o contrato. Nada vai para o Caixa. A prévia fica guardada por 24 horas.
          </p>
        </div>
        <a className="btn btn-pri" href={href}><Icone nome="dir" className="ico" />Conferir o financeiro</a>
      </div>
    </section>
  );
}

/** O que entrou, no resultado do financeiro. */
export function EntrouFinanceiro({ imp }: { imp: Importacao }) {
  const r = imp.resumo;
  if (!r) return null;
  return (
    <ul className="im-entrou">
      <li>
        <span className="im-ci"><Icone nome="pena" className="ico" /></span>
        <span><strong>{plural(r.lembretes ?? 0, "lembrete de contrato", "lembretes de contrato")}</strong><small>Clientes com valor em aberto no Astrea, {reais(r.valorEmAberto ?? 0)}. Crie o contrato para cobrar; o lembrete some da ficha quando o contrato é criado.</small></span>
        {r.lembretes && !imp.desfeita ? <a className="btn btn-sec" href={ROTAS_LEMBRETES.lista}>Ver lembretes</a> : null}
      </li>
      <li>
        <span className="im-ci"><Icone nome="carteira" className="ico" /></span>
        <span><strong>{plural(r.recebidos ?? 0, "recebimento de antes", "recebimentos de antes")}</strong><small>{reais(r.valorRecebido ?? 0)} como informação no histórico de cada ficha. Fora do Caixa e sem recibo.</small></span>
      </li>
    </ul>
  );
}

// ------------------------------------------------------------------------------- na ficha do cliente

/** Ficha do cliente: o que veio do sistema antigo. Quem não é do Financeiro nem dos Contratos não vê. */
export function FolhaSistemaAntigo({ cliente, nome = "", podeCriarContrato, podeDispensar = false, veLembretes = false }: {
  cliente: string;
  /** O nome do cliente, para a janela de dispensar. */
  nome?: string;
  podeCriarContrato: boolean;
  /** Quem tem a área Contratos dispensa o lembrete (F3.145, R1). */
  podeDispensar?: boolean;
  /** Quem tem a área Contratos abre a lista dos lembretes ("Ver em Dispensados"). */
  veLembretes?: boolean;
}) {
  const [a, setA] = useState<FinanceiroAnterior | null>(null);
  const [todos, setTodos] = useState(false);
  const [alvo, setAlvo] = useState<AlvoDispensa | null>(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<{ anterior: FinanceiroAnterior | null }>(`/v1/escritorio/clientes/${cliente}/anterior`).then((r) => {
      if (vivo && r.ok) setA(r.dados.anterior);
    });
    return () => {
      vivo = false;
    };
  }, [cliente, vez]);
  if (!a) return null;
  const sistema = SISTEMA_ORIGEM[a.origem] || "sistema antigo";
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const lista = todos ? a.lancamentos : a.lancamentos.slice(0, 5);
  return (
    <section className="folha" aria-labelledby="t-antigo">
      <div className="folha-cab">
        <div>
          <h2 id="t-antigo">Do {sistema}</h2>
          <p className="sub">Só informação: fora do Caixa, de A receber e dos relatórios do contador.{a.importacao ? ` Importado em ${dataBr(diaBrasilia(a.importacao.em))}.` : ""}</p>
        </div>
      </div>
      <div style={{ padding: "0 24px 20px", display: "grid", gap: 12 }}>
        {a.lembretes.map((l) => (
          <Aviso key={l.id} tom="atencao" icone="pena" titulo={`${reais(l.valor)} em aberto no ${sistema}${l.caso ? `, no caso ${l.caso.nome}` : ""}.`}
            acoes={podeCriarContrato || podeDispensar ? (
              <>
                {podeCriarContrato ? <a data-muda className="btn btn-sec" href={ROTAS_PASSO.novoContrato(cliente)}><Icone nome="pena" className="ico" />Criar o contrato</a> : null}
                {podeDispensar ? (
                  <button data-muda className="btn btn-fantasma" type="button"
                    onClick={() => setAlvo({ id: l.id, cliente: nome, caso: l.caso?.nome ?? null, lancamentos: l.lancamentos, valor: l.valor, origem: a.origem })}>
                    <Icone nome="xis" className="ico" />Dispensar
                  </button>
                ) : null}
              </>
            ) : undefined}>
            No T3jus, a cobrança nasce do contrato. Crie o contrato para cobrar; este lembrete some quando ele é criado.{podeDispensar ? " Se o escritório não vai cobrar, dispense com o motivo." : ""}
            {l.contratoAtivo ? ` Já tem o contrato ${l.contratoAtivo.numero}, ativo: se este valor já entra nele, dispense o lembrete.` : ""}
          </Aviso>
        ))}
        {(a.dispensados ?? []).map((x) => (
          <p key={x.id} className="il-disp">
            <Icone nome="historico" className="ico" />
            <span>
              Lembrete de {reais(x.valor)} {quandoDispensado(x.em, x.por, hoje).replace(/^Dispensado/, "dispensado")}: “{MOTIVOS_DISPENSA[x.motivo]}”.{" "}
              {veLembretes ? <a href={ROTAS_LEMBRETES.dispensados}>Ver em Dispensados</a> : null}
            </span>
          </p>
        ))}
        {a.pago ? <p style={{ margin: 0 }}><b>{reais(a.pago)}</b> pagos antes do T3jus. Sem recibo e fora do Caixa.</p> : null}
        <ul className="im-antigo" aria-label={`Lançamentos do ${sistema}`} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {lista.map((x, i) => (
            <li key={i} style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
              <span>{x.descricao}<small style={{ display: "block", color: "var(--texto-2)" }}>{[x.data ? dataBr(x.data) : "sem data", x.caso].filter(Boolean).join(" · ")}</small></span>
              <span style={{ textAlign: "right" }}>{reais(x.valor)}<small style={{ display: "block", color: "var(--texto-2)" }}>{x.situacao === "PAGO" ? "pago antes do T3jus" : "em aberto lá"}</small></span>
            </li>
          ))}
        </ul>
        {a.lancamentos.length > 5 && !todos ? (
          <button className="btn btn-fantasma" type="button" onClick={() => setTodos(true)}><Icone nome="baixo" className="ico" />Ver os {a.lancamentos.length} lançamentos</button>
        ) : null}
        {a.total > a.lancamentos.length && todos ? <p style={{ margin: 0, fontSize: 13, color: "var(--texto-2)" }}>Mostrando os {a.lancamentos.length} mais recentes de {a.total}.</p> : null}
      </div>
      {alvo ? <JanelaDispensar key={alvo.id} id="janela-dispensar-f" alvo={alvo} aoFechar={() => setAlvo(null)}
        aoFeito={() => { setAlvo(null); setVez((v) => v + 1); }} aoAtualizar={() => { setAlvo(null); setVez((v) => v + 1); }} /> : null}
    </section>
  );
}
