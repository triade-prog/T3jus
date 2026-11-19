"use client";
// Equipe T3jus (PT-24), tela aprovada em docs/design/aprovadas/console-v1/equipe.html: quem
// trabalha no Console, com e-mail, funções e convite pendente; cadastrar, mudar funções,
// desativar e reativar (com as funções em branco). Só a Administração; o servidor decide.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cadastrarMembroSchema, FUNCOES_CONSOLE, type FuncaoConsole, type SaidaPessoa } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { DESCRICAO_FUNCOES, FuncoesDef } from "./AbaEquipe.tsx";
import { ListaHistorico } from "./AbaNotasHistorico.tsx";
import { CARTEIRA, chamarConsole, EQUIPE, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import { dataBr } from "./FimContrato.tsx";
import { dataLonga, iniciais } from "./tempo.ts";

export interface PessoaDaEquipe {
  id: string;
  nome: string;
  email: string | null;
  ativa: boolean;
  funcoes: FuncaoConsole[];
  desde: string;
  convitePendente: boolean;
  /** Desde quando está desativada e o que acontece com a entrada (F0.14). */
  desativadaEm?: string | null;
  saida?: SaidaPessoa | null;
}

const apagada = (p: PessoaDaEquipe) => !!p.saida?.entradaApagadaEm;
const dia = (iso: string) => dataBr(iso.slice(0, 10));

type Filtro = "TODAS" | "ATIVAS" | "DESATIVADAS";

function OpcoesFuncoes({ marcadas, aoMudar, erro, prefixo, foco }: {
  marcadas: FuncaoConsole[];
  aoMudar: (f: FuncaoConsole[]) => void;
  erro?: string;
  prefixo: string;
  foco?: boolean;
}) {
  return (
    <fieldset className="grupo-opcoes" aria-describedby={erro ? `${prefixo}-erro` : undefined}>
      <legend>Funções</legend>
      {(Object.keys(FUNCOES_CONSOLE) as FuncaoConsole[]).map((f, i) => (
        <label key={f} className="opcao">
          <input className="marcar" type="checkbox" checked={marcadas.includes(f)} aria-invalid={erro ? true : undefined}
            data-foco={foco && i === 0 ? true : undefined}
            onChange={(e) => aoMudar(e.target.checked ? [...marcadas, f] : marcadas.filter((x) => x !== f))} />
          <span>
            {FUNCOES_CONSOLE[f]}
            <small>{DESCRICAO_FUNCOES[f]}</small>
          </span>
        </label>
      ))}
      {erro ? <ErroCampo id={`${prefixo}-erro`}>{erro}</ErroCampo> : null}
    </fieldset>
  );
}

/** Cadastrar ou reativar: a mesma janela; ao reativar, nome e e-mail vêm travados e as funções em branco. */
function JanelaCadastro({ aberta, reativar: alvo, pessoas, aoFechar, aoFeito }: {
  aberta: boolean;
  reativar: PessoaDaEquipe | null;
  pessoas: PessoaDaEquipe[];
  aoFechar: () => void;
  aoFeito: (texto: string) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  // Entrada apagada (90 dias sem acesso): não dá para reativar; volta por convite novo, com o
  // nome já escrito e o e-mail em branco, porque o antigo foi apagado.
  const novo = alvo && apagada(alvo) ? alvo : null;
  const reativar = novo ? null : alvo;
  // Reativar começa com nome e e-mail da pessoa e as funções em branco (decisão da Carol).
  // O pai troca a key a cada abertura, então o estado sempre começa daqui.
  const [nome, setNome] = useState(alvo?.nome ?? "");
  const [email, setEmail] = useState(reativar?.email ?? "");
  const [funcoes, setFuncoes] = useState<FuncaoConsole[]>([]);
  const [erros, setErros] = useState<{ nome?: string; email?: string; funcoes?: string }>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro(null);
    const v = cadastrarMembroSchema.safeParse({ nome, email, funcoes });
    const novos: typeof erros = {};
    if (!v.success) {
      const campos = new Set(v.error.issues.map((i) => String(i.path[0])));
      if (campos.has("nome")) novos.nome = "Escreva o nome completo.";
      if (campos.has("email")) {
        novos.email = novo && !email.trim()
          ? `Escreva o e-mail de ${novo.nome.split(/\s+/)[0]}. O antigo foi apagado e não temos mais como saber qual era.`
          : "Confira o e-mail: falta o @ ou o final, como .com.br.";
      }
      if (campos.has("funcoes")) novos.funcoes = "Escolha ao menos uma função.";
    }
    const ja = !reativar && v.success ? pessoas.find((p) => p.ativa && p.email?.toLowerCase() === v.data.email) : undefined;
    if (ja) novos.email = `Esta pessoa já está na equipe: ${ja.nome}.`;
    setErros(novos);
    if (Object.keys(novos).length || !v.success) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarConsole<{ contaNova: boolean }>("/v1/equipe", { corpo: v.data });
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.detalhes?.motivo === "JA_NA_EQUIPE") {
        setErros({ email: "Esta pessoa já está na equipe." });
        return focarPrimeiroErro(corpo.current);
      }
      return setErro(r.erro);
    }
    aoFeito(reativar
      ? `${v.data.nome} voltou para a equipe.`
      : r.dados.contaNova ? `Convite enviado para ${v.data.email}. O link vale por 1 hora.` : `${v.data.nome} já tinha conta e entrou na equipe.`);
  }

  const n = Object.keys(erros).length;
  const primeiro = (alvo?.nome ?? "").split(/\s+/)[0];
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} sobretitulo="Equipe T3jus" descricao={`${ids}-d`}
      titulo={reativar ? `Reativar ${reativar.nome}` : novo ? `Convidar ${novo.nome} de novo` : "Cadastrar pessoa"} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome={reativar ? "reenviar" : "envelope"} className="ico" />
            {enviando ? "Enviando…" : reativar ? `Reativar ${primeiro}` : "Enviar convite"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>
          {reativar
            ? `${primeiro} volta para a equipe só com as funções que você marcar agora. As funções de antes não voltam sozinhas.`
            : novo
              ? `${primeiro} volta só com as funções que você marcar agora.`
              : "Mandamos um convite por e-mail. A pessoa cria a senha e cadastra o autenticador antes de entrar."}
        </p>
        {novo?.saida?.entradaApagadaEm ? (
          <Aviso tom="info" titulo={`A entrada de ${primeiro} foi apagada em ${dia(novo.saida.entradaApagadaEm)}.`}>
            90 dias depois de perder o acesso. Por isso volta como pessoa nova: recebe um convite, cria a senha e cadastra o autenticador de novo. O que fez
            antes continua no histórico, com o nome.
          </Aviso>
        ) : reativar?.saida?.entradaApagaEm ? (
          <Aviso tom="info" titulo={`A entrada de ${primeiro} ainda existe.`}>
            {`Entra com o mesmo e-mail, a mesma senha e o mesmo autenticador. Se ninguém reativar, ela é apagada em ${dataBr(reativar.saida.entradaApagaEm)}.`}
          </Aviso>
        ) : null}
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>{reativar ? "Ninguém foi reativado ainda." : "O convite ainda não foi enviado."}</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo={reativar ? "Não deu para reativar." : "O convite não foi enviado."}>{textoDoErro(erro)}</Aviso> : null}
        <div className="campo">
          <label htmlFor={`${ids}-nome`}>Nome completo</label>
          <input className="entrada" id={`${ids}-nome`} value={nome} readOnly={!!reativar} autoComplete="off" data-foco={reativar || novo ? undefined : true}
            onChange={(e) => setNome(e.target.value)} aria-invalid={erros.nome ? true : undefined}
            aria-describedby={erros.nome ? `${ids}-nome-erro` : undefined} />
          {erros.nome ? <ErroCampo id={`${ids}-nome-erro`}>{erros.nome}</ErroCampo> : null}
        </div>
        <div className="campo">
          <label htmlFor={`${ids}-email`}>E-mail</label>
          <input className="entrada" id={`${ids}-email`} type="email" value={email} readOnly={!!reativar} autoComplete="off"
            onChange={(e) => setEmail(e.target.value)} aria-invalid={erros.email ? true : undefined}
            data-foco={novo ? true : undefined}
            aria-describedby={descritoPor(erros.email && `${ids}-email-erro`, !reativar && `${ids}-email-ajuda`)} />
          {erros.email ? <ErroCampo id={`${ids}-email-erro`}>{erros.email}</ErroCampo> : null}
          {!reativar ? (
            <p className="ajuda" id={`${ids}-email-ajuda`}>
              {novo ? "O e-mail antigo foi apagado com a entrada. O convite vale 1 hora." : "O convite vale 1 hora."}
            </p>
          ) : null}
        </div>
        <OpcoesFuncoes marcadas={funcoes} aoMudar={setFuncoes} erro={erros.funcoes} prefixo={`${ids}-f`} foco={!!reativar} />
      </div>
    </Janela>
  );
}

function JanelaFuncoes({ pessoa, eu, aoFechar, aoFeito }: {
  pessoa: PessoaDaEquipe | null;
  eu: string | null;
  aoFechar: () => void;
  aoFeito: (texto: string) => void;
}) {
  const ids = useId();
  const [funcoes, setFuncoes] = useState<FuncaoConsole[]>(pessoa?.funcoes ?? []);
  const [erroCampo, setErroCampo] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    if (!pessoa) return;
    setErro(null);
    if (!funcoes.length) return setErroCampo(true);
    setErroCampo(false);
    setEnviando(true);
    const r = await chamarConsole(`/v1/equipe/${pessoa.id}/funcoes`, { metodo: "PUT", corpo: { funcoes } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    aoFeito(`As funções de ${pessoa.nome} mudaram.`);
  }

  const primeiro = pessoa?.nome.split(/\s+/)[0] ?? "";
  const ultimaAdm = erro?.detalhes?.motivo === "ULTIMA_ADMINISTRACAO";
  return (
    <Janela id={`${ids}-j`} aberta={!!pessoa} aoFechar={aoFechar} sobretitulo="Equipe T3jus" descricao={`${ids}-d`}
      titulo={`Funções de ${pessoa?.nome ?? ""}`} aoEnviar={() => void salvar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando} data-foco>
            <Icone nome="check" className="ico" />
            {enviando ? "Salvando…" : "Salvar funções"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>
        {pessoa?.id === eu
          ? "Estas são as suas funções. A mudança vai para o histórico da equipe."
          : `${primeiro} passa a poder o que as funções marcadas permitem. A mudança vai para o histórico da equipe.`}
      </p>
      {ultimaAdm ? (
        <Aviso tom="urgencia" titulo="A equipe precisa de ao menos uma pessoa com Administração.">
          Dê a função a outra pessoa antes de tirar a sua.
        </Aviso>
      ) : erro ? (
        <Aviso tom="urgencia" titulo="As funções não mudaram.">{textoDoErro(erro)}</Aviso>
      ) : null}
      <OpcoesFuncoes marcadas={funcoes} aoMudar={setFuncoes} erro={erroCampo ? "Escolha ao menos uma função." : undefined} prefixo={`${ids}-f`} />
    </Janela>
  );
}

function JanelaDesativar({ pessoa, aoFechar, aoFeito }: { pessoa: PessoaDaEquipe | null; aoFechar: () => void; aoFeito: (texto: string) => void }) {
  const ids = useId();
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function desativar() {
    if (!pessoa) return;
    setEnviando(true);
    const r = await chamarConsole(`/v1/equipe/${pessoa.id}/desativar`, { corpo: {} });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    aoFeito(`${pessoa.nome} foi desativado. Não entra mais no Console; para trazer de volta, use Reativar.`);
  }

  const primeiro = pessoa?.nome.split(/\s+/)[0] ?? "";
  return (
    <Janela id={`${ids}-j`} aberta={!!pessoa} aoFechar={aoFechar} alerta sobretitulo="Equipe T3jus" descricao={`${ids}-d`}
      titulo={`Desativar ${pessoa?.nome ?? ""}?`} aoEnviar={() => void desativar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" data-foco onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-perigo" type="submit" disabled={enviando}>
            {enviando ? "Desativando…" : `Desativar ${primeiro}`}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>
        {primeiro} perde o acesso ao Console na hora. O que registrou continua no histórico. Para trazer de volta, use Reativar.
      </p>
      {erro ? <Aviso tom="urgencia" titulo={`Não deu para desativar ${primeiro}.`}>{textoDoErro(erro)}</Aviso> : null}
    </Janela>
  );
}

/** O que acontece com a entrada de quem saiu: a data em que será apagada, ou em que foi. */
function SaidaDaEntrada({ p, celular }: { p: PessoaDaEquipe; celular?: boolean }) {
  const s = p.saida;
  const desde = p.desativadaEm ? dia(p.desativadaEm) : null;
  if (s?.entradaApagadaEm) {
    return (
      <span className="fc-saida">
        {desde ? `${celular ? "Desativada" : "desativada"} em ${desde} · ` : ""}
        {celular ? "entrada apagada" : "apagada"} em {dia(s.entradaApagadaEm)}
      </span>
    );
  }
  if (s?.entradaApagaEm) {
    return (
      <span className="fc-saida">
        {desde ? (celular ? `Desativada em ${desde} · ` : `desde ${desde} · `) : ""}a entrada será apagada em <b>{dataBr(s.entradaApagaEm)}</b>
      </span>
    );
  }
  return null;
}

function Situacao({ p }: { p: PessoaDaEquipe }) {
  if (apagada(p)) {
    return (
      <span className="selo selo-apagada">
        <Icone nome="lixeira" className="ico" />
        Entrada apagada
      </span>
    );
  }
  if (!p.ativa) {
    return (
      <span className="selo selo-neutro" style={{ boxShadow: "inset 0 0 0 1px var(--vinho-4)", background: "transparent" }}>
        Desativada
      </span>
    );
  }
  if (p.convitePendente) {
    return (
      <span className="selo selo-atencao">
        <Icone nome="relogio" className="ico" />
        Convite pendente
      </span>
    );
  }
  return (
    <span className="selo selo-ok">
      <Icone nome="check" className="ico" />
      Ativa
    </span>
  );
}

export function EquipeT3jus({ aba }: { aba: "pessoas" | "historico" }) {
  const sessao = useSessaoConsole();
  const ids = useId();
  const [pessoas, setPessoas] = useState<PessoaDaEquipe[] | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [cadastro, setCadastro] = useState<{ reativar: PessoaDaEquipe | null } | null>(null);
  const [funcoesDe, setFuncoesDe] = useState<PessoaDaEquipe | null>(null);
  const [desativar, setDesativar] = useState<PessoaDaEquipe | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  // Cada abertura de janela ganha uma chave nova: o formulário começa limpo. Ao fechar, a chave
  // fica, para a janela fechar no lugar e o foco voltar ao botão que a abriu.
  const [abertura, setAbertura] = useState(0);
  const abrir = (f: () => void) => {
    setFeito(null);
    setAbertura((n) => n + 1);
    f();
  };

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarConsole<{ pessoas: PessoaDaEquipe[] }>("/v1/equipe");
    if (r.ok) setPessoas(r.dados.pessoas);
    else if (r.status !== 401) setErro(r.erro);
  }, []);

  useEffect(() => {
    // Depois da montagem: a busca começa fora do efeito.
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  const eu = sessao?.pessoaId ?? null;
  const ativas = pessoas?.filter((p) => p.ativa).length ?? 0;
  const visiveis = useMemo(
    () => (pessoas ?? []).filter((p) => filtro === "TODAS" || (filtro === "ATIVAS" ? p.ativa : !p.ativa)),
    [pessoas, filtro],
  );
  const nomes = useMemo(() => new Map((pessoas ?? []).map((p) => [p.id, p.nome])), [pessoas]);
  const proibido = erro?.codigo === "FORBIDDEN";

  async function concluir(texto: string) {
    setCadastro(null);
    setFuncoesDe(null);
    setDesativar(null);
    setFeito(texto);
    await carregar();
  }

  const acoes = (p: PessoaDaEquipe, compacto: boolean) => {
    const c = compacto ? " btn-compacto" : "";
    if (apagada(p)) {
      return (
        <button className={`btn btn-sec${c}`} type="button" aria-label={`Convidar de novo: ${p.nome}`} onClick={() => abrir(() => setCadastro({ reativar: p }))}>
          <Icone nome="envelope" className="ico ico-s" />
          Convidar de novo
        </button>
      );
    }
    if (!p.ativa) {
      return (
        <button className={`btn btn-sec${c}`} type="button" aria-label={`Reativar ${p.nome}`} onClick={() => abrir(() => setCadastro({ reativar: p }))}>
          <Icone nome="reenviar" className="ico ico-s" />
          Reativar
        </button>
      );
    }
    return (
      <>
        <button className={`btn btn-sec${c}`} type="button" aria-label={`Mudar funções de ${p.nome}`} onClick={() => abrir(() => setFuncoesDe(p))}>
          <Icone nome="ajustes" className="ico ico-s" />
          Funções
        </button>
        {p.id !== eu ? (
          <button className={`btn btn-perigo${c}`} type="button" aria-label={`Desativar ${p.nome}`} onClick={() => abrir(() => setDesativar(p))}>
            Desativar
          </button>
        ) : null}
      </>
    );
  };

  return (
    <MolduraConsole atual="equipe" pagina="co-equipe co-carteira" sessao={sessao}
      trilha={[{ nome: "Console", href: CARTEIRA }, { nome: "Administração" }, { nome: "Equipe T3jus" }]}>
      <div>
        <div className="cabeca-ambar campo-ambar cabeca-equipe">
          <div>
            <p className="sobretitulo">Administração</p>
            <h1>Equipe T3jus</h1>
            <span className="fio" aria-hidden="true" />
            <p className="lede">Quem trabalha no Console e o que cada pessoa pode fazer.</p>
          </div>
          {!proibido ? (
            <button className="btn btn-escuro" type="button" style={{ marginBottom: 6 }} onClick={() => abrir(() => setCadastro({ reativar: null }))}>
              <Icone nome="pessoaMais" className="ico" />
              Cadastrar pessoa
            </button>
          ) : null}
        </div>
        {!proibido ? (
          <nav className="abas" aria-label="Seções da equipe">
            <a href={EQUIPE} aria-current={aba === "pessoas" ? "page" : undefined}>
              Pessoas{pessoas ? <span className="q">{ativas}</span> : null}
            </a>
            <a href={`${EQUIPE}?aba=historico`} aria-current={aba === "historico" ? "page" : undefined}>
              Histórico da equipe
            </a>
          </nav>
        ) : null}
      </div>

      {feito ? <Aviso tom="sucesso" titulo={feito} /> : null}

      {proibido ? (
        <Estado icone="cadeado" titulo="Esta página é da Administração." moldura>
          Quem cuida da equipe é quem tem a função Administração. Volte para a carteira para seguir com os seus clientes.
        </Estado>
      ) : erro ? (
        <ErroAoCarregar oque="a equipe" aoTentar={() => void carregar()} />
      ) : (
        <div className="grade">
          <div className="col">
            {aba === "historico" ? (
              <ListaHistorico caminho="/v1/equipe/historico" nomeDe={(id) => nomes.get(id) ?? null} titulo="Histórico da equipe"
                sub="Quem entrou, saiu ou mudou de função. Nada aqui é apagado."
                vazio="Cadastros, mudanças de função e desativações da equipe aparecem aqui, com quem fez e quando." />
            ) : pessoas === null ? (
              <Carregando rotulo="Carregando a equipe…" linhas={5} />
            ) : (
              <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
                <h2 id={`${ids}-t`} className="sr">
                  Pessoas da equipe
                </h2>
                <div className="ferramentas">
                  <div className="chips" role="group" aria-label="Mostrar" style={{ marginLeft: 0 }}>
                    {([["TODAS", `Todas (${pessoas.length})`], ["ATIVAS", `Ativas (${ativas})`], ["DESATIVADAS", `Desativadas (${pessoas.length - ativas})`]] as [Filtro, string][]).map(([k, t]) => (
                      <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <table className="so-pc">
                  <colgroup>
                    <col style={{ width: "29%" }} />
                    <col style={{ width: "21%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "22%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Pessoa</th>
                      <th scope="col">Funções</th>
                      <th scope="col">Desde</th>
                      <th scope="col">Situação</th>
                      <th scope="col">
                        <span className="sr">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((p) => (
                      <tr key={p.id} className={p.ativa ? undefined : "linha-off"}>
                        <td>
                          <div className="esc">
                            <span className={p.ativa ? "av-p forte" : "av-p apagado"} aria-hidden="true">
                              {iniciais(p.nome)}
                            </span>
                            <div>
                              <strong style={{ fontWeight: 500 }}>{p.nome}</strong>
                              {p.id === eu ? <span className="voce">você</span> : null}
                              <small style={{ display: "block", fontSize: 12, color: "var(--texto-2)", overflowWrap: "anywhere" }}>{apagada(p) ? <i className="fc-email-apagado">e-mail apagado</i> : (p.email ?? "E-mail não encontrado")}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="funcoes-lista">
                            {p.funcoes.map((f) => (
                              <span key={f} className="selo selo-neutro">
                                {FUNCOES_CONSOLE[f]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="quando">{dataLonga(p.desde)}</td>
                        <td>
                          <Situacao p={p} />
                          <SaidaDaEntrada p={p} />
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
                    <li key={p.id} className="cartao">
                      <div className="c-topo">
                        <span className={p.ativa ? "av-p forte" : "av-p apagado"} aria-hidden="true">
                          {iniciais(p.nome)}
                        </span>
                        <div>
                          <strong className="c-nome" style={{ fontSize: 18 }}>
                            {p.nome}
                          </strong>
                          {p.id === eu ? <span className="voce">você</span> : null}
                          <small style={{ overflowWrap: "anywhere" }}>
                            {apagada(p) ? <i className="fc-email-apagado">e-mail apagado</i> : (p.email ?? "E-mail não encontrado")}
                          </small>
                          <small>na equipe desde {dataLonga(p.desde)}</small>
                          <SaidaDaEntrada p={p} celular />
                        </div>
                      </div>
                      <div className="c-selos">
                        <Situacao p={p} />
                        {p.funcoes.map((f) => (
                          <span key={f} className="selo selo-neutro">
                            {FUNCOES_CONSOLE[f]}
                          </span>
                        ))}
                      </div>
                      <div className="c-acoes">{acoes(p, false)}</div>
                    </li>
                  ))}
                </ul>
                {pessoas.some((p) => !p.ativa) ? (
                  <p className="fc-regra">
                    <Icone nome="relogio" className="ico" />
                    <span>
                      Quem fica <b>90 dias sem nenhum acesso</b> tem a entrada (e-mail e senha) apagada pela rotina da noite. O nome continua como autor no
                      histórico. Reativar antes disso devolve a mesma entrada; depois, vira um convite novo.
                    </span>
                  </p>
                ) : null}
                {pessoas.length === 1 ? (
                  <Estado icone="pessoaMais" titulo="Só você está na equipe"
                    acoes={
                      <button className="btn btn-pri" type="button" onClick={() => abrir(() => setCadastro({ reativar: null }))}>
                        <Icone nome="pessoaMais" className="ico" />
                        Cadastrar pessoa
                      </button>
                    }>
                    Cadastre quem vai cuidar da implantação, do financeiro e do suporte. Cada pessoa recebe um convite por e-mail.
                  </Estado>
                ) : null}
              </section>
            )}
          </div>
          <aside className="col" aria-label="Funções">
            <FuncoesDef />
          </aside>
        </div>
      )}

      <JanelaCadastro key={`c-${abertura}`} aberta={!!cadastro} reativar={cadastro?.reativar ?? null} pessoas={pessoas ?? []} aoFechar={() => setCadastro(null)}
        aoFeito={(t) => void concluir(t)} />
      <JanelaFuncoes key={`f-${abertura}`} pessoa={funcoesDe} eu={eu} aoFechar={() => setFuncoesDe(null)} aoFeito={(t) => void concluir(t)} />
      <JanelaDesativar key={`d-${abertura}`} pessoa={desativar} aoFechar={() => setDesativar(null)} aoFeito={(t) => void concluir(t)} />
    </MolduraConsole>
  );
}
