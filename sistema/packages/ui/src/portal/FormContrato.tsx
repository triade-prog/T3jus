"use client";
// Novo contrato e mudar contrato (CH-01 a CH-04, CH-06, IN-01), desenho aprovado em
// docs/design/aprovadas/portal-comercial-contratos (estados novo, novo-tipos e novo-erros;
// decisões 11 a 17): uma página em quatro passos (cliente e casos, responsáveis, condições e
// cláusulas) com o resumo "O que este contrato gera" ao lado (no celular, antes do botão).
// Vindo da proposta aceita, tudo chega preenchido. Mudar um contrato ativo pede o motivo.
// F3.181 (desenho portal-exclusao-contratos-conversas): a proposta de cliente excluído ou arquivado a
// pedido do titular não vira contrato (CLIENTE_EXCLUIDO, CLIENTE_ARQUIVADO), com um aviso no molde do
// "Esta proposta não está aceita".

import { useEffect, useRef, useState } from "react";
import {
  AREAS_DIREITO, conferirCondicao, dataBr, hojeBrasilia, reais,
  type ClienteLinha, type Condicao, type FichaContrato, type ListaClientes, type PessoaComOab, type PropostaParaContrato,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, useFocoDepoisDoCommit } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { diaCurto } from "./agenda.ts";
import { resumoContrato, ROTAS_CONTRATOS } from "./contratos.ts";
import { AdvogadosOab, idErroInscricao } from "./ContratoOab.tsx";
import { EditorCondicoes, errosPorCondicao, idDoErro } from "./Honorarios.tsx";
import { lerCondicao, mensagemCampo, rascunhoDe, type RascunhoCondicao } from "./honorarios.ts";
import { chamarPortal, irPara, ROTAS_PORTAL, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Pessoa = PessoaComOab;

interface Rascunho {
  clienteId: string;
  objeto: string;
  /** A área do direito (F3.111): opcional, leva a área ao caso aberto na assinatura. */
  area: string;
  responsavelId: string;
  advogados: string[];
  /** As inscrições escolhidas de cada advogado (EX-12); sem a pessoa, vão todas. */
  inscricoes: Record<string, string[]>;
  condicoes: RascunhoCondicao[];
  observacoes: string;
  motivo: string;
}

const MSG: Record<string, string> = {
  clienteId: "Escolha o cliente. O contrato é sempre de alguém que está em Clientes.",
  propostaId: "A proposta não é deste cliente. Abra o contrato a partir da proposta de novo.",
  objeto: "Escreva o objeto do contrato, de 2 a 400 letras. Ex.: Aposentadoria por idade.",
  responsavelId: "Escolha quem responde pelo contrato.",
  area: "Escolha uma área da lista, ou deixe sem área.",
  advogados: "Marque pelo menos um advogado. Sem ele, o contrato e a procuração não têm quem assine pelo escritório.",
  condicoes: "Marque pelo menos um tipo de honorário.",
  observacoes: "Escreva até 3.000 letras.",
  motivo: "Escreva o motivo da mudança, de 3 a 500 letras. Ele fica no histórico do contrato.",
};
const ROTULO: Record<string, string> = {
  clienteId: "Cliente", propostaId: "Proposta", objeto: "Objeto do contrato", responsavelId: "Responsável", area: "Área do direito", advogados: "Advogados no contrato",
  condicoes: "Tipos de honorário", observacoes: "Observações", motivo: "Motivo da mudança",
};
const ID: Record<string, string> = {
  clienteId: "nv-cli", propostaId: "nv-cli", objeto: "nv-obj", responsavelId: "nv-resp", area: "nv-area", advogados: "nv-adv", condicoes: "nv-tipos", observacoes: "nv-obs", motivo: "nv-mot",
};

/** Só as condições completas entram no resumo; as outras dizem o que falta. */
function completas(lista: RascunhoCondicao[], hoje: string | undefined): { ok: Condicao[]; faltando: RascunhoCondicao[] } {
  const ok: Condicao[] = [];
  const faltando: RascunhoCondicao[] = [];
  for (const r of lista) {
    const c = lerCondicao(r);
    if (conferirCondicao(c, hoje).length) faltando.push(r);
    else ok.push(c as Condicao);
  }
  return { ok, faltando };
}

function ResumoCorpo({ lista, ativo }: { lista: RascunhoCondicao[]; ativo: boolean }) {
  // No contrato ativo, a condição que não mudou pode ter data passada (parcela já vencida).
  const { ok, faltando } = completas(lista, ativo ? undefined : hojeBrasilia());
  const r = resumoContrato(ok);
  const certos = r.programacao.filter((x) => x.vencimento);
  const variaveis = r.programacao.filter((x) => !x.vencimento);
  return (
    <>
      <div className="hn-res-bloco">
        <h3>Valor certo</h3>
        <p className="hn-res-grande num">{reais(r.certo)}</p>
        {r.partes ? <p><small>{r.partes}</small></p> : <p><small>Fixo, parcelas e até 12 mensalidades.</small></p>}
      </div>
      {r.depende.length || faltando.length ? (
        <div className="hn-res-bloco">
          <h3>Depende do caso</h3>
          {r.depende.map((d, i) => (
            <p key={i} style={i ? { marginTop: 6 } : undefined}><b>{d.titulo}</b><br /><small>{d.sub}</small></p>
          ))}
          {faltando.map((f) => (
            <p key={f.tipo} style={{ marginTop: 6 }}><b>{nomeTipo(f.tipo)}:</b> <i>faltam dados</i></p>
          ))}
        </div>
      ) : null}
      <div className="hn-res-bloco">
        <h3>Programação dos recebimentos</h3>
        {certos.length || variaveis.length ? (
          <ol className="hn-prog">
            {certos.slice(0, 12).map((x, i) => (
              <li key={`${x.vencimento}-${i}`}><time className="num">{dataBr(x.vencimento!)}</time><span>{x.descricao}</span><b className="num">{reais(x.valor!)}</b></li>
            ))}
            {certos.length > 12 ? <li className="hn-var"><time>depois</time><span>mais {certos.length - 12}</span><b /></li> : null}
            {variaveis.map((x, i) => (
              <li key={`v${i}`} className="hn-var"><time>{x.quando}</time><span>{x.descricao}</span><b>a definir</b></li>
            ))}
          </ol>
        ) : <p><small>Marque e preencha um tipo de honorário para ver a programação.</small></p>}
      </div>
      <p className="hn-pe" style={{ borderTop: "1px solid var(--divisor)" }}>
        <Icone nome="carteira" className="ico" />
        <span>{ativo ? "Só o que ainda vai vencer é refeito. O que já venceu fica como estava." : "O Financeiro vê esta programação em A receber quando a assinatura for registrada."}</span>
      </p>
    </>
  );
}

const nomeTipo = (t: string) => ({ FIXO: "Fixo", PARCELADO: "Parcelado", MENSAL: "Mensal", EXITO: "Êxito", SUCUMBENCIA: "Sucumbência", ATO: "Por ato", RECORRENTE: "Percentual recorrente" })[t] ?? t;

function Formulario({ escritorio, ficha, proposta, clienteInicial = null }: {
  escritorio: EscritorioPortal; ficha: FichaContrato | null; proposta: PropostaParaContrato | null;
  /** "Criar o contrato" de um lembrete (F3.144): o contrato novo já com o cliente escolhido. */
  clienteInicial?: string | null;
}) {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [clientes, setClientes] = useState<ClienteLinha[] | null>(ficha || proposta ? [] : null);
  const [trocando, setTrocando] = useState(!ficha && !proposta && !clienteInicial);
  const [r, setR] = useState<Rascunho>(() => ({
    clienteId: ficha?.cliente.id ?? proposta?.cliente.id ?? clienteInicial ?? "",
    objeto: ficha?.objeto ?? proposta?.servico ?? "",
    area: ficha?.area ?? "",
    responsavelId: ficha?.responsavel.id ?? proposta?.responsavel.id ?? "",
    advogados: ficha?.advogados.map((a) => a.id) ?? [],
    inscricoes: Object.fromEntries((ficha?.inscricoes ?? []).filter((a) => a.inscricoes.length > 1)
      .map((a) => [a.pessoaId, a.inscricoes.filter((i) => i.escolhida).map((i) => i.id)])),
    condicoes: (ficha?.condicoes ?? proposta?.condicoes ?? []).map(rascunhoDe),
    observacoes: ficha?.observacoes ?? "",
    motivo: "",
  }));
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const topo = useRef<HTMLDivElement>(null);
  const focar = useFocoDepoisDoCommit();
  const eu = escritorio.pessoa;
  const ativo = ficha?.situacao === "ATIVO";

  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas/oab").then((x) => {
      if (!x.ok) return setPessoas([]);
      setPessoas(x.dados.pessoas);
      const meu = x.dados.pessoas.find((p) => p.nome === eu)?.id ?? "";
      setR((v) => ({ ...v, responsavelId: v.responsavelId || meu }));
    });
    if (!ficha && !proposta) void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((x) => setClientes(x.ok ? x.dados.clientes : []));
  }, [ficha, proposta, eu]);

  const mudar = (p: Partial<Rascunho>) => setR((v) => ({ ...v, ...p }));
  const tem = (c: string) => erros.includes(c);
  const cliente = ficha ? ficha.cliente : proposta ? proposta.cliente : clientes?.find((c) => c.id === r.clienteId) ?? null;
  const nomePessoa = (p: Pessoa) => (p.nome === eu ? `${p.nome} (você)` : p.nome);
  const ordenadas = pessoas ? [...pessoas.filter((p) => p.nome === eu), ...pessoas.filter((p) => p.nome !== eu)] : [];

  async function salvar() {
    setFalha(null);
    setEnviando(true);
    const base = {
      objeto: r.objeto,
      area: r.area || null,
      observacoes: r.observacoes.trim() || null,
      responsavelId: r.responsavelId || null,
      advogados: r.advogados,
      // Cada advogado com OAB leva as inscrições escolhidas (todas, se ninguém mexeu).
      inscricoes: Object.fromEntries((pessoas ?? []).filter((p) => r.advogados.includes(p.id) && p.oab.length > 0)
        .map((p) => [p.id, r.inscricoes[p.id] ?? p.oab.map((i) => i.id)])),
      condicoes: r.condicoes.map(lerCondicao),
    };
    const x = ficha
      ? await chamarPortal<{ id: string }>(`/v1/escritorio/contratos/${ficha.id}`, { metodo: "PUT", corpo: { ...base, versao: ficha.versao, motivo: r.motivo.trim() || null } })
      : await chamarPortal<{ id: string }>("/v1/escritorio/contratos", { metodo: "POST", corpo: { ...base, clienteId: r.clienteId || null, propostaId: proposta?.id ?? null } });
    setEnviando(false);
    if (x.ok) return irPara(`${ROTAS_CONTRATOS.contrato(x.dados.id)}?${ficha ? "mudado=1" : "criado=1"}`);
    const campos = x.erro.detalhes?.campos;
    if (x.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      focar(() => topo.current?.querySelector<HTMLElement>("a[data-primeiro]")?.focus());
      return;
    }
    setErros([]);
    setFalha(x.erro);
    requestAnimationFrame(() => topo.current?.scrollIntoView({ block: "start" }));
  }

  const porCond = errosPorCondicao(erros);
  const pontos = erros.map((c) => {
    const m = /^c(\d+)\.(.+)$/.exec(c);
    if (m) {
      const cond = r.condicoes[Number(m[1]) - 1];
      return { id: idDoErro("nv", c), texto: `Condição ${m[1]}${cond ? `, ${nomeTipo(cond.tipo)}` : ""}: ${mensagemCampo(m[2]!, "contrato")}` };
    }
    const ins = /^inscricoes\.(.+)$/.exec(c);
    if (ins) {
      const p = pessoas?.find((x) => x.id === ins[1]);
      return { id: p ? idErroInscricao(p.id) : "nv-adv", texto: `Advogados: marque pelo menos uma inscrição${p ? ` de ${p.nome}` : ""}` };
    }
    if (c === "inscricoes") return { id: "nv-adv", texto: "Advogados: confira as inscrições marcadas" };
    return { id: ID[c] ?? "nv-obj", texto: `${ROTULO[c] ?? c}: ${MSG[c] ?? "Confira este campo."}` };
  });

  function campo(c: "objeto" | "observacoes" | "motivo", id: string, rot: string, cls: string, o: { ajuda?: string; area?: boolean; opc?: boolean } = {}) {
    const e = tem(c);
    const props = {
      className: "entrada", id, name: id, autoComplete: "off", value: r[c],
      "aria-invalid": e || undefined, "aria-describedby": descritoPor(o.ajuda && `${id}-aj`, e && `${id}-er`),
      onChange: (ev: { target: { value: string } }) => mudar({ [c]: ev.target.value } as Partial<Rascunho>),
    };
    return (
      <div className={`campo ${cls}`}>
        <label htmlFor={id}>{rot}{o.opc ? <span className="opcional"> (opcional)</span> : null}</label>
        {o.area ? <textarea {...props} rows={3} /> : <input {...props} type="text" />}
        {o.ajuda ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
        {e ? <ErroCampo id={`${id}-er`}>{MSG[c]}</ErroCampo> : null}
      </div>
    );
  }

  const eCli = tem("clienteId") || tem("propostaId");
  const eResp = tem("responsavelId");
  const marcarAdv = (id: string, sim: boolean) => setR((v) => {
    const inscricoes = { ...v.inscricoes };
    if (!sim) delete inscricoes[id];
    return { ...v, advogados: sim ? [...v.advogados, id] : v.advogados.filter((x) => x !== id), inscricoes };
  });

  return (
    <div className="hn" ref={topo}>
      <div className="pt-cab">
        <div>
          <p className="sobretitulo">{ficha ? `Contrato ${ficha.numero}` : "Contratos"}</p>
          <h1>{ficha ? "Mudar contrato" : "Novo contrato"}</h1>
          <span className="fio" aria-hidden="true" />
        </div>
      </div>
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-nv">
            <div className="folha-cab">
              <div>
                <h2 id="t-nv">Dados do contrato</h2>
                <p className="sub">Os campos sem “(opcional)” são obrigatórios.</p>
              </div>
            </div>
            <form className="form-folha" noValidate onSubmit={(ev) => { ev.preventDefault(); void salvar(); }}>
              {pontos.length ? (
                <div className="c6 hn-resumo-erros">
                  <Aviso tom="urgencia" titulo={faltaAcertar(pontos.length)}
                    acoes={
                      <ul>
                        {pontos.map((p, i) => (
                          <li key={`${p.id}-${i}`}><a href={`#${p.id}`} data-primeiro={i === 0 ? "" : undefined}>{p.texto}</a></li>
                        ))}
                      </ul>
                    }>
                    {ficha ? "O contrato não foi mudado. Nada do que você escreveu se perdeu." : "O contrato ainda não foi criado. Nada do que você escreveu se perdeu."}
                  </Aviso>
                </div>
              ) : null}
              {falha ? (
                <div className="c6">
                  <Aviso tom="urgencia" titulo={ficha ? "O contrato não foi mudado." : "O contrato não foi criado."}>
                    {falha.codigo === "VERSION_CONFLICT" ? "Alguém mudou este contrato enquanto você editava. Abra o contrato de novo para ver a versão nova." : textoDoErro(falha)} O que você escreveu continua aqui.
                  </Aviso>
                </div>
              ) : null}
              {proposta && !pontos.length && !falha ? (
                <div className="c6">
                  <Aviso tom="info" titulo={`Veio da proposta ${proposta.numero}${proposta.respondidaEm ? `, aceita em ${diaCurto(proposta.respondidaEm)}` : ""}.`}>
                    Cliente, objeto, responsável e {proposta.condicoes.length === 1 ? "a condição de honorário foram copiados" : `as ${proposta.condicoes.length} condições de honorário foram copiadas`} da proposta. Confira, marque os advogados e crie o contrato.
                  </Aviso>
                </div>
              ) : null}
              {ativo ? (
                <div className="c6">
                  <Aviso tom="atencao" titulo="Este contrato está ativo.">
                    Mudar uma condição pede o motivo e refaz só os recebimentos que ainda vão vencer. O que já venceu fica como estava, e a versão anterior fica no histórico.
                  </Aviso>
                </div>
              ) : null}

              <div className="hn-passo hn-primeiro">
                <span className="disco" aria-hidden="true"><span>1</span></span>
                <div><h3>Cliente e casos</h3><small>O contrato é sempre de um cliente; pode cobrir mais de um caso</small></div>
              </div>
              <div className="hn-bloco">
                {cliente && !trocando ? (
                  <>
                    <p style={{ fontWeight: 500, marginBottom: 6 }} id="nv-cli-r">Cliente</p>
                    <div className="hn-escolhido" role="group" aria-labelledby="nv-cli-r" id="nv-cli" tabIndex={-1}>
                      <span className="av-p forte" aria-hidden="true">{iniciais(cliente.nome)}</span>
                      <div>
                        <strong>{cliente.nome}</strong>
                        <small>{cliente.tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"}</small>
                      </div>
                      {ficha || proposta ? null : (
                        <button className="btn btn-sec btn-compacto" type="button" onClick={() => setTrocando(true)}>
                          <Icone nome="trocar" className="ico" />
                          Trocar cliente
                        </button>
                      )}
                    </div>
                    {eCli ? <ErroCampo id="nv-cli-er">{MSG[tem("propostaId") ? "propostaId" : "clienteId"]}</ErroCampo> : null}
                  </>
                ) : (
                  <div className="campo">
                    <label htmlFor="nv-cli">Cliente</label>
                    <select className="entrada" id="nv-cli" value={r.clienteId} aria-invalid={eCli || undefined} aria-describedby={descritoPor("nv-cli-aj", eCli && "nv-cli-er")}
                      onChange={(ev) => { mudar({ clienteId: ev.target.value }); if (ev.target.value) setTrocando(false); }}>
                      <option value="">{clientes === null ? "Carregando os clientes…" : "Escolha o cliente"}</option>
                      {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <p className="ajuda" id="nv-cli-aj">Da lista de Clientes. Quem ainda não está lá, cadastre antes em <a href={`${ROTAS_PORTAL.clientes}/novo`}>Novo cliente</a>.</p>
                    {eCli ? <ErroCampo id="nv-cli-er">{MSG.clienteId}</ErroCampo> : null}
                  </div>
                )}
              </div>
              {campo("objeto", "nv-obj", "Objeto do contrato", "c6", { ajuda: "O serviço contratado, como vai no documento." })}
              <div className="campo c3">
                <label htmlFor="nv-area">Área do direito<span className="opcional"> (opcional)</span></label>
                <select className="entrada" id="nv-area" value={r.area} onChange={(ev) => mudar({ area: ev.target.value })} aria-invalid={tem("area") || undefined}
                  aria-describedby={descritoPor("nv-area-aj", tem("area") && "nv-area-er")}>
                  <option value="">Sem área</option>
                  {Object.entries(AREAS_DIREITO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
                <p className="ajuda" id="nv-area-aj">Vai para o caso que abre em Jurídico quando a assinatura for registrada.</p>
                {tem("area") ? <ErroCampo id="nv-area-er">{MSG.area}</ErroCampo> : null}
              </div>

              <div className="hn-passo">
                <span className="disco" aria-hidden="true"><span>2</span></span>
                <div><h3>Responsáveis</h3><small>Ninguém fica sem dono: se a pessoa sair da equipe, o contrato passa para outra</small></div>
              </div>
              <div className="campo c3">
                <label htmlFor="nv-resp">Responsável pelo contrato</label>
                <select className="entrada" id="nv-resp" value={r.responsavelId} onChange={(ev) => mudar({ responsavelId: ev.target.value })} aria-invalid={eResp || undefined}
                  aria-describedby={descritoPor("nv-resp-aj", eResp && "nv-resp-er")}>
                  <option value="">{pessoas === null ? "Carregando…" : "Escolha"}</option>
                  {ordenadas.map((p) => <option key={p.id} value={p.id}>{nomePessoa(p)}</option>)}
                </select>
                <p className="ajuda" id="nv-resp-aj">Recebe os lembretes: base do mês, etapa que gera cobrança e assinatura pendente.</p>
                {eResp ? <ErroCampo id="nv-resp-er">{MSG.responsavelId}</ErroCampo> : null}
              </div>
              <AdvogadosOab pessoas={pessoas} eu={eu} marcados={r.advogados} escolha={r.inscricoes} erros={erros}
                dono={escritorio.dono} socios={escritorio.socios} aoMarcar={marcarAdv}
                aoEscolher={(id, ids) => setR((v) => ({ ...v, inscricoes: { ...v.inscricoes, [id]: ids } }))} />

              <div className="hn-passo">
                <span className="disco" aria-hidden="true"><span>3</span></span>
                <div><h3>Condições de honorário</h3><small>Marque os tipos; cada um abre um bloco que diz o que gera</small></div>
              </div>
              <div className="hn-bloco">
                <EditorCondicoes prefixo="nv" lista={r.condicoes} aoMudar={(l) => mudar({ condicoes: l })} erros={porCond}
                  errosLista={tem("condicoes") ? MSG.condicoes : null} pessoas={ordenadas.map((p) => ({ id: p.id, nome: nomePessoa(p) }))} contexto="contrato"
                  cliente={cliente ? cliente.nome.split(/\s+/)[0] : undefined}
                  sub="Marque todos os tipos deste contrato. Cada tipo marcado abre o seu bloco logo abaixo, na ordem desta lista." />
              </div>

              <div className="hn-passo">
                <span className="disco" aria-hidden="true"><span>4</span></span>
                <div><h3>Cláusulas do escritório</h3><small>Opcional</small></div>
              </div>
              {campo("observacoes", "nv-obs", "Observações que vão no contrato", "c6", { area: true, opc: true, ajuda: "O resto do texto vem do modelo de contrato do escritório." })}
              {ativo ? campo("motivo", "nv-mot", "Motivo da mudança", "c6", { ajuda: "Ex.: o cliente pediu 4 parcelas no lugar de 3. Fica no histórico do contrato." }) : null}

              <section className="c6 so-cel hn-res-dentro" aria-labelledby="t-res-cel">
                <h2 id="t-res-cel">O que este contrato gera</h2>
                <ResumoCorpo lista={r.condicoes} ativo={ativo} />
              </section>
              <div className="form-pe">
                <span className="esq-pe">
                  {ficha
                    ? "A versão anterior fica no histórico, com seu nome e a hora."
                    : "O contrato nasce em elaboração. Colha a assinatura e registre-a: aí a programação vai para o Financeiro. Tudo fica no histórico, com seu nome e a hora."}
                </span>
                <a className="btn btn-fantasma" href={ficha ? ROTAS_CONTRATOS.contrato(ficha.id) : ROTAS_CONTRATOS.contratos}>Cancelar</a>
                <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
                  <Icone nome="check" className="ico" />
                  {ficha ? "Salvar as mudanças" : "Criar contrato"}
                </button>
              </div>
            </form>
          </section>
        </div>
        <aside className="hn-col so-pc" aria-label="Resumo do contrato">
          <section className="folha hn-resumo" aria-labelledby="t-res">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div>
                <h2 id="t-res" style={{ fontSize: 20 }}>O que este contrato gera</h2>
                <p className="sub">Atualiza enquanto você preenche.</p>
              </div>
            </div>
            <ResumoCorpo lista={r.condicoes} ativo={ativo} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function CarregarProposta({ propostaId, escritorio, clienteId }: { propostaId: string | null; escritorio: EscritorioPortal; clienteId: string | null }) {
  const [p, setP] = useState<PropostaParaContrato | null | "erro" | "nao" | "nao-aceita" | "excluido" | "arquivado">(propostaId ? null : "nao");
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (!propostaId) return;
    void chamarPortal<PropostaParaContrato>(`/v1/escritorio/contratos/da-proposta/${propostaId}`).then((r) =>
      setP(r.ok ? r.dados : r.status === 404 ? "nao" : r.erro.detalhes?.motivo === "PROPOSTA_NAO_ACEITA" ? "nao-aceita"
        : r.erro.detalhes?.motivo === "CLIENTE_EXCLUIDO" ? "excluido" : r.erro.detalhes?.motivo === "CLIENTE_ARQUIVADO" ? "arquivado" : "erro"));
  }, [propostaId, vez]);
  if (!propostaId) return <Formulario escritorio={escritorio} ficha={null} proposta={null} clienteInicial={clienteId} />;
  if (p === "erro") return <ErroAoCarregar oque="a proposta" aoTentar={() => setVez((v) => v + 1)} />;
  if (p === "nao") return <ErroAoCarregar oque="a proposta" aoTentar={() => setVez((v) => v + 1)} texto="Ela não existe ou é de outro escritório. Volte para Propostas e abra de novo." />;
  if (p === "nao-aceita") {
    return (
      <Aviso tom="info" titulo="Esta proposta não está aceita ou já virou contrato."
        acoes={<a className="btn btn-sec" href={ROTAS_CONTRATOS.proposta(propostaId)}><Icone nome="esquerda" className="ico" />Voltar para a proposta</a>}>
        Só a proposta aceita vira contrato, e uma vez só. Se já virou, o contrato está na lista de Contratos.
      </Aviso>
    );
  }
  if (p === "excluido" || p === "arquivado") {
    return (
      <Aviso tom="info" titulo={`O cliente desta proposta foi ${p === "excluido" ? "excluído" : "arquivado"} a pedido do titular.`}
        acoes={<a className="btn btn-sec" href={ROTAS_CONTRATOS.contratos}><Icone nome="esquerda" className="ico" />Voltar para Contratos</a>}>
        {p === "excluido"
          ? "A proposta não vira contrato. O pedido saiu da lista de Contratos e a proposta fica no Comercial só como registro, sem os dados do cliente."
          : "A proposta não vira contrato: cliente arquivado não ganha contrato novo. O pedido saiu da lista de Contratos e a proposta fica no Comercial como registro."}
      </Aviso>
    );
  }
  if (!p) return <Carregando rotulo="Carregando a proposta…" linhas={4} />;
  return <Formulario escritorio={escritorio} ficha={null} proposta={p} />;
}

export function NovoContratoPortal({ propostaId, clienteId }: { propostaId?: string | null; clienteId?: string | null }) {
  return (
    <MolduraArea area="CONTRATOS" secao="contratos" trilha={[{ nome: "Novo contrato" }]} pagina="co-ficha">
      {(e) => <CarregarProposta propostaId={propostaId ?? null} escritorio={e} clienteId={clienteId ?? null} />}
    </MolduraArea>
  );
}

function CarregarMudar({ id, escritorio, aoNumero }: { id: string; escritorio: EscritorioPortal; aoNumero: (n: string) => void }) {
  const [f, setF] = useState<FichaContrato | null | "erro" | "nao">(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    void chamarPortal<FichaContrato>(`/v1/escritorio/contratos/${id}`).then((r) => {
      setF(r.ok ? r.dados : r.status === 404 ? "nao" : "erro");
      if (r.ok) aoNumero(r.dados.numero);
    });
  }, [id, vez, aoNumero]);
  if (f === "erro") return <ErroAoCarregar oque="o contrato" aoTentar={() => setVez((v) => v + 1)} />;
  if (f === "nao") return <ErroAoCarregar oque="o contrato" aoTentar={() => setVez((v) => v + 1)} texto="Ele não existe ou é de outro escritório. Volte para Contratos e abra de novo." />;
  if (!f) return <Carregando rotulo="Carregando o contrato…" linhas={4} />;
  if (f.situacao === "ENCERRADO") {
    return (
      <Aviso tom="info" titulo="Este contrato está encerrado e não muda mais."
        acoes={<a className="btn btn-sec" href={ROTAS_CONTRATOS.contrato(f.id)}><Icone nome="esquerda" className="ico" />Voltar para o contrato</a>}>
        Se o cliente contratou de novo, crie um contrato novo.
      </Aviso>
    );
  }
  return <Formulario escritorio={escritorio} ficha={f} proposta={null} />;
}

export function MudarContratoPortal({ id }: { id: string }) {
  const [numero, setNumero] = useState("Contrato");
  return (
    <MolduraArea area="CONTRATOS" secao="contratos" trilha={[{ nome: numero, href: ROTAS_CONTRATOS.contrato(id) }, { nome: "Mudar" }]} pagina="co-ficha">
      {(e) => <CarregarMudar id={id} escritorio={e} aoNumero={setNumero} />}
    </MolduraArea>
  );
}
