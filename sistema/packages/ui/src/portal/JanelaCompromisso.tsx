"use client";
// Janela "Novo compromisso" e "Editar ou remarcar" da Agenda (EX-06, EX-11), desenho aprovado em
// docs/design/aprovadas/portal-agenda-conversas (estados novo, novo-erros, novo-outro e
// novo-outro-erro). Erros no padrão aprovado: resumo no topo e erro preso ao campo. O servidor
// confere tudo de novo e devolve os campos errados. Remarcar (mudar dia ou hora) pede motivo.

import { useEffect, useId, useRef, useState } from "react";
import { formatarCnj, TIPOS_COMPROMISSO, type CasoDoCompromisso, type ClienteLinha, type FichaCompromisso, type TipoCompromisso } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { DIAS_SEMANA, diaBr, diaCurto, diaDaSemana, diaDe, diaLongo, horaDe, horariosDoLembrete, instante, lerDia, lerHorario, quandoCurto } from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { chamarPortal } from "./Moldura.tsx";

export interface Pessoa {
  id: string;
  nome: string;
}

export interface Rascunho {
  tipo: TipoCompromisso;
  tipoEscrito: string;
  titulo: string;
  dia: string;
  ini: string;
  fim: string;
  modalidade: "PRESENCIAL" | "VIRTUAL";
  local: string;
  linkSala: string;
  clienteId: string;
  /** O processo (F3.4), só para quem tem o Jurídico. */
  casoId: string;
  responsavelId: string;
  tambemVai: string;
  lembrete: boolean;
  observacoes: string;
  motivo: string;
}

export function rascunhoNovo(dia: string, ini: string, responsavelId: string): Rascunho {
  const [h, m] = ini.split(":").map(Number);
  const fim = `${String(Math.min(23, h! + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return {
    tipo: "AUDIENCIA", tipoEscrito: "", titulo: "", dia: diaBr(dia), ini, fim, modalidade: "PRESENCIAL", local: "", linkSala: "",
    clienteId: "", casoId: "", responsavelId, tambemVai: "", lembrete: true, observacoes: "", motivo: "",
  };
}

export function rascunhoDe(f: FichaCompromisso): Rascunho {
  return {
    tipo: f.tipo, tipoEscrito: f.tipoEscrito ?? "", titulo: f.titulo, dia: diaBr(diaDe(f.inicio)), ini: horaDe(f.inicio), fim: horaDe(f.fim),
    modalidade: f.modalidade, local: f.local ?? "", linkSala: f.linkSala ?? "", clienteId: f.cliente?.id ?? "", casoId: f.caso?.id ?? "", responsavelId: f.responsavel.id,
    tambemVai: f.tambemVai[0]?.id ?? "", lembrete: f.lembrete, observacoes: f.observacoes ?? "", motivo: "",
  };
}

type Erros = Partial<Record<keyof Rascunho, string>>;

const TEXTO_ERRO: Erros = {
  tipo: "Escolha o tipo.",
  tipoEscrito: "Escreva qual é o tipo, por exemplo Perícia ou Diligência.",
  titulo: "Escreva o que é o compromisso, mesmo que curto.",
  dia: "Escreva o dia como dd/mm/aaaa.",
  ini: "Escreva a hora como hh:mm.",
  fim: "Termina antes de começar. Confira as horas.",
  modalidade: "Escolha presencial ou virtual.",
  linkSala: "Cole o link da sala virtual, ou marque Presencial.",
  local: "Confira o endereço.",
  clienteId: "Escolha um cliente da lista.",
  casoId: "Escolha um caso da lista, ou deixe sem processo.",
  responsavelId: "Escolha quem responde pelo compromisso.",
  tambemVai: "Escolha alguém da equipe.",
  observacoes: "As observações passam de 1.000 caracteres.",
  motivo: "Escreva por que mudou o dia ou a hora.",
};

/** Confere o rascunho como o servidor confere. */
export function conferirRascunho(r: Rascunho, original?: { dia: string; ini: string; fim: string }): Erros {
  const e: Erros = {};
  if (r.tipo === "OUTRO" && r.tipoEscrito.trim().length < 2) e.tipoEscrito = TEXTO_ERRO.tipoEscrito;
  if (!r.titulo.trim()) e.titulo = TEXTO_ERRO.titulo;
  const dia = lerDia(r.dia);
  const ini = lerHorario(r.ini);
  const fim = lerHorario(r.fim);
  if (!dia) e.dia = TEXTO_ERRO.dia;
  if (!ini) e.ini = TEXTO_ERRO.ini;
  if (!fim) e.fim = "Escreva a hora como hh:mm.";
  else if (ini && fim <= ini) e.fim = TEXTO_ERRO.fim;
  if (r.modalidade === "VIRTUAL" && !/^https:\/\/\S{4,}$/.test(r.linkSala.trim())) e.linkSala = TEXTO_ERRO.linkSala;
  if (!r.responsavelId) e.responsavelId = TEXTO_ERRO.responsavelId;
  if (r.observacoes.length > 1000) e.observacoes = TEXTO_ERRO.observacoes;
  if (original && (r.dia !== original.dia || ini !== original.ini || fim !== original.fim) && !r.motivo.trim()) e.motivo = TEXTO_ERRO.motivo;
  return e;
}

/** O corpo do pedido. O caso só vai de quem tem o Jurídico (`comCaso`); sem o campo, o servidor mantém o que estava. */
export function corpoDoRascunho(r: Rascunho, comCaso = false) {
  const dia = lerDia(r.dia)!;
  return {
    ...(comCaso ? { casoId: r.casoId || null } : {}),
    tipo: r.tipo, tipoEscrito: r.tipo === "OUTRO" ? r.tipoEscrito.trim() : null, titulo: r.titulo.trim(),
    inicio: instante(dia, lerHorario(r.ini)!), fim: instante(dia, lerHorario(r.fim)!), modalidade: r.modalidade,
    local: r.local.trim() || null, linkSala: r.modalidade === "VIRTUAL" ? r.linkSala.trim() : null, clienteId: r.clienteId || null,
    responsavelId: r.responsavelId, tambemVai: r.tambemVai && r.tambemVai !== r.responsavelId ? [r.tambemVai] : [],
    lembrete: !!r.clienteId && r.lembrete, observacoes: r.observacoes.trim() || null,
  };
}

/** O campo que o servidor devolveu, com o nome do rascunho. */
function campoDoServidor(c: string): keyof Rascunho {
  if (c === "inicio") return "ini";
  return (c in TEXTO_ERRO ? c : "titulo") as keyof Rascunho;
}

/** "quinta-feira", "sábado". */
function nomeDoDiaInteiro(d: string): string {
  const n = DIAS_SEMANA[diaDaSemana(d)]!;
  return diaDaSemana(d) >= 5 ? n : `${n}-feira`;
}

export type Marcado = { id: string; titulo: string; texto: string; dia: string };

const TITULO_FEITO: Record<TipoCompromisso, string> = {
  AUDIENCIA: "Audiência marcada", CLIENTE: "Reunião marcada", ASSINATURA: "Assinatura marcada", INTERNO: "Compromisso marcado", OUTRO: "Compromisso marcado",
};

/** Os casos para o campo Processo: só para quem tem o Jurídico (sem a área, `undefined`, e o campo some). */
export function useCasosDoCompromisso(areas: readonly string[] | undefined): CasoDoCompromisso[] | null | undefined {
  const juridico = Boolean(areas?.includes("JURIDICO"));
  const [casos, setCasos] = useState<CasoDoCompromisso[] | null>(null);
  useEffect(() => {
    if (!juridico) return;
    void chamarPortal<CasoDoCompromisso[]>("/v1/escritorio/agenda/casos").then((r) => setCasos(r.ok ? r.dados : []));
  }, [juridico]);
  return juridico ? casos : undefined;
}

/** Nome do caso com o número do processo, para a lista e a ficha. */
export function nomeDoCaso(c: CasoDoCompromisso): string {
  return c.numero ? `${c.nome} · ${formatarCnj(c.numero)}` : c.nome;
}

export function JanelaCompromisso({ aberta, inicial, editar, pessoas, clientes, casos, tiposEscritos, eu, aoFechar, aoFeito, aoMudar }: {
  aberta: boolean;
  inicial: Rascunho;
  /** Editar ou remarcar: o compromisso lido (versão e horário original). */
  editar?: FichaCompromisso;
  pessoas: Pessoa[];
  clientes: ClienteLinha[] | null;
  /** Os casos em andamento, só para quem tem o Jurídico (sem a área, não vem: a janela não mostra o campo). */
  casos?: CasoDoCompromisso[] | null;
  tiposEscritos: string[];
  eu: string | null;
  aoFechar: () => void;
  aoFeito: (m: Marcado) => void;
  /** O rascunho mudou (a agenda mostra o lugar tracejado). */
  aoMudar?: (r: Rascunho) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [r, setR] = useState(inicial);
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [lembreteTocado, setLembreteTocado] = useState(!!editar);
  useEffect(() => {
    if (aberta) {
      void Promise.resolve().then(() => {
        setR(inicial);
        setErros({});
        setErro(null);
        setLembreteTocado(!!editar);
      });
    }
  }, [aberta, inicial, editar]);
  useEffect(() => {
    if (aberta) aoMudar?.(r);
  }, [r, aberta, aoMudar]);

  const original = editar ? { dia: diaBr(diaDe(editar.inicio)), ini: horaDe(editar.inicio), fim: horaDe(editar.fim) } : undefined;
  const remarcando = !!original && (r.dia !== original.dia || lerHorario(r.ini) !== original.ini || lerHorario(r.fim) !== original.fim);
  const mudar = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setR((o) => ({ ...o, [k]: v }));
  function mudarTipo(t: TipoCompromisso) {
    // O lembrete vem marcado nas audiências e desmarcado nos outros tipos (pergunta 5), até a pessoa mexer.
    setR((o) => ({ ...o, tipo: t, lembrete: lembreteTocado ? o.lembrete : t === "AUDIENCIA" }));
  }
  const cliente = clientes?.find((c) => c.id === r.clienteId) ?? (editar?.cliente && editar.cliente.id === r.clienteId ? { ...editar.cliente, contatoPrincipal: editar.contatoCliente } : null);
  const contato = cliente?.contatoPrincipal ?? null;
  const diaLido = lerDia(r.dia);
  const nomeEu = (p: Pessoa) => (p.nome === eu ? `${p.nome} (você)` : p.nome);

  async function enviar() {
    setErro(null);
    const e = conferirRascunho(r, original);
    setErros(e);
    if (Object.keys(e).length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const dados = corpoDoRascunho(r, casos !== undefined);
    const res = editar
      ? await chamarPortal<{ id: string; versao: number }>(`/v1/escritorio/compromissos/${editar.id}`, {
          metodo: "PUT", corpo: { ...dados, versao: editar.versao, motivo: remarcando ? r.motivo.trim() : null },
        })
      : await chamarPortal<{ id: string; versao: number }>("/v1/escritorio/compromissos", { corpo: dados });
    setEnviando(false);
    if (!res.ok) {
      const campos = res.erro.detalhes?.campos;
      if (Array.isArray(campos) && campos.length) {
        const ee: Erros = {};
        for (const c of campos) {
          const k = campoDoServidor(String(c));
          ee[k] = TEXTO_ERRO[k] ?? "Confira este campo.";
        }
        setErros(ee);
        return focarPrimeiroErro(corpo.current);
      }
      return setErro(res.erro);
    }
    const resp = pessoas.find((p) => p.id === r.responsavelId)?.nome ?? "";
    const d = diaDe(dados.inicio);
    const quando = `${DIAS_SEMANA[diaDaSemana(d)]}, ${diaCurto(d)}, às ${horaDe(dados.inicio)}`;
    let texto = editar ? "" : `Está na agenda de ${resp}.`;
    if (dados.lembrete && contato) {
      const l = horariosDoLembrete(dados.inicio);
      texto += ` O lembrete a ${primeiroNome(contato.nome)} fica marcado para ${quandoCurto(l.umDia)}, e ${quandoCurto(l.duasHoras)}; sai quando o WhatsApp do escritório estiver ligado.`;
    }
    aoFeito({
      id: res.dados.id,
      titulo: editar ? (remarcando ? `Remarcado para ${quando}.` : "Compromisso salvo.") : `${TITULO_FEITO[r.tipo]} para ${quando}.`,
      texto: texto.trim() || "As mudanças ficam no histórico do compromisso.",
      dia: diaDe(dados.inicio),
    });
  }

  const n = Object.keys(erros).length;
  const campo = (k: keyof Rascunho, rotulo: string, o: { ajuda?: string; tipo?: string; numerico?: boolean; opcional?: boolean; foco?: boolean; cls?: string; lista?: string } = {}) => {
    const id = `${ids}-${k}`;
    const e = erros[k];
    return (
      <div className={`campo${o.cls ? ` ${o.cls}` : ""}`}>
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
        </label>
        <input className="entrada" id={id} type={o.tipo ?? "text"} autoComplete="off" value={String(r[k])} list={o.lista}
          inputMode={o.numerico ? "numeric" : undefined} data-foco={o.foco ? "" : undefined}
          onChange={(ev) => mudar(k, ev.target.value as never)} aria-invalid={e ? true : undefined}
          aria-describedby={descritoPor(o.ajuda && !e && `${id}-aj`, e && `${id}-er`)} />
        {o.ajuda && !e ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };
  const selecao = (k: keyof Rascunho, rotulo: string, ops: { v: string; t: string }[], o: { ajuda?: string; opcional?: boolean } = {}) => {
    const id = `${ids}-${k}`;
    const e = erros[k];
    return (
      <div className="campo">
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
        </label>
        <select className="entrada" id={id} value={String(r[k])} onChange={(ev) => mudar(k, ev.target.value as never)} aria-invalid={e ? true : undefined}
          aria-describedby={descritoPor(o.ajuda && !e && `${id}-aj`, e && `${id}-er`)}>
          {ops.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
        </select>
        {o.ajuda && !e ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };
  const radio = (nome: string, legenda: string, itens: { v: string; t: string }[], valor: string, aoEscolher: (v: string) => void, cls = "") => (
    <fieldset className={`x-ops ${cls}`}>
      <legend>{legenda}</legend>
      <div className="x-ops-l">
        {itens.map((i) => (
          <label key={i.v} className="opcao">
            <input className="marcar" type="radio" name={`${ids}-${nome}`} value={i.v} checked={valor === i.v} onChange={() => aoEscolher(i.v)} />
            <span>{i.t}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const pessoasOps = pessoas.map((p) => ({ v: p.id, t: nomeEu(p) }));
  const clientesOps = [{ v: "", t: "Sem cliente (compromisso interno)" },
    ...(cliente && !clientes?.some((c) => c.id === cliente.id) ? [{ v: cliente.id, t: cliente.nome }] : []),
    ...(clientes ?? []).map((c) => ({ v: c.id, t: c.nome }))];
  const comLink = r.modalidade === "VIRTUAL";
  const casoAtual = editar?.caso && !casos?.some((c) => c.id === editar.caso!.id) ? editar.caso : null;
  const casosOps = [{ v: "", t: "Sem processo" },
    ...(casoAtual ? [{ v: casoAtual.id, t: nomeDoCaso(casoAtual) }] : []),
    ...(casos ?? []).map((c) => ({ v: c.id, t: nomeDoCaso(c) }))];

  return (
    <Janela id={`${ids}-jan`} classe="x-larga" aberta={aberta} aoFechar={aoFechar} aoEnviar={() => void enviar()}
      sobretitulo={diaLido ? diaLongo(diaLido).replace(/^./, (x) => x.toUpperCase()) : "Agenda"} titulo={editar ? "Editar ou remarcar" : "Novo compromisso"}
      descricao={`${ids}-desc`}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="check" className="ico" />
            {enviando ? "Salvando…" : editar ? "Salvar" : "Marcar compromisso"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-desc`}>{editar ? "Mudar o dia ou a hora pede o motivo, que fica no histórico." : "Fica na agenda de quem vai, com seu nome e a hora, no histórico."}</p>
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>{editar ? "Nada foi salvo ainda." : "O compromisso ainda não foi marcado."}</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo="Não deu para salvar.">{textoDoErro(erro)}</Aviso> : null}
        {radio("tipo", "Tipo", (Object.keys(TIPOS_COMPROMISSO) as TipoCompromisso[]).map((t) => ({ v: t, t: TIPOS_COMPROMISSO[t] })), r.tipo,
          (v) => mudarTipo(v as TipoCompromisso), "ag-tipos")}
        {r.tipo === "OUTRO"
          ? campo("tipoEscrito", "Qual tipo", { cls: "ag-outro", lista: `${ids}-tipos`, foco: true,
              ajuda: "Escreva com poucas palavras. Ex.: Perícia, Diligência. Aparece com esse nome na agenda e na legenda." })
          : null}
        <datalist id={`${ids}-tipos`}>
          {tiposEscritos.map((t) => <option key={t} value={t} />)}
        </datalist>
        {campo("titulo", "O que é", { foco: r.tipo !== "OUTRO", ajuda: "Aparece assim na agenda. Ex.: Conciliação · Mendes x Loja Bela Casa" })}
        <div className="x-tres">
          {campo("dia", "Dia", { numerico: true, ajuda: diaLido ? nomeDoDiaInteiro(diaLido) : "dd/mm/aaaa" })}
          {campo("ini", "Começa", { numerico: true })}
          {campo("fim", "Termina", { numerico: true })}
        </div>
        {remarcando ? campo("motivo", "Motivo da remarcação", { ajuda: "Ex.: redesignação publicada pelo juízo. Fica no histórico." }) : null}
        {radio("mod", "Onde", [{ v: "PRESENCIAL", t: "Presencial" }, { v: "VIRTUAL", t: "Virtual, com link da sala" }], r.modalidade,
          (v) => mudar("modalidade", v as Rascunho["modalidade"]))}
        {comLink
          ? campo("linkSala", "Link da sala", { tipo: "url", ajuda: "Vai no lembrete ao cliente e no botão “Entrar na sala”." })
          : campo("local", "Endereço", { opcional: true, ajuda: "Vai no lembrete ao cliente." })}
        <div className="x-dois">
          {selecao("clienteId", "Cliente", clientesOps, { ajuda: clientes === null ? "Carregando os clientes…" : "Da lista de Clientes." })}
          {casos !== undefined
            ? selecao("casoId", "Processo", casosOps, { opcional: true, ajuda: casos === null ? "Carregando os casos…" : "Dos casos em andamento no Jurídico." })
            : <span />}
        </div>
        <div className="x-dois">
          {selecao("responsavelId", "Responsável", [...(r.responsavelId ? [] : [{ v: "", t: "Escolha" }]), ...pessoasOps], { ajuda: "Quem responde pelo compromisso." })}
          {selecao("tambemVai", "Também vai", [{ v: "", t: "Ninguém mais" }, ...pessoasOps.filter((p) => p.v !== r.responsavelId)], { opcional: true })}
        </div>
        <fieldset className="x-grupo">
          <legend>Lembrete ao cliente</legend>
          {cliente && contato?.telefone ? (
            <label className="opcao">
              <input className="marcar" type="checkbox" checked={r.lembrete} onChange={(ev) => { setLembreteTocado(true); mudar("lembrete", ev.target.checked); }} />
              <span>
                Lembrar {primeiroNome(cliente.nome)} pelo WhatsApp
                <small>
                  1 dia antes, no mesmo horário, e 2 horas antes, {comLink ? "com o link da sala" : "com o endereço"}. Vai para o contato principal da ficha:{" "}
                  {primeiroNome(contato.nome)}, <span className="num">{formatarTelefone(contato.telefone)}</span>.
                </small>
              </span>
            </label>
          ) : (
            <p className="x-pe-nota">
              <Icone nome="conversas" className="ico" />
              <span>{cliente ? "O contato principal deste cliente não tem telefone. Complete a ficha para lembrar pelo WhatsApp." : "Escolha um cliente para lembrar pelo WhatsApp."}</span>
            </p>
          )}
          <p className="x-pe-nota">
            <Icone nome="balanca" className="ico" />
            <span>
              {r.tipo === "AUDIENCIA"
                ? "Em audiência de conciliação, faltar sem justificativa pode gerar multa (CPC, art. 334, § 8º). Por isso o lembrete já vem marcado nas audiências."
                : "Nos tipos que não são audiência, o lembrete vem desmarcado. Marque quando o cliente precisa ir."}
            </span>
          </p>
        </fieldset>
        <div className="campo">
          <label htmlFor={`${ids}-obs`}>
            Observações<span className="opcional"> (opcional)</span>
          </label>
          <textarea className="entrada" id={`${ids}-obs`} value={r.observacoes} onChange={(ev) => mudar("observacoes", ev.target.value)}
            aria-invalid={erros.observacoes ? true : undefined} aria-describedby={erros.observacoes ? `${ids}-obs-er` : `${ids}-obs-aj`} />
          {erros.observacoes ? <ErroCampo id={`${ids}-obs-er`}>{erros.observacoes}</ErroCampo> : <p className="ajuda" id={`${ids}-obs-aj`}>Só a equipe vê. Não vai para o cliente.</p>}
        </div>
      </div>
    </Janela>
  );
}
