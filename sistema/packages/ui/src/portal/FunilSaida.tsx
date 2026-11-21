"use client";
// Por que o primeiro contato não recebeu proposta (F3.8, AP-03), desenho aprovado em
// docs/design/aprovadas/portal-comercial-financeiro-pendencias (seção 1, decisões 1 a 10):
// o bloco "Quanto vira contrato" em três números e uma barra (opção B, escolha da Carol em
// 21/11/2026), a janela "Encerrar sem proposta", "Voltar ao funil", a folha "Saíram sem proposta"
// e a folha "No funil do Comercial" da ficha do cliente.

import { useRef, useState } from "react";
import {
  MOTIVOS_RECUSA, MOTIVOS_SAIDA_FUNIL,
  type ClienteFunil, type Funil, type MotivoForaFunil, type SaidaFunil,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { diaCurto } from "./agenda.ts";
import { taxa, textoPeriodo } from "./comercial.ts";
import { Selo } from "./Comercial.tsx";
import { chamarPortal } from "./Moldura.tsx";

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDe = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDe = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");

/** "hoje", "hoje, às 10h20" ou "em 12/11". */
export function quandoMarcou(em: string, hoje: string, comHora = false): string {
  const d = diaDe(em);
  if (d === hoje) return comHora ? `hoje, às ${horaDe(em)}` : "hoje";
  return `em ${diaCurto(d)}`;
}

function Leg({ c, n, t }: { c: string; n: number; t: string }) {
  return <li><span className={`fb-m ${c}`} aria-hidden="true" /><b className="num">{n}</b><span>{t}</span></li>;
}

const pessoas = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// ------------------------------------------------------------------------- três números e uma barra

export function FunilBarra({ d }: { d: Funil }) {
  const contrato = d.contratos;
  const andamento = d.depoisProposta.andamento;
  const recusaram = Math.max(0, d.comProposta - contrato - andamento);
  const { naoPegou: pegou, naoVoltou: voltou, emAtendimento: atend } = d.semProposta;
  const sem = pegou + voltou + atend;
  const total = d.primeiros;
  const motivos = d.depoisProposta.recusadas.filter((r) => r.n);
  const segs: [string, number][] = [["fb-c", contrato], ["fb-a", andamento], ["fb-o", recusaram], ["fb-np", pegou], ["fb-nv", voltou], ["fb-at", atend]];
  const desc = `Dos ${total}: ${pessoas(contrato, "virou contrato", "viraram contrato")}, ${andamento} com proposta em andamento, `
    + `${pessoas(recusaram, "recusou a proposta", "recusaram a proposta")}`
    + (sem ? `, o escritório não pegou ${pegou}, ${pessoas(voltou, "não voltou", "não voltaram")} e ${atend} ainda em atendimento.` : ". Ninguém saiu sem proposta.");
  const per = textoPeriodo(d.de, d.ate);
  return (
    <div className="cm-funil fb">
      <ol className="fb-nums" aria-label={`Funil de ${per}`}>
        <li className="fb-et"><b className="num">{total}</b><span>{total === 1 ? "primeiro contato" : "primeiros contatos"}</span></li>
        <li className="fb-seta"><span className="fb-p num">{taxa(d.comProposta, total)}</span><span className="fb-linha" aria-hidden="true" /><span className="fb-sr">receberam proposta</span></li>
        <li className="fb-et"><b className="num">{d.comProposta}</b><span>{d.comProposta === 1 ? "recebeu proposta" : "receberam proposta"}</span></li>
        <li className="fb-seta"><span className="fb-p num">{taxa(contrato, d.comProposta)}</span><span className="fb-linha" aria-hidden="true" /><span className="fb-sr">fecharam</span></li>
        <li className="fb-et"><b className="num">{contrato}</b><span>{contrato === 1 ? "virou contrato" : "viraram contrato"}</span></li>
      </ol>
      <div className="fb-onde">
        <h3 className="fb-tit">Onde os {total} pararam</h3>
        <div className="fb-barra" role="img" aria-label={desc}>
          {segs.filter(([, n]) => n).map(([c, n]) => <span key={c} className={c} style={{ flex: n }} />)}
        </div>
        <div className="fb-grupos" aria-hidden="true">
          {d.comProposta ? <span style={{ flex: d.comProposta }}>receberam proposta · {d.comProposta}</span> : null}
          {sem ? <span style={{ flex: sem }}>sem proposta · {sem}</span> : null}
        </div>
        <div className="fb-legs">
          <div>
            <p className="fb-g">Receberam proposta</p>
            <ul>
              <Leg c="fb-c" n={contrato} t={contrato === 1 ? "virou contrato" : "viraram contrato"} />
              <Leg c="fb-a" n={andamento} t="proposta em andamento (abaixo)" />
              {motivos.length
                ? motivos.map((r) => <Leg key={r.motivo ?? "x"} c="fb-o" n={r.n} t={r.motivo ? MOTIVOS_RECUSA[r.motivo].toLowerCase() : "recusaram"} />)
                : <Leg c="fb-o" n={0} t="recusaram" />}
            </ul>
          </div>
          <div>
            <p className="fb-g">Saíram sem proposta</p>
            {sem ? (
              <>
                <ul>
                  <Leg c="fb-np" n={pegou} t="o escritório não pegou o caso" />
                  <Leg c="fb-nv" n={voltou} t="o cliente não voltou" />
                  <Leg c="fb-at" n={atend} t="ainda em atendimento, sem motivo" />
                </ul>
                {atend ? <p className="fb-marcar"><a className="fu-link" href="#t-ag">marcar o motivo</a></p> : null}
              </>
            ) : <p className="fb-nada">Ninguém no período. Todo primeiro contato recebeu proposta.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------- janelas

export interface AlvoFunil { id: string; nome: string; detalhe?: string }

export function JanelaEncerrarFunil({ alvo, aoFechar, aoFeito }: { alvo: AlvoFunil | null; aoFechar: () => void; aoFeito: (s: SaidaFunil, alvo: AlvoFunil) => void }) {
  const [motivo, setMotivo] = useState<MotivoForaFunil | null>(null);
  const [nota, setNota] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const primeiro = alvo ? alvo.nome.split(" ")[0] : "";

  async function enviar() {
    if (!alvo || enviando) return;
    setFalha(null);
    const e = [...(!motivo ? ["motivo"] : []), ...(nota.trim().length > 300 ? ["nota"] : [])];
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<SaidaFunil>(`/v1/escritorio/clientes/${alvo.id}/funil`, { metodo: "PUT", corpo: { motivo, nota: nota.trim() || null } });
    setEnviando(false);
    if (r.ok) {
      setErros([]);
      return aoFeito(r.dados, alvo);
    }
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(`${textoDoErro(r.erro)} Nada foi salvo: ${primeiro} continua em “Primeiro contato”. O que você escolheu continua aqui; tente de novo.`);
  }

  const tem = (c: string) => erros.includes(c);
  const efeito = motivo === "NAO_PEGOU" ? "“o escritório não pegou”" : "“não voltaram”";
  return (
    <Janela id="j-funil" aberta={!!alvo} aoFechar={aoFechar} sobretitulo="Comercial · funil" titulo="Encerrar sem proposta" descricao="j-funil-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Tirar do funil
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-funil-d">Diga por que este primeiro contato não recebeu proposta.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>{primeiro} ainda está no funil.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo={`Não deu para tirar ${primeiro} do funil.`}>{falha}</Aviso> : null}
        {alvo ? (
          <div className="fu-alvo">
            <Icone nome="pessoa-menos" className="ico" />
            <div><strong>{alvo.nome}</strong>{alvo.detalhe ? <small>{alvo.detalhe}</small> : null}</div>
          </div>
        ) : null}
        <fieldset className="fi-grupo-op" aria-describedby={tem("motivo") ? "fu-mot-er" : undefined}>
          <legend>Por que não recebeu proposta</legend>
          {(Object.keys(MOTIVOS_SAIDA_FUNIL) as MotivoForaFunil[]).map((m, i) => (
            <label className="opcao" key={m}>
              <input className="marcar" type="radio" name="fu-m" value={m} checked={motivo === m}
                data-foco={(motivo ? motivo === m : i === 0) ? "" : undefined}
                onChange={() => { setMotivo(m); setErros((x) => x.filter((c) => c !== "motivo")); }} />
              <span>{MOTIVOS_SAIDA_FUNIL[m].titulo}<small>{MOTIVOS_SAIDA_FUNIL[m].ajuda}</small></span>
            </label>
          ))}
          {tem("motivo") ? <ErroCampo id="fu-mot-er">Escolha um dos dois motivos. É ele que o Funil conta.</ErroCampo> : null}
        </fieldset>
        <div className="campo">
          <label htmlFor="fu-nota">Anotação<span className="opcional"> (opcional)</span></label>
          <textarea className="entrada" id="fu-nota" rows={3} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)}
            aria-invalid={tem("nota") || undefined} aria-describedby={descritoPor("fu-nota-aj", tem("nota") && "fu-nota-er")} />
          <p className="ajuda" id="fu-nota-aj">Fica no histórico do cliente. Só quem tem a área Comercial vê. Até 300 caracteres.</p>
          {tem("nota") ? <ErroCampo id="fu-nota-er">A anotação vai até 300 caracteres.</ErroCampo> : null}
        </div>
        <p className="fi-ref">
          <Icone nome="check" className="ico" />
          <span>
            {primeiro} sai de “Primeiro contato” e de “Sem próximo contato”{motivo ? <>, e passa a contar em <b>{efeito}</b></> : null}. A ficha continua ativa, com tudo o que foi registrado.
            Se {primeiro} voltar e receber proposta, passa a contar como proposta.
          </span>
        </p>
      </div>
    </Janela>
  );
}

export interface AlvoVoltar { id: string; nome: string; saida: SaidaFunil }

export function JanelaVoltarFunil({ alvo, hoje, aoFechar, aoFeito }: { alvo: AlvoVoltar | null; hoje: string; aoFechar: () => void; aoFeito: (alvo: AlvoVoltar) => void }) {
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primeiro = alvo ? alvo.nome.split(" ")[0] : "";

  async function enviar() {
    if (!alvo || enviando) return;
    setFalha(null);
    setEnviando(true);
    const r = await chamarPortal<SaidaFunil>(`/v1/escritorio/clientes/${alvo.id}/funil/voltar`, { metodo: "POST" });
    setEnviando(false);
    if (r.ok) return aoFeito(alvo);
    setFalha(`${textoDoErro(r.erro)} Nada foi salvo; tente de novo.`);
  }

  return (
    <Janela id="j-voltar" aberta={!!alvo} aoFechar={aoFechar} sobretitulo="Comercial · funil" titulo={`Voltar ${primeiro} ao funil?`} descricao="j-voltar-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar} data-foco="">Cancelar</button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="trocar" className="ico" />
            Voltar ao funil
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>
        <p id="j-voltar-d">Use quando o motivo foi marcado por engano ou quando {primeiro} voltou a falar com o escritório.</p>
        {falha ? <Aviso tom="urgencia" titulo={`Não deu para voltar ${primeiro} ao funil.`}>{falha}</Aviso> : null}
        {alvo ? (
          <div className="fu-alvo">
            <Icone nome="pessoa-mais" className="ico" />
            <div>
              <strong>{alvo.nome}</strong>
              <small>Fora do funil desde {quandoMarcou(alvo.saida.marcadoEm, hoje).replace(/^em /, "")}: {alvo.saida.motivo === "NAO_PEGOU" ? "o escritório não pegou o caso" : "o cliente não voltou"} · marcado por {alvo.saida.marcadoPor.nome}</small>
            </div>
          </div>
        ) : null}
        <p className="fi-ref">
          <Icone nome="historico" className="ico" />
          <span>{primeiro} volta para “Primeiro contato”, como ainda em atendimento, e deixa de contar no motivo. O motivo marcado fica no histórico.</span>
        </p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Saíram sem proposta

export function FolhaSairam({ sairam, hoje, novo, aoVoltar }: {
  sairam: NonNullable<Funil["sairam"]>;
  hoje: string;
  novo: string | null;
  aoVoltar: (a: AlvoVoltar) => void;
}) {
  const [todos, setTodos] = useState(false);
  const itens = todos ? sairam.itens : sairam.itens.slice(0, 6);
  const titulo = <h2 id="t-sa">Saíram sem proposta</h2>;
  if (!sairam.total) {
    return (
      <section className="folha" aria-labelledby="t-sa">
        <div className="folha-cab"><div>{titulo}</div></div>
        <div className="estado sem-moldura">
          <span className="icone-estado"><Icone nome="funcoes" className="ico" /></span>
          <h3>Ninguém saiu do funil sem proposta</h3>
          <p>Quando um primeiro contato não for receber proposta, marque o motivo no cartão dele, acima, ou na ficha do cliente.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="folha" aria-labelledby="t-sa" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          {titulo}
          <p className="sub">Primeiros contatos do período que alguém tirou do funil, com o motivo. Nada é apagado: dá para voltar.</p>
        </div>
      </div>
      <ul className="fu-sairam">
        {itens.map((x) => (
          <li key={x.id}>
            <div className="fu-s-quem">
              <a href={`/clientes/${x.clienteId}?aba=atendimentos`}>{x.nome}</a>
              <small>Marcado por {x.marcadoPor.nome} {quandoMarcou(x.marcadoEm, hoje)}</small>
              {x.nota ? <small className="fu-nota">“{x.nota}”</small> : null}
            </div>
            <div className="pd-selo-linha">
              <Selo tom="neutro">{MOTIVOS_SAIDA_FUNIL[x.motivo].selo}</Selo>
              {x.id === novo ? <Selo tom="ativo">Novo</Selo> : null}
            </div>
            <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoVoltar({ id: x.clienteId, nome: x.nome, saida: x })}>
              <Icone nome="trocar" className="ico" />
              Voltar ao funil<span className="sr">: {x.nome}</span>
            </button>
          </li>
        ))}
      </ul>
      {sairam.total > 6 ? (
        <p className="mais">
          <span>Mostrando {itens.length} de {sairam.total}</span>
          {!todos && sairam.itens.length > 6 ? (
            <button className="btn btn-sec" type="button" onClick={() => setTodos(true)}>Mostrar {sairam.itens.length - 6 === 1 ? "a outra" : `as outras ${sairam.itens.length - 6}`}</button>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------------- ficha do cliente

/** Folha "No funil do Comercial" da ficha (aba Atendimentos) e o que ela devolve ao histórico. */
export function FolhaFunilCliente({ dados, recarregar, id, nome, detalhe, hoje, podeEscrever, aoFeito }: {
  dados: ClienteFunil | null | "erro";
  recarregar: () => void;
  id: string;
  nome: string;
  detalhe?: string;
  hoje: string;
  podeEscrever: boolean;
  aoFeito: (titulo: string, texto: string) => void;
}) {
  const [janela, setJanela] = useState<"encerrar" | "voltar" | null>(null);
  const [vez, setVez] = useState(0);
  const cab = <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-fun" style={{ fontSize: 20 }}>No funil do Comercial</h2></div></div>;
  let corpo;
  if (dados === "erro") corpo = <ErroAoCarregar oque="o funil" aoTentar={recarregar} />;
  else if (!dados) corpo = <Carregando rotulo="Carregando o funil…" linhas={2} />;
  else if (dados.situacao === "FORA" && dados.saida) {
    const s = dados.saida;
    corpo = (
      <>
        <dl className="pd-ro">
          <div><dt>Situação</dt><dd>Saiu sem proposta<small>{MOTIVOS_SAIDA_FUNIL[s.motivo].titulo.toLowerCase()}</small></dd></div>
          <div><dt>Marcado por</dt><dd>{s.marcadoPor.nome}<small>{quandoMarcou(s.marcadoEm, hoje, true)}</small></dd></div>
          {s.nota ? <div><dt>Anotação</dt><dd className="fu-nota">“{s.nota}”</dd></div> : null}
        </dl>
        {podeEscrever ? (
          <div className="pd-corpo">
            <button className="btn btn-sec" type="button" onClick={() => { setVez((v) => v + 1); setJanela("voltar"); }}>
              <Icone nome="trocar" className="ico" />
              Voltar ao funil
            </button>
          </div>
        ) : null}
      </>
    );
  } else if (dados.situacao === "PRIMEIRO") {
    corpo = (
      <div className="pd-corpo">
        <p className="fu-est"><Selo tom="atencao" icone="relogio">Primeiro contato, sem proposta</Selo></p>
        <p>{dados.rascunho ? "Tem proposta em rascunho, nunca enviada." : "Ainda sem proposta enviada."} Se o escritório não vai fazer proposta, diga por quê: o Funil conta.</p>
        {podeEscrever && dados.podeEncerrar ? (
          <button className="btn btn-sec" type="button" onClick={() => { setVez((v) => v + 1); setJanela("encerrar"); }}>
            <Icone nome="pessoa-menos" className="ico" />
            Encerrar sem proposta
          </button>
        ) : null}
      </div>
    );
  } else {
    corpo = (
      <div className="pd-corpo">
        <p className="fu-est"><Selo tom="ativo" icone="check">{dados.situacao === "CONTRATO" ? "Virou contrato" : "Recebeu proposta"}</Selo></p>
        <p>{dados.situacao === "CONTRATO" ? "Conta como contrato no Funil." : "Conta como proposta no Funil. O que acontecer com ela fica na proposta."}</p>
      </div>
    );
  }
  return (
    <section className="folha" aria-labelledby="t-fun">
      {cab}
      {corpo}
      {dados && dados !== "erro" ? (
        <>
          <JanelaEncerrarFunil key={`e-${vez}`} alvo={janela === "encerrar" ? { id, nome, detalhe } : null} aoFechar={() => setJanela(null)}
            aoFeito={(s) => {
              setJanela(null);
              recarregar();
              aoFeito(`${nome} saiu do funil.`, `Motivo: ${MOTIVOS_SAIDA_FUNIL[s.motivo].titulo.toLowerCase()}. Para desfazer, use “Voltar ao funil”.`);
            }} />
          <JanelaVoltarFunil key={`v-${vez}`} alvo={janela === "voltar" && dados.saida ? { id, nome, saida: dados.saida } : null} hoje={hoje} aoFechar={() => setJanela(null)}
            aoFeito={() => {
              setJanela(null);
              recarregar();
              aoFeito(`${nome} voltou ao funil.`, "Está de novo em “Primeiro contato”. O motivo de antes ficou no histórico.");
            }} />
        </>
      ) : null}
    </section>
  );
}
