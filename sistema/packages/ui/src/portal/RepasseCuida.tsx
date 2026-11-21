"use client";
// Quem cuida do repasse (F3.71) e o atraso do repasse (F3.46), desenho aprovado em
// docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados rp-ficha, rp-trocar,
// rp-trocado, rp-trocar-erro, pz-repasses, pz-anotar, pz-anotado e pz-anotar-erros).
// - O repasse nasce com o responsável pelo contrato; trocar vale para o repasse inteiro e só
//   aparece quem tem a área Financeiro. O motivo é opcional e vai ao histórico e ao sino.
// - Atrasado é estado, não alarme: a parte fica "Atrasado · era 17/11" até ser feita. Anotar o
//   atraso guarda o motivo e a próxima ação; o prazo não muda e o sino lembra no dia.

import { useRef, useState } from "react";
import {
  dataBr, diasUteisEntre, MOTIVOS_ATRASO_REPASSE, PARA_DESTINACAO, reais, TIPOS_LEVANTAMENTO,
  type Destinacao, type FichaRepasse, type Levantamento, type MotivoAtrasoRepasse, type PodeCuidarRepasse,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaBr, diaCurto, lerDia } from "./agenda.ts";
import { Selo } from "./Comercial.tsx";
import { primeiroNome } from "./equipe.ts";
import { chamarPortal } from "./Moldura.tsx";

type Feito = { titulo: string; texto: string };
type Pessoa = { id: string; nome: string };
const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
const AREAS: Record<string, string> = { COMERCIAL: "Comercial", CONTRATOS: "Contratos", FINANCEIRO: "Financeiro", JURIDICO: "Jurídico" };

/** "Contratos e Financeiro", "Sócia dona". */
export function papelDe(p: PodeCuidarRepasse): string {
  if (p.dono) return "Sócia dona";
  const a = p.areas.map((x) => AREAS[x] ?? x);
  return a.length > 1 ? `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}` : (a[0] ?? "");
}

export const atrasada = (d: Destinacao, hoje: string) => d.situacao === "PENDENTE" && d.prazo < hoje;

/** O selo da parte atrasada: "Atrasado · era 17/11". */
export function SeloAtraso({ d }: { d: Destinacao }) {
  return <Selo tom="urgente" icone="alerta">Atrasado · era {diaCurto(d.prazo)}</Selo>;
}

/** O que a linha atrasada diz embaixo do nome: o motivo e a próxima ação, ou "Sem motivo anotado". */
export function NotaAtraso({ d, hoje, prazoDias, aoAnotar }: { d: Destinacao; hoje: string; prazoDias: number; aoAnotar?: (d: Destinacao) => void }) {
  if (!atrasada(d, hoje)) return null;
  const a = d.atraso;
  const ontem = diasUteisEntre(d.prazo, hoje) <= 1;
  return (
    <>
      {a ? (
        <>
          <p className="fi-prox pz-mot">
            <Icone nome="alerta" className="ico" />
            <span><b>Motivo do atraso:</b> {a.texto ?? MOTIVOS_ATRASO_REPASSE[a.motivo].curto}</span>
          </p>
          <p className="fi-prox">
            <Icone nome="relogio" className="ico" />
            <span>Próxima ação: <b>{diaCurto(a.proximaEm)}, {a.oQue.replace(/^./, (c) => c.toLowerCase())}</b> · {primeiroNome(a.proximaCom.nome)}</span>
          </p>
        </>
      ) : (
        <p className="fi-prox pz-sem">
          <Icone nome="alerta" className="ico" />
          <span><b>Sem motivo anotado.</b> {ontem ? "Passou do prazo ontem." : `O prazo foi de ${prazoDias} dias úteis e venceu em ${diaCurto(d.prazo)}.`}</span>
        </p>
      )}
      {aoAnotar ? (
        <button className="btn btn-sec btn-compacto pz-bot" type="button" onClick={() => aoAnotar(d)}>
          <Icone nome="lapis" className="ico" />{a ? "Mudar a anotação" : "Anotar o atraso"}<span className="sr"> de {d.nome}</span>
        </button>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------------- Quem cuida

/** De onde veio quem cuida: a troca mais nova do histórico ou o responsável pelo contrato. */
function origemDeQuemCuida(f: FichaRepasse): string {
  const t = f.historico.find((h) => h.acao === "financeiro.repasse_responsavel");
  const nomeDe = (id: unknown) => f.podemCuidar.find((p) => p.id === id)?.nome ?? (f.doContrato && f.doContrato.id === id ? f.doContrato.nome : null);
  if (!t) {
    return f.doContrato && f.doContrato.id === f.responsavel.id
      ? `É a responsável pelo contrato de ${primeiroNome(f.cliente.nome)}.`
      : `Começou com quem registrou: ${f.autor.nome}.`;
  }
  const de = nomeDe(t.dados.de);
  const quando = diaDoInstante(t.em) === f.hoje ? `hoje, às ${horaDoInstante(t.em)}` : `em ${diaCurto(diaDoInstante(t.em))}`;
  return `Passou ${de ? `de ${de} ` : ""}para ${primeiroNome(f.responsavel.nome)} ${quando}${t.por ? `, por ${t.por.nome}` : ""}.`;
}

export function FolhaQuemCuida({ f, aoTrocar }: { f: FichaRepasse; aoTrocar: () => void }) {
  const r = f.responsavel;
  const pessoa = f.podemCuidar.find((p) => p.id === r.id);
  const doContrato = f.doContrato && f.doContrato.id !== r.id ? f.doContrato : null;
  return (
    <section className="folha" aria-labelledby="t-rp-quem" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div><h2 id="t-rp-quem"><Icone nome="pessoas" className="ico" />Quem cuida deste repasse</h2></div>
      </div>
      <div className="pd-corpo">
        <div className="pd-pessoa">
          <span className="av-p forte" aria-hidden="true">{iniciais(r.nome)}</span>
          <div>
            <strong>{r.nome}{r.id === f.eu ? " (você)" : ""}</strong>
            <small>{pessoa ? `${papelDe(pessoa)} · ` : ""}Recebe no sino os prazos e os atrasos das partes que faltam.</small>
          </div>
        </div>
        <p>{doContrato ? `Era de ${doContrato.nome}, a responsável pelo contrato. ` : ""}{origemDeQuemCuida(f)}</p>
        {f.podeEditar ? (
          <button className="btn btn-sec" type="button" onClick={aoTrocar}>
            <Icone nome="trocar" className="ico" />Trocar o responsável
          </button>
        ) : (
          <p className="pd-nota"><Icone nome="cadeado" className="ico" /><span>Quem troca é quem pode mexer no Financeiro.</span></p>
        )}
      </div>
    </section>
  );
}

export function JanelaTrocarResponsavel({ f, aoFechar, aoFeito }: { f: FichaRepasse; aoFechar: () => void; aoFeito: (x: Feito) => void }) {
  const outras = f.podemCuidar.filter((p) => p.id !== f.responsavel.id);
  const [quem, setQuem] = useState<string>(outras[0]?.id ?? "");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const abertas = f.destinacoes.filter((d) => d.situacao === "PENDENTE");
  const atrasadas = abertas.filter((d) => atrasada(d, f.hoje));
  const escolhido = f.podemCuidar.find((p) => p.id === quem);

  async function enviar() {
    if (enviando) return;
    setFalha(null);
    if (!quem || quem === f.responsavel.id) {
      setErro(`Escolha quem passa a cuidar. ${primeiroNome(f.responsavel.nome)} já cuida deste repasse.`);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ responsavel: Pessoa }>(`/v1/escritorio/financeiro/repasses/${f.id}/responsavel`, {
      metodo: "PUT", corpo: { responsavelId: quem, motivo: motivo.trim() || null },
    });
    setEnviando(false);
    if (r.ok) {
      setErro(null);
      return aoFeito({
        titulo: `${r.dados.responsavel.nome} passou a cuidar do repasse.`,
        texto: `Vale para ${contar(abertas.length, "parte que falta", "partes que faltam")}. A troca ficou no histórico e ${primeiroNome(r.dados.responsavel.nome)} recebeu o aviso no sino.`,
      });
    }
    if (r.erro.detalhes?.motivo === "SEM_AREA_FINANCEIRO" || r.erro.codigo === "VALIDATION_ERROR") {
      setErro(`${escolhido?.nome ?? "Esta pessoa"} não tem mais a área Financeiro ou saiu da equipe. Escolha outra pessoa.`);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(`${textoDoErro(r.erro)} Nada foi salvo: ${f.responsavel.nome} continua responsável. O que você escolheu continua aqui; tente de novo.`);
  }

  return (
    <Janela id="j-resp" aberta aoFechar={aoFechar} sobretitulo="Repasses" titulo="Trocar o responsável" descricao="j-resp-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="trocar" className="ico" />Trocar o responsável
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-resp-d">Quem cuida do repasse recebe os avisos de prazo e de atraso.</p>
        {erro ? <Aviso tom="urgencia" titulo={faltaAcertar(1)}>O responsável ainda não foi trocado.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Não deu para trocar o responsável.">{falha}</Aviso> : null}
        <div className="fi-alvo">
          <Icone nome="escudo" className="ico" />
          <div>
            <strong>{f.cliente.nome} · {TIPOS_LEVANTAMENTO[f.tipo]} de {diaCurto(f.entrouEm)}</strong>
            <small>
              {abertas.length
                ? `${contar(abertas.length, "parte ainda a fazer", "partes ainda a fazer")}: ${abertas.map((d) => `${PARA_DESTINACAO[d.para].toLowerCase()}${atrasada(d, f.hoje) ? " (atrasado)" : ""}`).join(", ")}`
                : "Todas as partes já foram feitas"}
            </small>
          </div>
          <span className="fi-v num">{reais(abertas.reduce((s, d) => s + d.valor, 0))}</span>
        </div>
        <fieldset className={erro ? "fi-grupo-op pd-fs-erro" : "fi-grupo-op"} aria-describedby={descritoPor("rp-quem-aj", !!erro && "rp-quem-er")}>
          <legend>Quem passa a cuidar</legend>
          {erro ? <ErroCampo id="rp-quem-er">{erro}</ErroCampo> : null}
          {f.podemCuidar.map((p, i) => (
            <label className="opcao" key={p.id}>
              <input className="marcar" type="radio" name="rp-q" value={p.id} checked={quem === p.id}
                aria-invalid={erro && quem === p.id ? true : undefined}
                data-foco={(quem ? quem === p.id : i === 0) ? "" : undefined}
                onChange={() => { setQuem(p.id); setErro(null); }} />
              <span>
                {p.nome}{p.id === f.responsavel.id ? <span className="rp-agora">responsável agora</span> : null}
                <small>{papelDe(p)}{f.doContrato?.id === p.id ? ` · responsável pelo contrato de ${primeiroNome(f.cliente.nome)}` : ""}</small>
              </span>
            </label>
          ))}
          <p className="ajuda" id="rp-quem-aj">Só aparece quem tem a área Financeiro.</p>
        </fieldset>
        <div className="campo">
          <div className="pd-campo-linha">
            <label htmlFor="rp-mot">Por quê<span className="opcional"> (opcional)</span></label>
            <span className="contador" aria-hidden="true">{motivo.length} de 200</span>
          </div>
          <textarea className="entrada" id="rp-mot" rows={3} maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-describedby="rp-mot-aj" />
          <p className="ajuda" id="rp-mot-aj">Aparece no histórico do repasse e no aviso a quem passa a cuidar.</p>
        </div>
        <p className="fi-ref">
          <Icone nome="sino" className="ico" />
          <span>
            Vale para o repasse inteiro. <b>{escolhido ? primeiroNome(escolhido.nome) : "Quem entra"}</b> passa a receber no sino os prazos e atrasos
            {abertas.length ? ` ${abertas.length === 1 ? "da parte que falta" : `das ${abertas.length} partes que faltam`}` : ""}
            {atrasadas.length ? ` (${contar(atrasadas.length, "atrasada", "atrasadas")})` : ""}; {primeiroNome(f.responsavel.nome)} deixa de receber.
            A troca fica no histórico, com quem trocou e quando.
          </span>
        </p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Atraso

export function JanelaAnotarAtraso({ d, l, pessoas, responsavelId, hoje, aoFechar, aoFeito }: {
  d: Destinacao; l: Pick<Levantamento, "tipo" | "entrouEm" | "cliente">; pessoas: PodeCuidarRepasse[]; responsavelId: string; hoje: string;
  aoFechar: () => void; aoFeito: (x: Feito) => void;
}) {
  const a = d.atraso;
  const [motivo, setMotivo] = useState<MotivoAtrasoRepasse>(a?.motivo ?? "DOCUMENTO");
  const [texto, setTexto] = useState(a?.texto ?? "");
  const [dia, setDia] = useState(a && a.proximaEm >= hoje ? diaBr(a.proximaEm) : "");
  const [com, setCom] = useState(a?.proximaCom.id ?? responsavelId);
  const [oQue, setOQue] = useState(a?.oQue ?? "");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const atraso = diasUteisEntre(d.prazo, hoje);
  const tem = (c: string) => erros.includes(c);

  async function enviar() {
    if (enviando) return;
    setFalha(null);
    const x = lerDia(dia);
    const e = [
      ...(motivo === "OUTRO" && !texto.trim() ? ["texto"] : []),
      ...(!x || x < hoje ? ["proximaEm"] : []),
      ...(!com ? ["proximaComId"] : []),
      ...(oQue.trim().length < 3 ? ["oQue"] : []),
    ];
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<Destinacao>(`/v1/escritorio/financeiro/destinacoes/${d.id}/atraso`, {
      metodo: "POST", corpo: { motivo, texto: texto.trim() || null, proximaEm: x, proximaComId: com, oQue: oQue.trim() },
    });
    setEnviando(false);
    if (r.ok) {
      setErros([]);
      const p = pessoas.find((y) => y.id === com);
      return aoFeito({
        titulo: "Anotação do atraso salva.",
        texto: `${d.nome}: próxima ação em ${dataBr(x!)}${p ? `, com ${primeiroNome(p.nome)}` : ""}. O sino lembra no dia, e a anotação ficou no histórico.`,
      });
    }
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(`${textoDoErro(r.erro)} Nada foi salvo. O que você escreveu continua aqui; tente de novo.`);
  }

  return (
    <Janela id="j-atraso" classe="fi-larga" aberta aoFechar={aoFechar} sobretitulo="Repasses · atraso" titulo={a ? "Mudar a anotação do atraso" : "Anotar o atraso"} descricao="j-atraso-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />Salvar a anotação
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-atraso-d">Por que o repasse passou do prazo e o que vai ser feito.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A anotação ainda não foi salva.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Não deu para salvar a anotação.">{falha}</Aviso> : null}
        <div className="fi-alvo">
          <Icone nome="alerta" className="ico" />
          <div>
            <strong>{d.nome} · {PARA_DESTINACAO[d.para].toLowerCase()}</strong>
            <small>{l.cliente.nome} · {TIPOS_LEVANTAMENTO[l.tipo]} de {diaCurto(l.entrouEm)} · prazo era {diaCurto(d.prazo)}{atraso ? `, ${contar(atraso, "dia útil", "dias úteis")} de atraso` : ""}</small>
          </div>
          <span className="fi-v num">{reais(d.valor)}</span>
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Por que atrasou</legend>
          {(Object.keys(MOTIVOS_ATRASO_REPASSE) as MotivoAtrasoRepasse[]).map((m) => (
            <label className="opcao" key={m}>
              <input className="marcar" type="radio" name="pz-m" value={m} checked={motivo === m} data-foco={motivo === m ? "" : undefined}
                onChange={() => { setMotivo(m); setErros((x) => x.filter((c) => c !== "texto")); }} />
              <span>{MOTIVOS_ATRASO_REPASSE[m].titulo}<small>{MOTIVOS_ATRASO_REPASSE[m].ajuda}</small></span>
            </label>
          ))}
        </fieldset>
        <div className="campo">
          <div className="pd-campo-linha">
            <label htmlFor="pz-txt">Em poucas palavras{motivo === "OUTRO" ? null : <span className="opcional"> (opcional)</span>}</label>
            <span className="contador" aria-hidden="true">{texto.length} de 300</span>
          </div>
          <textarea className="entrada" id="pz-txt" rows={3} maxLength={300} value={texto} onChange={(e) => setTexto(e.target.value)}
            aria-invalid={tem("texto") || undefined} aria-describedby={tem("texto") ? "pz-txt-er" : undefined} />
          {tem("texto") ? <ErroCampo id="pz-txt-er">Com “Outro motivo”, escreva o porquê em poucas palavras.</ErroCampo> : null}
        </div>
        <fieldset className="fi-grupo-op">
          <legend>Próxima ação</legend>
          <div className="fi-dois">
            <div className="campo">
              <label htmlFor="pz-data">Quando</label>
              <input className="entrada" id="pz-data" type="text" inputMode="numeric" autoComplete="off" value={dia} onChange={(e) => setDia(e.target.value)}
                aria-invalid={tem("proximaEm") || undefined} aria-describedby={descritoPor(!tem("proximaEm") && "pz-data-aj", tem("proximaEm") && "pz-data-er")} />
              {tem("proximaEm")
                ? <ErroCampo id="pz-data-er">A próxima ação é hoje ou depois. Hoje é {dataBr(hoje)}.</ErroCampo>
                : <p className="ajuda" id="pz-data-aj">dd/mm/aaaa</p>}
            </div>
            <div className="campo">
              <label htmlFor="pz-resp">Com quem</label>
              <select className="entrada" id="pz-resp" value={com} onChange={(e) => setCom(e.target.value)}
                aria-invalid={tem("proximaComId") || undefined} aria-describedby={tem("proximaComId") ? "pz-resp-er" : undefined}>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.id === responsavelId ? " (responsável)" : ""}</option>)}
              </select>
              {tem("proximaComId") ? <ErroCampo id="pz-resp-er">Escolha alguém com a área Financeiro.</ErroCampo> : null}
            </div>
          </div>
          <div className="campo">
            <label htmlFor="pz-oque">O que fazer</label>
            <input className="entrada" id="pz-oque" type="text" autoComplete="off" maxLength={160} value={oQue} onChange={(e) => setOQue(e.target.value)}
              aria-invalid={tem("oQue") || undefined} aria-describedby={descritoPor(!tem("oQue") && "pz-oque-aj", tem("oQue") && "pz-oque-er")} />
            {tem("oQue")
              ? <ErroCampo id="pz-oque-er">Diga o que vai ser feito, por exemplo: cobrar a nota por e-mail.</ErroCampo>
              : <p className="ajuda" id="pz-oque-aj">Uma frase, como na cobrança das parcelas.</p>}
          </div>
        </fieldset>
        <p className="fi-ref">
          <Icone nome="relogio" className="ico" />
          <span>O repasse continua atrasado até ser feito, e o prazo não muda. A anotação aparece aqui e em Repasses, e o sino lembra no dia. Fica no histórico.</span>
        </p>
      </div>
    </Janela>
  );
}
