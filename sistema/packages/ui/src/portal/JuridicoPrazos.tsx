"use client";
// Jurídico do Portal, parte 2 (EX-02, EX-04, PD-05, IN-08), desenho aprovado em
// docs/design/aprovadas/portal-juridico (estados prazos, novo-prazo, tarefas, tarefas-equipe e a
// seção "Prazos e tarefas" da ficha): os prazos cadastrados à mão, do que vence hoje ao que vence
// depois, com a urgência escrita; as tarefas minhas e da equipe com a carga de cada pessoa; o
// que a tarefa espera ("o que está travando") e o "já chegou". O T3jus ainda não lê publicações
// nem conta dias úteis: a tela diz isso. O lembrete no Início e no sino chega numa próxima entrega.

import { useEffect, useRef, useState } from "react";
import { dataBr, diaBrasilia, formatarCnj, type DocumentoFaltando, type FichaCaso, type LinhaCaso, type ListaCasos, type ListaPrazos, type ListaTarefas, type MostrarPrazos, type Prazo, type Tarefa, type VisaoTarefas } from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { contar, lerDia } from "./agenda.ts";
import { Chips, Selo, useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { gruposPrazos, gruposTarefas, linhaProcesso, ROTAS_JURIDICO, textoEsperando, textoFazerAte, urgenciaPrazo, urgenciaTarefa } from "./juridico.ts";
import { chamarPortal, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Pessoa = { id: string; nome: string };
type Feito = { titulo: string; texto: string };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const ICONE_TOM = { urgente: "alerta", atencao: "relogio", neutro: undefined } as const;

function usePessoas(): Pessoa[] | null {
  const [p, setP] = useState<Pessoa[] | null>(null);
  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((x) => setP(x.ok ? x.dados.pessoas : []));
  }, []);
  return p;
}

function useCasosAbertos(): LinhaCaso[] | null {
  const [c, setC] = useState<LinhaCaso[] | null>(null);
  useEffect(() => {
    void chamarPortal<ListaCasos>("/v1/escritorio/juridico/casos?situacao=ANDAMENTO").then((x) => setC(x.ok ? x.dados.casos : []));
  }, []);
  return c;
}

function Quem({ p }: { p: Pessoa }) {
  return <span className="jr-resp"><span className="av-p" aria-hidden="true">{iniciais(p.nome)}</span>{p.nome}</span>;
}

export function SeloUrgencia({ u }: { u: { texto: string; tom: "urgente" | "atencao" | "neutro" } }) {
  return <Selo tom={u.tom} icone={ICONE_TOM[u.tom]}>{u.texto}</Selo>;
}

function Cabeca({ sobre, titulo, lede, acao }: { sobre: string; titulo: string; lede: string; acao: React.ReactNode }) {
  return (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">{sobre}</p>
        <h1>{titulo}</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">{lede}</p>
      </div>
      {acao}
    </div>
  );
}

// ------------------------------------------------------------------------- Janelas

const MSG_PRAZO: Record<string, string> = {
  casoId: "Escolha o caso.",
  descricao: "Escreva o que é o prazo, como “Contestação” ou “Recurso ordinário”.",
  dataFinal: "Escreva o prazo final no formato dd/mm/aaaa.",
  fazerAte: "O “fazer até” é uma data no formato dd/mm/aaaa, no prazo final ou antes.",
  intimacaoEm: "A intimação é uma data de hoje ou antes, no formato dd/mm/aaaa, e não depois do prazo final.",
  responsavelId: "Escolha quem cuida do prazo.",
};

const diaParaTela = (d: string | null | undefined) => (d ? dataBr(d) : "");
const MSG_CONFLITO = "Outra pessoa mudou isto enquanto você editava. Feche a janela e abra de novo para ver como ficou.";

/** O caso que a janela mostra fixo: o da ficha ou, ao editar, o do próprio prazo ou tarefa. */
function casoFixo(caso: { id: string; nome: string; linha: string } | undefined, editado: { caso: { id: string; nome: string; numero?: string | null; vara?: string | null } } | undefined) {
  if (caso) return caso;
  if (!editado) return undefined;
  const c = editado.caso;
  return { id: c.id, nome: c.nome, linha: [c.numero ? formatarCnj(c.numero) : null, c.vara].filter(Boolean).join(" · ") || "Sem número ainda" };
}

/** Novo prazo (EX-04): do caso escolhido ou do caso da ficha. Com `editar`, a mesma janela
 *  abre preenchida (F3.39): muda o que é, as datas e o responsável; o caso fica. */
export function JanelaPrazo({ caso: casoDado, editar, escritorio, aoFechar, aoFeito }: {
  caso?: { id: string; nome: string; linha: string };
  editar?: Prazo;
  escritorio: EscritorioPortal;
  aoFechar: () => void;
  aoFeito: (descricao: string) => void;
}) {
  const pessoas = usePessoas();
  const casos = useCasosAbertos();
  const caso = casoFixo(casoDado, editar);
  const [casoId, setCasoId] = useState(caso?.id ?? "");
  const [descricao, setDescricao] = useState(editar?.descricao ?? "");
  const [dataFinal, setDataFinal] = useState(diaParaTela(editar?.dataFinal));
  const [fazerAte, setFazerAte] = useState(diaParaTela(editar?.fazerAte));
  const [intimacao, setIntimacao] = useState(diaParaTela(editar?.intimacaoEm));
  const [resp, setResp] = useState(editar?.responsavel.id ?? "");
  const [lembrar, setLembrar] = useState(editar?.lembrar ?? true);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const eu = pessoas?.find((p) => p.nome === escritorio.pessoa)?.id ?? "";
  const responsavelId = resp || eu;
  const escolhido = casos?.find((c) => c.id === casoId);

  async function enviar() {
    const e: string[] = [];
    if (!casoId) e.push("casoId");
    if (!descricao.trim()) e.push("descricao");
    if (!lerDia(dataFinal)) e.push("dataFinal");
    if (fazerAte.trim() && (!lerDia(fazerAte) || (lerDia(dataFinal) && lerDia(fazerAte)! > lerDia(dataFinal)!))) e.push("fazerAte");
    if (intimacao.trim() && !lerDia(intimacao)) e.push("intimacaoEm");
    if (!responsavelId) e.push("responsavelId");
    setFalha(null);
    setErros(e);
    if (e.length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const campos_ = {
      descricao: descricao.trim(), dataFinal: lerDia(dataFinal), fazerAte: fazerAte.trim() ? lerDia(fazerAte) : null,
      intimacaoEm: intimacao.trim() ? lerDia(intimacao) : null, responsavelId, lembrar,
    };
    const r = editar
      ? await chamarPortal<{ id: string }>(`/v1/escritorio/juridico/prazos/${editar.id}`, { metodo: "PUT", corpo: { versao: editar.versao, ...campos_ } })
      : await chamarPortal<{ id: string }>("/v1/escritorio/juridico/prazos", { metodo: "POST", corpo: { casoId, ...campos_ } });
    setEnviando(false);
    if (r.ok) return aoFeito(descricao.trim());
    if (r.erro.codigo === "VERSION_CONFLICT") return setFalha(MSG_CONFLITO);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length && !r.erro.detalhes?.motivo) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  const data = (id: string, rot: string, v: string, set: (x: string) => void, c: string, ajuda: string, opcional = false) => (
    <div className="campo c3">
      <label htmlFor={id}>{rot}{opcional ? <span className="opcional"> (opcional)</span> : null}</label>
      <input className="entrada" id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" value={v} onChange={(e) => set(e.target.value)}
        aria-invalid={tem(c) || undefined} aria-describedby={descritoPor(`${id}-aj`, tem(c) && `${id}-er`)} />
      <p className="ajuda" id={`${id}-aj`}>{ajuda}</p>
      {tem(c) ? <ErroCampo id={`${id}-er`}>{MSG_PRAZO[c]}</ErroCampo> : null}
    </div>
  );

  return (
    <Janela id="j-prazo" aberta aoFechar={aoFechar} sobretitulo="Jurídico · Prazos" titulo={editar ? "Editar prazo" : "Novo prazo"} descricao="j-prazo-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            {editar ? "Salvar prazo" : "Cadastrar prazo"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-prazo-d">{editar ? "A mudança fica no histórico do caso, com seu nome e a hora." : "Fica no caso, na lista de prazos e com o responsável."}</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>{editar ? "O prazo ainda não foi salvo." : "O prazo ainda não foi cadastrado."}</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo={editar ? "O prazo não foi salvo." : "O prazo não foi cadastrado."}>{falha}</Aviso> : null}
        <div className="hn-campos">
          {caso ? (
            <div className="campo c6">
              <p className="jr-rot">Caso</p>
              <p className="jr-agora"><b>{caso.nome}</b><br /><small>{caso.linha}</small></p>
            </div>
          ) : (
            <div className="campo c6">
              <label htmlFor="pz-caso">Caso</label>
              <select className="entrada" id="pz-caso" value={casoId} onChange={(e) => setCasoId(e.target.value)} data-foco
                aria-invalid={tem("casoId") || undefined} aria-describedby={descritoPor(escolhido && "pz-caso-aj", tem("casoId") && "pz-caso-er")}>
                <option value="">{casos === null ? "Carregando os casos…" : "Escolha o caso"}</option>
                {(casos ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {escolhido ? <p className="ajuda" id="pz-caso-aj">{linhaProcesso(escolhido)}</p> : null}
              {tem("casoId") ? <ErroCampo id="pz-caso-er">{MSG_PRAZO.casoId}</ErroCampo> : null}
            </div>
          )}
          <div className="campo c6">
            <label htmlFor="pz-oque">O que é</label>
            <input className="entrada" id="pz-oque" type="text" autoComplete="off" maxLength={200} value={descricao} onChange={(e) => setDescricao(e.target.value)} data-foco={caso ? true : undefined}
              aria-invalid={tem("descricao") || undefined} aria-describedby={descritoPor("pz-oque-aj", tem("descricao") && "pz-oque-er")} />
            <p className="ajuda" id="pz-oque-aj">Aparece assim na lista e na ficha do caso.</p>
            {tem("descricao") ? <ErroCampo id="pz-oque-er">{MSG_PRAZO.descricao}</ErroCampo> : null}
          </div>
          {data("pz-final", "Prazo final", dataFinal, setDataFinal, "dataFinal", "dd/mm/aaaa. A data do processo.")}
          {data("pz-ate", "Fazer até", fazerAte, setFazerAte, "fazerAte", "A margem do escritório, antes do prazo final.", true)}
          <div className="campo c6">
            <label htmlFor="pz-resp">Responsável</label>
            <select className="entrada" id="pz-resp" value={responsavelId} onChange={(e) => setResp(e.target.value)}
              aria-invalid={tem("responsavelId") || undefined} aria-describedby={descritoPor("pz-resp-aj", tem("responsavelId") && "pz-resp-er")}>
              {pessoas === null ? <option value="">Carregando a equipe…</option> : null}
              {(pessoas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <p className="ajuda" id="pz-resp-aj">{editar ? "Trocar o responsável fica no histórico do caso, com quem era antes." : "Vê o prazo na lista dele e responde por ele."}</p>
            {tem("responsavelId") ? <ErroCampo id="pz-resp-er">{MSG_PRAZO.responsavelId}</ErroCampo> : null}
          </div>
          <div className="campo c6">
            <label htmlFor="pz-int">Intimação em<span className="opcional"> (opcional)</span></label>
            <input className="entrada" id="pz-int" type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" value={intimacao} onChange={(e) => setIntimacao(e.target.value)}
              aria-invalid={tem("intimacaoEm") || undefined} aria-describedby={descritoPor("pz-int-aj", tem("intimacaoEm") && "pz-int-er")} />
            <p className="ajuda" id="pz-int-aj">Para consulta. O T3jus não conta os dias.</p>
            {tem("intimacaoEm") ? <ErroCampo id="pz-int-er">{MSG_PRAZO.intimacaoEm}</ErroCampo> : null}
          </div>
          <label className="opcao c6">
            <input className="marcar" type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            <span>Lembrar o responsável 2 dias antes<small>No Início e no sino de avisos, quando o lembrete chegar ao T3jus.</small></span>
          </label>
        </div>
        <p className="jr-nota">
          <Icone nome="ajuda" className="ico" />
          <span>Confira a contagem no processo. Nesta versão, o prazo é cadastrado à mão: o T3jus ainda não lê publicações nem calcula dias úteis.</span>
        </p>
      </div>
    </Janela>
  );
}

const MSG_TAREFA: Record<string, string> = {
  casoId: "Escolha o caso.",
  titulo: "Escreva o que precisa ser feito.",
  venceEm: "Escreva o vencimento no formato dd/mm/aaaa.",
  responsavelId: "Escolha quem faz a tarefa.",
  esperando: "Escreva no máximo 200 letras.",
};

/** Nova tarefa (EX-02): com responsável, vencimento e, se for o caso, o que ela espera. Com
 *  `editar`, a mesma janela abre preenchida (F3.39); o caso fica. */
export function JanelaTarefa({ caso: casoDado, editar, escritorio, aoFechar, aoFeito }: {
  caso?: { id: string; nome: string; linha: string };
  editar?: Tarefa;
  escritorio: EscritorioPortal;
  aoFechar: () => void;
  aoFeito: (titulo: string) => void;
}) {
  const pessoas = usePessoas();
  const casos = useCasosAbertos();
  const caso = casoFixo(casoDado, editar);
  const [casoId, setCasoId] = useState(caso?.id ?? "");
  const [titulo, setTitulo] = useState(editar?.titulo ?? "");
  const [vence, setVence] = useState(diaParaTela(editar?.venceEm));
  const [resp, setResp] = useState(editar?.responsavel.id ?? "");
  const [espera, setEspera] = useState(Boolean(editar?.esperando));
  const [esperando, setEsperando] = useState(editar?.esperando ?? "");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const eu = pessoas?.find((p) => p.nome === escritorio.pessoa)?.id ?? "";
  const responsavelId = resp || eu;

  async function enviar() {
    const e: string[] = [];
    if (!casoId) e.push("casoId");
    if (!titulo.trim()) e.push("titulo");
    if (!lerDia(vence)) e.push("venceEm");
    if (!responsavelId) e.push("responsavelId");
    if (espera && !esperando.trim()) e.push("esperando");
    setFalha(null);
    setErros(e);
    if (e.length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const campos_ = { titulo: titulo.trim(), venceEm: lerDia(vence), responsavelId, esperando: espera ? esperando.trim() : null };
    const r = editar
      ? await chamarPortal<{ id: string }>(`/v1/escritorio/juridico/tarefas/${editar.id}`, { metodo: "PUT", corpo: { versao: editar.versao, ...campos_ } })
      : await chamarPortal<{ id: string }>("/v1/escritorio/juridico/tarefas", { metodo: "POST", corpo: { casoId, ...campos_ } });
    setEnviando(false);
    if (r.ok) return aoFeito(titulo.trim());
    if (r.erro.codigo === "VERSION_CONFLICT") return setFalha(MSG_CONFLITO);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length && !r.erro.detalhes?.motivo) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  return (
    <Janela id="j-tarefa" aberta aoFechar={aoFechar} sobretitulo="Jurídico · Tarefas" titulo={editar ? "Editar tarefa" : "Nova tarefa"} descricao="j-tarefa-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            {editar ? "Salvar tarefa" : "Criar tarefa"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-tarefa-d">{editar ? "A mudança fica no histórico do caso, com seu nome e a hora." : "Cada tarefa tem um caso, quem faz e até quando."}</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>{editar ? "A tarefa ainda não foi salva." : "A tarefa ainda não foi criada."}</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo={editar ? "A tarefa não foi salva." : "A tarefa não foi criada."}>{falha}</Aviso> : null}
        <div className="hn-campos">
          {caso ? (
            <div className="campo c6">
              <p className="jr-rot">Caso</p>
              <p className="jr-agora"><b>{caso.nome}</b><br /><small>{caso.linha}</small></p>
            </div>
          ) : (
            <div className="campo c6">
              <label htmlFor="tf-caso">Caso</label>
              <select className="entrada" id="tf-caso" value={casoId} onChange={(e) => setCasoId(e.target.value)} data-foco
                aria-invalid={tem("casoId") || undefined} aria-describedby={descritoPor(tem("casoId") && "tf-caso-er")}>
                <option value="">{casos === null ? "Carregando os casos…" : "Escolha o caso"}</option>
                {(casos ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {tem("casoId") ? <ErroCampo id="tf-caso-er">{MSG_TAREFA.casoId}</ErroCampo> : null}
            </div>
          )}
          <div className="campo c6">
            <label htmlFor="tf-tit">O que fazer</label>
            <input className="entrada" id="tf-tit" type="text" autoComplete="off" maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} data-foco={caso ? true : undefined}
              aria-invalid={tem("titulo") || undefined} aria-describedby={descritoPor(tem("titulo") && "tf-tit-er")} />
            {tem("titulo") ? <ErroCampo id="tf-tit-er">{MSG_TAREFA.titulo}</ErroCampo> : null}
          </div>
          <div className="campo c3">
            <label htmlFor="tf-vence">Vence em</label>
            <input className="entrada" id="tf-vence" type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" value={vence} onChange={(e) => setVence(e.target.value)}
              aria-invalid={tem("venceEm") || undefined} aria-describedby={descritoPor("tf-vence-aj", tem("venceEm") && "tf-vence-er")} />
            <p className="ajuda" id="tf-vence-aj">dd/mm/aaaa</p>
            {tem("venceEm") ? <ErroCampo id="tf-vence-er">{MSG_TAREFA.venceEm}</ErroCampo> : null}
          </div>
          <div className="campo c3">
            <label htmlFor="tf-resp">Responsável</label>
            <select className="entrada" id="tf-resp" value={responsavelId} onChange={(e) => setResp(e.target.value)}
              aria-invalid={tem("responsavelId") || undefined} aria-describedby={descritoPor(tem("responsavelId") && "tf-resp-er")}>
              {pessoas === null ? <option value="">Carregando a equipe…</option> : null}
              {(pessoas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {tem("responsavelId") ? <ErroCampo id="tf-resp-er">{MSG_TAREFA.responsavelId}</ErroCampo> : null}
          </div>
          <label className="opcao c6">
            <input className="marcar" type="checkbox" checked={espera} onChange={(e) => setEspera(e.target.checked)} />
            <span>Está esperando alguém<small>Um documento do cliente, uma resposta. Aparece em “O que está travando”, na ficha do caso.</small></span>
          </label>
          {espera ? (
            <div className="campo c6">
              <label htmlFor="tf-esp">Esperando o quê</label>
              <input className="entrada" id="tf-esp" type="text" autoComplete="off" maxLength={200} placeholder="Ex.: o cliente: CTPS digital" value={esperando} onChange={(e) => setEsperando(e.target.value)}
                aria-invalid={tem("esperando") || undefined} aria-describedby={descritoPor("tf-esp-aj", tem("esperando") && "tf-esp-er")} />
              <p className="ajuda" id="tf-esp-aj">Aparece como “Esperando o cliente: CTPS digital, há 3 dias”.</p>
              {tem("esperando") ? <ErroCampo id="tf-esp-er">{esperando.trim() ? MSG_TAREFA.esperando : "Escreva o que a tarefa espera, ou desmarque."}</ErroCampo> : null}
            </div>
          ) : null}
        </div>
      </div>
    </Janela>
  );
}

/** Marcar como cumprido pede confirmação e fica no histórico do caso. */
function JanelaCumprido({ p, aoFechar, aoFeito }: { p: Prazo; aoFechar: () => void; aoFeito: () => void }) {
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar() {
    setEnviando(true);
    const r = await chamarPortal(`/v1/escritorio/juridico/prazos/${p.id}/cumprido`, { metodo: "POST", corpo: {} });
    setEnviando(false);
    if (r.ok) return aoFeito();
    setFalha(textoDoErro(r.erro));
  }
  return (
    <Janela id="j-cumprido" aberta alerta aoFechar={aoFechar} sobretitulo={p.caso.nome} titulo="Marcar o prazo como cumprido?" descricao="j-cumprido-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Marcar como cumprido
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 12 }}>
        {falha ? <Aviso tom="urgencia" titulo="O prazo não foi marcado.">{falha}</Aviso> : null}
        <p id="j-cumprido-d"><b>{p.descricao}</b>, prazo final {dataBr(p.dataFinal)}. Fica no histórico do caso com seu nome e a hora, e sai da lista de prazos abertos.</p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- Prazos

function LinhaPrazo({ p, hoje, aoCumprir, aoEditar }: { p: Prazo; hoje: string; aoCumprir?: () => void; aoEditar?: () => void }) {
  const u = urgenciaPrazo(p.dataFinal, hoje);
  const sub = [p.caso.numero ? formatarCnj(p.caso.numero) : "Sem número ainda", p.caso.vara].filter(Boolean).join(" · ");
  return (
    <li className="jr-pz">
      <span className={`jr-dia jr-dia-${p.cumpridoEm ? "feito" : u.tom}`} aria-hidden="true">
        <b>{p.dataFinal.slice(8, 10)}</b>
        <small>{MESES[Number(p.dataFinal.slice(5, 7)) - 1]}</small>
      </span>
      <div className="jr-pz-oque">
        <p className="jr-pz-t">{p.descricao} · <a href={ROTAS_JURIDICO.caso(p.caso.id)}>{p.caso.nome}</a></p>
        <small>
          <span className="sr">Prazo final {dataBr(p.dataFinal)}. </span>
          {sub}
          {p.fazerAte && !p.cumpridoEm ? <>{sub ? " · " : ""}<b>{textoFazerAte(p.fazerAte, hoje)}</b></> : null}
          {p.cumpridoEm ? <>{sub ? " · " : ""}Cumprido em {ddmm(diaBrasilia(p.cumpridoEm))}{p.cumpridoPor ? ` por ${p.cumpridoPor.nome}` : ""}</> : null}
        </small>
      </div>
      <div className="jr-pz-quem">
        {p.cumpridoEm ? <Selo tom="ativo" icone="check">Cumprido</Selo> : <SeloUrgencia u={u} />}
        <Quem p={p.responsavel} />
      </div>
      {aoCumprir || aoEditar ? (
        <span className="jr-fpz-acao">
          {aoEditar ? (
            <button className="btn btn-fantasma btn-compacto" type="button" onClick={aoEditar} aria-label={`Editar: ${p.descricao}, ${p.caso.nome}`}>
              <Icone nome="pena" className="ico" />
              Editar
            </button>
          ) : null}
          {aoCumprir ? (
            <button className="btn btn-sec btn-compacto" type="button" onClick={aoCumprir} aria-label={`Cumprido: ${p.descricao}, ${p.caso.nome}`}>
              <Icone nome="check" className="ico" />
              Cumprido
            </button>
          ) : null}
        </span>
      ) : null}
    </li>
  );
}

function PrazosConteudo({ escritorio }: { escritorio: EscritorioPortal }) {
  const [mostrar, setMostrar] = useState<MostrarPrazos>("ABERTOS");
  const [resp, setResp] = useState("");
  const [novo, setNovo] = useState(false);
  // Vindo do atalho "Novo prazo" do Início (?novo=1), a janela já abre.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has("novo")) return;
    q.delete("novo");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    void Promise.resolve().then(() => setNovo(true));
  }, []);
  const [cumprir, setCumprir] = useState<Prazo | null>(null);
  const [editar, setEditar] = useState<Prazo | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const filtros = new URLSearchParams({ mostrar });
  if (resp && mostrar !== "MEUS") filtros.set("responsavel", resp);
  const { dados, recarregar } = useCarga<ListaPrazos>(`/v1/escritorio/juridico/prazos?${filtros}`);
  const cab = (
    <Cabeca sobre="Jurídico" titulo="Prazos" lede="Os prazos de todos os casos, do que vence hoje ao que vence depois."
      acao={<button data-muda className="btn btn-pri" type="button" onClick={() => setNovo(true)} style={{ marginBottom: 6 }}><Icone nome="mais" className="ico" />Novo prazo</button>} />
  );
  const janelas = (
    <>
      {novo ? <JanelaPrazo escritorio={escritorio} aoFechar={() => setNovo(false)}
        aoFeito={(d) => { setNovo(false); setFeito({ titulo: "Prazo cadastrado", texto: `${d} está na lista e na ficha do caso.` }); recarregar(); }} /> : null}
      {cumprir ? <JanelaCumprido p={cumprir} aoFechar={() => setCumprir(null)}
        aoFeito={() => { setFeito({ titulo: "Prazo cumprido", texto: `${cumprir.descricao} ficou no histórico do caso.` }); setCumprir(null); recarregar(); }} /> : null}
      {editar ? <JanelaPrazo editar={editar} escritorio={escritorio} aoFechar={() => setEditar(null)}
        aoFeito={(d) => { setEditar(null); setFeito({ titulo: "Prazo salvo", texto: `${d}: a mudança ficou no histórico do caso.` }); recarregar(); }} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </>
  );
  if (dados === "erro") return <>{cab}<ErroAoCarregar oque="os prazos" aoTentar={recarregar} />{janelas}</>;
  if (!dados) return <>{cab}<Carregando rotulo="Carregando os prazos…" linhas={4} /></>;
  const t = dados.totais;
  const grupos = mostrar === "CUMPRIDOS" ? [{ chave: "cumpridos", titulo: "Cumpridos", itens: dados.prazos }] : gruposPrazos(dados.prazos, dados.hoje);
  const titulo = mostrar === "CUMPRIDOS" ? "Prazos cumpridos" : mostrar === "MEUS" ? "Meus prazos" : "Prazos abertos";
  const sub = mostrar === "CUMPRIDOS"
    ? `${contar(dados.prazos.length, "prazo cumprido", "prazos cumpridos")} · os mais recentes primeiro`
    : `${contar(dados.prazos.length, "prazo", "prazos")}${t.hoje && mostrar === "ABERTOS" ? ` · ${contar(t.hoje, "vence hoje", "vencem hoje")}` : ""} · do mais próximo para o mais distante`;
  return (
    <div className="hn">
      {cab}
      <div className="hn-grade">
        <section className="folha jr-lista" aria-labelledby="t-pz" style={{ overflow: "hidden" }}>
          <div className="folha-cab">
            <div>
              <h2 id="t-pz">{titulo}</h2>
              <p className="sub" role="status">{sub}</p>
            </div>
          </div>
          <div className="hn-ferr jr-ferr">
            {mostrar !== "MEUS" ? (
              <div className="campo">
                <label htmlFor="pz-f-resp">Responsável</label>
                <select className="entrada" id="pz-f-resp" value={resp} onChange={(e) => setResp(e.target.value)}>
                  <option value="">Todos</option>
                  {dados.responsaveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            ) : null}
            <Chips rotulo="Mostrar" atual={mostrar} aoEscolher={(v) => setMostrar(v as MostrarPrazos)}
              opcoes={[{ v: "ABERTOS", t: `Abertos (${t.abertos})` }, { v: "MEUS", t: `Só meus (${t.meus})` }, { v: "CUMPRIDOS", t: "Cumpridos" }]} />
          </div>
          {dados.prazos.length ? grupos.map((g) => (
            <div key={g.chave} className="jr-grupo">
              <h3 className="sobretitulo">{g.titulo} <span className="jr-n">{g.itens.length}</span></h3>
              <ul className="jr-pzs">
                {g.itens.map((p) => <LinhaPrazo key={p.id} p={p} hoje={dados.hoje} aoCumprir={p.cumpridoEm ? undefined : () => setCumprir(p)}
                  aoEditar={p.cumpridoEm ? undefined : () => setEditar(p)} />)}
              </ul>
            </div>
          )) : (
            <Estado icone="relogio" titulo={mostrar === "CUMPRIDOS" ? "Nenhum prazo cumprido ainda" : "Nenhum prazo aberto"}
              acoes={mostrar !== "CUMPRIDOS" ? <button className="btn btn-pri" type="button" onClick={() => setNovo(true)}><Icone nome="mais" className="ico" />Cadastrar um prazo</button> : undefined}>
              {mostrar === "CUMPRIDOS" ? "Quando um prazo for marcado como cumprido, ele aparece aqui." : "Cadastre o prazo a partir da intimação. Ele aparece aqui e na ficha do caso."}
            </Estado>
          )}
          <p className="hn-pe">
            <Icone nome="ajuda" className="ico" />
            <span>Os prazos são cadastrados pela equipe, a partir da intimação. O T3jus ainda não lê as publicações dos tribunais nem conta dias úteis: confira sempre a contagem no processo.</span>
          </p>
        </section>
        <aside className="hn-col" aria-label="Sobre os prazos">
          <section className="explica campo-ambar" aria-labelledby="t-pzx">
            <p className="sobretitulo">Prazos</p>
            <h2 id="t-pzx">Nenhum prazo sem dono.</h2>
            <ul>
              <li><Icone nome="pessoas" className="ico" /><span>Todo prazo tem um responsável. Se a pessoa sai da equipe, o prazo passa para quem a sócia escolher.</span></li>
              <li><Icone nome="relogio" className="ico" /><span>“Fazer até” é a margem do escritório, antes do prazo final.</span></li>
              <li><Icone nome="check" className="ico" /><span>Marcar como cumprido pede confirmação e fica no histórico do caso.</span></li>
              <li><Icone nome="alerta" className="ico" /><span>A urgência vem escrita: “Vence hoje”, “Amanhã”, “Em 3 dias”. A cor só reforça.</span></li>
            </ul>
          </section>
        </aside>
      </div>
      {janelas}
    </div>
  );
}

export function PrazosJuridicoPortal() {
  return <MolduraArea area="JURIDICO" secao="prazos">{(e) => <PrazosConteudo escritorio={e} />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Tarefas

async function concluir(t: Tarefa, sim: boolean): Promise<string | null> {
  const r = await chamarPortal(`/v1/escritorio/juridico/tarefas/${t.id}/concluida`, { metodo: "POST", corpo: { concluir: sim } });
  return r.ok ? null : textoDoErro(r.erro);
}

async function chegou(t: Tarefa): Promise<string | null> {
  const r = await chamarPortal(`/v1/escritorio/juridico/tarefas/${t.id}/chegou`, { metodo: "POST", corpo: {} });
  return r.ok ? null : textoDoErro(r.erro);
}

function LinhaTarefa({ t, hoje, comCaso = true, comQuem = true, aoMarcar, aoChegou, aoEditar }: {
  t: Tarefa; hoje: string; comCaso?: boolean; comQuem?: boolean; aoMarcar: (sim: boolean) => Promise<boolean>; aoChegou?: () => void; aoEditar?: () => void;
}) {
  // A caixa muda na hora; se o servidor recusar, volta como estava.
  const [marcada, setMarcada] = useState<boolean | null>(null);
  const feita = Boolean(t.concluidaEm);
  const u = urgenciaTarefa(t.venceEm, hoje);
  const id = `tf-${t.id}`;
  return (
    <li className={feita ? "jr-tf jr-tf-feita" : "jr-tf"}>
      <input className="marcar" type="checkbox" id={id} checked={marcada ?? feita}
        onChange={(e) => { const v = e.target.checked; setMarcada(v); void aoMarcar(v).then((ok) => { if (!ok) setMarcada(null); }); }} />
      <div className="jr-tf-oque">
        <label htmlFor={id} className="jr-tf-t">{t.titulo}<span className="sr">{feita ? " (concluída; desmarque para reabrir)" : ""}</span></label>
        {comCaso ? <a className="jr-tf-caso" href={ROTAS_JURIDICO.caso(t.caso.id)}>{t.caso.nome}</a>
          : <small>{t.responsavel.nome} · {feita ? `concluída${t.concluidaPor ? ` por ${t.concluidaPor.nome}` : ""} em ${ddmm(diaBrasilia(t.concluidaEm!))}` : `vence ${t.venceEm === hoje ? "hoje" : ddmm(t.venceEm)}`}</small>}
        {t.esperando && !feita ? (
          <p className="jr-espera">
            <span><Icone nome="relogio" className="ico ico-s" />{textoEsperando(t.esperando, t.esperandoDesde, hoje)}</span>
            {aoChegou ? <button className="jr-link" type="button" onClick={aoChegou}>Já chegou</button> : null}
          </p>
        ) : null}
      </div>
      <div className="jr-pz-quem">
        {feita ? <Selo tom="ativo" icone="check">Concluída</Selo>
          : t.esperando && !comCaso ? <Selo tom="atencao">Travada</Selo>
          : u.tom === "neutro" ? <span className="jr-data">{u.texto}</span> : <SeloUrgencia u={u} />}
        {comQuem ? <Quem p={t.responsavel} /> : null}
        {aoEditar && !feita ? (
          <button className="btn btn-fantasma btn-compacto" type="button" onClick={aoEditar} aria-label={`Editar: ${t.titulo}`}>
            <Icone nome="pena" className="ico" />
            Editar
          </button>
        ) : null}
      </div>
    </li>
  );
}

function Carga({ carga }: { carga: NonNullable<ListaTarefas["carga"]> }) {
  const maior = Math.max(1, ...carga.map((c) => c.casos + c.tarefas));
  return (
    <section className="folha" aria-labelledby="t-cg">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-cg" style={{ fontSize: 20 }}>Carga da equipe</h2>
          <p className="sub">Casos em andamento e tarefas abertas</p>
        </div>
      </div>
      <ul className="jr-carga">
        {carga.map((c) => (
          <li key={c.pessoa.id}>
            <span className="av-p" aria-hidden="true">{iniciais(c.pessoa.nome)}</span>
            <div>
              <b>{c.pessoa.nome}</b>
              <small>{contar(c.casos, "caso", "casos")} · {contar(c.tarefas, "tarefa", "tarefas")}{c.atrasadas ? ` · ${contar(c.atrasadas, "atrasada", "atrasadas")}` : ""}</small>
              <span className="jr-barras" aria-hidden="true">
                <i className="c" style={{ width: `${(c.casos / maior) * 100}%` }} />
                <i className="t" style={{ width: `${(c.tarefas / maior) * 100}%` }} />
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="jr-legenda" aria-hidden="true"><i className="c" />Casos <i className="t" />Tarefas</p>
      <p className="hn-pe">
        <Icone nome="ajuda" className="ico" />
        <span>Para ver onde o trabalho acumula, não para comparar pessoas.</span>
      </p>
    </section>
  );
}

function TarefasConteudo({ escritorio }: { escritorio: EscritorioPortal }) {
  const [visao, setVisao] = useState<VisaoTarefas>("MINHAS");
  const [resp, setResp] = useState("");
  const [nova, setNova] = useState(false);
  const [editar, setEditar] = useState<Tarefa | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const filtros = new URLSearchParams({ visao });
  if (resp && visao === "EQUIPE") filtros.set("responsavel", resp);
  const { dados, recarregar } = useCarga<ListaTarefas>(`/v1/escritorio/juridico/tarefas?${filtros}`);
  const cab = (
    <Cabeca sobre="Jurídico" titulo="Tarefas" lede="O que cada pessoa precisa entregar, em qual caso e até quando."
      acao={<button data-muda className="btn btn-pri" type="button" onClick={() => setNova(true)} style={{ marginBottom: 6 }}><Icone nome="mais" className="ico" />Nova tarefa</button>} />
  );
  const janelas = (
    <>
      {nova ? <JanelaTarefa escritorio={escritorio} aoFechar={() => setNova(false)}
        aoFeito={(x) => { setNova(false); setFeito({ titulo: "Tarefa criada", texto: `${x} está na lista e na ficha do caso.` }); recarregar(); }} /> : null}
      {editar ? <JanelaTarefa editar={editar} escritorio={escritorio} aoFechar={() => setEditar(null)}
        aoFeito={(x) => { setEditar(null); setFeito({ titulo: "Tarefa salva", texto: `${x}: a mudança ficou no histórico do caso.` }); recarregar(); }} /> : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </>
  );
  if (dados === "erro") return <>{cab}<ErroAoCarregar oque="as tarefas" aoTentar={recarregar} />{janelas}</>;
  if (!dados) return <>{cab}<Carregando rotulo="Carregando as tarefas…" linhas={4} /></>;
  const t = dados.totais;
  const grupos = gruposTarefas(dados.tarefas, dados.hoje);
  const atrasadas = dados.tarefas.filter((x) => !x.esperando && x.venceEm < dados.hoje).length;
  const esperando = dados.tarefas.filter((x) => x.esperando).length;
  const marcar = async (x: Tarefa, sim: boolean) => {
    setFalha(null);
    const e = await concluir(x, sim);
    if (e) {
      setFalha(e);
      return false;
    }
    setFeito({ titulo: "Tarefa concluída", texto: `${x.titulo} ficou no histórico do caso. Para reabrir, desmarque na ficha do caso.` });
    recarregar();
    return true;
  };
  const jaChegou = async (x: Tarefa) => {
    setFalha(null);
    const e = await chegou(x);
    if (e) return setFalha(e);
    setFeito({ titulo: "Não espera mais", texto: `${x.titulo} voltou para a lista pelo vencimento.` });
    recarregar();
  };
  return (
    <div className="hn">
      {cab}
      <div className="hn-grade">
        <section className="folha jr-lista" aria-labelledby="t-tf" style={{ overflow: "hidden" }}>
          <div className="folha-cab">
            <div>
              <h2 id="t-tf">{visao === "MINHAS" ? "Minhas tarefas" : "Tarefas da equipe"}</h2>
              <p className="sub" role="status">
                {contar(dados.tarefas.length, "aberta", "abertas")} · {contar(atrasadas, "atrasada", "atrasadas")} · {esperando} esperando alguém
              </p>
            </div>
          </div>
          <div className="hn-ferr jr-ferr">
            <Chips rotulo="Mostrar" atual={visao} aoEscolher={(v) => setVisao(v as VisaoTarefas)}
              opcoes={[{ v: "MINHAS", t: `Minhas (${t.minhas})` }, { v: "EQUIPE", t: `Da equipe (${t.equipe})` }]} />
            {visao === "EQUIPE" ? (
              <div className="campo">
                <label htmlFor="tf-f-resp">Responsável</label>
                <select className="entrada" id="tf-f-resp" value={resp} onChange={(e) => setResp(e.target.value)}>
                  <option value="">Todos</option>
                  {dados.responsaveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            ) : null}
          </div>
          {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="A tarefa não mudou.">{falha}</Aviso></div> : null}
          {grupos.length ? grupos.map((g) => (
            <div key={g.chave} className="jr-grupo">
              <h3 className="sobretitulo">{g.titulo} <span className="jr-n">{g.itens.length}</span></h3>
              <ul className="jr-tfs">
                {g.itens.map((x) => <LinhaTarefa key={x.id} t={x} hoje={dados.hoje} comQuem={visao === "EQUIPE"} aoMarcar={(s) => marcar(x, s)} aoChegou={() => void jaChegou(x)}
                  aoEditar={() => setEditar(x)} />)}
              </ul>
            </div>
          )) : (
            <Estado icone="check" titulo={visao === "MINHAS" ? "Nenhuma tarefa sua aberta" : "Nenhuma tarefa aberta"}
              acoes={<button className="btn btn-pri" type="button" onClick={() => setNova(true)}><Icone nome="mais" className="ico" />Criar uma tarefa</button>}>
              Cada tarefa tem um caso, quem faz e até quando. Ela aparece aqui e na ficha do caso.
            </Estado>
          )}
        </section>
        <aside className="hn-col" aria-label="Sobre as tarefas">
          {visao === "EQUIPE" && dados.carga ? <Carga carga={dados.carga} /> : (
            <section className="explica campo-ambar" aria-labelledby="t-tfx">
              <p className="sobretitulo">Tarefas</p>
              <h2 id="t-tfx">Cada uma com dono e data.</h2>
              <ul>
                <li><Icone nome="pessoas" className="ico" /><span>Toda tarefa tem responsável e vencimento. Quem sai da equipe passa as tarefas para outra pessoa.</span></li>
                <li><Icone nome="relogio" className="ico" /><span>“Esperando alguém” mostra o que trava: um documento do cliente ou uma resposta. A ficha do caso mostra o mesmo.</span></li>
                <li><Icone nome="check" className="ico" /><span>Marcar a caixa conclui a tarefa. Fica no histórico do caso, e dá para reabrir.</span></li>
              </ul>
            </section>
          )}
        </aside>
      </div>
      {janelas}
    </div>
  );
}

export function TarefasJuridicoPortal() {
  return <MolduraArea area="JURIDICO" secao="tarefas">{(e) => <TarefasConteudo escritorio={e} />}</MolduraArea>;
}

// ------------------------------------------------------------------------- Na ficha do caso

/** "Prazos e tarefas" na ficha (EX-02, EX-04): os abertos primeiro, os feitos nos últimos 30 dias depois. */
export function PrazosETarefas({ f, escritorio, aoNovoPrazo, aoNovaTarefa, aoMudou }: {
  f: FichaCaso; escritorio?: EscritorioPortal; aoNovoPrazo?: () => void; aoNovaTarefa?: () => void; aoMudou: (feito: Feito) => void;
}) {
  const [cumprir, setCumprir] = useState<Prazo | null>(null);
  const [editarPz, setEditarPz] = useState<Prazo | null>(null);
  const [editarTf, setEditarTf] = useState<Tarefa | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const abertos = f.prazos.filter((p) => !p.cumpridoEm).length;
  const tarefas = f.tarefas.filter((t) => !t.concluidaEm).length;
  const marcar = async (t: Tarefa, sim: boolean) => {
    setFalha(null);
    const e = await concluir(t, sim);
    if (e) {
      setFalha(e);
      return false;
    }
    aoMudou(sim ? { titulo: "Tarefa concluída", texto: `${t.titulo} ficou no histórico do caso.` } : { titulo: "Tarefa reaberta", texto: `${t.titulo} voltou para a lista.` });
    return true;
  };
  return (
    <section className="folha" aria-labelledby="t-pt" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-pt">Prazos e tarefas</h2>
          <p className="sub">{contar(abertos, "prazo aberto", "prazos abertos")} · {contar(tarefas, "tarefa aberta", "tarefas abertas")}, cada uma com responsável</p>
        </div>
      </div>
      {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso></div> : null}
      <div className="jr-sub">
        <h3 className="sobretitulo">Prazos</h3>
        {aoNovoPrazo ? <button className="btn btn-fantasma btn-compacto" type="button" onClick={aoNovoPrazo}><Icone nome="mais" className="ico" />Novo prazo</button> : null}
      </div>
      {f.prazos.length ? (
        <ul className="jr-fpz">
          {f.prazos.map((p) => {
            const u = urgenciaPrazo(p.dataFinal, f.hoje);
            return (
              <li key={p.id} className={p.cumpridoEm ? "feito" : undefined}>
                <div>
                  <p className="jr-tf-t">{p.cumpridoEm ? <s>{p.descricao}</s> : p.descricao}</p>
                  <small>
                    {p.cumpridoEm
                      ? `Cumprido em ${ddmm(diaBrasilia(p.cumpridoEm))}${p.cumpridoPor ? ` por ${p.cumpridoPor.nome}` : ""}`
                      : `Prazo final ${dataBr(p.dataFinal)}${p.fazerAte ? ` · ${textoFazerAte(p.fazerAte, f.hoje)}, ${ddmm(p.fazerAte)}` : ""} · ${p.responsavel.nome}`}
                  </small>
                </div>
                {p.cumpridoEm ? <Selo tom="ativo" icone="check">Cumprido</Selo> : (
                  <span className="jr-fpz-acao">
                    <SeloUrgencia u={u} />
                    {escritorio ? (
                      <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => setEditarPz(p)} aria-label={`Editar: ${p.descricao}`}>
                        <Icone nome="pena" className="ico" />
                        Editar
                      </button>
                    ) : null}
                    <button className="btn btn-sec btn-compacto" type="button" onClick={() => setCumprir(p)} aria-label={`Cumprido: ${p.descricao}`}>
                      <Icone nome="check" className="ico" />
                      Cumprido
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="jr-vazio">Nenhum prazo cadastrado neste caso.</p>}
      <div className="jr-sub">
        <h3 className="sobretitulo">Tarefas</h3>
        {aoNovaTarefa ? <button className="btn btn-fantasma btn-compacto" type="button" onClick={aoNovaTarefa}><Icone nome="mais" className="ico" />Nova tarefa</button> : null}
      </div>
      {f.tarefas.length ? (
        <ul className="jr-tfs jr-tfs-ficha">
          {f.tarefas.map((t) => <LinhaTarefa key={t.id} t={t} hoje={f.hoje} comCaso={false} comQuem={false} aoMarcar={(s) => marcar(t, s)}
            aoEditar={escritorio ? () => setEditarTf(t) : undefined} />)}
        </ul>
      ) : <p className="jr-vazio">Nenhuma tarefa neste caso.</p>}
      {cumprir ? <JanelaCumprido p={cumprir} aoFechar={() => setCumprir(null)}
        aoFeito={() => { const d = cumprir.descricao; setCumprir(null); aoMudou({ titulo: "Prazo cumprido", texto: `${d} ficou no histórico do caso.` }); }} /> : null}
      {editarPz && escritorio ? <JanelaPrazo editar={editarPz} escritorio={escritorio} aoFechar={() => setEditarPz(null)}
        aoFeito={(d) => { setEditarPz(null); aoMudou({ titulo: "Prazo salvo", texto: `${d}: a mudança ficou no histórico do caso.` }); }} /> : null}
      {editarTf && escritorio ? <JanelaTarefa editar={editarTf} escritorio={escritorio} aoFechar={() => setEditarTf(null)}
        aoFeito={(d) => { setEditarTf(null); aoMudou({ titulo: "Tarefa salva", texto: `${d}: a mudança ficou no histórico do caso.` }); }} /> : null}
    </section>
  );
}

/** "O que está travando" (PD-05): as tarefas abertas que esperam alguém, com o "já chegou". */
export function OQueTrava({ f, aoMudou, aoDocumentoChegou }: { f: FichaCaso; aoMudou: (feito: Feito) => void; aoDocumentoChegou: (d: DocumentoFaltando) => void }) {
  const [falha, setFalha] = useState<string | null>(null);
  const travadas = f.tarefas.filter((t) => t.esperando && !t.concluidaEm);
  if (!travadas.length && !f.faltam.length) return null;
  const jaChegou = async (t: Tarefa) => {
    setFalha(null);
    const e = await chegou(t);
    if (e) return setFalha(e);
    aoMudou({ titulo: "Não espera mais", texto: `${t.titulo} segue pelo vencimento.` });
  };
  return (
    <section className="folha" aria-labelledby="t-trava">
      <div className="folha-cab" style={{ paddingBottom: 8 }}><div><h2 id="t-trava" style={{ fontSize: 20 }}>O que está travando</h2></div></div>
      {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso></div> : null}
      <ul className="jr-trava">
        {travadas.map((t) => (
          <li key={t.id}>
            <Icone nome="relogio" className="ico ico-s" />
            <div>
              <p><b>{textoEsperando(t.esperando!, t.esperandoDesde, f.hoje)}.</b></p>
              <p>Trava: <b>{t.titulo}</b> ({t.responsavel.nome}).</p>
              <button className="jr-link" type="button" onClick={() => void jaChegou(t)} aria-label={`Já chegou: ${t.titulo}`}>Já chegou</button>
            </div>
          </li>
        ))}
        {f.faltam.map((d) => (
          <li key={d.id}>
            <Icone nome="doc" className="ico ico-s" />
            <div>
              <p><b>{textoEsperando(`${d.cliente.nome.split(/\s+/)[0]}: ${d.descricao}`, d.repedidoEm ?? d.pedidoEm, f.hoje)}.</b></p>
              <p>Documento pedido em {dataBr(d.pedidoEm)}.</p>
              <button className="jr-link" type="button" onClick={() => aoDocumentoChegou(d)} aria-label={`Já chegou: ${d.descricao}`}>Já chegou</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
