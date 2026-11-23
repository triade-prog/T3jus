"use client";
// A assinatura do contrato abre o caso no Jurídico (CH-10, EX-01; F3.111), tela aprovada em
// docs/design/aprovadas/portal-ficha-cliente-ligada (decisões 15 a 21): a janela "Registrar
// assinatura" ganha a seção "O caso em Jurídico" (abrir um caso novo, juntar a um que já existe
// ou "este contrato não tem caso"), e a janela curta "Abrir o caso" vale para o contrato
// assinado antes. A mesma janela serve à ficha do cliente e à ficha do contrato. Quem não tem a
// área Jurídico assina e o caso abre com os dados do contrato; o servidor decide e confere tudo.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AREAS_DIREITO, dataBr, hojeBrasilia, PAPEIS_CASO,
  type AreaDireito, type AssinaturaComCaso, type CasoDoContrato, type ModoCaso, type OpcoesCasoContrato, type PapelCaso,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { lerDia } from "./agenda.ts";
import { CampoAnexo, enviarAnexo } from "./Anexos.tsx";
import { primeiroNome } from "./equipe.ts";
import { dia } from "./fichaLigada.ts";
import { chamarPortal } from "./Moldura.tsx";

export type FimDaAssinatura = AssinaturaComCaso & { responsavel: string | null; semCaso: boolean };
export type FimDoCaso = { casoId: string | null; semCaso?: boolean };

type Escolha = { modo: ModoCaso; nome: string; area: AreaDireito; responsavelId: string; papel: PapelCaso; casoId: string };

function useOpcoes(aberta: boolean, contrato: string) {
  const [o, setO] = useState<OpcoesCasoContrato | "erro" | null>(null);
  const carregar = useCallback(async () => {
    setO(null);
    const r = await chamarPortal<OpcoesCasoContrato>(`/v1/escritorio/contratos/${contrato}/caso`);
    setO(r.ok ? r.dados : "erro");
  }, [contrato]);
  useEffect(() => {
    if (aberta) void Promise.resolve().then(() => carregar());
  }, [aberta, carregar]);
  return { o, carregar };
}

/** A escolha que abre a janela. Com o cliente num caso sem contrato, juntar vem marcado (CH-12, decisão 11). */
export function escolhaInicial(o: OpcoesCasoContrato, modo: ModoCaso): Escolha {
  const doCliente = o.casosDoCliente ?? [];
  const um = doCliente.length === 1 ? doCliente[0]! : null;
  const juntar = modo === "NOVO" && o.modoSugerido === "JUNTAR" && doCliente.length > 0;
  return {
    modo: juntar ? "JUNTAR" : modo,
    nome: o.sugestao.nome,
    area: o.sugestao.area,
    responsavelId: o.sugestao.responsavelId ?? "",
    papel: juntar && um ? um.papel : o.sugestao.papel,
    casoId: juntar && um ? um.id : "",
  };
}

/** O "caso" que vai ao servidor. Sem Jurídico, só o modo: o servidor usa os dados do contrato. */
function corpoDoCaso(e: Escolha, escolhe: boolean): CasoDoContrato {
  if (e.modo === "SEM") return { modo: "SEM" };
  if (!escolhe) return { modo: "NOVO" };
  if (e.modo === "JUNTAR") return { modo: "JUNTAR", casoId: e.casoId, papel: e.papel };
  return { modo: "NOVO", nome: e.nome.trim(), area: e.area, responsavelId: e.responsavelId || null, papel: e.papel };
}

/** O que falta na escolha, antes de ir ao servidor. */
function errosDaEscolha(e: Escolha): Record<string, string> {
  const x: Record<string, string> = {};
  if (e.modo === "NOVO" && e.nome.trim().length < 3) x.nome = "Escreva o nome do caso, com pelo menos 3 letras.";
  if (e.modo === "NOVO" && !e.responsavelId) x.responsavelId = "Escolha quem fica responsável.";
  if (e.modo === "JUNTAR" && !e.casoId) x.casoId = "Escolha o caso em andamento.";
  return x;
}

/** Erros do servidor nos campos do caso ("caso.nome") viram erros da seção. */
function errosDoCaso(campos: unknown): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Array.isArray(campos)) return e;
  for (const c of campos) {
    if (c === "caso.nome") e.nome = "Escreva o nome do caso, com pelo menos 3 letras.";
    if (c === "caso.area") e.area = "Escolha a área do direito.";
    if (c === "caso.responsavelId") e.responsavelId = "Escolha quem fica responsável, entre quem tem a área Jurídico.";
    if (c === "caso.papel") e.papel = "Escolha o papel do cliente no caso.";
    if (c === "caso.casoId") e.casoId = "Escolha o caso em andamento.";
    if (c === "caso.modo") e.modo = "Escolha o que fazer com o caso.";
  }
  return e;
}

function SecaoCaso({ o, e, aoMudar, erros, pref, semOpcaoSem, legenda, sub }: {
  o: OpcoesCasoContrato;
  e: Escolha;
  aoMudar: (x: Partial<Escolha>) => void;
  erros: Record<string, string>;
  pref: string;
  semOpcaoSem?: boolean;
  legenda: string;
  sub: string;
}) {
  const cliente = primeiroNome(o.contrato.cliente.nome);
  const op = (modo: ModoCaso, rotulo: string, ajuda: string) => (
    <label className={`opcao${e.modo === modo && modo !== "SEM" ? " fl-aberta" : ""}`}>
      <input className="marcar" type="radio" name={`${pref}-modo`} value={modo} checked={e.modo === modo} onChange={() => aoMudar({ modo })} />
      <span>
        {rotulo}
        <small>{ajuda}</small>
      </span>
    </label>
  );
  const sel = (k: "area" | "responsavelId" | "papel" | "casoId", rotulo: string, opcoes: [string, string][], classe: string, ajuda?: string) => {
    const id = `${pref}-${k}`;
    return (
      <div className={`campo ${classe}`}>
        <label htmlFor={id}>{rotulo}</label>
        <select className="entrada" id={id} value={e[k]} onChange={(ev) => aoMudar({ [k]: ev.target.value } as Partial<Escolha>)}
          aria-invalid={erros[k] ? true : undefined} aria-describedby={descritoPor(!erros[k] && ajuda && `${id}-aj`, erros[k] && `${id}-er`)}>
          {k === "casoId" || k === "responsavelId" ? <option value="">Escolha</option> : null}
          {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        {!erros[k] && ajuda ? <p className="ajuda" id={`${id}-aj`}>{ajuda}</p> : null}
        {erros[k] ? <ErroCampo id={`${id}-er`}>{erros[k]}</ErroCampo> : null}
      </div>
    );
  };
  const papeis = Object.entries(PAPEIS_CASO) as [string, string][];
  const doCliente = o.casosDoCliente ?? [];
  const um = doCliente.length === 1 ? doCliente[0]! : null;
  const novo = e.modo === "NOVO" ? (
    <div className="fl-novo">
      <div className="campo c3">
        <label htmlFor={`${pref}-nome`}>Nome do caso</label>
        <input className="entrada" id={`${pref}-nome`} value={e.nome} maxLength={200} autoComplete="off" onChange={(ev) => aoMudar({ nome: ev.target.value })}
          aria-invalid={erros.nome ? true : undefined} aria-describedby={descritoPor(!erros.nome && `${pref}-nome-aj`, erros.nome && `${pref}-nome-er`)} />
        {erros.nome ? <ErroCampo id={`${pref}-nome-er`}>{erros.nome}</ErroCampo> : (
          <p className="ajuda" id={`${pref}-nome-aj`}>Sugerido pelo nome do cliente e o objeto do contrato. Troque pelo que a equipe usa.</p>
        )}
      </div>
      {sel("area", "Área", Object.entries(AREAS_DIREITO) as [string, string][], "c3")}
      {sel("responsavelId", "Responsável", (o.responsaveis ?? []).map((p) => [p.id, p.nome]), "c3",
        o.responsavelSugerido ? `Sugerido: ${o.responsavelSugerido.nome}.` : undefined)}
      {sel("papel", `${cliente} no caso`, papeis, "c3")}
      <p className="fl-fixo">
        <Icone nome="seta" className="ico" />
        <span>Começa na primeira etapa do escritório. Número, vara e parte contrária entram na ficha do caso, quando houver.</span>
      </p>
    </div>
  ) : null;
  const sem = semOpcaoSem ? null : op("SEM", "Este contrato não tem caso", "Consultoria ou serviço sem processo. Dá para abrir o caso depois, pela ficha do contrato.");
  // CH-12 (decisão 11): o cliente já está num caso em andamento sem contrato. Juntar vem primeiro.
  if (doCliente.length) {
    return (
      <fieldset className="fl-caso">
        <legend>
          {legenda}
          <small>{um ? `${cliente} já tem um caso em andamento, sem contrato.` : `${cliente} já tem ${doCliente.length} casos em andamento, sem contrato.`}</small>
        </legend>
        {erros.modo ? <ErroCampo id={`${pref}-modo-er`}>{erros.modo}</ErroCampo> : null}
        {op("JUNTAR", um ? `Juntar a este caso: ${um.nome}` : `Juntar a um caso de ${cliente}`, "O mais provável: é o mesmo processo. Evita dois casos para a mesma coisa.")}
        {e.modo === "JUNTAR" ? (
          <div className="fl-novo">
            {um ? (
              <div className="jf-junta" style={{ gridColumn: "1 / -1" }}>
                <b>{um.nome}</b>
                <span>Em andamento{um.etapa ? ` · ${um.etapa}` : ""}{um.responsavel ? ` · com ${um.responsavel.nome}` : ""}</span>
                <span>Aberto{um.abertoPor ? ` por ${primeiroNome(um.abertoPor.nome)}` : ""} em {dia(um.abertoEm)}, <b>ainda sem contrato</b>.</span>
              </div>
            ) : sel("casoId", "Caso", doCliente.map((c) => [c.id, `${c.nome}${c.etapa ? ` · ${c.etapa}` : ""}`]), "c4")}
            {sel("papel", `${cliente} no caso`, papeis, um ? "c3" : "c2", "Como já está no caso.")}
            <p className="fl-fixo">
              <Icone nome="seta" className="ico" />
              <span>O contrato {o.contrato.numero} passa a ser o de {cliente} neste caso. A etapa não muda e nenhum caso novo é aberto.</span>
            </p>
          </div>
        ) : null}
        {op("NOVO", "Abrir um caso novo", "Só se este contrato for de outro processo. Os dados vêm do contrato.")}
        {novo}
        {sem}
      </fieldset>
    );
  }
  return (
    <fieldset className="fl-caso">
      <legend>
        {legenda}
        <small>{sub}</small>
      </legend>
      {erros.modo ? <ErroCampo id={`${pref}-modo-er`}>{erros.modo}</ErroCampo> : null}
      {op("NOVO", "Abrir um caso novo", "Já preenchido com o que está no contrato. Tudo se muda depois, na ficha do caso.")}
      {novo}
      {op("JUNTAR", "Juntar a um caso que já existe", "Quando o processo já está no T3jus com outro cliente.")}
      {e.modo === "JUNTAR" ? (
        <div className="fl-novo">
          {o.casos && o.casos.length ? (
            <>
              {sel("casoId", "Caso", o.casos.map((c) => [c.id, `${c.nome} · ${c.clientes === 1 ? "1 cliente" : `${c.clientes} clientes`}`]), "c4")}
              {sel("papel", `${cliente} no caso`, papeis, "c2")}
            </>
          ) : (
            <p className="fl-fixo">
              <Icone nome="alerta" className="ico" />
              <span>Nenhum caso em andamento no escritório. Abra um caso novo.</span>
            </p>
          )}
        </div>
      ) : null}
      {sem}
    </fieldset>
  );
}

/** O caso que abre sem escolha, para quem não tem a área Jurídico (decisão 19). */
function CasoSemEscolha({ o }: { o: OpcoesCasoContrato }) {
  const resp = o.responsavelSugerido?.nome ?? null;
  return (
    <div className="fl-caso" role="group" aria-labelledby="fl-sj-t">
      <p id="fl-sj-t" className="fl-caso-t">O caso abre em Jurídico</p>
      <div className="fl-ja">
        <dl>
          <dt>Caso</dt>
          <dd>{o.sugestao.nome}</dd>
          <dt>Área</dt>
          <dd>{AREAS_DIREITO[o.sugestao.area] ?? o.sugestao.area}</dd>
          <dt>Responsável</dt>
          <dd>{resp ?? "A sócia dona"}</dd>
        </dl>
      </div>
      <p className="ajuda" style={{ margin: 0 }}>
        Você não tem a área Jurídico: o caso abre com estes dados{resp ? `, e ${primeiroNome(resp)} recebe o aviso no sino para conferir` : ""}.
      </p>
    </div>
  );
}

function CasoJaLigado({ o }: { o: OpcoesCasoContrato }) {
  const c = o.casoLigado!;
  return (
    <div className="fl-caso" role="group" aria-labelledby="fl-ja-t">
      <p id="fl-ja-t" className="fl-caso-t">O caso já existe</p>
      <div className="fl-ja">
        <dl>
          {c.nome ? (<><dt>Caso</dt><dd>{c.nome}</dd></>) : null}
          {c.etapa ? (<><dt>Etapa</dt><dd>{c.etapa}</dd></>) : null}
          {c.responsavel ? (<><dt>Responsável</dt><dd>{c.responsavel.nome}</dd></>) : null}
        </dl>
      </div>
      <p className="ajuda" style={{ margin: 0 }}>Nenhum caso novo é aberto. Se o contrato for de outro caso, mude a ligação na ficha do caso.</p>
    </div>
  );
}

export function JanelaAssinaturaCaso({ aberta, contrato, aoFechar, aoFeito }: {
  aberta: boolean;
  contrato: string;
  aoFechar: () => void;
  aoFeito: (r: FimDaAssinatura) => void;
}) {
  const ids = useId();
  const { o, carregar } = useOpcoes(aberta, contrato);
  const hoje = hojeBrasilia();
  const [em, setEm] = useState(dataBr(hoje));
  const [erroData, setErroData] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [anexado, setAnexado] = useState(false);
  const [e, setE] = useState<Escolha | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const pronto = o && o !== "erro" ? o : null;
  useEffect(() => {
    if (pronto && !e) void Promise.resolve().then(() => setE(escolhaInicial(pronto, "NOVO")));
  }, [pronto, e]);

  const ja = !!pronto?.casoLigado;
  const escolhe = pronto?.escolhe ?? false;
  const modo = ja ? null : escolhe ? e?.modo ?? "NOVO" : "NOVO";

  async function enviar() {
    if (!pronto || !e) return;
    setFalha(null);
    const d = lerDia(em);
    const semData = !d || d > hoje;
    const semArquivo = !anexado && !arquivo ? "Anexe o contrato assinado: PDF ou a foto das páginas." : !anexado ? erroArq : null;
    const x: Record<string, string> = !ja && escolhe ? errosDaEscolha(e) : {};
    setErroData(semData);
    setErroArq(semArquivo);
    setErros(x);
    if (semData || semArquivo || Object.keys(x).length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    // Primeiro o arquivo; a assinatura e o caso só se registram com ele guardado.
    if (!anexado && arquivo) {
      setProgresso(0);
      const er = await enviarAnexo("CONTRATO", contrato, arquivo, null, setProgresso);
      setProgresso(null);
      if (er) {
        setEnviando(false);
        return setFalha(`O arquivo não foi guardado. A assinatura não foi registrada e o caso não foi aberto. ${er}`);
      }
      setAnexado(true);
    }
    const r = await chamarPortal<AssinaturaComCaso>(`/v1/escritorio/contratos/${contrato}/assinatura`, {
      metodo: "POST",
      corpo: { versao: pronto.contrato.versao, assinadoEm: d, caso: ja ? { modo: "NOVO" } : corpoDoCaso(e, escolhe) },
    });
    setEnviando(false);
    if (r.ok) {
      return aoFeito({
        ...r.dados,
        responsavel: pronto.casoLigado?.responsavel?.nome ?? (escolhe && e.modo === "NOVO"
          ? (pronto.responsaveis ?? []).find((p) => p.id === e.responsavelId)?.nome ?? null
          : pronto.responsavelSugerido?.nome ?? null),
        semCaso: !ja && escolhe && e.modo === "SEM",
      });
    }
    if (r.erro.codigo === "VALIDATION_ERROR") {
      const campos = r.erro.detalhes?.campos;
      const doCaso = errosDoCaso(campos);
      if (Object.keys(doCaso).length) {
        setErros(doCaso);
        setFalha("A assinatura não foi registrada e o caso não foi aberto: os dois andam juntos. O que você escolheu continua aqui.");
        return focarPrimeiroErro(corpo.current);
      }
      setErroData(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT"
      ? "Alguém mudou este contrato agora há pouco. Feche, recarregue a página e registre de novo."
      : `Os dois andam juntos: ou ficam os dois, ou nenhum.${anexado ? " O arquivo assinado já está guardado e" : ""} o que você escolheu continua aqui. ${textoDoErro(r.erro)}`);
  }

  const c = pronto?.contrato;
  const botao = ja ? "Registrar e ir para o caso" : !escolhe ? "Registrar assinatura" : modo === "SEM" ? "Registrar assinatura"
    : modo === "JUNTAR" ? "Registrar e juntar ao caso" : "Registrar e abrir o caso";
  const depois = !pronto ? null : ja
    ? <>Ao registrar, o contrato fica ativo, os recebimentos passam a existir e <b>{escolheVer(pronto) ? "você vai para a ficha do caso" : "você continua nesta ficha"}</b>.</>
    : !escolhe
      ? <>Ao registrar, o contrato fica ativo, os recebimentos passam a existir e o caso abre em Jurídico. <b>Você continua nesta ficha.</b></>
      : modo === "SEM"
        ? <>Ao registrar, o contrato fica ativo e os recebimentos passam a existir. <b>Nenhum caso é aberto.</b></>
        : <>Ao registrar, o contrato fica ativo, os recebimentos passam a existir e <b>você vai para a ficha do caso</b>, em Jurídico › Casos e processos.</>;

  return (
    <Janela id={`${ids}-as`} classe="fl-janela" aberta={aberta} aoFechar={aoFechar} sobretitulo={c ? `${c.numero} · ${c.cliente.nome}` : "Contrato"}
      titulo="Registrar assinatura" descricao={`${ids}-as-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          {pronto ? (
            <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
              <Icone nome={botao === "Registrar assinatura" ? "check" : "balanca"} className="ico" />
              {enviando ? "Registrando…" : botao}
            </button>
          ) : null}
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-as-d`}>Anexe o contrato assinado e diga a data. Fica no histórico, com seu nome e a hora.</p>
        {o === "erro" ? (
          <ErroAoCarregar oque="o contrato" aoTentar={() => void carregar()} />
        ) : !pronto || !e ? (
          <Carregando rotulo="Carregando o contrato…" linhas={3} />
        ) : (
          <>
            {falha ? <Aviso tom="urgencia" titulo="A assinatura não foi registrada e o caso não foi aberto.">{falha}</Aviso> : null}
            <div className="campo">
              <label htmlFor={`${ids}-data`}>Data da assinatura</label>
              <input className="entrada" id={`${ids}-data`} type="text" inputMode="numeric" autoComplete="off" value={em} onChange={(ev) => setEm(ev.target.value)} data-foco=""
                aria-invalid={erroData || undefined} aria-describedby={descritoPor(`${ids}-data-aj`, erroData && `${ids}-data-er`)} />
              <p className="ajuda" id={`${ids}-data-aj`}>dd/mm/aaaa. Hoje ou antes, desde {dia(pronto.contrato.criadoEm)}, quando o contrato foi criado.</p>
              {erroData ? <ErroCampo id={`${ids}-data-er`}>Escreva a data da assinatura, hoje ou antes, desde que o contrato foi criado, no formato dd/mm/aaaa.</ErroCampo> : null}
            </div>
            {anexado ? (
              <Aviso tom="sucesso" titulo="O arquivo assinado já está guardado.">Falta só registrar a assinatura.</Aviso>
            ) : (
              <CampoAnexo rotulo="Contrato assinado" opcional={false} ajuda="PDF ou foto do contrato assinado, num arquivo só. Fica na aba Documentos do contrato."
                arquivo={arquivo} aoEscolher={(a, er) => { setArquivo(er ? null : a); setErroArq(er); }} erro={erroArq} progresso={progresso} />
            )}
            {ja ? <CasoJaLigado o={pronto} /> : escolhe ? (
              <SecaoCaso o={pronto} e={e} aoMudar={(x) => setE((v) => (v ? { ...v, ...x } : v))} erros={erros} pref={`${ids}-c`}
                legenda="O caso em Jurídico" sub={`A assinatura leva ${primeiroNome(pronto.contrato.cliente.nome)} direto para Casos e processos.`} />
            ) : <CasoSemEscolha o={pronto} />}
            <p className="fl-depois">
              <Icone nome="seta" className="ico" />
              <span>{depois}</span>
            </p>
          </>
        )}
      </div>
    </Janela>
  );
}

const escolheVer = (o: OpcoesCasoContrato) => o.escolhe;

export function JanelaAbrirCaso({ aberta, contrato, modoInicial = "NOVO", comSem = false, titulo, aoFechar, aoFeito }: {
  aberta: boolean;
  contrato: string;
  modoInicial?: "NOVO" | "JUNTAR";
  /** Da ficha do contrato marcado "não tem caso": "Abrir um caso para este contrato" (decisão 28). */
  titulo?: string;
  /** Aberta das listas de assinados sem caso (decisão 8): oferece também "não tem caso". */
  comSem?: boolean;
  aoFechar: () => void;
  aoFeito: (r: FimDoCaso) => void;
}) {
  const ids = useId();
  const { o, carregar } = useOpcoes(aberta, contrato);
  const [e, setE] = useState<Escolha | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const pronto = o && o !== "erro" ? o : null;
  useEffect(() => {
    if (pronto && !e) void Promise.resolve().then(() => setE(escolhaInicial(pronto, modoInicial)));
  }, [pronto, e, modoInicial]);

  async function enviar() {
    if (!pronto || !e) return;
    setFalha(null);
    if (pronto.casoLigado?.id) return aoFeito({ casoId: pronto.casoLigado.id });
    const x = errosDaEscolha(e);
    setErros(x);
    if (Object.keys(x).length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal<FimDoCaso>(`/v1/escritorio/contratos/${contrato}/caso`, { metodo: "POST", corpo: { caso: corpoDoCaso(e, true) } });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados);
    const doCaso = r.erro.codigo === "VALIDATION_ERROR" ? errosDoCaso(r.erro.detalhes?.campos) : {};
    if (Object.keys(doCaso).length) {
      setErros(doCaso);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(r.erro));
  }

  const c = pronto?.contrato;
  return (
    <Janela id={`${ids}-ac`} classe="fl-janela" aberta={aberta} aoFechar={aoFechar} sobretitulo={c ? `${c.numero} · ${c.cliente.nome}` : "Contrato"}
      titulo={titulo ?? (comSem ? "O caso deste contrato" : e?.modo === "JUNTAR" ? "Juntar a um caso" : "Abrir o caso")} descricao={`${ids}-ac-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          {pronto ? (
            <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
              <Icone nome="balanca" className="ico" />
              {enviando ? "Gravando…" : pronto.casoLigado ? "Ir para o caso" : e?.modo === "JUNTAR" ? "Juntar ao caso" : e?.modo === "SEM" ? "Marcar sem caso" : "Abrir o caso"}
            </button>
          ) : null}
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-ac-d`}>{comSem
          ? "O contrato foi assinado sem caso. Escolha o que fazer; fica no histórico do contrato, com seu nome e a hora."
          : "O contrato já está assinado. O caso nasce com os dados dele, e fica no histórico com seu nome e a hora."}</p>
        {o === "erro" ? (
          <ErroAoCarregar oque="o contrato" aoTentar={() => void carregar()} />
        ) : !pronto || !e ? (
          <Carregando rotulo="Carregando o contrato…" linhas={3} />
        ) : (
          <>
            {falha ? <Aviso tom="urgencia" titulo="O caso não foi aberto.">{falha}</Aviso> : null}
            <div className="fl-ja">
              <dl>
                <dt>Contrato</dt>
                <dd>{pronto.contrato.numero} · {pronto.contrato.objeto}</dd>
              </dl>
            </div>
            {pronto.casoLigado ? <CasoJaLigado o={pronto} /> : (
              <SecaoCaso o={pronto} e={e} aoMudar={(x) => setE((v) => (v ? { ...v, ...x } : v))} erros={erros} pref={`${ids}-c`} semOpcaoSem={!comSem}
                legenda="O caso" sub="Preenchido com o que está no contrato." />
            )}
            <p className="fl-depois">
              <Icone nome="seta" className="ico" />
              <span>{e.modo === "SEM"
                ? <>Ao marcar, o contrato sai da lista dos assinados sem caso. <b>Nenhum caso é aberto.</b></>
                : <>Ao {e.modo === "JUNTAR" ? "juntar" : "abrir"}, <b>você vai para a ficha do caso</b>, em Jurídico › Casos e processos.</>}</span>
            </p>
          </>
        )}
      </div>
    </Janela>
  );
}

/**
 * A pergunta do caso para outra janela que registra a assinatura (CH-11, F3.125): "Anexar os
 * assinados", em Contratos › Modelos. É a mesma seção da "Registrar assinatura" (decisão 1).
 */
export function usePerguntaDoCaso(ativa: boolean, contrato: string) {
  const ids = useId();
  const { o, carregar } = useOpcoes(ativa, contrato);
  const [e, setE] = useState<Escolha | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const pronto = o && o !== "erro" ? o : null;
  useEffect(() => {
    if (pronto && !e) void Promise.resolve().then(() => setE(escolhaInicial(pronto, "NOVO")));
  }, [pronto, e]);
  const ja = !!pronto?.casoLigado;
  const escolhe = pronto?.escolhe ?? false;
  const modo: ModoCaso | null = !ativa || !pronto ? null : ja ? null : escolhe ? e?.modo ?? "NOVO" : "NOVO";
  return {
    pronta: !!pronto && !!e,
    modo,
    ja,
    escolhe,
    responsavel: (): string | null => pronto?.casoLigado?.responsavel?.nome ?? (escolhe && e?.modo === "NOVO"
      ? (pronto?.responsaveis ?? []).find((p) => p.id === e.responsavelId)?.nome ?? null
      : pronto?.responsavelSugerido?.nome ?? null),
    /** Confere a escolha; devolve se está tudo certo. */
    validar(): boolean {
      const x = pronto && e && !ja && escolhe ? errosDaEscolha(e) : {};
      setErros(x);
      return !!pronto && !!e && !Object.keys(x).length;
    },
    corpo: (): CasoDoContrato => (ja || !e ? { modo: "NOVO" } : corpoDoCaso(e, escolhe)),
    /** Os erros do servidor nos campos do caso; devolve se havia algum. */
    doServidor(campos: unknown): boolean {
      const d = errosDoCaso(campos);
      setErros(d);
      return Object.keys(d).length > 0;
    },
    secao: (cliente: string) => o === "erro" ? <ErroAoCarregar oque="o caso do contrato" aoTentar={() => void carregar()} />
      : !pronto || !e ? <Carregando rotulo="Carregando o caso…" linhas={2} />
      : ja ? <CasoJaLigado o={pronto} />
      : escolhe ? (
        <SecaoCaso o={pronto} e={e} aoMudar={(x) => setE((v) => (v ? { ...v, ...x } : v))} erros={erros} pref={`${ids}-c`}
          legenda="O caso em Jurídico" sub={`Anexar o contrato assinado leva ${primeiroNome(cliente)} para Casos e processos, como na assinatura.`} />
      ) : <CasoSemEscolha o={pronto} />,
  };
}
