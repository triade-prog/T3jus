"use client";
// Jurídico do Portal, parte 3a (EX-07), desenho aprovado em
// docs/design/aprovadas/portal-juridico (estado etapas, decisão 8):
// - Etapas do escritório, dentro de Casos e processos. Só a sócia dona edita; a equipe vê a
//   lista. Editar abre a etapa no próprio lugar, com a prévia do WhatsApp. Subir e descer mudam a
//   ordem; a última é sempre a final. Tirar uma etapa com casos pede para qual etapa eles vão.
// As Petições (EX-09), que aqui eram o lugar reservado com a pergunta de interesse, viraram o
// gerador de petições em Peticoes.tsx e PeticaoPagina.tsx.

import { Fragment, useRef, useState } from "react";
import {
  textoAvisoEtapa, type EtapaEditavel, type EtapasEscritorio,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar } from "./agenda.ts";
import { useCarga } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { ROTAS_JURIDICO } from "./juridico.ts";
import { chamarPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";

type Feito = { titulo: string; texto: string };

// ------------------------------------------------------------------------- Etapas

interface Rascunho { nome: string; descricao: string; textoCliente: string; avisaFinanceiro: boolean }
const MSG: Record<string, string> = {
  nome: "Escreva o nome da etapa, com 2 a 60 letras.",
  descricao: "Escreva até 200 letras, ou deixe em branco.",
  textoCliente: "Escreva o texto para o cliente, com 10 a 240 letras.",
};

function FormEtapa({ etapa, escritorio, aoCancelar, aoSalvo, aoTirar }: {
  etapa: EtapaEditavel | null;
  escritorio: string;
  aoCancelar: () => void;
  aoSalvo: (nome: string) => void;
  aoTirar?: () => void;
}) {
  const [d, setD] = useState<Rascunho>(() => ({
    nome: etapa?.nome ?? "", descricao: etapa?.descricao ?? "", textoCliente: etapa?.textoCliente ?? "", avisaFinanceiro: etapa?.avisaFinanceiro ?? false,
  }));
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const raiz = useRef<HTMLFormElement>(null);
  const tem = (c: string) => erros.includes(c);
  const p = etapa ? `et-${etapa.ordem}` : "et-nova";
  const mudar = (x: Partial<Rascunho>) => setD((v) => ({ ...v, ...x }));

  async function salvar() {
    const e: string[] = [];
    if (d.nome.trim().length < 2 || d.nome.trim().length > 60) e.push("nome");
    if (d.descricao.trim() && (d.descricao.trim().length < 2 || d.descricao.trim().length > 200)) e.push("descricao");
    if (d.textoCliente.trim().length < 10 || d.textoCliente.trim().length > 240) e.push("textoCliente");
    setErros(e);
    setFalha(null);
    if (e.length) return focarPrimeiroErro(raiz.current);
    setEnviando(true);
    const corpo = { nome: d.nome.trim(), descricao: d.descricao.trim() || null, textoCliente: d.textoCliente.trim(), avisaFinanceiro: d.avisaFinanceiro };
    const r = etapa
      ? await chamarPortal(`/v1/escritorio/juridico/etapas/${etapa.id}`, { metodo: "PUT", corpo: { ...corpo, versao: etapa.versao } })
      : await chamarPortal("/v1/escritorio/juridico/etapas", { metodo: "POST", corpo });
    setEnviando(false);
    if (r.ok) return aoSalvo(corpo.nome);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length && !r.erro.detalhes?.motivo) {
      setErros(campos.map(String));
      return focarPrimeiroErro(raiz.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou esta etapa enquanto você editava. Cancele, recarregue a página e edite de novo." : textoDoErro(r.erro));
  }

  return (
    <form ref={raiz} className="jr-et-form" noValidate aria-label={etapa ? `Editar a etapa ${etapa.nome}` : "Nova etapa"}
      onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
      {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A etapa ainda não foi salva.</Aviso> : null}
      {falha ? <Aviso tom="urgencia" titulo="A etapa não foi salva.">{falha}</Aviso> : null}
      <div className="hn-campos">
        <div className="campo c3">
          <label htmlFor={`${p}-nome`}>Nome da etapa</label>
          <input className="entrada" id={`${p}-nome`} type="text" autoComplete="off" maxLength={60} value={d.nome} onChange={(e) => mudar({ nome: e.target.value })} autoFocus
            aria-invalid={tem("nome") || undefined} aria-describedby={descritoPor(`${p}-nome-aj`, tem("nome") && `${p}-nome-er`)} />
          <p className="ajuda" id={`${p}-nome-aj`}>Curto. Aparece na lista de casos.</p>
          {tem("nome") ? <ErroCampo id={`${p}-nome-er`}>{MSG.nome}</ErroCampo> : null}
        </div>
        <div className="campo c3">
          <label htmlFor={`${p}-desc`}>O que é<span className="opcional"> (opcional)</span></label>
          <input className="entrada" id={`${p}-desc`} type="text" autoComplete="off" maxLength={200} value={d.descricao} onChange={(e) => mudar({ descricao: e.target.value })}
            aria-invalid={tem("descricao") || undefined} aria-describedby={descritoPor(`${p}-desc-aj`, tem("descricao") && `${p}-desc-er`)} />
          <p className="ajuda" id={`${p}-desc-aj`}>Só para a equipe.</p>
          {tem("descricao") ? <ErroCampo id={`${p}-desc-er`}>{MSG.descricao}</ErroCampo> : null}
        </div>
        <div className="campo c6">
          <div className="campo-linha">
            <label htmlFor={`${p}-txt`}>Texto para o cliente</label>
            <span className="contador" aria-hidden="true">{d.textoCliente.length} de 240</span>
          </div>
          <textarea className="entrada" id={`${p}-txt`} rows={3} maxLength={240} value={d.textoCliente} onChange={(e) => mudar({ textoCliente: e.target.value })}
            aria-invalid={tem("textoCliente") || undefined} aria-describedby={descritoPor(`${p}-txt-aj`, tem("textoCliente") && `${p}-txt-er`)} />
          <p className="ajuda" id={`${p}-txt-aj`}>Linguagem simples, sem termo jurídico. O começo e o fim da mensagem são fixos, com o nome do cliente e a parte contrária. Até 240 letras.</p>
          {tem("textoCliente") ? <ErroCampo id={`${p}-txt-er`}>{MSG.textoCliente}</ErroCampo> : null}
        </div>
        {d.textoCliente.trim().length >= 10 ? (
          <div className="c6 jr-aviso-caixa">
            <p className="jr-previa-t"><Icone nome="whats" className="ico ico-s" />Prévia com um caso de exemplo</p>
            <p className="jr-previa">{textoAvisoEtapa("Joana Pereira", escritorio, "Mercado Bom Preço", d.textoCliente.trim())}</p>
          </div>
        ) : null}
        {etapa?.final ? (
          <p className="c6 jr-nota"><Icone nome="check" className="ico" /><span>Esta é a etapa final: ao chegar nela, o T3jus pede o resultado (ganho, perda ou acordo) e encerra o caso.</span></p>
        ) : (
          <label className="opcao c6">
            <input className="marcar" type="checkbox" checked={d.avisaFinanceiro} onChange={(e) => mudar({ avisaFinanceiro: e.target.checked })} />
            <span>Avisar o Financeiro ao entrar nesta etapa<small>Ex.: requisição de pagamento expedida. A etapa fica marcada; o pedido de valor e data ao Financeiro chega com a ligação dos casos ao Financeiro.</small></span>
          </label>
        )}
      </div>
      <div className="jr-et-pe">
        {aoTirar ? (
          <button className="btn btn-fantasma jr-tirar-et" type="button" onClick={aoTirar}>
            <Icone nome="lixeira" className="ico" />
            Tirar esta etapa
          </button>
        ) : null}
        <button className="btn btn-fantasma" type="button" onClick={aoCancelar}>Cancelar</button>
        <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
          <Icone nome="check" className="ico" />
          Salvar etapa
        </button>
      </div>
    </form>
  );
}

function JanelaTirar({ etapa, etapas, aoFechar, aoFeito }: { etapa: EtapaEditavel; etapas: EtapaEditavel[]; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [para, setPara] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const destinos = etapas.filter((e) => e.id !== etapa.id && !e.final);
  async function enviar() {
    setFalha(null);
    if (etapa.casos && !para) {
      setErro(true);
      return document.getElementById("tt-para")?.focus();
    }
    setEnviando(true);
    const r = await chamarPortal<{ casosMovidos: number; para: string | null }>(`/v1/escritorio/juridico/etapas/${etapa.id}/remover`, { metodo: "POST", corpo: { moverPara: para || null } });
    setEnviando(false);
    if (r.ok) {
      return aoFeito({
        titulo: `A etapa ${etapa.nome} saiu da lista`,
        texto: r.dados.casosMovidos ? `${contar(r.dados.casosMovidos, "caso foi", "casos foram")} para ${r.dados.para}, com a mudança no histórico de cada um.` : "Ela fica guardada no histórico do escritório.",
      });
    }
    setFalha(textoDoErro(r.erro));
  }
  return (
    <Janela id="j-tirar" aberta alerta aoFechar={aoFechar} sobretitulo="Etapas do escritório" titulo={`Tirar a etapa ${etapa.nome}?`} descricao="j-tirar-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={etapa.casos ? undefined : true}>Cancelar</button>
          <button className="btn btn-perigo" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="lixeira" className="ico" />
            Tirar a etapa
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 14 }}>
        {falha ? <Aviso tom="urgencia" titulo="A etapa não saiu.">{falha}</Aviso> : null}
        <p id="j-tirar-d">
          {etapa.casos
            ? <>{contar(etapa.casos, "caso está", "casos estão")} nesta etapa. Escolha para qual etapa {etapa.casos === 1 ? "ele vai" : "eles vão"}: a mudança fica no histórico de cada caso, sem aviso ao cliente.</>
            : <>Nenhum caso está nesta etapa. Ela sai da lista e fica guardada no histórico do escritório.</>}
        </p>
        {etapa.casos ? (
          <div className="campo">
            <label htmlFor="tt-para">Os casos vão para</label>
            <select className="entrada" id="tt-para" value={para} onChange={(e) => { setPara(e.target.value); setErro(false); }} data-foco
              aria-invalid={erro || undefined} aria-describedby={descritoPor(erro && "tt-para-er")}>
              <option value="">Escolha a etapa</option>
              {destinos.map((e) => <option key={e.id} value={e.id}>{e.ordem}. {e.nome}</option>)}
            </select>
            {erro ? <ErroCampo id="tt-para-er">Escolha para qual etapa os casos vão.</ErroCampo> : null}
          </div>
        ) : null}
      </div>
    </Janela>
  );
}

function EtapasConteudo() {
  const { dados, recarregar } = useCarga<EtapasEscritorio>("/v1/escritorio/juridico/etapas");
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [tirar, setTirar] = useState<EtapaEditavel | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [movendo, setMovendo] = useState(false);
  const cab = (dono: boolean) => (
    <div className="pt-cab">
      <div>
        <a className="voltar jr-voltar" href={ROTAS_JURIDICO.casos}><Icone nome="esquerda" className="ico ico-s" />Casos e processos</a>
        <p className="sobretitulo">Jurídico{dono ? " · só a sócia dona edita" : ""}</p>
        <h1>Etapas do escritório</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">O caminho que todo caso percorre aqui, com o texto que o cliente recebe em cada passo.</p>
      </div>
    </div>
  );
  if (dados === "erro") return <>{cab(false)}<ErroAoCarregar oque="as etapas" aoTentar={recarregar} /></>;
  if (!dados) return <>{cab(false)}<Carregando rotulo="Carregando as etapas…" linhas={4} /></>;
  const ed = dados.podeEditar;
  const lista = dados.etapas;
  const final = lista.find((e) => e.final);

  async function mover(e: EtapaEditavel, direcao: "SOBE" | "DESCE") {
    setFalha(null);
    setMovendo(true);
    const r = await chamarPortal(`/v1/escritorio/juridico/etapas/${e.id}/mover`, { metodo: "POST", corpo: { direcao } });
    setMovendo(false);
    if (!r.ok) return setFalha(textoDoErro(r.erro));
    setFeito({ titulo: `${e.nome} ${direcao === "SOBE" ? "subiu" : "desceu"}`, texto: "A nova ordem vale para todos os casos." });
    recarregar();
  }

  const linha = (e: EtapaEditavel, i: number) => {
    const fixaSobe = e.final || i === 0;
    const fixaDesce = e.final || lista[i + 1]?.final;
    if (editando === e.id) {
      return (
        <li key={e.id} className="jr-et jr-et-ed">
          <span className="jr-et-n" aria-hidden="true">{e.ordem}</span>
          <FormEtapa etapa={e} escritorio={dados.escritorio} aoCancelar={() => setEditando(null)}
            aoSalvo={(n) => { setEditando(null); setFeito({ titulo: "Etapa salva", texto: `${n} vale para todos os casos, que continuam na mesma etapa.` }); recarregar(); }}
            aoTirar={e.final ? undefined : () => setTirar(e)} />
        </li>
      );
    }
    return (
      <li key={e.id} className="jr-et">
        <span className="jr-et-n" aria-hidden="true">{e.ordem}</span>
        <div className="jr-et-oque">
          <h3>
            <span className="sr">Etapa {e.ordem}: </span>{e.nome}
            {e.avisaFinanceiro ? <span className="selo selo-atencao"><Icone nome="moeda" className="ico" />Avisa o Financeiro</span> : null}
            {e.final ? <span className="selo selo-urgente jr-selo-final">Etapa final · pede o resultado</span> : null}
          </h3>
          <small>
            {[e.descricao, e.final ? contar(e.encerrados ?? 0, "caso encerrado", "casos encerrados") : contar(e.casos, "caso", "casos")].filter(Boolean).join(" · ")}
          </small>
          <p className="jr-et-txt">“{e.textoCliente.charAt(0).toUpperCase() + e.textoCliente.slice(1)}”</p>
        </div>
        {ed ? (
          <div className="jr-et-acoes">
            <button className="jr-seta jr-seta-sobe" type="button" disabled={fixaSobe || movendo} onClick={() => void mover(e, "SOBE")} aria-label={`Subir ${e.nome}`}>
              <Icone nome="baixo" className="ico" />
            </button>
            <button className="jr-seta" type="button" disabled={Boolean(fixaDesce) || movendo} onClick={() => void mover(e, "DESCE")} aria-label={`Descer ${e.nome}`}>
              <Icone nome="baixo" className="ico" />
            </button>
            <button className="btn btn-sec btn-compacto" type="button" onClick={() => { setFalha(null); setEditando(e.id); }} aria-label={`Editar ${e.nome}`}>
              <Icone nome="lapis" className="ico" />
              Editar
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="hn">
      {cab(ed)}
      <div className="hn-grade">
        <section className="folha" aria-labelledby="t-et" style={{ overflow: "hidden" }}>
          <div className="folha-cab jr-ets-cab">
            <div>
              <h2 id="t-et">Etapas dos casos</h2>
              <p className="sub">{contar(lista.length, "etapa", "etapas")} · valem para todos os casos do escritório · a última é sempre a final</p>
            </div>
            {ed && editando !== "nova" ? (
              <button data-muda className="btn btn-sec" type="button" onClick={() => { setFalha(null); setEditando("nova"); }}>
                <Icone nome="mais" className="ico" />
                Adicionar etapa
              </button>
            ) : null}
          </div>
          {falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="A ordem não mudou.">{falha}</Aviso></div> : null}
          <ol className="jr-ets">
            {lista.map((e, i) => (
              <Fragment key={e.id}>
                {editando === "nova" && e.final ? (
                  <li key="nova" className="jr-et jr-et-ed">
                    <span className="jr-et-n" aria-hidden="true">{final?.ordem}</span>
                    <FormEtapa etapa={null} escritorio={dados.escritorio} aoCancelar={() => setEditando(null)}
                      aoSalvo={(n) => { setEditando(null); setFeito({ titulo: "Etapa adicionada", texto: `${n} entrou antes da final.` }); recarregar(); }} />
                  </li>
                ) : null}
                {linha(e, i)}
              </Fragment>
            ))}
          </ol>
          <p className="hn-pe">
            <Icone nome="historico" className="ico" />
            <span>{ed ? "Cada mudança na lista fica no histórico do escritório, com seu nome e a hora. Os casos não mudam de etapa sozinhos." : "Só a sócia dona muda esta lista. A equipe vê as etapas aqui, na lista de casos e na ficha."}</span>
          </p>
        </section>
        <aside className="hn-col" aria-label="Como funcionam as etapas">
          <section className="explica campo-ambar" aria-labelledby="t-etx">
            <p className="sobretitulo">Como funciona</p>
            <h2 id="t-etx">O escritório decide o caminho.</h2>
            <ul>
              <li><Icone nome="lapis" className="ico" /><span>Mude nomes, textos e a ordem quando quiser. Os casos continuam na mesma etapa, com o nome novo.</span></li>
              <li><Icone nome="pasta" className="ico" /><span>Para tirar uma etapa com casos, escolha para qual etapa eles vão. Nada some.</span></li>
              <li><Icone nome="check" className="ico" /><span>A última etapa é a final: ao chegar nela, o T3jus pede o resultado (ganho, perda ou acordo).</span></li>
              <li><Icone nome="whats" className="ico" /><span>O texto para o cliente vai no aviso do WhatsApp. Quem muda a etapa vê a prévia e pode não enviar.</span></li>
              <li><Icone nome="cadeado" className="ico" /><span>Só a sócia dona muda esta lista. A equipe vê as etapas, mas não edita.</span></li>
            </ul>
          </section>
        </aside>
      </div>
      {tirar ? (
        <JanelaTirar etapa={tirar} etapas={lista} aoFechar={() => setTirar(null)}
          aoFeito={(f) => { setTirar(null); setEditando(null); setFeito(f); recarregar(); }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function EtapasJuridicoPortal() {
  return (
    <MolduraArea area="JURIDICO" secao="casos" trilha={[{ nome: "Etapas do escritório" }]}>
      {() => <EtapasConteudo />}
    </MolduraArea>
  );
}
