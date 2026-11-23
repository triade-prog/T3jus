"use client";
// A folha "Prazo do comprovante" (F3.134, AP-08), desenho aprovado em
// docs/design/aprovadas/portal-prazo-comprovante: no alto da coluna do lado de Documentos para
// começar. Só a sócia dona muda (o banco confere); a equipe vê o prazo, a contagem e quem muda.
// Antes de salvar, o quadro do efeito conta os comprovantes que mudam de selo (a prévia do
// banco, 400 ms depois da última escolha). Mudar o prazo não pede nem fecha pedido.

import { useEffect, useRef, useState } from "react";
import {
  OPCOES_PRAZO_COMPROVANTE, PRAZO_COMPROVANTE, quemMuda,
  type DocumentosInicio, type PrazoComprovanteSalvo, type PreviaPrazoComprovante,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo } from "../console/pecas.tsx";
import { chamarPortal } from "./Moldura.tsx";
import { lerDias, textoAgora, textoCaixa, textoEfeito, textoPedidoAberto } from "./prazoComprovante.ts";

const ESPERA_MS = 400;
const NOMES_MAX = 10;
const PEDIDOS_MAX = 3;
const hojeBr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export type PrazoSalvo = { r: PrazoComprovanteSalvo; titulo: string; texto: string; mudado: string };

function Folha({ children }: { children: React.ReactNode }) {
  return (
    <section className="folha" id="prazo" aria-labelledby="t-pzc" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-pzc">Prazo do comprovante</h2>
          <p className="sub">Comprovante de residência · vale para todas as áreas</p>
        </div>
      </div>
      <div className="pzc-corpo">{children}</div>
    </section>
  );
}

export function FolhaPrazoComprovante({ dados, editando, salvo, aoAbrir, aoCancelar, aoSalvo }: {
  dados: DocumentosInicio;
  editando: boolean;
  salvo: PrazoSalvo | null;
  aoAbrir: () => void;
  aoCancelar: () => void;
  aoSalvo: (r: PrazoComprovanteSalvo, trocar: boolean) => void;
}) {
  const botao = useRef<HTMLButtonElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const voltarAoBotao = useRef(false);
  useEffect(() => {
    if (!editando && voltarAoBotao.current) {
      voltarAoBotao.current = false;
      botao.current?.focus();
    }
  }, [editando]);
  useEffect(() => {
    if (salvo) aviso.current?.focus();
  }, [salvo]);

  if (editando && dados.podeMudarPrazo) {
    return (
      <Folha>
        <FormPrazo dados={dados} aoCancelar={() => { voltarAoBotao.current = true; aoCancelar(); }} aoSalvo={aoSalvo} />
      </Folha>
    );
  }
  const n = dados.validadeDias;
  const agora = textoAgora(dados.comprovantesVencidos, dados.comprovantesTotal, n);
  const dona = dados.podeMudarPrazo;
  const quem = !dona
    ? quemMuda(dados.sociosDonos ?? [])
    : salvo?.r.mudou
      ? salvo.mudado
      : (dados.sociosDonos ?? []).length > 1
        ? `${quemMuda(dados.sociosDonos ?? [])} Cada mudança fica no histórico do escritório.`
        : "Só você, como sócia dona, muda. Cada mudança fica no histórico do escritório.";
  return (
    <Folha>
      {salvo ? (
        <div ref={aviso} tabIndex={-1}>
          <Aviso tom="sucesso" titulo={salvo.titulo}>{salvo.texto}</Aviso>
        </div>
      ) : null}
      <p className="pzc-v">
        <b className="num">{n} dias</b>
        <span>contados da data que está no papel{n === PRAZO_COMPROVANTE.padrao ? " · o padrão do T3jus" : ""}</span>
      </p>
      <p className="pzc-agora">
        <Icone nome="relogio" className="ico" />
        <span>
          {agora
            ? <>{agora.antes}<b>{agora.destaque}</b>{agora.depois}</>
            : "Ainda não há comprovante de residência nas fichas dos clientes. O prazo passa a contar quando o primeiro for anexado, pela data do papel."}
        </span>
      </p>
      {dona ? (
        <button ref={botao} className="btn btn-sec" type="button" onClick={aoAbrir}><Icone nome="lapis" className="ico" />Mudar o prazo</button>
      ) : null}
      <p className="pzc-quem"><Icone nome="cadeado" className="ico" /><span>{quem}</span></p>
    </Folha>
  );
}

type Previa = { dias: number; p: PreviaPrazoComprovante } | { dias: number; falhou: true } | null;

function FormPrazo({ dados, aoCancelar, aoSalvo }: {
  dados: DocumentosInicio;
  aoCancelar: () => void;
  aoSalvo: (r: PrazoComprovanteSalvo, trocar: boolean) => void;
}) {
  const atual = dados.validadeDias;
  const rapido = OPCOES_PRAZO_COMPROVANTE.some((o) => o.dias === atual);
  const [escolha, setEscolha] = useState<number | "outro">(rapido ? atual : "outro");
  const [outro, setOutro] = useState(rapido ? "" : String(atual));
  const [trocar, setTrocar] = useState(true);
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [previa, setPrevia] = useState<Previa>(null);
  const raiz = useRef<HTMLFormElement>(null);
  const falhaRef = useRef<HTMLDivElement>(null);
  const dias = escolha === "outro" ? lerDias(outro) : escolha;
  const total = dados.comprovantesTotal;

  // Ao abrir: a folha à vista e o foco no rádio marcado.
  useEffect(() => {
    const f = raiz.current;
    if (!f) return;
    const calmo = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    f.closest("section")?.scrollIntoView({ behavior: calmo ? "auto" : "smooth", block: "start" });
    f.querySelector<HTMLInputElement>('input[name="pzc-prazo"]:checked')?.focus({ preventScroll: true });
  }, []);

  // A prévia, 400 ms depois da última escolha; a anterior é cancelada.
  useEffect(() => {
    if (dias === null || dias === atual || !total) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      void chamarPortal<PreviaPrazoComprovante>(`/v1/escritorio/juridico/documentos-inicio/prazo-comprovante/previa?dias=${dias}`, { sinal: ctl.signal }).then((r) => {
        if (ctl.signal.aborted) return;
        setPrevia(r.ok ? { dias, p: r.dados } : { dias, falhou: true });
      });
    }, ESPERA_MS);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [dias, atual, total]);

  const comFrase = dados.listasComFrase > 0;
  const muda = dias !== null && dias !== atual;

  async function salvar() {
    setFalha(null);
    if (dias === null) {
      setErro(true);
      requestAnimationFrame(() => raiz.current?.querySelector<HTMLElement>("#pzc-dias")?.focus());
      return;
    }
    setErro(false);
    setEnviando(true);
    const r = await chamarPortal<PrazoComprovanteSalvo>("/v1/escritorio/juridico/documentos-inicio/prazo-comprovante", {
      metodo: "PUT", corpo: { validadeDias: dias, trocarTexto: muda && comFrase && trocar },
    });
    setEnviando(false);
    if (r.ok) return aoSalvo(r.dados, muda && comFrase && trocar);
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.includes("validadeDias")) {
      setEscolha("outro");
      setOutro(String(dias));
      setErro(true);
      requestAnimationFrame(() => raiz.current?.querySelector<HTMLElement>("#pzc-dias")?.focus());
      return;
    }
    setFalha(r.erro.codigo);
    requestAnimationFrame(() => falhaRef.current?.focus());
  }

  const p = previa && "p" in previa && previa.dias === dias ? previa.p : null;
  const ef = textoEfeito(dias, atual, total, p);
  const carregando = muda && total > 0 && !p && !(previa && "falhou" in previa && previa.dias === dias);
  const hoje = hojeBr();

  let efeito: React.ReactNode;
  if (ef.tipo === "outro") efeito = <p>Escreva de {PRAZO_COMPROVANTE.min} a {PRAZO_COMPROVANTE.max} dias para ver quantos comprovantes mudam.</p>;
  else if (ef.tipo === "atual") efeito = <p>É o prazo de hoje: nada muda.</p>;
  else if (ef.tipo === "zero") {
    efeito = <p><b>Nenhum selo muda agora</b>: ainda não há comprovante de residência nas fichas dos clientes. O prazo vale para os que forem anexados.</p>;
  } else if (carregando) efeito = <p>Contando os comprovantes…</p>;
  else if (!p) efeito = <p>Não deu para contar os comprovantes agora. O prazo pode ser salvo assim mesmo.</p>;
  else if (ef.tipo === "nada") {
    efeito = <p><b>Nenhum selo muda agora</b>: nenhum dos {ef.total} comprovantes nas fichas muda de “Em dia” para “Mais de {dias} dias”, nem o contrário.</p>;
  } else {
    const lista = ef.tipo === "passam" ? p.passamA : p.voltamAEmDia;
    const qtd = ef.tipo === "passam" ? p.passamAQtd : p.voltamAEmDiaQtd;
    const pedidos = ef.tipo === "voltam" ? p.voltamAEmDia.flatMap((c) => c.pedidos.map((x) => ({ c, x }))) : [];
    efeito = (
      <>
        <p><b>{ef.destaque}</b>{ef.resto}</p>
        <ul className="pzc-nomes" aria-label={ef.tipo === "passam" ? `Passam a ter mais de ${dias} dias` : "Voltam a Em dia"}>
          {lista.slice(0, NOMES_MAX).map((c) => <li key={c.clienteId}><span>{c.nome}</span><span>{c.dias} dias</span></li>)}
        </ul>
        {qtd > NOMES_MAX ? <p>E mais {qtd - NOMES_MAX} {qtd - NOMES_MAX === 1 ? "cliente" : "clientes"}.</p> : null}
        {pedidos.slice(0, PEDIDOS_MAX).map(({ c, x }) => (
          <p key={`${c.clienteId}-${x.casoId}-${x.pedidoEm}`}>{textoPedidoAberto(c.nome, c.dataDocumento, x, hoje, c.pedidos.length > 1)}</p>
        ))}
        {pedidos.length > PEDIDOS_MAX ? (
          <p>Há mais {pedidos.length - PEDIDOS_MAX} {pedidos.length - PEDIDOS_MAX === 1 ? "pedido" : "pedidos"} de comprovante abertos. Se o comprovante da ficha servir, marque “Já chegou” no caso.</p>
        ) : null}
      </>
    );
  }

  return (
    <>
      {erro ? (
        <Aviso tom="urgencia" titulo="O prazo não foi salvo.">
          <a href="#pzc-dias" onClick={(e) => { e.preventDefault(); raiz.current?.querySelector<HTMLElement>("#pzc-dias")?.focus(); }}>
            O prazo vai de {PRAZO_COMPROVANTE.min} a {PRAZO_COMPROVANTE.max} dias
          </a>. Ele continua em {atual} dias.
        </Aviso>
      ) : null}
      {falha ? (
        <div ref={falhaRef} tabIndex={-1}>
          <Aviso tom="urgencia" titulo="Não deu para salvar o prazo.">
            Nada mudou: o prazo continua em {atual} dias, e os selos também. A sua escolha continua aqui; tente de novo.
            Se não der, fale com o suporte e diga o código <b className="num">{falha}</b>.
          </Aviso>
        </div>
      ) : null}
      <form ref={raiz} className="pzc-corpo pzc-form" noValidate aria-label="Mudar o prazo do comprovante" onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
        <fieldset className="pzc-ops">
          <legend>Quanto tempo o comprovante vale</legend>
          {OPCOES_PRAZO_COMPROVANTE.map((o) => (
            <label key={o.dias} className="opcao">
              <input className="marcar" type="radio" name="pzc-prazo" value={o.dias} checked={escolha === o.dias}
                onChange={() => { setEscolha(o.dias); setErro(false); }} />
              <span>{o.rotulo}<small>{o.ajuda}</small></span>
            </label>
          ))}
          <label className="opcao">
            <input className="marcar" type="radio" name="pzc-prazo" value="outro" checked={escolha === "outro"} onChange={() => setEscolha("outro")} />
            <span>Outro prazo<small>De {PRAZO_COMPROVANTE.min} a {PRAZO_COMPROVANTE.max} dias.</small></span>
          </label>
          {escolha === "outro" ? (
            <div className="pzc-outro">
              <div className="campo c3">
                <label htmlFor="pzc-dias">Quantos dias</label>
                <input className="entrada" id="pzc-dias" name="pzc-dias" type="text" autoComplete="off" inputMode="numeric" maxLength={3} value={outro}
                  onChange={(e) => setOutro(e.target.value)} aria-invalid={erro || undefined} aria-describedby={descritoPor(erro && "pzc-dias-er")} />
                {erro ? <ErroCampo id="pzc-dias-er">Escreva de {PRAZO_COMPROVANTE.min} a {PRAZO_COMPROVANTE.max} dias. O padrão é {PRAZO_COMPROVANTE.padrao}.</ErroCampo> : null}
              </div>
            </div>
          ) : null}
        </fieldset>
        <div className="pzc-efeito" role="status" aria-live="polite">
          <h3>{dias === null ? "Com outro prazo" : `Com ${dias} dias`}</h3>
          {efeito}
        </div>
        {muda ? (
          comFrase ? (
            <label className="opcao">
              <input className="marcar" type="checkbox" name="pzc-texto" checked={trocar} onChange={(e) => setTrocar(e.target.checked)} />
              <span>Trocar também no texto que vai ao cliente<small>{textoCaixa(atual, dias, dados.listasComFrase)}</small></span>
            </label>
          ) : (
            <p className="pzc-agora">
              <Icone nome="doc" className="ico" />
              <span>Nenhuma lista diz “dos últimos {atual} dias” no texto que vai ao cliente, então não há texto para trocar. Se quiser que o cliente saiba o prazo, escreva no “Como pedir” do comprovante.</span>
            </p>
          )
        ) : null}
        <ul className="pzc-ao" aria-label="Ao salvar">
          <li><Icone nome="relogio" className="ico" /><span>Os selos das fichas mudam na hora: o prazo é contado cada vez que a ficha abre.</span></li>
          <li><Icone nome="balanca" className="ico" /><span>Nenhum pedido sai agora. Casos já abertos não mudam; o comprovante é pedido de novo quando um caso abrir.</span></li>
          <li><Icone nome="historico" className="ico" /><span>Fica no histórico do escritório, com o antes, o depois e o seu nome.</span></li>
        </ul>
        <div className="pzc-pe">
          <button className="btn btn-fantasma" type="button" onClick={aoCancelar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}><Icone nome="check" className="ico" />Salvar o prazo</button>
        </div>
      </form>
    </>
  );
}
