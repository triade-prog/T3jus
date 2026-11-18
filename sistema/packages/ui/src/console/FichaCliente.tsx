"use client";
// Ficha do cliente no Console (CO-01..05, PT-20, PT-24), telas aprovadas em
// docs/design/aprovadas/console-ficha.html (aba Sócio) e docs/design/aprovadas/console-v1
// (as outras abas): a abertura com a implantação, as abas e a área de baixo de cada uma.

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  convidarPessoaSchema,
  ESTAGIOS,
  etapasImplantacao,
  TEXTO_CONVITE_CONTA_EXISTENTE,
  type SocioCliente,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { enderecoPessoa } from "./suporte.ts";
import { Icone } from "../Icone.tsx";
import { AbaContrato } from "./AbaContrato.tsx";
import { AbaEquipe } from "./AbaEquipe.tsx";
import { AbaFichaDados } from "./AbaFicha.tsx";
import { AbaHistorico, AbaNotas } from "./AbaNotasHistorico.tsx";
import { ABAS_FICHA, type AbaFicha } from "./abas.ts";
import { conviteVencido, VALIDADE_CONVITE_MS } from "./carteira.ts";
import { formatarCnpj, type FichaDoCliente, type Nota } from "./ficha.ts";
import { CARTEIRA, chamarConsole, MolduraConsole, useSessaoConsole } from "./Moldura.tsx";
import { Aviso as AvisoD2 } from "./pecas.tsx";
import { dataHora, dataLonga, esperando, hora, iniciais } from "./tempo.ts";

export { formatarCnpj, type FichaDoCliente } from "./ficha.ts";

/** Aviso curto da aba Sócio (aprovada antes do D2): erro, sucesso ou informação. */
function Aviso({ tom, children }: { tom: "erro" | "ok" | "info"; children: string }) {
  return <AvisoD2 tom={tom === "erro" ? "urgencia" : tom === "ok" ? "sucesso" : "info"}>{children}</AvisoD2>;
}

function Cabecalho({ f }: { f: FichaDoCliente }) {
  const ids = useId();
  const e = etapasImplantacao({ situacoes: f.situacoes, socios: f.socios, equipe: f.equipe });
  const pode = f.permissoes.includes("console.estagio.mudar");
  const pronta = e.proxima === null;
  const onde = f.escritorio.cidade ? `${f.escritorio.cidade}${f.escritorio.uf ? `, ${f.escritorio.uf}` : ""}` : null;
  const falta = e.lista.filter((x) => !x.feita).map((x) => x.nome);
  return (
    <div className="ficha-cab">
      <div className="esq campo-vinho">
        <Icone nome="coluna" className="ico estatua" />
        <a className="voltar" href={CARTEIRA}>
          <Icone nome="esquerda" className="ico ico-s" />
          Carteira de escritórios
        </a>
        <div className="ident">
          <div>
            <p className="sobretitulo">Escritório</p>
            <h1>{f.escritorio.nome}</h1>
            <p className="meta">
              {f.cliente.estagio === "ATIVO" ? (
                <span className="selo selo-ativo">
                  <span className="bolinha" aria-hidden="true" />
                  {ESTAGIOS.ATIVO}
                </span>
              ) : (
                <span className="selo selo-implant">{ESTAGIOS.IMPLANTACAO}</span>
              )}
              {onde ? <span>{onde}</span> : null}
              <span className="sep" aria-hidden="true" />
              {f.escritorio.cnpj ? <span className="num">{formatarCnpj(f.escritorio.cnpj)}</span> : <span>CNPJ não informado</span>}
              <span className="sep" aria-hidden="true" />
              <span>desde {dataLonga(f.escritorio.criadoEm)}</span>
            </p>
          </div>
        </div>
      </div>
      {f.cliente.estagio === "ATIVO" ? (
        <section className="dir campo-ambar" aria-labelledby={`${ids}-impl`}>
          <p className="sobretitulo" id={`${ids}-impl`}>
            Cliente ativo
          </p>
          <p className="grande">
            Ativo<small>implantação concluída</small>
          </p>
          <p className="dica" style={{ fontSize: 13 }}>
            O escritório já usa o Portal. O motivo da mudança está no histórico.
          </p>
        </section>
      ) : (
        <section className="dir campo-ambar" aria-labelledby={`${ids}-impl`}>
          <p className="sobretitulo" id={`${ids}-impl`}>
            Implantação
          </p>
          <p className="grande">
            {e.feitas} de {e.total}
            <small>etapas</small>
          </p>
          <ol className="etapas">
            {e.lista.map((x) => (
              <li key={x.chave} className={x.chave === e.proxima ? "agora" : x.feita ? undefined : "falta"}
                aria-current={x.chave === e.proxima ? "step" : undefined}>
                <span className="b" aria-hidden="true" />
                {x.nome}
                <span className="sr">{x.feita ? ": resolvido" : ": falta"}</span>
              </li>
            ))}
          </ol>
          {pode ? (
            pronta ? (
              <>
                <a className="btn btn-sec" href={`/clientes/${f.escritorio.id}/contrato?mudar=1`} style={{ alignSelf: "flex-start" }}>
                  Passar para ativo
                </a>
                <p className="dica">Tudo pronto. Pode concluir a implantação.</p>
              </>
            ) : (
              <>
                <button className="btn btn-sec" type="button" aria-disabled="true" aria-describedby={`${ids}-porque`}>
                  Passar para ativo
                </button>
                <p className="dica" id={`${ids}-porque`}>
                  {falta.length === 1 && e.proxima === "SOCIO_NO_PORTAL"
                    ? "Libera quando o sócio entrar no Portal."
                    : `Libera quando as ${e.total} etapas estiverem feitas. Falta: ${falta.join(", ")}.`}
                </p>
              </>
            )
          ) : null}
        </section>
      )}
    </div>
  );
}

const NOMES_CURTOS: Partial<Record<AbaFicha, [string, string]>> = {
  contrato: ["Contrato", " e documentos"],
  equipe: ["Equipe", " T3jus"],
  notas: ["Notas", " internas"],
};

function Abas({ id, aba, f, notas }: { id: string; aba: AbaFicha; f: FichaDoCliente; notas: number | null }) {
  const semSocioNoPortal = !f.socios.some((s) => s.senhaCriadaEm);
  const abas = (Object.keys(ABAS_FICHA) as AbaFicha[]).filter((a) => a !== "historico" || f.permissoes.includes("console.historico.ver"));
  return (
    <nav className="abas" aria-label="Seções do escritório">
      {abas.map((a) => {
        const curto = NOMES_CURTOS[a];
        return (
          <a key={a} href={`/clientes/${id}/${a}`} aria-current={a === aba ? "page" : undefined}>
            {curto ? (
              <span>
                {curto[0]}
                <span className="so-pc-i">{curto[1]}</span>
              </span>
            ) : (
              ABAS_FICHA[a]
            )}
            {a === "notas" && notas ? <span className="q">{notas}</span> : null}
            {a === "socio" && semSocioNoPortal ? (
              <>
                <span className="alerta" aria-hidden="true" />
                <span className="sr">, tem pendência</span>
              </>
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}

/** Cartão de um sócio: estado, dados e o caminho do convite (PT-20). */
function CartaoSocio({ s, f, agora, aoReenviar }: { s: SocioCliente; f: FichaDoCliente; agora: Date; aoReenviar: () => void }) {
  const ids = useId();
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ tom: "ok" | "info" | "erro"; texto: string } | null>(null);
  const entrou = !!s.senhaCriadaEm;
  const vencido = !entrou && conviteVencido(s, agora);
  const podeConvidar = f.permissoes.includes("console.socios.convidar");
  const validoAte = new Date(new Date(s.conviteEnviadoEm).getTime() + VALIDADE_CONVITE_MS).toISOString();
  const primeiro = s.nome.split(/\s+/)[0];

  async function reenviar() {
    setEnviando(true);
    setResultado(null);
    const r = await chamarConsole<{ enviado: boolean }>(`/v1/clientes/${f.escritorio.id}/socios/${s.vinculoId}/reenviar`, { corpo: {} });
    setEnviando(false);
    if (!r.ok) return setResultado({ tom: "erro", texto: textoDoErro(r.erro) });
    setResultado(
      r.dados.enviado
        ? { tom: "ok", texto: `Convite reenviado${s.email ? ` para ${s.email}` : ""}. O link novo vale por 1 hora.` }
        : { tom: "info", texto: TEXTO_CONVITE_CONTA_EXISTENTE },
    );
    aoReenviar();
  }

  return (
    <section className="folha" aria-labelledby={`${ids}-nome`}>
      <div className="socio-topo">
        <span className="av" aria-hidden="true">
          {iniciais(s.nome).slice(0, 1)}
        </span>
        <div>
          <p className="sobretitulo">Sócio dono · {entrou ? "no Portal" : "convidado"}</p>
          <h2 id={`${ids}-nome`}>{s.nome}</h2>
        </div>
        {f.permissoes.includes("console.suporte.ver") ? (
          <a className="btn btn-sec atalho-suporte" href={enderecoPessoa(s.pessoaId)}>
            <Icone nome="escudo" className="ico" />
            Suporte de acesso
            <span className="sr"> de {s.nome}</span>
          </a>
        ) : null}
        {entrou ? (
          <span className="selo selo-ativo">
            <Icone nome="check" className="ico" />
            Entrou no Portal
          </span>
        ) : vencido ? (
          <span className="selo selo-urgente">
            <Icone nome="relogio" className="ico" />
            Link do convite venceu
          </span>
        ) : (
          <span className="selo selo-atencao">
            <Icone nome="relogio" className="ico" />
            Link vale até {hora(validoAte)}
          </span>
        )}
      </div>
      <dl className="dados">
        <div>
          <dt>E-mail</dt>
          <dd>{s.email ?? "Não encontrado"}</dd>
        </div>
        <div>
          <dt>Convidado em</dt>
          <dd className="num">{dataHora(s.desde, agora)}</dd>
        </div>
        <div>
          <dt>Por</dt>
          <dd>{s.convidadoPor ?? "Equipe T3jus"}</dd>
        </div>
      </dl>
      <div className="convite">
        <div className="linha-tempo">
          <h3>Caminho do convite</h3>
          <ol>
            <li className="feito">
              <span className="m" aria-hidden="true">
                <Icone nome="check" className="ico" />
              </span>
              <strong>Convite enviado</strong>
              <small>
                {dataHora(s.conviteEnviadoEm, agora)}
                {s.conviteEnviadoEm !== s.desde ? " · reenviado" : s.convidadoPor ? ` · por ${s.convidadoPor}` : ""}
              </small>
            </li>
            <li className={entrou ? "feito" : "agora"} aria-current={entrou ? undefined : "step"}>
              <span className="m" aria-hidden="true">
                <Icone nome={entrou ? "check" : "relogio"} className="ico" />
              </span>
              <strong>Criar a senha</strong>
              <small>{entrou ? dataHora(s.senhaCriadaEm!, agora) : `Aguardando ${esperando(s.conviteEnviadoEm, agora)}`}</small>
            </li>
            <li className={entrou ? "feito" : undefined}>
              <span className="m" aria-hidden="true">
                <Icone nome={entrou ? "check" : "cadeado"} className="ico" />
              </span>
              <strong>Primeiro acesso ao Portal</strong>
              <small>{entrou ? "Logo depois da senha" : "Depois da senha"}</small>
            </li>
          </ol>
        </div>
        <div className="agir">
          <h3>{entrou ? "Tudo certo" : "O que fazer agora"}</h3>
          {entrou ? (
            <p>
              {primeiro} criou a senha e já entra no Portal como sócio dono. A partir daqui, é quem libera as áreas para a equipe do escritório.
            </p>
          ) : (
            <>
              <p>
                {vencido
                  ? `O link passou de 1 hora sem a senha criada. Reenvie o convite para ${primeiro} receber um link novo.`
                  : `${primeiro} ainda não criou a senha. Se o e-mail não chegou, confira a caixa de spam ou reenvie o convite.`}
              </p>
              {resultado ? <Aviso tom={resultado.tom}>{resultado.texto}</Aviso> : null}
              {podeConvidar ? (
                <button className="btn btn-pri" type="button" onClick={reenviar} disabled={enviando}>
                  <Icone nome="reenviar" className="ico" />
                  {enviando ? "Reenviando…" : "Reenviar convite por e-mail"}
                </button>
              ) : null}
              <p>Ao reenviar, o link anterior deixa de valer e o novo vale por 1 hora.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Convidar o sócio dono (PT-20): nome e e-mail; a conta nasce no Auth e o vínculo no banco. */
function ConvidarSocio({ f, aoConvidar }: { f: FichaDoCliente; aoConvidar: () => void }) {
  const ids = useId();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erros, setErros] = useState<{ nome?: string; email?: string }>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primeiro = f.socios.length === 0;

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setFeito(null);
    const v = convidarPessoaSchema.safeParse({ nome, email });
    if (!v.success) {
      const campos = new Set(v.error.issues.map((i) => String(i.path[0])));
      return setErros({
        nome: campos.has("nome") ? "Escreva o nome completo." : undefined,
        email: campos.has("email") ? "Confira o e-mail: falta o @ ou o final, como .adv.br ou .com.br." : undefined,
      });
    }
    setErros({});
    setEnviando(true);
    const r = await chamarConsole<{ contaNova: boolean }>(`/v1/clientes/${f.escritorio.id}/socios`, { corpo: v.data });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setNome("");
    setEmail("");
    setFeito(r.dados.contaNova ? `Convite enviado para ${v.data.email}. O link vale por 1 hora.` : TEXTO_CONVITE_CONTA_EXISTENTE);
    aoConvidar();
  }

  return (
    <section className="folha" aria-labelledby={`${ids}-titulo`}>
      <div className="folha-cab" style={{ padding: "20px 28px 0" }}>
        <div>
          <h2 id={`${ids}-titulo`}>{primeiro ? "Convidar o sócio dono" : "Convidar outra pessoa como sócio dono"}</h2>
          <p className="sub">
            {primeiro
              ? "A pessoa recebe um e-mail para criar a senha e entra no Portal como sócio dono."
              : "Quem já foi convidado continua como sócio. O novo convite vale por 1 hora."}
          </p>
        </div>
      </div>
      <form className="form" onSubmit={enviar} noValidate>
        {feito ? (
          <div className="campo-largo">
            <Aviso tom="ok">{feito}</Aviso>
          </div>
        ) : null}
        {erro ? (
          <div className="campo-largo">
            <Aviso tom="erro">{textoDoErro(erro)}</Aviso>
          </div>
        ) : null}
        <div className="campo">
          <label htmlFor={`${ids}-nome`}>Nome completo</label>
          <input className="entrada" id={`${ids}-nome`} autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)}
            aria-invalid={erros.nome ? true : undefined} aria-describedby={erros.nome ? `${ids}-nome-erro` : undefined} />
          {erros.nome ? (
            <p className="erro-msg" id={`${ids}-nome-erro`}>
              <Icone nome="alerta" className="ico ico-s" />
              {erros.nome}
            </p>
          ) : null}
        </div>
        <div className="campo">
          <label htmlFor={`${ids}-email`}>E-mail</label>
          <input className="entrada" id={`${ids}-email`} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={erros.email ? true : undefined} aria-describedby={erros.email ? `${ids}-email-erro` : undefined} />
          {erros.email ? (
            <p className="erro-msg" id={`${ids}-email-erro`}>
              <Icone nome="alerta" className="ico ico-s" />
              {erros.email}
            </p>
          ) : null}
        </div>
        <div className="form-pe">
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="envelope" className="ico" />
            {enviando ? "Enviando…" : "Enviar convite"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Lateral({ f, nota }: { f: FichaDoCliente; nota: Nota | null }) {
  const ids = useId();
  const noPortal = f.socios.filter((s) => s.senhaCriadaEm).length;
  const pendente = f.socios.find((s) => !s.senhaCriadaEm);
  return (
    <aside className="col" aria-label="Contexto do escritório">
      <section className="no-portal campo-ambar" aria-labelledby={`${ids}-portal`}>
        <p className="sobretitulo">No Portal</p>
        <h2 id={`${ids}-portal`}>
          {pendente ? `Ao criar a senha, ${pendente.nome.split(/\s+/)[0]} entra como sócio dono.` : "O sócio dono decide quem acessa o quê."}
        </h2>
        <p>O sócio dono libera as áreas para cada pessoa da equipe do escritório. O escritório começa com:</p>
        <ul>
          <li>
            <Icone nome="maleta" className="ico" />
            Comercial
          </li>
          <li>
            <Icone nome="pena" className="ico" />
            Contratos
          </li>
          <li>
            <Icone nome="carteira" className="ico" />
            Financeiro
          </li>
          <li>
            <Icone nome="balanca" className="ico" />
            Jurídico
          </li>
        </ul>
      </section>
      <section className="folha" aria-labelledby={`${ids}-resumo`}>
        <div className="folha-cab" style={{ paddingBottom: 0 }}>
          <h2 id={`${ids}-resumo`} style={{ fontSize: 20 }}>
            Resumo
          </h2>
        </div>
        <dl className="resumo">
          <div>
            <dt>Contrato</dt>
            <dd>{f.cliente.referenciaContrato ?? "Ainda sem referência"}</dd>
          </div>
          <div>
            <dt>Equipe T3jus</dt>
            <dd>{f.equipe.length ? [...new Set(f.equipe.map((p) => p.nome))].join(", ") : "Ninguém atribuído"}</dd>
          </div>
          <div>
            <dt>Sócios no Portal</dt>
            <dd>
              {noPortal} de {f.socios.length} {f.socios.length === 1 ? "convidado" : "convidados"}
            </dd>
          </div>
        </dl>
      </section>
      {nota ? (
        <section className="folha nota" aria-labelledby={`${ids}-nota`}>
          <h2 id={`${ids}-nota`} className="sobretitulo" style={{ fontFamily: "var(--sans)", fontWeight: 500 }}>
            Última nota interna
          </h2>
          <blockquote>“{nota.texto}”</blockquote>
          <footer>
            {nota.autor.nome ?? "Equipe T3jus"} · {dataHora(nota.criadoEm)}
          </footer>
        </section>
      ) : null}
    </aside>
  );
}

export function FichaCliente({ id, aba, editar, mudar, cadastrado }: {
  id: string;
  aba: AbaFicha;
  /** Abrir a aba Ficha já editando (atalho de "Sem contato"). */
  editar?: boolean;
  /** Abrir a janela de mudar o estágio (atalho do cabeçalho). */
  mudar?: boolean;
  /** Escritório recém-cadastrado: mostra o aviso uma vez. */
  cadastrado?: boolean;
}) {
  const sessao = useSessaoConsole();
  const [f, setF] = useState<FichaDoCliente | null>(null);
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  const carregado = useRef(false);

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarConsole<FichaDoCliente>(`/v1/clientes/${id}`);
    setAgora(new Date());
    if (!r.ok) {
      if (r.status !== 401) setErro(r.erro);
      return;
    }
    setF(r.dados);
    if (r.dados.permissoes.includes("console.notas.ver") && aba !== "notas") {
      const n = await chamarConsole<{ notas: Nota[] }>(`/v1/clientes/${id}/notas`);
      if (n.ok) setNotas(n.dados.notas);
    }
  }, [id, aba]);

  useEffect(() => {
    if (carregado.current) return;
    carregado.current = true;
    void carregar();
  }, [carregar]);

  const recarregar = useCallback(() => carregar(), [carregar]);
  const nota = notas?.[0] ?? null;

  const trilha = [
    { nome: "Console", href: CARTEIRA },
    { nome: "Clientes", href: CARTEIRA },
    { nome: f?.escritorio.nome ?? "Escritório" },
  ];

  return (
    <MolduraConsole atual="clientes" pagina="co-ficha" sessao={sessao} trilha={trilha}>
      {erro ? (
        <>
          <a className="voltar" href={CARTEIRA} style={{ color: "var(--vinho)" }}>
            <Icone nome="esquerda" className="ico ico-s" />
            Carteira de escritórios
          </a>
          {erro.codigo === "NOT_FOUND" || erro.codigo === "FORBIDDEN" ? (
            <AvisoD2 tom="urgencia" titulo="Este escritório não está na sua carteira.">
              Ou o endereço está errado. Volte para a carteira e abra o escritório por lá.
            </AvisoD2>
          ) : (
            <div className="estado estado-erro" role="alert">
              <span className="icone-estado">
                <Icone nome="alerta" className="ico" />
              </span>
              <h1>Não deu para abrir a ficha</h1>
              <p>O servidor não respondeu. Nada do que estava salvo se perdeu. Tente de novo em instantes.</p>
              <div className="acoes">
                <button className="btn btn-pri" type="button" onClick={() => void carregar()}>
                  <Icone nome="reenviar" className="ico" />
                  Tentar de novo
                </button>
                <a className="btn btn-sec" href={CARTEIRA}>
                  Voltar para a carteira
                </a>
              </div>
            </div>
          )}
        </>
      ) : f === null ? (
        <div aria-busy="true">
          <p className="sr" role="status">
            Carregando a ficha do escritório…
          </p>
          <div className="ficha-cab" aria-hidden="true">
            <div className="esq campo-vinho cab-esq">
              <span className="esqueleto esq-linha" style={{ width: 180, opacity: 0.35 }} />
              <span className="esqueleto esq-linha" style={{ width: "60%", height: 40, opacity: 0.35 }} />
            </div>
            <div className="dir campo-ambar cab-esq">
              <span className="esqueleto esq-linha" style={{ width: "40%", opacity: 0.5 }} />
              <span className="esqueleto esq-linha" style={{ width: "50%", height: 34, opacity: 0.5 }} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <Cabecalho f={f} />
          <Abas id={id} aba={aba} f={f} notas={notas ? notas.length : null} />
          {cadastrado ? (
            <AvisoD2 tom="sucesso" className="toast" titulo="Escritório cadastrado.">
              Você está atribuída como Administração. Complete a ficha quando puder.
            </AvisoD2>
          ) : null}
          {aba === "socio" ? (
            <div className="grade">
              <div className="col lista-socios">
                {f.socios.map((s) => (
                  <CartaoSocio key={s.vinculoId} s={s} f={f} agora={agora} aoReenviar={() => void carregar()} />
                ))}
                {f.permissoes.includes("console.socios.convidar") ? <ConvidarSocio f={f} aoConvidar={() => void carregar()} /> : null}
                {f.socios.length === 0 && !f.permissoes.includes("console.socios.convidar") ? (
                  <section className="folha em-breve">
                    <h2>Ainda sem sócio</h2>
                    <p>Quem cuida da implantação ou da administração deste cliente convida o sócio dono.</p>
                  </section>
                ) : null}
              </div>
              <Lateral f={f} nota={nota} />
            </div>
          ) : aba === "ficha" ? (
            <AbaFichaDados f={f} nota={nota} recarregar={recarregar} editarAoAbrir={editar} />
          ) : aba === "contrato" ? (
            <AbaContrato f={f} recarregar={recarregar} mudarAoEntrar={mudar} />
          ) : aba === "equipe" ? (
            <AbaEquipe f={f} eu={sessao?.pessoaId ?? null} recarregar={recarregar} />
          ) : aba === "notas" ? (
            <AbaNotas f={f} aoCarregar={setNotas} />
          ) : f.permissoes.includes("console.historico.ver") ? (
            <AbaHistorico f={f} />
          ) : (
            <AvisoD2 tom="info" titulo="O histórico é da Implantação e da Administração.">
              Sua função vê a ficha, os documentos e as notas deste cliente.
            </AvisoD2>
          )}
        </>
      )}
    </MolduraConsole>
  );
}
