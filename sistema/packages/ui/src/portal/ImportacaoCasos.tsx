"use client";
// Importar do Astrea e do ADVBOX (F3.56), parte 2: os processos ativos entram como casos no
// Jurídico (pergunta 1 do desenho aprovado em docs/design/aprovadas/portal-importacao-sistemas,
// estado previa-casos). A Carol escolheu duas etapas: primeiro os clientes, depois os processos,
// cada uma com a sua prévia e o seu desfazer. Aqui ficam as peças só dos processos: as colunas,
// a linha da prévia, o caso aberto, o resumo ao lado e o aviso dos processos que esperam.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AREAS_DIREITO, CAMPOS_CASO_IMPORTACAO, dataBr, formatarDocumento, NOME_RESPONSAVEL_CASO, NOMES_CAMPO_IMPORTACAO, PAPEIS_CASO, reais,
  type ArquivadosImportacao, type CampoImportacao, type ColunaImportacao, type DecisaoLinha, type Importacao, type LinhaPrevia, type ParesImportacao,
  type ProblemaLinha, type ResumoPrevia,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Estado } from "../console/pecas.tsx";
import { Selo } from "./Comercial.tsx";
import { explicaProblema, ROTAS_IMPORTACAO, SELO_PROBLEMA } from "./importacao.ts";
import { ROTAS_JURIDICO } from "./juridico.ts";
import { chamarPortal, irPara } from "./Moldura.tsx";
import { API, CabFluxo, Corrigir, Folha, Grade, GrupoPares, Lgpd, Passos, plural, SISTEMA_ORIGEM } from "./Importacao.tsx";

/** O nome de cada campo do processo na tela (o responsável aqui é o do caso). */
export const nomeCampoCaso = (c: CampoImportacao) => (c === "responsavel" ? NOME_RESPONSAVEL_CASO : NOMES_CAMPO_IMPORTACAO[c]);

type EscolhasCasos = { responsavel: Record<string, string>; area: Record<string, string>; etapa: Record<string, string>; situacaoProcesso: Record<string, string> };
const GRUPOS_CASO = ["responsavel", "area", "etapa", "situacaoProcesso"] as const;
/** A situação do processo; o arquivado entra encerrado se for a escolha (F3.116). */
const situacoesProcesso = (encerrados: boolean) => [
  { v: "ATIVO", t: "Ativo: entra como caso" }, { v: "FORA", t: encerrados ? "Arquivado: entra encerrado" : "Arquivado: não importar" },
];
type ObrigatorioCaso = "cliente" | "responsavel";
const NOMES_OBRIGATORIO_CASO: Record<ObrigatorioCaso, string> = { cliente: "Cliente (nome ou CPF)", responsavel: NOME_RESPONSAVEL_CASO };

/** De onde vêm os processos: o backup do Astrea (depois dos clientes) ou a planilha de processos do ADVBOX. */
function textoDeOnde(imp: Importacao): string {
  return imp.origem === "ASTREA" ? "aba Processos do backup" : "planilha de processos";
}

// ------------------------------------------------------------------------------- passo 2: as colunas dos processos

export function PassoColunasCasos({ imp }: { imp: Importacao }) {
  const sistema = SISTEMA_ORIGEM[imp.origem];
  const colunas: ColunaImportacao[] = imp.colunas ?? [];
  const [ligacao, setLigacao] = useState<Record<string, CampoImportacao | "">>(() => {
    const r: Record<string, CampoImportacao | ""> = {};
    for (const c of colunas) r[String(c.indice)] = (imp.ligacao[String(c.indice)] as CampoImportacao | undefined) ?? "";
    return r;
  });
  const [pares, setPares] = useState<ParesImportacao | null>(null);
  const [escolhas, setEscolhas] = useState<EscolhasCasos>({
    responsavel: { ...(imp.pares.responsavel ?? {}) }, area: { ...(imp.pares.area ?? {}) }, etapa: { ...(imp.pares.etapa ?? {}) },
    situacaoProcesso: { ...(imp.pares.situacaoProcesso ?? {}) },
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ campos: ObrigatorioCaso[]; texto?: string } | null>(null);
  const [versao, setVersao] = useState(imp.versao);
  // F3.116: no ADVBOX a escolha dos arquivados é aqui (estado advbox-valores); no Astrea, veio do passo das abas.
  const [escolhaArq, setEscolhaArq] = useState<ArquivadosImportacao>(imp.arquivados ?? "FORA");
  const encerrados = escolhaArq === "ENCERRADOS";
  const topo = useRef<HTMLDivElement>(null);
  const letras = colunas.map((c) => c.letra);

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
          const n: EscolhasCasos = { responsavel: { ...e.responsavel }, area: { ...e.area }, etapa: { ...e.etapa }, situacaoProcesso: { ...e.situacaoProcesso } };
          for (const g of GRUPOS_CASO) for (const p of d[g] ?? []) if (n[g][p.chave] === undefined) n[g][p.chave] = p.sugestao ?? "";
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
  const temCliente = ligados.has("cliente") || ligados.has("cliente_documento");
  const semResponsavel = pares ? (pares.responsavel ?? []).some((p) => !escolhas.responsavel[p.chave]) : false;
  const falta: ObrigatorioCaso[] = [...(temCliente ? [] : (["cliente"] as const)), ...(semResponsavel ? (["responsavel"] as const) : [])];
  const arquivados = pares?.situacaoProcesso
    ? pares.situacaoProcesso.filter((p) => (escolhas.situacaoProcesso[p.chave] || p.sugestao) === "FORA").reduce((a, p) => a + p.n, 0) : 0;

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
      metodo: "PATCH", corpo: { versao, aba: imp.aba, ligacao: lig, pares: escolhas, ...(imp.origem === "ADVBOX_PLANILHA" ? { arquivados: escolhaArq } : {}) },
    });
    if (r.ok) return irPara(ROTAS_IMPORTACAO.passo(imp.id, "previa"));
    setEnviando(false);
    const campos = Array.isArray(r.erro.detalhes?.campos) ? (r.erro.detalhes.campos as ObrigatorioCaso[]) : [];
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
    return colunas.find((x) => String(x.indice) === k)?.nome ?? nomeCampoCaso(campo);
  };
  const linhasAba = imp.abas?.find((a) => a.indice === imp.aba)?.linhas ?? imp.linhasLidas ?? 0;

  const tabela = (
    <table className="hn-tab im-map">
      <caption className="sr">Colunas dos processos</caption>
      <colgroup><col style={{ width: "22%" }} /><col style={{ width: "20%" }} /><col style={{ width: "38%" }} /><col style={{ width: "20%" }} /></colgroup>
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
                    {CAMPOS_CASO_IMPORTACAO.map((o) => <option key={o} value={o}>{nomeCampoCaso(o)}</option>)}
                  </select>
                </div>
              </td>
              <td data-r="Como foi ligada">
                {!v ? (
                  <div className="im-sit"><Selo tom="neutro" icone="xis">Fica de fora</Selo>{c.foraMotivo === "OBSERVACAO" ? <small>Observação livre não entra: pode trazer dado que o caso não pede (LGPD).</small> : null}</div>
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

  const temPares = pares && ((pares.responsavel ?? []).length || (pares.area ?? []).length || (pares.etapa ?? []).length || (pares.situacaoProcesso ?? []).length);
  const blocoPares = temPares ? (
    <Folha id="t-pares" titulo="Valores que viram itens do T3jus" sub={`Cada valor diferente da ${textoDeOnde(imp)}, com quantos processos o usam. Ligue uma vez; vale para todos.`}>
      <div style={{ paddingBottom: 12 }}>
        {(pares.situacaoProcesso ?? []).length ? (
          <GrupoPares titulo={`Coluna “${nomeColuna("situacao_processo")}”`} itens={pares.situacaoProcesso ?? []} escolhido={escolhas.situacaoProcesso} prefixo="s"
            opcoes={situacoesProcesso(encerrados)} vazio="Ativo: entra como caso"
            ajuda={(p) => ((escolhas.situacaoProcesso[p.chave] || p.sugestao) === "FORA"
              ? (encerrados ? "Entram em Encerrados, sem resultado nem acerto." : "Ficam de fora da prévia. Só os processos ativos entram.") : "")}
            rotuloDe={(p) => (p.chave === "" ? "Sem a situação" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, situacaoProcesso: { ...e.situacaoProcesso, [k]: v } }))} />
        ) : null}
        {(pares.responsavel ?? []).length ? (
          <GrupoPares titulo={ligados.has("responsavel") ? `Coluna “${nomeColuna("responsavel")}”` : NOME_RESPONSAVEL_CASO}
            itens={pares.responsavel} escolhido={escolhas.responsavel} prefixo="r"
            opcoes={pares.equipe.map((p) => ({ v: p.id, t: p.nome }))} vazio="Escolha quem fica"
            ajuda={(p) => (p.chave === "" ? (ligados.has("responsavel") ? "Processos sem o advogado." : "Nenhuma coluna traz o responsável: escolha um para todos.") : p.sugestao ? "" : "Não está na Equipe. Os casos dele ficam com quem você escolher.")}
            rotuloDe={(p) => (p.chave === "" ? "Sem o responsável" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, responsavel: { ...e.responsavel, [k]: v } }))} />
        ) : null}
        {(pares.etapa ?? []).length ? (
          <GrupoPares titulo={`Coluna “${nomeColuna("etapa")}”`} itens={pares.etapa ?? []} escolhido={escolhas.etapa} prefixo="e"
            opcoes={(pares.etapas ?? []).map((x) => ({ v: x.id, t: x.nome }))} vazio="A primeira etapa"
            ajuda={() => "O nome que estava lá fica entre parênteses no caso."}
            rotuloDe={(p) => (p.chave === "" ? "Sem a fase" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, etapa: { ...e.etapa, [k]: v } }))} />
        ) : null}
        {(pares.area ?? []).length ? (
          <GrupoPares titulo={`Coluna “${nomeColuna("area")}”`} itens={pares.area ?? []} escolhido={escolhas.area} prefixo="a"
            opcoes={Object.entries(AREAS_DIREITO).map(([v, t]) => ({ v, t }))} vazio="Outra"
            rotuloDe={(p) => (p.chave === "" ? "Sem a área" : `“${p.valor}”`)}
            aoEscolher={(k, v) => setEscolhas((e) => ({ ...e, area: { ...e.area, [k]: v } }))} />
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
              {erro.campos.map((c) => <li key={c}>{NOMES_OBRIGATORIO_CASO[c] ?? c}</li>)}
            </ul>
          } />
      ) : (
        <Aviso tom="urgencia" titulo="A prévia não foi feita.">{erro.texto}</Aviso>
      )}
    </div>
  ) : null;

  const voltar = imp.pai ? ROTAS_IMPORTACAO.resultado(imp.pai) : ROTAS_IMPORTACAO.advbox;
  const principal = (
    <>
      <Folha id="t-col" titulo="Ligue as colunas aos campos do caso" sub={`${imp.arquivo} · ${plural(linhasAba, "processo", "processos")} · ${plural(colunas.length, "coluna", "colunas")}`}
        estilo={{ overflow: "hidden" }}>
        <div ref={topo} className="im-aba">
          <p>
            Ligamos {plural(ligadasPeloModelo, "coluna", "colunas")} da {textoDeOnde(imp)} pelo modelo do {sistema}{ligadas > ligadasPeloModelo ? `; mais ${ligadas - ligadasPeloModelo} pelo nome ou por você` : ""}.
            Cada processo se liga a um cliente já cadastrado pelo CPF, CNPJ ou nome. Confira e ajuste o que precisar.
          </p>
        </div>
        {aviso}
        <p className="im-grupo-t"><Icone nome="balanca" className="ico" />Processo · {plural(colunas.length, "coluna", "colunas")}</p>
        {tabela}
        <div className="im-pe">
          <span className="im-pe-t">As colunas que ficam de fora não são lidas. Nada entrou no Jurídico ainda.</span>
          <a className="btn btn-fantasma" href={voltar}><Icone nome="esquerda" className="ico" />Voltar</a>
          <button className="btn btn-pri" type="button" disabled={enviando} onClick={() => void verPrevia()}>
            <Icone nome="olho" className="ico" />
            {enviando ? "Conferindo os processos…" : "Ver a prévia"}
          </button>
        </div>
      </Folha>
      {blocoPares}
    </>
  );

  const item = (o: ObrigatorioCaso) => {
    const faltando = falta.includes(o);
    const onde = o === "cliente"
      ? [ligados.has("cliente") ? "o nome" : "", ligados.has("cliente_documento") ? "o CPF ou CNPJ" : ""].filter(Boolean).join(" e ")
      : ligados.has("responsavel") ? `Coluna ${letras[Number(Object.entries(ligacao).find(([, v]) => v === "responsavel")?.[0])] ?? ""}` : "Um padrão para todos";
    return faltando ? (
      <li key={o} className="im-falta"><Icone nome="alerta" className="ico" /><span><b>{NOMES_OBRIGATORIO_CASO[o]}</b><small>{o === "responsavel" ? "Escolha nos valores abaixo" : "Nenhuma coluna ligada"}</small></span></li>
    ) : (
      <li key={o}><Icone nome="check" className="ico" /><span>{NOMES_OBRIGATORIO_CASO[o]}<small>{o === "cliente" ? `Pelo ${onde}` : onde}</small></span></li>
    );
  };
  const escolhaArquivados = imp.origem === "ADVBOX_PLANILHA" && arquivados > 0 ? (
    <Folha id="t-arqv" titulo="Processos arquivados" sub={`${arquivados.toLocaleString("pt-BR")} no ADVBOX`}>
      <fieldset className="is-escolha" style={{ borderTop: 0, paddingTop: 0 }}>
        <legend className="sr">Processos arquivados</legend>
        <div className="im-ops" style={{ gridTemplateColumns: "1fr" }}>
          {([
            ["FORA", "Deixar de fora", "Recomendado. A lista de casos começa só com o que está em andamento."],
            ["ENCERRADOS", "Importar como encerrados", "Entram em Encerrados, sem resultado nem acerto."],
          ] as [ArquivadosImportacao, string, string][]).map(([v, t, sub]) => (
            <label key={v} className="opcao">
              <input className="marcar" type="radio" name="is-arqv" value={v} checked={escolhaArq === v} onChange={() => setEscolhaArq(v)} />
              <span>{t}<small>{sub}</small></span>
            </label>
          ))}
        </div>
      </fieldset>
    </Folha>
  ) : null;
  const lateral = (
    <>
      {escolhaArquivados}
      <Folha id="t-obr" titulo="O que é obrigatório" sub={falta.length ? `Falta ligar ${falta.length}.` : "Tudo ligado."}>
        <ul className="im-ok">{(["cliente", "responsavel"] as const).map(item)}</ul>
        <p className="hn-pe"><Icone nome="ajuda" className="ico" /><span>Sem a coluna do nome do caso, ele vira “Cliente x Parte contrária”. Sem a etapa, o caso entra na primeira etapa do escritório.</span></p>
      </Folha>
      <Folha id="t-so-ativos" titulo={encerrados ? "Os ativos e os arquivados" : "Só os processos ativos"}>
        <div style={{ padding: "0 24px 20px", display: "grid", gap: 10 }}>
          <p style={{ margin: 0 }}>
            {encerrados
              ? (arquivados ? `${plural(arquivados, "processo arquivado entra como encerrado", "processos arquivados entram como encerrados")}, sem resultado nem acerto.` : "Os arquivados entram como encerrados, sem resultado nem acerto.")
              : (arquivados ? `${plural(arquivados, "processo arquivado fica", "processos arquivados ficam")} de fora da prévia.` : "Os arquivados ficam de fora da prévia.")}
            {" "}Todo caso entra <b>sem contrato</b>, até a área Contratos ligar um.
          </p>
          <Lgpd icone="xis"><b>Não vêm do {sistema}:</b> prazos, audiências, tarefas, andamentos e documentos. Cadastre o próximo prazo de cada caso depois de importar.</Lgpd>
        </div>
      </Folha>
    </>
  );

  return (
    <div className="im">
      <CabFluxo origem={imp.origem} titulo={`Importar os processos do ${sistema}`} />
      <Passos atual={2} escolhas={[imp.arquivo]} voltar={[voltar]} origem={imp.origem} />
      <Grade principal={principal} lateral={lateral} rotulo="O que é obrigatório" />
    </div>
  );
}

// ------------------------------------------------------------------------------- passo 3: a linha de um processo

type MudarLinha = (d: { campos?: Partial<Record<CampoImportacao, string>>; decisao?: DecisaoLinha | null }) => Promise<{ erro?: string }>;
export type AbertaCaso = "corrigir" | "decidir" | "gera" | null;

export function LinhaDoCaso({ l, aberta, ocupado, aoAbrir, aoMudar, origem }: {
  l: LinhaPrevia; aberta: AbertaCaso; ocupado: boolean; aoAbrir: (m: AbertaCaso) => void; aoMudar: MudarLinha; origem: string;
}) {
  const k = l.caso;
  const erros = l.problemas.filter((p) => p.nivel === "ERRO");
  const avisos = l.problemas.filter((p) => p.nivel === "AVISO");
  const principalP: ProblemaLinha | undefined = erros[0] ?? avisos[0];
  const botoes = (...bs: ReactNode[]) => <div className="im-acoes-l">{bs}</div>;
  const btn = (rot: string, icone: NomeIcone, f: () => void, chave: string) => (
    <button key={chave} className="btn btn-sec" type="button" disabled={ocupado} onClick={f}><Icone nome={icone} className="ico" />{rot}</button>
  );
  const semCliente = l.problemas.some((p) => p.codigo === "CLIENTE_NAO_ENCONTRADO" || p.codigo === "CLIENTE_FALTA" || p.codigo === "CLIENTE_AMBIGUO");
  const verCaso = k && aberta !== "gera" ? btn("Ver o caso", "olho", () => aoAbrir("gera"), "v") : null;

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
    const rotCorrigir = semCliente ? "Escolher o cliente" : "Corrigir";
    sit = (
      <div className="im-prob">
        <Selo tom={semCliente ? "atencao" : "urgente"} icone={semCliente ? "pessoas" : "alerta"}>{SELO_PROBLEMA[principalP.codigo]}{erros.length > 1 ? ` e mais ${erros.length - 1}` : ""}</Selo>
        {aberta === "corrigir" ? <p>Corrigindo abaixo.</p> : <p>{explicaProblema(principalP, l)}</p>}
        {aberta === "corrigir" ? null : botoes(btn(rotCorrigir, semCliente ? "dir" : "lapis", () => aoAbrir("corrigir"), "c"), btn("Pular", "xis", () => void aoMudar({ decisao: "PULAR" }), "p"))}
      </div>
    );
  } else if (l.situacao === "AVISO" && principalP) {
    cls = "im-l-aviso";
    const mesmoNumero = principalP.codigo === "CAMPO_INVALIDO" && principalP.campo === "situacao_processo";
    const acoes = aberta ? null : principalP.codigo === "CASO_DUPLICADO"
      ? botoes(btn("Decidir", "dir", () => aoAbrir("decidir"), "d"))
      : mesmoNumero
      ? botoes(btn(`Seguir como a linha ${l.mesmaDe ?? ""}`.trim(), "check", () => void aoMudar({ decisao: "SEGUIR" }), "s"), btn("Pular", "xis", () => void aoMudar({ decisao: "PULAR" }), "p"))
      : botoes(btn("Corrigir", "lapis", () => aoAbrir("corrigir"), "c"), btn("Deixar vazio", "check", () => void aoMudar({ decisao: "SEGUIR" }), "s"));
    sit = (
      <div className="im-prob">
        <Selo tom="atencao" icone={principalP.codigo === "CASO_DUPLICADO" ? "pessoas" : "relogio"}>{mesmoNumero ? "Mesmo número, situação diferente" : SELO_PROBLEMA[principalP.codigo]}</Selo>
        <p>{aberta === "decidir" ? "Decidindo abaixo." : aberta === "corrigir" ? "Corrigindo abaixo." : explicaProblema(principalP, l)}</p>
        {acoes}
      </div>
    );
  } else {
    const corrigida = l.corrigidas[0];
    sit = (
      <div className="im-prob">
        <Selo tom="ok" icone="check">Pronta</Selo>
        {corrigida ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>Corrigida por você: {nomeCampoCaso(corrigida.campo).toLowerCase()} era “{corrigida.antes ?? "vazio"}”.</p> : null}
        {l.decisao === "JUNTAR" && l.casoExistente ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>Liga o cliente ao caso {l.casoExistente.nome}, que já existe.</p> : null}
        {l.decisao === "SEGUIR" ? <p style={{ fontSize: 12, color: "var(--texto-2)" }}>{l.mesmaDe ? `Entra no caso da linha ${l.mesmaDe}.` : "O campo que não deu para ler fica vazio."}</p> : null}
        {verCaso || (l.decisao && aberta !== "gera") ? botoes(verCaso, l.decisao && aberta !== "gera" ? btn("Mudar a decisão", "lapis", () => void aoMudar({ decisao: null }), "m") : null) : null}
      </div>
    );
  }

  const numeroErrado = l.problemas.find((p) => p.codigo === "NUMERO_CNJ_INVALIDO");
  const sub = [
    numeroErrado ? null : k?.numero ?? "sem número",
    k ? AREAS_DIREITO[k.area as keyof typeof AREAS_DIREITO] ?? k.area : null,
    k?.encerrado ? "encerrado" : null,
  ].filter(Boolean).join(" · ");
  const doc = l.cliente.documento ? `${l.cliente.documento.length > 11 ? "CNPJ" : "CPF"} ${formatarDocumento(l.cliente.documento)}` : "";

  return (
    <li className={cls || undefined}>
      <div className="im-c im-c-n"><span className="im-r">Linha</span><span className="im-nl">{l.numero}</span></div>
      <div className="im-c">
        <span className="im-r">Caso</span>
        <span className="im-nome">{k?.nome || "Sem o nome"}</span>
        <small>{numeroErrado ? <><span className="im-errado">{numeroErrado.valor}</span>{sub ? ` · ${sub}` : ""}</> : sub}</small>
      </div>
      <div className="im-c">
        <span className="im-r">Cliente e responsável</span>
        <span className="im-ctr">{semCliente ? "Cliente não encontrado" : l.cliente.nome || "Sem o cliente"}</span>
        <small>{[semCliente ? (l.valores.cliente || doc) : doc, k?.responsavel?.nome, k?.etapa?.nome].filter(Boolean).join(" · ")}</small>
      </div>
      <div className="im-c"><span className="im-r">Situação</span>{sit}</div>
      {aberta === "corrigir" ? <Corrigir l={l} ocupado={ocupado} aoFechar={() => aoAbrir(null)} aoMudar={aoMudar} /> : null}
      {aberta === "decidir" && l.casoExistente ? <DecidirCaso l={l} ocupado={ocupado} aoFechar={() => aoAbrir(null)} aoMudar={aoMudar} /> : null}
      {aberta === "gera" && k ? <CasoAberto l={l} origem={origem} aoFechar={() => aoAbrir(null)} aoPular={() => void aoMudar({ decisao: "PULAR" })} ocupado={ocupado} /> : null}
    </li>
  );
}

/** O caso que vai entrar no Jurídico, como no desenho (estado previa-casos). */
function CasoAberto({ l, origem, aoFechar, aoPular, ocupado }: { l: LinhaPrevia; origem: string; aoFechar: () => void; aoPular: () => void; ocupado: boolean }) {
  const k = l.caso!;
  const id = `im-ab-${l.numero}`;
  const papel = PAPEIS_CASO[k.papel] ?? k.papel;
  return (
    <div className="im-aberto" role="group" aria-labelledby={id}>
      <h4 id={id}>O caso que vai entrar no Jurídico<small>Linha {l.numero}. Nada foi salvo.</small></h4>
      <dl className="im-dl">
        <div><dt>Nome do caso</dt><dd>{k.nome}</dd></div>
        <div><dt>Número do processo</dt><dd>{k.numero ?? "sem número"}</dd></div>
        <div><dt>Área</dt><dd>{AREAS_DIREITO[k.area as keyof typeof AREAS_DIREITO] ?? k.area}</dd></div>
        <div><dt>Tribunal e vara</dt><dd>{[k.tribunal, k.vara].filter(Boolean).join(" · ") || "—"}</dd></div>
        <div><dt>Etapa</dt><dd>{k.etapa?.nome ?? "—"}{k.etapaAntiga ? ` (“${k.etapaAntiga}” no ${origem})` : ""}</dd></div>
        <div><dt>Responsável</dt><dd>{k.responsavel?.nome ?? "—"}</dd></div>
        <div><dt>Cliente e papel</dt><dd>{l.cliente.nome}, {papel.toLowerCase()}</dd></div>
        <div><dt>Parte contrária</dt><dd>{k.parteContraria ?? "—"}</dd></div>
        <div><dt>Valor da causa</dt><dd>{k.valorCausa !== null ? reais(k.valorCausa) : "—"}</dd></div>
        {k.distribuidoEm ? <div><dt>Distribuído em</dt><dd>{dataBr(k.distribuidoEm)}</dd></div> : null}
      </dl>
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <Aviso tom="atencao" icone="relogio" titulo="Entra sem contrato.">Como no Jurídico, o caso fica marcado “sem contrato” até a área Contratos ligar um.</Aviso>
        <Lgpd icone="xis"><b>Não vêm do {origem}:</b> prazos, audiências, tarefas, andamentos e documentos. Cadastre o próximo prazo no caso depois de importar. A importação não manda mensagem ao cliente.</Lgpd>
      </div>
      <div className="im-aberto-pe">
        <span className="im-pe-t">O caso só entra quando você importar.</span>
        <button className="btn btn-fantasma" type="button" disabled={ocupado} onClick={aoPular}>Pular esta linha</button>
        <button className="btn btn-pri" type="button" onClick={aoFechar}><Icone nome="xis" className="ico" />Fechar</button>
      </div>
    </div>
  );
}

function DecidirCaso({ l, ocupado, aoFechar, aoMudar }: { l: LinhaPrevia; ocupado: boolean; aoFechar: () => void; aoMudar: MudarLinha }) {
  const d = l.casoExistente!;
  const [escolha, setEscolha] = useState<DecisaoLinha>("JUNTAR");
  const [erro, setErro] = useState("");
  const id = `im-ab-${l.numero}`;
  return (
    <div className="im-aberto" role="group" aria-labelledby={id}>
      <h4 id={id}>Linha {l.numero} e o caso {d.nome}<small>{d.numero ?? "sem número"} · {d.situacao === "ENCERRADO" ? "encerrado" : "ativo"}{d.clientes.length ? ` · ${d.clientes.join(", ")}` : ""}</small></h4>
      <fieldset className="im-decide">
        <legend>O que fazer com a linha {l.numero}?</legend>
        {([
          ["JUNTAR", "Juntar ao caso que já existe (recomendado)", d.jaNoCaso
            ? `${l.cliente.nome} já está nesse caso. Nada muda e não se cria outro caso.`
            : `Liga ${l.cliente.nome} ao caso ${d.nome}. Não cria outro caso e não muda o que já está nele.`],
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

// ------------------------------------------------------------------------------- passo 3: o resumo ao lado

export function ResumoCasos({ resumo, final, origem }: { resumo: ResumoPrevia; final: boolean; origem: string }) {
  const k = resumo.casos ?? { novos: 0, juntados: 0, clientes: 0 };
  const c = resumo.contagens;
  return (
    <>
      <div className="hn-res-bloco">
        <h3>Casos no Jurídico</h3>
        <p className="hn-res-grande">{(k.novos + k.juntados).toLocaleString("pt-BR")}</p>
        <ul>
          <li><b>{k.novos}</b> {k.novos === 1 ? "caso novo" : "casos novos"}, todos <b>sem contrato</b>, até a área Contratos ligar um</li>
          {k.encerrados ? <li>dos novos, <b>{k.encerrados}</b> {k.encerrados === 1 ? "entra encerrado" : "entram encerrados"}, sem resultado nem acerto</li> : null}
          {k.juntados ? <li><b>{k.juntados}</b> {k.juntados === 1 ? "já existia e ganha" : "já existiam e ganham"} o cliente</li> : null}
          <li>de <b>{plural(k.clientes, "cliente", "clientes")}</b> já cadastrados</li>
          {!final && c.aviso ? <li>mais o que você decidir {c.aviso === 1 ? "no" : "nos"} <b>{c.aviso}</b> {c.aviso === 1 ? "aviso" : "avisos"}</li> : null}
        </ul>
      </div>
      <div className="hn-res-bloco">
        <h3>O que não entra</h3>
        <ul>
          <li><b>Nenhum contrato</b> e nenhuma parcela em A receber</li>
          <li><b>Prazos, audiências, tarefas e andamentos</b> do {origem}</li>
          <li><b>Nenhuma mensagem</b> ao cliente pelo WhatsApp</li>
        </ul>
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------- os processos que esperam

/** No resultado dos clientes do backup: "Agora os processos", com a segunda prévia (decisão da Carol, 22/11). */
export function ProcessosEsperam({ imp }: { imp: Importacao }) {
  const f = imp.filha;
  if (!f) return null;
  const href = f.situacao === "PREVIA" ? ROTAS_IMPORTACAO.passo(f.id, "colunas") : ROTAS_IMPORTACAO.resultado(f.id);
  if (f.situacao === "CANCELADA" || f.situacao === "EXPIRADA") {
    return (
      <Aviso tom="info" icone="balanca" titulo="Os processos do backup não foram importados.">
        A prévia deles passou de 24 horas ou foi cancelada. Para trazê-los, envie o backup de novo: os clientes que já entraram são reconhecidos pelo CPF.
      </Aviso>
    );
  }
  if (f.situacao !== "PREVIA") {
    return (
      <Aviso tom="sucesso" icone="balanca" titulo={f.situacao === "DESFEITA" ? "Os processos deste backup foram importados e depois desfeitos." : "Os processos deste backup já entraram no Jurídico."}
        acoes={<a className="btn btn-sec" href={href}>Ver a importação dos processos</a>} />
    );
  }
  return (
    <section className="folha" aria-labelledby="t-proc" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span className="im-ci"><Icone nome="balanca" className="ico" /></span>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h2 id="t-proc" style={{ margin: 0, fontSize: 18 }}>Agora os processos</h2>
          <p style={{ margin: "4px 0 0" }}>
            {f.linhas ? `${plural(f.linhas, "processo", "processos")} da aba Processos esperam` : "A aba Processos do backup espera"} numa segunda prévia. Os ativos entram como casos no Jurídico,
            ligados aos clientes que acabaram de entrar, todos sem contrato. A prévia fica guardada por 24 horas.
          </p>
        </div>
        <a className="btn btn-pri" href={href}><Icone nome="dir" className="ico" />Conferir os processos</a>
      </div>
    </section>
  );
}

/** Os processos arquivados que ficaram de fora da prévia (pergunta 1). */
export function AvisoArquivados({ n }: { n: number }) {
  if (!n) return null;
  return (
    <Aviso tom="info" titulo={n === 1 ? "1 processo arquivado ficou de fora da prévia." : `${plural(n, "", "processos arquivados ficaram de fora da prévia.")}`}>
      Só os processos ativos entram como casos, pela situação que você ligou no passo 2.
    </Aviso>
  );
}

/** O que entrou, no resultado dos processos. */
export function EntrouCasos({ imp }: { imp: Importacao }) {
  const r = imp.resumo;
  if (!r) return null;
  const novos = r.casos ?? 0;
  const juntados = r.juntadosCasos ?? 0;
  return (
    <ul className="im-entrou">
      <li>
        <span className="im-ci"><Icone nome="balanca" className="ico" /></span>
        <span><strong>{plural(novos, "caso novo", "casos novos")}</strong><small>No Jurídico, todos sem contrato.{r.encerrados ? ` ${plural(r.encerrados, "entrou encerrado", "entraram encerrados")}, em Encerrados, sem resultado nem acerto.` : ""} A ficha de cada caso diz de onde ele veio. Cadastre o próximo prazo de cada um.</small></span>
        <a className="btn btn-sec" href={ROTAS_JURIDICO.casos}>Ver casos</a>
      </li>
      {juntados ? (
        <li>
          <span className="im-ci"><Icone nome="pessoas" className="ico" /></span>
          <span><strong>{plural(juntados, "caso que já existia ganhou", "casos que já existiam ganharam")} o cliente</strong><small>Nada mais mudou nesses casos.</small></span>
        </li>
      ) : null}
    </ul>
  );
}

export function SemLinhasCasos({ q }: { q: string }) {
  return <Estado icone="busca" titulo="Nenhum processo aqui">{q ? "Nenhum processo com esse nome, número ou cliente." : "Nenhum processo nesta situação."}</Estado>;
}
