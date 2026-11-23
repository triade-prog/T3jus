"use client";
// Documentos para começar (EX-18, F3.131), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9, decisões 41 e 42): em Jurídico ›
// Casos e processos, ao lado de Etapas do escritório e com o mesmo desenho. As áreas ficam em
// fichas no alto; cada documento tem nome, "Como pedir ao cliente", "Onde fica" (pessoal, na ficha,
// ou do caso) e "Só se houver". Só a sócia dona edita; a equipe vê. Área sem lista não pede nada
// sozinha e oferece a sugestão do T3jus. Mudar a lista vale do próximo caso em diante.
// O prazo do comprovante (F3.134, desenho portal-prazo-comprovante) fica na folha "Prazo do
// comprovante", no alto da coluna do lado; o item do comprovante leva até ela.

import { useEffect, useRef, useState } from "react";
import {
  AREAS_DIREITO, quemMuda, TIPOS_DOCUMENTO_PESSOAL,
  type AreaComLista, type DocumentoInicio, type DocumentosInicio, type SugestaoDocumentoInicio, type TipoDocumentoPessoal,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro } from "../console/pecas.tsx";
import { contar } from "./agenda.ts";
import { useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { ROTAS_JURIDICO } from "./juridico.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { FolhaPrazoComprovante, type PrazoSalvo } from "./PrazoComprovante.tsx";
import { textoMudado, textoSalvo } from "./prazoComprovante.ts";

type Feito = { titulo: string; texto: string };
const TIPOS = Object.keys(TIPOS_DOCUMENTO_PESSOAL) as TipoDocumentoPessoal[];

interface Rascunho { nome: string; comoPedir: string; onde: "PESSOAL" | "CASO"; pessoal: TipoDocumentoPessoal | ""; seHouver: boolean }
const MSG: Record<string, string> = {
  nome: "Escreva o nome do documento, com 3 a 80 letras.",
  comoPedir: "Escreva até 300 letras, ou deixe em branco.",
  pessoal: "Escolha qual documento da ficha é este.",
};

function Selos({ d, validade }: { d: Pick<DocumentoInicio, "pessoal" | "seHouver">; validade: number }) {
  return (
    <>
      {d.pessoal
        ? <span className="selo selo-neutro"><Icone nome="pessoas" className="ico" />Pessoal · fica na ficha</span>
        : <span className="selo selo-andamento"><Icone nome="balanca" className="ico" />Do caso</span>}
      {d.seHouver ? <span className="selo selo-neutro">Se houver</span> : null}
      {d.pessoal === "COMPROVANTE_RESIDENCIA" ? <span className="selo selo-atencao"><Icone nome="relogio" className="ico" />Vale {validade} dias</span> : null}
    </>
  );
}

function FormDocumento({ area, item, aoCancelar, aoSalvo, aoTirar }: {
  area: AreaComLista;
  item: DocumentoInicio | null;
  aoCancelar: () => void;
  aoSalvo: (nome: string) => void;
  aoTirar?: () => void;
}) {
  const [d, setD] = useState<Rascunho>(() => ({
    nome: item?.nome ?? "", comoPedir: item?.comoPedir ?? "", onde: item?.pessoal ? "PESSOAL" : "CASO", pessoal: item?.pessoal ?? "", seHouver: item?.seHouver ?? false,
  }));
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const raiz = useRef<HTMLFormElement>(null);
  const tem = (c: string) => erros.includes(c);
  const p = item ? `di-${item.id.slice(0, 8)}` : "di-novo";
  const mudar = (x: Partial<Rascunho>) => setD((v) => ({ ...v, ...x }));

  async function salvar() {
    const e: string[] = [];
    if (d.nome.trim().length < 3 || d.nome.trim().length > 80) e.push("nome");
    if (d.comoPedir.trim() && (d.comoPedir.trim().length < 3 || d.comoPedir.trim().length > 300)) e.push("comoPedir");
    if (d.onde === "PESSOAL" && !d.pessoal) e.push("pessoal");
    setErros(e);
    setFalha(null);
    if (e.length) return focarPrimeiroErro(raiz.current);
    setEnviando(true);
    const corpo = { nome: d.nome.trim(), comoPedir: d.comoPedir.trim() || null, pessoal: d.onde === "PESSOAL" ? d.pessoal : null, seHouver: d.seHouver };
    const r = item
      ? await chamarPortal(`/v1/escritorio/juridico/documentos-inicio/${item.id}`, { metodo: "PATCH", corpo: { ...corpo, versao: item.versao } })
      : await chamarPortal("/v1/escritorio/juridico/documentos-inicio", { metodo: "POST", corpo: { ...corpo, area } });
    setEnviando(false);
    if (r.ok) return aoSalvo(corpo.nome);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length && !r.erro.detalhes?.motivo) {
      setErros(campos.map(String));
      return focarPrimeiroErro(raiz.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou este documento enquanto você editava. Cancele, recarregue a página e edite de novo." : textoDoErro(r.erro));
  }

  return (
    <form ref={raiz} className="jr-et-form" noValidate aria-label={item ? `Editando ${item.nome}` : "Novo documento"} onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
      {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>O documento ainda não foi salvo.</Aviso> : null}
      {falha ? <Aviso tom="urgencia" titulo="O documento não foi salvo.">{falha}</Aviso> : null}
      <div className="hn-campos">
        <div className="campo c3">
          <label htmlFor={`${p}-nome`}>Nome do documento</label>
          <input className="entrada" id={`${p}-nome`} type="text" autoComplete="off" maxLength={80} value={d.nome} onChange={(e) => mudar({ nome: e.target.value })} autoFocus
            aria-invalid={tem("nome") || undefined} aria-describedby={descritoPor(`${p}-nome-aj`, tem("nome") && `${p}-nome-er`)} />
          <p className="ajuda" id={`${p}-nome-aj`}>Curto. É o nome que a equipe vê.</p>
          {tem("nome") ? <ErroCampo id={`${p}-nome-er`}>{MSG.nome}</ErroCampo> : null}
        </div>
        <div className="campo c3">
          <label htmlFor={`${p}-txt`}>Como pedir ao cliente<span className="opcional"> (opcional)</span></label>
          <input className="entrada" id={`${p}-txt`} type="text" autoComplete="off" maxLength={300} value={d.comoPedir} onChange={(e) => mudar({ comoPedir: e.target.value })}
            aria-invalid={tem("comoPedir") || undefined} aria-describedby={descritoPor(`${p}-txt-aj`, tem("comoPedir") && `${p}-txt-er`)} />
          <p className="ajuda" id={`${p}-txt-aj`}>Vai na mensagem do WhatsApp, em linguagem simples.</p>
          {tem("comoPedir") ? <ErroCampo id={`${p}-txt-er`}>{MSG.comoPedir}</ErroCampo> : null}
        </div>
        <fieldset className="jf-tipo c6">
          <legend className="pe-rot">Onde fica</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name={`${p}-onde`} checked={d.onde === "PESSOAL"} onChange={() => mudar({ onde: "PESSOAL" })} />
            <span>Pessoal: fica na ficha do cliente<small>Serve a todos os casos dele. Se já estiver lá, não é pedido de novo.</small></span>
          </label>
          {d.onde === "PESSOAL" ? (
            <div className="campo">
              <label htmlFor={`${p}-pessoal`}>Qual documento da ficha</label>
              <select className="entrada" id={`${p}-pessoal`} value={d.pessoal} onChange={(e) => mudar({ pessoal: e.target.value as TipoDocumentoPessoal })}
                aria-invalid={tem("pessoal") || undefined} aria-describedby={descritoPor(tem("pessoal") && `${p}-pessoal-er`)}>
                <option value="" />
                {TIPOS.map((t) => <option key={t} value={t}>{TIPOS_DOCUMENTO_PESSOAL[t]}</option>)}
              </select>
              {tem("pessoal") ? <ErroCampo id={`${p}-pessoal-er`}>{MSG.pessoal}</ErroCampo> : null}
            </div>
          ) : null}
          <label className="opcao">
            <input className="marcar" type="radio" name={`${p}-onde`} checked={d.onde === "CASO"} onChange={() => mudar({ onde: "CASO" })} />
            <span>Do caso: fica em Documentos do caso<small>É pedido a cada caso novo.</small></span>
          </label>
        </fieldset>
        <label className="opcao c6">
          <input className="marcar" type="checkbox" checked={d.seHouver} onChange={(e) => mudar({ seHouver: e.target.checked })} />
          <span>Só se houver<small>Vem marcado na abertura do caso, mas quem abre pode tirar. Não conta como falta se for tirado.</small></span>
        </label>
      </div>
      <div className="jr-et-pe">
        {aoTirar ? (
          <button className="btn btn-perigo jr-tirar-et" type="button" onClick={aoTirar}><Icone nome="xis" className="ico" />Tirar da lista</button>
        ) : null}
        <button className="btn btn-fantasma" type="button" onClick={aoCancelar}>Cancelar</button>
        <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}><Icone nome="check" className="ico" />Salvar documento</button>
      </div>
    </form>
  );
}

function Sugestao({ area, itens }: { area: AreaComLista; itens: SugestaoDocumentoInicio[] }) {
  if (!itens.length) return null;
  return (
    <div className="jf-sug-caixa">
      <h3>A sugestão para {AREAS_DIREITO[area].toLowerCase()}</h3>
      <ul className="jf-sug">
        {itens.map((s) => (
          <li key={s.nome}><Icone nome="doc" className="ico" /><span>{s.nome} <small>· {s.pessoal ? "pessoal" : "do caso"}{s.seHouver ? ", se houver" : ""}</small></span></li>
        ))}
      </ul>
    </div>
  );
}

function Conteudo() {
  const { dados, recarregar } = useCarga<DocumentosInicio>("/v1/escritorio/juridico/documentos-inicio");
  const [area, setArea] = useState<AreaComLista | null>(null);
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [editandoPrazo, setEditandoPrazo] = useState(false);
  const [prazoSalvo, setPrazoSalvo] = useState<PrazoSalvo | null>(null);
  const rolouParaPrazo = useRef(false);
  const carregou = !!dados && dados !== "erro";
  // Quem chega pelo "Mudar o prazo" da ficha do cliente (#prazo) vê a folha do prazo.
  useEffect(() => {
    if (!carregou || rolouParaPrazo.current) return;
    rolouParaPrazo.current = true;
    if (window.location.hash === "#prazo") document.getElementById("prazo")?.scrollIntoView({ block: "start" });
  }, [carregou]);
  const cab = (dono: boolean | null) => (
    <div className="pt-cab">
      <div>
        <a className="voltar jr-voltar" href={ROTAS_JURIDICO.casos}><Icone nome="esquerda" className="ico ico-s" />Casos e processos</a>
        <p className="sobretitulo">Jurídico{dono === null ? "" : dono ? " · só a sócia dona edita" : " · você vê; quem edita é a sócia dona"}</p>
        <h1>Documentos para começar</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">O que cada área pede ao cliente para o processo começar. Fica ao lado de Etapas do escritório.</p>
      </div>
    </div>
  );
  if (dados === "erro") return <>{cab(null)}<ErroAoCarregar oque="os documentos para começar" aoTentar={recarregar} /></>;
  if (!dados) return <>{cab(null)}<Carregando rotulo="Carregando as listas…" linhas={4} /></>;
  const ed = dados.podeEditar;
  const atual = dados.areas.find((a) => a.area === area) ?? dados.areas[0]!;
  const lista = atual.itens;
  const nomeArea = AREAS_DIREITO[atual.area].toLowerCase();
  const pessoais = lista.filter((x) => x.pessoal).length;
  const donos = dados.sociosDonos ?? [];

  function abrirPrazo() {
    setEditando(null);
    setFalha(null);
    setPrazoSalvo(null);
    setEditandoPrazo(true);
  }

  async function chamar(caminho: string, corpo: unknown, f: Feito) {
    setFalha(null);
    setOcupado(true);
    const r = await chamarPortal(caminho, { metodo: "POST", corpo });
    setOcupado(false);
    if (!r.ok) return setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou a lista agora há pouco. Recarregue a página e tente de novo." : textoDoErro(r.erro));
    setEditando(null);
    setFeito(f);
    recarregar();
  }

  const linha = (x: DocumentoInicio, i: number) => {
    if (editando === x.id) {
      return (
        <li key={x.id} className="jr-et jr-et-ed">
          <span className="jr-et-n" aria-hidden="true">{i + 1}</span>
          <FormDocumento area={atual.area} item={x} aoCancelar={() => setEditando(null)}
            aoSalvo={(n) => { setEditando(null); setFeito({ titulo: "Documento salvo", texto: `${n} vale do próximo caso de ${nomeArea} em diante.` }); recarregar(); }}
            aoTirar={() => void chamar(`/v1/escritorio/juridico/documentos-inicio/${x.id}/tirar`, { versao: x.versao },
              { titulo: `${x.nome} saiu da lista`, texto: "Fica guardado no histórico. Os casos que já abriram não mudam." })} />
        </li>
      );
    }
    return (
      <li key={x.id} className="jr-et">
        <span className="jr-et-n" aria-hidden="true">{i + 1}</span>
        <div className="jr-et-oque">
          <h3><span className="sr">Documento {i + 1}: </span>{x.nome}<Selos d={x} validade={dados.validadeDias} /></h3>
          {x.comoPedir ? <p className="jr-et-txt">“{x.comoPedir}”</p> : null}
          {x.pessoal === "COMPROVANTE_RESIDENCIA" ? (
            <p className="pzc-liga">
              O prazo vale para todas as áreas.{" "}
              {dados.podeMudarPrazo
                ? <a href="#prazo" onClick={(e) => { e.preventDefault(); abrirPrazo(); }}>Mudar o prazo</a>
                : quemMuda(donos)}
            </p>
          ) : null}
        </div>
        {ed ? (
          <div className="jr-et-acoes">
            <button className="jr-seta jr-seta-sobe" type="button" disabled={i === 0 || ocupado} aria-label={`Subir ${x.nome}`}
              onClick={() => void chamar(`/v1/escritorio/juridico/documentos-inicio/${x.id}/mover`, { direcao: "SOBE" }, { titulo: `${x.nome} subiu`, texto: "A nova ordem vale do próximo caso em diante." })}>
              <Icone nome="baixo" className="ico" />
            </button>
            <button className="jr-seta" type="button" disabled={i === lista.length - 1 || ocupado} aria-label={`Descer ${x.nome}`}
              onClick={() => void chamar(`/v1/escritorio/juridico/documentos-inicio/${x.id}/mover`, { direcao: "DESCE" }, { titulo: `${x.nome} desceu`, texto: "A nova ordem vale do próximo caso em diante." })}>
              <Icone nome="baixo" className="ico" />
            </button>
            <button className="btn btn-sec btn-compacto" type="button" onClick={() => { setFalha(null); setEditandoPrazo(false); setEditando(x.id); }} aria-label={`Editar ${x.nome}`}>
              <Icone nome="lapis" className="ico" />Editar
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  const novo = editando === "novo" ? (
    <li className="jr-et jr-et-ed">
      <span className="jr-et-n" aria-hidden="true">{lista.length + 1}</span>
      <FormDocumento area={atual.area} item={null} aoCancelar={() => setEditando(null)}
        aoSalvo={(n) => { setEditando(null); setFeito({ titulo: "Documento adicionado", texto: `${n} entrou no fim da lista de ${nomeArea}.` }); recarregar(); }} />
    </li>
  ) : null;

  return (
    <div className="hn">
      {cab(ed || dados.podeMudarPrazo)}
      <div className="hn-grade">
        <section className="folha" aria-labelledby="t-dl" style={{ overflow: "hidden" }}>
          <div className="folha-cab jr-ets-cab">
            <div>
              <h2 id="t-dl">Documentos de {nomeArea}</h2>
              <p className="sub">{lista.length
                ? `${contar(lista.length, "documento", "documentos")} · ${contar(pessoais, "pessoal", "pessoais")}, ${lista.length - pessoais} do caso · vale para todo caso novo de ${nomeArea}`
                : "Sem lista ainda"}</p>
            </div>
            {ed && lista.length && editando !== "novo" ? (
              <button data-muda className="btn btn-sec" type="button" onClick={() => { setFalha(null); setEditando("novo"); }}><Icone nome="mais" className="ico" />Adicionar documento</button>
            ) : null}
          </div>
          <div className="chips jf-areas" role="group" aria-label="Área">
            {dados.areas.map((a) => (
              <button key={a.area} type="button" aria-pressed={a.area === atual.area} onClick={() => { setArea(a.area); setEditando(null); setFalha(null); }}>
                {AREAS_DIREITO[a.area]}<span className="jf-q"> · {a.itens.length ? contar(a.itens.length, "documento", "documentos") : "sem lista"}</span>
              </button>
            ))}
          </div>
          {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="A lista não mudou.">{falha}</Aviso></div> : null}
          {lista.length || editando === "novo" ? (
            <ol className="jr-ets">
              {lista.map(linha)}
              {novo}
            </ol>
          ) : (
            <>
              <div style={{ padding: "4px 24px 16px" }}>
                <Estado icone="doc" titulo={`${AREAS_DIREITO[atual.area]} ainda não tem lista`}
                  acoes={ed ? (
                    <>
                      {atual.sugestao.length ? (
                        <button className="btn btn-pri" type="button" disabled={ocupado} aria-busy={ocupado || undefined}
                          onClick={() => void chamar("/v1/escritorio/juridico/documentos-inicio/sugestao", { area: atual.area },
                            { titulo: `A lista de ${nomeArea} está pronta`, texto: "Ajuste ao jeito do escritório. Vale do próximo caso em diante." })}>
                          <Icone nome="check" className="ico" />Usar a sugestão do T3jus
                        </button>
                      ) : null}
                      <button className="btn btn-sec" type="button" onClick={() => setEditando("novo")}><Icone nome="mais" className="ico" />Começar do zero</button>
                    </>
                  ) : undefined}>
                  Enquanto não tiver, nada é pedido sozinho quando um caso de {nomeArea} abre: os pedidos são feitos um a um, em Documentos do caso.
                  {ed ? " Comece pela sugestão do T3jus e ajuste ao jeito do escritório." : " Só a sócia dona monta a lista."}
                </Estado>
              </div>
              <Sugestao area={atual.area} itens={atual.sugestao} />
            </>
          )}
          <p className="hn-pe">
            <Icone nome="historico" className="ico" />
            <span>{ed
              ? "Cada mudança fica no histórico do escritório, com seu nome e a hora. Mudar a lista não muda os casos que já abriram: vale do próximo caso em diante."
              : `${quemMuda(donos, "as listas e o prazo")} Mudar a lista não muda os casos que já abriram: vale do próximo caso em diante.`}</span>
          </p>
        </section>
        <aside className="hn-col" aria-label="Prazo do comprovante e como funcionam os documentos para começar">
          <FolhaPrazoComprovante dados={dados} editando={editandoPrazo} salvo={prazoSalvo} aoAbrir={abrirPrazo}
            aoCancelar={() => setEditandoPrazo(false)}
            aoSalvo={(r, trocar) => {
              setEditando(null);
              setEditandoPrazo(false);
              setPrazoSalvo({ r, ...textoSalvo(r, trocar, dados.listasComFrase > 0), mudado: textoMudado(r.de, r.validadeDias, new Date()) });
              recarregar();
            }} />
          <section className="explica campo-ambar" aria-labelledby="t-exd">
            <p className="sobretitulo">Como funciona</p>
            <h2 id="t-exd">O caso já abre pedindo.</h2>
            <ul>
              <li><Icone nome="balanca" className="ico" /><span>Quando um caso abre (na assinatura, em “Abrir o caso” ou em Novo caso), a lista da área vem pronta para quem abre conferir.</span></li>
              <li><Icone nome="pessoas" className="ico" /><span>Os pessoais (RG, comprovante, certidões) ficam na ficha do cliente. O que já está lá vem como “já temos” e não é pedido de novo.</span></li>
              <li><Icone nome="relogio" className="ico" /><span>O comprovante de residência com mais de {dados.validadeDias} dias é pedido de novo. O prazo fica no quadro “Prazo do comprovante”, acima.</span></li>
              <li><Icone nome="whats" className="ico" /><span>O cliente recebe a lista pelo WhatsApp, e a automação “Documento pendente” lembra o que faltar.</span></li>
              <li><Icone nome="cadeado" className="ico" /><span>Só a sócia dona muda estas listas. A equipe vê e pode pedir mais um documento em cada caso.</span></li>
            </ul>
          </section>
        </aside>
      </div>
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function DocumentosInicioJuridicoPortal() {
  return (
    <MolduraArea area="JURIDICO" secao="casos" trilha={[{ nome: "Documentos para começar" }]}>
      {() => <Conteudo />}
    </MolduraArea>
  );
}
