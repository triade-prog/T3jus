"use client";
// Console › Cobrança › fatura aberta (CO-06), telas aprovadas em
// docs/design/aprovadas/console-cobranca (estados 8 a 19): a abertura com o total, os itens,
// "Como pagar", o histórico, o que fazer (registrar pagamento, lembrete agora, cancelar) e para
// quem vai. O banco confere a versão: registrar de novo nunca conta o pagamento duas vezes.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FORMAS_ASSINATURA, mesPorExtenso } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { brl, centavosDe, dataBr, diasEntre, lerDataBr, numeroFatura, reaisDe, type FaturaAberta } from "./cobranca.ts";
import { formatarCnpj } from "./ficha.ts";
import { CARTEIRA, chamarConsole, COBRANCA, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import {
  BotaoBaixarDoc, ComoPagar, FormaFatura, hrefAssinatura, HistoricoFatura, ProximosLembretes, SeloFatura, SituacaoDoc, useBaixarDoc,
} from "./PecasCobranca.tsx";
import { hora } from "./tempo.ts";

/** Como foi pago, no registro manual (nomes do desenho). */
export const FORMAS_MANUAL: [string, string][] = [
  ["PIX", "Pix fora da cobrança"],
  ["TRANSFERENCIA", "Transferência bancária"],
  ["BOLETO", "Boleto pago por outro canal"],
  ["DINHEIRO", "Dinheiro"],
  ["OUTRA", "Outra"],
];

const MOTIVO_MAX = 300;

type Falha = { tipo: "conflito"; quem: string | null; em: string | null } | { tipo: "rede"; codigo: string } | { tipo: "erro"; erro: ErroApi };

function falhaDe(r: { status: number; erro: ErroApi }): Falha {
  if (r.status === 409) {
    const d = r.erro.detalhes ?? {};
    return { tipo: "conflito", quem: typeof d.quem === "string" ? d.quem : null, em: typeof d.em === "string" ? d.em : null };
  }
  if (r.status === 0 || r.status >= 500) return { tipo: "rede", codigo: `CNS-${Date.now().toString(36).slice(-4).toUpperCase()}` };
  return { tipo: "erro", erro: r.erro };
}

/** Registrar pagamento manual: para quem pagou fora da cobrança (desenho, decisão 4). */
export function JanelaPagamento({ titulo, sobretitulo, totalCentavos, vencimento, hoje, email, socio, caminho, versao, aoFechar, aoPagar }: {
  titulo?: string;
  sobretitulo: string;
  totalCentavos: number;
  vencimento: string;
  hoje: string;
  email: string;
  socio: string | null;
  caminho: string;
  /** Sem versão: a parcela do carnê (a fatura do mês nasce paga). */
  versao?: number;
  aoFechar: () => void;
  aoPagar: (devolvido: boolean) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [data, setData] = useState(dataBr(hoje));
  const [valor, setValor] = useState(reaisDe(totalCentavos));
  const [forma, setForma] = useState("PIX");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [falha, setFalha] = useState<Falha | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (falha?.tipo === "conflito") return aoFechar();
    setFalha(null);
    const e = new Set<string>();
    const iso = lerDataBr(data);
    const c = centavosDe(valor);
    if (!iso || iso > hoje) e.add("pagoEm");
    if (c !== totalCentavos) e.add("valor");
    if (!motivo.trim()) e.add("motivo");
    setErros(e);
    if (e.size) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarConsole<{ acessoDevolvido?: boolean }>(caminho, {
      corpo: { ...(versao ? { versao } : {}), pagoEm: iso, valorCentavos: c, forma, motivo: motivo.trim() },
    });
    setEnviando(false);
    if (!r.ok) {
      const campos = r.erro.detalhes?.campos;
      if (r.status === 422 && Array.isArray(campos) && campos.length) {
        setErros(new Set(campos.map(String)));
        return focarPrimeiroErro(corpo.current);
      }
      return setFalha(falhaDe(r));
    }
    aoPagar(!!r.dados.acessoDevolvido);
  }

  const n = erros.size;
  return (
    <Janela id={`${ids}-j`} aberta aoFechar={aoFechar} sobretitulo={sobretitulo} titulo={titulo ?? "Registrar pagamento"} descricao={`${ids}-d`}
      aoEnviar={() => void enviar()}
      pe={
        falha?.tipo === "conflito" ? (
          <>
            <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" data-foco="">
              <Icone nome="olho" className="ico" />
              Fechar e conferir
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-fantasma" type="button" onClick={aoFechar} disabled={enviando} data-foco={n ? undefined : ""}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
              {enviando ? <span className="fc-giro" aria-hidden="true" /> : <Icone nome={falha?.tipo === "rede" ? "reenviar" : "check"} className="ico" />}
              {enviando ? "Registrando…" : falha?.tipo === "rede" ? "Tentar de novo" : "Registrar pagamento"}
            </button>
          </>
        )
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>
          Use quando o escritório pagou fora da cobrança. Valor: {brl(totalCentavos)}, vence em {dataBr(vencimento)}.
        </p>
        {enviando ? (
          <p className="sr" role="status">
            Registrando o pagamento…
          </p>
        ) : null}
        {n ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(n)}>
            Nenhum pagamento foi registrado.
          </Aviso>
        ) : falha?.tipo === "conflito" ? (
          <div className="aviso aviso-urgencia" role="alert">
            <Icone nome="alerta" className="ico" />
            <div>
              <strong className="aviso-titulo">
                {falha.quem ?? "Outra pessoa"} registrou um pagamento nesta fatura{falha.em ? ` às ${hora(falha.em)}` : ""}, enquanto a janela estava aberta.
              </strong>
              <p>Nada foi registrado por você, e o que você escreveu continua aqui. Registrar de novo contaria o mesmo pagamento duas vezes: confira antes.</p>
            </div>
          </div>
        ) : falha?.tipo === "rede" ? (
          <div className="aviso aviso-urgencia" role="alert">
            <Icone nome="alerta" className="ico" />
            <div>
              <strong className="aviso-titulo">Não deu para registrar agora.</strong>
              <p>
                A conexão caiu antes de o servidor responder. Nada mudou: a fatura continua em aberto e o que você escreveu está aqui. Tente de novo; se continuar,
                mande o código ao suporte técnico.
              </p>
              <p className="codigo">Código para o suporte: {falha.codigo}</p>
            </div>
          </div>
        ) : falha?.tipo === "erro" ? (
          <Aviso tom="urgencia" titulo="Não deu para registrar.">
            {textoDoErro(falha.erro)}
          </Aviso>
        ) : null}
        <div className="cb-duas">
          <div className="campo">
            <label htmlFor={`${ids}-data`}>Data do pagamento</label>
            <input className="entrada" id={`${ids}-data`} inputMode="numeric" autoComplete="off" value={data} readOnly={enviando}
              onChange={(e) => setData(e.target.value)} aria-invalid={erros.has("pagoEm") || undefined}
              aria-describedby={descritoPor(erros.has("pagoEm") && `${ids}-data-e`, `${ids}-data-a`)} />
            {erros.has("pagoEm") ? <ErroCampo id={`${ids}-data-e`}>A data do pagamento é hoje ou antes. Confira no comprovante.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-data-a`}>
              Dia, mês e ano (dd/mm/aaaa), hoje ou antes.
            </p>
          </div>
          <div className="campo">
            <label htmlFor={`${ids}-valor`}>Valor recebido</label>
            <div className="cb-campo-valor">
              <span className="cb-rs" aria-hidden="true">
                R$
              </span>
              <input className="entrada" id={`${ids}-valor`} inputMode="decimal" autoComplete="off" value={valor} readOnly={enviando}
                onChange={(e) => setValor(e.target.value)} aria-invalid={erros.has("valor") || undefined}
                aria-describedby={descritoPor(erros.has("valor") && `${ids}-valor-e`, `${ids}-valor-a`)} />
            </div>
            {erros.has("valor") ? (
              <ErroCampo id={`${ids}-valor-e`}>
                O valor recebido precisa ser igual ao da fatura, {brl(totalCentavos)}. Se o escritório pagou a menos, combine a diferença e registre quando receber
                tudo.
              </ErroCampo>
            ) : null}
            <p className="ajuda" id={`${ids}-valor-a`}>
              Em reais, com centavos. Total: {brl(totalCentavos)}.
            </p>
          </div>
        </div>
        <div className="campo">
          <label htmlFor={`${ids}-forma`}>Forma</label>
          <select className="entrada" id={`${ids}-forma`} value={forma} onChange={(e) => setForma(e.target.value)} disabled={enviando}>
            {FORMAS_MANUAL.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <div className="fc-rot">
            <label htmlFor={`${ids}-motivo`}>Motivo</label>
            <span className="fc-contador">
              {motivo.length} de {MOTIVO_MAX} caracteres
            </span>
          </div>
          <textarea className="entrada" id={`${ids}-motivo`} rows={3} maxLength={MOTIVO_MAX} value={motivo} readOnly={enviando} aria-required="true"
            onChange={(e) => setMotivo(e.target.value)} aria-invalid={erros.has("motivo") || undefined}
            aria-describedby={descritoPor(erros.has("motivo") && `${ids}-motivo-e`, `${ids}-motivo-a`)} />
          {erros.has("motivo") ? <ErroCampo id={`${ids}-motivo-e`}>Escreva o motivo do registro manual. Ele fica no histórico da fatura.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-motivo-a`}>
            Obrigatório. Fica no histórico da fatura, com seu nome e a hora.
          </p>
        </div>
        <p className="permissao">
          <Icone nome="envelope" className="ico" />
          A fatura passa a Paga e o recibo vai para {email}
          {socio ? `, com cópia para ${socio}` : ""}.
        </p>
      </div>
    </Janela>
  );
}

function JanelaCancelar({ f, aoFechar, aoCancelar }: { f: FaturaAberta; aoFechar: () => void; aoCancelar: () => void }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState(false);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [enviando, setEnviando] = useState(false);
  const mes = mesPorExtenso(f.competencia, true);

  async function enviar() {
    setFalha(null);
    if (!motivo.trim()) {
      setErroMotivo(true);
      return focarPrimeiroErro(corpo.current);
    }
    setErroMotivo(false);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/faturas/${f.id}/cancelar`, { corpo: { versao: f.versao, motivo: motivo.trim() } });
    setEnviando(false);
    if (!r.ok) return setFalha(falhaDe(r));
    aoCancelar();
  }

  return (
    <Janela id={`${ids}-j`} aberta alerta aoFechar={aoFechar} sobretitulo={`Fatura nº ${numeroFatura(f)}`}
      titulo={`Cancelar a fatura de ${mes} da ${f.escritorio.nome}?`} descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={erroMotivo ? undefined : ""}>
            Voltar
          </button>
          <button className="btn fc-perigo-cheio" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="xis" className="ico" />
            {enviando ? "Cancelando…" : "Cancelar a fatura"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>Valor: {brl(f.totalCentavos)}. Para cobrar de novo depois, é preciso uma fatura nova.</p>
        {erroMotivo ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(1)}>
            A fatura não foi cancelada.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="Não deu para cancelar.">
            {falha.tipo === "conflito"
              ? `${falha.quem ?? "Outra pessoa"} mudou esta fatura${falha.em ? ` às ${hora(falha.em)}` : ""}. Feche e confira antes de cancelar.`
              : falha.tipo === "rede"
                ? "A conexão caiu antes de o servidor responder. Nada mudou. Tente de novo."
                : textoDoErro(falha.erro)}
          </Aviso>
        ) : null}
        <ul className="tratar" style={{ padding: 0, margin: 0 }}>
          <li>A fatura não é apagada: fica na lista como Cancelada, com o motivo e o seu nome.</li>
          <li>O Pix e o boleto dela deixam de valer, e a régua para de mandar lembretes.</li>
          <li>A {f.escritorio.nome} recebe um e-mail dizendo que a fatura foi cancelada.</li>
        </ul>
        <div className="campo">
          <label htmlFor={`${ids}-motivo`}>Motivo</label>
          <textarea className="entrada" id={`${ids}-motivo`} rows={3} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            aria-required="true" aria-invalid={erroMotivo || undefined} aria-describedby={descritoPor(erroMotivo && `${ids}-m-e`, `${ids}-m-a`)} />
          {erroMotivo ? <ErroCampo id={`${ids}-m-e`}>Escreva o motivo do cancelamento. Ele fica no histórico da fatura.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-m-a`}>
            Obrigatório. Fica no histórico da fatura. O escritório vê só que a fatura foi cancelada.
          </p>
        </div>
      </div>
    </Janela>
  );
}

function ReservaNota() {
  return (
    <div className="cb-reserva">
      <Icone nome="doc" className="ico" />
      <span>
        <b>Nota fiscal: lugar reservado.</b> A emissão depende do emissor de nota que o T3jus vai contratar. Quando houver, a nota de cada fatura paga aparece aqui e no
        Portal.
      </span>
    </div>
  );
}

export function FaturaConsole({ escritorioId, faturaId }: { escritorioId: string; faturaId: string }) {
  const sessao = useSessaoConsole();
  const ids = useId();
  const [f, setF] = useState<FaturaAberta | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [janela, setJanela] = useState<"pagar" | "cancelar" | null>(null);
  const [feito, setFeito] = useState<{ titulo: string; texto: string } | null>(null);
  const [lembrando, setLembrando] = useState(false);
  const [erroLembrete, setErroLembrete] = useState<ErroApi | null>(null);
  const doc = useBaixarDoc((caminho) => chamarConsole<{ url: string }>(caminho));
  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarConsole<FaturaAberta>(`/v1/clientes/${escritorioId}/faturas/${faturaId}`);
    if (r.ok) setF(r.dados);
    else if (r.status !== 401) setErro(r.erro);
  }, [escritorioId, faturaId]);
  const carregou = useRef(false);
  useEffect(() => {
    if (carregou.current) return;
    carregou.current = true;
    void carregar();
  }, [carregar]);

  const mes = f ? mesPorExtenso(f.competencia) : "";
  const trilha = [
    { nome: "Console", href: CARTEIRA },
    { nome: "Cobrança", href: COBRANCA },
    { nome: f ? `${f.escritorio.nome} · ${mesPorExtenso(f.competencia, true)}/${f.competencia.slice(0, 4)}` : "Fatura" },
  ];

  async function lembrar() {
    if (!f) return;
    setErroLembrete(null);
    setFeito(null);
    setLembrando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/faturas/${f.id}/lembrete`, { corpo: {} });
    setLembrando(false);
    if (!r.ok) return setErroLembrete(r.erro);
    setFeito({ titulo: "Lembrete enviado.", texto: `Mandamos agora um e-mail a ${f.paraQuem.email} com as faturas em aberto. Ficou no histórico.` });
    void carregar();
  }

  if (sessao && !sessao.acoes.includes("console.cobranca.ver")) {
    return (
      <MolduraConsole atual="cobranca" pagina="co-cobranca" sessao={sessao} trilha={trilha}>
        <Aviso tom="info" titulo="Esta página é de Administração e Financeiro.">
          Na ficha de cada escritório, a aba Assinatura mostra o plano e a situação da cobrança.
        </Aviso>
      </MolduraConsole>
    );
  }

  return (
    <MolduraConsole atual="cobranca" pagina="co-cobranca" sessao={sessao} trilha={trilha}>
      {erro ? (
        erro.codigo === "NOT_FOUND" || erro.codigo === "FORBIDDEN" ? (
          <Aviso tom="urgencia" titulo="Esta fatura não está na sua carteira.">
            Ou o endereço está errado. Volte para Cobrança e abra a fatura por lá.
          </Aviso>
        ) : (
          <ErroAoCarregar oque="a fatura" aoTentar={() => void carregar()} />
        )
      ) : !f ? (
        <Carregando rotulo="Carregando a fatura…" linhas={4} />
      ) : (
        (() => {
          const aberta = f.situacao === "A_VENCER" || f.situacao === "VENCE_HOJE" || f.situacao === "EM_ATRASO";
          const encerrado = f.escritorio.contrato === "ENCERRADO" || f.escritorio.contrato === "CONSULTA" || f.escritorio.contrato === "GUARDA";
          const dias = diasEntre(f.hoje, f.vencimento);
          const formaTexto = f.parcela ? `Carnê · parcela ${f.parcela.numero} de ${f.parcela.de}` : FORMAS_ASSINATURA[f.forma];
          const rotulo = f.situacao === "PAGA" ? "Recebido" : f.situacao === "CANCELADA" ? "Valor cancelado" : f.situacao === "EM_ATRASO" ? "Em aberto" : "Total da fatura";
          return (
            <>
              <div className="cb-fat-cab">
                <div className="esq campo-vinho">
                  <Icone nome="fatura" className="ico estatua" />
                  <a className="cb-voltar" href={COBRANCA}>
                    <Icone nome="esquerda" className="ico ico-s" />
                    Faturas
                  </a>
                  <div>
                    <p className="sobretitulo">
                      Fatura nº {numeroFatura(f)} · {mes}
                    </p>
                    <h1>{f.escritorio.nome}</h1>
                  </div>
                  <p className="meta">
                    <SeloFatura f={f} />
                    <span>Plano {f.plano}</span>
                    <span className="sep" aria-hidden="true" />
                    <span>{f.situacao === "EM_ATRASO" ? `Venceu em ${dataBr(f.vencimento)}` : aberta ? `Vence em ${dataBr(f.vencimento)}` : `Venceria em ${dataBr(f.vencimento)}`}</span>
                    <span className="sep" aria-hidden="true" />
                    <span>{formaTexto}</span>
                  </p>
                </div>
                <section className="dir campo-ambar" aria-labelledby={`${ids}-total`}>
                  <p className="sobretitulo" id={`${ids}-total`}>
                    {rotulo}
                  </p>
                  <p className="cb-total">{brl(f.totalCentavos)}</p>
                  <p>
                    {f.situacao === "PAGA" ? (
                      <>
                        Paga em <b>{dataBr(f.pagaEm!)}</b>
                        {f.pagamentoManual ? `, registrada à mão por ${f.pagamentoManual.por}` : ""}. O recibo foi para o e-mail de cobrança.
                      </>
                    ) : f.situacao === "CANCELADA" ? (
                      <>
                        Cancelada em <b>{dataBr(f.cancelamento?.em ?? f.canceladaEm ?? f.hoje)}</b>
                        {f.cancelamento?.por ? ` por ${f.cancelamento.por}` : ""}. Nada foi cobrado.
                      </>
                    ) : f.situacao === "EM_ATRASO" ? (
                      <>
                        Venceu em <b>{dataBr(f.vencimento)}</b>, há {f.atrasoDias} {f.atrasoDias === 1 ? "dia" : "dias"}.
                      </>
                    ) : f.situacao === "VENCE_HOJE" ? (
                      <>
                        Vence <b>hoje</b>. Emitida em {dataBr(f.emitidaEm)}.
                      </>
                    ) : (
                      <>
                        Vence em <b>{dataBr(f.vencimento)}</b>, daqui a {dias} {dias === 1 ? "dia" : "dias"}. Emitida em {dataBr(f.emitidaEm)}.
                      </>
                    )}
                  </p>
                </section>
              </div>

              {f.situacao === "EM_ATRASO" ? (
                <section className={(f.atrasoDias ?? 0) >= 30 ? "cb-atraso" : "cb-atraso cb-ate30"} aria-labelledby={`${ids}-atr`}>
                  <p className="cb-dias" aria-hidden="true">
                    <b>{f.atrasoDias}</b>
                    <small>{f.atrasoDias === 1 ? "dia" : "dias"}</small>
                  </p>
                  <div className="cb-txt">
                    <p className="sobretitulo">{(f.atrasoDias ?? 0) >= 30 ? "Em atraso há mais de 30 dias" : "Em atraso"}</p>
                    <h2 id={`${ids}-atr`}>A fatura de {mes} está em aberto</h2>
                    <p>
                      {encerrado
                        ? "O contrato terminou: a régua parou e os lembretes agora são manuais. Ainda dá para registrar o pagamento ou cancelar a fatura, com motivo."
                        : (f.atrasoDias ?? 0) >= 30
                          ? f.escritorio.soConsultaDesde
                            ? "O Portal do escritório está só para consulta. Ao pagar, ele volta ao normal sozinho."
                            : "Passou de 30 dias: a Administração decide se o Portal fica só para consulta até o pagamento. "
                          : (f.atrasoDias ?? 0) >= 7
                            ? "Desde o 7º dia, o Portal mostra um aviso de atraso ao sócio dono. "
                            : "A régua manda os lembretes por e-mail ao sócio dono. "}
                      {!encerrado ? <b>Nenhum dado é apagado</b> : null}
                      {!encerrado ? " e a exportação continua liberada." : null}
                    </p>
                    <p className="sr">
                      {f.atrasoDias} dias em atraso.
                    </p>
                  </div>
                  {f.proporConsulta && !encerrado ? (
                    <div className="cb-botoes">
                      {f.permissoes.soConsulta ? (
                        <a className="btn btn-perigo" href={`${hrefAssinatura(f.escritorio.id)}?consulta=1`}>
                          <Icone nome="cadeado" className="ico" />
                          Passar o Portal para só consulta
                        </a>
                      ) : (
                        <p className="permissao">
                          <Icone nome="cadeado" className="ico" />
                          Quem passa o Portal para só consulta é a Administração.
                        </p>
                      )}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {feito ? <Aviso tom="sucesso" className="toast" titulo={feito.titulo}>{feito.texto}</Aviso> : null}

              <div className="grade">
                <div className="col">
                  {f.parcela ? (
                    <section className="cb-parcela-faixa" aria-labelledby={`${ids}-parc`}>
                      <Icone nome="carne" className="ico" />
                      <div>
                        <strong id={`${ids}-parc`}>
                          Parcela {f.parcela.numero} de {f.parcela.de} do carnê {f.parcela.carne}
                        </strong>
                        <p>O Pix e o boleto desta fatura são os mesmos da página {f.parcela.numero} do carnê.</p>
                      </div>
                      <div className="acoes">
                        <a className="btn btn-sec" href={hrefAssinatura(f.escritorio.id)}>
                          <Icone nome="carne" className="ico" />
                          Ver o carnê
                        </a>
                      </div>
                    </section>
                  ) : null}
                  <section className="folha" aria-labelledby={`${ids}-itens`} style={{ overflow: "hidden" }}>
                    <div className="folha-cab">
                      <div>
                        <h2 id={`${ids}-itens`}>Itens da fatura</h2>
                        <p className="sub">Em reais, com os centavos exatos. {f.pessoasAtivas} {f.pessoasAtivas === 1 ? "pessoa ativa" : "pessoas ativas"} no dia da emissão.</p>
                      </div>
                    </div>
                    <table className="cb-itens">
                      <caption className="sr">Itens da fatura</caption>
                      <thead>
                        <tr>
                          <th scope="col">Descrição</th>
                          <th scope="col" className="cb-valor">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.itens.map((i, k) => (
                          <tr key={k} className={i.valorCentavos < 0 ? "cb-desc" : undefined}>
                            <td>
                              {i.tipo === "MENSALIDADE" ? "Mensalidade" : i.tipo === "PESSOA_A_MAIS" ? "Pessoa a mais" : "Desconto de entrada"}
                              <small>
                                {i.descricao}
                                {i.tipo === "PESSOA_A_MAIS" && i.valorUnitarioCentavos ? ` · ${i.quantidade} × ${brl(i.valorUnitarioCentavos)}` : ""}
                              </small>
                              {i.tipo === "DESCONTO" && i.motivo ? <small className="cb-motivo-item">“{i.motivo}”</small> : null}
                            </td>
                            <td className="cb-valor">{brl(i.valorCentavos)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row">Total</th>
                          <td className="cb-valor">{brl(f.totalCentavos)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </section>
                  {f.situacao === "CANCELADA" ? (
                    <section className="folha" aria-labelledby={`${ids}-cp`} style={{ overflow: "hidden" }}>
                      <div className="folha-cab">
                        <div>
                          <h2 id={`${ids}-cp`}>Como pagar</h2>
                        </div>
                      </div>
                      <p className="cb-nao-vale">
                        <Icone nome="xis" className="ico" />
                        <span>Esta fatura foi cancelada. O Pix e o boleto dela não valem mais; se alguém pagar por engano, o valor é devolvido.</span>
                      </p>
                      {f.cancelamento?.motivo ? (
                        <p style={{ padding: "0 24px 20px" }}>
                          <span className="cb-motivo">“{f.cancelamento.motivo}”</span>
                        </p>
                      ) : null}
                    </section>
                  ) : f.situacao === "PAGA" ? (
                    <section className="folha" aria-labelledby={`${ids}-pg`} style={{ overflow: "hidden" }}>
                      <div className="folha-cab">
                        <div>
                          <h2 id={`${ids}-pg`}>Pagamento</h2>
                          <p className="sub">O Pix e o boleto desta fatura não valem mais.</p>
                        </div>
                      </div>
                      <dl className="cb-dl">
                        <div>
                          <dt>Pago em</dt>
                          <dd>{dataBr(f.pagaEm!)}</dd>
                        </div>
                        <div>
                          <dt>Como</dt>
                          <dd>{f.baixa === "MANUAL" ? FORMAS_MANUAL.find(([k]) => k === f.formaPaga)?.[1] ?? "Registro manual" : "Pelo meio de pagamento"}</dd>
                        </div>
                        {f.pagamentoManual ? (
                          <div>
                            <dt>Registrado por</dt>
                            <dd>
                              {f.pagamentoManual.por}
                              <small>em {dataBr(f.pagamentoManual.em)}, às {hora(f.pagamentoManual.em)}</small>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                      {f.pagamentoManual?.motivo ? (
                        <p style={{ padding: "0 20px 18px" }}>
                          <span className="cb-motivo">“{f.pagamentoManual.motivo}”</span>
                        </p>
                      ) : null}
                    </section>
                  ) : (
                    <ComoPagar pagamento={f.pagamento} carne={f.parcela?.numero} />
                  )}
                  <HistoricoFatura eventos={f.historico} hoje={f.hoje} futuro={aberta && f.proximos.length ? <ProximosLembretes proximos={f.proximos} /> : undefined} />
                </div>
                <aside className="col" aria-label="Ações da fatura">
                  <section className="folha" aria-labelledby={`${ids}-acoes`}>
                    <div className="folha-cab" style={{ paddingBottom: 8 }}>
                      <h2 id={`${ids}-acoes`} style={{ fontSize: 20 }}>
                        O que fazer
                      </h2>
                    </div>
                    <div className="cb-acoes">
                      {(() => {
                        // A fatura em PDF sai em qualquer situação; o recibo, só da fatura paga (F1.21).
                        const base = `/v1/clientes/${f.escritorio.id}/faturas/${f.id}`;
                        const de = `de ${mes}`;
                        return (
                          <>
                            <BotaoBaixarDoc doc={doc} chave="fatura" caminho={`${base}/pdf`} rotulo="Baixar a fatura (PDF)" />
                            <SituacaoDoc doc={doc} chave="fatura" de={`da fatura ${de}`} nadaMudou="Nada mudou na fatura." contato="o suporte" />
                            {f.situacao === "PAGA" ? (
                              <>
                                <BotaoBaixarDoc doc={doc} chave="recibo" caminho={`${base}/recibo`} rotulo="Baixar o recibo (PDF)" />
                                <SituacaoDoc doc={doc} chave="recibo" de={`do recibo ${de}`} nadaMudou="Nada mudou no pagamento." contato="o suporte" />
                              </>
                            ) : null}
                          </>
                        );
                      })()}
                      {aberta && f.permissoes.editar ? (
                        <>
                          <button className="btn btn-pri" type="button" onClick={() => { setFeito(null); setJanela("pagar"); }}>
                            <Icone nome="pagar" className="ico" />
                            Registrar pagamento
                          </button>
                          <button className="btn btn-sec" type="button" onClick={() => void lembrar()} aria-busy={lembrando || undefined}>
                            <Icone nome="envelope" className="ico" />
                            {lembrando ? "Mandando…" : "Mandar lembrete agora"}
                          </button>
                          {erroLembrete ? <Aviso tom="urgencia">{textoDoErro(erroLembrete)}</Aviso> : null}
                          <button className="btn btn-perigo" type="button" onClick={() => { setFeito(null); setJanela("cancelar"); }}>
                            <Icone nome="xis" className="ico" />
                            Cancelar a fatura
                          </button>
                        </>
                      ) : f.situacao === "PAGA" ? (
                        <p className="permissao">
                          <Icone nome="cadeado" className="ico" />
                          Uma fatura paga não se cancela nem se apaga. Ela fica guardada com o registro do pagamento.
                        </p>
                      ) : f.situacao === "CANCELADA" ? (
                        <p className="permissao">
                          <Icone nome="cadeado" className="ico" />
                          Uma fatura cancelada não volta a valer e não é apagada. Ela fica na lista, com o motivo, como prova do que foi combinado.
                        </p>
                      ) : null}
                      {f.situacao !== "CANCELADA" ? (
                        <>
                          <hr />
                          <ReservaNota />
                          <button className="btn btn-sec" type="button" aria-disabled="true" aria-describedby={`${ids}-nf`}>
                            <Icone nome="doc" className="ico" />
                            Ver a nota fiscal
                          </button>
                          <p className="permissao" id={`${ids}-nf`}>
                            <Icone nome="cadeado" className="ico" />
                            Ainda não emitimos nota pelo sistema.
                          </p>
                        </>
                      ) : null}
                    </div>
                  </section>
                  <section className="folha" aria-labelledby={`${ids}-para`}>
                    <div className="folha-cab" style={{ paddingBottom: 6 }}>
                      <h2 id={`${ids}-para`} style={{ fontSize: 20 }}>
                        Para quem vai
                      </h2>
                    </div>
                    <dl className="cb-dl">
                      <div>
                        <dt>E-mail de cobrança</dt>
                        <dd>{f.paraQuem.email}</dd>
                      </div>
                      {f.paraQuem.socio ? (
                        <div>
                          <dt>Cópia</dt>
                          <dd>
                            {f.paraQuem.socio}
                            <small>sócio dono</small>
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>CNPJ da nota</dt>
                        <dd className="num">{f.assinatura.cnpjNota ? formatarCnpj(f.assinatura.cnpjNota) : f.escritorio.cnpj ? formatarCnpj(f.escritorio.cnpj) : "Não informado"}</dd>
                      </div>
                      <div>
                        <dt>Forma</dt>
                        <dd>
                          <FormaFatura forma={f.forma} />
                          {f.parcela ? <small>parcela {f.parcela.numero} de {f.parcela.de}</small> : null}
                        </dd>
                      </div>
                      <div>
                        <dt>Plano</dt>
                        <dd>{f.plano}</dd>
                      </div>
                    </dl>
                    <div style={{ padding: "0 20px 18px" }}>
                      <a className="btn btn-sec" href={hrefAssinatura(f.escritorio.id)} style={{ width: "100%" }}>
                        <Icone nome="coluna" className="ico" />
                        {f.parcela ? "Ver a assinatura e o carnê" : "Ver a assinatura"}
                      </a>
                    </div>
                  </section>
                </aside>
              </div>
              {janela === "pagar" ? (
                <JanelaPagamento sobretitulo={`Fatura nº ${numeroFatura(f)} · ${f.escritorio.nome}`} totalCentavos={f.totalCentavos} vencimento={f.vencimento}
                  hoje={f.hoje} email={f.paraQuem.email} socio={f.paraQuem.socio} versao={f.versao}
                  caminho={`/v1/clientes/${f.escritorio.id}/faturas/${f.id}/pagamento-manual`}
                  aoFechar={() => {
                    setJanela(null);
                    void carregar();
                  }}
                  aoPagar={(devolvido) => {
                    setJanela(null);
                    setFeito({
                      titulo: "Pagamento registrado.",
                      texto: `A fatura de ${mes} da ${f.escritorio.nome} está paga. O recibo vai para ${f.paraQuem.email}.${devolvido ? " O Portal do escritório voltou ao normal." : ""}`,
                    });
                    void carregar();
                  }} />
              ) : janela === "cancelar" ? (
                <JanelaCancelar f={f} aoFechar={() => setJanela(null)}
                  aoCancelar={() => {
                    setJanela(null);
                    setFeito({ titulo: "Fatura cancelada.", texto: `A ${f.escritorio.nome} recebe um e-mail dizendo que a fatura de ${mes} foi cancelada. O motivo ficou no histórico.` })
                    void carregar();
                  }} />
              ) : null}
            </>
          );
        })()
      )}
    </MolduraConsole>
  );
}
