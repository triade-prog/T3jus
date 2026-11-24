"use client";
// Equipe do escritório (PA-02, PT-20, PT-21, EX-10), tela aprovada em
// docs/design/aprovadas/portal-v1/equipe.html: o sócio dono convida, libera áreas pessoa por
// pessoa, reenvia e cancela convites e retira quem sai, escolhendo para quem passa o que era
// da pessoa. Quem não é o dono vê "Esta página é do sócio dono". O servidor decide tudo.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AREAS_PORTAL, convidarEquipeSchema, type AreaPortal, type PessoaEquipePortal, type PessoaRetiradaPortal } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { hora, iniciais } from "../console/tempo.ts";
import { agruparEventosPorDia, fraseEquipe, listaAreas, primeiroNome, situacaoNaEquipe, type EventoEquipe } from "./equipe.ts";
import { VALIDADE_CONVITE_MS } from "../console/carteira.ts";
import { DESCRICAO_AREA } from "./areas.ts";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, soConsulta, useEscritorioPortal } from "./Moldura.tsx";
import { CamposOab, LinhaOab, NomeComFicha, PreviaOab } from "./EquipeOab.tsx";
import { conferirOab, errosDoServidor, mensagemOab, previaOab, resumoOab, type CampoOab, type ErrosOab, type RascunhoOab } from "./oab.ts";

const ORDEM = Object.keys(AREAS_PORTAL) as AreaPortal[];
const EQUIPE_API = "/v1/escritorio/equipe";
type Filtro = "TODAS" | "ATIVAS" | "CONVITES" | "RETIRADAS";

const diaBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const apagada = (p: PessoaRetiradaPortal) => !!p.saida?.entradaApagadaEm;

/** Aviso de sucesso que flutua no canto (no celular, acima da barra de baixo). */
export function Toast({ titulo, texto, aoFechar }: { titulo: string; texto: string; aoFechar: () => void }) {
  return (
    <div className="aviso aviso-sucesso toast" role="status">
      <Icone nome="check" className="ico" />
      <div>
        <strong className="aviso-titulo">{titulo}</strong>
        <p>{texto}</p>
      </div>
      <button className="fechar" type="button" aria-label="Fechar aviso" onClick={aoFechar}>
        <Icone nome="xis" className="ico" />
      </button>
    </div>
  );
}

const Comuns = () => (
  <p className="pt-comuns">
    <Icone nome="pessoas" className="ico" />
    <span>Todos veem Início, Conversas, Clientes e Agenda. Sem nenhuma área marcada, a pessoa fica só com essas partes.</span>
  </p>
);

function CaixasAreas({ legenda, marcadas, aoMudar }: { legenda: string; marcadas: AreaPortal[]; aoMudar: (a: AreaPortal[]) => void }) {
  return (
    <fieldset className="grupo-opcoes">
      <legend>{legenda}</legend>
      {ORDEM.map((a) => (
        <label key={a} className="opcao">
          <input className="marcar" type="checkbox" checked={marcadas.includes(a)}
            onChange={(e) => aoMudar(e.target.checked ? ORDEM.filter((x) => x === a || marcadas.includes(x)) : marcadas.filter((x) => x !== a))} />
          <span>
            {AREAS_PORTAL[a]}
            <small>{DESCRICAO_AREA[a]}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** A hora em que vence um convite enviado agora. */
function horaDeVencer(): string {
  return hora(new Date(new Date().getTime() + VALIDADE_CONVITE_MS).toISOString());
}

export type Feito = { titulo: string; texto: string; destaque?: string };

function JanelaConvidar({ aberta, escritorio, pessoas, deNovo, aoFechar, aoFeito }: {
  aberta: boolean;
  escritorio: string;
  pessoas: PessoaEquipePortal[];
  /** Convidar de novo quem foi retirado (F0.14): nome e e-mail já escritos, áreas em branco. */
  deNovo?: PessoaRetiradaPortal | null;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [nome, setNome] = useState(deNovo?.nome ?? "");
  const [email, setEmail] = useState(deNovo?.email ?? "");
  const [areas, setAreas] = useState<AreaPortal[]>([]);
  const primeiro = deNovo ? primeiroNome(deNovo.nome) : "";
  const [erros, setErros] = useState<{ nome?: string; email?: string }>({});
  // A OAB principal, opcional (decisão 6 da OAB).
  const [oab, setOab] = useState<RascunhoOab>({ uf: "", numero: "", letra: "" });
  const [errosOab, setErrosOab] = useState<ErrosOab>({});
  const [donoOab, setDonoOab] = useState<string | undefined>();
  const quemOab = nome.trim() || "a pessoa";
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const jaNaEquipe = (mail: string) => {
    const p = pessoas.find((x) => x.email?.toLowerCase() === mail);
    return p ? `${p.nome} já está na equipe com este e-mail. Para mudar o que abre, use Áreas na lista.` : "Esta pessoa já está na equipe. Para mudar o que abre, use Áreas na lista.";
  };

  async function enviar() {
    setErro(null);
    const v = convidarEquipeSchema.safeParse({ nome, email, areas });
    const novos: typeof erros = {};
    if (!v.success) {
      const campos = new Set(v.error.issues.map((i) => String(i.path[0])));
      if (campos.has("nome")) novos.nome = "Escreva o nome da pessoa.";
      if (campos.has("email")) {
        novos.email = deNovo && !deNovo.email && !email.trim()
          ? `Escreva o e-mail de ${primeiro}. O antigo foi apagado com a entrada.`
          : "Confira o e-mail: falta o @ ou o final do endereço, como .com ou .com.br.";
      }
    }
    if (v.success && pessoas.some((p) => p.email?.toLowerCase() === v.data.email)) novos.email = jaNaEquipe(v.data.email);
    const eOab = conferirOab(oab, true);
    setErros(novos);
    setErrosOab(eOab);
    setDonoOab(undefined);
    if (Object.keys(novos).length || Object.keys(eOab).length || !v.success) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const temOab = !!(oab.uf || oab.numero.trim() || oab.letra.trim());
    const r = await chamarPortal<{ vinculoId: string }>(EQUIPE_API, {
      corpo: { ...v.data, oab: temOab ? { uf: oab.uf, numero: oab.numero, letra: oab.letra.trim() || null } : null },
    });
    setEnviando(false);
    if (!r.ok) {
      const campos = r.erro.detalhes?.campos;
      const doServidor = errosDoServidor(r.erro.detalhes);
      if (doServidor && Object.keys(doServidor.erros).length) {
        setErrosOab(doServidor.erros);
        setDonoOab(doServidor.nome);
        return focarPrimeiroErro(corpo.current);
      }
      if (r.erro.detalhes?.motivo === "JA_NA_EQUIPE") setErros({ email: jaNaEquipe(v.data.email) });
      else if (Array.isArray(campos) && campos.includes("nome")) setErros({ nome: "Escreva o nome da pessoa." });
      else return setErro(r.erro);
      return focarPrimeiroErro(corpo.current);
    }
    const ate = horaDeVencer();
    aoFeito({
      titulo: `Convite enviado para ${v.data.nome}.`,
      texto: `Chega em ${v.data.email} e vale 1 hora, até ${ate}. ${primeiroNome(v.data.nome)} aparece como “Convite pendente” até criar a senha.`,
      destaque: r.dados.vinculoId,
    });
  }

  const prevOab = previaOab(oab);
  const msgOab = Object.fromEntries(Object.entries(errosOab).map(([c, cod]) => [c, mensagemOab(c as CampoOab, cod!, quemOab, { nome: donoOab, texto: prevOab?.replace(" nº", "") })]));
  const pontosOab = (Object.entries(errosOab) as [CampoOab, string][]).map(([c, cod]) => ({ id: `${ids}-oab-${c}`, texto: resumoOab(c, cod, { nome: donoOab }, "OAB") }));
  const n = Object.keys(erros).length + pontosOab.length;
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} sobretitulo={`Equipe · ${escritorio}`} descricao={`${ids}-d`}
      titulo={deNovo ? `Convidar ${deNovo.nome} de novo` : "Convidar pessoa"} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="envelope" className="ico" />
            {enviando ? "Enviando…" : "Enviar convite"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>
          {deNovo ? `${primeiro} volta só com as áreas que você marcar agora.` : "Mandamos um convite por e-mail. A pessoa cria a senha e entra no Portal com as áreas que você marcar."}
        </p>
        {deNovo?.saida?.entradaApagadaEm ? (
          <Aviso tom="info" titulo={`A entrada de ${primeiro} foi apagada em ${diaBr(deNovo.saida.entradaApagadaEm)}.`}>
            Por isso volta como pessoa nova: recebe o convite e cria a senha de novo. O que fez antes continua com o nome.
          </Aviso>
        ) : deNovo ? (
          <Aviso tom="info" titulo={`${primeiro} ainda tem a entrada.`}>Recebe o convite no mesmo e-mail e entra com a senha de sempre.</Aviso>
        ) : null}
        {n ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(n)}
            acoes={pontosOab.length ? <ul>{pontosOab.map((p) => <li key={p.id}><a href={`#${p.id}`}>{p.texto}</a></li>)}</ul> : undefined}>
            O convite ainda não foi enviado.
          </Aviso>
        ) : null}
        {erro ? <Aviso tom="urgencia" titulo="O convite não foi enviado.">{textoDoErro(erro)}</Aviso> : null}
        <div className="campo">
          <label htmlFor={`${ids}-nome`}>Nome completo</label>
          <input className="entrada" id={`${ids}-nome`} value={nome} autoComplete="off" data-foco={deNovo ? undefined : true} onChange={(e) => setNome(e.target.value)}
            aria-invalid={erros.nome ? true : undefined} aria-describedby={erros.nome ? `${ids}-nome-erro` : undefined} />
          {erros.nome ? <ErroCampo id={`${ids}-nome-erro`}>{erros.nome}</ErroCampo> : null}
        </div>
        <div className="campo">
          <label htmlFor={`${ids}-email`}>E-mail</label>
          <input className="entrada" id={`${ids}-email`} type="email" value={email} autoComplete="off" data-foco={deNovo ? true : undefined}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={erros.email ? true : undefined}
            aria-describedby={descritoPor(erros.email ? `${ids}-email-erro` : `${ids}-email-ajuda`)} />
          {erros.email ? (
            <ErroCampo id={`${ids}-email-erro`}>{erros.email}</ErroCampo>
          ) : (
            <p className="ajuda" id={`${ids}-email-ajuda`}>
              {deNovo && !deNovo.email ? "O e-mail antigo foi apagado. " : ""}O convite chega neste e-mail e vale 1 hora.
            </p>
          )}
        </div>
        <fieldset className="oe-grupo" aria-describedby={`${ids}-oab-aj`}>
          <legend>
            OAB <span className="opcional" style={{ fontWeight: 400 }}>(opcional)</span>
          </legend>
          <p className="ajuda" id={`${ids}-oab-aj`}>Só para quem é advogado. É a inscrição principal; a suplementar se põe depois, na ficha da pessoa.</p>
          <CamposOab pref={`${ids}-oab`} valor={oab} aoMudar={(v) => { setOab(v); setErrosOab({}); }} erros={errosOab} mensagens={msgOab} />
        </fieldset>
        {prevOab && !Object.keys(errosOab).length ? <PreviaOab texto={`${nome.trim() || "A pessoa"}, ${prevOab}`} /> : null}
        <CaixasAreas legenda="Áreas que a pessoa abre" marcadas={areas} aoMudar={setAreas} />
        <Comuns />
      </div>
    </Janela>
  );
}

export function JanelaAreas({ pessoa, escritorio, aoFechar, aoFeito }: {
  pessoa: PessoaEquipePortal | null;
  escritorio: string;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
}) {
  const ids = useId();
  const [areas, setAreas] = useState<AreaPortal[]>(pessoa?.areas ?? []);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primeiro = pessoa ? primeiroNome(pessoa.nome) : "";

  async function salvar() {
    if (!pessoa) return;
    setErro(null);
    setEnviando(true);
    const r = await chamarPortal<{ areas: AreaPortal[] }>(`${EQUIPE_API}/${pessoa.vinculoId}/areas`, { metodo: "PUT", corpo: { areas } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    aoFeito({
      titulo: `Áreas de ${pessoa.nome} salvas.`,
      texto: `${r.dados.areas.length ? `${primeiro} agora abre ${listaAreas(r.dados.areas)}.` : `${primeiro} agora fica só com as partes comuns.`} A mudança ficou no histórico da equipe.`,
      destaque: pessoa.vinculoId,
    });
  }

  return (
    <Janela id={`${ids}-j`} aberta={!!pessoa} aoFechar={aoFechar} sobretitulo={`Equipe · ${escritorio}`} descricao={`${ids}-d`}
      titulo={`Áreas de ${pessoa?.nome ?? ""}`} aoEnviar={() => void salvar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando} data-foco>
            <Icone nome="check" className="ico" />
            {enviando ? "Salvando…" : "Salvar áreas"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>A mudança vale na próxima página que {primeiro} abrir e fica no histórico da equipe, com seu nome e a hora.</p>
      {erro ? (
        <Aviso tom="urgencia" titulo="Não deu para salvar as áreas.">
          {textoDoErro(erro)} As áreas de {primeiro} continuam como estavam.
        </Aviso>
      ) : null}
      <CaixasAreas legenda={`Áreas que ${primeiro} abre`} marcadas={areas} aoMudar={setAreas} />
      <Comuns />
    </Janela>
  );
}

export function JanelaRetirar({ pessoa, pessoas, escritorio, aoFechar, aoFeito }: {
  pessoa: PessoaEquipePortal | null;
  pessoas: PessoaEquipePortal[];
  escritorio: string;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [para, setPara] = useState("");
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primeiro = pessoa ? primeiroNome(pessoa.nome) : "";
  // Só quem continua ativo na equipe recebe; o sócio dono está sempre na lista.
  const opcoes = pessoas.filter((p) => p.senhaCriadaEm && p.pessoaId !== pessoa?.pessoaId);
  const semDono = `Escolha para quem passa o que é de ${primeiro}. Nada pode ficar sem dono.`;

  async function retirar() {
    if (!pessoa) return;
    setErro(null);
    if (!para) {
      setErroCampo(semDono);
      return focarPrimeiroErro(corpo.current);
    }
    setErroCampo(null);
    setEnviando(true);
    const r = await chamarPortal<{ versao: number }>(`${EQUIPE_API}/${pessoa.vinculoId}/retirar`, { corpo: { versao: pessoa.versao, passarPara: para } });
    setEnviando(false);
    if (!r.ok) {
      const campos = r.erro.detalhes?.campos;
      if (Array.isArray(campos) && campos.includes("passarPara")) {
        setErroCampo(`Escolha alguém que continua na equipe. ${semDono}`);
        return focarPrimeiroErro(corpo.current);
      }
      return setErro(r.erro);
    }
    const recebeu = pessoas.find((p) => p.pessoaId === para)?.nome ?? "a pessoa escolhida";
    aoFeito({
      titulo: `${pessoa.nome} saiu da equipe.`,
      texto: `O que era de ${primeiro} passou para ${recebeu}. A autoria do que ${primeiro} registrou não mudou, e tudo ficou no histórico da equipe.`,
    });
  }

  return (
    <Janela id={`${ids}-j`} aberta={!!pessoa} aoFechar={aoFechar} alerta sobretitulo={`Equipe · ${escritorio}`} descricao={`${ids}-d`}
      titulo={`Retirar ${pessoa?.nome ?? ""} da equipe?`} aoEnviar={() => void retirar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-perigo" type="submit" disabled={enviando}>
            {enviando ? "Retirando…" : `Retirar ${primeiro}`}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>{primeiro} perde o acesso ao Portal na hora e sai da lista da equipe.</p>
        {erroCampo ? <Aviso tom="urgencia" titulo={faltaAcertar(1)}>{primeiro} continua na equipe.</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo={`Não deu para retirar ${primeiro}.`}>{textoDoErro(erro)} {primeiro} continua na equipe.</Aviso> : null}
        <div className="campo">
          <label htmlFor={`${ids}-passa`}>Passar o que é de {primeiro} para</label>
          <select className="entrada" id={`${ids}-passa`} required value={para} data-foco onChange={(e) => setPara(e.target.value)}
            aria-invalid={erroCampo ? true : undefined} aria-describedby={descritoPor(`${ids}-passa-ajuda`, erroCampo && `${ids}-passa-erro`)}>
            <option value="">Escolha uma pessoa</option>
            {opcoes.map((p) => (
              <option key={p.pessoaId} value={p.pessoaId}>
                {p.nome}
                {p.dono ? " (sócio dono)" : ""}
              </option>
            ))}
          </select>
          <p className="ajuda" id={`${ids}-passa-ajuda`}>
            Passam as tarefas, prazos, cobranças e atendimentos de que {primeiro} é responsável. Só aparecem pessoas ativas na equipe.
          </p>
          {erroCampo ? <ErroCampo id={`${ids}-passa-erro`}>{erroCampo}</ErroCampo> : null}
        </div>
        <p className="pt-comuns">
          <Icone nome="historico" className="ico" />
          <span>A autoria não muda: o que {primeiro} registrou continua com o nome de quem registrou. Para trazer {primeiro} de volta, convide de novo.</span>
        </p>
      </div>
    </Janela>
  );
}

function JanelaCancelar({ pessoa, escritorio, aoFechar, aoFeito }: {
  pessoa: PessoaEquipePortal | null;
  escritorio: string;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
}) {
  const ids = useId();
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primeiro = pessoa ? primeiroNome(pessoa.nome) : "";

  async function cancelar() {
    if (!pessoa) return;
    setEnviando(true);
    const r = await chamarPortal(`${EQUIPE_API}/${pessoa.vinculoId}/retirar`, { corpo: { versao: pessoa.versao, passarPara: null } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    aoFeito({ titulo: `Convite de ${pessoa.nome} cancelado.`, texto: "O link deixou de valer. Se precisar, convide de novo." });
  }

  return (
    <Janela id={`${ids}-j`} aberta={!!pessoa} aoFechar={aoFechar} alerta sobretitulo={`Equipe · ${escritorio}`} descricao={`${ids}-d`}
      titulo={`Cancelar o convite de ${pessoa?.nome ?? ""}?`} aoEnviar={() => void cancelar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" data-foco onClick={aoFechar}>
            Voltar
          </button>
          <button className="btn btn-perigo" type="submit" disabled={enviando}>
            {enviando ? "Cancelando…" : "Cancelar o convite"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>O link do convite deixa de valer na hora e {primeiro} sai da lista.</p>
      {erro ? <Aviso tom="urgencia" titulo="O convite não foi cancelado.">{textoDoErro(erro)}</Aviso> : null}
      <p className="pt-comuns">
        <Icone nome="historico" className="ico" />
        <span>{primeiro} nunca entrou no Portal, então nada precisa passar para outra pessoa. O cancelamento fica no histórico da equipe.</span>
      </p>
    </Janela>
  );
}

function AreasDaPessoa({ p }: { p: PessoaEquipePortal }) {
  if (p.dono) return <span className="selo selo-ativo">Vê tudo</span>;
  if (!p.areas.length) return <span className="pt-comum">Só as partes comuns</span>;
  return (
    <div className="pt-areas">
      {ORDEM.filter((a) => p.areas.includes(a)).map((a) => (
        <span key={a} className="selo selo-neutro">
          {AREAS_PORTAL[a]}
        </span>
      ))}
    </div>
  );
}

function Situacao({ p, agora }: { p: PessoaEquipePortal; agora: Date }) {
  const s = situacaoNaEquipe(p, agora);
  if (s.tipo === "ativa") {
    return (
      <span className="selo selo-ok">
        <Icone nome="check" className="ico" />
        Ativa
      </span>
    );
  }
  return (
    <div className="pt-sit">
      <span className={s.tipo === "pendente" ? "selo selo-atencao" : "selo selo-urgente"}>
        <Icone nome={s.tipo === "pendente" ? "relogio" : "alerta"} className="ico" />
        {s.tipo === "pendente" ? "Convite pendente" : "Convite vencido"}
      </span>
      <small>{s.tipo === "pendente" ? s.vence : s.venceu}</small>
    </div>
  );
}

/** Quem foi retirado (F0.14): a data em que saiu e o que acontece com a entrada. */
function Retiradas({ lista, consulta, aoConvidar }: { lista: PessoaRetiradaPortal[]; consulta: boolean; aoConvidar: (p: PessoaRetiradaPortal) => void }) {
  const selo = (p: PessoaRetiradaPortal) =>
    apagada(p) ? (
      <span className="selo selo-apagada">
        <Icone nome="lixeira" className="ico" />
        Entrada apagada
      </span>
    ) : (
      <span className="selo selo-neutro">Retirado</span>
    );
  const saida = (p: PessoaRetiradaPortal, celular: boolean) =>
    p.saida?.entradaApagadaEm ? (
      <>{`${celular ? "Retirado" : "retirado"} em ${diaBr(p.retiradaEm)} · ${celular ? "entrada apagada" : "apagada"} em ${diaBr(p.saida.entradaApagadaEm)}`}</>
    ) : p.saida?.entradaApagaEm ? (
      <>
        {`${celular ? "Retirado em" : "em"} ${diaBr(p.retiradaEm)} · e-mail e senha apagados em `}
        <b>{diaBr(p.saida.entradaApagaEm)}</b>, se não voltar a nenhum escritório
      </>
    ) : (
      <>{`${celular ? "Retirado em" : "em"} ${diaBr(p.retiradaEm)} · ainda tem acesso a outro escritório no T3jus`}</>
    );
  const botao = (p: PessoaRetiradaPortal, compacto: boolean) =>
    consulta ? null : (
      <button className={`btn btn-sec${compacto ? " btn-compacto" : ""}`} type="button" aria-label={`Convidar de novo: ${p.nome}`} onClick={() => aoConvidar(p)}>
        <Icone nome="envelope" className="ico ico-s" />
        Convidar de novo
      </button>
    );
  const email = (p: PessoaRetiradaPortal) => (p.email ? p.email : <i className="fc-email-apagado">e-mail apagado</i>);
  return (
    <>
      <table className="so-pc pt-tabela" data-prio-tabela="equipe-retiradas" data-sai2="680" data-cartoes="600">
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Pessoa</th>
            <th scope="col">Áreas que tinha</th>
            <th scope="col">Situação</th>
            <th scope="col">
              <span className="sr">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.vinculoId} className="linha-off">
              <td>
                <div className="esc">
                  <span className="av-p apagado" aria-hidden="true">
                    {iniciais(p.nome)}
                  </span>
                  <div>
                    <strong style={{ fontWeight: 500 }}>{p.nome}</strong>
                    <small style={{ display: "block", fontSize: 12, color: "var(--texto-2)", overflowWrap: "anywhere" }}>{email(p)}</small>
                  </div>
                </div>
              </td>
              <td>
                <div className="pt-areas">
                  {p.areas.length ? p.areas.map((a) => <span key={a} className="selo selo-neutro">{AREAS_PORTAL[a]}</span>) : <span className="fc-saida">Só as partes comuns</span>}
                </div>
              </td>
              <td>
                <div className="pt-sit">
                  {selo(p)}
                  <span className="fc-saida">{saida(p, false)}</span>
                </div>
              </td>
              <td>
                <div className="acoes-tab">{botao(p, true)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="cartoes so-cel" aria-label="Pessoas retiradas">
        {lista.map((p) => (
          <li key={p.vinculoId} className="cartao">
            <div className="c-topo">
              <span className="av-p apagado" aria-hidden="true">
                {iniciais(p.nome)}
              </span>
              <div>
                <strong className="c-nome" style={{ fontSize: 18 }}>
                  {p.nome}
                </strong>
                <small>{email(p)}</small>
                <span className="fc-saida">{saida(p, true)}</span>
              </div>
            </div>
            <div className="c-selos">
              {selo(p)}
              <div className="pt-areas">
                {p.areas.map((a) => (
                  <span key={a} className="selo selo-neutro">
                    {AREAS_PORTAL[a]}
                  </span>
                ))}
              </div>
            </div>
            {consulta ? null : <div className="c-acoes">{botao(p, false)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}

function AreasDef() {
  return (
    <section className="folha" aria-labelledby="t-def">
      <div className="folha-cab" style={{ paddingBottom: 6 }}>
        <div>
          <h2 id="t-def" style={{ fontSize: 20 }}>
            O que cada área abre
          </h2>
          <p className="sub">Início, Conversas, Clientes e Agenda todos veem. Equipe e a exportação dos dados ficam só com o sócio dono.</p>
        </div>
      </div>
      <dl className="funcoes-def pt-areas-def">
        {ORDEM.map((a) => (
          <div key={a}>
            <dt>{AREAS_PORTAL[a]}</dt>
            <dd>{DESCRICAO_AREA[a]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const POR_PAGINA = 50;

function HistoricoEquipe() {
  const ids = useId();
  const [eventos, setEventos] = useState<EventoEquipe[] | null>(null);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const buscar = useCallback(async (antes?: number) => {
    setErro(false);
    setCarregando(true);
    const r = await chamarPortal<{ eventos: EventoEquipe[] }>(`${EQUIPE_API}/historico?limite=${POR_PAGINA}${antes ? `&antes=${antes}` : ""}`);
    setCarregando(false);
    if (!r.ok) {
      if (r.status !== 401) setErro(true);
      return;
    }
    setEventos((l) => (antes ? [...(l ?? []), ...r.dados.eventos] : r.dados.eventos));
    setFim(r.dados.eventos.length < POR_PAGINA);
  }, []);

  useEffect(() => {
    // Depois da montagem: a busca começa fora do efeito.
    void Promise.resolve().then(() => buscar());
  }, [buscar]);

  if (erro && eventos === null) return <ErroAoCarregar oque="o histórico da equipe" aoTentar={() => void buscar()} />;
  if (eventos === null) return <Carregando rotulo="Carregando o histórico da equipe…" linhas={4} />;
  return (
    <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>Histórico da equipe</h2>
          <p className="sub">Quem entrou, saiu ou mudou de área, e cada exportação dos dados. Nada aqui é apagado.</p>
        </div>
      </div>
      {eventos.length === 0 ? (
        <Estado icone="historico" titulo="Nada registrado ainda">
          Cada convite, mudança de área, saída da equipe e exportação dos dados aparece aqui, com quem fez e quando.
        </Estado>
      ) : (
        <>
          {agruparEventosPorDia(eventos).map((g) => (
            <div key={g.dia} className="eventos-dia">
              <h3>{g.dia}</h3>
              <ol className="eventos">
                {g.eventos.map((e) => {
                  const f = fraseEquipe(e);
                  return (
                    <li key={e.id}>
                      <time dateTime={e.ocorridoEm}>{hora(e.ocorridoEm)}</time>
                      <span className={f.exportacao ? "pto forte" : "pto"} aria-hidden="true" />
                      <div>
                        <p>
                          {f.quem ? <b>{f.quem}</b> : "O sistema"}{" "}
                          {f.fez.map((x, i) => (x.b ? <b key={i}>{x.t}</b> : <span key={i}>{x.t}</span>))}
                          {f.exportacao ? <span className="selo pt-selo-exp">Exportação</span> : null}
                        </p>
                        {f.detalhe ? <small>{f.detalhe}</small> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <div className="mais">
            <span aria-live="polite">
              {fim ? `Mostrando ${eventos.length === 1 ? "o único evento" : `todos os ${eventos.length} eventos`}` : `Mostrando os ${eventos.length} mais recentes`}
            </span>
            {erro ? <span role="alert">Não deu para carregar os mais antigos. Tente de novo.</span> : null}
            {!fim ? (
              <button className="btn btn-sec" type="button" disabled={carregando} onClick={() => void buscar(eventos.at(-1)?.id)}>
                <Icone nome="historico" className="ico" />
                {carregando ? "Carregando…" : "Carregar mais antigos"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

export function EquipePortal({ aba }: { aba: "pessoas" | "historico" }) {
  const { escritorio, erro: erroEscritorio, recarregar } = useEscritorioPortal();
  const ids = useId();
  const [pessoas, setPessoas] = useState<PessoaEquipePortal[] | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [convidar, setConvidar] = useState(false);
  const [deNovo, setDeNovo] = useState<PessoaRetiradaPortal | null>(null);
  const [retiradas, setRetiradas] = useState<PessoaRetiradaPortal[] | null>(null);
  const [areasDe, setAreasDe] = useState<PessoaEquipePortal | null>(null);
  const [retirar, setRetirar] = useState<PessoaEquipePortal | null>(null);
  const [cancelar, setCancelar] = useState<PessoaEquipePortal | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [erroReenvio, setErroReenvio] = useState<{ nome: string; erro: ErroApi } | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  // Cada abertura de janela ganha uma chave nova: o formulário começa limpo.
  const [abertura, setAbertura] = useState(0);
  const abrir = (f: () => void) => {
    setFeito(null);
    setErroReenvio(null);
    setAbertura((n) => n + 1);
    f();
  };

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarPortal<{ pessoas: PessoaEquipePortal[] }>(EQUIPE_API);
    setAgora(new Date());
    if (r.ok) setPessoas(r.dados.pessoas);
    else if (r.status !== 401 && r.erro.codigo !== "ESCRITORIO_REQUIRED") setErro(r.erro);
    // Quem saiu (F0.14): só para o filtro "Retiradas"; se falhar, o filtro fica de fora.
    const q = await chamarPortal<{ pessoas: PessoaRetiradaPortal[] }>(`${EQUIPE_API}/retiradas`);
    setRetiradas(q.ok ? q.dados.pessoas : null);
  }, []);

  const dono = escritorio?.dono;
  useEffect(() => {
    // Só o dono busca a equipe; depois da montagem, a busca começa fora do efeito.
    if (dono && aba === "pessoas") void Promise.resolve().then(() => carregar());
  }, [dono, aba, carregar]);

  const lista = useMemo(() => pessoas ?? [], [pessoas]);
  const ativas = lista.filter((p) => p.senhaCriadaEm).length;
  const visiveis = lista.filter((p) => filtro === "TODAS" || (filtro === "ATIVAS" ? !!p.senhaCriadaEm : !p.senhaCriadaEm));
  const nomeEsc = escritorio?.nome ?? "";

  async function concluir(f: Feito) {
    setConvidar(false);
    setDeNovo(null);
    setAreasDe(null);
    setRetirar(null);
    setCancelar(null);
    setFeito(f);
    await carregar();
    recarregar();
  }

  async function reenviar(p: PessoaEquipePortal) {
    setFeito(null);
    setErroReenvio(null);
    setReenviando(p.vinculoId);
    const r = await chamarPortal(`${EQUIPE_API}/${p.vinculoId}/reenviar`, { corpo: {} });
    setReenviando(null);
    if (!r.ok) return setErroReenvio({ nome: p.nome, erro: r.erro });
    const ate = horaDeVencer();
    await concluir({ titulo: `Convite reenviado para ${p.nome}.`, texto: `O link antigo deixou de valer. O novo vale 1 hora, até ${ate}.`, destaque: p.vinculoId });
  }

  const consulta = soConsulta(escritorio);
  const verRetiradas = filtro === "RETIRADAS" && !!retiradas;
  const acoes = (p: PessoaEquipePortal, compacto: boolean): ReactNode => {
    const c = compacto ? " btn-compacto" : "";
    if (p.dono) return <span className="pt-dono">Sócio dono: não sai da equipe</span>;
    if (consulta) {
      return (
        <span className="fc-leitura">
          <Icone nome="cadeado" className="ico" />
          Só consulta
        </span>
      );
    }
    const ativa = !!p.senhaCriadaEm;
    return (
      <>
        {!ativa ? (
          <button className={`btn btn-sec${c}`} type="button" aria-label={`Reenviar convite para ${p.nome}`} disabled={reenviando === p.vinculoId}
            onClick={() => void reenviar(p)}>
            <Icone nome="reenviar" className="ico ico-s" />
            {reenviando === p.vinculoId ? "Reenviando…" : "Reenviar"}
          </button>
        ) : null}
        <button className={`btn btn-sec${c}`} type="button" aria-label={`Mudar áreas de ${p.nome}`} onClick={() => abrir(() => setAreasDe(p))}>
          <Icone nome="funcoes" className="ico ico-s" />
          Áreas
        </button>
        {ativa ? (
          <button className={`btn btn-perigo${c}`} type="button" aria-label={`Retirar ${p.nome} da equipe`} onClick={() => abrir(() => setRetirar(p))}>
            Retirar
          </button>
        ) : (
          <button className={`btn btn-perigo${c}`} type="button" aria-label={`Cancelar convite de ${p.nome}`} onClick={() => abrir(() => setCancelar(p))}>
            Cancelar convite
          </button>
        )}
      </>
    );
  };

  const trilha = [{ nome: "Escritório", href: ROTAS_PORTAL.escritorio }, { nome: "Equipe" }];

  if (erroEscritorio) {
    return (
      <MolduraPortal atual="equipe" trilha={trilha} escritorio={null}>
        <ErroAoCarregar oque="a equipe" aoTentar={recarregar} />
      </MolduraPortal>
    );
  }
  if (!escritorio) {
    return (
      <MolduraPortal atual="equipe" trilha={trilha} escritorio={null} pagina="co-equipe co-carteira">
        <Carregando rotulo="Carregando a equipe…" linhas={5} />
      </MolduraPortal>
    );
  }
  if (!escritorio.dono) {
    const quemCuida = escritorio.socios[0];
    return (
      <MolduraPortal atual={null} trilha={[{ nome: "Equipe" }]} escritorio={escritorio}>
        <Estado icone="cadeado" titulo="Esta página é do sócio dono" nivel={1} moldura
          acoes={
            <a className="btn btn-pri" href={ROTAS_PORTAL.inicio}>
              <Icone nome="inicio" className="ico" />
              Ir para o Início
            </a>
          }>
          {quemCuida
            ? `Quem convida pessoas e muda as áreas é ${quemCuida}. Se você precisa de uma mudança na equipe ou de outra área, fale com ${primeiroNome(quemCuida)}.`
            : "Quem convida pessoas e muda as áreas é o sócio dono. Se você precisa de uma mudança na equipe ou de outra área, fale com ele."}
        </Estado>
      </MolduraPortal>
    );
  }

  const destaque = feito?.destaque;
  return (
    <MolduraPortal atual="equipe" trilha={trilha} escritorio={escritorio} pagina="co-equipe co-carteira">
      <div>
        <div className="cabeca-ambar campo-ambar cabeca-equipe">
          <div>
            <p className="sobretitulo">Escritório</p>
            <h1>Equipe</h1>
            <span className="fio" aria-hidden="true" />
            <p className="lede">Quem trabalha no Portal da {nomeEsc} e quais áreas cada pessoa abre. Só você, como sócio dono, vê esta página.</p>
          </div>
          <button className="btn btn-escuro" type="button" data-muda style={{ marginBottom: 6 }} onClick={() => abrir(() => setConvidar(true))}>
            <Icone nome="pessoaMais" className="ico" />
            Convidar pessoa
          </button>
        </div>
        <nav className="abas" aria-label="Seções da equipe">
          <a href={ROTAS_PORTAL.equipe} aria-current={aba === "pessoas" ? "page" : undefined}>
            Pessoas<span className="q">{pessoas ? pessoas.length : escritorio.pessoas}</span>
          </a>
          <a href={`${ROTAS_PORTAL.equipe}?aba=historico`} aria-current={aba === "historico" ? "page" : undefined}>
            Histórico da equipe
          </a>
        </nav>
      </div>

      {erroReenvio ? (
        <Aviso tom="urgencia" titulo={`O convite de ${erroReenvio.nome} não foi reenviado.`}>
          {textoDoErro(erroReenvio.erro)}
        </Aviso>
      ) : null}

      <div className="grade">
        <div className="col">
          {aba === "historico" ? (
            <HistoricoEquipe />
          ) : erro ? (
            <ErroAoCarregar oque="a equipe" aoTentar={() => void carregar()}
              texto="O servidor não respondeu. Ninguém foi tirado nem mudou de área. Tente de novo em instantes." />
          ) : pessoas === null ? (
            <Carregando rotulo="Carregando a equipe…" linhas={6} />
          ) : (
            <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
              <h2 id={`${ids}-t`} className="sr">
                Pessoas da equipe
              </h2>
              {pessoas.length > 1 || retiradas?.length ? (
                <>
                  <div className="ferramentas">
                    <div className="chips" role="group" aria-label="Mostrar" style={{ marginLeft: 0 }}>
                      {([["TODAS", `Todas (${pessoas.length})`], ["ATIVAS", `Ativas (${ativas})`], ["CONVITES", `Convites (${pessoas.length - ativas})`],
                        ...(retiradas?.length ? [["RETIRADAS", `Retiradas (${retiradas.length})`]] : [])] as [Filtro, string][]).map(([k, t]) => (
                        <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {verRetiradas ? (
                    <Retiradas lista={retiradas!} consulta={consulta} aoConvidar={(p) => abrir(() => { setDeNovo(p); setConvidar(true); })} />
                  ) : (
                    <>
                      <table className="so-pc pt-tabela" data-prio-tabela="equipe" data-sai2="720" data-cartoes="600">
                        <colgroup>
                          <col style={{ width: "28%" }} />
                          <col style={{ width: "25%" }} />
                          <col style={{ width: "19%" }} />
                          <col style={{ width: "28%" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th scope="col">Pessoa e OAB</th>
                            <th scope="col">Áreas liberadas</th>
                            <th scope="col">Situação</th>
                            <th scope="col">
                              <span className="sr">Ações</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visiveis.map((p) => (
                            <tr key={p.vinculoId} className={p.vinculoId === destaque ? "pt-nova" : undefined}>
                              <td>
                                <div className="esc">
                                  <span className={p.senhaCriadaEm ? "av-p forte" : "av-p apagado"} aria-hidden="true">
                                    {iniciais(p.nome)}
                                  </span>
                                  <div>
                                    <NomeComFicha p={p} />
                                    {p.dono ? <span className="voce">você</span> : null}
                                    <small style={{ display: "block", fontSize: 12, color: "var(--texto-2)", overflowWrap: "anywhere" }}>
                                      {p.email ?? "E-mail não encontrado"}
                                    </small>
                                    <LinhaOab oab={p.oab ?? []} />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <AreasDaPessoa p={p} />
                              </td>
                              <td>
                                <Situacao p={p} agora={agora} />
                              </td>
                              <td>
                                <div className="acoes-tab">{acoes(p, true)}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <ul className="cartoes so-cel" aria-label="Pessoas da equipe">
                        {visiveis.map((p) => (
                          <li key={p.vinculoId} className="cartao">
                            <div className="c-topo">
                              <span className={p.senhaCriadaEm ? "av-p forte" : "av-p apagado"} aria-hidden="true">
                                {iniciais(p.nome)}
                              </span>
                              <div>
                                <strong className="c-nome" style={{ fontSize: 18 }}>
                                  <NomeComFicha p={p} />
                                </strong>
                                {p.dono ? <span className="voce">você</span> : null}
                                <small style={{ overflowWrap: "anywhere" }}>{p.email ?? "E-mail não encontrado"}</small>
                                <LinhaOab oab={p.oab ?? []} />
                              </div>
                            </div>
                            <div className="c-selos">
                              {p.senhaCriadaEm ? null : <Situacao p={p} agora={agora} />}
                              <AreasDaPessoa p={p} />
                            </div>
                            <div className="c-acoes">{acoes(p, false)}</div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {consulta && escritorio.encerramento ? (
                    <p className="fc-regra">
                      <Icone nome="cadeado" className="ico" />
                      <span>
                        {`O contrato terminou em ${diaBr(escritorio.encerramento.fimEm)}. Até ${diaBr(escritorio.encerramento.consultaAte).slice(0, 5)}, a equipe só consulta: não dá para convidar, retirar nem mudar áreas. Convites pendentes deixaram de valer.`}
                      </span>
                    </p>
                  ) : verRetiradas ? (
                    <p className="fc-regra">
                      <Icone nome="relogio" className="ico" />
                      <span>
                        Quem sai da equipe perde o acesso na hora. Se ficar <b>90 dias sem acesso a nenhum escritório</b> no T3jus, o e-mail e a senha são apagados; o
                        nome continua em tudo o que a pessoa fez aqui. Para trazer alguém de volta, convide de novo.
                      </span>
                    </p>
                  ) : (
                    <>
                      <p className="pt-pe-folha">
                        <Icone nome="balanca" className="ico" />
                        <span>A OAB é opcional: só quem é advogado precisa dela. Abra o nome da pessoa para cadastrar. É dela que saem o nome e a OAB/UF nos contratos e procurações.</span>
                      </p>
                      <p className="pt-pe-folha" style={{ borderTop: 0, paddingTop: 0 }}>
                        <Icone nome="relogio" className="ico" />
                        <span>O convite vale 1 hora. Depois disso, use Reenviar: o link antigo deixa de valer e o novo vale mais 1 hora.</span>
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <ul className="lista">
                    {pessoas.map((p) => (
                      <li key={p.vinculoId}>
                        <div className="pessoa">
                          <span className="av-p forte" aria-hidden="true">
                            {iniciais(p.nome)}
                          </span>
                          <div className="quem-e">
                            <strong>
                              <NomeComFicha p={p} />
                              <span className="voce">você</span>
                            </strong>
                            <LinhaOab oab={p.oab ?? []} />
                            <small>{p.email ?? ""} · sócio dono</small>
                          </div>
                          <span className="selo selo-ativo">Vê tudo</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Estado icone="pessoaMais" titulo="Por enquanto, só você"
                    acoes={
                      <button className="btn btn-pri" type="button" data-muda onClick={() => abrir(() => setConvidar(true))}>
                        <Icone nome="pessoaMais" className="ico" />
                        Convidar pessoa
                      </button>
                    }>
                    Convide quem trabalha com você e marque, pessoa por pessoa, as áreas que cada uma abre. O convite chega por e-mail e vale 1 hora.
                  </Estado>
                </>
              )}
            </section>
          )}
        </div>
        <aside className="col" aria-label="Áreas">
          <AreasDef />
        </aside>
      </div>

      {feito ? <Toast titulo={feito.titulo} texto={feito.texto} aoFechar={() => setFeito(null)} /> : null}

      <JanelaConvidar key={`c-${abertura}`} aberta={convidar} escritorio={nomeEsc} pessoas={lista} deNovo={deNovo} aoFechar={() => setConvidar(false)}
        aoFeito={(f) => void concluir(f)} />
      <JanelaAreas key={`a-${abertura}`} pessoa={areasDe} escritorio={nomeEsc} aoFechar={() => setAreasDe(null)} aoFeito={(f) => void concluir(f)} />
      <JanelaRetirar key={`r-${abertura}`} pessoa={retirar} pessoas={lista} escritorio={nomeEsc} aoFechar={() => setRetirar(null)}
        aoFeito={(f) => void concluir(f)} />
      <JanelaCancelar key={`x-${abertura}`} pessoa={cancelar} escritorio={nomeEsc} aoFechar={() => setCancelar(null)} aoFeito={(f) => void concluir(f)} />
    </MolduraPortal>
  );
}
