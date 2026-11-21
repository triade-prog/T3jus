"use client";
// RPV e precatório a caminho (F3.48), desenho aprovado em
// docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados rv-caminho, rv-registrar,
// rv-registrado, rv-data, rv-entrou, rv-vazio, rv-registrar-erros e rv-caixa).
// - O expedido entra antes do dinheiro, com a data estimada. A parte do escritório sai do contrato
//   e entra na previsão do Caixa no mês estimado (em âmbar). O resto é do cliente.
// - Passou da data estimada, sai da previsão e fica marcada, até alguém mudar a data.
// - "Entrou na conta" abre o registrar do levantamento já preenchido (FinanceiroRepasses).

import { useEffect, useRef, useState } from "react";
import {
  estimadaSugerida, reais, TIPOS_REQUISICAO,
  type ACaminho, type ListaRepasses, type PropostaRepasse, type RequisicaoACaminho, type TipoRequisicao,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaBr, lerDia } from "./agenda.ts";
import { Selo } from "./Comercial.tsx";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal } from "./Moldura.tsx";
import { abrirAnexo, CampoAnexo, enviarAnexo } from "./Anexos.tsx";

type Feito = { titulo: string; texto: string };
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "janeiro de 2027". */
export const mesAno = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
/** "01/2027". */
const mesBr = (mes: string) => `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;
/** "01/2027" ou "1/2027" para "2027-01-01"; nulo se não for um mês. */
function lerMes(t: string): string | null {
  const m = /^\s*(\d{1,2})\s*\/\s*(\d{4})\s*$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > 12) return null;
  return `${m[2]}-${String(n).padStart(2, "0")}-01`;
}

function LinhaACaminho({ r, ateMes, aoData, aoEntrou }: {
  r: RequisicaoACaminho; ateMes?: string; aoData?: (r: RequisicaoACaminho) => void; aoEntrou?: (r: RequisicaoACaminho) => void;
}) {
  const quem = `${r.cliente.nome} · ${TIPOS_REQUISICAO[r.tipo].titulo}`;
  const [agora] = useState(() => Date.now());
  const novo = agora - new Date(r.criadoEm).getTime() < 864e5;
  return (
    <li className={r.passou ? "fi-linha rv-item rv-passou" : "fi-linha rv-item"}>
      <div className="fi-quem">
        <strong>{quem}</strong>
        <small>{r.tribunal} · {r.devedor} · expedido em {diaBr(r.expedidoEm)} · requisitado {reais(r.valorRequisitado)}</small>
        <p className="fi-prox">
          <Icone nome="agenda" className="ico" />
          {r.passou
            ? <span>Era <b>{mesAno(r.estimadaMes)}</b> · fora da previsão do Caixa até ter data nova</span>
            : <span>Data estimada: <b>{mesAno(r.estimadaMes)}</b> · {ateMes && r.estimadaMes > ateMes ? `fora do gráfico, que vai até ${MESES[Number(ateMes.slice(5, 7)) - 1]}` : "na previsão do Caixa"}</span>}
        </p>
        {r.oficio ? <Oficio a={r.oficio} /> : null}
        {r.passou ? <div className="fi-por"><Selo tom="urgente" icone="alerta">Passou da data estimada</Selo></div>
          : novo && aoData ? <div className="fi-por"><Selo tom="ativo">Novo</Selo></div> : null}
        {aoData && aoEntrou ? (
          <div className="rv-acoes">
            <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoData(r)}>
              <Icone nome="agenda" className="ico" />Mudar a data<span className="sr"> de {r.cliente.nome}</span>
            </button>
            <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoEntrou(r)} aria-label={`Entrou na conta: ${TIPOS_REQUISICAO[r.tipo].titulo} de ${r.cliente.nome}`}>
              <Icone nome="moeda" className="ico" />Entrou na conta
            </button>
          </div>
        ) : null}
      </div>
      <div className="fi-lado">
        <span className="fi-v num">{reais(r.parteEscritorio)}</span>
        <span className="fi-pq">do escritório{r.parteRegra ? ` (${r.parteRegra})` : ""}</span>
      </div>
    </li>
  );
}

/** O ofício requisitório anexado (F3.88): o nome, com o abrir. */
function Oficio({ a }: { a: NonNullable<RequisicaoACaminho["oficio"]> }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="fi-por">
      <span className="fi-docs">
        <button className="jr-link fi-doc-bt" type="button" onClick={() => void abrirAnexo(a.id).then(setErro)}>
          <Icone nome="doc" className="ico" />Ofício anexado<span className="sr">: abrir {a.nome}</span>
        </button>
        {erro ? <span role="alert" className="fi-pq">{erro}</span> : null}
      </span>
    </div>
  );
}

/** A folha "A caminho": em Repasses, com as ações; no Caixa, só para ver, com o link para Repasses. */
export function FolhaACaminho({ a, titulo = "A caminho", ateMes, aoRegistrar, aoData, aoEntrou, verEm }: {
  a: ACaminho; titulo?: string; ateMes?: string;
  aoRegistrar?: () => void; aoData?: (r: RequisicaoACaminho) => void; aoEntrou?: (r: RequisicaoACaminho) => void; verEm?: string;
}) {
  return (
    <section className="folha" aria-labelledby="t-cam" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-cam" tabIndex={-1}><Icone nome="balanca" className="ico" />{titulo}</h2>
          <p className="sub">RPV e precatório expedidos que ainda não entraram</p>
        </div>
        {a.n && aoRegistrar ? (
          <div className="acoes">
            <button className="btn btn-sec" type="button" onClick={aoRegistrar}><Icone nome="mais" className="ico" />Registrar expedido</button>
          </div>
        ) : a.n && verEm ? (
          <div className="acoes"><a className="btn btn-sec" href={verEm}><Icone nome="dir" className="ico" />Ver em Repasses</a></div>
        ) : null}
      </div>
      {a.n ? (
        <>
          <ul className="fi-linhas">
            {a.itens.map((r) => <LinhaACaminho key={r.id} r={r} ateMes={ateMes} aoData={aoData} aoEntrou={aoEntrou} />)}
          </ul>
          <p className="fi-total"><span>Parte do escritório em {contar(a.n, "requisição", "requisições")}</span><b className="num">{reais(a.total)}</b></p>
          <p className="pt-pe-folha">
            <Icone nome="escudo" className="ico" />
            <span>Só a parte do escritório, pelo contrato, conta na previsão. O resto é do cliente e vira repasse quando o dinheiro entrar.</span>
          </p>
        </>
      ) : (
        <Estado icone="balanca" titulo="Nenhum RPV ou precatório a caminho"
          acoes={aoRegistrar ? <button className="btn btn-pri" type="button" onClick={aoRegistrar}><Icone nome="mais" className="ico" />Registrar expedido</button> : undefined}>
          Quando o tribunal expedir um RPV ou um precatório de um cliente, registre aqui, com a data estimada. A parte do escritório entra na previsão do Caixa antes do dinheiro chegar.
        </Estado>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------- Registrar o expedido

export function JanelaExpedido({ casos, aoFechar, aoFeito }: { casos: ListaRepasses["casos"]; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const opcoes = casos.flatMap((c) => (c.clientes ?? []).map((k) => ({ valor: `${c.id}|${k.id}`, rotulo: `${k.nome} · ${c.nome}${c.parteContraria ? ` × ${c.parteContraria}` : ""}`, cliente: k.nome })));
  const [tipo, setTipo] = useState<TipoRequisicao>("RPV");
  const [alvo, setAlvo] = useState(opcoes.length === 1 ? opcoes[0]!.valor : "");
  const [numero, setNumero] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [devedor, setDevedor] = useState("");
  const [valor, setValor] = useState("");
  const [exp, setExp] = useState(diaBr(hoje));
  const [est, setEst] = useState(mesBr(estimadaSugerida("RPV", hoje)));
  const [mexeuEst, setMexeuEst] = useState(false);
  const [parte, setParte] = useState<{ chave: string; valor: number; regra: string | null; contrato: string | null } | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const tem = (c: string) => erros.includes(c);
  const total = lerCentavos(valor);
  const [casoId, clienteId] = alvo ? alvo.split("|") : [null, null];
  const nomeCliente = opcoes.find((o) => o.valor === alvo)?.cliente ?? "o cliente";
  const chave = casoId && clienteId && total ? `${alvo}|${total}` : null;
  const p = parte && parte.chave === chave ? parte : null;
  const expD = lerDia(exp);
  const estM = lerMes(est);

  // A data estimada acompanha o tipo e a expedição, até a pessoa mudar à mão.
  const sugerir = (t: TipoRequisicao, e: string) => {
    const d = lerDia(e);
    if (!mexeuEst && d) setEst(mesBr(estimadaSugerida(t, d)));
  };

  // A parte do escritório pelo contrato: os honorários de êxito da divisão proposta.
  useEffect(() => {
    if (!chave) return;
    const n = ++seq.current;
    void chamarPortal<PropostaRepasse>("/v1/escritorio/financeiro/repasses/proposta", { metodo: "POST", corpo: { casoId, clienteId, valor: total } }).then((r) => {
      if (n !== seq.current) return;
      const hon = r.ok ? r.dados.linhas.filter((x) => x.para === "HONORARIOS") : [];
      setParte({
        chave, valor: hon.reduce((s, x) => s + x.valor, 0),
        regra: hon[0] ? `${hon[0].regra.split(" · ")[0]} de êxito` : null,
        contrato: r.ok && r.dados.contrato ? r.dados.contrato.numero : null,
      });
    });
  }, [chave, casoId, clienteId, total]);

  async function enviar() {
    if (enviando) return;
    const e: string[] = [];
    if (!alvo) e.push("casoId");
    if (tribunal.trim().length < 2) e.push("tribunal");
    if (devedor.trim().length < 2) e.push("devedor");
    if (!total) e.push("valor");
    if (!expD || expD > hoje) e.push("expedidoEm");
    if (!estM || (expD && estM < `${expD.slice(0, 7)}-01`)) e.push("estimadaMes");
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<RequisicaoACaminho>("/v1/escritorio/financeiro/a-caminho", {
      metodo: "POST",
      corpo: { tipo, casoId, clienteId, tribunal: tribunal.trim(), devedor: devedor.trim(), numero: numero.trim() || null, valor: total, expedidoEm: expD, estimadaMes: estM },
    });
    if (r.ok) {
      setErros([]);
      let texto = `${reais(r.dados.parteEscritorio)} do escritório entram na previsão do Caixa em ${mesAno(r.dados.estimadaMes)}. Nada entra no caixa agora.`;
      // O registro já existe; a falha do arquivo não o desfaz.
      if (arquivo) {
        setProgresso(0);
        const erro = await enviarAnexo("REQUISICAO", r.dados.id, arquivo, null, setProgresso);
        setProgresso(null);
        texto += erro ? " O ofício não foi guardado: o registro ficou sem ele." : " Ofício anexado.";
      }
      setEnviando(false);
      return aoFeito({ titulo: `${TIPOS_REQUISICAO[tipo].titulo} a caminho registrado.`, texto });
    }
    setEnviando(false);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map((c) => (c === "clienteId" ? "casoId" : String(c))));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(`${textoDoErro(r.erro)} Nada foi salvo e a previsão do Caixa não mudou. O que você preencheu continua aqui.`);
  }

  const campo = (id: string, chaveErro: string, rot: string, v: string, set: (x: string) => void, extra: { ajuda?: string; erro: string; opc?: boolean; im?: "decimal" | "numeric"; foco?: boolean; mudou?: (x: string) => void }) => (
    <div className="campo">
      <label htmlFor={id}>{rot}{extra.opc ? <span className="opcional"> (opcional)</span> : null}</label>
      <input className="entrada" id={id} type="text" inputMode={extra.im} autoComplete="off" value={v}
        onChange={(e) => { set(e.target.value); extra.mudou?.(e.target.value); setErros((x) => x.filter((c) => c !== chaveErro)); }}
        aria-invalid={tem(chaveErro) || undefined} aria-describedby={descritoPor(!tem(chaveErro) && !!extra.ajuda && `${id}-aj`, tem(chaveErro) && `${id}-er`)} />
      {tem(chaveErro) ? <ErroCampo id={`${id}-er`}>{extra.erro}</ErroCampo> : extra.ajuda ? <p className="ajuda" id={`${id}-aj`}>{extra.ajuda}</p> : null}
    </div>
  );

  return (
    <Janela id="j-exp" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="Repasses · a caminho" titulo="Registrar RPV ou precatório expedido" descricao="j-exp-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}><Icone nome="check" className="ico" />Registrar a caminho</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-exp-d">Antes do dinheiro entrar. Quando entrar, ele vira levantamento, com a divisão do contrato.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>O {TIPOS_REQUISICAO[tipo].titulo} ainda não foi registrado.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo={`Não deu para registrar o ${TIPOS_REQUISICAO[tipo].titulo}.`}>{falha}</Aviso> : null}
        <fieldset className="fi-grupo-op">
          <legend>O que foi expedido</legend>
          <div className="rv-dois-op">
            {(Object.keys(TIPOS_REQUISICAO) as TipoRequisicao[]).map((t) => (
              <label className="opcao" key={t}>
                <input className="marcar" type="radio" name="rv-t" value={t} checked={tipo === t} data-foco={tipo === t ? "" : undefined}
                  onChange={() => { setTipo(t); sugerir(t, exp); }} />
                <span>{TIPOS_REQUISICAO[t].titulo}<small>{TIPOS_REQUISICAO[t].ajuda}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="rv-caso">Caso</label>
            <select className="entrada" id="rv-caso" value={alvo} onChange={(e) => { setAlvo(e.target.value); setErros((x) => x.filter((c) => c !== "casoId")); }}
              aria-invalid={tem("casoId") || undefined} aria-describedby={descritoPor(tem("casoId") && "rv-caso-er")}>
              <option value="">{opcoes.length ? "Escolha o caso" : "Nenhum caso cadastrado"}</option>
              {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
            {tem("casoId") ? <ErroCampo id="rv-caso-er">Escolha o caso e o cliente do requisitório.</ErroCampo> : null}
          </div>
          {campo("rv-num", "numero", "Número do requisitório", numero, setNumero, { opc: true, erro: "O número tem até 60 caracteres." })}
        </div>
        <div className="fi-dois">
          {campo("rv-trib", "tribunal", "Tribunal", tribunal, setTribunal, { erro: "Escreva o tribunal, por exemplo: TJSP." })}
          {campo("rv-dev", "devedor", "Quem paga", devedor, setDevedor, { erro: "Escreva quem paga, por exemplo: INSS." })}
        </div>
        <div className="fi-dois">
          {campo("rv-req", "valor", "Valor requisitado", valor, setValor, { im: "decimal", ajuda: "Como está no ofício requisitório.", erro: "Escreva o valor requisitado, como está no ofício." })}
          {campo("rv-exp", "expedidoEm", "Expedido em", exp, setExp, { im: "numeric", ajuda: "dd/mm/aaaa", erro: "Escreva a data da expedição, hoje ou antes, no formato dd/mm/aaaa.", mudou: (x) => sugerir(tipo, x) })}
        </div>
        {campo("rv-est", "estimadaMes", "Data estimada de pagamento", est, (x) => { setEst(x); setMexeuEst(true); }, {
          im: "numeric",
          ajuda: `mm/aaaa. Sugerida pelo tipo: ${tipo === "RPV" ? "RPV, 2 meses depois de expedido" : "precatório, dezembro do ano seguinte se apresentado até 2 de abril"}. Mude se o tribunal disser outra.`,
          erro: `A data estimada vem depois da expedição${expD ? ` (${diaBr(expD)})` : ""}, no formato mm/aaaa.${expD ? ` Para ${TIPOS_REQUISICAO[tipo].titulo}, costuma ser ${mesBr(estimadaSugerida(tipo, expD))}.` : ""}`,
        })}
        <div className="rv-parte">
          <p className="fi-rotulo">Parte do escritório, pelo contrato</p>
          <div className="rv-parte-l">
            <span>
              <b>{p?.regra ? `Honorários · ${p.regra}` : "Honorários de êxito"}</b>
              <small>{p ? (p.contrato ? `Contrato ${p.contrato}` : "Sem contrato com êxito neste caso: nada do escritório") : "Escolha o caso e escreva o valor"}</small>
            </span>
            <span className="fi-v num">{p ? reais(p.valor) : "—"}</span>
          </div>
          <div className="rv-parte-l rv-cli">
            <span><b>{nomeCliente === "o cliente" ? "Do cliente" : `De ${nomeCliente}`}</b><small>Vira repasse quando o dinheiro entrar</small></span>
            <span className="fi-v num">{p && total ? reais(total - p.valor) : "—"}</span>
          </div>
        </div>
        {p && p.valor && estM ? (
          <p className="rv-prev">
            <Icone nome="moeda" className="ico" />
            <span>Os <b>{reais(p.valor)}</b> do escritório entram na previsão do Caixa em <b>{mesAno(estM)}</b>, em âmbar, e no Falta receber dos Relatórios, à parte. Nada entra no caixa agora.</span>
          </p>
        ) : null}
        <CampoAnexo rotulo="Ofício requisitório" ajuda="O PDF do ofício, se já tiver." arquivo={arquivo}
          aoEscolher={(a, er) => { setArquivo(er ? null : a); setErroArq(er); }} erro={erroArq} progresso={progresso} />
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Mudar a data

export function JanelaDataRequisicao({ r, hoje, aoFechar, aoFeito }: { r: RequisicaoACaminho; hoje: string; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [vai, setVai] = useState(true);
  const [nova, setNova] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const esteMes = `${hoje.slice(0, 7)}-01`;
  const novaM = lerMes(nova);

  async function enviar() {
    if (enviando) return;
    const e = [...(vai && (!novaM || novaM < esteMes) ? ["estimadaMes"] : []), ...(motivo.trim().length < 5 ? ["motivo"] : [])];
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const x = await chamarPortal<RequisicaoACaminho>(`/v1/escritorio/financeiro/a-caminho/${r.id}/data`, {
      metodo: "POST", corpo: vai ? { situacao: "A_CAMINHO", estimadaMes: novaM, motivo: motivo.trim() } : { situacao: "NAO_VAI_ENTRAR", motivo: motivo.trim() },
    });
    setEnviando(false);
    if (x.ok) {
      return aoFeito(vai
        ? { titulo: "Data estimada mudada.", texto: `${reais(r.parteEscritorio)} do escritório na previsão do Caixa em ${mesAno(novaM!)}. A data anterior ficou no histórico.` }
        : { titulo: "Marcado como não vai entrar.", texto: `${r.cliente.nome} saiu de “A caminho” e da previsão do Caixa. O motivo ficou no histórico.` });
    }
    const campos = x.erro.detalhes?.campos;
    if (x.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(`${textoDoErro(x.erro)} Nada foi salvo.`);
  }

  return (
    <Janela id="j-rvd" aberta aoFechar={aoFechar} sobretitulo="Repasses · a caminho" titulo="Mudar a data estimada" descricao="j-rvd-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}><Icone nome="check" className="ico" />Salvar a data</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-rvd-d">Quando o tribunal muda a previsão, ou quando a requisição não vai mais ser paga.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A data ainda não mudou.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Não deu para mudar a data.">{falha}</Aviso> : null}
        <div className="fi-alvo">
          <Icone nome="balanca" className="ico" />
          <div>
            <strong>{r.cliente.nome} · {TIPOS_REQUISICAO[r.tipo].titulo}</strong>
            <small>{r.tribunal} · estimada para {mesAno(r.estimadaMes)}{r.passou ? ", já passou" : ""}</small>
          </div>
          <span className="fi-v num">{reais(r.parteEscritorio)}</span>
        </div>
        <fieldset className="fi-grupo-op">
          <legend>O que aconteceu</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name="rv-d" checked={vai} onChange={() => setVai(true)} data-foco={vai ? "" : undefined} />
            <span>Ainda vai entrar<small>Escreva a nova data estimada.</small></span>
          </label>
          {vai ? (
            <div className="pd-op-dentro campo">
              <label htmlFor="rv-nova">Nova data estimada</label>
              <input className="entrada" id="rv-nova" type="text" inputMode="numeric" autoComplete="off" value={nova} onChange={(e) => setNova(e.target.value)}
                aria-invalid={tem("estimadaMes") || undefined} aria-describedby={descritoPor(!tem("estimadaMes") && "rv-nova-aj", tem("estimadaMes") && "rv-nova-er")} />
              {tem("estimadaMes") ? <ErroCampo id="rv-nova-er">Escreva o mês, deste em diante, no formato mm/aaaa.</ErroCampo> : <p className="ajuda" id="rv-nova-aj">mm/aaaa</p>}
            </div>
          ) : null}
          <label className="opcao">
            <input className="marcar" type="radio" name="rv-d" checked={!vai} onChange={() => setVai(false)} data-foco={!vai ? "" : undefined} />
            <span>Não vai entrar<small>Por exemplo, a requisição foi cancelada. Sai da previsão e fica no histórico, com o motivo.</small></span>
          </label>
        </fieldset>
        <div className="campo">
          <div className="pd-campo-linha">
            <label htmlFor="rv-dmot">Por quê</label>
            <span className="contador" aria-hidden="true">{motivo.length} de 300</span>
          </div>
          <textarea className="entrada" id="rv-dmot" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            aria-invalid={tem("motivo") || undefined} aria-describedby={descritoPor(!tem("motivo") && "rv-dmot-aj", tem("motivo") && "rv-dmot-er")} />
          {tem("motivo") ? <ErroCampo id="rv-dmot-er">Escreva o motivo, com pelo menos 5 letras.</ErroCampo> : <p className="ajuda" id="rv-dmot-aj">Obrigatório. Fica no histórico do RPV.</p>}
        </div>
        <p className="fi-ref">
          <Icone nome="moeda" className="ico" />
          <span>
            {vai
              ? <>Os {reais(r.parteEscritorio)} do escritório {r.passou ? "voltam" : "vão"} à previsão do Caixa {novaM ? <>em <b>{mesAno(novaM)}</b></> : "no mês novo"} e ao Falta receber dos Relatórios, à parte. A data anterior fica no histórico.</>
              : <>Os {reais(r.parteEscritorio)} do escritório saem da previsão do Caixa e do Falta receber. O registro fica, com o motivo.</>}
          </span>
        </p>
      </div>
    </Janela>
  );
}
