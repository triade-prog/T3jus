"use client";
// O êxito para conferir (F3.14: CH-07, EX-08), desenho aprovado em
// docs/design/aprovadas/portal-exito-conferir (estados receber-conferir, conferir, conferir-erro,
// conferir-erro-valor, nao-cobrar e conferido): o bloco do alto do A receber, que só aparece
// quando há algo e fica fora dos números do alto (decisão 2), a janela "Conferir o êxito", que
// lança a parcela em A receber (decisão 1: sempre que for cobrar) e pede o motivo quando o valor
// muda (decisão 3), e a janela "Não cobrar este êxito", com motivo e explicação.
// F3.199 (D39, docs/design/aprovadas/portal-exito-alvara-conferir): com honorários do alvará já
// entrados, a janela de conferir avisa que a parcela nasce paga, e o "Não cobrar" é recusado (C2).

import { useEffect, useRef, useState } from "react";
import {
  dataBr, FORMAS_PAGAMENTO, MOTIVOS_NAO_COBRAR, percentual, reais, RESULTADOS_CASO,
  type ExitoLancado, type ExitoParaConferir, type ExitosParaConferir, type FormaPagamento, type MotivoNaoCobrar,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaBr, diaCurto, lerDia } from "./agenda.ts";
import { Selo } from "./Comercial.tsx";
import { primeiroNome } from "./equipe.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { diaDaSemanaCurto, ROTAS_JURIDICO } from "./juridico.ts";
import { chamarPortal } from "./Moldura.tsx";
import { AVISO_NAO_COBRAR_ALVARA, avisoConferir, fraseDinheiroPeloEscritorio, recusaNaoCobrar } from "./exito_alvara.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const paraCampo = (c: number) => reais(c).replace(/^R\$\s?/, "");
const resultado = (x: ExitoParaConferir) => (x.caso.resultado ? RESULTADOS_CASO[x.caso.resultado].toLowerCase() : "encerrado");

/** A conta do êxito, escrita: 30% de R$ 28.000,00. */
export const contaDoExito = (x: Pick<ExitoParaConferir, "percentual" | "base">) => `${percentual(x.percentual)} de ${reais(x.base)}`;

/** O bloco "Êxito para conferir" do alto do A receber. Só aparece quando há algo. */
export function BlocoExitos({ dados, aoConferir }: { dados: ExitosParaConferir; aoConferir: (x: ExitoParaConferir) => void }) {
  if (!dados.n) return null;
  return (
    <section className="folha ex-bloco" aria-labelledby="t-ex">
      <header className="ex-cab">
        <div>
          <h2 id="t-ex"><Icone nome="balanca" className="ico" />Êxito para conferir</h2>
          <p>{contar(dados.n, "cliente", "clientes")} · {reais(dados.total)} calculados pelo contrato</p>
        </div>
        <Selo tom="atencao" icone="relogio">{dados.n === 1 ? "1 esperando você" : `${dados.n} esperando você`}</Selo>
      </header>
      <table className="hn-tab ex-tab" data-prio-tabela="exito" data-sai3="800" data-sai2="680" data-cartoes="600">
        <caption className="sr">Êxitos calculados no encerramento dos casos, esperando conferência</caption>
        <colgroup>{["25%", "24%", "13%", "11%", "16%", "11%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead>
          <tr>
            <th scope="col">Cliente e caso</th><th scope="col">Contrato e conta</th><th scope="col" style={{ textAlign: "right" }}>Êxito</th>
            <th scope="col">Previsto</th><th scope="col">Quem encerrou</th><th scope="col"><span className="sr">Ação</span></th>
          </tr>
        </thead>
        <tbody>
          {dados.itens.map((x) => (
            <tr key={x.id}>
              <td data-r="Cliente e caso">
                <div className="fi-quem">
                  <b>{x.cliente.nome}</b>
                  <small><a href={ROTAS_JURIDICO.caso(x.caso.id)}>{x.caso.nome}</a> · {resultado(x)}</small>
                </div>
              </td>
              <td data-r="Contrato e conta"><div className="fi-quem"><b>{x.contrato.numero}</b><small>{contaDoExito(x)}</small></div></td>
              <td data-r="Êxito" className="fi-v num"><div className="ex-valor"><b>{reais(x.calculado)}</b><small>calculado</small></div></td>
              <td data-r="Previsto"><div className="fi-dt"><b className="num">{diaCurto(x.previstoEm)}</b><small>{x.previstoEm.slice(0, 4)} · {diaDaSemanaCurto(x.previstoEm)}</small></div></td>
              <td data-r="Quem encerrou">
                <div className="fi-quem"><b>{x.encerrado.por.nome}</b><small>encerrou em {diaCurto(diaDoInstante(x.encerrado.em))}, às {horaDoInstante(x.encerrado.em)}</small></div>
              </td>
              <td data-r="" className="fi-acao hn-acao">
                <button className="btn btn-pri btn-compacto" type="button" onClick={() => aoConferir(x)}>
                  <Icone nome="check" className="ico" />Conferir<span className="sr"> o êxito de {x.cliente.nome}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-pe-folha">
        <Icone nome="ajuda" className="ico" />
        <span>
          Vem do Jurídico quando um caso termina com ganho ou acordo: o T3jus calcula pelo contrato de cada cliente. <b>Nada é cobrado antes de alguém do Financeiro conferir.</b> Estes valores ainda não entram nos números abaixo.
        </span>
      </p>
    </section>
  );
}

/** "Conferir o êxito": lança a parcela em A receber, ou leva a "Não cobrar este êxito". */
export function JanelaConferir({ x, aoFechar, aoNaoCobrar, aoFeito }: {
  x: ExitoParaConferir; aoFechar: () => void; aoNaoCobrar: () => void; aoFeito: (r: ExitoLancado, valor: number) => void;
}) {
  const [valor, setValor] = useState(paraCampo(x.calculado));
  const [venc, setVenc] = useState(diaBr(x.previstoEm));
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const c = lerCentavos(valor);
  const mudou = c !== null && c > 0 && c !== x.calculado;
  const nome = primeiroNome(x.cliente.nome);
  // F3.199 (ea-conferir): os honorários do alvará que já entraram pagam a parcela ao lançar. O
  // aviso é uma região viva (role="status"): o valor dele só muda quando a pessoa para de digitar,
  // para o leitor de tela ler o aviso uma vez, e não a cada tecla (revisão de código, nota 7).
  const [cAviso, setCAviso] = useState(c);
  useEffect(() => {
    if (c === cAviso) return;
    const t = setTimeout(() => setCAviso(c), 600);
    return () => clearTimeout(t);
  }, [c, cAviso]);
  const alvara = avisoConferir(x, cAviso);

  async function enviar() {
    const e: string[] = [];
    if (!c) e.push("valor");
    else if (mudou && motivo.trim().length < 3) e.push("motivoAjuste");
    if (!lerDia(venc)) e.push("vencimento");
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<ExitoLancado>(`/v1/escritorio/financeiro/exitos/${x.id}/lancar`, {
      metodo: "POST", corpo: { valor: c, vencimento: lerDia(venc), forma, motivoAjuste: mudou ? motivo.trim() : null },
    });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados, c!);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.detalhes?.motivo === "JA_CONFERIDO" ? "Outra pessoa já conferiu este êxito. Feche e recarregue a página." : textoDoErro(r.erro));
  }

  return (
    <Janela id="j-conferir" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="A receber · Êxito para conferir" titulo="Conferir o êxito" descricao="j-conferir-d"
      aoEnviar={() => void enviar()}
      pe={
        <div className="ex-pe">
          <button className="btn btn-fantasma ex-nao" type="button" onClick={aoNaoCobrar}>Não cobrar este êxito</button>
          <span className="ex-pe-dir">
            <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
            <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined} aria-describedby={alvara ? "cf-alvara" : undefined}>
              <Icone nome="check" className="ico" />Lançar em A receber
            </button>
          </span>
        </div>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-conferir-d">Confira a conta antes de cobrar {nome}. Valor e vencimento já vêm preenchidos; mude se precisar.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>O êxito ainda não foi lançado.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="O êxito não foi lançado.">{falha}</Aviso> : null}
        <div className="fi-alvo">
          <Icone nome="balanca" className="ico" />
          <div>
            <strong>{x.cliente.nome} · honorário de êxito</strong>
            <small>{x.caso.nome} · contrato {x.contrato.numero}</small>
          </div>
          <span className="fi-v num">{reais(x.calculado)}</span>
        </div>
        <div className="ex-origem-cab">
          <p className="ex-origem-t"><Icone nome="balanca" className="ico" />De onde veio</p>
          <a className="jr-link" href={ROTAS_JURIDICO.caso(x.caso.id)}>Ver o caso</a>
        </div>
        <dl className="ex-origem">
          <div><dt>Caso</dt><dd><b>{x.caso.nome}</b>{x.caso.numero ? <small>{x.caso.numero}</small> : null}</dd></div>
          <div>
            <dt>Resultado</dt>
            <dd><b>{x.caso.resultado ? RESULTADOS_CASO[x.caso.resultado] : "Encerrado"}</b><small>{x.encerrado.por.nome} encerrou o caso em {dataBr(diaDoInstante(x.encerrado.em))}, às {horaDoInstante(x.encerrado.em)}. “{x.encerrado.motivo}”</small></dd>
          </div>
          <div><dt>Valor para {nome}</dt><dd><b>{reais(x.base)}</b><small>Pagamento previsto: {dataBr(x.previstoEm)}</small></dd></div>
          <div>
            <dt>Contrato</dt>
            <dd><b>{x.contrato.numero}{x.contrato.assinadoEm ? `, assinado em ${dataBr(x.contrato.assinadoEm)}` : ""}</b><small>Êxito de {percentual(x.percentual)} sobre: “{x.sobre}”.</small></dd>
          </div>
          <div className="ex-conta"><dt>Conta</dt><dd><b>{contaDoExito(x)} = {reais(x.calculado)}</b></dd></div>
        </dl>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="cf-valor">Honorário de êxito</label>
            <input className="entrada" id="cf-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} data-foco=""
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor(!tem("valor") && "cf-valor-aj", tem("valor") && "cf-valor-er")} />
            {tem("valor") ? (
              <ErroCampo id="cf-valor-er">Diga o valor do honorário. Se este êxito não vai ser cobrado, use “Não cobrar este êxito”.</ErroCampo>
            ) : (
              <p className="ajuda" id="cf-valor-aj">
                {mudou ? `Era ${reais(x.calculado)}, pelo contrato. Mudou para ${reais(c!)}.` : `Calculado pelo contrato: ${reais(x.calculado)}. Se mudar, o T3jus pede o motivo.`}
              </p>
            )}
          </div>
          <div className="campo">
            <label htmlFor="cf-venc">Vencimento</label>
            <input className="entrada" id="cf-venc" type="text" inputMode="numeric" autoComplete="off" value={venc} onChange={(e) => setVenc(e.target.value)}
              aria-invalid={tem("vencimento") || undefined} aria-describedby={descritoPor(!tem("vencimento") && "cf-venc-aj", tem("vencimento") && "cf-venc-er")} />
            {tem("vencimento") ? <ErroCampo id="cf-venc-er">Escreva uma data que exista, no formato dd/mm/aaaa.</ErroCampo>
              : <p className="ajuda" id="cf-venc-aj">dd/mm/aaaa. Sugerido: o pagamento previsto do {x.caso.resultado === "ACORDO" ? "acordo" : "processo"}.</p>}
          </div>
        </div>
        {mudou ? (
          <div className="campo ex-motivo">
            <label htmlFor="cf-motivo">Por que mudou o valor</label>
            <textarea className="entrada" id="cf-motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={tem("motivoAjuste") || undefined} aria-describedby={descritoPor("cf-motivo-aj", tem("motivoAjuste") && "cf-motivo-er")} />
            <p className="ajuda" id="cf-motivo-aj">Fica no histórico do caso e do contrato, com seu nome e a hora. Quem encerrou o caso é avisado no sino.</p>
            {tem("motivoAjuste") ? <ErroCampo id="cf-motivo-er">Escreva por que o valor mudou, de 3 a 500 letras.</ErroCampo> : null}
          </div>
        ) : null}
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="cf-forma">Forma de pagamento</label>
            <select className="entrada" id="cf-forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)} aria-describedby="cf-forma-aj">
              {(Object.keys(FORMAS_PAGAMENTO) as FormaPagamento[]).map((f) => <option key={f} value={f}>{FORMAS_PAGAMENTO[f]}</option>)}
            </select>
            <p className="ajuda" id="cf-forma-aj">{nome} recebe do processo e paga o escritório.</p>
          </div>
          <div className="campo">
            <p className="ex-rotulo">Responsável pela cobrança</p>
            <p className="ex-fixo"><b>{x.contrato.responsavel.nome}</b><small>O responsável pelo contrato {x.contrato.numero}, como nas outras parcelas.</small></p>
          </div>
        </div>
        {alvara ? null : (
          <p className="fi-ref">
            <Icone nome="ajuda" className="ico" />
            <span>{fraseDinheiroPeloEscritorio(x.caso.resultado)}</span>
          </p>
        )}
        <p className="fi-caixa-fixa">
          <Icone nome="coluna" className="ico" />
          <span>Entra no caixa <b>do escritório</b>: é honorário.</span>
        </p>
        {alvara ? (
          // F3.199: no fim do corpo, logo acima do "Lançar", onde a pessoa decide.
          <Aviso tom={alvara.tom} id="cf-alvara" className="ea-aviso" titulo={alvara.titulo}
            corpo={<>
              {alvara.lista.length ? (
                <ul className="ea-lista" aria-label="Honorários que já entraram">
                  {alvara.lista.map((l) => <li key={l.rotulo}><span>{l.rotulo}</span><b>{reais(l.valor)}</b></li>)}
                </ul>
              ) : null}
              {alvara.paras.map((t) => <p key={t}>{t}</p>)}
            </>}
            acoes={alvara.link ? <a className="ea-ir" href={ROTAS_FINANCEIRO.repasse(alvara.link.levantamentoId)}><Icone nome="enviar" className="ico" />{alvara.link.texto}</a> : undefined} />
        ) : null}
      </div>
    </Janela>
  );
}

/** "Não cobrar este êxito": o motivo e a explicação ficam no histórico (PT-03). */
export function JanelaNaoCobrar({ x, aoVoltar, aoFeito }: { x: ExitoParaConferir; aoVoltar: () => void; aoFeito: () => void }) {
  const [motivo, setMotivo] = useState<MotivoNaoCobrar | "">("");
  const [explicacao, setExplicacao] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  // F3.199 (C2): com os honorários já entrados, a janela recusa antes de enviar.
  const recusa = recusaNaoCobrar(x);

  async function enviar() {
    if (recusa) return;
    const e: string[] = [];
    if (!motivo) e.push("motivo");
    if (explicacao.trim().length < 3) e.push("explicacao");
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<ExitoParaConferir>(`/v1/escritorio/financeiro/exitos/${x.id}/nao-cobrar`, {
      metodo: "POST", corpo: { motivo, explicacao: explicacao.trim() },
    });
    setEnviando(false);
    if (r.ok) return aoFeito();
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  if (recusa) {
    return (
      <Janela id="j-nao-cobrar" aberta aoFechar={aoVoltar} sobretitulo={`${x.cliente.nome} · ${reais(x.calculado)}`} titulo="Não cobrar este êxito" descricao="j-nao-cobrar-d"
        aoEnviar={aoVoltar}
        pe={
          <div className="ea-recusa-pe">
            <button className="btn btn-sec" type="button" aria-disabled="true" aria-describedby="nc-recusa">Não cobrar</button>
            <button className="btn btn-pri" type="button" onClick={aoVoltar} data-foco=""><Icone nome="esquerda" className="ico" />Voltar para conferir</button>
          </div>
        }>
        <div style={{ display: "grid", gap: 16 }}>
          <p id="j-nao-cobrar-d">{recusa.descricao}</p>
          <Aviso tom="atencao" id="nc-recusa" className="ea-aviso" titulo={recusa.titulo}>{recusa.texto}</Aviso>
          <div className="fi-alvo">
            <Icone nome="balanca" className="ico" />
            <div>
              <strong>{x.cliente.nome} · honorário de êxito</strong>
              <small>{x.caso.nome} · {contaDoExito(x)}</small>
            </div>
            <span className="fi-v num">{reais(x.calculado)}</span>
          </div>
        </div>
      </Janela>
    );
  }

  return (
    <Janela id="j-nao-cobrar" aberta aoFechar={aoVoltar} sobretitulo={`${x.cliente.nome} · ${reais(x.calculado)}`} titulo="Não cobrar este êxito" descricao="j-nao-cobrar-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoVoltar}>Voltar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>Não cobrar</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-nao-cobrar-d">O êxito sai da lista para conferir sem virar parcela. O motivo fica no histórico do caso, com seu nome e a hora, e quem encerrou o caso é avisado.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>Nada mudou no êxito.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou no êxito.">{falha}</Aviso> : null}
        <fieldset className="fi-grupo-op" id="nc-motivo" tabIndex={-1} aria-describedby={descritoPor(tem("motivo") && "nc-motivo-er")}>
          <legend>Por que não cobrar</legend>
          {(Object.entries(MOTIVOS_NAO_COBRAR) as [MotivoNaoCobrar, string][]).map(([v, t], i) => (
            <label className="opcao" key={v}>
              <input className="marcar" type="radio" name="nc-motivo" checked={motivo === v} onChange={() => setMotivo(v)} data-foco={i === 0 ? "" : undefined} />
              <span>{t}</span>
            </label>
          ))}
          {tem("motivo") ? <ErroCampo id="nc-motivo-er">Escolha o motivo.</ErroCampo> : null}
        </fieldset>
        <div className="campo">
          <label htmlFor="nc-expl">Explique</label>
          <textarea className="entrada" id="nc-expl" rows={3} value={explicacao} onChange={(e) => setExplicacao(e.target.value)}
            aria-invalid={tem("explicacao") || undefined} aria-describedby={descritoPor("nc-expl-aj", tem("explicacao") && "nc-expl-er")} />
          <p className="ajuda" id="nc-expl-aj">Ex.: renegociado com {primeiroNome(x.cliente.nome)} em troca de pagar as parcelas fixas em dia.</p>
          {tem("explicacao") ? <ErroCampo id="nc-expl-er">Escreva a explicação, de 3 a 1.000 letras.</ErroCampo> : null}
        </div>
        <Aviso tom="info" icone="ajuda" titulo={AVISO_NAO_COBRAR_ALVARA.titulo}>{AVISO_NAO_COBRAR_ALVARA.texto}</Aviso>
      </div>
    </Janela>
  );
}
