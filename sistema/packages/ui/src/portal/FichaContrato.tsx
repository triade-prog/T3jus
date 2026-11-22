"use client";
// Ficha do contrato (CH-01 a CH-04, CH-06), desenho aprovado em
// docs/design/aprovadas/portal-comercial-contratos (estados criado, contrato,
// contrato-recebimentos e contrato-sem-financeiro; decisões 19 a 21): cabeçalho vinho, âmbar
// com o próximo passo (registrar a assinatura) ou o próximo recebimento, abas Contrato,
// Recebimentos e Documentos. A programação nasce na assinatura; mudar condição de contrato
// ativo pede motivo; encerrar para as cobranças novas e não apaga nada.

import { useCallback, useEffect, useRef, useState } from "react";
import { dataBr, hojeBrasilia, reais, type Anexo, type DocumentosDoContrato, type EventoContrato, type FichaContrato, type ListaAnexos, type RecebimentoPrevisto } from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { dataCurta, hora } from "../console/tempo.ts";
import { diaCurto, lerDia } from "./agenda.ts";
import { Selo } from "./Comercial.tsx";
import { fraseDoContrato, janelaProgramacao, juntarItens, nomeSituacaoContrato, ROTAS_CONTRATOS, SELO_CONTRATO } from "./contratos.ts";
import { Toast } from "./FichaCliente.tsx";
import { FolhaCarne } from "./Carne.tsx";
import { JanelaInscricoes, PessoasOab } from "./ContratoOab.tsx";
import { CondicoesLeitura, SeloTipo } from "./Honorarios.tsx";
import { chamarPortal, type EscritorioPortal } from "./Moldura.tsx";
import { OrigemPlanilha } from "./Importacao.tsx";
import { abrirAnexo, CampoAnexo, enviarAnexo } from "./Anexos.tsx";
import { tamanhoLegivel } from "../console/documentos.ts";
import { ROTAS_IMPORTACAO } from "./importacao.ts";
import { ROTAS_FINANCEIRO, seloParcela } from "./financeiro.ts";
import { MolduraArea } from "./MolduraArea.tsx";
import { HistoricoRecebimentos, JanelaFoiPaga, JanelaNaoPaga, textoAtraso } from "./NaoPaga.tsx";
import { DocumentosDaFicha, feitoDosAssinados, JanelaAssinados, proximoDosDocumentos } from "./Procuracoes.tsx";

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

function Dir({ f, aoAssinar, docs, aoAnexarDocs }: { f: FichaContrato; aoAssinar: () => void; docs: ReturnType<typeof proximoDosDocumentos>; aoAnexarDocs: () => void }) {
  // F3.16, decisão 20: com documentos gerados esperando o assinado, o próximo passo é anexá-los.
  if (f.situacao === "ELABORACAO" && docs?.contrato) {
    return (
      <section className="dir campo-ambar" aria-labelledby="t-px">
        <p className="sobretitulo" id="t-px">Próximo passo</p>
        <p className="grande" style={{ fontSize: 30 }}>Assinatura</p>
        <p className="hn-oque"><b>{docs.texto}</b><br />Anexar o contrato assinado ativa o contrato e manda a programação ao Financeiro.</p>
        <div className="hn-dir-acoes">
          <button data-muda className="btn btn-pri" type="button" onClick={aoAnexarDocs}>
            <Icone nome="enviar" className="ico" />
            Anexar os assinados
          </button>
        </div>
      </section>
    );
  }
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
  // A parcela que era paga antes do T3jus e voltou vencida (F3.84, decisão 8): sem recebimento,
  // carnê nem cobrança (podeVoltar), então é certo que está em aberto.
  const atrasada = f.recebimentos.find((r) => r.eraPagoAntes && r.podeVoltar && !r.cancelado && r.vencimento < hojeBrasilia());
  if (atrasada) {
    return (
      <section className="dir campo-ambar" aria-labelledby="t-pr">
        <p className="sobretitulo" id="t-pr">Recebimento em atraso</p>
        <div className="hn-dir-linha">
          <p className="grande">{diaCurto(atrasada.vencimento)}</p>
          <Selo tom="urgente" icone="alerta">{textoAtraso(atrasada.vencimento, hojeBrasilia())}</Selo>
        </div>
        <p className="hn-oque"><b>{atrasada.descricao} · {atrasada.valor ? reais(atrasada.valor) : "a definir"}</b><br />{f.financeiro ? "no Financeiro, em A receber" : "na programação do contrato"}</p>
        <a className="btn btn-pri" href={f.financeiro ? ROTAS_FINANCEIRO.receber : ROTAS_CONTRATOS.recebimentos(f.id)}>
          <Icone nome="carteira" className="ico" />
          {f.financeiro ? "Ver em A receber" : "Ver recebimentos"}
        </a>
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

// O arquivo assinado (CH-01, F3.12): o mais novo vale; anexar de novo guarda os dois.
function Assinatura({ f, assinados, aoAnexar }: { f: FichaContrato; assinados: Anexo[] | null; aoAnexar: () => void }) {
  const [falha, setFalha] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const atual = assinados?.[0] ?? null;
  async function abrir(a: Anexo) {
    setFalha(null);
    setAbrindo(true);
    const e = await abrirAnexo(a.id);
    setAbrindo(false);
    if (e) setFalha(e);
  }
  return (
    <section className="folha" aria-labelledby="t-as">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-as" style={{ fontSize: 20 }}>Assinatura</h2></div>
      </div>
      <dl className="hn-dl">
        <div><dt>Assinado em</dt><dd>{f.assinadoEm ? dataBr(f.assinadoEm) : "Ainda não"}</dd></div>
        {f.assinaturaPor ? <div><dt>Registrado por</dt><dd>{f.assinaturaPor.nome}</dd></div> : null}
        {assinados === null ? null : (
          <div data-assinado>
            <dt>Arquivo assinado</dt>
            <dd>
              {atual ? (
                <>
                  <button className="jr-link" type="button" onClick={() => void abrir(atual)} disabled={abrindo} aria-busy={abrindo || undefined}>
                    {atual.nome}<span className="sr"> (abre numa aba nova)</span>
                  </button>
                  <small style={{ display: "block", color: "var(--texto-2)" }}>
                    {tamanhoLegivel(atual.tamanho)} · anexado por {atual.enviadoPor.nome} em {dataBr(diaDoInstante(atual.enviadoEm))}
                    {assinados.length > 1 ? ` · ${assinados.length - 1 === 1 ? "1 anterior guardado" : `${assinados.length - 1} anteriores guardados`}` : ""}
                  </small>
                </>
              ) : f.situacao === "ELABORACAO" ? "Ainda não" : <span className="selo selo-atencao"><Icone nome="relogio" className="ico" />Falta anexar o assinado</span>}
            </dd>
          </div>
        )}
        {f.proposta ? <div><dt>Veio da proposta</dt><dd><a href={ROTAS_CONTRATOS.proposta(f.proposta.id)}>{f.proposta.numero}</a></dd></div> : null}
        <div><dt>Cliente</dt><dd><a href={ROTAS_CONTRATOS.cliente(f.cliente.id)}>{f.cliente.nome}</a></dd></div>
      </dl>
      {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="O arquivo não abriu.">{falha}</Aviso></div> : null}
      {f.situacao !== "ELABORACAO" && assinados !== null ? (
        <div className="hn-folha-acao">
          <button className="btn btn-sec" type="button" onClick={aoAnexar}>
            <Icone nome="enviar" className="ico" />
            {atual ? "Anexar outro assinado" : "Anexar o assinado"}
          </button>
        </div>
      ) : null}
      <div className="hn-reserva">
        <div>
          <Icone nome="lapis" className="ico" />
          <span><b>Assinatura eletrônica:</b> em estudo. Por enquanto, imprime-se, assina-se e anexa-se o arquivo assinado.</span>
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

function Recebimentos({ f, hoje, dono, aoNaoPaga, aoFoiPaga }: {
  f: FichaContrato; hoje: string; dono: string | undefined; aoNaoPaga: (r: RecebimentoPrevisto) => void; aoFoiPaga: (r: RecebimentoPrevisto) => void;
}) {
  const j = janelaProgramacao(f.recebimentos, hoje);
  // Coluna Situação só para quem tem a área Financeiro (desenho aprovado, decisão 21).
  const comSituacao = f.financeiro && f.recebimentos.some((r) => r.situacao !== undefined);
  const variaveis = f.condicoes.filter((c) => c.tipo === "EXITO" || c.tipo === "SUCUMBENCIA" || c.tipo === "ATO" || (c.tipo === "RECORRENTE" && c.etapa));
  // A que já voltou para A receber ("Não foi paga", F3.84) sai da folha.
  const pagas = f.recebimentos.filter((r) => r.pagoAntes && !r.corrigida);
  const mudancas = f.mudancasPagoAntes ?? [];
  const somaPagas = pagas.reduce((t, r) => t + (r.valor ?? 0), 0);
  return (
    <div className="pg-grade">
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
            {f.financeiro && f.recebidoAteHoje !== undefined ? (
              <div><p>Recebido até hoje</p><p className="hn-res-grande num">{reais(f.recebidoAteHoje)}</p></div>
            ) : null}
            <div>
              <p>Programado{j.ate ? ` até ${dataBr(j.ate)}` : ""}</p>
              <p className="hn-res-grande num">{reais(j.programado)}</p>
              {pagas.length ? <p className="pg-tot">Só o que passa pelo T3jus. Os <a href="#pago-antes">{reais(somaPagas)} pagos antes</a> ficam fora.</p> : null}
            </div>
            {f.financeiro && f.recebidoAteHoje !== undefined ? null : <div><p>Depois dos 3 meses</p><p className="hn-res-grande num">{j.depois}</p></div>}
            <div><p>Depende do caso</p><p className="hn-res-grande">{variaveis.length ? juntarItens(variaveis.map((c) => ({ EXITO: "Êxito", SUCUMBENCIA: "Sucumbência", ATO: "Por ato", RECORRENTE: "Recorrente" } as Record<string, string>)[c.tipo]!)) : "Nada"}</p></div>
          </div>
          {j.mostrar.length ? (
            <table className="hn-tab">
              <caption className="sr">Programação dos recebimentos</caption>
              <colgroup>{(comSituacao ? ["14%", "32%", "18%", "15%", "21%"] : ["16%", "40%", "22%", "22%"]).map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead><tr>{["Vencimento", "O quê", "Condição", "Valor", ...(comSituacao ? ["Situação"] : [])].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead>
              <tbody>
                {j.mostrar.map((r) => <LinhaRecebimento key={r.id} r={r} f={f} hoje={hoje} aoFoiPaga={aoFoiPaga} comSituacao={comSituacao} />)}
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
    {pagas.length ? <PagoAntes f={f} pagas={pagas} soma={somaPagas} hoje={hoje} aoNaoPaga={aoNaoPaga} /> : null}
    {mudancas.length ? <HistoricoRecebimentos mudancas={mudancas} cliente={f.cliente.nome} hoje={hoje} /> : null}
    </div>
  );
}

/** Quantas mostrar de cara na folha "Pago antes do T3jus" (pergunta 7: as 6 mais recentes). */
const PAGAS_DE_CARA = 6;

/**
 * As parcelas que a planilha trouxe como já pagas (F3.73, VA-05). Só informação: não entram nos
 * totais, em A receber nem no Caixa, e não geram recibo. Se uma não foi paga, quem tem o
 * Financeiro a passa para A receber ("Não foi paga", F3.84); se a planilha inteira estava
 * errada, o caminho é desfazer a importação.
 */
function PagoAntes({ f, pagas, soma, hoje, aoNaoPaga }: { f: FichaContrato; pagas: RecebimentoPrevisto[]; soma: number; hoje: string; aoNaoPaga: (r: RecebimentoPrevisto) => void }) {
  const [todas, setTodas] = useState(false);
  const recentes = [...pagas].sort((a, b) => (a.vencimento < b.vencimento ? 1 : a.vencimento > b.vencimento ? -1 : 0));
  const mostrar = todas ? recentes : recentes.slice(0, PAGAS_DE_CARA);
  const outras = recentes.length - mostrar.length;
  const imp = f.importacao;
  const doTipo = (t: RecebimentoPrevisto["tipo"]) => f.recebimentos.filter((r) => r.tipo === t && (r.pagoAntes || !r.cancelado)).length;
  const total = doTipo(pagas[0]!.tipo);
  const podeDesfazer = imp && !imp.desfeita && imp.desfazerAte && imp.desfazerAte.slice(0, 10) >= hoje;
  const botao = !!f.podeMarcarNaoPaga;
  const corrigidas = f.recebimentos.filter((r) => r.pagoAntes && r.corrigida && f.recebimentos.some((x) => x.eraPagoAntes && !x.cancelado && x.descricao === r.descricao && diaDoInstante(x.criadoEm) === hoje));
  const quem = (f.quemFinanceiro ?? []).map((p) => p.nome);
  return (
    <section className="folha pg" aria-labelledby="t-pg" id="pago-antes" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-pg">Pago antes do T3jus</h2>
          <p className="sub">
            {pagas.length === 1 ? "1 parcela que a planilha trouxe como já paga." : `${pagas.length} parcelas que a planilha trouxe como já pagas.`}
            {corrigidas.length ? ` ${juntarItens(corrigidas.map((r) => r.descricao.replace(/ de \d+$/, "").replace(/^Parcela/, corrigidas.length === 1 ? "A parcela" : "a parcela")))} ${corrigidas.length === 1 ? "passou" : "passaram"} para A receber hoje.` : ""}
          </p>
        </div>
      </div>
      <p className="pg-nota">
        <Icone nome="escudo" className="ico" />
        <span><b>Só informação.</b> Não entram nos totais acima, nem em A receber, nem no Caixa, e não geram recibo: o pagamento foi feito antes do T3jus, e a planilha não diz quando, como nem a quem.</span>
      </p>
      <table className="hn-tab">
        <caption className="sr">Parcelas pagas antes do T3jus</caption>
        <colgroup>{(botao ? ["13%", "26%", "16%", "13%", "18%", "14%"] : ["14%", "34%", "18%", "15%", "19%"]).map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead>
          <tr>
            {["Vencimento", "O quê", "Condição", "Valor", "Como veio"].map((t) => <th key={t} scope="col">{t}</th>)}
            {botao ? <th scope="col"><span className="sr">Ação</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {mostrar.map((r) => {
            const c = f.condicoes.find((x) => x.tipo === r.tipo);
            return (
              <tr key={r.id}>
                <td><b className="num">{dataBr(r.vencimento)}</b></td>
                <td data-r="O quê">{r.descricao}</td>
                <td data-r="Condição">{c ? <SeloTipo c={c} /> : null}</td>
                <td data-r="Valor"><span className="num hn-valor-c">{r.valor ? reais(r.valor) : "a definir"}</span></td>
                <td data-r="Como veio"><Selo tom="neutro">Paga antes do T3jus</Selo></td>
                {botao ? (
                  <td data-r="" className="np-acao">
                    <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoNaoPaga(r)}
                      aria-label={`Não foi paga: ${r.descricao.toLowerCase()}, de ${dataBr(r.vencimento)}`}>
                      Não foi paga
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {outras > 0 ? (
        <div className="pg-acoes">
          <button type="button" className="btn btn-sec" onClick={() => setTodas(true)}>
            <Icone nome="baixo" className="ico" />
            {outras === 1 ? "Mostrar a outra" : `Mostrar as outras ${outras}`}
          </button>
        </div>
      ) : null}
      <p className="pg-soma"><span>Soma das parcelas pagas antes, fora dos totais</span><b className="num">{reais(soma)}</b></p>
      {imp ? (
        <>
          <dl className="pg-origem">
            <div><dt>Veio da planilha</dt><dd>{imp.arquivo}{imp.linha ? <small>linha {imp.linha}</small> : null}</dd></div>
            <div><dt>Importada por</dt><dd>{imp.por?.nome ?? "Alguém que saiu da equipe"}<small>{dataCurta(imp.em)}, às {hora(imp.em)}</small></dd></div>
            <div><dt>Na planilha</dt><dd>“Parcelas pagas: {pagas.length}”<small>{pagas.length === 1 ? `a primeira de ${total}` : `as ${pagas.length} primeiras de ${total}`}</small></dd></div>
          </dl>
          {imp.desfeita ? (
            <div className="pg-acoes">
              <a className="btn btn-sec" href={ROTAS_IMPORTACAO.resultado(imp.id)}><Icone nome="historico" className="ico" />Ver a importação</a>
              <p>A importação foi desfeita.</p>
            </div>
          ) : (
            <ul className="np-caminhos" aria-label="Se a planilha estava errada">
              {botao ? (
                <li>
                  <Icone nome="moeda" className="ico" />
                  <span><b>Uma parcela não foi paga?</b> Use “Não foi paga” na linha dela. Ela passa para A receber e o resto da importação fica como está.</span>
                </li>
              ) : (
                <li>
                  <Icone nome="cadeado" className="ico" />
                  <span>
                    <b>Alguma não foi paga?</b> Quem tem a área Financeiro passa a parcela para A receber{quem.length ? `: ${quem.length === 1 ? quem[0] : `${quem.slice(0, -1).join(", ")} ou ${quem[quem.length - 1]}`}` : ""}.
                    {podeDesfazer ? ` Desfazer a importação, até ${dataCurta(imp.desfazerAte!)}, é com ${imp.por?.nome ?? "quem importou"}, que importou.` : ""}
                    <span className="np-ac"><a className="btn btn-sec" href={ROTAS_IMPORTACAO.resultado(imp.id)}><Icone nome="historico" className="ico" />Ver a importação</a></span>
                  </span>
                </li>
              )}
              {botao ? (
                <li>
                  <Icone nome="desfazer" className="ico" />
                  <span>
                    <b>A planilha inteira estava errada?</b>{" "}
                    {podeDesfazer ? `Até ${dataCurta(imp.desfazerAte!)} dá para desfazer a importação, corrigir a planilha e importar de novo.` : "O prazo para desfazer a importação acabou. Fale com o suporte para corrigir."}
                    <span className="np-ac">
                      <a className="btn btn-sec" href={ROTAS_IMPORTACAO.resultado(imp.id)}><Icone nome="historico" className="ico" />Ver a importação</a>
                      {podeDesfazer ? <a className="btn btn-sec" href={ROTAS_IMPORTACAO.desfazer(imp.id)}><Icone nome="desfazer" className="ico" />Desfazer a importação</a> : null}
                    </span>
                  </span>
                </li>
              ) : null}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}

/** A situação da parcela em A receber; a de valor ainda a definir espera a etapa do caso. */
function SituacaoRecebimento({ r, hoje }: { r: RecebimentoPrevisto; hoje: string }) {
  if (r.valor === null && !r.cancelado) return <Selo tom="neutro" icone="relogio">Esperando a etapa</Selo>;
  if (!r.situacao) return null;
  const s = seloParcela({ situacao: r.situacao, vencimento: r.vencimento, falta: r.falta ?? 0, pagaEm: r.pagaEm ?? null }, hoje);
  return <Selo tom={s.tom} icone={s.icone}>{s.texto}</Selo>;
}

function LinhaRecebimento({ r, f, hoje, aoFoiPaga, comSituacao }: {
  r: RecebimentoPrevisto; f: FichaContrato; hoje: string; aoFoiPaga: (r: RecebimentoPrevisto) => void; comSituacao: boolean;
}) {
  const c = f.condicoes.find((x) => x.tipo === r.tipo);
  const era = r.eraPagoAntes && !r.cancelado;
  const atraso = era && r.podeVoltar ? textoAtraso(r.vencimento, hoje) : null;
  return (
    <tr className={r.cancelado ? "ct-cancelado" : undefined}>
      <td>
        <b className="num">{dataBr(r.vencimento)}</b>
        {atraso && atraso !== "Vence hoje" ? <><br /><Selo tom="urgente" icone="alerta">{atraso}</Selo></> : null}
      </td>
      <td data-r="O quê">
        {era ? (
          <span className="np-o">
            {r.descricao}
            <small>Era “paga antes do T3jus” até {diaDoInstante(r.criadoEm) === hoje ? "hoje" : dataBr(diaDoInstante(r.criadoEm))}</small>
            {r.podeVoltar && f.podeMarcarNaoPaga ? (
              <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoFoiPaga(r)} aria-label={`Foi paga, sim: ${r.descricao.toLowerCase()}`}>
                <Icone nome="desfazer" className="ico" />Foi paga, sim
              </button>
            ) : null}
          </span>
        ) : r.descricao}
        {r.cancelado ? <><br /><small>Cancelado: {r.cancelado.motivo}</small></> : null}
        {r.base ? <><br /><small>Base de {reais(r.base.valor)}, informada por {r.base.por.nome}</small></> : null}
      </td>
      <td data-r="Condição">{c ? <SeloTipo c={c} curto /> : null}</td>
      <td data-r="Valor"><span className="num hn-valor-c">{r.valor ? reais(r.valor) : "a definir"}</span></td>
      {comSituacao ? <td data-r="Situação"><SituacaoRecebimento r={r} hoje={hoje} /></td> : null}
    </tr>
  );
}

function JanelaAssinatura({ aberta, f, aoFechar, aoFeito }: { aberta: boolean; f: FichaContrato; aoFechar: () => void; aoFeito: (n: number) => void }) {
  const hoje = hojeBrasilia();
  const [em, setEm] = useState(dataBr(hoje));
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [anexado, setAnexado] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  async function enviar() {
    const dia = lerDia(em);
    setFalha(null);
    const semData = !dia || dia > hoje;
    const semArquivo = !anexado && !arquivo ? "Anexe o contrato assinado: PDF ou a foto das páginas." : !anexado ? erroArq : null;
    setErro(semData);
    setErroArq(semArquivo);
    if (semData || semArquivo) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    // Primeiro o arquivo; a assinatura só se registra com ele guardado.
    if (!anexado && arquivo) {
      setProgresso(0);
      const e = await enviarAnexo("CONTRATO", f.id, arquivo, null, setProgresso);
      setProgresso(null);
      if (e) {
        setEnviando(false);
        return setFalha(`O arquivo não foi guardado, e a assinatura não foi registrada. ${e}`);
      }
      setAnexado(true);
    }
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
        <p id="j-assinatura-d">Anexe o contrato assinado e diga a data. O contrato fica ativo e a programação dos recebimentos passa a existir, a partir de hoje. Fica no histórico, com seu nome e a hora.</p>
        {falha ? <Aviso tom="urgencia" titulo="A assinatura não foi registrada.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="as-data">Data da assinatura</label>
          <input className="entrada" id="as-data" type="text" inputMode="numeric" autoComplete="off" value={em} onChange={(e) => setEm(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor("as-data-aj", erro && "as-data-er")} />
          <p className="ajuda" id="as-data-aj">dd/mm/aaaa. Hoje ou antes, desde a criação do contrato.</p>
          {erro ? <ErroCampo id="as-data-er">Escreva a data da assinatura, hoje ou antes, desde que o contrato foi criado, no formato dd/mm/aaaa.</ErroCampo> : null}
        </div>
        {anexado ? (
          <Aviso tom="sucesso" titulo="O arquivo assinado já está guardado.">Falta só registrar a assinatura.</Aviso>
        ) : (
          <CampoAnexo rotulo="Contrato assinado" opcional={false} ajuda="O PDF digitalizado ou as fotos das páginas, num arquivo só."
            arquivo={arquivo} aoEscolher={(a, e) => { setArquivo(e ? null : a); setErroArq(e); }} erro={erroArq} progresso={progresso} />
        )}
      </div>
    </Janela>
  );
}

function JanelaAnexarAssinado({ f, aoFechar, aoFeito }: { f: FichaContrato; aoFechar: () => void; aoFeito: () => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const corpo = useRef<HTMLDivElement>(null);
  async function enviar() {
    setFalha(null);
    if (!arquivo || erro) {
      setErro(erro ?? "Escolha o arquivo do contrato assinado.");
      return focarPrimeiroErro(corpo.current);
    }
    setProgresso(0);
    const e = await enviarAnexo("CONTRATO", f.id, arquivo, null, setProgresso);
    setProgresso(null);
    if (e) return setFalha(e);
    aoFeito();
  }
  return (
    <Janela id="j-assinado" aberta aoFechar={aoFechar} sobretitulo={`${f.numero} · ${f.cliente.nome}`} titulo="Anexar o contrato assinado" descricao="j-assinado-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={progresso !== null} aria-busy={progresso !== null || undefined}>
            <Icone nome="enviar" className="ico" />
            Anexar
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-assinado-d">O arquivo fica na ficha do contrato. Se já houver um, o anterior continua guardado. Fica no histórico, com seu nome e a hora.</p>
        {falha ? <Aviso tom="urgencia" titulo="O arquivo não foi anexado.">{falha}</Aviso> : null}
        <CampoAnexo rotulo="Contrato assinado" opcional={false} ajuda="O PDF digitalizado ou as fotos das páginas, num arquivo só."
          arquivo={arquivo} aoEscolher={(a, e) => { setArquivo(e ? null : a); setErro(e); }} erro={erro} progresso={progresso} />
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
  const [janela, setJanela] = useState<"assinatura" | "encerrar" | "assinado" | "inscricoes" | null>(null);
  const [janelaDocs, setJanelaDocs] = useState<{ so?: string } | null>(null);
  const [docs, setDocs] = useState<DocumentosDoContrato | null | "erro">(null);
  const [assinados, setAssinados] = useState<Anexo[] | null>(null);
  const [carne, setCarne] = useState(false);
  const [naoPaga, setNaoPaga] = useState<RecebimentoPrevisto | null>(null);
  const [foiPaga, setFoiPaga] = useState<RecebimentoPrevisto | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const hoje = hojeBrasilia();

  const carregar = useCallback(async () => {
    const r = await chamarPortal<FichaContrato>(`/v1/escritorio/contratos/${id}`);
    setF(r.ok ? r.dados : r.status === 404 ? "nao" : "erro");
    if (r.ok) aoNumero(r.dados.numero);
    const a = await chamarPortal<ListaAnexos>(`/v1/escritorio/contratos/${id}/anexos`);
    setAssinados(a.ok ? a.dados.anexos : null);
    const d = await chamarPortal<DocumentosDoContrato>(`/v1/escritorio/contratos/${id}/documentos`);
    setDocs(d.ok ? d.dados : "erro");
  }, [id, aoNumero]);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.has("criado") ? { titulo: "Contrato criado", texto: "Ele está em elaboração. Colha a assinatura e registre-a: aí a programação vai para o Financeiro." }
      : q.has("mudado") ? { titulo: "Mudanças salvas", texto: "A versão anterior fica no histórico do contrato." }
      : q.has("anexado") ? feitoDosAssinados({ n: Number(q.get("anexado")) || 1, ativou: q.get("anexado") === "ativo", numero: "" }) : null;
    if (!t) return;
    q.delete("criado");
    q.delete("mudado");
    q.delete("anexado");
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
                <OrigemPlanilha id={f.id} />
              </p>
            </div>
          </div>
        </div>
        <Dir f={f} aoAssinar={() => setJanela("assinatura")} docs={proximoDosDocumentos(docs)} aoAnexarDocs={() => setJanelaDocs({})} />
      </div>
      <nav className="abas" aria-label="Seções do contrato">
        <a href={ROTAS_CONTRATOS.contrato(f.id)} aria-current={aba === "contrato" ? "page" : undefined}>Contrato</a>
        <a href={ROTAS_CONTRATOS.recebimentos(f.id)} aria-current={aba === "recebimentos" ? "page" : undefined}>Recebimentos<span className="q">{vivos}</span></a>
        <a href={ROTAS_CONTRATOS.documentos(f.id)} aria-current={aba === "documentos" ? "page" : undefined}>Documentos{docs && docs !== "erro" && docs.documentos.length ? <span className="q">{docs.documentos.length}</span> : null}</a>
      </nav>
      {aba === "recebimentos" ? (
        <>
          <Recebimentos f={f} hoje={hoje} dono={escritorio.socios[0]} aoNaoPaga={setNaoPaga} aoFoiPaga={setFoiPaga} />
          {f.situacao !== "ELABORACAO" ? (
            <FolhaCarne contrato={f.id} area="CONTRATOS" escritorio={escritorio} aberta={carne} aoAbrir={() => setCarne(true)} aoFechar={() => setCarne(false)} />
          ) : null}
        </>
      )
        : aba === "documentos" ? <DocumentosDaFicha f={f} dados={docs} aoAnexar={(so) => setJanelaDocs({ so })} aoTentar={() => void carregar()} />
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
              <PessoasOab f={f} dono={escritorio.dono} socios={escritorio.socios} aoMudar={() => setJanela("inscricoes")} />
              <Assinatura f={f} assinados={assinados} aoAnexar={() => setJanela("assinado")} />
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
      {janela === "assinado" ? (
        <JanelaAnexarAssinado f={ficha} aoFechar={() => setJanela(null)}
          aoFeito={() => {
            setJanela(null);
            setFeito({ titulo: "Contrato assinado anexado", texto: "O arquivo está na ficha do contrato." });
            void carregar();
          }} />
      ) : null}
      <JanelaInscricoes key={janela === "inscricoes" ? `i${f.versao}` : "z"} aberta={janela === "inscricoes"} f={ficha} aoFechar={() => setJanela(null)}
        aoFeito={() => {
          setJanela(null);
          setFeito({ titulo: "Inscrições salvas", texto: "Valem para os documentos gerados daqui em diante. A mudança fica no histórico do contrato." });
          void carregar();
        }} />
      {naoPaga ? (
        <JanelaNaoPaga f={ficha} r={naoPaga} hoje={hoje} aoFechar={() => setNaoPaga(null)}
          aoFeito={(n) => {
            const r = naoPaga;
            setNaoPaga(null);
            setFeito({
              titulo: `A ${r.descricao.toLowerCase()} passou para A receber.`,
              texto: `${n.vencimento < hoje ? `Vencida desde ${dataBr(n.vencimento)}` : `Vence em ${dataBr(n.vencimento)}`}, com a cobrança com ${ficha.responsavel.nome}. Nenhum aviso automático saiu para ${ficha.cliente.nome.split(" ")[0]}.`,
            });
            void carregar();
          }} />
      ) : null}
      {foiPaga ? (
        <JanelaFoiPaga f={ficha} r={foiPaga} aoFechar={() => setFoiPaga(null)}
          aoFeito={() => {
            const r = foiPaga;
            setFoiPaga(null);
            setFeito({ titulo: `A ${r.descricao.toLowerCase()} voltou para “Pago antes do T3jus”.`, texto: "Saiu de A receber e dos totais. As duas mudanças ficam no histórico." });
            void carregar();
          }} />
      ) : null}
      {janelaDocs ? (
        <JanelaAssinados contrato={f.id} so={janelaDocs.so} aoFechar={() => setJanelaDocs(null)}
          aoFeito={(r) => { setJanelaDocs(null); setFeito(feitoDosAssinados(r)); void carregar(); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function FichaContratoPortal({ id, aba = "contrato" }: { id: string; aba?: Aba }) {
  const [numero, setNumero] = useState("Contrato");
  return (
    <MolduraArea area="CONTRATOS" secao="contratos" trilha={[{ nome: numero }]} pagina="co-ficha co-carteira">
      {(e) => <FichaConteudo id={id} aba={aba} escritorio={e} aoNumero={setNumero} />}
    </MolduraArea>
  );
}
