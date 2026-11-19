"use client";
// Contratos do Portal (CH-01 a CH-04, CH-06), desenho aprovado em
// docs/design/aprovadas/portal-comercial-contratos (estados contratos, contratos-vazio,
// honorarios e base; decisões 21 e 23): a lista de contratos e Honorários, o que depende de
// alguém para virar cobrança. O formulário e a ficha ficam em FormContrato.tsx e FichaContrato.tsx.

import { useEffect, useRef, useState } from "react";
import {
  dataBr, FONTES_BASE, hojeBrasilia, percentual, reais,
  type BasePendente, type FonteBase, type HonorariosContratos, type ListaContratos, type MostrarContratos,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaCurto, lerDia, somarDias } from "./agenda.ts";
import { Busca, CabAmbar, Chips, Selo, useCarga } from "./Comercial.tsx";
import { diasEntre } from "./comercial.ts";
import { nomeSituacaoContrato, ROTAS_CONTRATOS, SELO_CONTRATO, textoProximo } from "./contratos.ts";
import { Toast } from "./FichaCliente.tsx";
import { SeloTipo } from "./Honorarios.tsx";
import { centavos as lerCentavos } from "./honorarios.ts";
import { ROTAS_COMERCIAL } from "./comercial.ts";
import { MolduraArea } from "./MolduraArea.tsx";
import { chamarPortal } from "./Moldura.tsx";

function CabContratos() {
  return (
    <CabAmbar sobre="Contratos de honorários" titulo="Contratos"
      lede="Cada contrato liga o cliente aos casos, diz quem responde por ele e o que se combinou de honorários. Das condições sai a programação dos recebimentos que o Financeiro acompanha."
      acao={
        <a data-muda className="btn btn-escuro" href={ROTAS_CONTRATOS.novo} style={{ marginBottom: 6 }}>
          <Icone nome="mais" className="ico" />
          Novo contrato
        </a>
      } />
  );
}

function ContratosConteudo() {
  const [mostrar, setMostrar] = useState<MostrarContratos>("ATIVOS");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 250);
    return () => clearTimeout(t);
  }, [busca]);
  const { dados, recarregar } = useCarga<ListaContratos>(`/v1/escritorio/contratos?mostrar=${mostrar}${q ? `&q=${encodeURIComponent(q)}` : ""}`);

  if (dados === "erro") return <><CabContratos /><ErroAoCarregar oque="os contratos" aoTentar={recarregar} /></>;
  if (!dados) return <><CabContratos /><Carregando rotulo="Carregando os contratos…" linhas={4} /></>;
  if (!dados.algum) {
    return (
      <div className="hn">
        <CabContratos />
        <section className="folha" aria-labelledby="t-cl" style={{ overflow: "hidden" }}>
          <h2 id="t-cl" className="sr">Lista de contratos</h2>
          <Estado icone="pena" titulo="Nenhum contrato ainda"
            acoes={
              <>
                <a className="btn btn-sec" href={ROTAS_COMERCIAL.propostas}><Icone nome="maleta" className="ico" />Ver propostas aceitas</a>
                <a data-muda className="btn btn-pri" href={ROTAS_CONTRATOS.novo}><Icone nome="mais" className="ico" />Criar o primeiro contrato</a>
              </>
            }>
            Um contrato nasce de uma proposta aceita, com as condições já preenchidas, ou direto aqui. Escolha o cliente e os honorários: a programação dos recebimentos sai sozinha.
          </Estado>
        </section>
      </div>
    );
  }
  const c = dados.contagem;
  const lista = dados.contratos;
  const n = lista.length;
  const resumo = q ? <b>{contar(n, "contrato encontrado", "contratos encontrados")} para “{q}”</b>
    : mostrar === "ATIVOS" ? <><b>{contar(n, "contrato", "contratos")}</b> · {c.ativos} {c.ativos === 1 ? "ativo" : "ativos"} e {c.elaboracao} em elaboração · do recebimento mais próximo para o mais distante</>
    : mostrar === "ENCERRADOS" ? <b>{contar(n, "contrato encerrado", "contratos encerrados")}</b>
    : <b>{contar(n, "contrato com a base do mês a pedir", "contratos com a base do mês a pedir")}</b>;
  return (
    <div className="hn">
      <CabContratos />
      <section className="folha" aria-labelledby="t-cl" style={{ overflow: "hidden" }}>
        <h2 id="t-cl" className="sr">Lista de contratos</h2>
        <Busca id="ct-b" rotulo="Buscar por cliente, número ou objeto" dica="Cliente, número do contrato ou objeto" valor={busca} aoMudar={setBusca}>
          <Chips rotulo="Mostrar" atual={mostrar} aoEscolher={(v) => setMostrar(v as MostrarContratos)}
            opcoes={[
              { v: "ATIVOS", t: `Ativos e em elaboração (${c.ativos + c.elaboracao})` },
              { v: "ENCERRADOS", t: `Encerrados (${c.encerrados})` },
              { v: "BASE", t: `Base do mês a pedir (${c.base})` },
            ]} />
        </Busca>
        <p className="hn-cont" role="status">{resumo}</p>
        {n ? (
          <table className="hn-tab">
            <caption className="sr">Contratos</caption>
            <colgroup>{["27%", "29%", "14%", "17%", "13%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead><tr>{["Contrato", "Honorários", "Responsável", "Próximo recebimento", "Situação"].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead>
            <tbody>
              {lista.map((k) => {
                const p = textoProximo(k);
                const s = SELO_CONTRATO[k.situacao];
                return (
                  <tr key={k.id} className={k.basePendente?.parada ? "hn-venc" : undefined}>
                    <td>
                      <div className="esc">
                        <div>
                          <a href={ROTAS_CONTRATOS.contrato(k.id)}>{k.cliente.nome}</a>
                          <small>{k.numero} · {k.objeto}</small>
                        </div>
                      </div>
                    </td>
                    <td data-r="Honorários"><div className="hn-selos">{k.condicoes.map((x) => <SeloTipo key={x.tipo} c={x} />)}</div></td>
                    <td data-r="Responsável">{k.responsavel.nome}</td>
                    <td data-r="Próximo recebimento">
                      <div>
                        {k.basePendente ? <Selo tom="urgente" icone="alerta">base do mês a pedir</Selo>
                          : k.situacao === "ELABORACAO" ? <span className="hn-sem">depois da assinatura</span>
                          : p ? <><b className="num">{p.linha}</b><small>{p.sub}</small></> : <span className="hn-sem">—</span>}
                      </div>
                    </td>
                    <td data-r="Situação"><Selo tom={s.tom} icone={s.icone}>{nomeSituacaoContrato(k.situacao)}</Selo></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Estado icone="busca" titulo={q ? "Nenhum contrato encontrado" : "Nenhum contrato aqui"}>
            {q ? "Confira o nome do cliente, o número ou o objeto, ou limpe a busca." : "Quando houver, eles aparecem nesta lista."}
          </Estado>
        )}
        <p className="hn-pe">
          <Icone nome="historico" className="ico" />
          <span>Contrato não se apaga. O encerrado fica guardado com o motivo, e o que já venceu continua no Financeiro.</span>
        </p>
      </section>
    </div>
  );
}

export function ContratosPortal() {
  return <MolduraArea area="CONTRATOS" secao="contratos">{() => <ContratosConteudo />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Honorários

const NOME_TIPO: Record<string, string> = { EXITO: "êxito", SUCUMBENCIA: "sucumbência", ATO: "por ato", RECORRENTE: "recorrente" };
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesDe = (d: string) => MESES[Number(d.slice(5, 7)) - 1]!;

function JanelaBase({ b, aoFechar, aoFeito }: { b: BasePendente | null; aoFechar: () => void; aoFeito: (valor: number, venc: string) => void }) {
  const hoje = hojeBrasilia();
  const sugerido = b && b.vencimento < hoje ? somarDias(hoje, 5) : b?.vencimento ?? hoje;
  const [valor, setValor] = useState("");
  const [fonte, setFonte] = useState<FonteBase>("EXTRATO");
  const [venc, setVenc] = useState(dataBr(sugerido));
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  if (!b) return null;
  const base = b;
  const centavos = lerCentavos(valor);
  const dia = lerDia(venc);
  const conta = centavos ? Math.round((centavos * base.percentual) / 10000) : null;
  const tem = (c: string) => erros.includes(c);

  async function enviar() {
    const e: string[] = [];
    if (!centavos) e.push("valor");
    if (!dia || dia < hoje) e.push("vencimento");
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ valor: number; vencimento: string }>(`/v1/escritorio/recebimentos/${base.recebimentoId}/base`, {
      metodo: "POST", corpo: { valor: centavos, fonte, vencimento: dia },
    });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados.valor, r.dados.vencimento);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }
  const mes = mesDe(base.vencimento);
  return (
    <Janela id="j-base" aberta aoFechar={aoFechar} sobretitulo={`${base.contrato.numero} · ${base.cliente}`} titulo={`Informar a base de ${mes}`} descricao="j-base-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Informar a base
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-base-d">{base.parada ? `A cobrança de ${diaCurto(base.vencimento)} está parada esperando este valor.` : `A cobrança de ${diaCurto(base.vencimento)} sai deste valor.`}</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A base ainda não foi informada.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="A base não foi informada.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="bs-valor">Valor {base.sobre.toLowerCase().startsWith("benef") ? `do benefício de ${mes}` : `da base de ${mes}`}</label>
          <span className="hn-afixo hn-antes">
            <span aria-hidden="true">R$</span>
            <input className="entrada" id="bs-valor" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} data-foco=""
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor("bs-valor-aj", tem("valor") && "bs-valor-er")} />
          </span>
          <p className="ajuda" id="bs-valor-aj">O valor bruto que aparece no extrato. Base: {base.sobre.toLowerCase()}.</p>
          {tem("valor") ? <ErroCampo id="bs-valor-er">Escreva o valor em reais. Ex.: 2.910,00.</ErroCampo> : null}
        </div>
        <div className="cm-dois" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="campo">
            <label htmlFor="bs-fonte">De onde veio</label>
            <select className="entrada" id="bs-fonte" value={fonte} onChange={(e) => setFonte(e.target.value as FonteBase)}>
              {(Object.entries(FONTES_BASE) as [FonteBase, string][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="bs-venc">Vencimento</label>
            <input className="entrada" id="bs-venc" type="text" inputMode="numeric" autoComplete="off" value={venc} onChange={(e) => setVenc(e.target.value)}
              aria-invalid={tem("vencimento") || undefined} aria-describedby={descritoPor("bs-venc-aj", tem("vencimento") && "bs-venc-er")} />
            <p className="ajuda" id="bs-venc-aj">{base.vencimento < hoje ? `O dia ${Number(base.vencimento.slice(8, 10))} já passou. Sugerimos 5 dias a partir de hoje.` : "dd/mm/aaaa"}</p>
            {tem("vencimento") ? <ErroCampo id="bs-venc-er">Escreva hoje ou depois, no formato dd/mm/aaaa.</ErroCampo> : null}
          </div>
        </div>
        <p className="hn-gera-ed" style={{ margin: 0 }}>
          <Icone nome="seta" className="ico ico-s" />
          <span>
            <b>Gera:</b>{" "}
            {conta && centavos
              ? <>{percentual(base.percentual)} de {reais(centavos)} = <b>{reais(conta)}</b>, a receber em {dia ? dataBr(dia) : "—"}{base.mes && base.de ? ` (mês ${base.mes} de ${base.de})` : ""}.</>
              : <>escreva o valor para ver a conta: {percentual(base.percentual)} dele.</>}
          </span>
        </p>
      </div>
    </Janela>
  );
}

function HonorariosConteudo() {
  const { dados, recarregar } = useCarga<HonorariosContratos>("/v1/escritorio/contratos/honorarios");
  const [aberta, setAberta] = useState<BasePendente | null>(null);
  const [feito, setFeito] = useState<{ titulo: string; texto: string } | null>(null);
  const hoje = hojeBrasilia();
  const cab = (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Contratos</p>
        <h1>Honorários</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">O que depende de alguém para virar cobrança: a base do mês, a etapa do caso e o ato feito.</p>
      </div>
    </div>
  );
  if (dados === "erro") return <>{cab}<ErroAoCarregar oque="os honorários" aoTentar={recarregar} /></>;
  if (!dados) return <>{cab}<Carregando rotulo="Carregando os honorários…" linhas={4} /></>;
  const d = dados;
  const mesAtual = MESES[Number(hoje.slice(5, 7)) - 1]!;
  const numero = (href: string, n: number, titulo: string, sub: string, cls = "") => (
    <a href={href}>
      <span className={`disco${cls ? ` ${cls}` : ""}`} aria-hidden="true"><span>{n}</span></span>
      <span className="r"><b>{titulo}</b>{sub}</span>
      <span className="sr">: {n}</span>
    </a>
  );
  return (
    <div className="hn">
      {cab}
      <nav className="folha hn-numeros" aria-label="Resumo dos honorários">
        {numero("#t-bm", d.bases.length, "Base a pedir", d.bases.some((b) => b.parada) ? "cobrança parada" : "este mês", d.bases.length ? "hn-d-urg" : "")}
        {numero("#t-et", d.etapas.length, "Esperando etapa", "êxito, sucumbência e ato")}
        {numero("#t-vc", d.noMes, "Base informada", `em ${mesAtual}`, d.noMes ? "hn-d-vinho" : "")}
        {numero("#t-tp", d.tipos.length, "Tipos em uso", `em ${contar(d.ativos, "contrato ativo", "contratos ativos")}`)}
      </nav>
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-bm" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-bm">Base do mês</h2>
                <p className="sub">Percentual recorrente sobre um valor que muda. Sem a base, a cobrança do mês não sai.</p>
              </div>
            </div>
            {d.bases.length || d.informadas.length ? (
              <ul className="ct-lembretes">
                {d.bases.map((b) => {
                  const atraso = diasEntre(b.vencimento, hoje);
                  return (
                    <li key={b.recebimentoId} className={b.parada ? "ct-parado" : undefined}>
                      <div>
                        <a className="ct-nome" href={ROTAS_CONTRATOS.contrato(b.contrato.id)}>{b.cliente}</a>
                        <small>{b.contrato.numero} · {percentual(b.percentual)} {b.sobre.toLowerCase()}{b.mes && b.de ? ` · mês ${b.mes} de ${b.de}` : ""} · com {b.responsavel.nome}</small>
                        <p style={{ marginTop: 6 }}>Base de {mesDe(b.vencimento)} a pedir desde {diaCurto(b.pedirEm)}.</p>
                      </div>
                      <div>
                        {b.parada ? <Selo tom="urgente" icone="alerta">cobrança de {diaCurto(b.vencimento)} parada</Selo> : <Selo tom="atencao" icone="relogio">cobrar em {diaCurto(b.vencimento)}</Selo>}
                        {b.parada ? <small style={{ marginTop: 6 }}>há {contar(atraso, "dia", "dias")}</small> : null}
                      </div>
                      <button data-muda className="btn btn-pri btn-compacto" type="button" onClick={() => setAberta(b)}>
                        <Icone nome="moeda" className="ico" />
                        Informar a base<span className="sr"> de {b.cliente}</span>
                      </button>
                    </li>
                  );
                })}
                {d.informadas.map((x, i) => (
                  <li key={`i${i}`}>
                    <div>
                      <a className="ct-nome" href={ROTAS_CONTRATOS.contrato(x.contrato.id)}>{x.cliente}</a>
                      <small>{x.contrato.numero} · {x.descricao.toLowerCase()}</small>
                    </div>
                    <p className="ct-calc">{reais(x.base)} dá <b>{reais(x.valor)}</b><small>Informada por {x.por.nome} em {diaCurto(x.em.slice(0, 10))}</small></p>
                    <Selo tom="andamento">a receber em {diaCurto(x.vencimento)}</Selo>
                  </li>
                ))}
              </ul>
            ) : (
              <Estado icone="relogio" titulo="Nenhuma base a pedir">
                Quando um contrato tem percentual recorrente sobre uma base que muda, o lembrete aparece aqui no dia de pedir a base.
              </Estado>
            )}
          </section>
          <section className="folha" aria-labelledby="t-et" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-et">Esperando etapa do caso</h2>
                <p className="sub">Quando alguém do Jurídico marcar a etapa, o valor entra em A receber e o Financeiro é avisado.</p>
              </div>
            </div>
            {d.etapas.length ? (
              <table className="hn-tab">
                <caption className="sr">Condições esperando etapa</caption>
                <colgroup>{["34%", "28%", "38%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <thead><tr>{["Contrato", "Condição", "Vira cobrança em"].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead>
                <tbody>
                  {d.etapas.map((x, i) => (
                    <tr key={i}>
                      <td><div className="esc"><div><a href={ROTAS_CONTRATOS.contrato(x.contrato.id)}>{x.cliente}</a><small>{x.contrato.numero}</small></div></div></td>
                      <td data-r="Condição"><SeloTipo c={x.condicao} /></td>
                      <td data-r="Vira cobrança em">{x.etapa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Estado icone="balanca" titulo="Nenhuma condição esperando etapa">
                Êxito, sucumbência e cobrança por ato aparecem aqui, com a etapa do caso que vira cobrança.
              </Estado>
            )}
            <p className="hn-pe"><Icone nome="balanca" className="ico" /><span>Onde cada caso está aparece aqui quando a área Jurídico existir.</span></p>
          </section>
        </div>
        <aside className="hn-col" aria-label="Mais sobre honorários">
          <section className="folha" aria-labelledby="t-vc">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div><h2 id="t-vc" style={{ fontSize: 20 }}>Base informada em {mesAtual}</h2></div>
            </div>
            <div className="hn-folha-acao" style={{ paddingTop: 0 }}>
              <p>{d.noMes ? `${contar(d.noMes, "base informada", "bases informadas")} neste mês. Cada uma virou um valor a receber.` : "Nenhuma base informada neste mês ainda."}</p>
            </div>
          </section>
          <section className="folha" aria-labelledby="t-tp">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div>
                <h2 id="t-tp" style={{ fontSize: 20 }}>Tipos em uso</h2>
                <p className="sub">Contratos ativos com cada tipo. Um contrato pode ter vários.</p>
              </div>
            </div>
            {d.tipos.length ? (
              <ul className="cm-motivos" style={{ listStyle: "none", margin: 0, padding: "0 24px 18px" }}>
                {d.tipos.map((t) => (
                  <li key={t.tipo}><span><TipoSo tipo={t.tipo} /></span><b className="num">{t.n}</b></li>
                ))}
              </ul>
            ) : <p className="hn-pe" style={{ borderTop: 0 }}><Icone nome="pena" className="ico" /><span>Nenhum contrato ativo ainda.</span></p>}
          </section>
          <section className="explica campo-ambar" aria-labelledby="t-hx">
            <p className="sobretitulo">Nada esquecido</p>
            <h2 id="t-hx">O caso avisa a hora de cobrar.</h2>
            <ul>
              <li><Icone nome="balanca" className="ico" /><span>Êxito, sucumbência e ato são ligados a uma etapa do caso. Marcada a etapa, o valor vira a receber.</span></li>
              <li><Icone nome="relogio" className="ico" /><span>No percentual recorrente, o responsável recebe o lembrete para pedir a base, e a cobrança parada aparece aqui.</span></li>
              <li><Icone nome="carteira" className="ico" /><span>O Financeiro vê tudo isso em A receber, com a data prevista.</span></li>
            </ul>
          </section>
        </aside>
      </div>
      {aberta ? (
        <JanelaBase key={aberta.recebimentoId} b={aberta} aoFechar={() => setAberta(null)}
          aoFeito={(v, venc) => {
            setFeito({ titulo: "Base informada", texto: `${reais(v)} a receber em ${dataBr(venc)}, no contrato ${aberta.contrato.numero}.` });
            setAberta(null);
            recarregar();
          }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

function TipoSo({ tipo }: { tipo: string }) {
  const nomes: Record<string, string> = { FIXO: "Fixo", PARCELADO: "Parcelado", MENSAL: "Mensal", EXITO: "Êxito em percentual", SUCUMBENCIA: "Sucumbência", ATO: "Por ato ou consulta", RECORRENTE: "Percentual recorrente" };
  return <span className="hn-selo">{nomes[tipo] ?? NOME_TIPO[tipo] ?? tipo}</span>;
}

export function HonorariosContratosPortal() {
  return <MolduraArea area="CONTRATOS" secao="honorarios">{() => <HonorariosConteudo />}</MolduraArea>;
}
