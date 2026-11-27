"use client";
// Ficha do escritório › aba Implantação (CO-08, F1.47). Desenho aprovado pela Carol em 27/11/2026
// (D43, DC14): docs/design/aprovadas/console-implantacao (ficha.html, estados im-*; os geradores em
// _fonte/ficha_im.py). O prazo, quem acompanha e a condição; o que já aconteceu (calculado no
// servidor, 1183); as pessoas com o convite e o treino; os treinos (registrar e desfazer); mudar o
// prazo (só a Administração); concluir (passa a Ativo, com o resumo e o efeito na cobrança).
// Quem deu, quem desfez e quem concluiu vêm da sessão, no servidor; o escritório vem do endereço e
// o banco confere a atribuição.

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ESTAGIOS_CARTEIRA, FUNCOES_CONSOLE, mesPorExtenso, TEMAS_TREINO, TEXTOS_MOTIVO,
  type ConsoleImplantacao, type FormaTreino, type TemaTreino, type TreinoImplantacao,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { brl, dataBr, diasEntre, type AssinaturaResposta } from "./cobranca.ts";
import type { FichaDoCliente } from "./ficha.ts";
import {
  AJUDA_FORMA, COMO_FORMA, conclusaoNoPrazo, conferirTreino, discoDoDia, duracao, ICONE_FORMA, juntarNomes, lerDia, linhasDaImplantacao,
  nomeForma, nomeTema, oQueJaAconteceu, papelDaPessoa, prazoNaTela, semTreino, tempoDeTreino, treinoDaPessoa,
  type ImplantacaoDoEscritorio,
} from "./implantacao.ts";
import { CARTEIRA, chamarConsole } from "./Moldura.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import { hora, iniciais } from "./tempo.ts";

/** O que a ficha carregou de `GET /v1/clientes/:id/implantacao`. */
export type EstadoImplantacao = { dados: ConsoleImplantacao } | { erro: ErroApi; status: number } | null;

type JanelaAberta = { tipo: "treino" } | { tipo: "desfazer"; treino: TreinoImplantacao } | { tipo: "trocar" } | { tipo: "prazo" } | { tipo: "concluir" } | null;

const MOTIVO_MAX = 300;
const RESUMO_MAX = 2000;
const mil = (n: number) => n.toLocaleString("pt-BR");

const nomeEstagio = (e: string) => ESTAGIOS_CARTEIRA[e as keyof typeof ESTAGIOS_CARTEIRA] ?? e;

function brPara(iso: string) {
  return dataBr(iso);
}

// ------------------------------------------------------------------------------------ peças

function Contador({ n, max, id }: { n: number; max: number; id?: string }) {
  return (
    <span className="im-contador" aria-hidden="true" id={id}>
      {mil(n)} de {mil(max)}
    </span>
  );
}

function SeloCondicao({ i }: { i: Pick<ImplantacaoDoEscritorio, "condicao" | "condicaoTexto"> }) {
  return i.condicao === "ISENTA" ? (
    <span className="selo selo-isenta">
      <Icone nome="isencao" className="ico" />
      Isenta · {i.condicaoTexto ?? "Oferta de lançamento"}
    </span>
  ) : (
    <span className="selo selo-cobrada">
      <Icone nome="fatura" className="ico" />
      Cobrada à vista
    </span>
  );
}

/** A lista de valores (1ª fatura, prévia, efeito), como `.im-conta-l` do desenho. */
export function ContaImplantacao({ linhas, total, rotulo }: {
  linhas: { texto: string; valorCentavos: number; negativo?: boolean }[];
  total?: { texto: string; valor: string };
  rotulo?: string;
}) {
  return (
    <ul className="im-conta-l" aria-label={rotulo}>
      {linhas.map((l, k) => (
        <li key={k} className={l.negativo || l.valorCentavos < 0 ? "im-neg" : undefined}>
          <span>{l.texto}</span>
          <b>{brl(l.valorCentavos)}</b>
        </li>
      ))}
      {total ? (
        <li className="im-tot">
          <span>{total.texto}</span>
          <b>{total.valor}</b>
        </li>
      ) : null}
    </ul>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true">
      <p className="sr" role="status">
        Carregando a implantação…
      </p>
      <div aria-hidden="true">
        <div className="grade">
          <div className="col">
            <section className="folha" style={{ padding: 24, display: "grid", gap: 18 }}>
              <span className="esqueleto esq-linha" style={{ width: "40%", height: 22 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
                <span className="esqueleto" style={{ height: 84 }} />
                <span className="esqueleto" style={{ height: 84 }} />
                <span className="esqueleto" style={{ height: 84 }} />
              </div>
            </section>
            <section className="folha" style={{ padding: 24, display: "grid", gap: 14 }}>
              <span className="esqueleto esq-linha" style={{ width: "30%", height: 20 }} />
              {[0, 1, 2, 3].map((k) => (
                <div key={k} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span className="esqueleto" style={{ width: 40, height: 40, borderRadius: "50%", flex: "none" }} />
                  <div style={{ flex: 1, display: "grid", gap: 8 }}>
                    <span className="esqueleto esq-linha" style={{ width: "45%", height: 12 }} />
                    <span className="esqueleto esq-linha" style={{ width: "75%", height: 10 }} />
                  </div>
                </div>
              ))}
            </section>
          </div>
          <aside className="col">
            <section className="folha" style={{ padding: 20, display: "grid", gap: 12 }}>
              <span className="esqueleto esq-linha" style={{ width: "50%", height: 18 }} />
              <span className="esqueleto esq-linha" style={{ width: "100%", height: 44 }} />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function EstadoAba({ titulo, children, acoes, codigo, erro = true, icone = "alerta" }: {
  titulo: string; children: ReactNode; acoes?: ReactNode; codigo?: string; erro?: boolean; icone?: "alerta" | "cadeado" | "coluna";
}) {
  return (
    <div className={erro ? "estado estado-erro" : "estado"} role={erro ? "alert" : "status"}>
      <span className="icone-estado">
        <Icone nome={icone} className="ico" />
      </span>
      <h3>{titulo}</h3>
      <p>{children}</p>
      {acoes ? <div className="acoes">{acoes}</div> : null}
      {codigo ? <p className="codigo">{codigo}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------------------------ topo

function Topo({ d, i, hoje, abrir, valores, escritorio }: {
  d: ConsoleImplantacao; i: ImplantacaoDoEscritorio; hoje: string; abrir: (j: JanelaAberta) => void; valores: AssinaturaResposta | null; escritorio: string;
}) {
  const ids = useId();
  const aberta = i.estado === "ABERTA";
  const p = prazoNaTela(i, hoje);
  const socio = d.situacao.socioEntrou;
  const sub = i.estado === "CONCLUIDA"
    ? `Nº ${i.numero} · aberta em ${brPara(i.abertaEm)} e concluída${i.concluidaPor ? ` por ${i.concluidaPor}` : ""}${i.concluidaEm ? ` em ${brPara(i.concluidaEm)}` : ""}, ao passar o cliente para Ativo.`
    : i.estado === "CANCELADA"
      ? `Nº ${i.numero} · aberta em ${brPara(i.abertaEm)} e cancelada sozinha quando o contrato terminou${i.canceladaEm ? `, em ${brPara(i.canceladaEm)}` : ""}.`
      : socio.entrou && socio.pessoa && socio.dia === i.abertaEm
        ? `Nº ${i.numero} · aberta em ${brPara(i.abertaEm)}, quando ${socio.pessoa.nome}, do escritório, entrou no Portal pela primeira vez.`
        : `Nº ${i.numero} · aberta em ${brPara(i.abertaEm)}.`;
  const selo = i.estado === "CONCLUIDA" ? (
    <span className="selo selo-ativo">
      <Icone nome="check" className="ico" />
      Concluída
    </span>
  ) : i.estado === "CANCELADA" ? (
    <span className="selo selo-cancelada">
      <Icone nome="xis" className="ico" />
      Cancelada
    </span>
  ) : p.tom === "ok" ? (
    <span className="selo selo-implant">Aberta</span>
  ) : (
    <span className={`selo ${p.tom === "urgente" ? "selo-urgente" : "selo-atencao"}`}>
      <Icone nome={p.tom === "urgente" ? "alerta" : "relogio"} className="ico" />
      {p.selo}
    </span>
  );
  const disco = aberta ? (
    <span className={`disco ${p.tom === "ok" ? "im-d-ok" : p.tom === "atencao" ? "im-d-atencao" : "im-d-urg"}`} aria-hidden="true">
      <span>{p.disco}</span>
    </span>
  ) : (
    <span className="disco im-d-ok" aria-hidden="true">
      <Icone nome={i.estado === "CANCELADA" ? "xis" : "check"} className="ico" />
    </span>
  );
  const [prazoT, prazoS] = aberta
    ? [p.titulo, p.detalhe]
    : i.estado === "CONCLUIDA"
      ? [`concluída em ${i.concluidaEm ? brPara(i.concluidaEm) : "data não registrada"}`, i.concluidaEm ? conclusaoNoPrazo(i.concluidaEm, i.prazoAte) : `prazo: ${brPara(i.prazoAte)}`]
      : [`cancelada em ${i.canceladaEm ? brPara(i.canceladaEm) : "data não registrada"}`, "no dia do fim do contrato"];
  const resp = i.responsavel;
  const funcoes = resp ? d.acompanhantes?.find((a) => a.id === resp.id)?.funcoes : undefined;
  const fatura = valores?.implantacao;
  const v = i.valorCentavos;
  return (
    <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
      <div className="im-cab-folha">
        <div>
          <h2 id={`${ids}-t`}>{i.nome || "Implantação assistida"}</h2>
          <p className="sub">{sub}</p>
        </div>
        {selo}
      </div>
      <div className="im-topo">
        <div>
          <p className="im-rot">Prazo</p>
          <div className="im-prazo">
            {disco}
            <span>
              <b>{prazoT}</b>
              <small>{prazoS}</small>
            </span>
          </div>
          {aberta && d.podeMudarPrazo ? (
            <button className="btn btn-sec btn-compacto" type="button" onClick={() => abrir({ tipo: "prazo" })}>
              <Icone nome="prazo" className="ico ico-s" />
              Mudar o prazo
            </button>
          ) : aberta && d.podeEditar ? (
            <p className="permissao">
              <Icone nome="cadeado" className="ico" />
              Só a Administração muda o prazo.
            </p>
          ) : null}
        </div>
        <div>
          <p className="im-rot">Quem acompanha</p>
          <div className="im-quem">
            <span className="av-p forte" aria-hidden="true">
              {resp ? iniciais(resp.nome) : "?"}
            </span>
            <span>
              <strong>{resp ? resp.nome : "Ninguém ainda"}</strong>
              <small>
                {resp
                  ? `${funcoes?.length ? funcoes.map((x) => FUNCOES_CONSOLE[x as keyof typeof FUNCOES_CONSOLE] ?? x).join(" e ") : "Equipe"} · equipe T3jus`
                  : aberta ? "Escolha quem combina os treinos." : "Ninguém acompanhou."}
              </small>
            </span>
          </div>
          {aberta && d.podeEditar ? (
            <button className="btn btn-sec btn-compacto" type="button" onClick={() => abrir({ tipo: "trocar" })}>
              <Icone nome="trocar" className="ico ico-s" />
              {resp ? (
                <>
                  Trocar<span className="sr"> quem acompanha</span>
                </>
              ) : (
                "Escolher quem acompanha"
              )}
            </button>
          ) : null}
        </div>
        <div>
          <p className="im-rot">Condição</p>
          <p>
            <SeloCondicao i={i} />
          </p>
          {i.estado === "CANCELADA" ? (
            <p className="im-peq">{fatura?.faturada ? "Chegou à 1ª fatura." : "Não chegou a nenhuma fatura."}</p>
          ) : fatura?.faturada && fatura.faturaCompetencia ? (
            d.valores && v !== undefined ? (
              <p className="im-valor-linha">
                <b>{brl(v)}</b>
                {i.condicao === "ISENTA" ? (
                  <>
                    {" "}e a isenção de <b>{brl(-v)}</b>
                  </>
                ) : null}
                , na{" "}
                {fatura.faturaId ? (
                  <a href={`/cobranca/faturas/${escritorio}/${fatura.faturaId}`}>fatura de {mesPorExtenso(fatura.faturaCompetencia)}</a>
                ) : (
                  `fatura de ${mesPorExtenso(fatura.faturaCompetencia)}`
                )}
                .
              </p>
            ) : (
              <p className="im-peq">Faturada na 1ª fatura, de {mesPorExtenso(fatura.faturaCompetencia)}.</p>
            )
          ) : (
            <>
              {d.valores && v !== undefined ? (
                <p className="im-valor-linha">
                  {i.condicao === "ISENTA" ? (
                    <>
                      Valor <b>{brl(v)}</b> e a isenção de <b>{brl(-v)}</b> na 1ª fatura: efeito <b>R$ 0,00</b>.
                    </>
                  ) : (
                    <>
                      Valor <b>{brl(v)}</b>, à vista na 1ª fatura.
                    </>
                  )}
                </p>
              ) : null}
              <p className="im-peq">Congelada em {brPara(i.abertaEm)}, na abertura. Mudar a regra em Cobrança não muda esta.</p>
              {!d.valores ? <p className="im-peq">O valor fica com a Administração e o Financeiro.</p> : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------ seções

function OQueAconteceu({ d, i }: { d: ConsoleImplantacao; i: ImplantacaoDoEscritorio }) {
  const ids = useId();
  const itens = oQueJaAconteceu(d.situacao, i.abertaEm);
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="im-cab-folha">
        <div>
          <h2 id={`${ids}-t`}>O que já aconteceu</h2>
          <p className="sub">Calculado na hora, a partir do Portal do escritório.</p>
        </div>
      </div>
      <ul className="im-feito">
        {itens.map((x) => (
          <li key={x.titulo}>
            <span className={`im-marca im-${x.marca}`} aria-hidden="true">
              <Icone nome={x.icone} className="ico" />
            </span>
            <div>
              <strong>{x.titulo}</strong>
              <small>{x.texto}</small>
            </div>
            <span className="sr">{x.marca === "sim" ? "Feito" : x.marca === "meio" ? "Em parte" : "Ainda não"}</span>
          </li>
        ))}
      </ul>
      <p className="im-calc">
        <Icone nome="ajuda" className="ico" />
        <span>Nada aqui se marca à mão. Quando o escritório faz, aparece sozinho; se desfaz, volta.</span>
      </p>
    </section>
  );
}

function Pessoas({ d }: { d: ConsoleImplantacao }) {
  const ids = useId();
  const s = d.situacao;
  return (
    <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
      <div className="im-cab-folha">
        <div>
          <h2 id={`${ids}-t`}>Pessoas do escritório</h2>
          <p className="sub">Todas as pessoas com acesso ao Portal. Quem entra depois aparece aqui sozinho.</p>
        </div>
      </div>
      <div className="im-conta">
        <span className="im-grande">
          {s.treinadas} de {s.total}
          <small>{s.total === 1 ? "pessoa treinada" : "pessoas treinadas"}</small>
        </span>
        <span className="im-barra" aria-hidden="true">
          {Array.from({ length: s.total }, (_, k) => (
            <i key={k} className={k < s.treinadas ? "im-ok" : undefined} />
          ))}
        </span>
      </div>
      {s.pessoas.length ? (
        <>
          <div className="im-pessoas-cab" aria-hidden="true">
            <span />
            <span>Pessoa</span>
            <span>Convite</span>
            <span>Treino</span>
          </div>
          <ul className="im-pessoas" aria-label="Pessoas do escritório, com o convite e o treino">
            {s.pessoas.map((p) => {
              const t = treinoDaPessoa(p, d.treinos);
              return (
                <li key={p.id}>
                  <span className={`av-p${p.funcao === "SOCIO" ? " forte" : ""}`} aria-hidden="true">
                    {iniciais(p.nome)}
                  </span>
                  <div className="im-nome">
                    <strong>{p.nome}</strong>
                    <small>{papelDaPessoa(p)}</small>
                  </div>
                  <div className="im-col">
                    <span className="im-r">Convite</span>
                    {p.convite.aceitou ? (
                      <span className="selo selo-ok">
                        <Icone nome="check" className="ico" />
                        Aceitou
                      </span>
                    ) : (
                      <span className="selo selo-neutro">
                        <Icone nome="envelope" className="ico" />
                        Ainda não entrou
                      </span>
                    )}
                    <small>{p.convite.aceitou && p.convite.aceitouEm ? `entrou em ${brPara(p.convite.aceitouEm)}` : `convidado em ${brPara(p.convite.convidadaEm)}`}</small>
                  </div>
                  <div className="im-col">
                    <span className="im-r">Treino</span>
                    {t.treinada ? (
                      <span className="selo selo-ativo">
                        <Icone nome="check" className="ico" />
                        Com treino
                      </span>
                    ) : (
                      <span className="selo selo-atencao">
                        <Icone nome="relogio" className="ico" />
                        Sem treino
                      </span>
                    )}
                    <small>{t.texto}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="im-peq" style={{ padding: "0 24px 20px" }}>
          Ninguém com acesso ao Portal ainda. Quem o sócio convidar aparece aqui sozinho.
        </p>
      )}
    </section>
  );
}

function Treinos({ d, editar, depois, abrir }: { d: ConsoleImplantacao; editar: boolean; depois: boolean; abrir: (j: JanelaAberta) => void }) {
  const ids = useId();
  return (
    <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
      <div className="im-cab-folha">
        <div>
          <h2 id={`${ids}-t`}>Treinos</h2>
          <p className="sub">
            {depois
              ? "Quem entrar no escritório depois da conclusão também é treinado e entra aqui."
              : "Cada treino guarda o dia, a duração, a forma, os temas e quem participou. Nada se apaga."}
          </p>
        </div>
        {editar ? (
          <button className="btn btn-pri" type="button" onClick={() => abrir({ tipo: "treino" })}>
            <Icone nome="mais" className="ico" />
            Registrar treino
          </button>
        ) : null}
      </div>
      {d.treinos.length ? (
        <ul className="im-treinos" aria-label="Treinos registrados">
          {d.treinos.map((t) => {
            const dd = discoDoDia(t.dia);
            const quem = juntarNomes(t.pessoas.map((p) => p.nome));
            if (t.desfeito) {
              return (
                <li key={t.id} className="im-desfeito">
                  <div className="im-dia" aria-hidden="true">
                    <span className="disco">
                      <span>{dd.dia}</span>
                    </span>
                    <small>{dd.mes}</small>
                  </div>
                  <div>
                    <h3>
                      <Icone nome={ICONE_FORMA[t.forma]} className="ico" />
                      <span className="im-riscado">
                        {nomeForma(t.forma)} · {duracao(t.duracaoMin)} · {quem}
                      </span>
                      <span className="selo selo-neutro">
                        <Icone nome="desfazer" className="ico" />
                        Desfeito
                      </span>
                    </h3>
                    <p className="im-peq">
                      <span className="sr">Treino de {brPara(t.dia)}, desfeito. </span>
                      Registrado por {t.dadoPor.nome}; desfeito por {t.desfeito.por.nome} em {brPara(t.desfeito.em)}. Não conta no treino de ninguém.
                    </p>
                    {t.desfeito.motivo ? <span className="im-motivo">“{t.desfeito.motivo}”</span> : null}
                  </div>
                  <span />
                </li>
              );
            }
            return (
              <li key={t.id}>
                <div className="im-dia" aria-hidden="true">
                  <span className="disco">
                    <span>{dd.dia}</span>
                  </span>
                  <small>{dd.mes}</small>
                </div>
                <div>
                  <h3>
                    <Icone nome={ICONE_FORMA[t.forma]} className="ico" />
                    <span>
                      <span className="sr">{brPara(t.dia)}: </span>
                      {nomeForma(t.forma)} · {duracao(t.duracaoMin)}
                    </span>
                  </h3>
                  <p>
                    <b style={{ fontWeight: 600 }}>{quem}</b> · {COMO_FORMA[t.forma]}
                  </p>
                  <p className="im-peq">Dado por {t.dadoPor.nome}</p>
                  {t.temas.length ? (
                    <div className="im-temas">
                      <span className="sr">Temas: </span>
                      {t.temas.map((x) => (
                        <span key={x} className="selo selo-neutro">
                          {nomeTema(x)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {editar ? (
                  <div className="im-acoes-l">
                    <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => abrir({ tipo: "desfazer", treino: t })}>
                      <Icone nome="desfazer" className="ico ico-s" />
                      Desfazer registro<span className="sr"> do treino de {brPara(t.dia)}</span>
                    </button>
                  </div>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="im-peq" style={{ padding: "0 24px 18px" }}>
          Nenhum treino registrado ainda.
        </p>
      )}
      <p className="im-total-treino">
        <Icone nome="relogio" className="ico" />
        <span>Tempo de treino: {tempoDeTreino(d.treinos)}. A duração ajuda a medir o custo real da implantação.</span>
      </p>
    </section>
  );
}

function ComoFunciona() {
  const ids = useId();
  return (
    <section className="explica campo-ambar" aria-labelledby={`${ids}-t`}>
      <p className="sobretitulo">Como funciona</p>
      <h2 id={`${ids}-t`} className="im-h2">
        A implantação assistida.
      </h2>
      <ul>
        <li>
          <Icone nome="relogio" className="ico" />
          <span>Até 30 dias, contados do primeiro acesso de uma sócia ou de um sócio ao Portal.</span>
        </li>
        <li>
          <Icone nome="pessoas" className="ico" />
          <span>A equipe T3jus treina todas as pessoas do escritório, em grupo ou uma a uma, e acompanha o uso. Não é uma videochamada só.</span>
        </li>
        <li>
          <Icone nome="sino" className="ico" />
          <span>O sino avisa aos 7, 3 e 0 dias do prazo. Passado o prazo, nada muda sozinho: o cliente segue em implantação até alguém concluir.</span>
        </li>
        <li>
          <Icone nome="isencao" className="ico" />
          <span>O valor e a condição (isenta ou cobrada) ficam congelados no dia em que a implantação abre.</span>
        </li>
        <li>
          <Icone nome="olho" className="ico" />
          <span>Os sócios veem no Portal o prazo, quem acompanha e o treino de cada pessoa, sem valores.</span>
        </li>
      </ul>
    </section>
  );
}

function Concluir({ d, i, abrir }: { d: ConsoleImplantacao; i: ImplantacaoDoEscritorio; abrir: (j: JanelaAberta) => void }) {
  const ids = useId();
  const faltam = semTreino(d.situacao).length;
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab" style={{ paddingBottom: 6 }}>
        <h2 id={`${ids}-t`} style={{ fontSize: 20 }}>
          Concluir
        </h2>
      </div>
      <div className="im-concluir">
        <p>
          Concluir passa o cliente para <b>Ativo</b>. Sem o teste grátis (CO-09), a cobrança começa no mesmo dia e a 1ª fatura já traz a implantação
          {i.condicao === "ISENTA" ? " e a isenção" : ", à vista"}.
        </p>
        <button className="btn btn-pri" type="button" onClick={() => abrir({ tipo: "concluir" })}>
          <Icone nome="check" className="ico" />
          Concluir a implantação
        </button>
        {faltam ? (
          <p className="im-peq">
            <Icone nome="relogio" className="ico ico-s" /> {faltam === 1 ? "1 pessoa ainda sem treino" : `${faltam} pessoas ainda sem treino`}. Dá para concluir assim; o treino{" "}
            {faltam === 1 ? "dela" : "delas"} continua sendo registrado aqui.
          </p>
        ) : (
          <p className="im-peq">{d.situacao.total === 1 ? "A pessoa foi treinada." : `As ${d.situacao.total} pessoas foram treinadas.`}</p>
        )}
      </div>
    </section>
  );
}

/** A faixa do prazo: perto (7 dias ou menos), no dia e depois (D43: im-perto, im-hoje, im-passou). */
function FaixaPrazo({ d, i, hoje, abrir }: { d: ConsoleImplantacao; i: ImplantacaoDoEscritorio; hoje: string; abrir: (j: JanelaAberta) => void }) {
  const p = prazoNaTela(i, hoje);
  if (p.tom === "ok") return null;
  const faltam = semTreino(d.situacao);
  const acoes = (d.podeConcluir && d.cliente.estado === "IMPLANTACAO") || d.podeMudarPrazo ? (
    <>
      {d.podeConcluir && d.cliente.estado === "IMPLANTACAO" ? (
        <button className="btn btn-pri btn-compacto" type="button" onClick={() => abrir({ tipo: "concluir" })}>
          <Icone nome="check" className="ico ico-s" />
          Concluir a implantação
        </button>
      ) : null}
      {d.podeMudarPrazo ? (
        <button className="btn btn-sec btn-compacto" type="button" onClick={() => abrir({ tipo: "prazo" })}>
          <Icone nome="prazo" className="ico ico-s" />
          Mudar o prazo
        </button>
      ) : null}
    </>
  ) : undefined;
  if (p.faltam > 0) {
    return (
      <Aviso tom="atencao" titulo={faltam.length ? `Faltam ${p.faltam} ${p.faltam === 1 ? "dia" : "dias"} para o prazo, e ${faltam.length === 1 ? "1 pessoa está" : `${faltam.length} pessoas estão`} sem treino.` : `Faltam ${p.faltam} ${p.faltam === 1 ? "dia" : "dias"} para o prazo.`}>
        {faltam.length ? `${juntarNomes(faltam)}. ` : "Todas as pessoas foram treinadas: dá para concluir. "}O sino avisa quem acompanha e a Administração aos 7, 3 e 0 dias do prazo.
      </Aviso>
    );
  }
  if (p.faltam === 0) {
    return (
      <Aviso tom="urgencia" titulo="O prazo da implantação vence hoje." acoes={acoes}>
        Conclua a implantação, se o escritório já está usando, ou mude o prazo com o motivo. Amanhã nada muda sozinho: o cliente continua em implantação.
      </Aviso>
    );
  }
  return (
    <Aviso tom="urgencia" titulo={`O prazo passou em ${brPara(i.prazoAte)}, há ${-p.faltam} ${p.faltam === -1 ? "dia" : "dias"}.`} acoes={acoes}>
      O cliente continua em implantação: nada passa para Ativo sozinho. Conclua, ou peça à Administração para mudar o prazo com o motivo. A promessa ao escritório é de até 30
      dias.
    </Aviso>
  );
}

// ------------------------------------------------------------------------------------ janelas

type Feito = (titulo: string, texto?: string) => void;

function JanelaTreino({ id, d, eu, nome, aoFechar, aoFeito }: { id: string; d: ConsoleImplantacao; eu: string | null; nome: string; aoFechar: () => void; aoFeito: Feito }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const hoje = d.situacao.hoje;
  const [dia, setDia] = useState(dataBr(hoje));
  const [dur, setDur] = useState("60");
  const [forma, setForma] = useState<FormaTreino>("VIDEO");
  const [pessoas, setPessoas] = useState<string[]>([]);
  const [temas, setTemas] = useState<TemaTreino[]>([]);
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [noFuturo, setNoFuturo] = useState(false);
  const [semVinculo, setSemVinculo] = useState(false);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lista = (d.temas.length ? d.temas : (Object.keys(TEMAS_TREINO) as TemaTreino[]));

  async function enviar() {
    setFalha(null);
    setSemVinculo(false);
    const c = conferirTreino({ dia, duracao: dur, pessoas }, hoje);
    setErros(c.campos);
    setNoFuturo(c.noFuturo);
    if (c.campos.size) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${id}/implantacao/treinos`, {
      corpo: { dia: lerDia(dia), duracaoMin: Number(dur), forma, pessoas, temas },
    });
    setEnviando(false);
    if (!r.ok) {
      const campos = r.erro.detalhes?.campos;
      if (r.status === 400 || r.status === 422) {
        if (Array.isArray(campos) && campos.length) {
          setErros(new Set(campos.map(String)));
          setNoFuturo(r.erro.detalhes?.motivo === "TREINO_NO_FUTURO");
          setSemVinculo(r.erro.detalhes?.motivo === "PESSOA_SEM_VINCULO");
          return focarPrimeiroErro(corpo.current);
        }
      }
      return setFalha(r.erro);
    }
    const quem = juntarNomes(d.situacao.pessoas.filter((p) => pessoas.includes(p.id)).map((p) => p.nome));
    aoFeito("Treino registrado.", `${nomeForma(forma)}, ${duracao(Number(dur))}, com ${quem}.`);
  }

  const n = erros.size;
  const inv = (c: string) => erros.has(c) || undefined;
  return (
    <Janela id={`${ids}-j`} aberta aoFechar={aoFechar} classe="im-larga" sobretitulo={`Implantação · ${nome}`} titulo="Registrar treino" descricao={`${ids}-d`}
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined} data-foco={n ? undefined : ""}>
            <Icone nome="check" className="ico" />
            {enviando ? "Registrando…" : "Registrar o treino"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>Depois de registrado, o treino não se edita. Se algo sair errado, use “Desfazer registro”, com o motivo.</p>
        {n ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(n)}>
            Nada foi registrado ainda.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="Não deu para registrar o treino.">
            {textoDoErro(falha)}
          </Aviso>
        ) : null}
        <div className="im-janela-grade">
          <div className="campo im-campo">
            <label htmlFor={`${ids}-dia`}>Dia do treino</label>
            <input className="entrada" id={`${ids}-dia`} inputMode="numeric" autoComplete="off" value={dia} onChange={(e) => setDia(e.target.value)}
              aria-invalid={inv("dia")} aria-describedby={descritoPor(erros.has("dia") && `${ids}-dia-e`, `${ids}-dia-a`)} />
            {erros.has("dia") ? (
              <ErroCampo id={`${ids}-dia-e`}>
                {noFuturo ? TEXTOS_MOTIVO.TREINO_NO_FUTURO : "Escreva o dia como dd/mm/aaaa, de hoje ou de antes."}
              </ErroCampo>
            ) : null}
            <p className="ajuda" id={`${ids}-dia-a`}>
              dd/mm/aaaa. Hoje ou antes.
            </p>
          </div>
          <div className="campo im-campo">
            <label htmlFor={`${ids}-dur`}>Duração, em minutos</label>
            <input className="entrada" id={`${ids}-dur`} inputMode="numeric" autoComplete="off" value={dur} onChange={(e) => setDur(e.target.value)}
              aria-invalid={inv("duracaoMin")} aria-describedby={descritoPor(erros.has("duracaoMin") && `${ids}-dur-e`, `${ids}-dur-a`)} />
            {erros.has("duracaoMin") ? <ErroCampo id={`${ids}-dur-e`}>Escreva entre 15 e 480 minutos.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-dur-a`}>
              De 15 a 480 minutos (8 horas).
            </p>
          </div>
          <fieldset className="grupo-opcoes im-grupo im-inteira" aria-describedby={erros.has("forma") ? `${ids}-forma-e` : undefined}>
            <legend>Forma</legend>
            {(["VIDEO", "PRESENCIAL", "TELEFONE"] as FormaTreino[]).map((k) => (
              <label className="opcao" key={k}>
                <input className="marcar" type="radio" name={`${ids}-forma`} checked={forma === k} onChange={() => setForma(k)} aria-invalid={inv("forma")} />
                <span>
                  {nomeForma(k)}
                  <small>{AJUDA_FORMA[k]}</small>
                </span>
              </label>
            ))}
            {erros.has("forma") ? <ErroCampo id={`${ids}-forma-e`}>Escolha a forma do treino.</ErroCampo> : null}
          </fieldset>
          <fieldset className="grupo-opcoes im-grupo im-inteira" aria-describedby={descritoPor(erros.has("pessoas") && `${ids}-pess-e`, `${ids}-pess-a`)}>
            <legend>Quem participou</legend>
            <div className="im-marcas" style={{ ["--cols" as string]: 2 }}>
              {d.situacao.pessoas.map((p) => (
                <label className="opcao" key={p.id}>
                  <input className="marcar" type="checkbox" checked={pessoas.includes(p.id)} aria-invalid={inv("pessoas")}
                    aria-describedby={erros.has("pessoas") ? `${ids}-pess-e` : undefined}
                    onChange={(e) => setPessoas((x) => (e.target.checked ? [...x, p.id] : x.filter((y) => y !== p.id)))} />
                  <span>
                    {p.nome}
                    <small>
                      {!p.convite.aceitou ? "ainda não entrou no Portal" : p.treino.treinada ? `com treino em ${brPara(p.treino.dia).slice(0, 5)}` : "sem treino"}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            {erros.has("pessoas") ? (
              <ErroCampo id={`${ids}-pess-e`}>{semVinculo ? TEXTOS_MOTIVO.PESSOA_SEM_VINCULO : "Marque pelo menos uma pessoa."}</ErroCampo>
            ) : null}
            <p className="ajuda" id={`${ids}-pess-a`}>
              Só aparece quem tem acesso ao Portal da {nome}.
            </p>
          </fieldset>
          <fieldset className="grupo-opcoes im-grupo im-inteira" aria-describedby={descritoPor(erros.has("temas") && `${ids}-temas-e`, `${ids}-temas-a`)}>
            <legend>Temas</legend>
            <div className="im-marcas" style={{ ["--cols" as string]: 3 }}>
              {lista.map((t) => (
                <label className="opcao" key={t}>
                  <input className="marcar" type="checkbox" checked={temas.includes(t)} aria-invalid={inv("temas")}
                    onChange={(e) => setTemas((x) => (e.target.checked ? [...x, t] : x.filter((y) => y !== t)))} />
                  <span>{nomeTema(t)}</span>
                </label>
              ))}
            </div>
            {erros.has("temas") ? <ErroCampo id={`${ids}-temas-e`}>Escolha os temas da lista.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-temas-a`}>
              As áreas do Portal que o treino cobriu.
            </p>
          </fieldset>
          <div className="im-autor im-inteira">
            <span className="av-p" aria-hidden="true">
              {eu ? iniciais(eu) : "EU"}
            </span>
            <span>
              Dado por <b>{eu ? `${eu} (você)` : "você"}</b>. O nome vem da sua sessão.
            </span>
          </div>
        </div>
      </div>
    </Janela>
  );
}

function JanelaDesfazer({ id, t, nome, aoFechar, aoFeito }: { id: string; t: TreinoImplantacao; nome: string; aoFechar: () => void; aoFeito: Feito }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const quem = juntarNomes(t.pessoas.map((p) => p.nome));
  async function enviar() {
    setFalha(null);
    if (!motivo.trim()) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setErro(false);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${id}/implantacao/treinos/${t.id}/desfazer`, { corpo: { motivo: motivo.trim() } });
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.detalhes?.motivo === "MOTIVO_OBRIGATORIO") {
        setErro(true);
        return focarPrimeiroErro(corpo.current);
      }
      return setFalha(r.erro);
    }
    aoFeito("Registro desfeito.", `O treino de ${brPara(t.dia)} fica na lista, riscado, com o motivo.`);
  }
  return (
    <Janela id={`${ids}-j`} aberta alerta aoFechar={aoFechar} sobretitulo={`Implantação · ${nome}`} titulo={`Desfazer o registro do treino de ${brPara(t.dia).slice(0, 5)}?`}
      descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco="">
            Voltar
          </button>
          <button className="btn btn-perigo" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="desfazer" className="ico" />
            {enviando ? "Desfazendo…" : "Desfazer o registro"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>
          O registro não é apagado: fica na lista, riscado, com o motivo. {quem} {t.pessoas.length === 1 ? "volta" : "voltam"} a contar como sem treino, se não{" "}
          {t.pessoas.length === 1 ? "tiver" : "tiverem"} outro.
        </p>
        {erro ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(1)}>
            Nada foi desfeito.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="Não deu para desfazer.">
            {textoDoErro(falha)}
          </Aviso>
        ) : null}
        <ul className="im-conta-l">
          <li>
            <span>Treino</span>
            <b>
              {brPara(t.dia)} · {nomeForma(t.forma)}, {duracao(t.duracaoMin)}
            </b>
          </li>
          <li>
            <span>Quem participou</span>
            <b>{quem}</b>
          </li>
          <li>
            <span>Dado por</span>
            <b>{t.dadoPor.nome}</b>
          </li>
        </ul>
        <div className="campo im-campo">
          <div className="im-rot-linha">
            <label htmlFor={`${ids}-m`}>Motivo</label>
            <Contador n={motivo.length} max={MOTIVO_MAX} />
          </div>
          <textarea className="entrada" id={`${ids}-m`} rows={3} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-required="true"
            aria-invalid={erro || undefined} aria-describedby={descritoPor(erro && `${ids}-m-e`, `${ids}-m-a`)} />
          {erro ? <ErroCampo id={`${ids}-m-e`}>Escreva o motivo. Ele fica no histórico interno do cliente.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-m-a`}>
            Obrigatório. Fica no histórico interno do cliente, com o seu nome e a hora.
          </p>
        </div>
      </div>
    </Janela>
  );
}

function JanelaTrocar({ id, d, i, nome, aoFechar, aoFeito }: { id: string; d: ConsoleImplantacao; i: ImplantacaoDoEscritorio; nome: string; aoFechar: () => void; aoFeito: Feito }) {
  const ids = useId();
  const opcoes = d.acompanhantes ?? [];
  const [escolha, setEscolha] = useState<string | null>(i.responsavel?.id ?? null);
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar() {
    setFalha(null);
    if (!escolha) return setErro(true);
    setErro(false);
    if (escolha === i.responsavel?.id) return aoFechar();
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${id}/implantacao/responsavel`, { metodo: "PUT", corpo: { responsavelId: escolha, versao: i.versao } });
    setEnviando(false);
    if (!r.ok) return setFalha(r.erro);
    aoFeito("Quem acompanha mudou.", `Agora é ${opcoes.find((o) => o.id === escolha)?.nome ?? "a pessoa escolhida"}. Ela recebe os avisos do prazo no sino.`);
  }
  return (
    <Janela id={`${ids}-j`} aberta aoFechar={aoFechar} sobretitulo={`Implantação · ${nome}`} titulo="Trocar quem acompanha" descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="trocar" className="ico" />
            {enviando ? "Trocando…" : "Trocar"}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>Quem acompanha combina os treinos e responde ao escritório durante a implantação.</p>
        {falha ? (
          <Aviso tom="urgencia" titulo="Não deu para trocar.">
            {falha.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou a implantação enquanto esta janela estava aberta. Feche e abra de novo para ver como está." : textoDoErro(falha)}
          </Aviso>
        ) : null}
        <fieldset className="grupo-opcoes im-grupo im-opcoes-resp" aria-describedby={descritoPor(erro && `${ids}-e`, `${ids}-a`)}>
          <legend>Quem acompanha</legend>
          {opcoes.map((o, k) => (
            <label className="opcao" key={o.id}>
              <input className="marcar" type="radio" name={`${ids}-resp`} checked={escolha === o.id} onChange={() => setEscolha(o.id)} aria-invalid={erro || undefined}
                data-foco={(escolha ? escolha === o.id : k === 0) ? "" : undefined} />
              <span className="im-o">
                <span className="av-p" aria-hidden="true">
                  {iniciais(o.nome)}
                </span>
                <span>
                  {o.nome}
                  <small>
                    {o.funcoes.map((x) => FUNCOES_CONSOLE[x as keyof typeof FUNCOES_CONSOLE] ?? x).join(" e ")}
                    {o.id === i.responsavel?.id ? " · acompanha hoje" : ""}
                  </small>
                </span>
              </span>
            </label>
          ))}
          {erro ? <ErroCampo id={`${ids}-e`}>Escolha quem acompanha.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-a`}>
            Só aparece quem atende a {nome} com a função Implantação ou Administração. Para incluir alguém, atribua na aba Equipe T3jus.
          </p>
        </fieldset>
        <Aviso tom="info" titulo="A pessoa nova recebe os avisos do prazo no sino.">
          Os sócios veem no Portal o nome de quem acompanha.
        </Aviso>
      </div>
    </Janela>
  );
}

function JanelaPrazo({ id, i, hoje, nome, aoFechar, aoFeito }: { id: string; i: ImplantacaoDoEscritorio; hoje: string; nome: string; aoFechar: () => void; aoFeito: Feito }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [novo, setNovo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [prazoInvalido, setPrazoInvalido] = useState(false);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar() {
    setFalha(null);
    const e = new Set<string>();
    const dia = lerDia(novo);
    const ruim = !!dia && (dia < hoje || dia === i.prazoAte);
    if (!dia || ruim) e.add("prazoAte");
    if (!motivo.trim()) e.add("motivo");
    setErros(e);
    setPrazoInvalido(ruim);
    if (e.size) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${id}/implantacao/prazo`, { metodo: "PUT", corpo: { versao: i.versao, prazoAte: dia, motivo: motivo.trim() } });
    setEnviando(false);
    if (!r.ok) {
      const campos = r.erro.detalhes?.campos;
      if (Array.isArray(campos) && campos.length) {
        setErros(new Set(campos.map(String)));
        setPrazoInvalido(r.erro.detalhes?.motivo === "PRAZO_INVALIDO");
        return focarPrimeiroErro(corpo.current);
      }
      return setFalha(r.erro);
    }
    aoFeito("Prazo mudado.", `A implantação vai até ${brPara(dia!)}. Os avisos do sino passam a contar do prazo novo.`);
  }
  const n = erros.size;
  return (
    <Janela id={`${ids}-j`} aberta aoFechar={aoFechar} sobretitulo={`Implantação · ${nome}`} titulo="Mudar o prazo da implantação" descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="prazo" className="ico" />
            {enviando ? "Mudando…" : "Mudar o prazo"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>Só a Administração muda o prazo.</p>
        {n ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(n)}>
            O prazo não mudou.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="O prazo não mudou.">
            {falha.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou a implantação enquanto esta janela estava aberta. Feche e abra de novo para ver como está." : textoDoErro(falha)}
          </Aviso>
        ) : null}
        <ul className="im-conta-l">
          <li>
            <span>Prazo de hoje</span>
            <b>{brPara(i.prazoAte)}</b>
          </li>
          <li className="im-sub">
            <span>
              Aberta em {brPara(i.abertaEm)} · {diasEntre(i.abertaEm, i.prazoAte)} dias
            </span>
            <span />
          </li>
        </ul>
        <div className="im-janela-grade">
          <div className="campo im-campo">
            <label htmlFor={`${ids}-n`}>Novo prazo</label>
            <input className="entrada" id={`${ids}-n`} inputMode="numeric" autoComplete="off" value={novo} onChange={(e) => setNovo(e.target.value)} data-foco=""
              aria-invalid={erros.has("prazoAte") || undefined} aria-describedby={descritoPor(erros.has("prazoAte") && `${ids}-n-e`, `${ids}-n-a`)} />
            {erros.has("prazoAte") ? (
              <ErroCampo id={`${ids}-n-e`}>{prazoInvalido ? TEXTOS_MOTIVO.PRAZO_INVALIDO : "Escreva a data como dd/mm/aaaa."}</ErroCampo>
            ) : null}
            <p className="ajuda" id={`${ids}-n-a`}>
              dd/mm/aaaa. De hoje em diante.
            </p>
          </div>
          <div className="campo im-campo im-inteira">
            <div className="im-rot-linha">
              <label htmlFor={`${ids}-m`}>Motivo</label>
              <Contador n={motivo.length} max={MOTIVO_MAX} />
            </div>
            <textarea className="entrada" id={`${ids}-m`} rows={3} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-required="true"
              aria-invalid={erros.has("motivo") || undefined} aria-describedby={descritoPor(erros.has("motivo") && `${ids}-m-e`, `${ids}-m-a`)} />
            {erros.has("motivo") ? <ErroCampo id={`${ids}-m-e`}>Escreva o motivo da mudança.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-m-a`}>
              Obrigatório. Fica no histórico interno do cliente; o escritório não vê o motivo.
            </p>
          </div>
        </div>
        <Aviso tom="info" titulo="Os avisos do sino passam a contar do prazo novo.">
          No Portal, os sócios veem a data nova.
        </Aviso>
      </div>
    </Janela>
  );
}

/** O efeito de concluir na cobrança (D43: im-concluir e im-concluir-co09). */
function EfeitoNaCobranca({ ass, i, valores }: { ass: AssinaturaResposta | null | "erro"; i: ImplantacaoDoEscritorio; valores: boolean }) {
  const isenta = i.condicao === "ISENTA";
  const titulo = (t: string) => (
    <h3>
      <Icone nome="fatura" className="ico" />
      {t}
    </h3>
  );
  if (ass === null) return <div className="im-efeito"><p className="im-peq" role="status">Lendo a assinatura para mostrar o efeito na cobrança…</p></div>;
  if (ass === "erro") {
    return (
      <div className="im-efeito">
        {titulo("Na cobrança")}
        <p>Não deu para ler a assinatura agora. Concluir continua possível: o efeito na cobrança aparece na aba Assinatura.</p>
      </div>
    );
  }
  const a = ass.assinatura;
  const bloco = ass.implantacao;
  const vai = bloco ? bloco.naFatura : true;
  const com = vai ? (isenta ? " e traz a implantação com a isenção" : " e traz a implantação à vista") : "";
  if (!a) {
    return (
      <div className="im-efeito">
        {titulo("Na cobrança")}
        <p>Este escritório ainda não tem assinatura. A cobrança começa quando ela for preparada{vai ? ", e a 1ª fatura traz a implantação" : ""}.</p>
      </div>
    );
  }
  const v = i.valorCentavos;
  const prox = a.proxima;
  const linhasImpl = v !== undefined && vai ? linhasDaImplantacao({ descricao: i.descricao, valorCentavos: v, isenta, texto: i.condicaoTexto }) : [];
  const jaTem = prox?.itens.some((x) => x.tipo === "IMPLANTACAO") ?? false;
  const conta = valores && prox && v !== undefined ? (
    <ContaImplantacao rotulo={`1ª fatura, ${mesPorExtenso(prox.competencia)}`}
      linhas={[
        ...prox.itens.map((x) => ({ texto: x.tipo === "MENSALIDADE" ? `${x.descricao} · ${mesPorExtenso(prox.competencia)}` : x.descricao, valorCentavos: x.valorCentavos })),
        ...(jaTem ? [] : linhasImpl),
      ]}
      total={{ texto: "Total da 1ª fatura", valor: brl(prox.totalCentavos + (jaTem || isenta || !vai ? 0 : v)) }} />
  ) : null;
  const semValor = !valores ? <p className="im-peq">Os valores ficam com a Administração e o Financeiro.</p> : null;
  const naoVai = !vai ? <p className="im-peq">Por enquanto, a linha da implantação não entra na fatura: ela entra quando o Portal passar a mostrar a implantação.</p> : null;
  if (a.inicioCobranca) {
    return (
      <div className="im-efeito">
        {titulo("Na cobrança, nada muda")}
        <p>
          Com o teste grátis (CO-09), a cobrança já começou, em <b>{brPara(a.inicioCobranca)}</b>.
          {bloco?.faturada && bloco.faturaCompetencia ? (
            <>
              {" "}A 1ª fatura, de <b>{mesPorExtenso(bloco.faturaCompetencia)}</b>
              {bloco.faturaNumero ? ` (nº ${bloco.faturaCompetencia.slice(0, 4)}/${String(bloco.faturaNumero).padStart(4, "0")})` : ""}, já traz a implantação
              {isenta ? " e a isenção" : ""}.
            </>
          ) : null}
        </p>
        {semValor}
      </div>
    );
  }
  return (
    <div className="im-efeito">
      {titulo("Na cobrança")}
      <p>
        A cobrança começa <b>hoje</b>.
        {prox ? (
          <>
            {" "}A 1ª fatura, de <b>{mesPorExtenso(prox.competencia)}</b>, sai hoje, vence em <b>{brPara(prox.vencimento)}</b>
            {com}.
          </>
        ) : null}
      </p>
      {conta}
      {semValor}
      {naoVai}
    </div>
  );
}

function JanelaConcluir({ id, d, i, ass, nome, recarregar, aoFechar, aoFeito }: {
  id: string; d: ConsoleImplantacao; i: ImplantacaoDoEscritorio; ass: AssinaturaResposta | null | "erro"; nome: string;
  recarregar: () => Promise<ConsoleImplantacao | null>; aoFechar: () => void; aoFeito: Feito;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [resumo, setResumo] = useState("");
  const [versoes, setVersoes] = useState({ cliente: d.cliente.versao, implantacao: i.versao });
  const [conflito, setConflito] = useState<{ campo: string; salvo: string; via: string }[] | null>(null);
  const [erroResumo, setErroResumo] = useState(false);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar() {
    setFalha(null);
    setConflito(null);
    if (resumo.length > RESUMO_MAX) {
      setErroResumo(true);
      return focarPrimeiroErro(corpo.current);
    }
    setErroResumo(false);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${id}/implantacao/concluir`, {
      corpo: { versaoCliente: versoes.cliente, versaoImplantacao: versoes.implantacao, resumo: resumo.trim() || null },
    });
    setEnviando(false);
    if (!r.ok) {
      if (r.status === 409) {
        const novo = await recarregar();
        const ni = novo?.implantacao;
        if (novo && ni && ni.estado === "ABERTA") {
          const linhas: { campo: string; salvo: string; via: string }[] = [];
          if (ni.prazoAte !== i.prazoAte) linhas.push({ campo: "Prazo", salvo: brPara(ni.prazoAte), via: brPara(i.prazoAte) });
          if (ni.responsavel?.id !== i.responsavel?.id) linhas.push({ campo: "Quem acompanha", salvo: ni.responsavel?.nome ?? "Ninguém", via: i.responsavel?.nome ?? "Ninguém" });
          if (novo.cliente.estado !== d.cliente.estado) linhas.push({ campo: "Estágio", salvo: nomeEstagio(novo.cliente.estado), via: nomeEstagio(d.cliente.estado) });
          setVersoes({ cliente: novo.cliente.versao, implantacao: ni.versao });
          setConflito(linhas);
          return;
        }
      }
      if (r.erro.detalhes?.campos && Array.isArray(r.erro.detalhes.campos) && r.erro.detalhes.campos.includes("resumo")) {
        setErroResumo(true);
        return focarPrimeiroErro(corpo.current);
      }
      return setFalha(r.erro);
    }
    aoFeito("Implantação concluída.", `${nome} agora está Ativo. O resumo aparece para os sócios no Portal.`);
  }
  const motivo = falha?.detalhes?.motivo;
  return (
    <Janela id={`${ids}-j`} aberta alerta classe="im-larga" aoFechar={aoFechar} sobretitulo={`Implantação · ${nome}`} titulo={`Concluir a implantação da ${nome}?`}
      descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={conflito ? "" : undefined}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            {enviando ? "Concluindo…" : "Concluir e passar para Ativo"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>A implantação termina e o cliente passa para Ativo. Não dá para voltar pelo Console. O motivo do estágio fica “Implantação concluída”, no histórico.</p>
        {conflito ? (
          <Aviso tom="urgencia" titulo="Outra pessoa mudou a implantação enquanto esta janela estava aberta."
            corpo={
              <>
                {conflito.length ? (
                  <table className="comparar">
                    <caption className="sr">O que mudou</caption>
                    <thead>
                      <tr>
                        <th scope="col">Campo</th>
                        <th scope="col">Salvo agora</th>
                        <th scope="col">O que você via</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conflito.map((l) => (
                        <tr key={l.campo}>
                          <th scope="row">{l.campo}</th>
                          <td>{l.salvo}</td>
                          <td>{l.via}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                <p className="im-peq" style={{ marginTop: 6 }}>
                  VERSION_CONFLICT
                </p>
              </>
            }>
            Nada foi concluído. O resumo que você escreveu continua aqui. Confira a mudança e conclua de novo.
          </Aviso>
        ) : erroResumo ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(1)}>
            Nada foi concluído.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="Nada foi concluído."
            corpo={typeof motivo === "string" ? <p className="im-peq" style={{ marginTop: 6 }}>{motivo}</p> : undefined}>
            {textoDoErro(falha)}
          </Aviso>
        ) : null}
        <div className="passagem" aria-hidden="true">
          <span className="selo selo-implant">Em implantação</span>
          <Icone nome="seta" className="ico" />
          <span className="selo selo-ativo">
            <span className="bolinha" />
            Ativo
          </span>
        </div>
        <div className="campo im-campo">
          <div className="im-rot-linha">
            <label htmlFor={`${ids}-r`}>
              Resumo para o escritório <span className="opcional">(opcional)</span>
            </label>
            <Contador n={resumo.length} max={RESUMO_MAX} />
          </div>
          <textarea className="entrada" id={`${ids}-r`} rows={4} value={resumo} onChange={(e) => setResumo(e.target.value)} data-foco={conflito ? undefined : ""}
            aria-invalid={erroResumo || undefined} aria-describedby={descritoPor(erroResumo && `${ids}-r-e`, `${ids}-r-a`)} />
          {erroResumo ? <ErroCampo id={`${ids}-r-e`}>O resumo vai até 2.000 caracteres.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-r-a`}>
            Os sócios leem este resumo no Portal, em Escritório › Implantação. Até 2.000 caracteres.
          </p>
        </div>
        <EfeitoNaCobranca ass={ass} i={i} valores={d.valores} />
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------------------ a aba

export function AbaImplantacao({ id, f, estado, recarregar, aoConcluir, eu, concluirAoAbrir }: {
  id: string;
  f: FichaDoCliente;
  estado: EstadoImplantacao;
  /** Lê a implantação de novo e devolve o que leu. */
  recarregar: () => Promise<ConsoleImplantacao | null>;
  /** Concluída: a ficha lê o estágio de novo. */
  aoConcluir: () => void;
  /** O nome de quem usa (a sessão), para "Dado por". */
  eu: string | null;
  /** Abrir já a janela de concluir (atalho do cabeçalho e da aba Contrato). */
  concluirAoAbrir?: boolean;
}) {
  const ids = useId();
  const [janela, setJanela] = useState<JanelaAberta>(null);
  const [feito, setFeito] = useState<{ titulo: string; texto?: string } | null>(null);
  const [ass, setAss] = useState<AssinaturaResposta | null | "erro">(null);
  // O atalho "?concluir=1" (cabeçalho e aba Contrato) abre a janela de concluir assim que a
  // implantação chega, enquanto nenhuma outra janela foi aberta ou fechada.
  const [atalho, setAtalho] = useState(!!concluirAoAbrir);
  const leuAss = useRef(false);
  const nome = f.escritorio.nome;
  const dados = estado && "dados" in estado ? estado.dados : null;
  const i = dados?.implantacao ?? null;

  const carregarAss = useCallback(async () => {
    const r = await chamarConsole<AssinaturaResposta>(`/v1/clientes/${id}/assinatura`);
    setAss(r.ok ? r.dados : "erro");
  }, [id]);
  useEffect(() => {
    if (!i || leuAss.current) return;
    leuAss.current = true;
    void carregarAss();
  }, [i, carregarAss]);

  if (!f.permissoes.includes("console.implantacao.ver") || (estado && "erro" in estado && (estado.status === 403 || estado.erro.codigo === "FORBIDDEN"))) {
    return (
      <EstadoAba titulo={`Você não vê a implantação da ${nome}`} erro={false} icone="cadeado" codigo="SEM_PERMISSAO"
        acoes={
          <a className="btn btn-sec" href={CARTEIRA}>
            <Icone nome="esquerda" className="ico" />
            Voltar à carteira
          </a>
        }>
        Só quem está na Equipe T3jus deste cliente vê a implantação. Se você precisa ajudar este escritório, peça à Administração para atribuir você.
      </EstadoAba>
    );
  }
  if (!estado) return <Esqueleto />;
  if ("erro" in estado) {
    return (
      <EstadoAba titulo="Não deu para carregar a implantação deste cliente" codigo={`Código para o suporte: ${estado.erro.codigo}`}
        acoes={
          <button className="btn btn-pri" type="button" onClick={() => void recarregar()}>
            <Icone nome="reenviar" className="ico" />
            Tentar de novo
          </button>
        }>
        O servidor não respondeu. Os treinos e o prazo continuam salvos. Tente de novo; se continuar, mande o código abaixo ao suporte.
      </EstadoAba>
    );
  }
  const d = estado.dados;
  if (!i) {
    return (
      <div className="grade">
        <div className="col">
          <EstadoAba titulo="Ainda sem implantação" erro={false} icone="coluna">
            {f.cliente.estagio === "IMPLANTACAO"
              ? "A implantação assistida abre no primeiro acesso de um sócio ao Portal, ou na emissão da 1ª fatura. Até lá, não há prazo nem treinos."
              : "Este escritório não teve implantação assistida."}
          </EstadoAba>
        </div>
        <aside className="col" aria-label="Como funciona">
          <ComoFunciona />
        </aside>
      </div>
    );
  }

  const hoje = d.situacao.hoje;
  const aberta = i.estado === "ABERTA";
  const editar = d.podeEditar && i.estado !== "CANCELADA" && !["ENCERRADO"].includes(f.cliente.estagio);
  const concluir = aberta && d.podeConcluir && d.cliente.estado === "IMPLANTACAO";
  const abrir = (j: JanelaAberta) => {
    setFeito(null);
    setAtalho(false);
    setJanela(j);
  };
  const fechar = () => {
    setAtalho(false);
    setJanela(null);
  };
  const pronto: Feito = (titulo, texto) => {
    setAtalho(false);
    setJanela(null);
    setFeito({ titulo, texto });
    void recarregar();
  };

  return (
    <>
      {feito ? (
        <Aviso tom="sucesso" className="toast" titulo={feito.titulo}>
          {feito.texto}
        </Aviso>
      ) : null}
      <div className="grade">
        <div className="col">
          {i.estado === "CANCELADA" ? (
            <Aviso tom="info" icone="historico" titulo="A implantação foi cancelada com o fim do contrato.">
              O motivo está no histórico do encerramento. Os treinos ficam aqui, só para leitura. Se o contrato for reaberto ainda em implantação, abre uma implantação nova, a nº{" "}
              {i.numero + 1}, com a regra do dia.
            </Aviso>
          ) : aberta ? (
            <FaixaPrazo d={d} i={i} hoje={hoje} abrir={abrir} />
          ) : null}
          {!d.podeEditar ? (
            <p className="cb-so-ver im-msg-leitura" style={{ margin: 0 }}>
              <Icone nome="olho" className="ico" />
              <span>Você vê a implantação. Quem registra treinos, troca o responsável e conclui é a Implantação ou a Administração.</span>
            </p>
          ) : null}
          <Topo d={d} i={i} hoje={hoje} abrir={abrir} valores={ass === "erro" ? null : ass} escritorio={id} />
          {i.estado === "CONCLUIDA" && i.resumo ? (
            <section className="folha" aria-labelledby={`${ids}-res`}>
              <div className="im-cab-folha">
                <div>
                  <h2 id={`${ids}-res`}>Resumo da conclusão</h2>
                  <p className="sub">Os sócios leem este texto no Portal, em Escritório › Implantação.</p>
                </div>
              </div>
              <div className="im-resumo-sec">
                <p className="im-resumo">“{i.resumo}”</p>
                {i.concluidaEm ? (
                  <p className="im-resumo-pe">
                    {i.concluidaPor ?? "Equipe T3jus"} · {brPara(i.concluidaEm)}, às {hora(i.concluidaEm)}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
          <OQueAconteceu d={d} i={i} />
          <Pessoas d={d} />
          <Treinos d={d} editar={editar} depois={i.estado === "CONCLUIDA"} abrir={abrir} />
        </div>
        <aside className="col" aria-label="Concluir e como funciona">
          {concluir ? <Concluir d={d} i={i} abrir={abrir} /> : null}
          <ComoFunciona />
        </aside>
      </div>
      {janela?.tipo === "treino" ? <JanelaTreino id={id} d={d} eu={eu} nome={nome} aoFechar={fechar} aoFeito={pronto} /> : null}
      {janela?.tipo === "desfazer" ? <JanelaDesfazer key={janela.treino.id} id={id} t={janela.treino} nome={nome} aoFechar={fechar} aoFeito={pronto} /> : null}
      {janela?.tipo === "trocar" ? <JanelaTrocar id={id} d={d} i={i} nome={nome} aoFechar={fechar} aoFeito={pronto} /> : null}
      {janela?.tipo === "prazo" ? <JanelaPrazo id={id} i={i} hoje={hoje} nome={nome} aoFechar={fechar} aoFeito={pronto} /> : null}
      {janela?.tipo === "concluir" || (atalho && !janela && concluir) ? (
        <JanelaConcluir id={id} d={d} i={i} ass={ass} nome={nome} recarregar={recarregar} aoFechar={fechar}
          aoFeito={(t, x) => {
            setAtalho(false);
            setJanela(null);
            setFeito({ titulo: t, texto: x });
            aoConcluir();
            void carregarAss();
          }} />
      ) : null}
    </>
  );
}
