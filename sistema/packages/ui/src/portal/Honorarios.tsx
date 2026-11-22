"use client";
// Peças das condições de honorário (prefixo hn-), comuns a Comercial e Contratos, como no
// desenho aprovado (docs/design/aprovadas/portal-comercial-contratos, decisões 12 a 14): a
// leitura de cada condição, o selo do tipo, os cartões de marcar os tipos e um bloco por tipo
// marcado, com a faixa "Gera:".

import { useId, useState, type ReactNode } from "react";
import {
  ETAPAS_COBRANCA, leituraCondicao, ORDEM_TIPOS_HONORARIO, seloCondicao, SOBRE_EXITO, textoGera, TIPOS_HONORARIO,
  type Condicao, type TipoHonorario,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { descritoPor, ErroCampo, Janela } from "../console/pecas.tsx";
import { ICONE_TIPO, lerCondicao, mensagemCampo, ordenar, rascunhoCondicao, temDado, type RascunhoCondicao } from "./honorarios.ts";

/** O selo da condição; "curto" mostra só o nome (na tabela de recebimentos o valor já está ao lado). */
export function SeloTipo({ c, curto = false }: { c: Condicao; curto?: boolean }) {
  const extra = curto ? null : seloCondicao(c);
  return (
    <span className="hn-selo">
      <Icone nome={ICONE_TIPO[c.tipo]} className="ico ico-s" />
      {TIPOS_HONORARIO[c.tipo].nome}
      {extra ? ` ${extra}` : ""}
    </span>
  );
}

/** Condições já combinadas, para ler (ficha da proposta e do contrato). */
export function CondicoesLeitura({ condicoes, titulo = "Condições de honorário", sub, acoes, gera }: {
  condicoes: Condicao[];
  titulo?: string;
  sub?: string;
  acoes?: ReactNode;
  gera: (c: Condicao) => string;
}) {
  const id = useId();
  return (
    <section className="folha" aria-labelledby={id}>
      <div className="folha-cab">
        <div>
          <h2 id={id}>{titulo}</h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {acoes ? <div className="acoes">{acoes}</div> : null}
      </div>
      {condicoes.length ? (
        <ol className="hn-lista">
          {condicoes.map((c) => {
            const l = leituraCondicao(c);
            return (
              <li className="hn-item" key={c.tipo}>
                <span className="hn-ic">
                  <Icone nome={ICONE_TIPO[c.tipo]} className="ico" />
                </span>
                <div className="hn-txt">
                  <p className="hn-tipo">{TIPOS_HONORARIO[c.tipo].nome}</p>
                  <p className="hn-valor">
                    {l.valor} {l.complemento ? <small>{l.complemento}</small> : null}
                  </p>
                  <p className="hn-det">{l.detalhe}</p>
                  <p className="hn-gera">
                    <Icone nome="seta" className="ico ico-s" />
                    <span>{gera(c)}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="hn-pe" style={{ borderTop: 0 }}>
          <Icone nome="lapis" className="ico" />
          <span>Ainda sem condição de honorário. Edite para escrever.</span>
        </p>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------- edição

type Pessoa = { id: string; nome: string };

/** Erros por condição: { "1": ["valor"], "2": ["etapa"] } a partir de "c1.valor". */
export function errosPorCondicao(campos: string[]): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  for (const c of campos) {
    const m = /^c(\d+)\.(.+)$/.exec(c);
    if (m) (out[Number(m[1])] ??= []).push(m[2]!);
  }
  return out;
}

export function EditorCondicoes({ prefixo, lista, aoMudar, erros, errosLista, pessoas, contexto, cliente, sub }: {
  prefixo: string;
  lista: RascunhoCondicao[];
  aoMudar: (l: RascunhoCondicao[]) => void;
  /** Erros por número do bloco (1, 2...). */
  erros: Record<number, string[]>;
  /** Erro da lista inteira (nenhum tipo marcado). */
  errosLista?: string | null;
  pessoas: Pessoa[];
  contexto: "proposta" | "contrato";
  cliente?: string;
  sub: string;
}) {
  const [tirar, setTirar] = useState<TipoHonorario | null>(null);
  const marcados = new Set(lista.map((r) => r.tipo));
  const q = marcados.size;

  function alternar(t: TipoHonorario) {
    const r = lista.find((x) => x.tipo === t);
    if (r) {
      if (temDado(r)) return setTirar(t);
      return aoMudar(lista.filter((x) => x.tipo !== t));
    }
    aoMudar(ordenar([...lista, rascunhoCondicao(t)]));
  }
  const mudar = (t: TipoHonorario, p: Partial<RascunhoCondicao>) => aoMudar(lista.map((r) => (r.tipo === t ? { ...r, ...p } : r)));

  return (
    <>
      <fieldset className="hn-escolher" id={`${prefixo}-tipos`} aria-describedby={descritoPor(`${prefixo}-tipos-aj`, errosLista && `${prefixo}-tipos-er`)}>
        <legend>
          Tipos de honorário
          <span className="hn-cont-tipos">{q ? `${q} marcado${q === 1 ? "" : "s"}` : "nenhum marcado"}</span>
        </legend>
        <p id={`${prefixo}-tipos-aj`}>{sub}</p>
        <div className="hn-tipos">
          {ORDEM_TIPOS_HONORARIO.map((t) => (
            <label className="hn-tipo-ck" key={t}>
              <input className="marcar" type="checkbox" name={`${prefixo}-tp`} value={t} checked={marcados.has(t)} onChange={() => alternar(t)} />
              <span className="hn-tipo-ic">
                <Icone nome={ICONE_TIPO[t]} className="ico" />
              </span>
              <span>
                <strong>{TIPOS_HONORARIO[t].nome}</strong>
                <small>{TIPOS_HONORARIO[t].explica}</small>
              </span>
            </label>
          ))}
        </div>
        {errosLista ? <ErroCampo id={`${prefixo}-tipos-er`}>{errosLista}</ErroCampo> : null}
      </fieldset>
      {lista.map((r, i) => (
        <BlocoCondicao key={r.tipo} n={i + 1} r={r} prefixo={prefixo} erros={erros[i + 1] ?? []} aoMudar={(p) => mudar(r.tipo, p)}
          pessoas={pessoas} contexto={contexto} cliente={cliente} />
      ))}
      <Janela id={`${prefixo}-tirar`} aberta={tirar !== null} aoFechar={() => setTirar(null)} alerta
        titulo={tirar ? `Tirar a condição ${TIPOS_HONORARIO[tirar].nome}?` : ""}
        aoEnviar={() => {
          aoMudar(lista.filter((x) => x.tipo !== tirar));
          setTirar(null);
        }}
        pe={
          <>
            <button className="btn btn-fantasma" type="button" onClick={() => setTirar(null)}>Manter</button>
            <button className="btn btn-pri" type="submit">
              <Icone nome="xis" className="ico" />
              Tirar a condição
            </button>
          </>
        }>
        <p>O que já foi escrito neste bloco sai junto. Se marcar o tipo de novo, o bloco volta vazio.</p>
      </Janela>
    </>
  );
}

function BlocoCondicao({ n, r, prefixo, erros, aoMudar, pessoas, contexto, cliente }: {
  n: number;
  r: RascunhoCondicao;
  prefixo: string;
  erros: string[];
  aoMudar: (p: Partial<RascunhoCondicao>) => void;
  pessoas: Pessoa[];
  contexto: "proposta" | "contrato";
  cliente?: string;
}) {
  const id = (c: string) => `${prefixo}-c${n}-${c}`;
  const tem = (c: string) => erros.includes(c);
  const nErros = new Set(erros.map((e) => e.replace(/^atos\.\d+\.(nome|valor)$/, "atos.$1"))).size;
  const lida = lerCondicao(r);
  const gera = textoGera(lida, cliente);

  function Campo({ c, rot, cls = "c3", im, antes, depois, ajuda, opc }: {
    c: keyof RascunhoCondicao; rot: string; cls?: string; im?: "decimal" | "numeric"; antes?: string; depois?: string; ajuda?: string; opc?: boolean;
  }) {
    const erro = tem(c);
    const valor = r[c] as string;
    const entrada = (
      <input className="entrada" id={id(c)} name={id(c)} type="text" autoComplete="off" inputMode={im} value={valor}
        aria-invalid={erro || undefined} aria-describedby={descritoPor(ajuda && `${id(c)}-aj`, erro && `${id(c)}-er`)}
        onChange={(e) => aoMudar({ [c]: e.target.value } as Partial<RascunhoCondicao>)} />
    );
    return (
      <div className={`campo ${cls}`}>
        <label htmlFor={id(c)}>
          {rot}
          {opc ? <span className="opcional"> (opcional)</span> : null}
        </label>
        {antes || depois ? (
          <span className={`hn-afixo${antes ? " hn-antes" : ""}${depois ? " hn-depois" : ""}`}>
            {antes ? <span aria-hidden="true">{antes}</span> : null}
            {entrada}
            {depois ? <span aria-hidden="true">{depois}</span> : null}
          </span>
        ) : entrada}
        {ajuda ? <p className="ajuda" id={`${id(c)}-aj`}>{ajuda}</p> : null}
        {erro ? <ErroCampo id={`${id(c)}-er`}>{mensagemCampo(c, contexto)}</ErroCampo> : null}
      </div>
    );
  }
  function Selecao({ c, rot, opcoes, cls = "c4", vazio = "Escolha", ajuda }: {
    c: keyof RascunhoCondicao; rot: string; opcoes: readonly (string | [string, string])[]; cls?: string; vazio?: string | null; ajuda?: string;
  }) {
    const erro = tem(c);
    const valor = r[c] as string;
    const ops = opcoes.map((o) => (typeof o === "string" ? [o, o] : o));
    if (valor && !ops.some(([v]) => v === valor)) ops.push([valor, valor]);
    return (
      <div className={`campo ${cls}`}>
        <label htmlFor={id(c)}>{rot}</label>
        <select className="entrada" id={id(c)} name={id(c)} value={valor} aria-invalid={erro || undefined}
          aria-describedby={descritoPor(ajuda && `${id(c)}-aj`, erro && `${id(c)}-er`)}
          onChange={(e) => aoMudar({ [c]: e.target.value } as Partial<RascunhoCondicao>)}>
          {vazio !== null ? <option value="">{vazio}</option> : null}
          {ops.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        {ajuda ? <p className="ajuda" id={`${id(c)}-aj`}>{ajuda}</p> : null}
        {erro ? <ErroCampo id={`${id(c)}-er`}>{mensagemCampo(c, contexto)}</ErroCampo> : null}
      </div>
    );
  }

  let campos: ReactNode = null;
  const data = "dd/mm/aaaa";
  switch (r.tipo) {
    case "FIXO":
      campos = (
        <>
          {Campo({ c: "valor", rot: "Valor", im: "decimal", antes: "R$" })}
          {Campo({ c: "vencimento", rot: "Vencimento", im: "numeric", ajuda: data })}
        </>
      );
      break;
    case "PARCELADO":
      campos = (
        <>
          {Campo({ c: "total", rot: "Valor total", cls: "c2", im: "decimal", antes: "R$" })}
          {Campo({ c: "parcelas", rot: "Parcelas", cls: "c2", im: "numeric", ajuda: "De 1 a 120." })}
          {Campo({ c: "primeiro", rot: "Primeiro vencimento", cls: "c2", im: "numeric", ajuda: tem("primeiro") ? undefined : `${data}. As outras, no mesmo dia dos meses seguintes.` })}
        </>
      );
      break;
    case "MENSAL":
      campos = (
        <>
          {Campo({ c: "valor", rot: "Valor por mês", cls: "c2", im: "decimal", antes: "R$" })}
          {Campo({ c: "primeiro", rot: "Primeiro vencimento", cls: "c2", im: "numeric", ajuda: `${data}. Os outros, no mesmo dia.` })}
          {Campo({ c: "meses", rot: "Por quantos meses", cls: "c2", im: "numeric", depois: "meses", opc: true, ajuda: "Vazio: sem prazo para acabar." })}
          {Campo({ c: "reajuste", rot: "Reajuste", cls: "c6", opc: true, ajuda: "Ex.: IPCA, todo setembro." })}
        </>
      );
      break;
    case "EXITO":
      campos = (
        <>
          {Campo({ c: "percentual", rot: "Percentual", cls: "c2", im: "decimal", depois: "%" })}
          {Selecao({ c: "sobre", rot: "Sobre o quê", opcoes: SOBRE_EXITO, vazio: null })}
          {Selecao({ c: "etapa", rot: "Vira cobrança quando o caso chegar a", opcoes: ETAPAS_COBRANCA, ajuda: tem("etapa") ? undefined : "As etapas são as do Jurídico do escritório." })}
          {Campo({ c: "dias", rot: "Vencimento", cls: "c2", im: "numeric", depois: "dias", ajuda: "depois da etapa" })}
        </>
      );
      break;
    case "SUCUMBENCIA":
      campos = (
        <>
          <fieldset className="grupo-opcoes">
            <legend>Com quem fica</legend>
            <div className="hn-ops">
              {([["ESCRITORIO", "Inteira com o escritório", "Pertence ao advogado (Estatuto da Advocacia, art. 23)."], ["DIVIDIDA", "Dividida com o cliente", "Escreva a parte do escritório."]] as const).map(([v, t, s]) => (
                <label className="opcao" key={v}>
                  <input className="marcar" type="radio" name={id("quem")} value={v} checked={r.quem === v} onChange={() => aoMudar({ quem: v })} />
                  <span>{t}<small>{s}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          {r.quem === "DIVIDIDA" ? Campo({ c: "percentualEscritorio", rot: "Parte do escritório", cls: "c2", im: "decimal", depois: "%" }) : null}
          {Selecao({ c: "etapa", rot: "Vira valor a receber quando o caso chegar a", opcoes: ETAPAS_COBRANCA })}
        </>
      );
      break;
    case "ATO":
      campos = (
        <div className="hn-atos">
          {r.atos.map((a, i) => {
            const en = tem(`atos.${i}.nome`);
            const ev = tem(`atos.${i}.valor`);
            const mudarAto = (p: Partial<{ nome: string; valor: string }>) => aoMudar({ atos: r.atos.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <div className="hn-ato" key={i}>
                <div className="campo">
                  <label htmlFor={id(`ato${i}-nome`)}>Ato ou consulta</label>
                  <input className="entrada" id={id(`ato${i}-nome`)} type="text" autoComplete="off" value={a.nome} aria-invalid={en || undefined}
                    aria-describedby={en ? id(`ato${i}-nome-er`) : undefined} onChange={(e) => mudarAto({ nome: e.target.value })} />
                  {en ? <ErroCampo id={id(`ato${i}-nome-er`)}>{mensagemCampo("atos.0.nome")}</ErroCampo> : null}
                </div>
                <div className="campo">
                  <label htmlFor={id(`ato${i}-valor`)}>Valor</label>
                  <span className="hn-afixo hn-antes">
                    <span aria-hidden="true">R$</span>
                    <input className="entrada" id={id(`ato${i}-valor`)} type="text" inputMode="decimal" autoComplete="off" value={a.valor} aria-invalid={ev || undefined}
                      aria-describedby={ev ? id(`ato${i}-valor-er`) : undefined} onChange={(e) => mudarAto({ valor: e.target.value })} />
                  </span>
                  {ev ? <ErroCampo id={id(`ato${i}-valor-er`)}>{mensagemCampo("atos.0.valor")}</ErroCampo> : null}
                </div>
                <button className="remover" type="button" aria-label={`Tirar ${a.nome || `o ato ${i + 1}`}`} disabled={r.atos.length === 1}
                  onClick={() => aoMudar({ atos: r.atos.filter((_, j) => j !== i) })}>
                  <Icone nome="xis" className="ico" />
                </button>
              </div>
            );
          })}
          {r.atos.length < 10 ? (
            <button className="btn btn-sec btn-compacto" type="button" style={{ justifySelf: "start" }}
              onClick={() => aoMudar({ atos: [...r.atos, { nome: "", valor: "" }] })}>
              <Icone nome="mais" className="ico" />
              Outro ato
            </button>
          ) : null}
        </div>
      );
      break;
    case "RECORRENTE":
      campos = (
        <>
          {Campo({ c: "percentual", rot: "Percentual", cls: "c2", im: "decimal", depois: "%" })}
          {Campo({ c: "sobre", rot: "Sobre o quê", cls: "c4", ajuda: "Aparece no lembrete e no contrato. Ex.: Benefício mensal do cliente." })}
          {Selecao({ c: "etapa", rot: "Começa quando o caso chegar a", opcoes: ETAPAS_COBRANCA, vazio: "Numa data" })}
          {r.etapa ? null : Campo({ c: "primeiro", rot: "Primeira cobrança", cls: "c2", im: "numeric", ajuda: data })}
          {Campo({ c: "dia", rot: "Cobrar todo dia", cls: "c2", im: "numeric" })}
          {Campo({ c: "meses", rot: "Por quantos meses", cls: "c2", im: "numeric", depois: "meses" })}
          {Campo({ c: "diaLembrete", rot: "Pedir a base todo dia", cls: "c2", im: "numeric", ajuda: "O lembrete sai nesse dia." })}
          {Selecao({ c: "quemLembrete", rot: "Quem recebe o lembrete", opcoes: pessoas.map((p) => [p.id, p.nome] as [string, string]), vazio: contexto === "contrato" ? "O responsável pelo contrato" : "O responsável" })}
          <div className="c6">
            <label className="opcao">
              <input className="marcar" type="checkbox" checked={r.pedirWhats} onChange={(e) => aoMudar({ pedirWhats: e.target.checked })} />
              <span>
                Pedir também ao cliente, pelo WhatsApp do escritório
                <small>A mensagem pede o extrato do mês. A resposta chega em Conversas.</small>
              </span>
            </label>
          </div>
        </>
      );
      break;
  }

  return (
    <fieldset className={`hn-cond${nErros ? " hn-cond-erro" : ""}`} id={`${prefixo}-cond-${n}`} aria-labelledby={`${prefixo}-cond-${n}-t`}>
      <div className="hn-cond-cab">
        <span className="disco hn-n" aria-hidden="true"><span>{n}</span></span>
        <div className="hn-cond-nome">
          <strong id={`${prefixo}-cond-${n}-t`}><span className="sr">Condição {n}: </span>{TIPOS_HONORARIO[r.tipo].nome}</strong>
          <small>{TIPOS_HONORARIO[r.tipo].explica}</small>
          {nErros ? (
            <span className="selo selo-urgente">
              <Icone nome="alerta" className="ico" />
              {nErros} {nErros === 1 ? "ponto" : "pontos"} para acertar
            </span>
          ) : null}
        </div>
      </div>
      <div className="hn-campos">{campos}</div>
      <p className="hn-gera-ed" aria-live="polite">
        <Icone nome="seta" className="ico ico-s" />
        <span><b>Gera:</b> {gera}</span>
      </p>
    </fieldset>
  );
}

/** Primeiro campo de cada condição com erro, para o resumo no topo levar até ele. */
export function idDoErro(prefixo: string, campo: string): string {
  const m = /^c(\d+)\.(.+)$/.exec(campo);
  if (!m) return `${prefixo}-tipos`;
  const a = /^atos\.(\d+)\.(nome|valor)$/.exec(m[2]!);
  if (a) return `${prefixo}-c${m[1]}-ato${a[1]}-${a[2]}`;
  if (m[2] === "atos" || m[2] === "quem") return `${prefixo}-cond-${m[1]}`;
  return `${prefixo}-c${m[1]}-${m[2]}`;
}
