"use client";
// Ficha do contrato (CH-01 a CH-04, CH-06), desenho aprovado em
// docs/design/aprovadas/portal-comercial-contratos (estados criado, contrato,
// contrato-recebimentos e contrato-sem-financeiro; decisões 19 a 21): cabeçalho vinho, âmbar
// com o próximo passo (registrar a assinatura) ou o próximo recebimento, abas Contrato,
// Recebimentos e Documentos. A programação nasce na assinatura; mudar condição de contrato
// ativo pede motivo; encerrar para as cobranças novas e não apaga nada.

import { useCallback, useEffect, useRef, useState } from "react";
import { dataBr, hojeBrasilia, reais, type EventoContrato, type FichaContrato, type RecebimentoPrevisto } from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { diaCurto, lerDia } from "./agenda.ts";
import { Selo } from "./Comercial.tsx";
import { fraseDoContrato, janelaProgramacao, juntarItens, nomeSituacaoContrato, ROTAS_CONTRATOS, SELO_CONTRATO } from "./contratos.ts";
import { Toast } from "./FichaCliente.tsx";
import { CondicoesLeitura, SeloTipo } from "./Honorarios.tsx";
import { chamarPortal, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Aba = "contrato" | "recebimentos" | "documentos";
type Feito = { titulo: string; texto: string };

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");

/** A frase "Gera:" de cada condição na ficha do contrato. */
function geraNoContrato(f: FichaContrato) {
  return (c: FichaContrato["condicoes"][number]): string => {
    const n = f.recebimentos.filter((r) => r.tipo === c.tipo && !r.cancelado).length;
    const assinado = f.situacao !== "ELABORACAO";
    switch (c.tipo) {
      case "FIXO":
      case "PARCELADO":
      case "MENSAL":
        return assinado ? `${n === 1 ? "1 recebimento programado" : `${n} recebimentos programados`}.` : "Vira recebimento programado quando a assinatura for registrada.";
      case "EXITO":
        return "Quando o caso chegar à etapa, quem marca informa o valor e o Financeiro é avisado.";
      case "SUCUMBENCIA":
        return `Vira valor a receber quando o caso chegar a “${c.etapa}”.`;
      case "ATO":
        return "Cada ato marcado como feito no caso vira valor a receber.";
      case "RECORRENTE":
        return c.etapa
          ? `Começa quando o caso chegar a “${c.etapa}”. Lembrete para ${f.responsavel.nome}.`
          : assinado ? `${n} ${n === 1 ? "mês programado" : "meses programados"}; o valor de cada um sai quando a base for informada. Lembrete para ${f.responsavel.nome}.` : `Lembrete para ${f.responsavel.nome} todo dia ${c.diaLembrete}.`;
    }
  };
}

function Dir({ f, aoAssinar }: { f: FichaContrato; aoAssinar: () => void }) {
  if (f.situacao === "ELABORACAO") {
    return (
      <section className="dir campo-ambar" aria-labelledby="t-px">
        <p className="sobretitulo" id="t-px">Próximo passo</p>
        <p className="grande" style={{ fontSize: 30 }}>Assinatura</p>
        <p className="hn-oque"><b>Colha a assinatura do contrato.</b><br />Ao registrar a assinatura, a programação vai ao Financeiro.</p>
        <div className="hn-dir-acoes">
          <button data-muda className="btn btn-pri" type="button" onClick={aoAssinar}>
            <Icone nome="check" className="ico" />
            Registrar assinatura
          </button>
        </div>
      </section>
    );
  }
  if (f.situacao === "ENCERRADO") {
    return (
      <section className="dir campo-ambar" aria-labelledby="t-px">
        <p className="sobretitulo" id="t-px">Encerrado{f.encerradoEm ? ` em ${diaCurto(diaDoInstante(f.encerradoEm))}` : ""}</p>
        <p className="grande" style={{ fontSize: 30 }}>Sem cobranças novas</p>
        <p className="hn-oque">{f.motivoEncerramento ? <><b>“{f.motivoEncerramento}”</b><br /></> : null}O que já venceu continua no Financeiro.</p>
      </section>
    );
  }
  const p = f.proximo;
  return (
    <section className="dir campo-ambar" aria-labelledby="t-pr">
      <p className="sobretitulo" id="t-pr">Próximo recebimento</p>
      {p ? (
        <>
          <div className="hn-dir-linha">
            <p className="grande">{diaCurto(p.em)}</p>
            <Selo tom="ativo">{p.valor ? `${reais(p.valor)}${p.aDefinir ? " + a definir" : ""}` : "a definir"}</Selo>
          </div>
          <p className="hn-oque"><b>{juntarItens(p.itens)}</b><br />{f.financeiro ? "no Financeiro, em A receber" : "na programação do contrato"}</p>
        </>
      ) : (
        <p className="hn-oque"><b>Nada programado à frente.</b><br />O que depende do caso entra quando a etapa for marcada.</p>
      )}
      <a className="btn btn-pri" href={ROTAS_CONTRATOS.recebimentos(f.id)}>
        <Icone nome="carteira" className="ico" />
        Ver recebimentos
      </a>
    </section>
  );
}

function Pessoas({ f }: { f: FichaContrato }) {
  const adv = f.advogados.filter((a) => a.id !== f.responsavel.id);
  const respAdv = f.advogados.some((a) => a.id === f.responsavel.id);
  return (
    <section className="folha" aria-labelledby="t-rs">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-rs" style={{ fontSize: 20 }}>Responsáveis</h2></div>
      </div>
      <ul className="hn-pessoas">
        <li>
          <span className="av-p forte" aria-hidden="true">{iniciais(f.responsavel.nome)}</span>
          <div><strong>{f.responsavel.nome}</strong><small>Responsável{respAdv ? " e advogado no contrato" : ""}</small></div>
          <Selo tom="ativo">Recebe os lembretes</Selo>
        </li>
        {adv.map((a) => (
          <li key={a.id}>
            <span className="av-p forte" aria-hidden="true">{iniciais(a.nome)}</span>
            <div><strong>{a.nome}</strong><small>Advogado no contrato</small></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Assinatura({ f }: { f: FichaContrato }) {
  return (
    <section className="folha" aria-labelledby="t-as">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-as" style={{ fontSize: 20 }}>Assinatura</h2></div>
      </div>
      <dl className="hn-dl">
        <div><dt>Assinado em</dt><dd>{f.assinadoEm ? dataBr(f.assinadoEm) : "Ainda não"}</dd></div>
        {f.assinaturaPor ? <div><dt>Registrado por</dt><dd>{f.assinaturaPor.nome}</dd></div> : null}
        {f.proposta ? <div><dt>Veio da proposta</dt><dd><a href={ROTAS_CONTRATOS.proposta(f.proposta.id)}>{f.proposta.numero}</a></dd></div> : null}
        <div><dt>Cliente</dt><dd><a href={ROTAS_CONTRATOS.cliente(f.cliente.id)}>{f.cliente.nome}</a></dd></div>
      </dl>
      <div className="hn-reserva">
        <div>
          <Icone nome="lapis" className="ico" />
          <span><b>Assinatura eletrônica:</b> em estudo. Por enquanto, imprime-se, assina-se e registra-se a data aqui.</span>
        </div>
      </div>
    </section>
  );
}

function Situacao({ f, aoEncerrar }: { f: FichaContrato; aoEncerrar: () => void }) {
  const texto = f.situacao === "ATIVO"
    ? `Ativo desde ${f.assinadoEm ? dataBr(f.assinadoEm) : ""}. Mudar uma condição pede o motivo e refaz só os recebimentos futuros. Encerrar para as cobranças novas; nada é apagado.`
    : f.situacao === "ELABORACAO"
      ? "Em elaboração: ainda sem programação. Se o cliente desistiu de assinar, encerre com o motivo; nada é apagado."
      : `Encerrado. ${f.motivoEncerramento ? `Motivo: “${f.motivoEncerramento}”.` : ""}`;
  return (
    <section className="folha" aria-labelledby="t-st">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-st" style={{ fontSize: 20 }}>Situação</h2></div>
      </div>
      <div className="hn-folha-acao">
        <p>{texto}</p>
        {f.situacao !== "ENCERRADO" ? (
          <button data-muda className="btn btn-perigo" type="button" onClick={aoEncerrar}>
            <Icone nome="pasta" className="ico" />
            Encerrar contrato
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Historico({ eventos, hoje }: { eventos: EventoContrato[]; hoje: string }) {
  const dias: { dia: string; itens: { e: EventoContrato; f: NonNullable<ReturnType<typeof fraseDoContrato>> }[] }[] = [];
  for (const e of eventos) {
    const f = fraseDoContrato(e);
    if (!f) continue;
    const dia = diaDoInstante(e.em);
    const ult = dias[dias.length - 1];
    if (ult?.dia === dia) ult.itens.push({ e, f });
    else dias.push({ dia, itens: [{ e, f }] });
  }
  return (
    <section className="folha" aria-labelledby="t-hc" style={{ overflow: "hidden" }}>
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-hc" style={{ fontSize: 20 }}>Histórico</h2></div>
      </div>
      {dias.map((g) => (
        <div className="eventos-dia" key={g.dia}>
          <h3>{dataBr(g.dia)}{g.dia === hoje ? " · hoje" : ""}</h3>
          <ol className="eventos">
            {g.itens.map(({ e, f }, i) => (
              <li key={`${e.em}-${i}`}>
                <time dateTime={e.em}>{horaDoInstante(e.em)}</time>
                <span className={f.forte ? "pto forte" : "pto"} aria-hidden="true" />
                <div>
                  <p>{e.autor && e.acao !== "contrato.responsavel_passado" ? <><b>{e.autor}</b> </> : null}{f.oque}</p>
                  {f.detalhe ? <small>{f.detalhe}</small> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

function Recebimentos({ f, hoje, dono }: { f: FichaContrato; hoje: string; dono: string | undefined }) {
  const j = janelaProgramacao(f.recebimentos, hoje);
  const variaveis = f.condicoes.filter((c) => c.tipo === "EXITO" || c.tipo === "SUCUMBENCIA" || c.tipo === "ATO" || (c.tipo === "RECORRENTE" && c.etapa));
  return (
    <section className="folha" aria-labelledby="t-rc" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-rc">Programação dos recebimentos</h2>
          <p className="sub">Gerada das condições do contrato. Mostra os próximos 3 meses e o que já venceu.</p>
        </div>
      </div>
      {f.situacao === "ELABORACAO" ? (
        <Estado icone="carteira" titulo="A programação nasce na assinatura">
          Enquanto o contrato está em elaboração, nada vai para o Financeiro. Registre a assinatura e os recebimentos aparecem aqui.
        </Estado>
      ) : (
        <>
          <div className="ct-totais">
            <div><p>Programado{j.ate ? ` até ${dataBr(j.ate)}` : ""}</p><p className="hn-res-grande num">{reais(j.programado)}</p></div>
            <div><p>Depois dos 3 meses</p><p className="hn-res-grande num">{j.depois}</p></div>
            <div><p>Depende do caso</p><p className="hn-res-grande">{variaveis.length ? juntarItens(variaveis.map((c) => ({ EXITO: "Êxito", SUCUMBENCIA: "Sucumbência", ATO: "Por ato", RECORRENTE: "Recorrente" } as Record<string, string>)[c.tipo]!)) : "Nada"}</p></div>
          </div>
          {j.mostrar.length ? (
            <table className="hn-tab">
              <caption className="sr">Programação dos recebimentos</caption>
              <colgroup>{["16%", "40%", "22%", "22%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead><tr>{["Vencimento", "O quê", "Condição", "Valor"].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead>
              <tbody>
                {j.mostrar.map((r) => <LinhaRecebimento key={r.id} r={r} f={f} />)}
              </tbody>
            </table>
          ) : <Estado icone="carteira" titulo="Nada programado">As condições deste contrato dependem do caso. Quando a etapa for marcada, o valor entra aqui.</Estado>}
        </>
      )}
      {f.financeiro ? (
        <p className="hn-pe"><Icone nome="carteira" className="ico" /><span>É a mesma programação que o Financeiro vai ver em A receber. Pagamentos, atrasos e baixas se registram lá.</span></p>
      ) : (
        <p className="hn-pe"><Icone nome="cadeado" className="ico" /><span>Se cada recebimento foi pago ou está em atraso fica no Financeiro, que não está liberado para você.{dono ? ` Quem libera é ${dono}, sócio dono.` : ""}</span></p>
      )}
    </section>
  );
}

function LinhaRecebimento({ r, f }: { r: RecebimentoPrevisto; f: FichaContrato }) {
  const c = f.condicoes.find((x) => x.tipo === r.tipo);
  return (
    <tr className={r.cancelado ? "ct-cancelado" : undefined}>
      <td><b className="num">{dataBr(r.vencimento)}</b></td>
      <td data-r="O quê">
        {r.descricao}
        {r.cancelado ? <><br /><small>Cancelado: {r.cancelado.motivo}</small></> : null}
        {r.base ? <><br /><small>Base de {reais(r.base.valor)}, informada por {r.base.por.nome}</small></> : null}
      </td>
      <td data-r="Condição">{c ? <SeloTipo c={c} /> : null}</td>
      <td data-r="Valor"><span className="num hn-valor-c">{r.valor ? reais(r.valor) : "a definir"}</span></td>
    </tr>
  );
}

function Documentos() {
  return (
    <section className="folha" aria-labelledby="t-dc">
      <div className="folha-cab">
        <div><h2 id="t-dc">Documentos</h2><p className="sub">Contrato, procuração e declaração gerados com os dados do cliente e dos advogados.</p></div>
      </div>
      <Estado icone="doc" titulo="Os documentos chegam numa próxima entrega">
        Gerar o contrato, a procuração e a declaração no timbrado do escritório e anexar o assinado ainda está sendo preparado. Por enquanto, faça no Word e registre a data da assinatura neste contrato.
      </Estado>
      <div className="hn-reserva">
        <div>
          <Icone nome="lapis" className="ico" />
          <span><b>Assinatura eletrônica: em estudo.</b> O lugar fica reservado.</span>
        </div>
      </div>
    </section>
  );
}

function JanelaAssinatura({ aberta, f, aoFechar, aoFeito }: { aberta: boolean; f: FichaContrato; aoFechar: () => void; aoFeito: (n: number) => void }) {
  const hoje = hojeBrasilia();
  const [em, setEm] = useState(dataBr(hoje));
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  async function enviar() {
    const dia = lerDia(em);
    setFalha(null);
    if (!dia || dia > hoje) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ recebimentos: number }>(`/v1/escritorio/contratos/${f.id}/assinatura`, { metodo: "POST", corpo: { versao: f.versao, assinadoEm: dia } });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados.recebimentos);
    if (r.erro.codigo === "VALIDATION_ERROR") {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Alguém mudou este contrato agora há pouco. Feche, recarregue a página e registre de novo." : textoDoErro(r.erro));
  }
  return (
    <Janela id="j-assinatura" aberta={aberta} aoFechar={aoFechar} sobretitulo={`${f.numero} · ${f.cliente.nome}`} titulo="Registrar assinatura" descricao="j-assinatura-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Registrar e ativar
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-assinatura-d">O contrato fica ativo e a programação dos recebimentos passa a existir, a partir de hoje. Fica no histórico, com seu nome e a hora.</p>
        {falha ? <Aviso tom="urgencia" titulo="A assinatura não foi registrada.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="as-data">Data da assinatura</label>
          <input className="entrada" id="as-data" type="text" inputMode="numeric" autoComplete="off" value={em} onChange={(e) => setEm(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor("as-data-aj", erro && "as-data-er")} />
          <p className="ajuda" id="as-data-aj">dd/mm/aaaa. Hoje ou antes, desde a criação do contrato.</p>
          {erro ? <ErroCampo id="as-data-er">Escreva a data da assinatura, hoje ou antes, desde que o contrato foi criado, no formato dd/mm/aaaa.</ErroCampo> : null}
        </div>
      </div>
    </Janela>
  );
}

function JanelaEncerrar({ aberta, f, aoFechar, aoFeito }: { aberta: boolean; f: FichaContrato; aoFechar: () => void; aoFeito: (n: number) => void }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  async function enviar() {
    setFalha(null);
    if (motivo.trim().length < 3) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ cancelados: number }>(`/v1/escritorio/contratos/${f.id}/encerrar`, { metodo: "POST", corpo: { versao: f.versao, motivo: motivo.trim() } });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados.cancelados);
    if (r.erro.codigo === "VALIDATION_ERROR") {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Alguém mudou este contrato agora há pouco. Feche, recarregue a página e tente de novo." : textoDoErro(r.erro));
  }
  const futuros = f.recebimentos.filter((r) => !r.cancelado && r.vencimento > hojeBrasilia()).length;
  return (
    <Janela id="j-encerrar" aberta={aberta} aoFechar={aoFechar} alerta sobretitulo={`${f.numero} · ${f.cliente.nome}`} titulo="Encerrar contrato" descricao="j-encerrar-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-perigo" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="pasta" className="ico" />
            Encerrar contrato
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-encerrar-d">
          {futuros ? `${futuros === 1 ? "O recebimento que ainda ia vencer fica cancelado" : `Os ${futuros} recebimentos que ainda iam vencer ficam cancelados`}, com o motivo. ` : ""}
          O que já venceu continua como está. Nada é apagado, e o encerramento não se desfaz.
        </p>
        {falha ? <Aviso tom="urgencia" titulo="O contrato não foi encerrado.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="en-mot">Motivo</label>
          <textarea className="entrada" id="en-mot" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor("en-mot-aj", erro && "en-mot-er")} />
          <p className="ajuda" id="en-mot-aj">Ex.: serviço concluído; cliente desistiu de assinar. Fica no histórico.</p>
          {erro ? <ErroCampo id="en-mot-er">Escreva o motivo, de 3 a 500 letras.</ErroCampo> : null}
        </div>
      </div>
    </Janela>
  );
}

function FichaConteudo({ id, aba, escritorio, aoNumero }: { id: string; aba: Aba; escritorio: EscritorioPortal; aoNumero: (n: string) => void }) {
  const [f, setF] = useState<FichaContrato | null | "erro" | "nao">(null);
  const [janela, setJanela] = useState<"assinatura" | "encerrar" | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const hoje = hojeBrasilia();

  const carregar = useCallback(async () => {
    const r = await chamarPortal<FichaContrato>(`/v1/escritorio/contratos/${id}`);
    setF(r.ok ? r.dados : r.status === 404 ? "nao" : "erro");
    if (r.ok) aoNumero(r.dados.numero);
  }, [id, aoNumero]);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.has("criado") ? { titulo: "Contrato criado", texto: "Ele está em elaboração. Colha a assinatura e registre-a: aí a programação vai para o Financeiro." }
      : q.has("mudado") ? { titulo: "Mudanças salvas", texto: "A versão anterior fica no histórico do contrato." } : null;
    if (!t) return;
    q.delete("criado");
    q.delete("mudado");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    void Promise.resolve().then(() => setFeito(t));
  }, []);

  if (f === "erro") return <ErroAoCarregar oque="o contrato" aoTentar={() => void carregar()} />;
  if (f === "nao") return <ErroAoCarregar oque="o contrato" aoTentar={() => void carregar()} texto="Ele não existe ou é de outro escritório. Volte para Contratos e abra de novo." />;
  if (!f) return <Carregando rotulo="Carregando o contrato…" linhas={4} />;
  const ficha = f;
  const s = SELO_CONTRATO[f.situacao];
  const vivos = f.recebimentos.filter((r) => !r.cancelado).length;
  const mudar = f.situacao !== "ENCERRADO" ? (
    <a data-muda className="btn btn-sec" href={ROTAS_CONTRATOS.mudar(f.id)}>
      <Icone nome="lapis" className="ico" />
      Mudar condições
    </a>
  ) : undefined;

  return (
    <div className="hn">
      <div className="ficha-cab">
        <div className="esq campo-vinho">
          <Icone nome="pena" className="ico estatua" />
          <a className="voltar" href={ROTAS_CONTRATOS.contratos}>
            <Icone nome="esquerda" className="ico ico-s" />
            Contratos
          </a>
          <div className="ident">
            <div>
              <p className="sobretitulo">Contrato {f.numero}</p>
              <h1>{f.cliente.nome}</h1>
              <p className="meta">
                <span className={`selo selo-${s.tom === "andamento" ? "ativo" : s.tom}`}>{nomeSituacaoContrato(f.situacao)}</span>
                <span>{f.objeto}</span>
              </p>
            </div>
          </div>
        </div>
        <Dir f={f} aoAssinar={() => setJanela("assinatura")} />
      </div>
      <nav className="abas" aria-label="Seções do contrato">
        <a href={ROTAS_CONTRATOS.contrato(f.id)} aria-current={aba === "contrato" ? "page" : undefined}>Contrato</a>
        <a href={ROTAS_CONTRATOS.recebimentos(f.id)} aria-current={aba === "recebimentos" ? "page" : undefined}>Recebimentos<span className="q">{vivos}</span></a>
        <a href={ROTAS_CONTRATOS.documentos(f.id)} aria-current={aba === "documentos" ? "page" : undefined}>Documentos</a>
      </nav>
      {aba === "recebimentos" ? <Recebimentos f={f} hoje={hoje} dono={escritorio.socios[0]} />
        : aba === "documentos" ? <Documentos />
        : (
          <div className="hn-grade">
            <div className="hn-col">
              <CondicoesLeitura condicoes={f.condicoes} sub={f.proposta && f.situacao === "ELABORACAO" ? "Copiadas da proposta aceita." : "O que se combinou. Cada condição diz o que gera."}
                acoes={mudar} gera={geraNoContrato(f)} />
              {f.observacoes ? (
                <section className="folha" aria-labelledby="t-ob">
                  <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-ob">Cláusulas do escritório</h2></div></div>
                  <div className="cm-escopo">{f.observacoes.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
                </section>
              ) : null}
              <Historico eventos={f.historico} hoje={hoje} />
            </div>
            <aside className="hn-col" aria-label="Sobre o contrato">
              <Pessoas f={f} />
              <Assinatura f={f} />
              <Situacao f={f} aoEncerrar={() => setJanela("encerrar")} />
            </aside>
          </div>
        )}
      <JanelaAssinatura key={janela === "assinatura" ? "a" : "x"} aberta={janela === "assinatura"} f={f} aoFechar={() => setJanela(null)}
        aoFeito={(n) => {
          setJanela(null);
          setFeito({ titulo: "Assinatura registrada", texto: `O contrato está ativo. ${n === 1 ? "1 recebimento foi programado" : `${n} recebimentos foram programados`}.` });
          void carregar();
        }} />
      <JanelaEncerrar key={janela === "encerrar" ? "e" : "y"} aberta={janela === "encerrar"} f={ficha} aoFechar={() => setJanela(null)}
        aoFeito={(n) => {
          setJanela(null);
          setFeito({ titulo: "Contrato encerrado", texto: n ? `${n === 1 ? "1 recebimento que ainda ia vencer foi cancelado" : `${n} recebimentos que ainda iam vencer foram cancelados`}. Nada foi apagado.` : "Nada foi apagado." });
          void carregar();
        }} />
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function FichaContratoPortal({ id, aba = "contrato" }: { id: string; aba?: Aba }) {
  const [numero, setNumero] = useState("Contrato");
  return (
    <MolduraArea area="CONTRATOS" secao="contratos" trilha={[{ nome: numero }]} pagina="co-ficha">
      {(e) => <FichaConteudo id={id} aba={aba} escritorio={e} aoNumero={setNumero} />}
    </MolduraArea>
  );
}
