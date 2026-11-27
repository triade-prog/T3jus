"use client";
// Nova proposta e editar proposta (AP-03, CH-06), desenho aprovado em
// docs/design/aprovadas/portal-comercial-contratos (estado proposta-nova; decisões 12 a 16):
// uma página em três passos (para quem e o quê, condições de honorário, validade e retorno).
// O rascunho pede só o cliente, o serviço e o responsável; salvar a proposta pede tudo.

import { useEffect, useRef, useState } from "react";
import { dataBr, ORIGENS, type ClienteLinha, type FichaProposta, type ListaClientes } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, useFocoDepoisDoCommit } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { lerDia } from "./agenda.ts";
import { ROTAS_COMERCIAL } from "./comercial.ts";
import { EditorCondicoes, errosPorCondicao, idDoErro } from "./Honorarios.tsx";
import { lerCondicao, mensagemCampo, rascunhoDe, type RascunhoCondicao } from "./honorarios.ts";
import { chamarPortal, irPara, ROTAS_PORTAL, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Pessoa = { id: string; nome: string };

interface Rascunho {
  clienteId: string;
  servico: string;
  responsavelId: string;
  escopo: string;
  condicoes: RascunhoCondicao[];
  validaAte: string;
  retornoEm: string;
  retornoResp: string;
}

const MSG: Record<string, string> = {
  clienteId: "Escolha o cliente. A proposta é para quem já está em Clientes.",
  servico: "Escreva o serviço, de 2 a 160 letras. Ex.: Divórcio consensual.",
  responsavelId: "Escolha quem acompanha a proposta.",
  escopo: "Escreva o que está incluído. Ele vai no arquivo da proposta e depois no contrato.",
  validaAte: "Escreva hoje ou depois, no formato dd/mm/aaaa.",
  condicoes: "Marque pelo menos um tipo de honorário.",
  "retorno.em": "Escreva quando falar de novo com o cliente, hoje ou depois, no formato dd/mm/aaaa.",
  "retorno.responsavelId": "Escolha com quem fica o retorno.",
};
const ROTULO: Record<string, string> = {
  clienteId: "Cliente", servico: "Serviço", responsavelId: "Responsável", escopo: "O que está incluído", validaAte: "Vale até",
  condicoes: "Tipos de honorário", "retorno.em": "Retorno", "retorno.responsavelId": "Com quem",
};
const ID: Record<string, string> = {
  clienteId: "pn-cli", servico: "pn-srv", responsavelId: "pn-resp", escopo: "pn-esc", validaAte: "pn-val", condicoes: "pn-tipos",
  "retorno.em": "pn-ret", "retorno.responsavelId": "pn-ret-resp",
};

const dataOuTexto = (t: string) => lerDia(t) ?? (t.trim() || null);

function Formulario({ escritorio, ficha, clienteInicial }: { escritorio: EscritorioPortal; ficha: FichaProposta | null; clienteInicial: string | null }) {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [clientes, setClientes] = useState<ClienteLinha[] | null>(ficha ? [] : null);
  const [trocando, setTrocando] = useState(!ficha && !clienteInicial);
  const [r, setR] = useState<Rascunho>(() => ({
    clienteId: ficha?.cliente.id ?? clienteInicial ?? "",
    servico: ficha?.servico ?? "",
    responsavelId: ficha?.responsavel.id ?? "",
    escopo: ficha?.escopo ?? "",
    condicoes: ficha?.condicoes.map(rascunhoDe) ?? [],
    validaAte: ficha?.validaAte ? dataBr(ficha.validaAte) : "",
    retornoEm: ficha?.retornoCompleto ? dataBr(ficha.retornoCompleto.em) : "",
    retornoResp: ficha?.retornoCompleto?.responsavel?.id ?? ficha?.responsavel.id ?? "",
  }));
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState<"rascunho" | "proposta" | null>(null);
  const topo = useRef<HTMLDivElement>(null);
  const focar = useFocoDepoisDoCommit();
  const eu = escritorio.pessoa;

  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((x) => {
      if (!x.ok) return setPessoas([]);
      setPessoas(x.dados.pessoas);
      const meu = x.dados.pessoas.find((p) => p.nome === eu)?.id ?? "";
      setR((v) => ({ ...v, responsavelId: v.responsavelId || meu, retornoResp: v.retornoResp || meu }));
    });
    if (!ficha) void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((x) => setClientes(x.ok ? x.dados.clientes : []));
  }, [ficha, eu]);

  const mudar = (p: Partial<Rascunho>) => setR((v) => ({ ...v, ...p }));
  const tem = (c: string) => erros.includes(c);
  const cliente = ficha ? { id: ficha.cliente.id, nome: ficha.cliente.nome, tipo: ficha.cliente.tipo, origem: ficha.origem } : clientes?.find((c) => c.id === r.clienteId) ?? null;
  const rascunhoPermitido = !ficha || ficha.situacao === "RASCUNHO";
  const nomePessoa = (p: Pessoa) => (p.nome === eu ? `${p.nome} (você)` : p.nome);
  const ordenadas = pessoas ? [...pessoas.filter((p) => p.nome === eu), ...pessoas.filter((p) => p.nome !== eu)] : [];

  async function salvar(rascunho: boolean) {
    setFalha(null);
    setEnviando(rascunho ? "rascunho" : "proposta");
    const dados = {
      clienteId: r.clienteId || null,
      servico: r.servico,
      escopo: r.escopo,
      responsavelId: r.responsavelId || null,
      validaAte: dataOuTexto(r.validaAte),
      condicoes: r.condicoes.map(lerCondicao),
      retorno: r.retornoEm.trim() || !rascunho ? { em: dataOuTexto(r.retornoEm), responsavelId: r.retornoResp || null, oque: null } : null,
      rascunho,
    };
    const x = ficha
      ? await chamarPortal<{ id: string }>(`/v1/escritorio/propostas/${ficha.id}`, { metodo: "PUT", corpo: { ...dados, versao: ficha.versao } })
      : await chamarPortal<{ id: string }>("/v1/escritorio/propostas", { metodo: "POST", corpo: dados });
    setEnviando(null);
    if (x.ok) return irPara(`${ROTAS_COMERCIAL.proposta(x.dados.id)}?${ficha ? "salva=1" : "criada=1"}`);
    const campos = x.erro.detalhes?.campos;
    if (x.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      const lista = campos.map(String).filter((c) => c !== "retorno.oque");
      setErros(lista);
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
      return { id: idDoErro("pn", c), texto: `Condição ${m[1]}${cond ? ` (${cond.tipo === "EXITO" ? "êxito" : cond.tipo.toLowerCase()})` : ""}: ${mensagemCampo(m[2]!)}` };
    }
    return { id: ID[c] ?? "pn-srv", texto: `${ROTULO[c] ?? c}: ${MSG[c] ?? "Confira este campo."}` };
  });

  function campo(c: keyof Rascunho, id: string, rot: string, cls: string, o: { erro?: string; ajuda?: string; im?: "numeric"; area?: boolean } = {}) {
    const e = o.erro ? tem(o.erro) : false;
    const props = {
      className: "entrada", id, name: id, autoComplete: "off", value: r[c] as string,
      "aria-invalid": e || undefined, "aria-describedby": descritoPor(o.ajuda && `${id}-aj`, e && `${id}-er`),
      onChange: (ev: { target: { value: string } }) => mudar({ [c]: ev.target.value } as Partial<Rascunho>),
    };
    return (
      <div className={`campo ${cls}`}>
        <label htmlFor={id}>{rot}</label>
        {o.area ? <textarea {...props} rows={4} /> : <input {...props} type="text" inputMode={o.im} />}
        {o.ajuda ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
        {e ? <ErroCampo id={`${id}-er`}>{MSG[o.erro!]}</ErroCampo> : null}
      </div>
    );
  }
  function pessoa(c: "responsavelId" | "retornoResp", id: string, rot: string, erro: string, ajuda?: string) {
    const e = tem(erro);
    return (
      <div className="campo c2">
        <label htmlFor={id}>{rot}</label>
        <select className="entrada" id={id} value={r[c]} onChange={(ev) => mudar({ [c]: ev.target.value } as Partial<Rascunho>)} aria-invalid={e || undefined}
          aria-describedby={descritoPor(ajuda && `${id}-aj`, e && `${id}-er`)}>
          <option value="">{pessoas === null ? "Carregando…" : "Escolha"}</option>
          {ordenadas.map((p) => <option key={p.id} value={p.id}>{nomePessoa(p)}</option>)}
        </select>
        {ajuda ? <p className="ajuda" id={`${id}-aj`}>{ajuda}</p> : null}
        {e ? <ErroCampo id={`${id}-er`}>{MSG[erro]}</ErroCampo> : null}
      </div>
    );
  }

  const eCli = tem("clienteId");
  return (
    <div className="hn" ref={topo}>
      <div className="pt-cab">
        <div>
          <p className="sobretitulo">{ficha ? `Proposta ${ficha.numero}` : "Propostas"}</p>
          <h1>{ficha ? "Editar proposta" : "Nova proposta"}</h1>
          <span className="fio" aria-hidden="true" />
        </div>
      </div>
      <div className="hn-grade">
        <div className="hn-col">
          <section className="folha" aria-labelledby="t-pn">
            <div className="folha-cab">
              <div>
                <h2 id="t-pn">Dados da proposta</h2>
                <p className="sub">Escreva uma vez. Se for aceita, o contrato sai com estas condições.</p>
              </div>
            </div>
            <form className="form-folha" noValidate onSubmit={(ev) => { ev.preventDefault(); void salvar(false); }}>
              {pontos.length ? (
                <div className="c6">
                  <Aviso tom="urgencia" titulo={faltaAcertar(pontos.length)}
                    acoes={
                      <ul className="hn-resumo-erros">
                        {pontos.map((p, i) => (
                          <li key={`${p.id}-${i}`}><a href={`#${p.id}`} data-primeiro={i === 0 ? "" : undefined}>{p.texto}</a></li>
                        ))}
                      </ul>
                    }>
                    {ficha ? "A proposta não foi salva. O que você escreveu continua aqui." : "A proposta ainda não foi salva. O que você escreveu continua aqui."}
                  </Aviso>
                </div>
              ) : null}
              {falha ? (
                <div className="c6">
                  <Aviso tom="urgencia" titulo="A proposta não foi salva.">
                    {falha.codigo === "VERSION_CONFLICT" ? "Alguém salvou esta proposta enquanto você editava. Abra a proposta de novo para ver a versão nova." : textoDoErro(falha)} O que você escreveu continua aqui.
                  </Aviso>
                </div>
              ) : null}

              <div className="hn-passo hn-primeiro">
                <span className="disco" aria-hidden="true"><span>1</span></span>
                <div><h3>Para quem e o quê</h3><small>O cliente vem do cadastro único</small></div>
              </div>
              <div className="hn-bloco">
                {cliente && !trocando ? (
                  <>
                    <p style={{ fontWeight: 500, marginBottom: 6 }} id="pn-cli-r">Cliente</p>
                    <div className="hn-escolhido" role="group" aria-labelledby="pn-cli-r" id="pn-cli" tabIndex={-1}>
                      <span className="av-p forte" aria-hidden="true">{iniciais(cliente.nome)}</span>
                      <div>
                        <strong>{cliente.nome}</strong>
                        <small>{cliente.tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"}{cliente.origem ? ` · origem: ${ORIGENS[cliente.origem]}` : ""}</small>
                      </div>
                      {ficha ? null : (
                        <button className="btn btn-sec btn-compacto" type="button" onClick={() => setTrocando(true)}>
                          <Icone nome="trocar" className="ico" />
                          Trocar cliente
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="campo">
                    <label htmlFor="pn-cli">Cliente</label>
                    <select className="entrada" id="pn-cli" value={r.clienteId} aria-invalid={eCli || undefined} aria-describedby={descritoPor("pn-cli-aj", eCli && "pn-cli-er")}
                      onChange={(ev) => { mudar({ clienteId: ev.target.value }); if (ev.target.value) setTrocando(false); }}>
                      <option value="">{clientes === null ? "Carregando os clientes…" : "Escolha o cliente"}</option>
                      {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <p className="ajuda" id="pn-cli-aj">Da lista de Clientes. Quem ainda não está lá, cadastre antes em <a href={`${ROTAS_PORTAL.clientes}/novo`}>Novo cliente</a>.</p>
                    {eCli ? <ErroCampo id="pn-cli-er">{MSG.clienteId}</ErroCampo> : null}
                  </div>
                )}
                {eCli && cliente && !trocando ? <ErroCampo id="pn-cli-er">{MSG.clienteId}</ErroCampo> : null}
              </div>
              {campo("servico", "pn-srv", "Serviço", "c4", { erro: "servico", ajuda: "Aparece na lista e no título da proposta." })}
              {pessoa("responsavelId", "pn-resp", "Responsável", "responsavelId", "Acompanha o retorno.")}
              {campo("escopo", "pn-esc", "O que está incluído", "c6", { erro: "escopo", area: true, ajuda: "Vai no arquivo da proposta e depois no contrato." })}

              <div className="hn-passo">
                <span className="disco" aria-hidden="true"><span>2</span></span>
                <div><h3>Condições de honorário</h3><small>As mesmas peças do contrato: o que for aceito passa para lá</small></div>
              </div>
              <div className="hn-bloco">
                <EditorCondicoes prefixo="pn" lista={r.condicoes} aoMudar={(l) => mudar({ condicoes: l })} erros={porCond}
                  errosLista={tem("condicoes") ? MSG.condicoes : null} pessoas={ordenadas.map((p) => ({ id: p.id, nome: nomePessoa(p) }))} contexto="proposta"
                  cliente={cliente ? cliente.nome.split(/\s+/)[0] : undefined}
                  sub="Marque todos os tipos desta proposta. Cada tipo marcado abre o seu bloco logo abaixo, na ordem desta lista." />
              </div>

              <div className="hn-passo">
                <span className="disco" aria-hidden="true"><span>3</span></span>
                <div><h3>Validade e retorno</h3></div>
              </div>
              {campo("validaAte", "pn-val", "Vale até", "c2", { erro: "validaAte", im: "numeric", ajuda: "dd/mm/aaaa. Depois disso, ela fica como vencida." })}
              {campo("retornoEm", "pn-ret", "Retorno", "c2", { erro: "retorno.em", im: "numeric", ajuda: "Vira o próximo contato do cliente." })}
              {pessoa("retornoResp", "pn-ret-resp", "Com quem", "retorno.responsavelId")}

              <div className="form-pe">
                <span className="esq-pe">Os campos sem “(opcional)” são obrigatórios. A proposta fica no histórico, com seu nome e a hora.</span>
                <a className="btn btn-fantasma" href={ficha ? ROTAS_COMERCIAL.proposta(ficha.id) : ROTAS_COMERCIAL.propostas}>Cancelar</a>
                {rascunhoPermitido ? (
                  <button className="btn btn-sec" type="button" disabled={!!enviando} aria-busy={enviando === "rascunho" || undefined} onClick={() => void salvar(true)}>
                    Salvar rascunho
                  </button>
                ) : null}
                <button className="btn btn-pri" type="submit" disabled={!!enviando} aria-busy={enviando === "proposta" || undefined}>
                  <Icone nome="check" className="ico" />
                  {ficha ? "Salvar as mudanças" : "Salvar proposta"}
                </button>
              </div>
            </form>
          </section>
        </div>
        <aside className="hn-col" aria-label="Como funciona a proposta">
          <section className="explica campo-ambar" aria-labelledby="t-pnx">
            <p className="sobretitulo">Proposta</p>
            <h2 id="t-pnx">Clara para o cliente, pronta para o contrato.</h2>
            <ul>
              <li><Icone nome="pena" className="ico" /><span>Os tipos de honorário são os mesmos do contrato: fixo, parcelado, mensal, êxito, sucumbência, por ato e percentual recorrente.</span></li>
              <li><Icone nome="historico" className="ico" /><span>O escritório envia a proposta como já envia. Depois de enviar, marque na ficha da proposta.</span></li>
              <li><Icone nome="escudo" className="ico" /><span>Só para quem procurou o escritório. Não há envio em massa nem oferta a quem não pediu (Provimento 205/2021 da OAB).</span></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function NovaPropostaPortal({ clienteId }: { clienteId?: string | null }) {
  return (
    <MolduraArea area="COMERCIAL" secao="propostas" trilha={[{ nome: "Nova proposta" }]} pagina="co-ficha">
      {(e) => <Formulario escritorio={e} ficha={null} clienteInicial={clienteId ?? null} />}
    </MolduraArea>
  );
}

function CarregarEditar({ id, escritorio }: { id: string; escritorio: EscritorioPortal }) {
  const [f, setF] = useState<FichaProposta | null | "erro" | "nao">(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    void chamarPortal<FichaProposta>(`/v1/escritorio/propostas/${id}`).then((r) => setF(r.ok ? r.dados : r.status === 404 ? "nao" : "erro"));
  }, [id, vez]);
  if (f === "erro") return <ErroAoCarregar oque="a proposta" aoTentar={() => setVez((v) => v + 1)} />;
  if (f === "nao") return <ErroAoCarregar oque="a proposta" aoTentar={() => setVez((v) => v + 1)} texto="Ela não existe ou é de outro escritório. Volte para Propostas e abra de novo." />;
  if (!f) return <Carregando rotulo="Carregando a proposta…" linhas={4} />;
  if (!["RASCUNHO", "ENVIADA", "NEGOCIACAO"].includes(f.situacao)) {
    return (
      <Aviso tom="info" titulo="Esta proposta já foi respondida e não muda mais."
        acoes={<a className="btn btn-sec" href={ROTAS_COMERCIAL.proposta(f.id)}><Icone nome="esquerda" className="ico" />Voltar para a proposta</a>}>
        Se o cliente quer outra coisa, escreva uma proposta nova.
      </Aviso>
    );
  }
  return <Formulario escritorio={escritorio} ficha={f} clienteInicial={null} />;
}

export function EditarPropostaPortal({ id }: { id: string }) {
  return (
    <MolduraArea area="COMERCIAL" secao="propostas" trilha={[{ nome: "Editar proposta" }]} pagina="co-ficha">
      {(e) => <CarregarEditar id={id} escritorio={e} />}
    </MolduraArea>
  );
}
