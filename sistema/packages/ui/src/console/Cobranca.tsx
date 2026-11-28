"use client";
// Console › Cobrança (CO-06, F1.18): Faturas, Planos e Régua de cobrança, telas aprovadas em
// docs/design/aprovadas/console-cobranca/cobranca.html. Só Administração e Financeiro; quem
// cria, muda e arquiva planos é só a Administração. O banco confere tudo de novo.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { FORMAS_ASSINATURA, mesPorExtenso } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import {
  ABAS_COBRANCA, brl, centavosDe, contarFaturas, dataBr, filtrarFaturas, FILTROS_COBRANCA, reaisDe, rotuloFaixa,
  type AbaCobranca, type FiltroCobranca, type ListaCobranca, type PlanoCb, type PlanosCb,
} from "./cobranca.ts";
import { CARTEIRA, chamarConsole, COBRANCA, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import { hrefAssinatura, TabelaFaturas } from "./PecasCobranca.tsx";
import { FolhaRegraImplantacao } from "./RegraImplantacao.tsx";

const hrefAba = (a: AbaCobranca) => (a === "faturas" ? COBRANCA : `${COBRANCA}/${a}`);

const POR_PAGINA = 12;

function SemPermissao() {
  return (
    <div className="estado estado-erro" role="status">
      <span className="icone-estado">
        <Icone nome="cadeado" className="ico" />
      </span>
      <h1>Esta página é de Administração e Financeiro</h1>
      <p>
        Quem cuida das faturas, dos planos e dos lembretes é a Administração e o Financeiro. Na ficha de cada escritório, a aba Assinatura mostra o plano e a
        situação da cobrança.
      </p>
      <div className="acoes">
        <a className="btn btn-pri" href={CARTEIRA}>
          Ir para a carteira
        </a>
      </div>
      <p className="codigo">Sem acesso: esta página pede a função Administração ou Financeiro.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------- Faturas

function Numeros({ l }: { l: ListaCobranca }) {
  const ids = useId();
  const r = l.resumo;
  const mes = mesPorExtenso(l.hoje, true);
  const abertasMes = l.faturas.filter((f) => f.vencimento.slice(0, 7) === l.hoje.slice(0, 7) && ["A_VENCER", "VENCE_HOJE", "EM_ATRASO"].includes(f.situacao));
  const pagasMes = l.faturas.filter((f) => f.vencimento.slice(0, 7) === l.hoje.slice(0, 7) && f.situacao === "PAGA").length;
  const hoje = abertasMes.filter((f) => f.situacao === "VENCE_HOJE").length;
  const maior = Math.max(1, r.atraso.totalCentavos);
  const cores = ["var(--vinho)", "var(--vinho-2)", "var(--vinho-3)", "var(--vinho-4)"];
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <h2 id={`${ids}-t`} className="sr">
        Resumo da cobrança
      </h2>
      <dl className="cb-numeros" style={{ margin: 0 }}>
        <div>
          <dt>A receber em {mes}</dt>
          <dd className="cb-grande">{brl(r.aReceberMesCentavos)}</dd>
          <dd>
            <small>
              {abertasMes.length === 0
                ? "Nenhuma fatura em aberto no mês"
                : `${abertasMes.length} ${abertasMes.length === 1 ? "fatura que vence" : "faturas que vencem"} em ${mes} ainda em aberto${hoje ? `, ${hoje} vence hoje` : ""}`}
            </small>
          </dd>
        </div>
        <div>
          <dt>Recebido em {mes}</dt>
          <dd className="cb-grande">{brl(r.recebidoMesCentavos)}</dd>
          <dd>
            <small>
              {pagasMes === 0 ? "Nenhuma fatura paga" : `${pagasMes} ${pagasMes === 1 ? "fatura paga" : "faturas pagas"}`}, de {brl(r.venceMesCentavos)} que vencem no
              mês
            </small>
          </dd>
        </div>
        <div>
          <dt>Em atraso</dt>
          <dd className={r.atraso.totalCentavos ? "cb-grande cb-urg" : "cb-grande"}>{brl(r.atraso.totalCentavos)}</dd>
          <dd>
            <small>
              {r.atraso.faturas === 0 ? (
                "Nenhum escritório"
              ) : (
                <>
                  {r.atraso.faturas} {r.atraso.faturas === 1 ? "fatura" : "faturas"} de{" "}
                  <b>
                    {r.atraso.escritorios} {r.atraso.escritorios === 1 ? "escritório" : "escritórios"}
                  </b>
                </>
              )}
            </small>
          </dd>
        </div>
        <div>
          <dt>Atraso por idade</dt>
          <dd>
            {r.atraso.faturas === 0 ? (
              <small>Sem atraso.</small>
            ) : (
              <ul className="cb-idade" aria-label="Valor em atraso por idade">
                {r.atraso.faixas.map((f, i, todas) => (
                  <li key={f.ate ?? "mais"}>
                    <span>{rotuloFaixa(f, i, todas)}</span>
                    <span className="cb-barra" aria-hidden="true">
                      <i style={{ width: `${Math.round((f.totalCentavos * 100) / maior)}%`, "--c": cores[i] } as CSSProperties} />
                    </span>
                    <b>
                      {brl(f.totalCentavos)}
                      <span className="sr">
                        , {f.faturas} {f.faturas === 1 ? "fatura" : "faturas"}
                      </span>
                    </b>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ListaFaturas({ l, inicial }: { l: ListaCobranca; inicial?: string }) {
  const ids = useId();
  // Atalho da carteira ("Ver as faturas em Cobrança"): já abre no filtro de atraso.
  const [situacao, setSituacao] = useState<FiltroCobranca>(() => (FILTROS_COBRANCA.some((x) => x.chave === inicial) ? (inicial as FiltroCobranca) : "TODAS"));
  const [termo, setTermo] = useState("");
  const [escritorio, setEscritorio] = useState("");
  const [mes, setMes] = useState("");
  const [forma, setForma] = useState("");
  const [pagina, setPagina] = useState(1);
  const contagem = useMemo(() => contarFaturas(l.faturas), [l.faturas]);
  const escritorios = useMemo(() => {
    const m = new Map(l.faturas.map((f) => [f.escritorio!.id, f.escritorio!.nome]));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [l.faturas]);
  const meses = useMemo(() => [...new Set(l.faturas.map((f) => f.vencimento.slice(0, 7)))].sort().reverse(), [l.faturas]);
  const visiveis = useMemo(() => filtrarFaturas(l.faturas, { situacao, termo, escritorio, mes, forma }), [l.faturas, situacao, termo, escritorio, mes, forma]);
  const paginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const daPagina = visiveis.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);
  const mais30 = useMemo(() => {
    const m = new Map<string, { nome: string; dias: number }>();
    for (const f of l.faturas) {
      if (f.situacao === "EM_ATRASO" && (f.atrasoDias ?? 0) >= 30) {
        const e = m.get(f.escritorio!.id);
        if (!e || e.dias < (f.atrasoDias ?? 0)) m.set(f.escritorio!.id, { nome: f.escritorio!.nome, dias: f.atrasoDias ?? 0 });
      }
    }
    return [...m.entries()].sort((a, b) => b[1].dias - a[1].dias);
  }, [l.faturas]);
  const ordem = situacao === "EM_ATRASO" ? "da mais antiga para a mais nova" : "das mais urgentes para as pagas";
  const mudar = (f: () => void) => {
    f();
    setPagina(1);
  };

  return (
    <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
      <h2 id={`${ids}-t`} className="sr">
        Faturas
      </h2>
      <div className="ferramentas" style={{ flexWrap: "wrap" }}>
        <div className="campo-busca">
          <label className="sr" htmlFor={`${ids}-busca`}>
            Buscar fatura
          </label>
          <Icone nome="busca" className="ico" />
          <input className="entrada" id={`${ids}-busca`} type="search" placeholder="Escritório ou número da fatura" value={termo}
            onChange={(e) => mudar(() => setTermo(e.target.value))} />
        </div>
        <label className="sr" htmlFor={`${ids}-esc`}>
          Escritório
        </label>
        <select id={`${ids}-esc`} value={escritorio} onChange={(e) => mudar(() => setEscritorio(e.target.value))}>
          <option value="">Todos os escritórios</option>
          {escritorios.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
        <label className="sr" htmlFor={`${ids}-mes`}>
          Vencimento
        </label>
        <select id={`${ids}-mes`} value={mes} onChange={(e) => mudar(() => setMes(e.target.value))}>
          <option value="">Vencimento: todos</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {mesPorExtenso(`${m}-01`).replace(/^./, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <label className="sr" htmlFor={`${ids}-forma`}>
          Forma de pagamento
        </label>
        <select id={`${ids}-forma`} value={forma} onChange={(e) => mudar(() => setForma(e.target.value))}>
          <option value="">Forma: todas</option>
          {Object.entries(FORMAS_ASSINATURA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="chips" role="group" aria-label="Situação" style={{ marginLeft: 0, flexBasis: "100%" }}>
          {FILTROS_COBRANCA.map((x) => (
            <button key={x.chave} type="button" aria-pressed={situacao === x.chave} onClick={() => mudar(() => setSituacao(x.chave))}>
              {x.nome} ({contagem[x.chave]})
            </button>
          ))}
        </div>
      </div>
      {situacao === "EM_ATRASO" && mais30.length ? (
        <p className="fc-nota-lista" style={{ borderTop: 0, paddingTop: 0 }}>
          <Icone nome="alerta" className="ico" />
          <span>
            <b style={{ color: "var(--texto)" }}>
              {mais30.length === 1 ? "1 escritório passou de 30 dias." : `${mais30.length} escritórios passaram de 30 dias.`}
            </b>{" "}
            {mais30.map(([id, e], i) => (
              <span key={id}>
                {i ? "; " : ""}
                <a href={hrefAssinatura(id)} style={{ color: "var(--vinho)", textDecoration: "underline" }}>{e.nome}</a> ({e.dias} dias)
              </span>
            ))}
            . A Administração pode passar o Portal para só consulta, na aba Assinatura. Com o contrato encerrado, a régua para e os lembretes são manuais.
          </span>
        </p>
      ) : null}
      {visiveis.length === 0 ? (
        <div className="vazio">
          <strong>Nenhuma fatura encontrada</strong>
          Tente outro filtro ou volte para todas as faturas.
        </div>
      ) : (
        <TabelaFaturas faturas={daPagina} hoje={l.hoje} legenda={`Faturas, ${ordem}`} />
      )}
      {visiveis.length > 0 ? (
        <div className="rodape-tab">
          <span aria-live="polite">
            Mostrando {daPagina.length} de {visiveis.length} {visiveis.length === 1 ? "fatura" : "faturas"} · {ordem}
          </span>
          {paginas > 1 ? (
            <nav className="pag" aria-label="Páginas">
              {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-current={n === atual ? "page" : undefined} onClick={() => setPagina(n)} aria-label={`Página ${n}`}>
                  {n}
                </button>
              ))}
              <button type="button" aria-label="Próxima página" disabled={atual === paginas} onClick={() => setPagina(atual + 1)}>
                <Icone nome="dir" className="ico" />
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CarregandoFaturas() {
  return (
    <div aria-busy="true">
      <p className="sr" role="status">
        Carregando as faturas…
      </p>
      <div aria-hidden="true" style={{ display: "grid", gap: 24 }}>
        <section className="folha" style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "grid", gap: 10 }}>
              <span className="esqueleto esq-linha" style={{ width: "70%", height: 10 }} />
              <span className="esqueleto esq-linha" style={{ width: "85%", height: 28 }} />
            </div>
          ))}
        </section>
        <Carregando rotulo="" linhas={5} />
      </div>
    </div>
  );
}

function AbaFaturas({ l, erro, aoTentar, situacao }: { l: ListaCobranca | null; erro: ErroApi | null; aoTentar: () => void; situacao?: string }) {
  if (erro) return <ErroAoCarregar oque="as faturas" aoTentar={aoTentar}
    texto="O servidor não respondeu. Nada do que estava guardado se perdeu: faturas, pagamentos e lembretes continuam lá. Tente de novo em instantes." />;
  if (!l) return <CarregandoFaturas />;
  if (l.faturas.length === 0) {
    return (
      <>
        <Numeros l={l} />
        <Estado icone="fatura" titulo="Nenhuma fatura ainda" moldura
          acoes={
            <a className="btn btn-pri" href={hrefAba("planos")}>
              <Icone nome="planos" className="ico" />
              Ver os planos
            </a>
          }>
          As faturas aparecem aqui quando um escritório passa para Ativo e a assinatura dele começa. Antes disso, prepare os planos.
        </Estado>
      </>
    );
  }
  return (
    <>
      <Numeros l={l} />
      <ListaFaturas l={l} inicial={situacao} />
    </>
  );
}

// ---------------------------------------------------------------------------------- Planos

const TONS = ["var(--ambar)", "var(--vinho-2)", "var(--vinho)"];

type JanelaPlano =
  | { tipo: "criar" }
  | { tipo: "editar"; plano: PlanoCb }
  | { tipo: "arquivar"; plano: PlanoCb }
  | { tipo: "desarquivar"; plano: PlanoCb }
  | { tipo: "pessoa" };

function CartaoPlano({ p, tom, pessoaAMais, admin, abrir }: { p: PlanoCb; tom: string; pessoaAMais: number | null; admin: boolean; abrir: (j: JanelaPlano) => void }) {
  const ids = useId();
  const arq = !!p.arquivadoEm;
  const nomes = p.escritorios.map((e) => e.nome);
  const outros = p.assinantes - p.escritorios.length;
  return (
    <article className={arq ? "cb-plano cb-arq" : "cb-plano"} aria-labelledby={`${ids}-t`}>
      <div className="cb-tom" style={{ "--c": tom } as CSSProperties} aria-hidden="true" />
      <div className="cb-p-corpo">
        <h3 id={`${ids}-t`}>{p.nome}</h3>
        <p className="cb-preco">
          {brl(p.precoCentavos)}
          <small>por mês</small>
        </p>
        <ul>
          <li>
            <Icone nome="pessoas" className="ico" />
            <span>Até {p.pessoasIncluidas} {p.pessoasIncluidas === 1 ? "pessoa" : "pessoas"}</span>
          </li>
          <li>
            <Icone nome="check" className="ico" />
            <span>Todas as áreas do Portal</span>
          </li>
          {arq ? (
            <li>
              <Icone nome="arquivar" className="ico" />
              <span>Arquivado em {dataBr(p.arquivadoEm!)}: não aparece para novas assinaturas</span>
            </li>
          ) : pessoaAMais !== null ? (
            <li>
              <Icone nome="pessoa-mais" className="ico" />
              <span>Pessoa a mais: {brl(pessoaAMais)} por mês</span>
            </li>
          ) : null}
        </ul>
      </div>
      <p className="cb-assinam">
        <span className="disco" aria-hidden="true">
          <span>{p.assinantes}</span>
        </span>
        <span>
          <b>
            {p.assinantes === 0 ? "Nenhum escritório assina" : `${p.assinantes} ${p.assinantes === 1 ? "escritório assina" : "escritórios assinam"}`}
          </b>
          {nomes.length ? (
            <>
              <br />
              <span className="cb-peq">
                {nomes.join(" e ")}
                {outros > 0 ? ` e mais ${outros}` : ""}
              </span>
            </>
          ) : null}
        </span>
      </p>
      {admin ? (
        <div className="cb-p-acoes">
          {arq ? (
            <button className="btn btn-sec" type="button" onClick={() => abrir({ tipo: "desarquivar", plano: p })}>
              <Icone nome="reenviar" className="ico" />
              Desarquivar<span className="sr"> o plano {p.nome}</span>
            </button>
          ) : (
            <>
              <button className="btn btn-sec" type="button" onClick={() => abrir({ tipo: "editar", plano: p })}>
                <Icone nome="lapis" className="ico" />
                Editar<span className="sr"> o plano {p.nome}</span>
              </button>
              <button className="btn btn-fantasma" type="button" onClick={() => abrir({ tipo: "arquivar", plano: p })}>
                <Icone nome="arquivar" className="ico" />
                Arquivar<span className="sr"> o plano {p.nome}</span>
              </button>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

/** Erros de campo que voltam do banco (detalhes.campos). */
function camposDoErro(e: ErroApi): string[] {
  const c = e.detalhes?.campos;
  return Array.isArray(c) ? c.map(String) : [];
}

function JanelaDoPlano({ j, pessoaAMais, versaoPessoa, aoFechar, aoSalvar }: {
  j: JanelaPlano;
  pessoaAMais: number;
  versaoPessoa: number;
  aoFechar: () => void;
  aoSalvar: (texto: string) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const plano = j.tipo === "editar" || j.tipo === "arquivar" || j.tipo === "desarquivar" ? j.plano : null;
  const [nome, setNome] = useState(plano?.nome ?? "");
  const [preco, setPreco] = useState(plano ? reaisDe(plano.precoCentavos) : "");
  const [pessoas, setPessoas] = useState(plano ? String(plano.pessoasIncluidas) : "");
  const [valor, setValor] = useState(reaisDe(pessoaAMais));
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro(null);
    const e = new Set<string>();
    let r;
    if (j.tipo === "criar" || j.tipo === "editar") {
      const c = centavosDe(preco);
      const n = /^\d{1,3}$/.test(pessoas.trim()) ? Number(pessoas) : null;
      if (nome.trim().length < 2) e.add("nome");
      if (c === null || c <= 0) e.add("preco");
      if (n === null || n < 1) e.add("pessoas");
      setErros(e);
      if (e.size) return focarPrimeiroErro(corpo.current);
      setEnviando(true);
      const dados = { nome: nome.trim(), precoCentavos: c!, pessoasIncluidas: n! };
      r = j.tipo === "criar"
        ? await chamarConsole("/v1/cobranca/planos", { corpo: dados })
        : await chamarConsole(`/v1/cobranca/planos/${j.plano.id}`, { metodo: "PUT", corpo: { ...dados, versao: j.plano.versao } });
    } else if (j.tipo === "pessoa") {
      const c = centavosDe(valor);
      if (c === null || c < 0) e.add("valor");
      setErros(e);
      if (e.size) return focarPrimeiroErro(corpo.current);
      setEnviando(true);
      r = await chamarConsole("/v1/cobranca/pessoa-a-mais", { metodo: "PUT", corpo: { versao: versaoPessoa, centavos: c! } });
    } else {
      if (!motivo.trim()) e.add("motivo");
      setErros(e);
      if (e.size) return focarPrimeiroErro(corpo.current);
      setEnviando(true);
      r = await chamarConsole(`/v1/cobranca/planos/${j.plano.id}/arquivar`, {
        corpo: { versao: j.plano.versao, arquivar: j.tipo === "arquivar", motivo: motivo.trim() },
      });
    }
    setEnviando(false);
    if (!r.ok) {
      const campos = camposDoErro(r.erro);
      if (campos.length) {
        setErros(new Set(campos.map((x) => (x === "pessoaAMais" ? "valor" : x))));
        focarPrimeiroErro(corpo.current);
      }
      return setErro(r.erro);
    }
    aoSalvar(
      j.tipo === "criar" ? `Plano ${nome.trim()} criado.`
        : j.tipo === "editar" ? `Plano ${nome.trim()} salvo.`
          : j.tipo === "pessoa" ? "Valor da pessoa a mais salvo."
            : j.tipo === "arquivar" ? `Plano ${j.plano.nome} arquivado. Quem assina continua nele.` : `Plano ${j.plano.nome} desarquivado.`,
    );
  }

  const titulo = j.tipo === "criar" ? "Criar plano" : j.tipo === "editar" ? `Editar o plano ${j.plano.nome}` : j.tipo === "pessoa" ? "Pessoa a mais"
    : j.tipo === "arquivar" ? `Arquivar o plano ${j.plano.nome}?` : `Desarquivar o plano ${j.plano.nome}?`;
  const desc = j.tipo === "criar" ? "O plano novo aparece para novas assinaturas assim que for salvo."
    : j.tipo === "editar" ? "O nome muda para todos. O preço muda só para quem assinar daqui em diante."
      : j.tipo === "pessoa" ? "Vale para todos os planos, para cada pessoa acima do que o plano inclui, a partir da próxima fatura emitida."
        : j.tipo === "arquivar" ? `O plano sai da lista de novas assinaturas. Nada muda para ${j.plano.assinantes === 1 ? "o escritório que assina" : `os ${j.plano.assinantes} escritórios que assinam`}: continuam nele, pelo mesmo preço.`
          : "O plano volta a aparecer para novas assinaturas.";
  const qtdErros = erros.size;
  const salvoAntes = j.tipo === "editar" && j.plano.assinantes > 0;
  return (
    <Janela id={`${ids}-j`} aberta aoFechar={aoFechar} titulo={titulo} sobretitulo="Planos" descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={qtdErros ? undefined : ""}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome={j.tipo === "arquivar" ? "arquivar" : j.tipo === "desarquivar" ? "reenviar" : "check"} className="ico" />
            {enviando ? "Salvando…" : j.tipo === "arquivar" ? "Arquivar o plano" : j.tipo === "desarquivar" ? "Desarquivar o plano" : j.tipo === "pessoa" ? "Salvar o valor" : "Salvar o plano"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>{desc}</p>
        {qtdErros ? <Aviso tom="urgencia" titulo={faltaAcertar(qtdErros)}>{j.tipo === "criar" ? "O plano não foi criado." : "Nada foi salvo."}</Aviso>
          : erro ? <Aviso tom="urgencia" titulo="Não deu para salvar.">{textoDoErro(erro)}</Aviso> : null}
        {j.tipo === "criar" || j.tipo === "editar" ? (
          <>
            <div className="campo">
              <label htmlFor={`${ids}-nome`}>Nome do plano</label>
              <input className="entrada" id={`${ids}-nome`} value={nome} maxLength={40} autoComplete="off" onChange={(e) => setNome(e.target.value)}
                aria-invalid={erros.has("nome") || undefined} aria-describedby={descritoPor(erros.has("nome") && `${ids}-nome-e`, `${ids}-nome-a`)} />
              {erros.has("nome") ? <ErroCampo id={`${ids}-nome-e`}>Escreva o nome do plano, com 2 letras ou mais e diferente dos outros.</ErroCampo> : null}
              <p className="ajuda" id={`${ids}-nome-a`}>Aparece na ficha, na fatura e no Portal.</p>
            </div>
            <div className="cb-duas">
              <div className="campo">
                <label htmlFor={`${ids}-preco`}>Preço por mês</label>
                <div className="cb-campo-valor">
                  <span className="cb-rs" aria-hidden="true">R$</span>
                  <input className="entrada" id={`${ids}-preco`} inputMode="decimal" autoComplete="off" value={preco} onChange={(e) => setPreco(e.target.value)}
                    aria-invalid={erros.has("preco") || undefined} aria-describedby={descritoPor(erros.has("preco") && `${ids}-preco-e`, `${ids}-preco-a`)} />
                </div>
                {erros.has("preco") ? <ErroCampo id={`${ids}-preco-e`}>Escreva o preço com os centavos, por exemplo 290,00.</ErroCampo> : null}
                <p className="ajuda" id={`${ids}-preco-a`}>Em reais, com centavos.</p>
              </div>
              <div className="campo">
                <label htmlFor={`${ids}-pessoas`}>Pessoas incluídas</label>
                <input className="entrada" id={`${ids}-pessoas`} inputMode="numeric" autoComplete="off" value={pessoas} onChange={(e) => setPessoas(e.target.value)}
                  aria-invalid={erros.has("pessoas") || undefined} aria-describedby={descritoPor(erros.has("pessoas") && `${ids}-pessoas-e`, `${ids}-pessoas-a`)} />
                {erros.has("pessoas") ? <ErroCampo id={`${ids}-pessoas-e`}>O plano inclui pelo menos 1 pessoa.</ErroCampo> : null}
                <p className="ajuda" id={`${ids}-pessoas-a`}>Acima disso, cada pessoa custa {brl(pessoaAMais)} por mês.</p>
              </div>
            </div>
            {salvoAntes ? (
              <Aviso tom="info" titulo="O preço novo vale só para novas assinaturas.">
                {j.plano.escritorios.length ? `${j.plano.escritorios.map((x) => x.nome).join(" e ")} ${j.plano.assinantes === 1 ? "continua" : "continuam"}` : `Os ${j.plano.assinantes} escritórios que assinam continuam`}{" "}
                pagando o preço de quando assinaram. Para mudar o preço de quem já assina, mude a assinatura de cada um, na ficha do escritório.
              </Aviso>
            ) : null}
          </>
        ) : j.tipo === "pessoa" ? (
          <div className="campo">
            <label htmlFor={`${ids}-valor`}>Valor por pessoa a mais, por mês</label>
            <div className="cb-campo-valor">
              <span className="cb-rs" aria-hidden="true">R$</span>
              <input className="entrada" id={`${ids}-valor`} inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)}
                aria-invalid={erros.has("valor") || undefined} aria-describedby={descritoPor(erros.has("valor") && `${ids}-valor-e`, `${ids}-valor-a`)} />
            </div>
            {erros.has("valor") ? <ErroCampo id={`${ids}-valor-e`}>Escreva o valor com os centavos, por exemplo 39,00.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-valor-a`}>A fatura já emitida não muda.</p>
          </div>
        ) : (
          <>
            {j.tipo === "arquivar" ? (
              <ul className="tratar" style={{ padding: 0, margin: 0 }}>
                {j.plano.assinantes ? <li>Quem assina continua pagando {brl(j.plano.precoCentavos)} ou o preço de quando assinou.</li> : null}
                <li>Dá para desarquivar depois.</li>
                <li>O plano não é apagado: fica em Arquivados, com o histórico.</li>
              </ul>
            ) : null}
            <div className="campo">
              <label htmlFor={`${ids}-motivo`}>Motivo</label>
              <textarea className="entrada" id={`${ids}-motivo`} rows={2} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-required="true"
                aria-invalid={erros.has("motivo") || undefined} aria-describedby={descritoPor(erros.has("motivo") && `${ids}-motivo-e`, `${ids}-motivo-a`)} />
              {erros.has("motivo") ? <ErroCampo id={`${ids}-motivo-e`}>Escreva o motivo. Ele fica no histórico dos planos.</ErroCampo> : null}
              <p className="ajuda" id={`${ids}-motivo-a`}>Obrigatório. Fica no histórico dos planos.</p>
            </div>
          </>
        )}
      </div>
    </Janela>
  );
}

function AbaPlanos() {
  const [p, setP] = useState<PlanosCb | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [janela, setJanela] = useState<JanelaPlano | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarConsole<PlanosCb>("/v1/cobranca/planos");
    if (r.ok) setP(r.dados);
    else if (r.status !== 401) setErro(r.erro);
  }, []);
  const carregou = useRef(false);
  useEffect(() => {
    if (carregou.current) return;
    carregou.current = true;
    void carregar();
  }, [carregar]);
  if (erro) return <ErroAoCarregar oque="os planos" aoTentar={() => void carregar()} />;
  if (!p) return <Carregando rotulo="Carregando os planos…" linhas={3} />;
  const ativos = p.planos.filter((x) => !x.arquivadoEm);
  const arquivados = p.planos.filter((x) => x.arquivadoEm);
  const pessoaAMais = p.pessoaAMais?.centavos ?? null;
  const admin = p.podeEditar;
  return (
    <>
      {feito ? (
        <Aviso tom="sucesso" className="toast" titulo={feito} />
      ) : null}
      <div className="cb-titulo-sec">
        <div>
          <h2>Planos</h2>
          <p>Faixas de pessoas, com todas as áreas do Portal.</p>
        </div>
        {admin ? (
          <button className="btn btn-pri" type="button" onClick={() => setJanela({ tipo: "criar" })}>
            <Icone nome="mais" className="ico" />
            Criar plano
          </button>
        ) : (
          <p className="permissao">
            <Icone nome="cadeado" className="ico" />
            Quem cria, muda e arquiva planos é a Administração.
          </p>
        )}
      </div>
      {ativos.length === 0 && arquivados.length === 0 ? (
        <Estado icone="planos" titulo="Nenhum plano ainda" moldura
          acoes={admin ? (
            <button className="btn btn-pri" type="button" onClick={() => setJanela({ tipo: "criar" })}>
              <Icone nome="mais" className="ico" />
              Criar plano
            </button>
          ) : undefined}>
          Crie o primeiro plano: o nome, o preço por mês e quantas pessoas ele inclui. Sem plano, não dá para começar a assinatura de um escritório.
        </Estado>
      ) : null}
      {ativos.length === 0 && arquivados.length === 0 ? (
        <FolhaRegraImplantacao />
      ) : (
        <>
          <p className="cb-regra" role="note">
            <Icone nome="ajuda" className="ico" />
            <span>
              <b>Mudar o preço de um plano vale só para novas assinaturas.</b> Quem já assina continua com o preço de quando assinou, até alguém mudar a assinatura
              dele, na ficha do escritório. Plano não se apaga: arquive, e quem assina continua nele.
            </span>
          </p>
          {ativos.length ? (
            <div className="cb-planos">
              {ativos.map((x, i) => (
                <CartaoPlano key={x.id} p={x} tom={TONS[i % TONS.length]!} pessoaAMais={pessoaAMais} admin={admin} abrir={setJanela} />
              ))}
            </div>
          ) : null}
          {pessoaAMais !== null ? (
            <section className="folha cb-extra" aria-labelledby="cb-extra-t">
              <span className="disco" aria-hidden="true">
                <span>+1</span>
              </span>
              <div>
                <h2 id="cb-extra-t" style={{ fontSize: 20 }}>
                  Pessoa a mais: {brl(pessoaAMais)} por mês
                </h2>
                <p className="cb-peq" style={{ fontSize: 13 }}>
                  Para cada pessoa acima do que o plano inclui. Conta quem está ativo no Portal no dia em que a fatura é emitida; convite pendente não conta. Vale
                  para todos os planos.
                </p>
              </div>
              {admin ? (
                <button className="btn btn-sec" type="button" onClick={() => setJanela({ tipo: "pessoa" })}>
                  <Icone nome="lapis" className="ico" />
                  Editar<span className="sr"> o valor da pessoa a mais</span>
                </button>
              ) : null}
            </section>
          ) : null}
          <FolhaRegraImplantacao />
          {arquivados.length ? (
            <>
              <div className="cb-titulo-sec">
                <div>
                  <h2 style={{ fontSize: 22 }}>Arquivados</h2>
                  <p>Não aparecem para novas assinaturas. Quem assina continua pagando o mesmo.</p>
                </div>
              </div>
              <div className="cb-planos">
                {arquivados.map((x) => (
                  <CartaoPlano key={x.id} p={x} tom="" pessoaAMais={pessoaAMais} admin={admin} abrir={setJanela} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
      {janela ? (
        <JanelaDoPlano key={JSON.stringify(janela)} j={janela} pessoaAMais={pessoaAMais ?? 0} versaoPessoa={p.pessoaAMais?.versao ?? 1} aoFechar={() => setJanela(null)}
          aoSalvar={(t) => {
            setJanela(null);
            setFeito(t);
            void carregar();
          }} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------------- Régua

const PASSOS: { d: string; cls: string; depois?: boolean; titulo: string; quando: string; texto: string; canais: string[] }[] = [
  { d: "−20", cls: "cb-d-antes", titulo: "Fatura emitida", quando: "20 dias antes", texto: "A fatura chega por e-mail e aparece no Portal.", canais: ["E-mail", "Portal"] },
  { d: "−3", cls: "cb-d-antes", titulo: "Vence em 3 dias", quando: "3 dias antes", texto: "Lembrete curto, com o valor.", canais: ["E-mail"] },
  { d: "0", cls: "cb-d-dia", titulo: "Vence hoje", quando: "No dia", texto: "Lembrete de manhã.", canais: ["E-mail"] },
  { d: "+3", cls: "cb-d-dep", depois: true, titulo: "Venceu há 3 dias", quando: "3 dias depois", texto: "“Se já pagou, desconsidere.”", canais: ["E-mail"] },
  { d: "+7", cls: "cb-d-dep", depois: true, titulo: "Aviso no Portal", quando: "7 dias depois", texto: "E-mail e uma faixa no Portal, só para o sócio dono. O resto da equipe não vê.", canais: ["E-mail", "Portal"] },
  { d: "+15", cls: "cb-d-dep", depois: true, titulo: "Venceu há 15 dias", quando: "15 dias depois", texto: "Último lembrete automático. Daqui em diante, só manual.", canais: ["E-mail"] },
  { d: "+30", cls: "cb-d-forte", depois: true, titulo: "A Administração decide", quando: "30 dias depois", texto: "O Console propõe passar o Portal para só consulta. Só acontece se a Administração confirmar, com motivo.", canais: ["Console"] },
];

function AbaRegua() {
  return (
    <div className="col">
      <section className="folha" aria-labelledby="cb-regua-t" style={{ overflow: "hidden" }}>
        <div className="folha-cab">
          <div>
            <h2 id="cb-regua-t">Régua de cobrança</h2>
            <p className="sub">Contada a partir do vencimento. Vai para o e-mail de cobrança, com cópia para o sócio dono. Igual para todos os escritórios.</p>
          </div>
        </div>
        <ol className="cb-regua" aria-label="Passos da régua">
          {PASSOS.map((p) => (
            <li key={p.d} className={p.depois ? "cb-depois" : undefined}>
              <span className={`disco ${p.cls}`} aria-hidden="true">
                <span>{p.d}</span>
              </span>
              <strong>
                {p.titulo}
                <span className="cb-peq" style={{ display: "block", fontWeight: 500, color: "var(--vinho-2)" }}>
                  {p.quando}
                </span>
              </strong>
              <p>{p.texto}</p>
              <p className="cb-canais">
                {p.canais.map((c) => (
                  <span key={c} className="selo selo-neutro">
                    {c}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ol>
        <p className="cb-regra" role="note" style={{ margin: "6px 24px 22px" }}>
          <Icone nome="check" className="ico" />
          <span>
            <b>Ao pagar, tudo para.</b> Os lembretes param, a faixa some e, se o Portal estava só para consulta, ele volta ao normal sozinho, assim que o pagamento é
            confirmado.
          </span>
        </p>
      </section>
      <div className="grade">
        <div className="col">
          <section className="folha" aria-labelledby="cb-email-t" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="cb-email-t">Exemplo: o lembrete de 7 dias</h2>
                <p className="sub">Texto curto e educado. Sem ameaça, sem juros.</p>
              </div>
            </div>
            <div className="cb-email">
              <div className="cb-e-cab">
                <span>
                  <b>De:</b> T3jus &lt;nao-responda@t3jus.pro&gt;
                </span>
                <span>
                  <b>Para:</b> o e-mail de cobrança · <b>Cópia:</b> o sócio dono
                </span>
                <span>
                  <b>Assunto:</b> Fatura de novembro do T3jus em aberto há 7 dias
                </span>
              </div>
              <div className="cb-e-corpo">
                <p>Olá, Rodrigo.</p>
                <p>
                  A fatura de novembro de 2026 da Vale &amp; Sena Advogados, de <b>R$ 968,00</b>, venceu em 10/11/2026 e ainda não consta como paga. Se já pagou,
                  desconsidere este e-mail: o boleto leva até 1 dia útil para cair.
                </p>
                <p>Para pagar, abra o Portal em Escritório › Plano e faturas. O uso do Portal continua normal.</p>
                <span className="btn btn-pri" aria-hidden="true">
                  Ver a fatura no Portal
                </span>
                <p className="cb-peq">Os nomes e o valor deste exemplo são fictícios.</p>
              </div>
            </div>
          </section>
        </div>
        <aside className="col" aria-label="Regras da régua">
          <section className="folha" aria-labelledby="cb-nunca-t">
            <div className="folha-cab" style={{ paddingBottom: 6 }}>
              <h2 id="cb-nunca-t" style={{ fontSize: 20 }}>
                O que nunca acontece sozinho
              </h2>
            </div>
            <ul className="cb-nunca">
              <li>
                <Icone nome="guardar" className="ico" />
                <span>Nenhum dado é apagado por atraso.</span>
              </li>
              <li>
                <Icone nome="cadeado" className="ico" />
                <span>O Portal só fica só para consulta se a Administração confirmar, com motivo.</span>
              </li>
              <li>
                <Icone nome="baixar" className="ico" />
                <span>A exportação dos dados fica sempre liberada para o sócio dono.</span>
              </li>
              <li>
                <Icone nome="fim" className="ico" />
                <span>O contrato não é encerrado por atraso. Encerrar é a ação da Administração na aba Contrato.</span>
              </li>
            </ul>
          </section>
          <section className="explica campo-ambar" aria-labelledby="cb-regua-c">
            <p className="sobretitulo">Nesta versão</p>
            <h2 id="cb-regua-c">A régua é fixa.</h2>
            <ul>
              <li>
                <Icone nome="relogio" className="ico" />
                <span>Os dias são os mesmos para todos. Mudar fica para depois, se a prática pedir.</span>
              </li>
              <li>
                <Icone nome="envelope" className="ico" />
                <span>Cada lembrete fica no histórico da fatura, com o horário.</span>
              </li>
              <li>
                <Icone nome="fim" className="ico" />
                <span>Com o contrato encerrado, a régua para. Lembretes, só manuais.</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------- página

export function CobrancaConsole({ aba, situacao }: { aba: AbaCobranca; /** Filtro de situação vindo do endereço (?situacao=EM_ATRASO). */ situacao?: string }) {
  const sessao = useSessaoConsole();
  const [l, setL] = useState<ListaCobranca | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const pode = sessao ? sessao.acoes.includes("console.cobranca.ver") : null;
  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarConsole<ListaCobranca>("/v1/cobranca/faturas");
    if (r.ok) setL(r.dados);
    else if (r.status !== 401) setErro(r.erro);
  }, []);
  const carregou = useRef(false);
  useEffect(() => {
    if (!pode || carregou.current) return;
    carregou.current = true;
    void carregar();
  }, [pode, carregar]);

  const trilha = [{ nome: "Console", href: CARTEIRA }, ...(aba === "faturas" ? [{ nome: "Cobrança" }] : [{ nome: "Cobrança", href: COBRANCA }, { nome: ABAS_COBRANCA[aba] }])];
  return (
    <MolduraConsole atual="cobranca" pagina="co-cobranca co-carteira" sessao={sessao} trilha={trilha}>
      {pode === false ? (
        <SemPermissao />
      ) : (
        <>
          <div>
            <div className="cabeca-ambar campo-ambar cabeca-equipe cb-cab cb-sem-num">
              <div>
                <p className="sobretitulo">Administração e Financeiro</p>
                <h1>Cobrança</h1>
                <span className="fio" aria-hidden="true" />
                <p className="lede">As faturas dos escritórios que assinam o T3jus, os planos e os lembretes de pagamento.</p>
                {l ? (
                  <p className="cb-cab-linha">
                    <span className="cb-peq" style={{ color: "var(--tinta)" }}>
                      Hoje: {dataBr(l.hoje)}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
            <nav className="abas" aria-label="Seções da cobrança">
              {(Object.keys(ABAS_COBRANCA) as AbaCobranca[]).map((a) => (
                <a key={a} href={hrefAba(a)} aria-current={a === aba ? "page" : undefined}>
                  {ABAS_COBRANCA[a]}
                  {a === "faturas" && l ? <span className="q">{l.faturas.length}</span> : null}
                </a>
              ))}
            </nav>
          </div>
          {aba === "faturas" ? <AbaFaturas l={l} erro={erro} aoTentar={() => void carregar()} situacao={situacao} /> : aba === "planos" ? <AbaPlanos /> : <AbaRegua />}
        </>
      )}
    </MolduraConsole>
  );
}
