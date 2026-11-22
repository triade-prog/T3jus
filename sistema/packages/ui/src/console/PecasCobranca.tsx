"use client";
// Peças da cobrança dos escritórios no Console (CO-06), do desenho aprovado em
// docs/design/aprovadas/console-cobranca: selo da fatura, listas, "Como pagar", histórico e a
// folha do carnê. O Pix e o boleto são um lugar reservado até o meio de pagamento ser escolhido.

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { FORMAS_ASSINATURA, mesPorExtenso } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import {
  brl, competenciaCurta, dataBr, detalheFatura, diaMes, FORMA_ICONE, PASSO_REGUA, porDia, seloFatura, textoEvento,
  type CarneCb, type EventoCb, type FaturaCb,
} from "./cobranca.ts";
import { Aviso } from "./pecas.tsx";
import { hora } from "./tempo.ts";
import type { ErroApi, Resposta } from "../api.ts";

export const hrefFatura = (escritorio: string, fatura: string) => `/cobranca/faturas/${escritorio}/${fatura}`;
export const hrefAssinatura = (escritorio: string) => `/clientes/${escritorio}/assinatura`;

export function SeloFatura({ f, prefixo }: { f: Pick<FaturaCb, "situacao" | "atrasoDias">; prefixo?: string }) {
  const s = seloFatura(f.situacao, f.atrasoDias, prefixo);
  return (
    <span className={`selo ${s.classe}`}>
      <Icone nome={s.icone} className="ico" />
      {s.texto}
    </span>
  );
}

function Situacao({ f, hoje }: { f: FaturaCb; hoje: string }) {
  return (
    <div className="cb-sit">
      <SeloFatura f={f} />
      <small>
        {f.parcela ? `parcela ${f.parcela.numero} de ${f.parcela.de} · ` : ""}
        {detalheFatura(f, hoje)}
      </small>
    </div>
  );
}

export function FormaFatura({ forma }: { forma: FaturaCb["forma"] }) {
  return (
    <span className="cb-forma">
      <Icone nome={FORMA_ICONE[forma]} className="ico" />
      {FORMAS_ASSINATURA[forma]}
    </span>
  );
}

/** Cobrança › Faturas: a lista de todos os escritórios (tabela no computador, cartões no celular). */
export function TabelaFaturas({ faturas, hoje, legenda }: { faturas: FaturaCb[]; hoje: string; legenda: string }) {
  return (
    <>
      <table className="cb-tab so-pc">
        <caption className="sr">{legenda}</caption>
        <colgroup>
          <col style={{ width: "26%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: 64 }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Escritório</th>
            <th scope="col">Competência</th>
            <th scope="col" className="cb-valor">Valor</th>
            <th scope="col">Vencimento</th>
            <th scope="col">Situação</th>
            <th scope="col">Forma</th>
            <th scope="col">
              <span className="sr">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {faturas.map((f) => {
            const esc = f.escritorio!;
            return (
              <tr key={f.id} className={f.situacao === "CANCELADA" ? "cb-off" : undefined}>
                <td>
                  <div className="cb-esc">
                    <a href={hrefAssinatura(esc.id)}>{esc.nome}</a>
                    <small>Fatura nº {f.numero}</small>
                  </div>
                </td>
                <td>{competenciaCurta(f.competencia)}</td>
                <td className="cb-valor">{brl(f.totalCentavos)}</td>
                <td className="num">{dataBr(f.vencimento)}</td>
                <td>
                  <Situacao f={f} hoje={hoje} />
                </td>
                <td>
                  <FormaFatura forma={f.forma} />
                </td>
                <td>
                  <a className="cb-ir" href={hrefFatura(esc.id, f.id)} aria-label={`Abrir a fatura de ${mesPorExtenso(f.competencia)} de ${esc.nome}`}>
                    <Icone nome="dir" className="ico" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="cb-cartoes so-cel" aria-label={legenda}>
        {faturas.map((f) => {
          const esc = f.escritorio!;
          return (
            <li key={f.id} className="cb-cartao">
              <div className="cb-c-topo">
                <div>
                  <a className="cb-c-nome" href={hrefFatura(esc.id, f.id)}>
                    {esc.nome}
                    <span className="sr">, fatura de {mesPorExtenso(f.competencia)}</span>
                  </a>
                  <small>Fatura nº {f.numero}</small>
                </div>
                <span className="cb-c-valor">{brl(f.totalCentavos)}</span>
              </div>
              <Situacao f={f} hoje={hoje} />
              <dl>
                <dt>Competência</dt>
                <dd>{competenciaCurta(f.competencia)}</dd>
                <dt>Vencimento</dt>
                <dd>{dataBr(f.vencimento)}</dd>
                <dt>Forma</dt>
                <dd>{FORMAS_ASSINATURA[f.forma]}</dd>
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** As faturas de um escritório (aba Assinatura): sem a coluna do escritório. */
export function TabelaDoEscritorio({ faturas, hoje, escritorio, legenda, acoes }: {
  faturas: FaturaCb[];
  hoje: string;
  escritorio: string;
  legenda: string;
  /** Ações na própria linha (escritório encerrado: registrar ou cancelar). */
  acoes?: (f: FaturaCb) => ReactNode;
}) {
  return (
    <>
      <table className="cb-tab so-pc">
        <caption className="sr">{legenda}</caption>
        <colgroup>
          <col />
          <col style={{ width: 120 }} />
          <col style={{ width: 116 }} />
          <col style={{ width: 190 }} />
          <col style={{ width: acoes ? 200 : 64 }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Competência</th>
            <th scope="col" className="cb-valor">Valor</th>
            <th scope="col">Vencimento</th>
            <th scope="col">Situação</th>
            <th scope="col">
              <span className="sr">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {faturas.map((f) => (
            <tr key={f.id} className={f.situacao === "CANCELADA" ? "cb-off" : undefined}>
              <td>
                <strong style={{ fontWeight: 500 }}>{competenciaCurta(f.competencia)}</strong>
              </td>
              <td className="cb-valor">{brl(f.totalCentavos)}</td>
              <td className="num">{dataBr(f.vencimento)}</td>
              <td>
                <Situacao f={f} hoje={hoje} />
              </td>
              <td>
                <div className="cb-acoes-linha">
                  {acoes?.(f)}
                  <a className="cb-ir" href={hrefFatura(escritorio, f.id)} aria-label={`Abrir a fatura de ${mesPorExtenso(f.competencia)}`}>
                    <Icone nome="dir" className="ico" />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="cb-cartoes so-cel" aria-label={legenda}>
        {faturas.map((f) => (
          <li key={f.id} className="cb-cartao">
            <div className="cb-c-topo">
              <div>
                <strong className="cb-c-nome">{competenciaCurta(f.competencia)}</strong>
                <small>vence em {dataBr(f.vencimento)}</small>
              </div>
              <span className="cb-c-valor">{brl(f.totalCentavos)}</span>
            </div>
            <Situacao f={f} hoje={hoje} />
            <div className="cb-c-acoes">
              {acoes?.(f)}
              <a className="btn btn-sec" href={hrefFatura(escritorio, f.id)}>
                <Icone nome="fatura" className="ico" />
                Abrir a fatura<span className="sr"> de {mesPorExtenso(f.competencia)}</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button className="btn btn-fantasma btn-compacto" type="button" aria-label={rotulo}
      onClick={() => void navigator.clipboard?.writeText(texto).then(() => setFeito(true), () => undefined)}>
      <Icone nome={feito ? "check" : "copiar"} className="ico ico-s" />
      {feito ? "Copiado" : "Copiar"}
    </button>
  );
}

export type PagamentoCb = { pixCopiaCola: string | null; linhaBoleto: string | null; disponivel: boolean };

/** O QR, o Pix copia e cola e o boleto, ou o lugar reservado (sem a folha em volta: serve na janela de pagar do Portal). */
export function CodigosPagamento({ pagamento, ids: idsDe, estilo }: { pagamento: PagamentoCb; ids?: string; estilo?: CSSProperties }) {
  const proprio = useId();
  const ids = idsDe ?? proprio;
  return pagamento.disponivel ? (
    <div className="cb-pagar" style={estilo}>
      <div className="cb-qr" role="img" aria-label="QR do Pix">
        <Icone nome="qr" className="ico" />
      </div>
      {pagamento.pixCopiaCola ? (
        <div className="cb-meio">
          <h3 id={`${ids}-pix`}>
            <Icone nome="qr" className="ico" />
            Pix copia e cola
          </h3>
          <div className="cb-codigo">
            <code aria-describedby={`${ids}-pix`}>{pagamento.pixCopiaCola}</code>
            <Copiar texto={pagamento.pixCopiaCola} rotulo="Copiar o código Pix" />
          </div>
          <p className="cb-peq">Vale até o vencimento. Pago por Pix, a fatura fica paga na hora.</p>
        </div>
      ) : null}
      {pagamento.linhaBoleto ? (
        <>
          <div className="cb-sep-meio" aria-hidden="true" />
          <div className="cb-meio cb-meio-boleto">
            <h3 id={`${ids}-bol`}>
              <Icone nome="barras" className="ico" />
              Boleto
            </h3>
            <div className="cb-codigo">
              <code aria-describedby={`${ids}-bol`}>{pagamento.linhaBoleto}</code>
              <Copiar texto={pagamento.linhaBoleto} rotulo="Copiar a linha do boleto" />
            </div>
            <p className="cb-peq">Pago por boleto, a baixa leva até 1 dia útil.</p>
          </div>
        </>
      ) : null}
    </div>
  ) : (
    <div className="cb-pagar" style={estilo}>
      <div className="cb-qr" role="img" aria-label="Lugar reservado do QR do Pix">
        <Icone nome="qr" className="ico" />
        <span>QR do Pix</span>
      </div>
      <div className="cb-reserva">
        <Icone nome="cadeado" className="ico" />
        <span>
          <b>Pix e boleto: lugar reservado.</b> Quando o T3jus escolher o meio de pagamento, o QR, o Pix copia e cola e a linha do boleto aparecem aqui,
          no e-mail e no Portal, e a fatura fica paga sozinha. Até lá, quem pagar por fora tem o pagamento registrado à mão.
        </span>
      </div>
    </div>
  );
}

/**
 * "Como pagar": o QR, o Pix copia e cola e o boleto. Enquanto o meio de pagamento não é
 * escolhido (F1.21), a folha mostra o lugar reservado e diz por quê.
 */
export function ComoPagar({ pagamento, carne }: { pagamento: PagamentoCb; carne?: number }) {
  const ids = useId();
  return (
    <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>Como pagar</h2>
          <p className="sub">
            {carne ? `Os mesmos códigos da página ${carne} do carnê. ` : ""}
            {pagamento.disponivel ? "Pago por Pix, a fatura fica paga na hora." : "O Pix e o boleto vêm do meio de pagamento, que ainda não foi escolhido."}
          </p>
        </div>
      </div>
      <CodigosPagamento pagamento={pagamento} ids={ids} />
    </section>
  );
}

/** Histórico da fatura: só cresce. "O sistema" aparece com o ponto vazado. */
export function HistoricoFatura({ eventos, hoje, futuro }: { eventos: EventoCb[]; hoje: string; futuro?: ReactNode }) {
  const ids = useId();
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>Histórico da fatura</h2>
          <p className="sub">Quem fez o quê, e quando. Nada aqui é apagado.</p>
        </div>
      </div>
      <div style={{ padding: "0 24px 8px" }}>
        {porDia(eventos, hoje).map((g) => (
          <div key={g.dia} className="eventos-dia">
            <h3>{g.titulo}</h3>
            <ol className="eventos">
              {g.itens.map((e) => {
                const t = textoEvento(e);
                return (
                  <li key={e.id}>
                    <time dateTime={e.em}>{hora(e.em)}</time>
                    <span className={t.sistema ? "pto fc-sis" : t.forte ? "pto forte" : "pto"} aria-hidden="true" />
                    <div>
                      <p>
                        <b>{t.quem}</b> {t.acao}
                        {t.soEquipe ? <span className="selo selo-neutro"> Só equipe</span> : null}
                      </p>
                      {t.detalhe ? <small>{t.detalhe}</small> : null}
                      {t.motivo ? <span className="fc-motivo">“{t.motivo}”</span> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      {futuro ? (
        <div className="fc-futuro" role="note">
          {futuro}
        </div>
      ) : null}
    </section>
  );
}

/** Os próximos lembretes da régua, no pé do histórico. */
export function ProximosLembretes({ proximos }: { proximos: { tipo: string; dia: string }[] }) {
  if (!proximos.length) return null;
  return (
    <>
      <b>Próximos lembretes da régua</b>
      <ul>
        {proximos.map((p) => (
          <li key={p.tipo}>
            {dataBr(p.dia)}: {PASSO_REGUA[p.tipo] ?? p.tipo}
          </li>
        ))}
      </ul>
    </>
  );
}

const SIT_PARCELA = {
  PAGA: { icone: "check", texto: "Paga" },
  PROXIMA: { icone: "relogio", texto: "Próxima" },
  A_VENCER: { icone: "agenda", texto: "A vencer" },
  ATRASO: { icone: "alerta", texto: "Em atraso" },
  CANCELADA: { icone: "xis", texto: "Cancelada" },
} as const;

/** A folha do carnê: o resumo, as parcelas como canhotos e as ações (desenho, decisão 17). */
export function FolhaCarne({ carne, aviso, acoes, rodape, classe = "folha", titulo, nivel = 2 }: {
  carne: CarneCb;
  /** "Seu carnê 2026/2027" no Portal; no Console, "Carnê 2026/2027". */
  titulo?: string;
  /** No Portal, a folha do carnê fica dentro de "Plano e faturas" e o título é h3. */
  nivel?: 2 | 3;
  aviso?: ReactNode;
  acoes?: ReactNode;
  rodape: string;
  classe?: string;
}) {
  const ids = useId();
  const T = `h${nivel}` as const;
  const validas = carne.itens.filter((p) => p.situacao !== "CANCELADA");
  const pagas = validas.filter((p) => p.situacao === "PAGA");
  const falta = validas.length - pagas.length;
  const proxima = validas.find((p) => p.situacao === "A_VENCER");
  const somaPagas = pagas.reduce((s, p) => s + p.valorCentavos, 0);
  const somaFalta = validas.reduce((s, p) => s + p.valorCentavos, 0) - somaPagas;
  return (
    <section className={`${classe} cb-carne`} aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <T id={`${ids}-t`} className={nivel === 3 ? "cb-h3-carne" : undefined}>
            <Icone nome="carne" className="ico" />
            {titulo ?? `Carnê ${carne.numero}`}
          </T>
          <p className="sub">
            {carne.parcelas} parcelas de {brl(carne.valorParcelaCentavos)} · {mesPorExtenso(carne.primeiraCompetencia)} a {mesPorExtenso(carne.ultimaCompetencia)} · todo
            dia {carne.diaVencimento} · gerado em {dataBr(carne.geradoEm)}
          </p>
        </div>
      </div>
      {aviso ? <div style={{ padding: "0 24px 14px" }}>{aviso}</div> : null}
      <div className="cb-carne-res">
        <dl>
          <div>
            <dt>Pagas</dt>
            <dd>
              {pagas.length} de {validas.length} · {brl(somaPagas)}
            </dd>
          </div>
          <div>
            <dt>A pagar</dt>
            <dd>
              {falta} {falta === 1 ? "parcela" : "parcelas"} · {brl(somaFalta)}
            </dd>
          </div>
          <div>
            <dt>Total do carnê</dt>
            <dd>{brl(somaPagas + somaFalta)}</dd>
          </div>
        </dl>
        <div className="cb-carne-barra" role="img" aria-label={`${pagas.length} de ${validas.length} parcelas pagas`}>
          <i style={{ width: `${validas.length ? Math.round((pagas.length * 100) / validas.length) : 0}%` }} />
        </div>
      </div>
      <ol className="cb-parcelas" aria-label={`Parcelas do carnê ${carne.numero}`}>
        {carne.itens.map((p) => {
          const chave = p.situacao === "PAGA" ? "PAGA" : p.situacao === "CANCELADA" ? "CANCELADA" : p.emAtraso ? "ATRASO" : p.id === proxima?.id ? "PROXIMA" : "A_VENCER";
          const s = SIT_PARCELA[chave];
          const cls = chave === "PAGA" ? "paga" : chave === "CANCELADA" ? "cancelada" : chave === "PROXIMA" || chave === "ATRASO" ? "proxima" : "avencer";
          const nota = chave === "PAGA" && p.pagaEm ? `em ${diaMes(p.pagaEm)}` : chave === "PROXIMA" && p.faturaId ? "fatura emitida" : "";
          return (
            <li key={p.id} className={`cb-parc cb-parc-${cls}`} aria-current={chave === "PROXIMA" ? "step" : undefined}>
              <b>
                {p.numero}
                <small>de {carne.parcelas}</small>
              </b>
              <span className="cb-parc-mes">{competenciaCurta(p.competencia).replace(/^(\w{3})\w*/, "$1")}</span>
              <span>vence {diaMes(p.vencimento)}</span>
              <span className="cb-parc-sit">
                <Icone nome={s.icone} className="ico" />
                {s.texto}
              </span>
              {nota && chave === "PAGA" ? <span className="cb-parc-nota">{nota}</span> : null}
              <span className="sr">
                , vencimento {dataBr(p.vencimento)}
                {nota ? `, ${nota}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {acoes ? <div className="cb-carne-acoes">{acoes}</div> : null}
      <p className="docs-pe">
        <Icone nome="ajuda" className="ico" />
        <span>{rodape}</span>
      </p>
    </section>
  );
}

/**
 * Baixar o PDF da fatura, do recibo ou do carnê (F1.21, desenho cobranca-pdfs, decisão 17): o
 * botão vira "Preparando o PDF" (aria-disabled, não disabled), a linha role=status diz que o
 * arquivo baixa sozinho e, se falhar, um aviso role=alert preso ao botão, com "Tentar de novo" e
 * o código. É o padrão aprovado do PDF do contrato.
 */
export function useBaixarDoc(chamar: (caminho: string) => Promise<Resposta<{ url: string }>>) {
  const [preparando, setPreparando] = useState<string | null>(null);
  const [falhou, setFalhou] = useState<{ chave: string; caminho: string; erro: ErroApi } | null>(null);
  async function baixar(chave: string, caminho: string) {
    if (preparando) return;
    setFalhou(null);
    setPreparando(chave);
    const r = await chamar(caminho);
    setPreparando(null);
    if (!r.ok) return setFalhou({ chave, caminho, erro: r.erro });
    window.location.assign(r.dados.url);
  }
  return { baixar, preparando, falhou };
}
export type BaixarDoc = ReturnType<typeof useBaixarDoc>;

export function BotaoBaixarDoc({ doc, chave, caminho, rotulo, sr, classe = "btn btn-sec" }: {
  doc: BaixarDoc; chave: string; caminho: string; rotulo: string; sr?: string; classe?: string;
}) {
  const compacto = classe.includes("btn-compacto");
  if (doc.preparando === chave) {
    return (
      <button className={classe} type="button" aria-disabled="true" aria-describedby={`doc-st-${chave}`}>
        <span className="pdf-gira" aria-hidden="true" />
        Preparando o PDF{sr ? <span className="sr">: {sr}</span> : null}
      </button>
    );
  }
  return (
    <button className={classe} type="button" onClick={() => void doc.baixar(chave, caminho)}>
      <Icone nome="baixar" className={compacto ? "ico ico-s" : "ico"} />
      {rotulo}
      {sr ? <span className="sr"> {sr}</span> : null}
    </button>
  );
}

/** A linha "Preparando" e o erro, logo abaixo do botão. `de`: "da fatura de dezembro". */
export function SituacaoDoc({ doc, chave, de, nadaMudou, contato }: { doc: BaixarDoc; chave: string; de: string; nadaMudou: string; contato: string }) {
  const erro = doc.falhou?.chave === chave ? doc.falhou : null;
  const codigo = erro ? String(erro.erro.detalhes?.motivo ?? erro.erro.codigo) : "";
  return (
    <>
      <div id={`doc-st-${chave}`} role="status">
        {doc.preparando === chave ? (
          <p className="pdf-status">
            <Icone nome="relogio" className="ico ico-s" />
            <span>
              <b>Preparando o PDF {de}.</b> Leva alguns segundos; o arquivo baixa sozinho.
            </span>
          </p>
        ) : null}
      </div>
      {erro ? (
        <div className="pdf-erro">
          <Aviso tom="urgencia" titulo={`Não deu para preparar o PDF ${de}.`}
            acoes={
              <button className="btn btn-sec btn-compacto" type="button" onClick={() => void doc.baixar(erro.chave, erro.caminho)}>
                <Icone nome="reenviar" className="ico ico-s" />
                Tentar de novo<span className="sr">: PDF {de}</span>
              </button>
            }>
            {nadaMudou} Tente de novo em instantes; se não sair, escreva para {contato}.
          </Aviso>
          <p className="codigo">{codigo}</p>
        </div>
      ) : null}
    </>
  );
}
