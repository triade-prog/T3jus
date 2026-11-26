"use client";
// Suporte de acesso (F1.3, PT-23), tela aprovada em docs/design/aprovadas/console-suporte:
// buscar a pessoa (só nos escritórios atendidos, PT-24), ver a situação da conta e agir com
// motivo: link de nova senha, desconectar, tirar o autenticador e reenviar o convite. A
// equipe nunca vê nem escolhe a senha, e o e-mail nunca muda por aqui. O servidor decide.

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { diaBrasilia, mascararEmail, type EventoSuporte, type FichaAcesso, type PessoaSuporte } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { CARTEIRA, chamarConsole, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso, Carregando, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import {
  agruparPorDiaSuporte,
  conviteValeAte,
  enderecoPessoa,
  fraseSuporte,
  marcarTermo,
  PAPEIS,
  situacaoAcesso,
  SUPORTE,
  telefoneParaConferir,
  type SituacaoAcesso,
} from "./suporte.ts";
import { dataHora, dataLonga, haQuanto, hora, iniciais } from "./tempo.ts";

const primeiroNome = (nome: string) => nome.split(/\s+/)[0] ?? nome;

/** E-mail mascarado, com leitura clara para leitor de tela (desenho aprovado). */
function EmailMascarado({ email }: { email: string | null }) {
  if (!email) return <>o e-mail cadastrado</>;
  const m = mascararEmail(email);
  const [ini, dom] = [m.slice(0, m.indexOf("*")), email.slice(email.lastIndexOf("@"))];
  return (
    <>
      <span aria-hidden="true">{m}</span>
      <span className="sr">
        e-mail que começa com “{ini}” e termina em {dom}
      </span>
    </>
  );
}

/** "2026-11-18" ou um instante (o dia de Brasília, F3.175) vira "18/11/2026"; com `curta`, "18/11". */
function diaBr(iso: string, curta = false): string {
  const [a, m, d] = diaBrasilia(iso).split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
}

/**
 * Quem saiu de todos os escritórios (F0.14): sem acesso, com a data em que a entrada some, ou
 * com a entrada já apagada. Nada a fazer pela conta; para voltar, só convite do sócio dono.
 */
function FichaSemAcesso({ f, voltar, textoVoltar, eventos }: {
  f: FichaAcesso; voltar: string; textoVoltar: string; eventos: EventoSuporte[] | null;
}) {
  const s = f.saida!;
  const nome = primeiroNome(f.nome);
  const ultimo = [...f.escritorios].sort((a, b) => (b.retiradoEm ?? "").localeCompare(a.retiradoEm ?? ""))[0];
  const ate = ultimo?.retiradoEm ?? s.semAcessoDesde ?? null;
  const onde = f.escritorios.map((e) => e.nome).join(" e ");
  const apagadaEm = s.entradaApagadaEm ?? null;
  const apagaEm = s.entradaApagaEm ?? null;
  const agora = new Date();
  const faltam = apagaEm ? Math.max(0, Math.round((Date.parse(`${apagaEm}T12:00:00Z`) - agora.getTime()) / 86_400_000)) : null;
  const celula = (dt: string, dd: ReactNode, small?: string | null, classe?: string) => (
    <div className={classe}>
      <dt>{dt}</dt>
      <dd>
        {dd}
        {small ? <small>{small}</small> : null}
      </dd>
    </div>
  );
  return (
    <>
      <div className="cabeca-ambar campo-ambar cabeca-equipe sa-cab-pessoa">
        <div>
          <a className="sa-voltar" href={voltar}>
            <Icone nome="esquerda" className="ico ico-s" />
            {textoVoltar}
          </a>
          <p className="sobretitulo">Suporte de acesso</p>
          <h1>{f.nome}</h1>
          <span className="fio" aria-hidden="true" />
          <p className="lede">
            {`Foi da equipe da ${onde}${ate ? ` até ${diaBr(ate)}` : ""}. `}
            {apagadaEm ? `A entrada foi apagada em ${diaBr(apagadaEm)}.` : "Não tem acesso a nenhum escritório agora."}
          </p>
        </div>
        <div className="sa-selos">
          {apagadaEm ? (
            <span className="selo selo-apagada">
              <Icone nome="lixeira" className="ico" />
              Entrada apagada
            </span>
          ) : apagaEm ? (
            <span className="selo selo-atencao">
              <Icone nome="relogio" className="ico" />
              Entrada apagada em {diaBr(apagaEm)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="sa-grade">
        <div className="sa-col">
          <section className="folha" aria-labelledby="t-situ" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-situ">Situação da conta</h2>
                <p className="sub">Só leitura.</p>
              </div>
            </div>
            {apagadaEm ? (
              <dl className="sa-situ">
                {celula("E-mail cadastrado", <span className="sa-email fc-email-apagado">apagado em {diaBr(apagadaEm)}</span>,
                  `junto com a senha, 90 dias depois de ${nome} perder o último acesso`, "sa-inteira")}
                {celula("Acesso", (
                  <span className="selo selo-apagada">
                    <Icone nome="lixeira" className="ico" />
                    Entrada apagada
                  </span>
                ), `em ${diaBr(apagadaEm)}`)}
                {celula("Último acesso", ate ? diaBr(ate) : "Não registrado", ultimo ? `retirado da ${ultimo.nome}` : null)}
                {celula("O que fica", "Só o nome", "como autor no histórico")}
              </dl>
            ) : (
              <>
                <dl className="sa-situ">
                  {celula("E-mail cadastrado", <span className="sa-email">{f.email ?? "Não encontrado"}</span>,
                    apagaEm ? `apagado em ${diaBr(apagaEm)}, com a senha, se ${nome} não voltar a ter acesso` : null, "sa-inteira")}
                  {celula("Acesso", (
                    <span className="selo selo-atencao">
                      <Icone nome="relogio" className="ico" />
                      Sem acesso
                    </span>
                  ), s.semAcessoDesde ? `desde ${dataHora(s.semAcessoDesde)} · saiu de todos os aparelhos` : null)}
                  {apagaEm ? celula("Entrada apagada em", <span className="sa-num">{diaBr(apagaEm, true)}</span>,
                    `de ${apagaEm.slice(0, 4)}${faltam !== null ? ` · ${faltam === 1 ? "falta 1 dia" : `faltam ${faltam} dias`}` : ""}`) : null}
                  {celula("Última entrada", f.ultimaEntrada ? haQuanto(f.ultimaEntrada) : "Nunca entrou", f.ultimaEntrada ? "no Portal" : null)}
                  {celula("Senha", f.senhaCriadaEm ? "Criada" : "Ainda não criada")}
                  {celula("Autenticador", f.autenticadorDesde ? "Cadastrado" : "Não cadastrado")}
                </dl>
                <p className="sa-trava">
                  <Icone nome="cadeado" className="ico" />
                  <span>Ninguém da equipe vê a senha nem o link.</span>
                </p>
              </>
            )}
          </section>

          <section className="folha" aria-labelledby="t-acoes" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-acoes">O que dá para fazer</h2>
                <p className="sub">Cada ação pede um motivo e fica no histórico de suporte, com seu nome e a hora.</p>
              </div>
            </div>
            <ul className="sa-acoes">
              {apagadaEm ? (
                <LinhaAcao icone="envelope" titulo="Para voltar, só com convite novo" classe="sa-destaque">
                  Quem convida é o sócio dono do escritório, no Portal, em Equipe › Convidar pessoa. {nome} cria senha e autenticador do zero; a conta antiga
                  não volta.
                </LinhaAcao>
              ) : (
                <>
                  <LinhaAcao icone="cadeado" titulo="Mandar link de nova senha" classe="sa-fora">
                    {`Sem acesso a nenhum escritório, um link novo não serve para nada. Se ${nome} voltar a um escritório, usa a mesma senha.`}
                  </LinhaAcao>
                  <LinhaAcao icone="sair" titulo="Desconectar de todos os aparelhos" classe="sa-fora">
                    {`${nome} já saiu de todos ao ser retirado.`}
                  </LinhaAcao>
                </>
              )}
            </ul>
          </section>

          <Historico eventos={eventos} novo={false} />
        </div>

        <aside className="sa-col" aria-label="Contexto da pessoa">
          <section className="folha" aria-labelledby="t-escs">
            <div className="folha-cab" style={{ paddingBottom: 4 }}>
              <h2 id="t-escs" style={{ fontSize: 20 }}>
                Escritórios
              </h2>
            </div>
            <ul className="sa-escs">
              {f.escritorios.map((e) => (
                <li key={e.id}>
                  <a href={`/clientes/${encodeURIComponent(e.id)}/socio`}>
                    {e.nome}
                    <span className="sr">, abrir a ficha do cliente</span>
                  </a>
                  <span className="sa-papel">
                    <span className="selo selo-neutro">Retirado</span>
                    <span>{`de ${diaBr(e.conviteEnviadoEm, true)}${e.retiradoEm ? ` a ${diaBr(e.retiradoEm)}` : ""}`}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="sa-uma">
              <Icone nome="ajuda" className="ico" />
              <span>
                {apagadaEm
                  ? `O nome de ${nome} continua como autor no histórico da ${onde}. Não há mais conta para atender.`
                  : `${nome} não tem acesso a nenhum escritório agora. Quem tira e põe pessoas na equipe é o sócio dono, no Portal.`}
              </span>
            </p>
          </section>
          <section className="folha" aria-labelledby="t-regra">
            <div className="folha-cab" style={{ paddingBottom: 12 }}>
              <h2 id="t-regra" style={{ fontSize: 20 }}>
                Quando a entrada sai
              </h2>
            </div>
            <ul className="sa-regras">
              <li>
                <Icone nome="relogio" className="ico" />
                <span>
                  <b>90 dias sem nenhum acesso</b>
                  Sem vínculo em nenhum escritório, nem na equipe T3jus. A rotina da noite apaga o e-mail e a senha.
                </span>
              </li>
              <li>
                <Icone nome="historico" className="ico" />
                <span>
                  <b>O nome fica</b>
                  Como autor no histórico de cada escritório em que a pessoa trabalhou.
                </span>
              </li>
              <li>
                <Icone nome="envelope" className="ico" />
                <span>
                  <b>Para voltar</b>
                  Antes da data, basta o sócio dono convidar de novo para o escritório. Depois, o convite cria uma entrada nova.
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

function SeloSituacao({ s }: { s: SituacaoAcesso }) {
  if (s === "EM_DIA") {
    return (
      <span className="selo selo-ok">
        <Icone nome="check" className="ico" />
        Acesso em dia
      </span>
    );
  }
  return s === "CONVITE_PENDENTE" ? (
    <span className="selo selo-atencao">
      <Icone nome="relogio" className="ico" />
      Convite pendente
    </span>
  ) : (
    <span className="selo selo-urgente">
      <Icone nome="alerta" className="ico" />
      Convite vencido
    </span>
  );
}

function Regras() {
  const itens: [NomeIcone, string, string][] = [
    ["cadeado", "Ninguém vê a senha", "Nem você, nem a Administração. Quem escolhe a senha é a própria pessoa, pelo link."],
    ["envelope", "O link vai só para o e-mail já cadastrado", "Vale 1 hora. Não dá para mandar para outro e-mail nem por WhatsApp."],
    ["telefone", "Confira quem está pedindo", "Antes de tirar o autenticador, ligue para o telefone da ficha do escritório."],
    ["historico", "Tudo fica no histórico", "Cada ação pede um motivo e fica registrada com seu nome e a hora."],
  ];
  return (
    <aside className="sa-col" aria-label="Como funciona">
      <section className="folha" aria-labelledby="t-regras">
        <div className="folha-cab" style={{ paddingBottom: 12 }}>
          <h2 id="t-regras" style={{ fontSize: 20 }}>
            Como funciona
          </h2>
        </div>
        <ul className="sa-regras">
          {itens.map(([i, t, d]) => (
            <li key={t}>
              <Icone nome={i} className="ico" />
              <span>
                <b>{t}</b>
                {d}
              </span>
            </li>
          ))}
        </ul>
        <p className="sa-quem">Esta página é de Suporte e Administração.</p>
      </section>
    </aside>
  );
}

/** Aviso flutuante de sucesso, com o botão de fechar. */
function Toast({ titulo, texto, aoFechar }: { titulo: string; texto: string; aoFechar: () => void }) {
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

// ---------------------------------------------------------------- busca

function Busca({ termoInicial }: { termoInicial: string }) {
  const ids = useId();
  const [termo, setTermo] = useState(termoInicial);
  const [buscado, setBuscado] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState<PessoaSuporte[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [erroCampo, setErroCampo] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  const buscar = useCallback(async (q: string) => {
    const t = q.trim();
    if (t.length < 2) {
      setErroCampo(true);
      requestAnimationFrame(() => campo.current?.focus());
      return;
    }
    setErroCampo(false);
    setErro(null);
    setCarregando(true);
    window.history.replaceState(null, "", `${SUPORTE}?q=${encodeURIComponent(t)}`);
    const r = await chamarConsole<{ pessoas: PessoaSuporte[] }>(`/v1/suporte/pessoas?q=${encodeURIComponent(t)}`);
    setCarregando(false);
    setBuscado(t);
    if (r.ok) setPessoas(r.dados.pessoas);
    else if (r.status !== 401) {
      setPessoas(null);
      setErro(r.erro);
    }
  }, []);

  useEffect(() => {
    if (termoInicial.trim().length >= 2) void Promise.resolve().then(() => buscar(termoInicial));
  }, [termoInicial, buscar]);

  function limpar() {
    setTermo("");
    setBuscado(null);
    setPessoas(null);
    window.history.replaceState(null, "", SUPORTE);
    campo.current?.focus();
  }

  const agora = new Date();
  let miolo: ReactNode;
  if (carregando) miolo = <Carregando rotulo="Buscando pessoas…" linhas={3} />;
  else if (erro) {
    miolo = (
      <Estado icone="alerta" erro moldura titulo="Não deu para buscar agora"
        acoes={
          <button className="btn btn-pri" type="button" onClick={() => void buscar(buscado ?? termo)}>
            <Icone nome="reenviar" className="ico" />
            Tentar de novo
          </button>
        }>
        {textoDoErro(erro)}
      </Estado>
    );
  } else if (pessoas && buscado && pessoas.length === 0) {
    miolo = (
      <div role="status">
        <Estado icone="busca" moldura titulo={`Ninguém encontrado para “${buscado}”`}
          acoes={
            <button className="btn btn-sec" type="button" onClick={limpar}>
              <Icone nome="xis" className="ico" />
              Limpar busca
            </button>
          }>
          Confira a grafia ou busque pelo e-mail completo. Você só encontra pessoas dos escritórios que atende; se a pessoa é de outro cliente,
          peça à Administração para atribuir você a ele.
        </Estado>
      </div>
    );
  } else if (pessoas && buscado) {
    miolo = (
      <section className="folha" aria-labelledby={`${ids}-res`} style={{ overflow: "hidden" }}>
        <h2 id={`${ids}-res`} className="sr">
          Resultados
        </h2>
        <p className="sa-cont" role="status">
          <b>
            {pessoas.length} {pessoas.length === 1 ? "pessoa" : "pessoas"}
          </b>{" "}
          para “{buscado}”. Abra a pessoa para ver a conta e agir.
        </p>
        <ul className="sa-res">
          {pessoas.map((p) => (
            <li key={p.id}>
              <a href={enderecoPessoa(p.id, buscado)}>
                <span className="av-p forte" aria-hidden="true">
                  {iniciais(p.nome)}
                </span>
                <span>
                  <span className="sa-nome">
                    {marcarTermo(p.nome, buscado).map((x, i) => (x.marca ? <mark key={i}>{x.t}</mark> : <span key={i}>{x.t}</span>))}
                  </span>
                  <small>{p.email}</small>
                </span>
                <span className="sa-esc">
                  {p.escritorios.map((e) => (
                    <span key={e.id}>
                      <b>{e.nome}</b> · {PAPEIS[e.papel]}
                    </span>
                  ))}
                </span>
                <span className="sa-sit">
                  <SeloSituacao s={situacaoAcesso(p, agora)} />
                </span>
                <Icone nome="dir" className="ico ir" />
              </a>
            </li>
          ))}
        </ul>
        <p className="sa-alcance">
          <Icone nome="ajuda" className="ico" />
          <span>
            Não achou? Você só vê pessoas dos escritórios que atende. Se a pessoa é de outro cliente, peça à Administração para atribuir você a ele.
          </span>
        </p>
      </section>
    );
  } else {
    miolo = (
      <Estado icone="busca" moldura titulo="Busque a pessoa que pediu ajuda">
        Pelo nome ou pelo e-mail. Aparecem sócios e equipe dos escritórios que você atende, com a situação da conta.
      </Estado>
    );
  }

  return (
    <>
      <div className="cabeca-ambar campo-ambar cabeca-equipe">
        <div>
          <p className="sobretitulo">Suporte</p>
          <h1>Suporte de acesso</h1>
          <span className="fio" aria-hidden="true" />
          <p className="lede">
            Ajude quem não consegue entrar no Portal. Você nunca vê nem escolhe a senha: o link vai só para o e-mail já cadastrado da pessoa.
          </p>
        </div>
      </div>
      <div className="sa-grade">
        <div className="sa-col">
          <section className="folha" aria-labelledby={`${ids}-busca`}>
            <div className="folha-cab" style={{ paddingBottom: 0 }}>
              <div>
                <h2 id={`${ids}-busca`}>Buscar pessoa</h2>
                <p className="sub">Sócios e equipe dos escritórios que você atende.</p>
              </div>
            </div>
            <form className="sa-busca" role="search" noValidate
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void buscar(termo);
              }}>
              <div className="campo">
                <label htmlFor={`${ids}-q`}>Nome ou e-mail</label>
                <div className="campo-busca">
                  <Icone nome="busca" className="ico" />
                  <input ref={campo} className="entrada" id={`${ids}-q`} name="q" type="search" autoComplete="off" spellCheck={false} value={termo}
                    maxLength={120} aria-invalid={erroCampo || undefined} aria-describedby={erroCampo ? `${ids}-q-erro` : undefined}
                    onChange={(e) => setTermo(e.target.value)} />
                </div>
                {erroCampo ? <ErroCampo id={`${ids}-q-erro`}>Escreva ao menos 2 letras do nome ou do e-mail.</ErroCampo> : null}
              </div>
              <button className="btn btn-pri" type="submit" aria-busy={carregando || undefined}>
                {carregando ? (
                  "Buscando…"
                ) : (
                  <>
                    <Icone nome="busca" className="ico" />
                    Buscar
                  </>
                )}
              </button>
            </form>
          </section>
          {miolo}
        </div>
        <Regras />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- ações

type Acao = "senha" | "desconectar" | "autenticador" | "convite";

const ROTA: Record<Acao, string> = {
  senha: "link-senha",
  desconectar: "desconectar",
  autenticador: "tirar-autenticador",
  convite: "reenviar-convite",
};

const EXEMPLO: Record<Acao, string> = {
  senha: "Ex.: Ligou às 15h pedindo ajuda; conferi pelo telefone da ficha.",
  desconectar: "Ex.: Perdeu o celular; pediu pelo telefone do escritório.",
  autenticador: "Ex.: Trocou de celular e perdeu o autenticador. Liguei no telefone da ficha.",
  convite: "Ex.: O convite venceu antes de abrir; pediu outro por telefone.",
};

const NADA_MUDOU: Record<Acao, string> = {
  senha: "Nenhum link foi enviado.",
  desconectar: "Ninguém foi desconectado.",
  autenticador: "O autenticador continua cadastrado.",
  convite: "Nenhum convite foi enviado.",
};

function CampoMotivo({ id, valor, aoMudar, erro, nome, ph, foco }: {
  foco: boolean;
  id: string;
  valor: string;
  aoMudar: (v: string) => void;
  erro: boolean;
  nome: string;
  ph: string;
}) {
  return (
    <div className="campo">
      <div className="sa-rot">
        <label htmlFor={id}>Motivo</label>
        <span className="sa-contador" id={`${id}-cont`}>
          {valor.length} de 300 caracteres
        </span>
      </div>
      <textarea className="entrada" id={id} name="motivo" rows={3} maxLength={300} aria-required="true" value={valor} placeholder={ph} data-foco={foco || undefined}
        aria-invalid={erro || undefined} aria-describedby={`${id}-ajuda${erro ? ` ${id}-erro` : ""}`} onChange={(e) => aoMudar(e.target.value)} />
      <p className="ajuda" id={`${id}-ajuda`}>
        Obrigatório. Fica no histórico de suporte de {nome}, com seu nome e a hora. Não escreva senha nem código.
      </p>
      {erro ? <ErroCampo id={`${id}-erro`}>Escreva o motivo. Ele fica no histórico de suporte.</ErroCampo> : null}
    </div>
  );
}

function Canal({ icone, rotulo, children, nota }: { icone: NomeIcone; rotulo: string; children: ReactNode; nota?: string }) {
  return (
    <div className="sa-canal">
      <span className="sa-ic">
        <Icone nome={icone} className="ico" />
      </span>
      <div>
        <small>{rotulo}</small>
        <strong>{children}</strong>
        {nota ? <p>{nota}</p> : null}
      </div>
    </div>
  );
}

function JanelaAcao({ acao, f, aoFechar, aoFeito }: {
  acao: Acao | null;
  f: FichaAcesso;
  aoFechar: () => void;
  aoFeito: (titulo: string, texto: string) => void;
}) {
  const ids = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const [motivo, setMotivo] = useState("");
  const [conferi, setConferi] = useState(false);
  const [erros, setErros] = useState<{ motivo: boolean; conferi: boolean }>({ motivo: false, conferi: false });
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [vezFalha, setVezFalha] = useState(0);
  const [limite, setLimite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const nome = primeiroNome(f.nome);

  // Depois de cada falha, o foco vai ao "Tentar de novo" já habilitado, depois do commit
  // (F3.176). Um rAF logo depois do await podia rodar antes, com o botão ainda desabilitado.
  // O contador começa em 0 (não rouba o foco ao abrir) e muda a cada falha, mesmo repetida.
  useEffect(() => {
    if (vezFalha > 0) botao.current?.focus();
  }, [vezFalha]);
  const tel = telefoneParaConferir(f);
  const mascarado = f.email ? mascararEmail(f.email) : "o e-mail cadastrado";

  async function enviar() {
    if (!acao || enviando) return;
    if (limite) return;
    const e = { motivo: !motivo.trim(), conferi: acao === "autenticador" && !conferi };
    setErros(e);
    setFalha(null);
    if (e.motivo || e.conferi) return focarPrimeiroErro(raiz.current);
    setEnviando(true);
    const corpo = acao === "autenticador" ? { motivo: motivo.trim(), identidadeConferida: true } : { motivo: motivo.trim() };
    const r = await chamarConsole<{ email?: string; aparelhos?: number }>(`/v1/suporte/pessoas/${f.id}/${ROTA[acao]}`, { corpo });
    setEnviando(false);
    if (!r.ok) {
      const campos = r.erro.detalhes?.campos;
      if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos)) {
        setErros({ motivo: campos.includes("motivo"), conferi: campos.includes("identidadeConferida") });
        return focarPrimeiroErro(raiz.current);
      }
      if (r.erro.codigo === "RATE_LIMITED" && acao === "senha") return setLimite(true);
      setFalha(r.erro);
      setVezFalha((n) => n + 1);
      return;
    }
    const ate = hora(new Date(Date.now() + 60 * 60 * 1000).toISOString());
    const n = r.dados.aparelhos ?? 0;
    const aparelhos = `${n} ${n === 1 ? "aparelho" : "aparelhos"}`;
    if (acao === "senha") aoFeito(`Link enviado para ${r.dados.email ?? mascarado}.`, `Vale até ${ate}. Ficou no histórico de suporte de ${nome}, com o motivo.`);
    else if (acao === "desconectar") aoFeito(`${nome} foi desconectado de ${aparelhos}.`, "Entra de novo com a senha e o autenticador de sempre. Ficou no histórico.");
    else if (acao === "autenticador") aoFeito(`O autenticador de ${nome} foi tirado.`, "Na próxima entrada, o Portal pede um novo. Também saiu de todos os aparelhos.");
    else aoFeito(`Convite reenviado para ${r.dados.email ?? mascarado}.`, `Vale até ${ate}. O link anterior deixou de valer.`);
  }

  const nErros = Number(erros.motivo) + Number(erros.conferi);
  const titulo: Record<Acao, string> = {
    senha: `Mandar link de nova senha para ${nome}?`,
    desconectar: `Desconectar ${nome} de todos os aparelhos?`,
    autenticador: `Tirar o autenticador de ${nome}?`,
    convite: `Reenviar o convite para ${nome}?`,
  };
  const descricao: Record<Acao, string> = {
    senha: `O link vale 1 hora e só pode ser usado uma vez. Você não vê o link nem a senha: ${nome} escolhe a senha nova.`,
    desconectar: `${nome} sai do Portal em todos os escritórios e precisa entrar de novo em cada aparelho. A senha e o autenticador não mudam.`,
    autenticador: `Use só quando o autenticador se perdeu. Na próxima entrada, o Portal pede para ${nome} cadastrar outro. Também sai de todos os aparelhos.`,
    convite: `${nome} recebe um link novo para criar a senha. Ninguém da equipe vê nem escolhe a senha.`,
  };
  const envio: Record<Acao, { icone: NomeIcone | null; texto: string }> = {
    senha: { icone: "envelope", texto: "Mandar link" },
    desconectar: { icone: "sair", texto: "Desconectar de todos" },
    autenticador: { icone: null, texto: "Tirar o autenticador" },
    convite: { icone: "reenviar", texto: "Reenviar convite" },
  };
  const a = acao ?? "senha";

  return (
    <Janela id={`${ids}-j`} aberta={!!acao} aoFechar={aoFechar} alerta={a === "autenticador"} sobretitulo="Suporte de acesso"
      descricao={`${ids}-d`} titulo={titulo[a]} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={a === "autenticador" && !nErros ? true : undefined}>
            Cancelar
          </button>
          <button ref={botao} className={a === "autenticador" ? "btn btn-perigo" : "btn btn-pri"} type="submit" disabled={enviando}
            aria-disabled={limite || undefined} aria-describedby={limite ? `${ids}-limite` : undefined} data-tentar={falha ? true : undefined}>
            {falha ? <Icone nome="reenviar" className="ico" /> : envio[a].icone ? <Icone nome={envio[a].icone} className="ico" /> : null}
            {enviando ? "Enviando…" : falha ? "Tentar de novo" : envio[a].texto}
          </button>
        </>
      }>
      <div ref={raiz} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>{descricao[a]}</p>
        {nErros ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(nErros)}>
            {NADA_MUDOU[a]}
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="Não deu para concluir agora.">
            {`${textoDoErro(falha)} ${NADA_MUDOU[a]} O motivo continua aqui.`}
          </Aviso>
        ) : null}
        {limite ? (
          <div className="aviso aviso-atencao" role="status" id={`${ids}-limite`}>
            <Icone nome="relogio" className="ico" />
            <div>
              <strong className="aviso-titulo">{nome} já recebeu 3 links na última hora.</strong>
              <p>Para proteger a conta, o próximo libera em até 1 hora. Peça para procurar o e-mail na caixa de spam ou de promoções e usar o link mais novo.</p>
            </div>
          </div>
        ) : null}
        {a === "senha" || a === "convite" ? (
          <Canal icone="envelope" rotulo={a === "senha" ? "Vai só para o e-mail já cadastrado" : "Vai só para o e-mail do convite"}
            nota={a === "senha" ? `Se ${nome} perguntar, leia assim. Não dite o endereço inteiro nem mande para outro.` : "O link anterior deixa de valer. O novo vale 1 hora."}>
            <EmailMascarado email={f.email} />
          </Canal>
        ) : null}
        {a === "desconectar" ? (
          <Canal icone="sair" rotulo="Aparelhos conectados agora"
            nota={f.ultimaEntrada ? `Última entrada: ${haQuanto(f.ultimaEntrada).toLowerCase()}.` : undefined}>
            {f.aparelhos} {f.aparelhos === 1 ? "aparelho" : "aparelhos"}
          </Canal>
        ) : null}
        {a === "autenticador" ? (
          <>
            <div className="sa-conferir">
              <Icone nome="telefone" className="ico" />
              <p>
                <b>Confira a identidade antes.</b>{" "}
                {tel ? (
                  <>
                    Ligue para o telefone da ficha da {tel.escritorio}, <span className="num">{tel.telefone}</span>, e fale com {nome}.
                  </>
                ) : (
                  <>Ligue para um telefone que já esteja na ficha do escritório e fale com {nome}.</>
                )}{" "}
                Não use um número que a pessoa passar agora.
              </p>
            </div>
            <fieldset className="sa-marcar" aria-describedby={erros.conferi ? `${ids}-conf-erro` : undefined}>
              <legend className="sr">Conferência de identidade</legend>
              <label className="opcao">
                <input className="marcar" type="checkbox" name="conferi" checked={conferi} aria-invalid={erros.conferi || undefined}
                  onChange={(e) => setConferi(e.target.checked)} />
                <span>Conferi a identidade de {nome} por um telefone que já estava na ficha do escritório.</span>
              </label>
              {erros.conferi ? <ErroCampo id={`${ids}-conf-erro`}>Confirme que conferiu a identidade por um telefone da ficha.</ErroCampo> : null}
            </fieldset>
          </>
        ) : null}
        <CampoMotivo id={`${ids}-motivo`} valor={motivo} aoMudar={setMotivo} erro={erros.motivo} nome={nome} ph={EXEMPLO[a]} foco={a !== "autenticador"} />
      </div>
    </Janela>
  );
}

// ---------------------------------------------------------------- ficha da pessoa

function LinhaAcao({ icone, perigo, titulo, children, botao, classe }: {
  icone: NomeIcone;
  perigo?: boolean;
  titulo: string;
  children: ReactNode;
  botao?: ReactNode;
  classe?: string;
}) {
  return (
    <li className={classe}>
      <span className={perigo ? "sa-ic perigo" : "sa-ic"}>
        <Icone nome={icone} className="ico" />
      </span>
      <div>
        <strong>{titulo}</strong>
        <p>{children}</p>
      </div>
      {botao}
    </li>
  );
}

function Historico({ eventos, novo }: { eventos: EventoSuporte[] | null; novo: boolean }) {
  const ids = useId();
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>Histórico de suporte</h2>
          <p className="sub">Quem fez o quê, quando e por quê. Nada aqui é apagado.</p>
        </div>
      </div>
      {eventos === null ? (
        <p className="sa-uma" style={{ marginTop: 0 }}>
          <Icone nome="alerta" className="ico" />
          <span>Não deu para carregar o histórico agora. O que foi feito continua registrado.</span>
        </p>
      ) : eventos.length === 0 ? (
        <p className="sa-uma" style={{ marginTop: 0 }}>
          <Icone nome="historico" className="ico" />
          <span>
            Nenhum atendimento de suporte ainda. Cada link de nova senha, desconexão, autenticador tirado e convite reenviado aparece aqui, com quem
            fez, quando e o motivo.
          </span>
        </p>
      ) : (
        <>
          {agruparPorDiaSuporte(eventos).map((g, gi) => (
            <div className="eventos-dia" key={g.dia}>
              <h3>{g.dia}</h3>
              <ol className="eventos">
                {g.eventos.map((e, i) => {
                  const fr = fraseSuporte(e);
                  return (
                    <li key={`${e.ocorridoEm}-${e.acao}`} className={novo && gi === 0 && i === 0 ? "sa-novo" : undefined}>
                      <time dateTime={e.ocorridoEm}>{hora(e.ocorridoEm)}</time>
                      <span className="pto" aria-hidden="true" />
                      <div>
                        <p>
                          <b>{e.autor?.nome ?? "Equipe T3jus"}</b> {fr.fez}
                        </p>
                        {fr.detalhe ? <small>{fr.detalhe}</small> : null}
                        {e.dados.motivo ? (
                          <q className="sa-motivo">
                            <span className="sr">Motivo: </span>
                            {e.dados.motivo}
                          </q>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <div style={{ height: 12 }} />
        </>
      )}
    </section>
  );
}

function FichaPessoa({ id, termo, aoNome, aoProibido }: { id: string; termo: string; aoNome: (n: string) => void; aoProibido: () => void }) {
  const [f, setF] = useState<FichaAcesso | null>(null);
  const [eventos, setEventos] = useState<EventoSuporte[] | null>([]);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [feito, setFeito] = useState<{ titulo: string; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    const [r, h] = await Promise.all([
      chamarConsole<FichaAcesso>(`/v1/suporte/pessoas/${encodeURIComponent(id)}`),
      chamarConsole<{ eventos: EventoSuporte[] }>(`/v1/suporte/pessoas/${encodeURIComponent(id)}/historico`),
    ]);
    if (r.ok) {
      setF(r.dados);
      aoNome(r.dados.nome);
    } else if (r.status !== 401) {
      if (r.erro.codigo === "FORBIDDEN") aoProibido();
      setErro(r.erro);
    }
    setEventos(h.ok ? h.dados.eventos : null);
  }, [id, aoNome, aoProibido]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  const abrir = (a: Acao) => {
    setFeito(null);
    setAbertura((n) => n + 1);
    setAcao(a);
  };

  const voltar = termo ? `${SUPORTE}?q=${encodeURIComponent(termo)}` : SUPORTE;
  const textoVoltar = termo ? `Resultados para “${termo}”` : "Nova busca";

  if (erro?.codigo === "NOT_FOUND") {
    return (
      <Estado icone="busca" moldura nivel={1} titulo="Pessoa não encontrada"
        acoes={
          <a className="btn btn-pri" href={SUPORTE}>
            Nova busca
          </a>
        }>
        Ela não está nos escritórios que você atende, ou o endereço está errado. Se a pessoa é de outro cliente, peça à Administração para atribuir você
        a ele.
      </Estado>
    );
  }
  if (erro?.codigo === "FORBIDDEN") return null;
  if (erro) return <ErroAoCarregar oque="a conta da pessoa" aoTentar={() => void carregar()} />;
  if (!f) return <Carregando rotulo="Carregando a conta da pessoa…" linhas={3} />;
  if (f.saida) return <FichaSemAcesso f={f} voltar={voltar} textoVoltar={textoVoltar} eventos={eventos} />;

  const agora = new Date();
  const nome = primeiroNome(f.nome);
  const sit = situacaoAcesso(f, agora);
  const entrou = !!f.senhaCriadaEm;
  const valeAte = conviteValeAte(f);
  const tel = telefoneParaConferir(f);
  const varios = f.escritorios.length > 1;
  const lede = f.escritorios.map((e) => `${PAPEIS[e.papel]} na ${e.nome}`).join(" e ") + ".";

  const celula = (dt: string, dd: ReactNode, small?: string | null, classe?: string) => (
    <div className={classe}>
      <dt>{dt}</dt>
      <dd>
        {dd}
        {small ? <small>{small}</small> : null}
      </dd>
    </div>
  );

  return (
    <>
      <div className="cabeca-ambar campo-ambar cabeca-equipe sa-cab-pessoa">
        <div>
          <a className="sa-voltar" href={voltar}>
            <Icone nome="esquerda" className="ico ico-s" />
            {textoVoltar}
          </a>
          <p className="sobretitulo">Suporte de acesso</p>
          <h1>{f.nome}</h1>
          <span className="fio" aria-hidden="true" />
          <p className="lede">{lede}</p>
        </div>
        <div className="sa-selos">
          <SeloSituacao s={sit} />
        </div>
      </div>

      <div className="sa-grade">
        <div className="sa-col">
          <section className="folha" aria-labelledby="t-situ" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-situ">Situação da conta</h2>
                <p className="sub">Só leitura. A mesma conta vale em {varios ? "todos os escritórios" : "todo o Portal"} de {nome}.</p>
              </div>
            </div>
            <dl className="sa-situ">
              {celula("E-mail cadastrado", <span className="sa-email">{f.email ?? "Não encontrado"}</span>,
                `${f.emailConfirmado ? "verificado" : "ainda não verificado"} · não muda por aqui`, "sa-inteira")}
              {celula("Convite",
                entrou ? "Aceito" : sit === "CONVITE_PENDENTE" ? (
                  <span className="selo selo-atencao">
                    <Icone nome="relogio" className="ico" />
                    Pendente
                  </span>
                ) : (
                  <span className="selo selo-urgente">
                    <Icone nome="alerta" className="ico" />
                    Vencido
                  </span>
                ),
                entrou ? `em ${dataLonga(f.senhaCriadaEm!)}` : valeAte ? `${sit === "CONVITE_PENDENTE" ? "vale até" : "venceu em"} ${dataHora(valeAte, agora)}` : null)}
              {celula("Senha", entrou ? "Criada" : "Ainda não criada",
                entrou ? (f.senhaTrocadaEm ? `última troca em ${dataLonga(f.senhaTrocadaEm)}` : `em ${dataLonga(f.senhaCriadaEm!)}`) : null)}
              {celula("Autenticador", f.autenticadorDesde ? "Cadastrado" : "Não cadastrado", f.autenticadorDesde ? `desde ${dataLonga(f.autenticadorDesde)}` : null)}
              {celula("Última entrada", f.ultimaEntrada ? haQuanto(f.ultimaEntrada, agora) : "Nunca entrou", f.ultimaEntrada ? "no Portal" : null)}
              {celula("Aparelhos conectados", <span className="sa-num">{f.aparelhos}</span>,
                f.aparelhos === 0 ? "nenhum agora" : f.aparelhos === 1 ? "aparelho" : "aparelhos")}
            </dl>
            <p className="sa-trava">
              <Icone nome="cadeado" className="ico" />
              <span>Ninguém da equipe vê a senha nem o link. Para corrigir o e-mail, veja com a Administração.</span>
            </p>
          </section>

          <section className="folha" aria-labelledby="t-acoes" style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <div>
                <h2 id="t-acoes">O que dá para fazer</h2>
                <p className="sub">
                  {f.podeAgir
                    ? "Cada ação pede um motivo e fica no histórico de suporte, com seu nome e a hora."
                    : "Você pode ver a conta, mas agir é com quem tem Suporte ou Administração neste cliente."}
                </p>
              </div>
            </div>
            <ul className="sa-acoes">
              {!entrou ? (
                <>
                  <LinhaAcao icone="envelope" titulo="Reenviar convite" classe={sit === "CONVITE_VENCIDO" ? "sa-destaque" : undefined}
                    botao={f.podeAgir ? (
                      <button className={sit === "CONVITE_VENCIDO" ? "btn btn-pri" : "btn btn-sec"} type="button" onClick={() => abrir("convite")}>
                        <Icone nome="reenviar" className="ico" />
                        Reenviar convite
                      </button>
                    ) : undefined}>
                    {sit === "CONVITE_VENCIDO"
                      ? <>O convite venceu{valeAte ? ` em ${dataHora(valeAte, agora)}` : ""}. O novo vale 1&nbsp;hora e vai só para <EmailMascarado email={f.email} />.</>
                      : <>O convite vale até {valeAte ? hora(valeAte) : "daqui a pouco"}. Se reenviar, este link deixa de valer.</>}
                  </LinhaAcao>
                  <LinhaAcao icone="cadeado" titulo="Mandar link de nova senha" classe="sa-fora">
                    Libera quando {nome} criar a senha pelo convite.
                  </LinhaAcao>
                  <LinhaAcao icone="sair" titulo="Desconectar de todos os aparelhos" classe="sa-fora">
                    {nome} ainda não entrou em nenhum aparelho.
                  </LinhaAcao>
                </>
              ) : (
                <>
                  <LinhaAcao icone="cadeado" titulo="Mandar link de nova senha"
                    botao={f.podeAgir ? (
                      <button className="btn btn-sec" type="button" onClick={() => abrir("senha")}>
                        <Icone nome="envelope" className="ico" />
                        Mandar link
                      </button>
                    ) : undefined}>
                    Vai só para <EmailMascarado email={f.email} /> e vale 1&nbsp;hora. A senha atual vale até {nome} criar a nova.
                  </LinhaAcao>
                  {f.aparelhos > 0 ? (
                    <LinhaAcao icone="sair" titulo="Desconectar de todos os aparelhos"
                      botao={f.podeAgir ? (
                        <button className="btn btn-sec" type="button" onClick={() => abrir("desconectar")}>
                          <Icone nome="sair" className="ico" />
                          Desconectar
                        </button>
                      ) : undefined}>
                      {nome} sai do Portal {f.aparelhos === 1 ? "no aparelho conectado" : `nos ${f.aparelhos} aparelhos conectados`} e entra de novo. A senha não muda.
                    </LinhaAcao>
                  ) : (
                    <LinhaAcao icone="sair" titulo="Desconectar de todos os aparelhos" classe="sa-fora">
                      Nenhum aparelho conectado agora.
                    </LinhaAcao>
                  )}
                  {f.autenticadorDesde ? (
                    <LinhaAcao icone="escudo" perigo titulo="Tirar o autenticador"
                      botao={f.podeAgir ? (
                        <button className="btn btn-perigo" type="button" onClick={() => abrir("autenticador")}>
                          Tirar autenticador
                        </button>
                      ) : undefined}>
                      Só para autenticador perdido. Antes, confira a identidade pelo telefone da ficha do escritório.
                    </LinhaAcao>
                  ) : null}
                </>
              )}
            </ul>
            {entrou && !f.autenticadorDesde ? (
              <p className="sa-trava" style={{ borderTop: "1px solid var(--divisor)", paddingTop: 14 }}>
                <Icone nome="escudo" className="ico" />
                <span>“Tirar o autenticador” não aparece: {nome} não tem autenticador cadastrado.</span>
              </p>
            ) : null}
          </section>

          <Historico eventos={eventos} novo={!!feito} />
        </div>

        <aside className="sa-col" aria-label="Contexto da pessoa">
          <section className="folha" aria-labelledby="t-escs">
            <div className="folha-cab" style={{ paddingBottom: 4 }}>
              <h2 id="t-escs" style={{ fontSize: 20 }}>
                {varios ? `Escritórios · ${f.escritorios.length}` : "Escritório"}
              </h2>
            </div>
            <ul className="sa-escs">
              {f.escritorios.map((e) => (
                <li key={e.id}>
                  <a href={`/clientes/${encodeURIComponent(e.id)}/socio`}>
                    {e.nome}
                    <span className="sr">, abrir a ficha do cliente</span>
                  </a>
                  <span className="sa-papel">
                    <span className="selo selo-neutro">{PAPEIS[e.papel]}</span>
                    {e.telefone ? <span>Telefone da ficha: {e.telefone}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="sa-uma">
              <Icone nome="ajuda" className="ico" />
              <span>
                Senha, autenticador e aparelhos valem para {varios ? "todos os escritórios" : "a conta inteira"} de {nome}. O papel em cada escritório quem
                muda é o sócio dono, no Portal.
              </span>
            </p>
          </section>
          <section className="folha" aria-labelledby="t-conf">
            <div className="folha-cab" style={{ paddingBottom: 12 }}>
              <h2 id="t-conf" style={{ fontSize: 20 }}>
                Antes de agir
              </h2>
            </div>
            <ul className="sa-regras">
              <li>
                <Icone nome="telefone" className="ico" />
                <span>
                  <b>Confira quem está pedindo</b>
                  {tel ? (
                    <>
                      Ligue para o telefone da ficha da {tel.escritorio}: <span style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{tel.telefone}</span>.
                    </>
                  ) : (
                    "Ligue para um telefone que já esteja na ficha do escritório."
                  )}{" "}
                  Não use um número que a pessoa passar agora.
                </span>
              </li>
              <li>
                <Icone nome="cadeado" className="ico" />
                <span>
                  <b>Nunca peça a senha</b>
                  Nem códigos do autenticador. Quem pede isso não é do T3jus.
                </span>
              </li>
              <li>
                <Icone nome="envelope" className="ico" />
                <span>
                  <b>Leia o e-mail mascarado</b>
                  Se a pessoa perguntar para onde foi o link, leia como aparece na janela, sem ditar o endereço inteiro.
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <JanelaAcao key={abertura} acao={acao} f={f} aoFechar={() => setAcao(null)}
        aoFeito={(titulo, texto) => {
          setAcao(null);
          setFeito({ titulo, texto });
          void carregar();
        }} />
      {feito ? <Toast titulo={feito.titulo} texto={feito.texto} aoFechar={() => setFeito(null)} /> : null}
    </>
  );
}

// ---------------------------------------------------------------- página

export function SuporteAcesso({ pessoaId, termo }: { pessoaId: string | null; termo: string }) {
  const sessao = useSessaoConsole();
  const [nome, setNome] = useState<string | null>(null);
  const [proibido, setProibido] = useState(false);
  const aoProibido = useCallback(() => setProibido(true), []);
  const semPermissao = proibido || (sessao !== null && !sessao.acoes.includes("console.suporte.ver"));

  const trilha = [{ nome: "Console", href: CARTEIRA }, ...(pessoaId ? [{ nome: "Suporte de acesso", href: SUPORTE }, { nome: nome ?? "Pessoa" }] : [{ nome: "Suporte de acesso" }])];
  return (
    <MolduraConsole atual="suporte" pagina="co-equipe co-carteira co-suporte" sessao={sessao} trilha={trilha}>
      {semPermissao ? (
        <Estado icone="cadeado" erro moldura nivel={1} titulo="Esta página é de Suporte e Administração"
          acoes={
            <a className="btn btn-pri" href={CARTEIRA}>
              Ir para a carteira
            </a>
          }>
          Quem ajuda os clientes a entrar no Portal é a equipe de Suporte. Se um cliente pediu ajuda com a senha, passe o pedido para o Suporte.
        </Estado>
      ) : pessoaId ? (
        <FichaPessoa id={pessoaId} termo={termo} aoNome={setNome} aoProibido={aoProibido} />
      ) : (
        <Busca termoInicial={termo} />
      )}
    </MolduraConsole>
  );
}
