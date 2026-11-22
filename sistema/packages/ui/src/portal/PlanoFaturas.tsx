"use client";
// Portal › Escritório › "Plano e faturas" (F1.20, CO-06), tela aprovada em
// docs/design/aprovadas/console-cobranca/portal-escritorio.html (estados 44 a 51): só o sócio
// dono vê o plano, a próxima fatura (ou parcela do carnê) e a lista das faturas, com "Pagar"
// nas abertas. Mudar de plano é "fale com o T3jus". O Pix e o boleto são um lugar reservado
// até o meio de pagamento ser ligado (F1.21); o PDF da fatura, o recibo e o do carnê também.
// As faixas de atraso e de só consulta, que aparecem em todas as páginas, ficam na moldura.

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CONTATO_T3JUS, mesPorExtenso } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Carregando, Estado, Janela } from "../console/pecas.tsx";
import { brl, competenciaCurta, dataBr, detalheFatura, type CarneCb, type FaturaCb } from "../console/cobranca.ts";
import {
  BotaoBaixarDoc, CodigosPagamento, FolhaCarne, SeloFatura, SituacaoDoc, useBaixarDoc, type BaixarDoc, type PagamentoCb,
} from "../console/PecasCobranca.tsx";
import { chamarPortal } from "./Moldura.tsx";

/** O que a moldura recebe em GET /v1/escritorio, para as faixas (desenho, 25 e 26). */
export interface CobrancaPortal {
  soConsultaDesde: string | null;
  /** O nome de quem cuida do escritório: a equipe fala com essa pessoa. */
  socioDono: string | null;
  /** Só o sócio dono vê valores e faturas. */
  veFaturas: boolean;
  /** Fatura vencida há 7 dias ou mais (só vem para o sócio dono). */
  atraso: {
    faturaId: string;
    competencia: string;
    vencimento: string;
    dias: number;
    totalCentavos: number;
    abertas: number;
    abertasCentavos: number;
  } | null;
}

export interface FaturaPortal extends FaturaCb {
  itens: { tipo: string; descricao: string; quantidade: number; valorCentavos: number }[] | null;
  pagamento: PagamentoCb;
}

/** GET /v1/escritorio/faturas. */
export interface PlanoFaturasPortal {
  hoje: string;
  assinatura: {
    plano: string;
    precoCentavos: number;
    pessoasIncluidas: number;
    pessoasAtivas: number;
    pessoaAMaisCentavos: number;
    diaVencimento: number;
    forma: "PIX" | "BOLETO" | "CARNE";
    /** Para onde a fatura vai (F1.21); só o sócio dono recebe a assinatura. */
    emailCobranca?: string | null;
    inicioCobranca: string | null;
    soConsultaDesde: string | null;
    atrasoDias: number | null;
  } | null;
  faturas: FaturaPortal[];
  carne?: CarneCb[] | null;
  /** O PDF da fatura e o recibo já saem (F1.21): os dados do T3jus na fatura estão completos. */
  documentos?: boolean;
  /** O carnê em PDF já sai: o meio de pagamento está ligado e os dados do T3jus, completos. */
  carnePdf?: boolean;
}

/** Quem baixa o PDF da fatura e o recibo; null enquanto eles ainda não saem. */
const Docs = createContext<BaixarDoc | null>(null);
const NADA_MUDOU = "Nada mudou na fatura nem no pagamento.";

const ABERTA = new Set(["A_VENCER", "VENCE_HOJE", "EM_ATRASO"]);
export const faturaAberta = (f: Pick<FaturaCb, "situacao">) => ABERTA.has(f.situacao);

const FORMA_PAGA: Record<string, string> = { PIX: "Pix", BOLETO: "boleto", TRANSFERENCIA: "transferência", DINHEIRO: "dinheiro", OUTRA: "outra forma" };

/** "parcela 3 de 12 · paga em 09/11, Pix" */
export function detalhePortal(f: FaturaCb, hoje: string): string {
  const base = detalheFatura(f, hoje) + (f.situacao === "PAGA" && f.formaPaga ? `, ${FORMA_PAGA[f.formaPaga] ?? f.formaPaga}` : "");
  return f.parcela ? `parcela ${f.parcela.numero} de ${f.parcela.de} · ${base}` : base;
}

/** "outubro", "outubro e novembro", "setembro, outubro e novembro" (as competências em aberto). */
export function mesesEmAberto(faturas: Pick<FaturaCb, "competencia">[]): string {
  const nomes = [...faturas].sort((a, b) => a.competencia.localeCompare(b.competencia)).map((f) => mesPorExtenso(f.competencia, true));
  const anos = new Set(faturas.map((f) => f.competencia.slice(0, 4)));
  const lista = nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
  return anos.size === 1 ? `${lista} de ${[...anos][0]}` : lista;
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Selo({ f }: { f: FaturaCb }) {
  return <SeloFatura f={f} />;
}

function BotaoPagar({ f, aoPagar, cheio }: { f: FaturaCb; aoPagar: (f: FaturaCb) => void; cheio?: boolean }) {
  return (
    <button className={`btn btn-pri${cheio ? "" : " btn-compacto"}`} type="button" onClick={() => aoPagar(f)}>
      <Icone nome="pagar" className={cheio ? "ico" : "ico ico-s"} />
      Pagar<span className="sr"> a fatura de {mesPorExtenso(f.competencia)}</span>
    </button>
  );
}

function BotaoRecibo({ f, nota, cheio }: { f: FaturaCb; nota: string; cheio?: boolean }) {
  const doc = useContext(Docs);
  if (doc && f.situacao === "PAGA") {
    return (
      <BotaoBaixarDoc doc={doc} chave={`recibo-${f.id}`} caminho={`/v1/escritorio/faturas/${f.id}/recibo`} rotulo="Recibo"
        sr={`de ${mesPorExtenso(f.competencia)}`} classe={`btn btn-sec${cheio ? "" : " btn-compacto"}`} />
    );
  }
  return (
    <button className={`btn btn-sec${cheio ? "" : " btn-compacto"}`} type="button" aria-disabled="true" aria-describedby={nota}>
      <Icone nome="baixar" className={cheio ? "ico" : "ico ico-s"} />
      Recibo<span className="sr"> de {mesPorExtenso(f.competencia)}</span>
    </button>
  );
}

function Acoes({ f, aoPagar, nota, cheio }: { f: FaturaCb; aoPagar: (f: FaturaCb) => void; nota: string; cheio?: boolean }) {
  if (faturaAberta(f)) return <BotaoPagar f={f} aoPagar={aoPagar} cheio={cheio} />;
  return (
    <>
      <BotaoRecibo f={f} nota={nota} cheio={cheio} />
      <span className="cb-peq" style={{ alignSelf: "center" }}>
        Nota: em breve
      </span>
    </>
  );
}

function ListaFaturas({ faturas, hoje, aoPagar, nota }: { faturas: FaturaCb[]; hoje: string; aoPagar: (f: FaturaCb) => void; nota: string }) {
  const legenda = "Faturas do escritório";
  return (
    <>
      <table className="cb-tab so-pc">
        <caption className="sr">{legenda}</caption>
        <colgroup>
          <col />
          <col style={{ width: 120 }} />
          <col style={{ width: 116 }} />
          <col style={{ width: 240 }} />
          <col style={{ width: 150 }} />
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
            <tr key={f.id}>
              <td>
                <strong style={{ fontWeight: 500 }}>{competenciaCurta(f.competencia)}</strong>
              </td>
              <td className="cb-valor">{brl(f.totalCentavos)}</td>
              <td className="num">{dataBr(f.vencimento)}</td>
              <td>
                <div className="cb-sit">
                  <Selo f={f} />
                  <small>{detalhePortal(f, hoje)}</small>
                </div>
              </td>
              <td>
                <div className="cb-acoes-linha">
                  <Acoes f={f} aoPagar={aoPagar} nota={nota} />
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
            <div className="cb-sit">
              <Selo f={f} />
              <small>{detalhePortal(f, hoje)}</small>
            </div>
            <div className="cb-c-acoes">
              <Acoes f={f} aoPagar={aoPagar} nota={nota} cheio />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function JanelaPagar({ f, aoFechar }: { f: FaturaPortal | null; aoFechar: () => void }) {
  const [ultima, setUltima] = useState<FaturaPortal | null>(f);
  if (f && f !== ultima) setUltima(f);
  const x = f ?? ultima;
  const atrasada = x?.situacao === "EM_ATRASO";
  return (
    <Janela id="janela-pagar-pt" aberta={!!f} aoFechar={aoFechar} sobretitulo="Plano e faturas" descricao="janela-pagar-pt-d"
      titulo={x ? `Pagar a fatura de ${mesPorExtenso(x.competencia, true)}` : "Pagar a fatura"} aoEnviar={aoFechar}
      pe={
        <button className="btn btn-pri" type="submit" data-foco>
          Fechar
        </button>
      }>
      {x ? (
        <>
          <p id="janela-pagar-pt-d" className="sr">
            {atrasada ? `Venceu em ${dataBr(x.vencimento)}.` : `Vence em ${dataBr(x.vencimento)}.`} Pago por Pix, aparece como paga na hora; por boleto, em até 1 dia útil.
          </p>
          <p className="cb-peq" aria-hidden="true">
            {atrasada ? `Venceu em ${dataBr(x.vencimento)}.` : `Vence em ${dataBr(x.vencimento)}.`} Pago por Pix, aparece como paga na hora; por boleto, em até 1 dia útil.
            {x.parcela ? ` São os mesmos códigos da parcela ${x.parcela.numero} do carnê.` : ""}
          </p>
          <ul className="cb-conta">
            {(x.itens?.length ? x.itens : [{ tipo: "MENSALIDADE", descricao: `Mensalidade do plano ${x.plano}, ${mesPorExtenso(x.competencia)}`, quantidade: 1, valorCentavos: x.totalCentavos }]).map(
              (i, n) => (
                <li key={n}>
                  <span>
                    {i.descricao}
                    {i.quantidade > 1 ? ` (${i.quantidade})` : ""}
                  </span>
                  <b>{brl(i.valorCentavos)}</b>
                </li>
              ),
            )}
            <li className="cb-tot">
              <span>Total</span>
              <b>{brl(x.totalCentavos)}</b>
            </li>
          </ul>
          <CodigosPagamento pagamento={x.pagamento} estilo={{ padding: 0 }} />
        </>
      ) : null}
    </Janela>
  );
}

function LadoDaFatura({ d, abertas, aoPagar, nota }: { d: PlanoFaturasPortal; abertas: FaturaPortal[]; aoPagar: (f: FaturaPortal) => void; nota: string }) {
  const a = d.assinatura!;
  const doc = useContext(Docs);
  const atrasadas = abertas.filter((f) => f.situacao === "EM_ATRASO").sort((x, y) => x.vencimento.localeCompare(y.vencimento));
  const carne = a.forma === "CARNE";
  if (a.soConsultaDesde) {
    const total = atrasadas.reduce((s, f) => s + f.totalCentavos, 0);
    const primeira = atrasadas[0];
    return (
      <div className="cb-pt-atraso cb-forte">
        <p className="sobretitulo">Portal só para consulta</p>
        {primeira ? (
          <p className="cb-proxima">
            <span className="cb-grande" style={{ color: "var(--vinho-3)" }}>
              {brl(total)}
            </span>
            <Selo f={primeira} />
          </p>
        ) : null}
        <p>
          {atrasadas.length ? `${maiuscula(mesesEmAberto(atrasadas))} ${atrasadas.length === 1 ? "está" : "estão"} em aberto. ` : ""}
          Desde <b>{dataBr(a.soConsultaDesde)}</b>, a equipe só consulta: vê tudo e você baixa os dados, mas ninguém cria nem muda nada.
        </p>
        <p>
          <b>{atrasadas.length > 1 ? `Ao pagar ${atrasadas.length === 2 ? "as duas" : `as ${atrasadas.length}`}, tudo volta ao normal na hora.` : "Ao pagar, tudo volta ao normal na hora."}</b>{" "}
          Nenhum dado foi apagado.
        </p>
        <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {primeira ? (
            <button className="btn btn-pri" type="button" onClick={() => aoPagar(primeira)}>
              <Icone nome="pagar" className="ico" />
              Pagar {mesPorExtenso(primeira.competencia, true)}
            </button>
          ) : null}
          <a className="btn btn-sec" href={`mailto:${CONTATO_T3JUS}`}>
            <Icone nome="envelope" className="ico" />
            Falar com o T3jus
          </a>
        </p>
      </div>
    );
  }
  if (atrasadas.length) {
    const f = atrasadas[0]!;
    return (
      <div className="cb-pt-atraso">
        <p className="sobretitulo">Em atraso</p>
        <p className="cb-proxima">
          <span className="cb-grande">{brl(f.totalCentavos)}</span>
          <Selo f={f} />
        </p>
        <p>
          {maiuscula(mesPorExtenso(f.competencia))} · venceu em <b>{dataBr(f.vencimento)}</b>. Se já pagou, desconsidere: o boleto leva até 1 dia útil para cair.
        </p>
        <p>
          Com 30 dias de atraso, a equipe T3jus pode deixar o Portal só para consulta até o pagamento. <b>Nenhum dado é apagado.</b>
        </p>
        <p>
          <button className="btn btn-pri" type="button" onClick={() => aoPagar(f)}>
            <Icone nome="pagar" className="ico" />
            Pagar agora
          </button>
        </p>
      </div>
    );
  }
  const carneDaProxima = (d.carne ?? []).find((c) => c.itens.length) ?? null;
  const proxima = [...abertas].sort((x, y) => x.vencimento.localeCompare(y.vencimento))[0];
  return (
    <div>
      <p className="sobretitulo">{carne ? "Próxima parcela" : "Próxima fatura"}</p>
      {proxima ? (
        <>
          <p className="cb-proxima">
            <span className="cb-grande">{brl(proxima.totalCentavos)}</span>
            <Selo f={proxima} />
          </p>
          <p>
            {proxima.parcela ? (
              <>
                Parcela{" "}
                <b>
                  {proxima.parcela.numero} de {proxima.parcela.de}
                </b>{" "}
                · {mesPorExtenso(proxima.competencia)}
              </>
            ) : (
              maiuscula(mesPorExtenso(proxima.competencia))
            )}{" "}
            · vence em <b>{dataBr(proxima.vencimento)}</b>.
          </p>
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-pri" type="button" onClick={() => aoPagar(proxima)}>
              <Icone nome="pagar" className="ico" />
              Pagar
            </button>
            {doc && !carne ? (
              <BotaoBaixarDoc doc={doc} chave="lado-fatura" caminho={`/v1/escritorio/faturas/${proxima.id}/pdf`} rotulo="Baixar a fatura" />
            ) : doc && carne && d.carnePdf && carneDaProxima ? (
              <BotaoBaixarDoc doc={doc} chave="lado-carne" caminho={`/v1/escritorio/assinatura/carnes/${carneDaProxima.id}/pdf`} rotulo="Baixar o carnê" />
            ) : (
              <button className="btn btn-sec" type="button" aria-disabled="true" aria-describedby={nota}>
                <Icone nome="baixar" className="ico" />
                {carne ? "Baixar o carnê" : "Baixar a fatura"}
              </button>
            )}
          </p>
          {doc && !carne ? (
            <SituacaoDoc doc={doc} chave="lado-fatura" de={`da fatura de ${mesPorExtenso(proxima.competencia)}`} nadaMudou={NADA_MUDOU} contato={CONTATO_T3JUS} />
          ) : doc && carne && d.carnePdf && carneDaProxima ? (
            <SituacaoDoc doc={doc} chave="lado-carne" de={`do carnê ${carneDaProxima.numero}`} nadaMudou="Nada mudou no carnê." contato={CONTATO_T3JUS} />
          ) : null}
        </>
      ) : (
        <p>Nenhuma fatura em aberto. A próxima chega por e-mail e aparece aqui 20 dias antes do vencimento, todo dia {a.diaVencimento}.</p>
      )}
    </div>
  );
}

function Cabeca() {
  return (
    <div className="folha-cab">
      <div>
        <h2 id="t-plano">
          <Icone nome="fatura" className="ico" />
          Plano e faturas
        </h2>
        <p className="sub">Só o sócio dono vê esta parte.</p>
      </div>
    </div>
  );
}

function Folha({ children }: { children: ReactNode }) {
  return (
    <section className="folha" aria-labelledby="t-plano" id="plano" style={{ overflow: "hidden" }}>
      {children}
    </section>
  );
}

/** A folha "Plano e faturas", no alto da página Escritório (só o sócio dono). */
export function PlanoEFaturas() {
  const ids = useId();
  const nota = `${ids}-pdf`;
  const [d, setD] = useState<PlanoFaturasPortal | null>(null);
  const [erro, setErro] = useState(false);
  const [pagar, setPagar] = useState<FaturaPortal | null>(null);
  const baixar = useBaixarDoc((caminho) => chamarPortal<{ url: string }>(caminho));
  const carregar = useCallback(async () => {
    setErro(false);
    const r = await chamarPortal<PlanoFaturasPortal>("/v1/escritorio/faturas");
    if (r.ok) setD(r.dados);
    else setErro(true);
  }, []);
  const carregou = useRef(false);
  useEffect(() => {
    if (carregou.current) return;
    carregou.current = true;
    void carregar();
  }, [carregar]);

  if (erro) {
    return (
      <Folha>
        <Cabeca />
        <Estado icone="alerta" erro titulo="Não deu para carregar as faturas"
          acoes={
            <button className="btn btn-pri" type="button" onClick={() => { setD(null); void carregar(); }}>
              <Icone nome="reenviar" className="ico" />
              Tentar de novo
            </button>
          }>
          O resto da página funciona. Nada do que estava guardado se perdeu. Tente de novo em instantes; se continuar, fale com o T3jus.
        </Estado>
      </Folha>
    );
  }
  if (!d) {
    return (
      <Folha>
        <Cabeca />
        <Carregando rotulo="Carregando o plano e as faturas…" linhas={3} />
      </Folha>
    );
  }
  const a = d.assinatura;
  if (!a || !d.faturas.length) {
    return (
      <Folha>
        <Cabeca />
        <div style={{ paddingTop: 8 }}>
          <Estado icone="fatura" titulo="Nenhuma fatura ainda">
            A primeira fatura chega por e-mail e aparece aqui quando a implantação terminar.
            {a ? ` O plano combinado é o ${a.plano}, ${brl(a.precoCentavos)} por mês, até ${a.pessoasIncluidas} pessoas.` : ""}
          </Estado>
        </div>
      </Folha>
    );
  }
  const abertas = d.faturas.filter(faturaAberta);
  const doc = d.documentos ? baixar : null;
  // O recibo da lista: a linha de "preparando" e o erro ficam logo abaixo da lista.
  const chaveLista = [baixar.preparando, baixar.falhou?.chave].find((c) => c?.startsWith("recibo-"));
  const daLista = chaveLista ? d.faturas.find((f) => `recibo-${f.id}` === chaveLista) : undefined;
  const carnes = (d.carne ?? []).filter((c) => c.itens.length);
  return (
    <Docs.Provider value={doc}>
    <Folha>
      <Cabeca />
      <div className="cb-pt-plano">
        <div>
          <p className="sobretitulo">Seu plano</p>
          <p className="cb-plano-nome" style={{ fontSize: 24 }}>
            {a.plano}
          </p>
          <p className="cb-preco">
            {brl(a.precoCentavos)}
            <small>por mês</small>
          </p>
          <p>
            Até <b>{a.pessoasIncluidas} pessoas</b>, com todas as áreas. Hoje {a.pessoasAtivas === 1 ? "é" : "são"} <b>{a.pessoasAtivas}</b>. Cada pessoa a mais custa{" "}
            {brl(a.pessoaAMaisCentavos)} por mês.
          </p>
          <p>
            Vence todo dia <b>{a.diaVencimento}</b> · {a.forma === "CARNE" ? `carnê de ${carnes[0]?.parcelas ?? 12} parcelas, cada uma com Pix e boleto` : "Pix ou boleto"}
            {a.emailCobranca ? (
              <>
                {" "}· a fatura chega em <span style={{ overflowWrap: "anywhere" }}>{a.emailCobranca}</span>
              </>
            ) : null}
            .
          </p>
          <p>
            Para mudar de plano ou de dia, <a href={`mailto:${CONTATO_T3JUS}`}>fale com o T3jus</a>.
          </p>
        </div>
        <LadoDaFatura d={d} abertas={abertas} aoPagar={setPagar} nota={nota} />
      </div>
      {carnes.map((c) => (
        <FolhaCarne key={c.id} carne={c} classe="cb-carne-pt" nivel={3} titulo={`Seu carnê ${c.numero}`}
          acoes={doc && d.carnePdf ? (
            <>
              <BotaoBaixarDoc doc={doc} chave={`carne-${c.id}`} caminho={`/v1/escritorio/assinatura/carnes/${c.id}/pdf`} rotulo="Baixar o carnê (PDF)" />
              <SituacaoDoc doc={doc} chave={`carne-${c.id}`} de={`do carnê ${c.numero}`} nadaMudou="Nada mudou no carnê." contato={CONTATO_T3JUS} />
            </>
          ) : (
            <button className="btn btn-sec" type="button" aria-disabled="true" aria-describedby={nota}>
              <Icone nome="baixar" className="ico" />
              Baixar o carnê (PDF)
            </button>
          )}
          rodape="Cada parcela tem o próprio Pix e boleto. A fatura de cada mês sai 20 dias antes do vencimento, com os mesmos códigos da parcela." />
      ))}
      <h3 className="sr">Faturas</h3>
      <ListaFaturas faturas={d.faturas} hoje={d.hoje} aoPagar={(f) => setPagar(f as FaturaPortal)} nota={nota} />
      {doc && chaveLista && daLista ? (
        <div className="cb-doc-lista">
          <SituacaoDoc doc={doc} chave={chaveLista} de={`do recibo de ${mesPorExtenso(daLista.competencia)}`} nadaMudou={NADA_MUDOU} contato={CONTATO_T3JUS} />
        </div>
      ) : null}
      <p className="docs-pe" id={nota}>
        <Icone nome="doc" className="ico" />
        <span>
          {doc && d.carnePdf
            ? ""
            : doc
              ? "O carnê em PDF sai quando o T3jus ligar o meio de pagamento. "
              : "O PDF da fatura, o recibo e o carnê em PDF saem quando o T3jus ligar o meio de pagamento. "}
          A nota fiscal de cada fatura paga vai aparecer aqui quando o T3jus começar a emitir pelo sistema.
        </span>
      </p>
      <JanelaPagar f={pagar} aoFechar={() => setPagar(null)} />
    </Folha>
    </Docs.Provider>
  );
}
