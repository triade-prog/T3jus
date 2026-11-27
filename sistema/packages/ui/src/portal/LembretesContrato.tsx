"use client";
// Lembretes de contrato (F3.144, F3.145; VA-05), desenho aprovado em
// docs/design/aprovadas/portal-importacao-sobras (estados lista, entrada, viraram, dispensados,
// busca-vazia, vazio, carregando, erro, dispensar, dispensar-erro, dispensar-conflito,
// dispensado e dispensados-hoje) e na rodada 2 (dispensar-sem-motivo, ja-dispensado, trazido,
// trazido-resolvido e busca-vazia-viraram). A página mora em Contratos › Contratos: o que ficou em
// aberto no sistema antigo, para criar o contrato ou dispensar com o motivo. O banco confere a
// área, a permissão e o escritório da sessão; aqui a tela só mostra e pede.
// F3.186 (desenho portal-exclusao-contratos-conversas): o lembrete do cliente excluído sai das listas
// no servidor; dispensar e trazer de volta com a página aberta antes recebem CLIENTE_EXCLUIDO e mostram
// que o lembrete já saiu da lista.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  camposDispensa, MOTIVOS_DISPENSA, ORDENS_LEMBRETE, reais, SITUACOES_LEMBRETE, TAMANHO_DETALHE_DISPENSA,
  type LembreteContrato, type ListaLembretes, type MotivoDispensa, type MudancaLembrete, type OrdemLembrete, type OrigemDados,
  type ResumoLembretes, type SituacaoLembrete,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { Selo } from "./Comercial.tsx";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { ROTAS_PASSO } from "./fichaLigada.ts";
import { ROTAS_IMPORTACAO } from "./importacao.ts";
import { SeloOrigem } from "./Importacao.tsx";
import {
  avisoDispensado, avisoTrazido, buscaVazia, conflitoDispensa, contagemLembretes, DISPENSA_EXCLUIDO, grupoDoEndereco, grupoVazio, nomeSistema, primeiroNome,
  trazerExcluido,
  quandoCriado, quandoDispensado, ROTAS_LEMBRETES, textoCaso, textoLancamentos,
} from "./lembretes.ts";
import { chamarPortal, soConsulta } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

const contar = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

// ------------------------------------------------------------------------- a janela de dispensar

/** O lembrete que a janela mostra: o cliente, o caso, os lançamentos e o valor. */
export interface AlvoDispensa {
  id: string;
  cliente: string;
  caso: string | null;
  lancamentos: number;
  valor: number;
  origem: OrigemDados | null;
}

/**
 * Dispensar um lembrete (R1): o motivo é obrigatório e o detalhe também em "Outro motivo". Se
 * alguém criou o contrato ou dispensou enquanto a janela estava aberta, nada é gravado e a janela
 * diz quem e quando, com um botão só.
 */
export function JanelaDispensar({ alvo, aoFechar, aoFeito, aoAtualizar, id = "janela-dispensar" }: {
  alvo: AlvoDispensa;
  aoFechar: () => void;
  aoFeito: (r: MudancaLembrete) => void;
  /** "Ver a lista atualizada", depois do conflito. */
  aoAtualizar: () => void;
  id?: string;
}) {
  const [motivo, setMotivo] = useState<MotivoDispensa | "">("");
  const [detalhe, setDetalhe] = useState("");
  const [erros, setErros] = useState<("motivo" | "detalhe")[]>([]);
  const [conflito, setConflito] = useState<{ titulo: string; texto: string; abertura?: string } | null>(null);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);

  const sistema = nomeSistema(alvo.origem);
  const p = primeiroNome(alvo.cliente);
  const eMot = erros.includes("motivo");
  const eDet = erros.includes("detalhe");
  const outro = motivo === "OUTRO";

  async function dispensar() {
    if (enviando) return;
    setFalha(null);
    const faltam = camposDispensa({ motivo: motivo || null, detalhe });
    if (faltam.length) {
      setErros(faltam);
      focarPrimeiroErro(corpo.current);
      return;
    }
    setEnviando(true);
    const r = await chamarPortal<MudancaLembrete>(`/v1/escritorio/contratos/lembretes/${alvo.id}/dispensar`, { corpo: { motivo, detalhe: detalhe.trim() || null } });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados);
    const d = (r.erro.detalhes ?? {}) as Record<string, unknown>;
    if (r.erro.codigo === "VERSION_CONFLICT" && (d.motivo === "JA_RESOLVIDO" || d.motivo === "JA_DISPENSADO")) {
      return setConflito(conflitoDispensa(d as Parameters<typeof conflitoDispensa>[0], alvo.cliente));
    }
    // F3.186: o cliente foi excluído com a janela aberta; o lembrete já saiu da lista.
    if (r.erro.codigo === "VALIDATION_ERROR" && d.motivo === "CLIENTE_EXCLUIDO") return setConflito(DISPENSA_EXCLUIDO);
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(d.campos)) {
      setErros((d.campos as string[]).filter((c): c is "motivo" | "detalhe" => c === "motivo" || c === "detalhe"));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro);
  }

  const topo = conflito ? (
    <Aviso tom="urgencia" titulo={conflito.titulo}>{conflito.texto}</Aviso>
  ) : eMot && eDet ? (
    <Aviso tom="urgencia" titulo={faltaAcertar(2)}>O lembrete continua aberto até você dispensar.</Aviso>
  ) : eMot ? (
    <Aviso tom="urgencia" titulo="Falta escolher o motivo.">Marque por que o escritório não vai cobrar. O lembrete continua aberto até você dispensar.</Aviso>
  ) : eDet ? (
    <Aviso tom="urgencia" titulo={outro ? "Falta escrever o motivo." : "O detalhe está longo."}>
      {outro ? "Com “Outro motivo”, diga em poucas palavras por que não vai cobrar. O lembrete continua aberto até você dispensar." : "Use até 140 caracteres. O lembrete continua aberto até você dispensar."}
    </Aviso>
  ) : falha ? (
    <Aviso tom="urgencia" titulo="O lembrete não foi dispensado.">{textoDoErro(falha)} Ele continua aberto, como estava.</Aviso>
  ) : null;

  const lemb = (
    <div className="il-lemb">
      <span className="il-ci"><Icone nome="pena" className="ico" /></span>
      <span>
        <strong>{alvo.cliente}</strong>
        <small>{alvo.caso ? `Caso ${alvo.caso}` : "Sem caso ligado"} · {contar(alvo.lancamentos, "lançamento", "lançamentos")} em aberto no {sistema}</small>
      </span>
      <span className="il-valor num">{reais(alvo.valor)}</span>
    </div>
  );

  return (
    <Janela id={id} aberta alerta aoFechar={aoFechar} aoEnviar={() => void (conflito ? aoAtualizar() : dispensar())}
      sobretitulo={`Lembrete de contrato · ${sistema}`} titulo={`Dispensar o lembrete de ${p}?`} descricao={`${id}-d`}
      pe={conflito ? (
        <button className="btn btn-pri" type="submit" data-foco><Icone nome="check" className="ico" />Ver a lista atualizada</button>
      ) : (
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando}><Icone nome="xis" className="ico" />{enviando ? "Dispensando…" : "Dispensar o lembrete"}</button>
        </>
      )}>
      <div ref={corpo}>
        <p id={`${id}-d`}>{conflito ? (conflito.abertura ?? "Alguém mexeu neste lembrete enquanto a janela estava aberta.") : "Use quando o escritório não vai cobrar este valor pelo T3jus. Para cobrar, crie o contrato."}</p>
        {topo}
        {lemb}
        {conflito ? null : (
          <>
            <fieldset className={`il-motivos${eMot ? " il-erro" : ""}`} aria-describedby={eMot ? `${id}-mot-er` : undefined}>
              <legend>Por que o escritório não vai cobrar?<span className="ob">obrigatório</span></legend>
              {(Object.keys(MOTIVOS_DISPENSA) as MotivoDispensa[]).map((m, i) => (
                <label key={m} className="opcao">
                  <input className="marcar" type="radio" name={`${id}-mot`} value={m} checked={motivo === m} aria-invalid={eMot || undefined}
                    data-foco={i === 0 ? true : undefined} onChange={() => { setMotivo(m); setErros((e) => e.filter((x) => x !== "motivo")); }} />
                  <span>{MOTIVOS_DISPENSA[m]}</span>
                </label>
              ))}
              {eMot ? <ErroCampo id={`${id}-mot-er`}>Escolha o motivo. Ele fica no histórico do cliente, com o seu nome.</ErroCampo> : null}
            </fieldset>
            <div className="campos" style={{ display: "block", marginTop: 8 }}>
              <div className="campo c6">
                <label htmlFor={`${id}-det`}>{eDet && outro ? "Escreva o motivo" : "Detalhe"}{outro ? null : <span className="opcional"> (opcional)</span>}</label>
                <input className="entrada" id={`${id}-det`} value={detalhe} maxLength={TAMANHO_DETALHE_DISPENSA} aria-invalid={eDet || undefined}
                  aria-describedby={descritoPor(`${id}-det-aj`, eDet && `${id}-det-er`)}
                  onChange={(e) => { setDetalhe(e.target.value); if (eDet) setErros((x) => x.filter((c) => c !== "detalhe")); }} />
                <p className="ajuda" id={`${id}-det-aj`}>
                  {eDet && outro ? "Até 140 caracteres. Ex.: “cliente faleceu, sem herdeiros”." : "Até 140 caracteres. Fica junto do motivo, no histórico. Com “Outro motivo”, é obrigatório."}
                </p>
                {eDet ? <ErroCampo id={`${id}-det-er`}>{outro ? "Escreva o motivo em poucas palavras. Ele fica no histórico do cliente." : "Use até 140 caracteres."}</ErroCampo> : null}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <ul className="im-desf">
                <li><Icone nome="xis" className="ico" /><span><b>Sai desta lista e da ficha de {p}.</b> Não aparece mais como contrato a criar.</span></li>
                <li><Icone nome="historico" className="ico" /><span><b>Fica em Dispensados e no histórico do cliente</b>, com o motivo, quem dispensou e quando.</span></li>
                <li><Icone nome="carteira" className="ico" /><span><b>O histórico do {sistema} não muda.</b> Os lançamentos continuam na ficha como estavam (“em aberto lá”), e nada entra no Caixa nem em A receber.</span></li>
                <li><Icone nome="trocar" className="ico" /><span><b>Dá para trazer de volta</b> quando quiser, em Dispensados.</span></li>
              </ul>
            </div>
          </>
        )}
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- a faixa da lista de Contratos

/** A faixa de atenção da lista de Contratos (estado entrada): some quando não sobra nenhum aberto. */
export function FaixaLembretes() {
  const [r, setR] = useState<ResumoLembretes | null>(null);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<ResumoLembretes>("/v1/escritorio/contratos/lembretes/resumo").then((x) => {
      if (vivo && x.ok) setR(x.dados);
    });
    return () => {
      vivo = false;
    };
  }, []);
  if (!r || !r.abertos) return null;
  const s = nomeSistema(r.origem);
  const de = r.importadoEm ? ` de ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(r.importadoEm))}` : "";
  return (
    <Aviso tom="atencao" icone="pena"
      titulo={r.clientes === 1 ? `1 cliente tem valor em aberto no ${s} e ainda não tem contrato.` : `${r.clientes.toLocaleString("pt-BR")} clientes têm valor em aberto no ${s} e ainda não têm contrato.`}
      acoes={<a className="btn btn-sec" href={ROTAS_LEMBRETES.lista}><Icone nome="dir" className="ico" />Ver os lembretes</a>}>
      {r.valor === 0 ? null : `${r.abertos === 1 ? "É" : "São"} ${reais(r.valor)} que ${r.abertos === 1 ? "veio" : "vieram"} da importação${de}. `}
      Crie o contrato de cada um para cobrar, ou dispense o que o escritório não vai cobrar.
    </Aviso>
  );
}

// ------------------------------------------------------------------------- a página

type Toast = { titulo: string; texto: string; acao?: ReactNode };

function Cab() {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Contratos</p>
        <h1>Lembretes de contrato</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">Clientes com valor em aberto no sistema antigo. No T3jus, a cobrança nasce do contrato: crie o contrato e o lembrete sai daqui sozinho.</p>
      </div>
    </div>
  );
}

function lerEndereco(): { s: SituacaoLembrete; q: string } {
  if (typeof window === "undefined") return { s: "ABERTO", q: "" };
  const u = new URLSearchParams(window.location.search);
  return { s: grupoDoEndereco(u.get("mostrar")), q: (u.get("q") ?? "").slice(0, 120) };
}

function LembretesConteudo({ consulta }: { consulta: boolean }) {
  const [inicio] = useState(lerEndereco);
  const [situacao, setSituacao] = useState<SituacaoLembrete>(inicio.s);
  const [busca, setBusca] = useState(inicio.q);
  const [q, setQ] = useState(inicio.q);
  const [ordem, setOrdem] = useState<OrdemLembrete>("VALOR");
  const [dados, setDados] = useState<ListaLembretes | null | "erro">(null);
  const [mais, setMais] = useState(false);
  const [vez, setVez] = useState(0);
  const [alvo, setAlvo] = useState<AlvoDispensa | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  // F3.186: o trazer de volta de cliente excluído com a página aberta; o aviso fica no topo da lista.
  const [saiu, setSaiu] = useState<{ titulo: string; texto: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);

  const caminho = useCallback((pular: number) => {
    const f = new URLSearchParams({ situacao });
    if (q) f.set("q", q);
    if (situacao === "ABERTO") f.set("ordem", ordem);
    if (pular) f.set("pular", String(pular));
    return `/v1/escritorio/contratos/lembretes?${f}`;
  }, [situacao, q, ordem]);

  useEffect(() => {
    let vivo = true;
    void chamarPortal<ListaLembretes>(caminho(0)).then((r) => {
      if (vivo) setDados(r.ok ? r.dados : "erro");
    });
    return () => {
      vivo = false;
    };
  }, [caminho, vez]);

  // O endereço acompanha o grupo e a busca, para voltar ao mesmo lugar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("mostrar", situacao === "ABERTO" ? "abertos" : situacao === "CONTRATO" ? "viraram" : "dispensados");
    if (q) u.searchParams.set("q", q);
    else u.searchParams.delete("q");
    window.history.replaceState(null, "", u);
  }, [situacao, q]);

  const recarregar = () => setVez((v) => v + 1);

  async function mostrarMais() {
    if (!dados || dados === "erro") return;
    setMais(true);
    const r = await chamarPortal<ListaLembretes>(caminho(dados.lembretes.length));
    setMais(false);
    if (r.ok) setDados({ ...r.dados, lembretes: [...dados.lembretes, ...r.dados.lembretes] });
  }

  function aplicar(r: MudancaLembrete) {
    setDados((d) => (d && d !== "erro" ? {
      ...d, totais: r.totais, clientesAbertos: r.clientesAbertos,
      lembretes: d.lembretes.filter((l) => l.id !== r.lembrete.id),
      total: Math.max(0, d.total - (d.lembretes.some((l) => l.id === r.lembrete.id) ? 1 : 0)),
      valor: Math.max(0, d.valor - (d.lembretes.find((l) => l.id === r.lembrete.id)?.valor ?? 0)),
    } : d));
  }

  async function trazer(l: Pick<LembreteContrato, "id" | "cliente">) {
    setOcupado(l.id);
    setFalha(null);
    setSaiu(null);
    const r = await chamarPortal<MudancaLembrete>(`/v1/escritorio/contratos/lembretes/${l.id}/trazer`, { metodo: "POST" });
    setOcupado(null);
    if (!r.ok) {
      if (r.erro.codigo === "VALIDATION_ERROR" && r.erro.detalhes?.motivo === "CLIENTE_EXCLUIDO") {
        recarregar();
        return setSaiu(trazerExcluido(l.cliente.nome));
      }
      if (r.erro.codigo === "VERSION_CONFLICT") recarregar();
      return setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Este lembrete já tinha voltado ou mudado. A lista foi atualizada." : `${textoDoErro(r.erro)} O lembrete continua dispensado.`);
    }
    const a = avisoTrazido(r.dados.lembrete);
    if (situacao === "DISPENSADO") aplicar(r.dados);
    else recarregar();
    setToast({
      titulo: a.titulo, texto: a.texto,
      acao: a.resolvido ? <a className="btn btn-sec" href={ROTAS_LEMBRETES.viraram} onClick={(e) => { e.preventDefault(); setToast(null); setSituacao("CONTRATO"); }}><Icone nome="pena" className="ico" />Ver em Viraram contrato</a> : undefined,
    });
  }

  function dispensado(r: MudancaLembrete) {
    setAlvo(null);
    aplicar(r);
    const a = avisoDispensado(r.lembrete.cliente.nome);
    setToast({
      ...a,
      acao: consulta ? undefined : (
        <button data-muda className="btn btn-sec" type="button" onClick={() => { setToast(null); void trazer(r.lembrete); }}>
          <Icone nome="historico" className="ico" />Desfazer
        </button>
      ),
    });
  }

  const numeros = (d: ListaLembretes | null) => {
    const item = (s: SituacaoLembrete, n: number | null, disco: string, sub: string, soma?: string) => (
      <a key={s} href={ROTAS_LEMBRETES.grupo(s, q)} aria-current={situacao === s ? "true" : undefined}
        onClick={(e) => { e.preventDefault(); setSituacao(s); setDados(null); setSaiu(null); }}>
        <span className={`disco${disco}`} aria-hidden="true"><span>{n === null ? "–" : n.toLocaleString("pt-BR")}</span></span>
        <span className="r"><b>{SITUACOES_LEMBRETE[s]}</b>{sub}{soma ? <span className="il-soma num">{soma}</span> : null}</span>
        <span className="sr">: {n ?? "carregando"}</span>
      </a>
    );
    const t = d?.totais;
    const s = nomeSistema(d?.importacoes[0]?.origem ?? null);
    return (
      <nav className="folha hn-numeros il-numeros" aria-label="Mostrar lembretes" aria-busy={d ? undefined : "true"}>
        {item("ABERTO", t ? t.abertos.n : null, " hn-d-hoje", `em aberto no ${s}`, t ? reais(t.abertos.valor) : undefined)}
        {item("CONTRATO", t ? t.contrato.n : null, " hn-d-vinho", "saíram da lista sozinhos")}
        {item("DISPENSADO", t ? t.dispensados.n : null, "", "com o motivo, dá para trazer de volta")}
      </nav>
    );
  };

  const toastEl = toast ? (
    <div className="aviso aviso-sucesso toast il-toast" role="status">
      <Icone nome="check" className="ico" />
      <div>
        <strong className="aviso-titulo">{toast.titulo}</strong>
        <p>{toast.texto}</p>
        {toast.acao ? <div className="aviso-acoes">{toast.acao}</div> : null}
      </div>
      <button className="fechar" type="button" aria-label="Fechar aviso" onClick={() => setToast(null)}><Icone nome="xis" className="ico" /></button>
    </div>
  ) : null;

  if (dados === "erro") {
    return (
      <div className="hn">
        <Cab />
        <nav className="folha hn-numeros il-numeros" aria-label="Mostrar lembretes">
          {(["ABERTO", "CONTRATO", "DISPENSADO"] as const).map((s) => (
            <div key={s} className="hn-num"><span className="disco" aria-hidden="true"><span>–</span></span><span className="r"><b>{SITUACOES_LEMBRETE[s]}</b>não carregou</span></div>
          ))}
        </nav>
        <section className="folha" aria-labelledby="t-ill" style={{ overflow: "hidden" }}>
          <h2 id="t-ill" className="sr">Lista de lembretes</h2>
          <Estado icone="alerta" erro titulo="Não deu para carregar os lembretes"
            acoes={<button className="btn btn-pri" type="button" onClick={recarregar}><Icone nome="reenviar" className="ico" />Tentar de novo</button>}>
            A conexão com o T3jus caiu no meio. Nada mudou: os lembretes, os contratos e o histórico do sistema antigo continuam como estavam. Tente de novo; se continuar, avise o suporte pela Ajuda.
          </Estado>
        </section>
      </div>
    );
  }

  const d = dados;
  const sistema = nomeSistema(d?.importacoes[0]?.origem ?? null);
  const ferramentas = (
    <form className="hn-ferr il-ferr" role="search" onSubmit={(e) => e.preventDefault()} aria-busy={d ? undefined : "true"}>
      <div className="campo-busca">
        <label className="sr" htmlFor="il-b">Buscar por cliente ou caso</label>
        <Icone nome="busca" className="ico" />
        <input className="entrada" id="il-b" type="search" placeholder="Cliente ou caso" autoComplete="off" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {situacao === "ABERTO" ? (
        <>
          <label className="sr" htmlFor="il-ord">Ordem</label>
          <select className="entrada" id="il-ord" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemLembrete)}>
            {(Object.keys(ORDENS_LEMBRETE) as OrdemLembrete[]).map((o) => <option key={o} value={o}>{ORDENS_LEMBRETE[o]}</option>)}
          </select>
        </>
      ) : null}
    </form>
  );

  let corpo: ReactNode;
  if (!d) {
    corpo = (
      <>
        {ferramentas}
        <p className="hn-cont" role="status">Carregando os lembretes…</p>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="il-esq" aria-hidden="true">
            <span className="esqueleto g" /><span className="esqueleto" /><span className="esqueleto" /><span className="esqueleto" style={{ height: 44, borderRadius: 10 }} />
          </div>
        ))}
      </>
    );
  } else if (!d.lembretes.length) {
    const v = d.q ? buscaVazia(situacao, d.q) : grupoVazio(situacao, d.importacoes.reduce((a, i) => a + i.lembretes, 0), d.importacoes[0]?.origem ?? null, d.importacoes[0]?.em ?? null);
    const c = contagemLembretes(situacao, 0, 0, d.ordem, d.q);
    corpo = (
      <>
        {d.q || situacao !== "ABERTO" || d.totais.contrato.n || d.totais.dispensados.n ? ferramentas : null}
        {d.q ? <p className="hn-cont" role="status"><b>{c.forte}</b>{c.resto}</p> : null}
        <Estado icone={d.q ? "busca" : situacao === "ABERTO" ? "check" : situacao === "CONTRATO" ? "pena" : "historico"} titulo={v.titulo}
          acoes={d.q ? <button className="btn btn-sec" type="button" onClick={() => { setBusca(""); setQ(""); }}><Icone nome="xis" className="ico" />Limpar a busca</button>
            : situacao === "ABERTO" && d.totais.contrato.n ? <a className="btn btn-sec" href={ROTAS_LEMBRETES.viraram} onClick={(e) => { e.preventDefault(); setSituacao("CONTRATO"); }}><Icone nome="pena" className="ico" />Ver os que viraram contrato</a> : undefined}>
          {v.texto}
        </Estado>
      </>
    );
  } else {
    const c = contagemLembretes(situacao, d.total, d.valor, d.ordem, d.q);
    corpo = (
      <>
        {ferramentas}
        <p className="hn-cont" role="status"><b>{c.forte}</b>{c.resto}</p>
        {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para trazer o lembrete de volta.">{falha}</Aviso></div> : null}
        <TabelaLembretes situacao={situacao} lembretes={d.lembretes} hoje={d.hoje} consulta={consulta} ocupado={ocupado}
          aoDispensar={(l) => setAlvo({ id: l.id, cliente: l.cliente.nome, caso: l.caso?.nome ?? null, lancamentos: l.lancamentos, valor: l.valor, origem: l.origem })}
          aoTrazer={(l) => void trazer(l)} />
        {d.total > d.lembretes.length ? (
          <div className="mais">
            <span>Mostrando {d.lembretes.length.toLocaleString("pt-BR")} de {d.total.toLocaleString("pt-BR")}</span>
            <button className="btn btn-sec" type="button" disabled={mais} onClick={() => void mostrarMais()}><Icone nome="baixo" className="ico" />{mais ? "Carregando…" : "Mostrar mais 25"}</button>
          </div>
        ) : null}
        <p className="hn-pe">
          <Icone nome={situacao === "CONTRATO" ? "pena" : "historico"} className="ico" />
          <span>
            {situacao === "ABERTO" ? "Lembrete não se apaga. O que vira contrato ou é dispensado sai desta lista e fica nas outras duas, e no histórico do cliente."
              : situacao === "CONTRATO" ? `O lembrete sai sozinho quando um contrato do cliente é criado. O valor do ${sistema} não entra no contrato por conta própria: as condições são as que você escreveu nele.`
              : "“Trazer de volta” põe o lembrete de novo na lista e na ficha, sem prazo. Fica no histórico do cliente quem dispensou, quem trouxe de volta e o motivo."}
          </span>
        </p>
      </>
    );
  }

  return (
    <>
      {toastEl}
      <div className="hn">
        <Cab />
        {numeros(d)}
        <div className="hn-grade">
          <div className="hn-col">
            <section className="folha" aria-labelledby="t-ill" style={{ overflow: "hidden" }}>
              <h2 id="t-ill" className="sr">Lista de lembretes</h2>
              {saiu ? <div className="il-topo-lista"><Aviso tom="urgencia" titulo={saiu.titulo}>{saiu.texto}</Aviso></div> : null}
              {corpo}
            </section>
          </div>
          <aside className="hn-col" aria-label="Sobre os lembretes">
            <Lateral d={d} />
          </aside>
        </div>
      </div>
      {alvo ? <JanelaDispensar key={alvo.id} alvo={alvo} aoFechar={() => setAlvo(null)} aoFeito={dispensado} aoAtualizar={() => { setAlvo(null); recarregar(); }} /> : null}
    </>
  );
}

function TabelaLembretes({ situacao, lembretes, hoje, consulta, ocupado, aoDispensar, aoTrazer }: {
  situacao: SituacaoLembrete; lembretes: LembreteContrato[]; hoje: string; consulta: boolean; ocupado: string | null;
  aoDispensar: (l: LembreteContrato) => void; aoTrazer: (l: LembreteContrato) => void;
}) {
  const sistema = nomeSistema(lembretes[0]?.origem ?? null);
  const cols = situacao === "ABERTO" ? ["42%", "28%", "30%"] : situacao === "CONTRATO" ? ["32%", "18%", "26%", "24%"] : ["26%", "16%", "32%", "26%"];
  const tit = situacao === "ABERTO" ? ["Cliente e caso", `Em aberto no ${sistema}`, "Ações"]
    : situacao === "CONTRATO" ? ["Cliente e caso", "Valor do lembrete", "Virou", "Ações"] : ["Cliente e caso", "Valor", "Motivo", "Ações"];
  const cap = situacao === "ABERTO" ? "Lembretes de contrato abertos" : situacao === "CONTRATO" ? "Lembretes que viraram contrato" : "Lembretes dispensados";
  return (
    <table className="hn-tab il-tab" data-cartoes="600">
      <caption className="sr">{cap}</caption>
      <colgroup>{cols.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
      <thead><tr>{tit.map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead>
      <tbody>
        {lembretes.map((l) => (
          <tr key={l.id} className={situacao === "ABERTO" ? undefined : "il-saiu"}>
            <td>
              <div className="esc">
                <div>
                  <a href={ROTAS_CONTRATOS.cliente(l.cliente.id)}>{l.cliente.nome}</a>
                  <small>{situacao === "ABERTO" ? textoCaso(l.caso) : textoCaso(l.caso ? { nome: l.caso.nome } : null)}</small>
                  {situacao === "ABERTO" && l.contratoAtivo ? (
                    <small className="il-ja"><Icone nome="pena" className="ico" /><span>Já tem o contrato {l.contratoAtivo.numero}, ativo. Se este valor já entra nele, dispense o lembrete.</span></small>
                  ) : null}
                </div>
              </div>
            </td>
            <td data-r={tit[1]}>
              <div>
                <span className="il-valor num">{reais(l.valor)}</span>
                <small>{situacao === "ABERTO" ? textoLancamentos(l, hoje) : situacao === "CONTRATO" ? `estava em aberto no ${nomeSistema(l.origem)}` : `em aberto no ${nomeSistema(l.origem)}`}</small>
              </div>
            </td>
            {situacao === "CONTRATO" ? (
              <td data-r="Virou">
                <div>
                  <Selo tom="ok" icone="check">Contrato {l.contrato?.numero}</Selo>
                  {l.contrato ? <small>{quandoCriado(l.contrato.em, l.contrato.por)}</small> : null}
                </div>
              </td>
            ) : situacao === "DISPENSADO" && l.dispensa ? (
              <td data-r="Motivo">
                <div>
                  <b>{MOTIVOS_DISPENSA[l.dispensa.motivo]}</b>
                  {l.dispensa.detalhe ? <span className="il-motivo">“{l.dispensa.detalhe}”</span> : null}
                  <small>{quandoDispensado(l.dispensa.em, l.dispensa.por, hoje)}</small>
                </div>
              </td>
            ) : null}
            <td data-r="Ações" className="il-td-acoes">
              <div className="il-acoes">
                {situacao === "ABERTO" && !consulta ? (
                  <>
                    <a data-muda className="btn btn-pri" href={ROTAS_PASSO.novoContrato(l.cliente.id)}>
                      <Icone nome="pena" className="ico" />Criar o contrato<span className="sr"> de {l.cliente.nome}</span>
                    </a>
                    <button data-muda className="btn btn-sec" type="button" onClick={() => aoDispensar(l)}>
                      <Icone nome="xis" className="ico" />Dispensar<span className="sr"> o lembrete de {l.cliente.nome}</span>
                    </button>
                  </>
                ) : situacao === "CONTRATO" && l.contrato ? (
                  <a className="btn btn-sec" href={ROTAS_CONTRATOS.contrato(l.contrato.id)}><Icone nome="pena" className="ico" />Ver o contrato<span className="sr"> {l.contrato.numero}</span></a>
                ) : situacao === "DISPENSADO" && !consulta ? (
                  <button data-muda className="btn btn-sec" type="button" disabled={ocupado === l.id} onClick={() => aoTrazer(l)}>
                    <Icone nome="historico" className="ico" />{ocupado === l.id ? "Trazendo…" : "Trazer de volta"}<span className="sr"> o lembrete de {l.cliente.nome}</span>
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Lateral({ d }: { d: ListaLembretes | null }) {
  const imps = d?.importacoes ?? [];
  const s = nomeSistema(imps[0]?.origem ?? null);
  const dataHora = (em: string) => {
    const f = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(em));
    const p = Object.fromEntries(f.map((x) => [x.type, x.value]));
    return `${p.day}/${p.month}/${p.year}, ${p.hour}h${p.minute}`;
  };
  return (
    <>
      {imps.length ? (
        <section className="folha" aria-labelledby="t-ilde">
          <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-ilde" style={{ fontSize: 20 }}>De onde vieram</h2></div></div>
          {imps.map((i) => (
            <dl key={i.id} className="il-lat-dl">
              <div><dt>Origem</dt><dd><SeloOrigem origem={i.origem} /></dd></div>
              <div><dt>Importado em</dt><dd>{dataHora(i.em)}</dd></div>
              {i.por ? <div><dt>Por</dt><dd>{i.por.nome}</dd></div> : null}
              <div><dt>Lembretes criados</dt><dd>{i.lembretes.toLocaleString("pt-BR")} · {reais(i.valor)}</dd></div>
            </dl>
          ))}
          <div className="hn-folha-acao">
            <a className="btn btn-sec" href={ROTAS_IMPORTACAO.resultado(imps[0]!.id)}><Icone nome="historico" className="ico" />Ver o resultado da importação</a>
            <p>Só quem tem a área Contratos vê esta lista. Na ficha do cliente, quem tem Financeiro também vê o lembrete.</p>
          </div>
        </section>
      ) : null}
      <section className="explica campo-ambar il-explica" aria-labelledby="t-ilx">
        <p className="sobretitulo">Como funciona</p>
        <h2 id="t-ilx">A cobrança nasce do contrato.</h2>
        <ul>
          <li><Icone nome="pena" className="ico" /><span><b>Criar o contrato</b> leva ao contrato novo com o cliente já escolhido. Criado, o lembrete sai da lista e da ficha sozinho.</span></li>
          <li><Icone nome="xis" className="ico" /><span><b>Dispensar</b> é para o valor que o escritório não vai cobrar: já negociado fora, perdoado ou em outro contrato. Pede o motivo e dá para trazer de volta.</span></li>
          <li><Icone nome="carteira" className="ico" /><span>Nada aqui mexe no histórico do {s} na ficha (“pago antes do T3jus”), no Caixa ou em A receber.</span></li>
        </ul>
      </section>
    </>
  );
}

export function LembretesContratoPortal() {
  return (
    <MolduraArea area="CONTRATOS" secao="contratos" trilha={[{ nome: "Lembretes de contrato" }]}>
      {(e) => <LembretesConteudo consulta={soConsulta(e)} />}
    </MolduraArea>
  );
}
