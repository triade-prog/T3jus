"use client";
// A OAB de cada advogado (EX-12), tela aprovada em docs/design/aprovadas/portal-equipe-oab
// (Carol, 20/11/2026): a ficha da pessoa na Equipe (só a sócia dona), as janelas de incluir,
// editar e remover a inscrição, os campos da OAB no convite e Sua conta, onde cada pessoa
// confere a própria OAB, só para ler. O servidor confere tudo de novo (0430_equipe_oab.sql).

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  AREAS_PORTAL, fraseOab, UFS_BRASIL, type ContaPortal, type ContratoDoAdvogado, type FichaPessoaEquipe, type InscricaoOab,
  type PessoaEquipePortal, type TipoOab, type UfBrasil,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, Janela } from "../console/pecas.tsx";
import { conferirOab, errosDoServidor, mensagemOab, previaOab, resumoOab, seccional, type CampoOab, type ErrosOab, type RascunhoOab } from "./oab.ts";
import { primeiroNome } from "./equipe.ts";
import { chamarPortal, irPara, MolduraPortal, ROTAS_PORTAL, soConsulta, useEscritorioPortal } from "./Moldura.tsx";
import { JanelaAreas, JanelaRetirar, Toast, type Feito } from "./Equipe.tsx";

const EQUIPE_API = "/v1/escritorio/equipe";
const UFS = Object.keys(UFS_BRASIL).sort() as UfBrasil[];
const diaBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
export const rotaPessoaEquipe = (pessoaId: string) => `${ROTAS_PORTAL.equipe}/pessoas/${pessoaId}`;

/** A linha pequena da lista: "OAB/SP 287.104 · OAB/RJ 245.880-S". Sem OAB, nada. */
export function LinhaOab({ oab }: { oab: InscricaoOab[] }) {
  if (!oab.length) return null;
  return (
    <span className="oe-oab-l">
      <Icone nome="balanca" className="ico" />
      <span className="oe-is">
        {oab.map((i, n) => (
          <span key={i.id} style={{ display: "contents" }}>
            {n ? (
              <>
                <span className="oe-sep" aria-hidden="true">·</span>
                <span className="sr">, </span>
              </>
            ) : null}
            <span className="oe-i">{i.texto}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

/** O nome que leva à ficha da pessoa. */
export function NomeComFicha({ p }: { p: Pick<PessoaEquipePortal, "pessoaId" | "nome"> }) {
  return (
    <a className="oe-nome" href={rotaPessoaEquipe(p.pessoaId)}>
      {p.nome}
      <span className="sr">, abrir a ficha</span>
    </a>
  );
}

/** "No contrato e na procuração: …", que muda enquanto se digita. */
export function PreviaOab({ texto }: { texto: string }) {
  return (
    <p className="oe-previa" aria-live="polite">
      <Icone nome="pena" className="ico" />
      <span>
        No contrato e na procuração: <b>{texto}</b>
      </span>
    </p>
  );
}

/** UF, número e letra numa linha, com o erro preso a cada campo. */
export function CamposOab({ pref, valor, aoMudar, erros, mensagens, foco }: {
  pref: string;
  valor: RascunhoOab;
  aoMudar: (v: RascunhoOab) => void;
  erros: ErrosOab;
  mensagens: Partial<Record<CampoOab, string>>;
  /** O campo que recebe o foco quando a janela abre. */
  foco?: "uf" | "numero";
}) {
  const aj = (c: CampoOab, t: string) => (erros[c] ? null : <p className="ajuda" id={`${pref}-${c}-aj`}>{t}</p>);
  const er = (c: CampoOab) => (erros[c] ? <ErroCampo id={`${pref}-${c}-er`}>{mensagens[c]}</ErroCampo> : null);
  const desc = (c: CampoOab, ajuda: boolean) => descritoPor(ajuda && !erros[c] && `${pref}-${c}-aj`, erros[c] && `${pref}-${c}-er`);
  return (
    <div className="oe-linha">
      <div className="campo oe-uf-c">
        <label htmlFor={`${pref}-uf`}>UF da seccional</label>
        <select className="entrada" id={`${pref}-uf`} value={valor.uf} data-foco={foco === "uf" ? true : undefined}
          onChange={(e) => aoMudar({ ...valor, uf: e.target.value })} aria-invalid={erros.uf ? true : undefined} aria-describedby={desc("uf", false)}>
          <option value="">Escolha</option>
          {UFS.map((u) => (
            <option key={u} value={u}>{`${u} · ${UFS_BRASIL[u]}`}</option>
          ))}
        </select>
        {er("uf")}
      </div>
      <div className="campo">
        <label htmlFor={`${pref}-numero`}>Número</label>
        <input className="entrada" id={`${pref}-numero`} type="text" inputMode="numeric" autoComplete="off" value={valor.numero}
          data-foco={foco === "numero" ? true : undefined}
          onChange={(e) => aoMudar({ ...valor, numero: e.target.value })} aria-invalid={erros.numero ? true : undefined} aria-describedby={desc("numero", true)} />
        {aj("numero", "Só os números, até 6. Os pontos o T3jus põe.")}
        {er("numero")}
      </div>
      <div className="campo">
        <label htmlFor={`${pref}-letra`}>
          Letra <span className="opcional">(opcional)</span>
        </label>
        <input className="entrada" id={`${pref}-letra`} type="text" autoComplete="off" autoCapitalize="characters" size={2} value={valor.letra}
          onChange={(e) => aoMudar({ ...valor, letra: e.target.value.toUpperCase() })} aria-invalid={erros.letra ? true : undefined} aria-describedby={desc("letra", true)} />
        {aj("letra", "Só se a carteira tiver.")}
        {er("letra")}
      </div>
    </div>
  );
}

/** Resumo de erros no topo, com links para os campos. */
function ResumoErros({ pontos, oque }: { pontos: { id: string; texto: string }[]; oque: string }) {
  if (!pontos.length) return null;
  return (
    <Aviso tom="urgencia" titulo={faltaAcertar(pontos.length)}
      acoes={<ul>{pontos.map((p) => <li key={p.id}><a href={`#${p.id}`}>{p.texto}</a></li>)}</ul>}>
      {oque}
    </Aviso>
  );
}

type PessoaOab = Pick<FichaPessoaEquipe, "pessoaId" | "nome" | "oab">;

/** Adicionar ou editar uma inscrição (decisões 3, 4 e 8 a 13). */
export function JanelaOab({ pessoa, editar, aberta, escritorio, aoFechar, aoFeito }: {
  pessoa: PessoaOab;
  editar: InscricaoOab | null;
  aberta: boolean;
  escritorio?: string;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
}) {
  const ids = useId();
  const pref = `${ids}-o`;
  const corpo = useRef<HTMLDivElement>(null);
  const pn = primeiroNome(pessoa.nome);
  const principal = pessoa.oab.find((i) => i.tipo === "PRINCIPAL" && i.id !== editar?.id) ?? null;
  const [r, setR] = useState<RascunhoOab>({ uf: editar?.uf ?? "", numero: editar?.numero ?? "", letra: editar?.letra ?? "" });
  const [tipo, setTipo] = useState<TipoOab>(editar?.tipo ?? (principal ? "SUPLEMENTAR" : "PRINCIPAL"));
  const [erros, setErros] = useState<ErrosOab>({});
  const [outro, setOutro] = useState<string | undefined>();
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const previa = previaOab(r);
  const outras = pessoa.oab.filter((i) => i.id !== editar?.id).map((i) => (principal && tipo === "PRINCIPAL" && i.id === principal.id ? { ...i, tipo: "SUPLEMENTAR" as const } : i));
  const frase = previa ? fraseOab([...outras, { uf: r.uf as UfBrasil, numero: r.numero.replace(/\D/g, "").replace(/^0+/, ""), letra: r.letra.trim() || null, tipo }]) : null;
  const texto = (c: CampoOab, cod: string) => mensagemOab(c, cod, pessoa.nome, { nome: outro, texto: previa?.replace(" nº", "") });
  const mensagens = Object.fromEntries(Object.entries(erros).map(([c, cod]) => [c, texto(c as CampoOab, cod!)]));
  const pontos = (Object.entries(erros) as [CampoOab, string][]).map(([c, cod]) => ({ id: `${pref}-${c === "tipo" ? "tipo-0" : c}`, texto: resumoOab(c, cod, { nome: outro }) }));

  const ajudaTipo = editar
    ? principal
      ? `${pn} já tem a principal, ${principal.texto}. Se marcar esta como principal, a de ${principal.uf} passa a suplementar.`
      : "É a principal de " + pn + ": vem primeiro nos documentos."
    : principal
      ? `${pn} já tem a principal, ${principal.texto}. Se marcar esta como principal, a de ${principal.uf} passa a suplementar.`
      : `É a primeira inscrição de ${pn}, então vem como principal.`;

  async function salvar() {
    setFalha(null);
    setOutro(undefined);
    const e = conferirOab(r);
    setErros(e);
    if (Object.keys(e).length) return requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
    setEnviando(true);
    const dados = { uf: r.uf, numero: r.numero, letra: r.letra.trim() || null, tipo, trocarPrincipal: tipo === "PRINCIPAL" && !!principal };
    const x = editar
      ? await chamarPortal<InscricaoOab & { frase: string | null }>(`${EQUIPE_API}/oab/${editar.id}`, { metodo: "PUT", corpo: { ...dados, versao: editar.versao } })
      : await chamarPortal<InscricaoOab & { frase: string | null }>(`${EQUIPE_API}/pessoas/${pessoa.pessoaId}/oab`, { corpo: dados });
    setEnviando(false);
    if (!x.ok) {
      const s = errosDoServidor(x.erro.detalhes);
      if (s && Object.keys(s.erros).length) {
        setErros(s.erros);
        setOutro(s.nome);
        return requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      }
      return setFalha(x.erro);
    }
    aoFeito({
      titulo: `Inscrição de ${pessoa.nome} salva.`,
      texto: `${x.dados.texto} já vale para os contratos e procurações gerados daqui em diante. Ficou no histórico da equipe.`,
    });
  }

  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} sobretitulo={`Equipe · ${escritorio ? escritorio : pessoa.nome}`} descricao={`${ids}-d`}
      titulo={editar ? `Editar a inscrição ${editar.texto}` : "Adicionar inscrição na OAB"} aoEnviar={() => void salvar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="check" className="ico" />
            {enviando ? "Salvando…" : "Salvar inscrição"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>
          {editar
            ? "Como está na carteira da OAB. A mudança vale para os contratos e procurações gerados daqui em diante."
            : "Como está na carteira da OAB. Vale para os contratos e procurações gerados daqui em diante."}
        </p>
        <ResumoErros pontos={pontos} oque="A inscrição ainda não foi salva." />
        {falha ? (
          <Aviso tom="urgencia" titulo="A inscrição não foi salva.">
            {falha.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou esta inscrição agora há pouco. Feche e abra de novo para ver como ficou." : textoDoErro(falha)}
          </Aviso>
        ) : null}
        <CamposOab pref={pref} valor={r} aoMudar={setR} erros={erros} mensagens={mensagens} foco={editar ? "numero" : "uf"} />
        <fieldset className="oe-grupo" aria-describedby={descritoPor(`${pref}-tipo-aj`, erros.tipo && `${pref}-tipo-er`)}>
          <legend>Tipo de inscrição</legend>
          <div className="oe-tipos">
            {(["PRINCIPAL", "SUPLEMENTAR"] as const).map((t, n) => (
              <label key={t} className="opcao">
                <input className="marcar" type="radio" name={`${pref}-tipo`} id={`${pref}-tipo-${n}`} checked={tipo === t} onChange={() => setTipo(t)} />
                <span>
                  {t === "PRINCIPAL" ? "Principal" : "Suplementar"}
                  <small>{t === "PRINCIPAL" ? "A de origem. Vem primeiro nos documentos." : "Para atuar em outra UF. Vem depois da principal."}</small>
                </span>
              </label>
            ))}
          </div>
          <p className="ajuda" id={`${pref}-tipo-aj`}>{ajudaTipo}</p>
          {erros.tipo ? <ErroCampo id={`${pref}-tipo-er`}>{mensagens.tipo}</ErroCampo> : null}
        </fieldset>
        {frase ? <PreviaOab texto={`${pessoa.nome}, ${frase}`} /> : null}
      </div>
    </Janela>
  );
}

/** Remover a inscrição (alertdialog, foco no Voltar; decisão 5). */
export function JanelaRemoverOab({ pessoa, inscricao, aoFechar, aoFeito }: {
  pessoa: PessoaOab;
  inscricao: InscricaoOab | null;
  aoFechar: () => void;
  aoFeito: (f: Feito) => void;
}) {
  const ids = useId();
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const pn = primeiroNome(pessoa.nome);
  const resto = inscricao ? fraseOab(pessoa.oab.filter((i) => i.id !== inscricao.id)).replace(/ nº /g, " ") : "";

  async function remover() {
    if (!inscricao) return;
    setFalha(null);
    setEnviando(true);
    const x = await chamarPortal<{ frase: string | null }>(`${EQUIPE_API}/oab/${inscricao.id}/remover`, { corpo: { versao: inscricao.versao } });
    setEnviando(false);
    if (!x.ok) return setFalha(x.erro);
    aoFeito({ titulo: `${inscricao.texto} removida.`, texto: `Os documentos de ${pn} gerados daqui em diante já saem sem ela. A remoção ficou no histórico da equipe.` });
  }

  return (
    <Janela id={`${ids}-j`} aberta={!!inscricao} aoFechar={aoFechar} alerta sobretitulo={`Equipe · ${pessoa.nome}`} descricao={`${ids}-d`}
      titulo={`Remover ${inscricao?.texto ?? ""} de ${pn}?`} aoEnviar={() => void remover()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco>
            Voltar
          </button>
          <button className="btn btn-perigo" type="submit" disabled={enviando}>
            {enviando ? "Removendo…" : "Remover a inscrição"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>
        {resto ? `Os documentos gerados daqui em diante saem só com ${resto}.` : `Os documentos gerados daqui em diante não trazem ${pn} como advogado.`}
      </p>
      {falha ? <Aviso tom="urgencia" titulo="A inscrição não foi removida.">{textoDoErro(falha)}</Aviso> : null}
      <p className="pt-comuns">
        <Icone nome="doc" className="ico" />
        <span>Contratos e procurações já gerados não mudam: cada arquivo guarda a OAB do dia em que foi gerado. A remoção fica no histórico da equipe, com seu nome e a hora.</span>
      </p>
    </Janela>
  );
}

function ItemInscricao({ pessoa, i, aoEditar, aoRemover }: { pessoa: string; i: InscricaoOab; aoEditar?: () => void; aoRemover?: () => void }) {
  const pn = primeiroNome(pessoa);
  return (
    <li>
      <span className="oe-uf" aria-hidden="true">
        {i.uf}
      </span>
      <div className="oe-q">
        <strong>{i.texto}</strong>
        <small>
          {i.tipo === "PRINCIPAL" ? "Principal" : "Suplementar"} · {seccional(i.uf)}
        </small>
      </div>
      {aoEditar && aoRemover ? (
        <div className="oe-bts">
          <button className="btn btn-sec btn-compacto" type="button" aria-label={`Editar a inscrição ${i.texto} de ${pn}`} onClick={aoEditar}>
            <Icone nome="lapis" className="ico ico-s" />
            Editar
          </button>
          <button className="btn btn-perigo btn-compacto" type="button" aria-label={`Remover a inscrição ${i.texto} de ${pn}`} onClick={aoRemover}>
            Remover
          </button>
        </div>
      ) : null}
    </li>
  );
}

const ESTADO_CONTRATO: Record<ContratoDoAdvogado["estado"], ReactNode> = {
  ATIVO: <span className="selo selo-ativo">Ativo</span>,
  ELABORACAO: (
    <span className="selo selo-andamento">
      <Icone nome="lapis" className="ico" />
      Em elaboração
    </span>
  ),
  ENCERRADO: <span className="selo selo-neutro">Encerrado</span>,
};

function OndeAssina({ titulo, sub, contratos, conta }: { titulo: string; sub: string; contratos: ContratoDoAdvogado[]; conta?: boolean }) {
  if (!contratos.length) return null;
  return (
    <section className="folha" aria-labelledby="t-uso">
      <div className="folha-cab" style={{ paddingBottom: 6 }}>
        <div>
          <h2 id="t-uso" style={{ fontSize: 20 }}>
            {titulo}
          </h2>
          <p className="sub">{sub}</p>
        </div>
      </div>
      <ul className="oe-uso">
        {contratos.map((c) => (
          <li key={c.id}>
            <div>
              <a href={`/contratos/${c.id}`}>
                {c.numero}
                {c.cliente ? ` · ${c.cliente}` : ""}
              </a>
              <small>
                {c.responsavel ? "Responsável" : "Advogado no contrato"}
                {conta && c.inscricoes ? (
                  <>
                    {" · "}
                    <span className="oe-uso-ins">{c.inscricoes.replace(/ nº /g, " ")}</span>
                  </>
                ) : null}
              </small>
            </div>
            {ESTADO_CONTRATO[c.estado]}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A ficha da pessoa na Equipe (decisão 2): só a sócia dona. */
export function EquipePessoaPortal({ pessoaId }: { pessoaId: string }) {
  const { escritorio, erro: erroEscritorio, recarregar } = useEscritorioPortal();
  const [ficha, setFicha] = useState<FichaPessoaEquipe | null>(null);
  const [pessoas, setPessoas] = useState<PessoaEquipePortal[]>([]);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [janela, setJanela] = useState<"nova" | "areas" | "retirar" | null>(null);
  const [editar, setEditar] = useState<InscricaoOab | null>(null);
  const [remover, setRemover] = useState<InscricaoOab | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [abertura, setAbertura] = useState(0);

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarPortal<FichaPessoaEquipe>(`${EQUIPE_API}/pessoas/${pessoaId}`);
    if (r.ok) setFicha(r.dados);
    else if (r.status !== 401 && r.erro.codigo !== "ESCRITORIO_REQUIRED") setErro(r.erro);
    const q = await chamarPortal<{ pessoas: PessoaEquipePortal[] }>(EQUIPE_API);
    if (q.ok) setPessoas(q.dados.pessoas);
  }, [pessoaId]);

  const dono = escritorio?.dono;
  useEffect(() => {
    if (dono) void Promise.resolve().then(() => carregar());
  }, [dono, carregar]);

  const abrir = (f: () => void) => {
    setFeito(null);
    setAbertura((n) => n + 1);
    f();
  };
  async function concluir(f: Feito) {
    setJanela(null);
    setEditar(null);
    setRemover(null);
    setFeito(f);
    await carregar();
  }

  const nome = ficha?.nome ?? "Pessoa da equipe";
  const trilha = [{ nome: "Escritório", href: ROTAS_PORTAL.escritorio }, { nome: "Equipe", href: ROTAS_PORTAL.equipe }, { nome }];
  if (erroEscritorio) {
    return (
      <MolduraPortal atual="equipe" trilha={trilha} escritorio={null}>
        <ErroAoCarregar oque="a ficha da pessoa" aoTentar={recarregar} />
      </MolduraPortal>
    );
  }
  if (escritorio && !escritorio.dono) {
    return (
      <MolduraPortal atual={null} trilha={[{ nome: "Equipe" }]} escritorio={escritorio}>
        <Estado icone="cadeado" titulo="Esta página é do sócio dono" nivel={1} moldura
          acoes={
            <a className="btn btn-pri" href={ROTAS_PORTAL.conta}>
              <Icone nome="balanca" className="ico" />
              Ver a sua OAB
            </a>
          }>
          {`Quem muda a equipe e as inscrições na OAB é ${escritorio.socios[0] ?? "o sócio dono"}. A sua OAB você confere em Sua conta.`}
        </Estado>
      </MolduraPortal>
    );
  }
  const consulta = soConsulta(escritorio);
  return (
    <MolduraPortal atual="equipe" trilha={trilha} escritorio={escritorio} pagina="co-equipe">
      {erro ? (
        erro.codigo === "NOT_FOUND" ? (
          <Estado icone="pessoas" titulo="Esta pessoa não está na equipe" nivel={1} moldura
            acoes={<a className="btn btn-pri" href={ROTAS_PORTAL.equipe}>Voltar para a Equipe</a>}>
            Ela pode ter sido retirada. Quem saiu aparece no filtro “Retiradas” da Equipe.
          </Estado>
        ) : (
          <ErroAoCarregar oque="a ficha da pessoa" aoTentar={() => void carregar()} />
        )
      ) : !ficha || !escritorio ? (
        <Carregando rotulo="Carregando a ficha…" linhas={5} />
      ) : (
        <div className="hn">
          <div className="ficha-cab">
            <div className="esq campo-vinho">
              <Icone nome="cracha" className="ico estatua" />
              <a className="voltar" href={ROTAS_PORTAL.equipe}>
                <Icone nome="esquerda" className="ico ico-s" />
                Equipe
              </a>
              <div className="ident">
                <div>
                  <p className="sobretitulo">Pessoa da equipe</p>
                  <h1>{ficha.nome}</h1>
                  <p className="meta">
                    <span className={`selo selo-${ficha.senhaCriadaEm ? "ativo" : "neutro"}`}>{ficha.senhaCriadaEm ? "Ativa" : "Convite pendente"}</span>
                    <span>
                      {ficha.email ?? "E-mail não encontrado"} · na equipe desde {diaBr(ficha.desde)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <section className="dir campo-ambar" aria-labelledby="t-assina">
              <p className="sobretitulo" id="t-assina">
                Como sai no contrato e na procuração
              </p>
              {ficha.frase ? (
                <>
                  <p className="oe-assina">
                    {ficha.nome}, {ficha.frase}
                  </p>
                  <p className="dica">Vale para os documentos gerados daqui em diante. Os já gerados guardam a OAB do dia.</p>
                </>
              ) : (
                <>
                  <p className="oe-assina-vazia">Sem OAB cadastrada</p>
                  <p className="dica">
                    {primeiroNome(ficha.nome)} não aparece como advogado nos contratos e procurações. Se {primeiroNome(ficha.nome)} é advogado, cadastre a inscrição.
                  </p>
                  {consulta ? null : (
                    <button className="btn btn-pri" type="button" data-muda onClick={() => abrir(() => setJanela("nova"))}>
                      <Icone nome="mais" className="ico" />
                      Adicionar inscrição
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
          <div className="hn-grade">
            <div className="hn-col">
              <section className="folha" aria-labelledby="t-insc" style={{ overflow: "hidden" }}>
                <div className="folha-cab">
                  <div>
                    <h2 id="t-insc">Inscrições na OAB</h2>
                    <p className="sub">Opcional: só para quem é advogado. A principal vem primeiro nos documentos.</p>
                  </div>
                  {consulta ? null : (
                    <div className="acoes">
                      <button className="btn btn-sec" type="button" onClick={() => abrir(() => setJanela("nova"))}>
                        <Icone nome="mais" className="ico" />
                        Adicionar inscrição
                      </button>
                    </div>
                  )}
                </div>
                {ficha.oab.length ? (
                  <ul className="oe-insc">
                    {ficha.oab.map((i) => (
                      <ItemInscricao key={i.id} pessoa={ficha.nome} i={i}
                        aoEditar={consulta ? undefined : () => abrir(() => setEditar(i))} aoRemover={consulta ? undefined : () => abrir(() => setRemover(i))} />
                    ))}
                  </ul>
                ) : (
                  <Estado icone="balanca" titulo="Nenhuma inscrição cadastrada">
                    {`Se ${primeiroNome(ficha.nome)} é advogado, cadastre a OAB para entrar nos contratos e procurações. Para quem não é advogado, como a recepção e o financeiro, deixe assim.`}
                  </Estado>
                )}
                <p className="pt-pe-folha">
                  <Icone nome="historico" className="ico" />
                  <span>Só a sócia dona muda as inscrições. Cada mudança fica no histórico da equipe, com quem fez e quando.</span>
                </p>
              </section>
              <OndeAssina titulo={`Onde ${primeiroNome(ficha.nome)} assina como advogado`} contratos={ficha.oab.length ? ficha.contratos : []}
                sub="Contratos em que a pessoa está marcada como advogada. Os documentos novos destes contratos já saem com as inscrições acima." />
            </div>
            <aside className="hn-col" aria-label={`Sobre ${ficha.nome}`}>
              <section className="folha" aria-labelledby="t-ar">
                <div className="folha-cab" style={{ paddingBottom: 8 }}>
                  <div>
                    <h2 id="t-ar" style={{ fontSize: 20 }}>
                      Áreas liberadas
                    </h2>
                  </div>
                </div>
                <div className="oe-areas-f">
                  <div className="pt-areas">
                    {ficha.dono ? (
                      <span className="selo selo-ativo">Vê tudo</span>
                    ) : ficha.areas.length ? (
                      ficha.areas.map((a) => <span key={a} className="selo selo-neutro">{AREAS_PORTAL[a]}</span>)
                    ) : (
                      <span className="fc-saida">Só as partes comuns</span>
                    )}
                  </div>
                  {ficha.dono || consulta ? null : (
                    <button className="btn btn-sec" type="button" onClick={() => abrir(() => setJanela("areas"))}>
                      <Icone nome="funcoes" className="ico" />
                      Mudar áreas<span className="sr"> de {primeiroNome(ficha.nome)}</span>
                    </button>
                  )}
                </div>
              </section>
              <section className="folha" aria-labelledby="t-ac">
                <div className="folha-cab" style={{ paddingBottom: 8 }}>
                  <div>
                    <h2 id="t-ac" style={{ fontSize: 20 }}>
                      Acesso
                    </h2>
                  </div>
                </div>
                <dl className="hn-dl">
                  <div>
                    <dt>E-mail</dt>
                    <dd style={{ overflowWrap: "anywhere" }}>{ficha.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Na equipe desde</dt>
                    <dd>{diaBr(ficha.desde)}</dd>
                  </div>
                  <div>
                    <dt>Situação</dt>
                    <dd>{ficha.dono ? "Sócia dona" : ficha.senhaCriadaEm ? "Ativa" : "Convite pendente"}</dd>
                  </div>
                </dl>
                {ficha.dono || consulta || !ficha.senhaCriadaEm ? null : (
                  <div className="oe-areas-f">
                    <button className="btn btn-perigo" type="button" onClick={() => abrir(() => setJanela("retirar"))}>
                      Retirar {primeiroNome(ficha.nome)} da equipe
                    </button>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      )}
      {feito ? <Toast titulo={feito.titulo} texto={feito.texto} aoFechar={() => setFeito(null)} /> : null}
      {ficha && escritorio ? (
        <>
          <JanelaOab key={`n-${abertura}`} pessoa={ficha} editar={null} aberta={janela === "nova"} aoFechar={() => setJanela(null)} aoFeito={(f) => void concluir(f)} />
          <JanelaOab key={`e-${abertura}`} pessoa={ficha} editar={editar} aberta={!!editar} aoFechar={() => setEditar(null)} aoFeito={(f) => void concluir(f)} />
          <JanelaRemoverOab key={`r-${abertura}`} pessoa={ficha} inscricao={remover} aoFechar={() => setRemover(null)} aoFeito={(f) => void concluir(f)} />
          <JanelaAreas key={`a-${abertura}`} pessoa={janela === "areas" ? ficha : null} escritorio={escritorio.nome} aoFechar={() => setJanela(null)}
            aoFeito={(f) => void concluir(f)} />
          <JanelaRetirar key={`x-${abertura}`} pessoa={janela === "retirar" ? ficha : null} pessoas={pessoas} escritorio={escritorio.nome} aoFechar={() => setJanela(null)}
            aoFeito={() => irPara(ROTAS_PORTAL.equipe)} />
        </>
      ) : null}
    </MolduraPortal>
  );
}

/** Sua conta (decisão 7): os próprios dados e a OAB, só para ler. */
export function ContaPortalPagina() {
  const { escritorio, erro: erroEscritorio, recarregar } = useEscritorioPortal();
  const [conta, setConta] = useState<ContaPortal | null>(null);
  const [erro, setErro] = useState(false);
  const carregar = useCallback(async () => {
    setErro(false);
    const r = await chamarPortal<ContaPortal>("/v1/escritorio/conta");
    if (r.ok) setConta(r.dados);
    else if (r.status !== 401 && r.erro.codigo !== "ESCRITORIO_REQUIRED") setErro(true);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  const trilha = [{ nome: "Sua conta" }];
  if (erroEscritorio || erro) {
    return (
      <MolduraPortal atual="conta" trilha={trilha} escritorio={escritorio}>
        <ErroAoCarregar oque="a sua conta" aoTentar={() => (erroEscritorio ? recarregar() : void carregar())} />
      </MolduraPortal>
    );
  }
  const dona = conta?.socios[0] ?? "a sócia dona";
  return (
    <MolduraPortal atual="conta" trilha={trilha} escritorio={escritorio}>
      {!conta ? (
        <Carregando rotulo="Carregando a sua conta…" linhas={4} />
      ) : (
        <div className="hn">
          <div className="ficha-cab oe-conta-cab">
            <div className="esq campo-vinho">
              <Icone nome="cracha" className="ico estatua" />
              <div className="ident">
                <div>
                  <p className="sobretitulo">Sua conta</p>
                  <h1>{conta.nome}</h1>
                  <p className="meta">
                    <span className="selo selo-ativo">Ativa</span>
                    <span>
                      {conta.email ?? ""} · na equipe desde {diaBr(conta.desde)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <section className="dir campo-ambar" aria-labelledby="t-assina">
              <p className="sobretitulo" id="t-assina">
                Como você sai no contrato e na procuração
              </p>
              {conta.frase ? (
                <>
                  <p className="oe-assina">
                    {conta.nome}, {conta.frase}
                  </p>
                  <p className="dica">É o padrão: todas as suas inscrições, a principal primeiro. Em cada contrato, quem o cria pode deixar uma de fora.</p>
                </>
              ) : (
                <>
                  <p className="oe-assina-vazia">Sem OAB cadastrada</p>
                  <p className="dica">
                    Você não aparece como advogado nos contratos e procurações. Para a recepção e o financeiro, é o normal.
                    {conta.dono ? " Se você é advogado, cadastre a sua inscrição na Equipe." : ` Se você é advogado, peça a ${dona}, sócia dona, para cadastrar a sua inscrição.`}
                  </p>
                  {conta.dono ? (
                    <a className="btn btn-pri" href={rotaPessoaEquipe(conta.pessoaId)}>
                      <Icone nome="mais" className="ico" />
                      Cadastrar na Equipe
                    </a>
                  ) : null}
                </>
              )}
            </section>
          </div>
          <div className="hn-grade">
            <div className="hn-col">
              <section className="folha" aria-labelledby="t-insc" style={{ overflow: "hidden" }}>
                <div className="folha-cab">
                  <div>
                    <h2 id="t-insc">Suas inscrições na OAB</h2>
                    <p className="sub">{conta.oab.length ? "Para conferir com a sua carteira da OAB. A principal vem primeiro nos documentos." : "Só para quem é advogado."}</p>
                  </div>
                </div>
                {conta.oab.length ? (
                  <ul className="oe-insc">
                    {conta.oab.map((i) => (
                      <ItemInscricao key={i.id} pessoa={conta.nome} i={i} />
                    ))}
                  </ul>
                ) : (
                  <Estado icone="balanca" titulo="Nenhuma inscrição cadastrada">
                    Se você é advogado, a sua OAB entra aqui quando a sócia dona cadastrar na Equipe.
                  </Estado>
                )}
                <p className="oe-pe-conta">
                  <Icone nome="cadeado" className="ico" />
                  <span>
                    Algum número diferente da sua carteira? <b>{conta.dono ? "Corrija na Equipe:" : `Fale com ${dona}, sócia dona:`}</b> só ela muda a equipe. A correção
                    vale para os documentos gerados depois; os já gerados guardam a OAB do dia.
                  </span>
                </p>
              </section>
              <OndeAssina titulo="Onde você assina como advogado" sub="Contratos em que você está marcado, com as inscrições que vão nos documentos de cada um."
                contratos={conta.oab.length ? conta.contratos : []} conta />
            </div>
            <aside className="hn-col" aria-label="Seu acesso">
              <section className="folha" aria-labelledby="t-ac">
                <div className="folha-cab" style={{ paddingBottom: 8 }}>
                  <div>
                    <h2 id="t-ac" style={{ fontSize: 20 }}>
                      Seu acesso
                    </h2>
                  </div>
                </div>
                <dl className="hn-dl">
                  <div>
                    <dt>E-mail</dt>
                    <dd style={{ overflowWrap: "anywhere" }}>{conta.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Na equipe desde</dt>
                    <dd>{diaBr(conta.desde)}</dd>
                  </div>
                </dl>
                <div className="oe-areas-f">
                  <p className="oe-rot">Áreas que você abre</p>
                  <div className="pt-areas">
                    {conta.dono ? (
                      <span className="selo selo-ativo">Vê tudo</span>
                    ) : conta.areas.length ? (
                      conta.areas.map((a) => <span key={a} className="selo selo-neutro">{AREAS_PORTAL[a]}</span>)
                    ) : (
                      <span className="fc-saida">Só as partes comuns</span>
                    )}
                  </div>
                </div>
                <p className="oe-pe-conta">
                  <Icone nome="ajuda" className="ico" />
                  <span>Quem muda as áreas e as inscrições é a sócia dona, na Equipe.</span>
                </p>
              </section>
            </aside>
          </div>
        </div>
      )}
    </MolduraPortal>
  );
}
