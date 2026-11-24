"use client";
// "Dar baixa sem receber" e "Desfazer a baixa sem receber" na ficha do contrato em Financeiro ›
// A receber (F3.139; FI-24, FI-25, FI-08). Desenho aprovado em
// docs/design/aprovadas/portal-baixa-parcela-motivo (seção 2.2 e 2.3). O servidor confere quem
// pode, o que falta e se alguém mexeu na parcela com a janela aberta (1010_baixa_parcela.sql).

import { useEffect, useRef, useState } from "react";
import {
  dataBr, MOTIVOS_BAIXA, reais,
  type BaixaDesfeita, type BaixaFeita, type MotivoBaixa, type ParcelaDoContrato, type ParcelasContrato, type PreviaBaixa,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroCampo, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { juntarComE } from "./clientes.ts";
import { useCarga } from "./Comercial.tsx";
import { primeiroNome } from "./equipe.ts";
import { mesReferencia, textoCobranca } from "./financeiro.ts";
import { chamarPortal } from "./Moldura.tsx";
import {
  AJUDA_MOTIVO, casoPronto, REGUA_DEPOIS_DE_DESFAZER, textoCustasBaixadasVoltam, comQuemFica, conflitoDaBaixa, errosDaBaixa, nomeDaParcela, notaDaBaixa, rotuloExplicacao, SEM_RENEGOCIAR, textoCustas,
  textoDiasAtraso, tituloErrosBaixa, type ConflitoBaixa,
} from "./baixa.ts";

const MOTIVOS = Object.keys(MOTIVOS_BAIXA) as MotivoBaixa[];
const diaDe = (em: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(em));

/** A prévia que a janela pede ao abrir, calculada no servidor. */
function usePrevia(parcela: string) {
  const { dados, recarregar } = useCarga<PreviaBaixa>(`/v1/escritorio/financeiro/parcelas/${parcela}/baixa`);
  return { previa: dados, recarregar };
}

function Conflito({ c, p, f, aberta }: { c: ConflitoBaixa; p: ParcelaDoContrato; f: ParcelasContrato; aberta: number }) {
  return (
    <>
      <Aviso tom="atencao" icone="pessoas" titulo={c.titulo}>
        A baixa sem receber não foi feita. Veja como ficou antes de decidir. O que você escreveu não foi salvo.
      </Aviso>
      <dl className="np-quem">
        <dt>Parcela</dt><dd>{p.descricao} · {f.cliente.nome} · {f.numero}</dd>
        <dt>Quando você abriu</dt><dd>Faltavam {reais(c.faltava ?? aberta)}, em atraso</dd>
        <dt>Quem mudou</dt><dd>{c.quem}</dd>
        {c.como ? <><dt>Como ficou</dt><dd>{c.como}</dd></> : null}
      </dl>
    </>
  );
}

export function JanelaBaixa({ p, f, hoje, aoFechar, aoFeito }: {
  p: ParcelaDoContrato; f: ParcelasContrato; hoje: string; aoFechar: () => void; aoFeito: (r: BaixaFeita, custasFicam: number) => void;
}) {
  const { previa, recarregar } = usePrevia(p.id);
  const [motivo, setMotivo] = useState<MotivoBaixa | null>(null);
  const [explicacao, setExplicacao] = useState("");
  const [reembolso, setReembolso] = useState(false);
  const [erros, setErros] = useState<{ motivo?: string; explicacao?: string }>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [conflito, setConflito] = useState<ConflitoBaixa | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Nota 13: o segundo clique, antes de o React desenhar o "Dando baixa sem receber…", não envia de novo.
  const saindo = useRef(false);
  const corpo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!conflito && !falha) return;
    corpo.current?.closest("dialog")?.querySelector<HTMLElement>(conflito ? "[data-ver]" : "[data-enviar]")?.focus();
  }, [conflito, falha]);

  const pv = previa && previa !== "erro" ? previa : null;
  const curta = nomeDaParcela(p.descricao);
  const cliente = f.cliente.nome;
  const custas = pv?.custas ?? [];
  const semDestino = custas.filter((c) => !c.depois);
  const valorSemDestino = semDestino.reduce((t, c) => t + c.valor, 0);
  const motivos = pv && !pv.podeRenegociar ? MOTIVOS.filter((m) => m !== "RENEGOCIADA") : MOTIVOS;
  const casos = (pv?.casos ?? []).filter((c) => c.espera && !c.fechado);
  const quemContratos = juntarComE((pv?.quemContratos ?? []).map((x) => primeiroNome(x.nome)));

  // Revisão, nota 3 (decisão 13, PT-10): o foco vai ao primeiro erro; sem motivo, ao primeiro rádio.
  const focarErro = (e: { motivo?: string }) =>
    e.motivo ? requestAnimationFrame(() => corpo.current?.querySelector<HTMLElement>('input[name="bx-motivo"]')?.focus()) : focarPrimeiroErro(corpo.current);
  // Revisão, nota 2: a caixa das custas some com "Renegociada", e o pedido segue o que está à vista.
  const comReembolso = reembolso && motivo !== "RENEGOCIADA" && valorSemDestino > 0;

  async function enviar() {
    if (saindo.current || !pv) return;
    setFalha(null);
    const e = errosDaBaixa(motivo, explicacao);
    setErros(e);
    if (e.motivo || e.explicacao) return focarErro(e);
    saindo.current = true;
    setEnviando(true);
    const res = await chamarPortal<BaixaFeita>(`/v1/escritorio/financeiro/parcelas/${p.id}/baixa`, {
      metodo: "POST", corpo: { motivo, explicacao: explicacao.trim(), falta: pv.falta, reembolso: comReembolso },
    });
    saindo.current = false;
    setEnviando(false);
    if (res.ok) return aoFeito(res.dados, comReembolso ? 0 : valorSemDestino);
    const c = conflitoDaBaixa(res.erro.detalhes, hoje);
    if (c) return setConflito(c);
    const campos = (res.erro.detalhes?.campos ?? []) as string[];
    // Revisão, nota 2: um campo que a janela não mostra vira falha à vista, nunca um clique sem resposta.
    if (res.erro.codigo === "VALIDATION_ERROR" && campos.length && campos.every((x) => x === "motivo" || x === "explicacao")) {
      const novos = {
        ...(campos.includes("motivo") ? { motivo: "Escolha o motivo." } : {}),
        ...(campos.includes("explicacao") ? { explicacao: "Escreva a explicação, com pelo menos 3 letras." } : {}),
      };
      setErros(novos);
      return focarErro(novos);
    }
    setFalha(textoDoErro(res.erro));
  }

  const nErros = Object.keys(erros).length;
  const venc = pv ? `${dataBr(p.vencimento)}, ${textoDiasAtraso(pv.diasAtraso)}` : dataBr(p.vencimento);
  return (
    <Janela id="j-baixa" classe="np-janela" aberta aoFechar={aoFechar} sobretitulo={`A receber · ${f.numero}`} titulo="Dar baixa sem receber" descricao="j-baixa-d"
      aoEnviar={() => void (conflito ? window.location.reload() : enviar())}
      pe={conflito ? (
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Fechar</button>
          <button className="btn btn-pri" type="button" data-ver onClick={() => window.location.reload()}><Icone nome="olho" className="ico" />Ver como ficou</button>
        </>
      ) : (
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
          <button className="btn btn-pri" type="submit" data-enviar aria-busy={enviando || undefined} aria-disabled={enviando || !pv || undefined}>
            <Icone nome={falha ? "reenviar" : "check"} className="ico" />
            {enviando ? "Dando baixa sem receber…" : falha ? "Tentar de novo" : `Dar baixa sem receber na ${curta}`}
          </button>
        </>
      )}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-baixa-d">A parcela sai de Em atraso sem que o dinheiro tenha entrado. Fica na tabela do contrato, com o motivo, e dá para desfazer depois.</p>
        <p className="sr" role="status">{enviando ? `Dando baixa sem receber na ${curta}.` : ""}</p>
        {previa === "erro" ? (
          <Aviso tom="urgencia" titulo="Não deu para abrir a parcela.">Nada mudou. <button className="jr-link" type="button" onClick={recarregar}>Tentar de novo</button></Aviso>
        ) : !pv ? <Carregando rotulo="Carregando a parcela…" linhas={3} /> : conflito ? <Conflito c={conflito} p={p} f={f} aberta={pv.falta} /> : (
          <>
            {nErros ? (
              <Aviso tom="urgencia" titulo={tituloErrosBaixa(nErros)}>
                A parcela continua em atraso. {[erros.motivo, erros.explicacao].filter(Boolean).join(" ")}
              </Aviso>
            ) : null}
            {falha ? (
              <Aviso tom="urgencia" titulo="Não deu para dar baixa sem receber.">
                Nada mudou: a parcela continua em atraso. O que você escreveu continua aqui. {falha}
              </Aviso>
            ) : null}
            <dl className="np-parc">
              <div><dt>Parcela</dt><dd>{p.descricao.replace(/^Parcela /, "").replace(/(\d+) de (\d+)/, "$1/$2")} · {mesReferencia(p.vencimento, hoje)}</dd></div>
              <div><dt>Venceu</dt><dd className="num">{venc}</dd></div>
              <div><dt>Falta receber</dt><dd className="num">{reais(pv.falta)}</dd></div>
            </dl>
            <p className="fi-motivo">{[cliente, f.numero, ...casos.map((c) => c.nome)].join(" · ")}</p>
            {pv.recebido > 0 ? <p>Recebido {reais(pv.recebido)} de {reais(p.valor)}. A baixa é só dos {reais(pv.falta)} que faltam.</p> : null}
            {p.cobranca ? (
              <p className="fi-motivo">
                <b>Última cobrança:</b> {p.cobranca.autor.nome} {textoCobranca(p.cobranca)?.toLowerCase()}{p.cobranca.texto ? `: ${p.cobranca.texto}` : ""}{p.cobranca.motivo ? ` ${p.cobranca.motivo}` : ""}
              </p>
            ) : null}
            <ul className="np-oque" aria-label="O que vai acontecer">
              <li><Icone nome="seta" className="ico" /><span>Sai de <b>Em atraso</b> e de A receber.</span></li>
              <li><Icone nome="moeda" className="ico" /><span>Não conta como recebido no caixa nem nos relatórios.</span></li>
              <li><Icone nome="sino-mudo" className="ico" /><span>A régua de cobrança desta parcela para, sem mandar mais nada.</span></li>
              {pv.recebido > 0 ? (
                <li><Icone nome="check" className="ico" /><span>O que já entrou continua recebido{pv.recibos.length ? `, com o recibo ${pv.recibos.map((r) => `${r.ano}-${String(r.numero).padStart(3, "0")}`).join(", ")}` : ""}.</span></li>
              ) : null}
              {casos.map((c) => (
                <li key={c.id}><Icone nome="balanca" className="ico" /><span>O caso {c.nome} deixa de esperar por ela.{valorSemDestino ? " As custas continuam segurando o caso, a não ser que tenham baixa junto (no fim desta janela)." : ""}</span></li>
              ))}
              {custas.map((c) => <li key={c.contaId}><Icone nome="doc" className="ico" /><span>{textoCustas(c, cliente, hoje)}</span></li>)}
            </ul>
            <fieldset className="x-ops" aria-describedby={erros.motivo ? "bx-motivo-er" : undefined}>
              <legend>Por que a parcela sai de Em atraso sem receber</legend>
              {erros.motivo ? <ErroCampo id="bx-motivo-er">{erros.motivo}</ErroCampo> : null}
              <div className="x-ops-l">
                {motivos.map((m) => (
                  <label className="opcao" key={m}>
                    <input className="marcar" type="radio" name="bx-motivo" checked={motivo === m} onChange={() => setMotivo(m)} />
                    <span>{MOTIVOS_BAIXA[m]}<small>{AJUDA_MOTIVO[m]}</small></span>
                  </label>
                ))}
              </div>
              {!pv.podeRenegociar ? <p className="ajuda">{SEM_RENEGOCIAR}</p> : null}
            </fieldset>
            <div className="campo">
              <label htmlFor="bx-expl">{rotuloExplicacao(motivo)}</label>
              <textarea className="entrada" id="bx-expl" rows={3} maxLength={1000} value={explicacao} onChange={(e) => setExplicacao(e.target.value)}
                aria-invalid={erros.explicacao ? true : undefined} aria-describedby={descritoPor("bx-expl-aj", erros.explicacao && "bx-expl-er")} />
              <p className="ajuda" id="bx-expl-aj">
                Escreva em uma ou duas frases. Fica no contrato para quem vier depois.
                {motivo === "RENEGOCIADA" && !pv.temContratos && quemContratos
                  ? ` ${quemContratos} vão ler este texto no aviso de Contratos: escreva só o que foi combinado. Por exemplo: “Parcelado: 2 × R$ 250,00, em dezembro e janeiro”.`
                  : motivo === "RENEGOCIADA" ? " Por exemplo: “Parcelado: 2 × R$ 250,00, em dezembro e janeiro”." : ""}
              </p>
              {erros.explicacao ? <ErroCampo id="bx-expl-er">{erros.explicacao}</ErroCampo> : null}
            </div>
            {motivo === "RENEGOCIADA" ? (
              <Aviso tom="info" icone="pena" titulo="A nova cobrança é uma condição nova do contrato.">
                {pv.temContratos
                  ? "Depois da baixa, mude as condições do contrato em Contratos."
                  : `Quem muda as condições é a área Contratos${quemContratos ? ` (${quemContratos})` : ""}. Eles recebem um aviso com o que foi combinado.`}
              </Aviso>
            ) : null}
            {valorSemDestino > 0 && motivo !== "RENEGOCIADA" ? (
              <label className="opcao">
                <input className="marcar" type="checkbox" checked={reembolso} onChange={(e) => setReembolso(e.target.checked)} />
                <span>Dar baixa sem receber também no reembolso das custas ({reais(valorSemDestino)})
                  <small>Marque só se o escritório também não vai receber essa despesa de volta. Vale o mesmo motivo e a mesma explicação.</small></span>
              </label>
            ) : null}
          </>
        )}
      </div>
    </Janela>
  );
}

export function JanelaDesfazerBaixa({ p, f, eu, aoFechar, aoFeito }: {
  p: ParcelaDoContrato; f: ParcelasContrato; eu: string; aoFechar: () => void; aoFeito: (r: BaixaDesfeita) => void;
}) {
  const { previa, recarregar } = usePrevia(p.id);
  const [explicacao, setExplicacao] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const saindo = useRef(false);
  const corpo = useRef<HTMLDivElement>(null);
  const b = p.baixa;
  const pv = previa && previa !== "erro" ? previa : null;
  const curta = nomeDaParcela(p.descricao);
  const cliente = primeiroNome(f.cliente.nome);

  async function enviar() {
    if (saindo.current) return;
    setFalha(null);
    if (explicacao.trim().length < 3) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    saindo.current = true;
    setEnviando(true);
    const res = await chamarPortal<BaixaDesfeita>(`/v1/escritorio/financeiro/parcelas/${p.id}/baixa/desfazer`, {
      metodo: "POST", corpo: { explicacao: explicacao.trim() },
    });
    saindo.current = false;
    setEnviando(false);
    if (res.ok) return aoFeito(res.dados);
    if (((res.erro.detalhes?.campos ?? []) as string[]).includes("explicacao")) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(res.erro));
  }

  const com = pv ? comQuemFica(pv.proximaAcaoCom, eu, f.responsavel) : null;
  const responsavelSemFin = pv && pv.proximaAcaoCom.id !== f.responsavel.id;
  const fechados = (pv?.casos ?? []).filter((c) => c.fechado);
  return (
    <Janela id="j-desfazer-baixa" classe="np-janela" aberta aoFechar={aoFechar} sobretitulo={`A receber · ${f.numero}`} titulo="Desfazer a baixa sem receber" descricao="j-desfazer-baixa-d"
      aoEnviar={() => void enviar()}
      pe={(
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
            <Icone nome={falha ? "reenviar" : "desfazer"} className="ico" />
            {enviando ? "Desfazendo a baixa sem receber…" : falha ? "Tentar de novo" : "Desfazer a baixa sem receber"}
          </button>
        </>
      )}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-desfazer-baixa-d">
          A {curta} volta para Em atraso, com {reais(b?.valor ?? p.falta)} a receber.
          {com ? ` ${com === "com você" ? "Você fica" : `${pv!.proximaAcaoCom.nome}${com.includes("cuida") ? ", que cuida do contrato," : ""} fica`} com a próxima ação: falar com ${cliente} amanhã.` : ""} A baixa sem receber continua no histórico.
        </p>
        {falha ? <Aviso tom="urgencia" titulo="Não deu para desfazer a baixa sem receber.">Nada mudou: a parcela continua com baixa sem receber. O que você escreveu continua aqui. {falha}</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo="Falta 1 coisa para desfazer a baixa sem receber.">Escreva por que desfazer, com pelo menos 3 letras.</Aviso> : null}
        {previa === "erro" ? (
          <Aviso tom="urgencia" titulo="Não deu para abrir a parcela.">Nada mudou. <button className="jr-link" type="button" onClick={recarregar}>Tentar de novo</button></Aviso>
        ) : null}
        {b ? (
          <dl className="np-quem">
            <dt>Parcela</dt><dd>{curta.replace(/^parcela /, "")} · {mesReferencia(p.vencimento, diaDe(b.em))} · {reais(b.valor)}{b.recebidoAntes ? ` com baixa sem receber (recebido ${reais(b.recebidoAntes)} de ${reais(p.valor)})` : ""}</dd>
            <dt>Motivo</dt><dd>{notaDaBaixa({ ...b, recebidoAntes: 0 })}</dd>
            <dt>{b.motivo === "RENEGOCIADA" ? "O que foi combinado" : "Explicação"}</dt><dd>{b.explicacao}</dd>
          </dl>
        ) : null}
        {b?.motivo === "RENEGOCIADA" ? (
          <Aviso tom="atencao" titulo="Se o combinado já virou parcelas novas em Contratos, desfazer cobra o valor duas vezes.">Confira as condições do contrato antes.</Aviso>
        ) : null}
        {fechados.map((c) => (
          <Aviso key={c.id} tom="info" titulo={`O caso ${c.nome} continua encerrado no financeiro desde ${dataBr(diaDe(c.fechado!.em)).slice(0, 5)}.`}>
            A parcela volta para A receber deste contrato.
          </Aviso>
        ))}
        {pv?.custasVoltam.length ? <p>As custas de {reais(pv.custasVoltam.reduce((t, c) => t + c.valor, 0))} voltam a ir junto com esta parcela.</p> : null}
        {b?.reembolsos.length ? <p>{textoCustasBaixadasVoltam(b.reembolsos)}</p> : null}
        <ul className="np-oque" aria-label="O que vai acontecer">
          <li><Icone nome="seta" className="ico" /><span>Volta para <b>Em atraso</b>, com {reais(b?.valor ?? p.falta)} a receber.{b?.recebidoAntes ? ` O recebido de ${reais(b.recebidoAntes)} não muda.` : ""}</span></li>
          {pv && com ? (
            <li><Icone nome="pessoa-mais" className="ico" /><span>Entra uma anotação de cobrança, “Baixa desfeita”, e a próxima ação: falar com {cliente} amanhã, {com}.{responsavelSemFin ? ` ${f.responsavel.nome} cuida do contrato, mas não tem a área Financeiro.` : ""}</span></li>
          ) : null}
          <li><Icone nome="sino" className="ico" /><span>{REGUA_DEPOIS_DE_DESFAZER}</span></li>
          <li><Icone nome="historico" className="ico" /><span>A baixa sem receber e o desfazer ficam no histórico, cada um com quem, quando e por quê.</span></li>
        </ul>
        <div className="campo">
          <label htmlFor="bx-desf">Por que desfazer</label>
          <textarea className="entrada" id="bx-desf" rows={3} maxLength={1000} value={explicacao} onChange={(e) => setExplicacao(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor("bx-desf-aj", erro && "bx-desf-er")} />
          <p className="ajuda" id="bx-desf-aj">Por exemplo: “{cliente} ligou e prometeu pagar em dezembro”. Fica no contrato, ao lado da baixa.</p>
          {erro ? <ErroCampo id="bx-desf-er">Escreva por que desfazer, com pelo menos 3 letras.</ErroCampo> : null}
        </div>
      </div>
    </Janela>
  );
}

/** A nota da linha baixada (para a ficha). */
export { notaDaBaixa, casoPronto };
