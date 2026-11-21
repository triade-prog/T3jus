"use client";
// "Não foi paga" na folha "Pago antes do T3jus" (F3.84, VA-05), desenho aprovado em
// docs/design/aprovadas/portal-nao-paga-logo (decisões 1 a 12): a parcela que a planilha trouxe
// como paga passa para A receber sem desfazer a importação, com motivo, e sem aviso automático.
// "Foi paga, sim" desfaz o engano enquanto nada foi feito na parcela em A receber.

import { useEffect, useRef, useState } from "react";
import { dataBr, reais, type FichaContrato, type MudancaPagoAntes, type RecebimentoPrevisto } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { dataCurta, hora } from "../console/tempo.ts";
import { lerDia } from "./agenda.ts";
import { chamarPortal } from "./Moldura.tsx";
import { Selo } from "./Comercial.tsx";

const ehHoje = (em: string, hoje: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(em)) === hoje;
const quando = (em: string, hoje: string) => `${ehHoje(em, hoje) ? "hoje" : dataCurta(em)}, às ${hora(em)}`;
const primeiro = (nome: string) => nome.split(" ")[0] ?? nome;
const minusc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Dias entre duas datas aaaa-mm-dd. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

/** "Vencida há 8 dias" ou "Vence hoje". */
export function textoAtraso(venc: string, hoje: string): string | null {
  const d = diasEntre(venc, hoje);
  if (d < 0) return null;
  if (d === 0) return "Vence hoje";
  return d === 1 ? "Vencida há 1 dia" : `Vencida há ${d} dias`;
}

/** O que a recusa de "Foi paga, sim" diz, pelo movimento que já há na parcela. */
const MOVIMENTO: Record<string, string> = {
  RECEBIMENTO: "Já há recebimento registrado nela. Se foi engano, cancele o recebimento em A receber.",
  CARNE: "Ela já está num carnê. Registre o recebimento ou cancele a parcela com o motivo, em A receber.",
  AVISO: "Um aviso automático já saiu para o cliente por ela. Registre o recebimento em A receber.",
  COBRANCA: "Já houve cobrança registrada nela. Registre o recebimento ou cancele com o motivo, em A receber.",
};

type Conflito = { titulo: string; texto: string; quem?: string; como?: string };

function conflitoDe(e: ErroApi, hoje: string): Conflito | null {
  const d = e.detalhes ?? {};
  if (e.codigo !== "VERSION_CONFLICT") return null;
  const por = (d.por as { nome?: string } | null)?.nome ?? "Alguém da equipe";
  const em = typeof d.em === "string" ? d.em : null;
  if (d.motivo === "JA_MUDADA") {
    const como = d.como as { vencimento?: string; situacao?: string } | undefined;
    return {
      titulo: `${por} mexeu nesta parcela enquanto a janela estava aberta.`,
      texto: `${em ? `${ehHoje(em, hoje) ? "Hoje" : dataCurta(em)}, às ${hora(em)}, ` : ""}a parcela foi passada para A receber. O que você escreveu não foi salvo, para não registrar duas vezes.`,
      quem: `${por}${em ? `, ${quando(em, hoje)}` : ""}`,
      como: como?.vencimento ? `Em A receber, ${como.vencimento < hoje ? "vencida desde" : "vence em"} ${dataBr(como.vencimento)}` : "Em A receber",
    };
  }
  if (d.motivo === "IMPORTACAO_DESFEITA") {
    return {
      titulo: `${por} desfez a importação${em ? ` ${ehHoje(em, hoje) ? "hoje" : `em ${dataCurta(em)}`}, às ${hora(em)}` : ""}.`,
      texto: "A parcela foi cancelada com as outras da importação. Nada foi gravado aqui.",
      quem: `${por}${em ? `, ${quando(em, hoje)}` : ""}`,
      como: "Cancelada com a importação",
    };
  }
  return null;
}

export function JanelaNaoPaga({ f, r, hoje, aoFechar, aoFeito }: {
  f: FichaContrato; r: RecebimentoPrevisto; hoje: string; aoFechar: () => void; aoFeito: (novo: { vencimento: string }) => void;
}) {
  const [aberta] = useState(() => new Date().toISOString());
  const [manter, setManter] = useState(true);
  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<{ motivo?: boolean; data?: string }>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [conflito, setConflito] = useState<Conflito | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  // O foco vai ao botão depois que a janela mostra o conflito ou a falha (não antes do React desenhar).
  useEffect(() => {
    if (!conflito && !falha) return;
    corpo.current?.closest("dialog")?.querySelector<HTMLElement>(conflito ? "[data-ver]" : "[data-enviar]")?.focus();
  }, [conflito, falha]);
  const vivos = f.recebimentos.filter((x) => !x.cancelado);
  const programado = vivos.reduce((t, x) => t + (x.valor ?? 0), 0);
  const cliente = f.cliente.nome;
  const atraso = textoAtraso(r.vencimento, hoje);

  async function enviar() {
    setFalha(null);
    const dia = manter ? null : lerDia(data);
    const e = { motivo: motivo.trim().length < 3, data: !manter && !dia ? "Escreva a data combinada, no formato dd/mm/aaaa." : undefined };
    setErros(e);
    if (e.motivo || e.data) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const res = await chamarPortal<RecebimentoPrevisto>(`/v1/escritorio/contratos/${f.id}/pago-antes/${r.id}/nao-paga`, {
      metodo: "POST", corpo: { vencimento: manter ? "ORIGINAL" : dia, motivo: motivo.trim() },
    });
    setEnviando(false);
    if (res.ok) return aoFeito({ vencimento: res.dados.vencimento });
    const c = conflitoDe(res.erro, hoje);
    if (c) {
      return setConflito(c);
    }
    const campos = (res.erro.detalhes?.campos ?? []) as string[];
    if (res.erro.codigo === "VALIDATION_ERROR" && campos.length) {
      setErros({
        motivo: campos.includes("motivo"),
        data: campos.includes("vencimento") ? (res.erro.detalhes?.motivo === "VENCIMENTO_INVALIDO" ? textoDoErro(res.erro) : "Escreva a data combinada, no formato dd/mm/aaaa.") : undefined,
      });
      if (campos.includes("vencimento")) setManter(false);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(textoDoErro(res.erro));
  }

  const titulo = `A ${minusc(r.descricao)} não foi paga?`;
  return (
    <Janela id="j-nao-paga" classe="np-janela" aberta aoFechar={aoFechar} sobretitulo={`Pago antes do T3jus · ${f.numero}`} titulo={titulo} descricao="j-nao-paga-d"
      aoEnviar={() => void (conflito ? window.location.reload() : enviar())}
      pe={conflito ? (
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Fechar</button>
          <button className="btn btn-pri" type="button" data-ver onClick={() => window.location.reload()}><Icone nome="olho" className="ico" />Ver como ficou</button>
        </>
      ) : (
        <>
          <span className="np-pe-nota">Só quem tem a área Financeiro faz esta mudança.</span>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" data-enviar disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome={falha ? "reenviar" : "check"} className="ico" />
            {falha ? "Tentar de novo" : "Passar para A receber"}
          </button>
        </>
      )}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-nao-paga-d">{cliente}. A parcela passa para A receber; o resto da importação fica como está.</p>
        {conflito ? <Aviso tom="atencao" icone="pessoas" titulo={conflito.titulo}>{conflito.texto}</Aviso> : null}
        {!conflito && erros.motivo ? <Aviso tom="urgencia" titulo="Falta o motivo.">A parcela ainda está em “Pago antes do T3jus”. Escreva o motivo e passe de novo.</Aviso> : null}
        {falha ? (
          <Aviso tom="urgencia" titulo="Não deu para passar a parcela. Nada mudou.">
            Ela continua em “Pago antes do T3jus”, e o que você escreveu está aqui. {falha}
          </Aviso>
        ) : null}
        <dl className="np-parc">
          <div><dt>Parcela</dt><dd>{r.descricao.replace(/^Parcela /, "")}</dd></div>
          <div><dt>Vencimento na planilha</dt><dd className="num">{dataBr(r.vencimento)}</dd></div>
          <div><dt>Valor</dt><dd className="num">{r.valor ? reais(r.valor) : "a definir"}</dd></div>
        </dl>
        {conflito ? (
          <dl className="np-quem">
            <dt>Quem mudou</dt><dd>{conflito.quem}</dd>
            <dt>Como ficou</dt><dd>{conflito.como}</dd>
            <dt>Você abriu a janela</dt><dd>às {hora(aberta)}</dd>
          </dl>
        ) : (
          <>
            <ul className="np-oque" aria-label="O que vai acontecer">
              <li><Icone nome="seta" className="ico" /><span>Sai de “Pago antes do T3jus” e entra na programação e em <b>A receber</b>, com a marca “era paga antes do T3jus”.</span></li>
              {r.valor ? (
                <li><Icone nome="moeda" className="ico" /><span>O programado do contrato passa de {reais(programado)} para <b>{reais(programado + r.valor)}</b>. Recebido até hoje não muda.</span></li>
              ) : null}
              <li><Icone nome="pessoa-mais" className="ico" /><span>A cobrança fica com {f.responsavel.nome}, que cuida do contrato, com a próxima ação “Falar com {cliente}” amanhã. Dá para mudar em A receber.</span></li>
              <li><Icone nome="historico" className="ico" /><span>A importação continua como está. Tudo fica no histórico do contrato, com o motivo. Nada se apaga.</span></li>
            </ul>
            <fieldset className="x-ops np-venc">
              <legend>Que vencimento a parcela ganha</legend>
              <div className="x-ops-l">
                <label className="opcao">
                  <input className="marcar" type="radio" name="np-venc" checked={manter} onChange={() => setManter(true)} data-foco={manter ? "" : undefined} />
                  <span>Manter {dataBr(r.vencimento)}, o da planilha<small>{atraso ? `Entra já ${minusc(atraso).replace("vence hoje", "vencendo hoje")}, em Vencidas. ` : "Entra como a vencer. "}É a data do contrato.</small></span>
                </label>
                <label className="opcao">
                  <input className="marcar" type="radio" name="np-venc" checked={!manter} onChange={() => setManter(false)} data-foco={!manter ? "" : undefined} />
                  <span>Outra data, combinada com o cliente<small>A parcela entra na data escolhida.</small></span>
                </label>
              </div>
              {!manter ? (
                <div className="campo np-data">
                  <label htmlFor="np-data">Novo vencimento</label>
                  <input className="entrada" id="np-data" type="text" inputMode="numeric" autoComplete="off" value={data} onChange={(e) => setData(e.target.value)}
                    aria-invalid={erros.data ? true : undefined} aria-describedby={descritoPor("np-data-aj", erros.data && "np-data-er")} />
                  <p className="ajuda" id="np-data-aj">dd/mm/aaaa</p>
                  {erros.data ? <ErroCampo id="np-data-er">{erros.data}</ErroCampo> : null}
                </div>
              ) : null}
            </fieldset>
            <div className="campo">
              <label htmlFor="np-motivo">Por que não foi paga</label>
              <textarea className="entrada" id="np-motivo" rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                aria-invalid={erros.motivo || undefined} aria-describedby={descritoPor("np-motivo-aj", erros.motivo && "np-motivo-er")} />
              <p className="ajuda" id="np-motivo-aj">Fica no histórico do contrato. Por exemplo: a planilha estava errada, ou o cliente diz que não pagou.</p>
              {erros.motivo ? <ErroCampo id="np-motivo-er">Escreva o motivo. Sem ele a parcela não muda.</ErroCampo> : null}
            </div>
            <p className="np-aviso-auto">
              <Icone nome="sino-mudo" className="ico" />
              <span><b>Nenhum aviso automático sai para {primeiro(cliente)} por esta parcela.</b> Até hoje ela constava como paga: fale com {primeiro(cliente)} antes de cobrar. Se escolher outra data, os lembretes de antes do vencimento voltam a valer a partir dela.</span>
            </p>
          </>
        )}
      </div>
    </Janela>
  );
}

export function JanelaFoiPaga({ f, r, aoFechar, aoFeito }: { f: FichaContrato; r: RecebimentoPrevisto; aoFechar: () => void; aoFeito: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<{ titulo: string; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  async function enviar() {
    setFalha(null);
    if (motivo.trim().length < 3) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setErro(false);
    setEnviando(true);
    const res = await chamarPortal<{ id: string }>(`/v1/escritorio/recebimentos/${r.id}/foi-paga`, { metodo: "POST", corpo: { motivo: motivo.trim() } });
    setEnviando(false);
    if (res.ok) return aoFeito();
    const d = res.erro.detalhes ?? {};
    if (res.erro.codigo === "VALIDATION_ERROR" && (d.campos as string[] | undefined)?.includes("motivo")) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    if (d.motivo === "JA_TEM_MOVIMENTO") return setFalha({ titulo: "A parcela não volta mais.", texto: MOVIMENTO[String(d.qual)] ?? "Ela já teve movimento em A receber." });
    setFalha({ titulo: "A parcela não voltou. Nada mudou.", texto: textoDoErro(res.erro) });
  }
  return (
    <Janela id="j-foi-paga" classe="np-janela" aberta aoFechar={aoFechar} sobretitulo={`Recebimentos · ${f.numero}`} titulo={`A ${minusc(r.descricao)} foi paga, sim?`} descricao="j-foi-paga-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}><Icone nome="desfazer" className="ico" />Voltar para pago antes</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-foi-paga-d">{f.cliente.nome} · {r.valor ? reais(r.valor) : "a definir"} · vencimento {dataBr(r.vencimento)}.</p>
        {falha ? <Aviso tom="urgencia" titulo={falha.titulo}>{falha.texto}</Aviso> : null}
        <ul className="np-oque" aria-label="O que vai acontecer">
          <li><Icone nome="seta" className="ico" /><span>A {minusc(r.descricao)} volta para “Pago antes do T3jus”, fora dos totais, de A receber e do Caixa.</span></li>
          <li><Icone nome="cadeado" className="ico" /><span>Só dá para voltar enquanto nada foi feito nela em A receber: nenhum recebimento, carnê ou cobrança enviada.</span></li>
          <li><Icone nome="historico" className="ico" /><span>As duas mudanças ficam no histórico, cada uma com o seu motivo.</span></li>
        </ul>
        <div className="campo">
          <label htmlFor="np-volta-motivo">Por que foi paga, afinal</label>
          <textarea className="entrada" id="np-volta-motivo" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor("np-volta-aj", erro && "np-volta-er")} />
          <p className="ajuda" id="np-volta-aj">Por exemplo: {primeiro(f.cliente.nome)} mandou o comprovante.</p>
          {erro ? <ErroCampo id="np-volta-er">Escreva o motivo, de 3 a 300 letras.</ErroCampo> : null}
        </div>
      </div>
    </Janela>
  );
}

/** "Histórico dos recebimentos": cada "Não foi paga" e "Foi paga, sim", com o motivo. */
export function HistoricoRecebimentos({ mudancas, cliente, hoje }: { mudancas: MudancaPagoAntes[]; cliente: string; hoje: string }) {
  return (
    <section className="folha" aria-labelledby="t-hr">
      <div className="folha-cab">
        <div>
          <h2 id="t-hr"><Icone nome="historico" className="ico" />Histórico dos recebimentos</h2>
          <p className="sub">Nada é apagado</p>
        </div>
      </div>
      <div className="np-hist eventos-dia">
        <ol className="eventos">
          {mudancas.map((m) => (
            <li key={m.id}>
              <time dateTime={m.em}>{ehHoje(m.em, hoje) ? "hoje" : dataCurta(m.em).slice(0, 5)}</time>
              <span className={m.tipo === "NAO_PAGA" ? "pto forte" : "pto"} aria-hidden="true" />
              <div>
                <p>
                  <b>{m.por?.nome ?? "Alguém que saiu da equipe"}</b>{" "}
                  {m.tipo === "NAO_PAGA" ? `passou a ${minusc(m.parcela)} para A receber` : `voltou a ${minusc(m.parcela)} para “Pago antes do T3jus”`}, às {hora(m.em)}
                  {ehHoje(m.em, hoje) ? <> <Selo tom="ativo">Novo</Selo></> : null}
                </p>
                <small>
                  {m.tipo === "NAO_PAGA"
                    ? <>Não foi paga. {m.vencimento && m.vencimento !== m.vencimentoPlanilha ? `Novo vencimento: ${dataBr(m.vencimento)} (na planilha, ${dataBr(m.vencimentoPlanilha)})` : `Vencimento mantido: ${dataBr(m.vencimentoPlanilha)}`}. Motivo: <q>{m.motivo}</q></>
                    : <>Foi paga, sim. Motivo: <q>{m.motivo}</q></>}
                </small>
                {m.tipo === "NAO_PAGA" ? <small>A importação continua como estava. Nenhum aviso automático saiu para {primeiro(cliente)}.</small> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
