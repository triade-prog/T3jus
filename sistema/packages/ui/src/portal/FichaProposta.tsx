"use client";
// Ficha da proposta (AP-03, AP-05, IN-01), desenho aprovado em
// docs/design/aprovadas/portal-comercial-contratos (decisões 2 a 7): cabeçalho vinho com a
// situação, âmbar com o retorno (ou "Falta o contrato"), condições de honorário em leitura, o
// que está incluído e o histórico. "Registrar resposta" é uma janela com três saídas.
// F3.181 (desenho portal-exclusao-contratos-conversas, Carol 27/11/2026): a proposta aceita de cliente
// excluído ou arquivado a pedido do titular "Não vira contrato", sem botões nem selo; no excluído, o que
// está incluído e o arquivo Word dizem que foram apagados. O pedir recusado (CLIENTE_EXCLUIDO ou
// CLIENTE_ARQUIVADO) ganha um aviso próprio e a página recarrega.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CANAIS_RESPOSTA, dataBr, hojeBrasilia, MOTIVOS_RECUSA, ORIGENS, RESPOSTAS_PROPOSTA,
  type EventoProposta, type FichaProposta, type RespostaProposta,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { diaCurto, lerDia } from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { nomeSituacao, quandoRetorno, ROTAS_COMERCIAL, valorDaProposta } from "./comercial.ts";
import { Selo } from "./Comercial.tsx";
import { Toast } from "./FichaCliente.tsx";
import { CondicoesLeitura } from "./Honorarios.tsx";
import { geraNaProposta } from "./honorarios.ts";
import { chamarPortal, irPara, type EscritorioPortal } from "./Moldura.tsx";
import { MolduraArea } from "./MolduraArea.tsx";
import { useBaixar } from "./Peticoes.tsx";

const EDITAVEL = new Set(["RASCUNHO", "ENVIADA", "NEGOCIACAO"]);

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");

const CAMPOS_EDITADOS: Record<string, string> = { servico: "o serviço", escopo: "o que está incluído", responsavel_id: "o responsável", valida_ate: "a validade" };

/** O que cada evento do histórico diz. Eventos repetidos (a mudança de estado da resposta) somem. */
export function fraseDaProposta(e: EventoProposta): { oque: string; detalhe?: string; selo?: { tom: string; texto: string }; forte?: boolean } | null {
  const d = e.dados as Record<string, unknown>;
  switch (e.acao) {
    case "proposta.criada":
      return { oque: d.rascunho ? "começou a proposta em rascunho" : "escreveu a proposta" };
    case "proposta.editada": {
      const campos = ((d.campos as string[] | undefined) ?? []).map((c) => CAMPOS_EDITADOS[c] ?? c);
      if (d.condicoes_depois) campos.push("as condições de honorário");
      return { oque: "editou a proposta", detalhe: campos.length ? `Mudou ${campos.join(", ").replace(/, ([^,]*)$/, " e $1")}. A versão anterior fica guardada.` : undefined };
    }
    case "estado.mudou":
      return d.para === "ENVIADA" ? { oque: "marcou como enviada", selo: { tom: "andamento", texto: "Enviada" } } : null;
    case "proposta.resposta": {
      const r = d.resposta as RespostaProposta;
      const canal = (CANAIS_RESPOSTA as Record<string, string>)[String(d.canal)] ?? "";
      const motivo = d.motivo ? `Motivo: ${(MOTIVOS_RECUSA as Record<string, string>)[String(d.motivo)]}.` : "";
      const obs = typeof d.observacao === "string" ? d.observacao : "";
      const detalhe = [motivo, obs, canal ? `Por ${canal}${d.em ? `, em ${dataBr(String(d.em))}` : ""}.` : ""].filter(Boolean).join(" ");
      const selo = r === "ACEITOU" ? { tom: "ativo", texto: "Aceita" } : r === "RECUSOU" ? { tom: "neutro", texto: "Recusada" } : { tom: "atencao", texto: "Em negociação" };
      return { oque: `registrou a resposta: ${RESPOSTAS_PROPOSTA[r]?.toLowerCase() ?? "respondeu"}`, detalhe, selo, forte: r === "ACEITOU" };
    }
    case "proposta.contrato_pedido":
      return { oque: "pediu o contrato a quem tem a área Contratos" };
    case "proposta.responsavel_passado":
      return { oque: "A proposta passou para outra pessoa da equipe, porque o responsável saiu do escritório." };
    default:
      return null;
  }
}

function Historico({ eventos, hoje }: { eventos: EventoProposta[]; hoje: string }) {
  const dias: { dia: string; itens: { e: EventoProposta; f: NonNullable<ReturnType<typeof fraseDaProposta>> }[] }[] = [];
  for (const e of eventos) {
    const f = fraseDaProposta(e);
    if (!f) continue;
    const dia = diaDoInstante(e.em);
    const ult = dias[dias.length - 1];
    if (ult?.dia === dia) ult.itens.push({ e, f });
    else dias.push({ dia, itens: [{ e, f }] });
  }
  return (
    <section className="folha" aria-labelledby="t-hp" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-hp">Histórico da proposta</h2>
          <p className="sub">Cada mudança e cada resposta, com quem e quando. Nada se apaga.</p>
        </div>
      </div>
      {dias.map((g) => (
        <div className="eventos-dia" key={g.dia}>
          <h3>{dataBr(g.dia)}{g.dia === hoje ? " · hoje" : ""}</h3>
          <ol className="eventos">
            {g.itens.map(({ e, f }, i) => (
              <li key={`${e.em}-${i}`}>
                <time dateTime={e.em}>{horaDoInstante(e.em)}</time>
                <span className={f.forte ? "pto forte" : "pto"} aria-hidden="true" />
                <div>
                  <p>
                    {e.autor && e.acao !== "proposta.responsavel_passado" ? <><b>{e.autor}</b> </> : null}
                    {f.oque}
                    {f.selo ? <span className={`selo selo-${f.selo.tom}`}>{f.selo.texto}</span> : null}
                  </p>
                  {f.detalhe ? <small>{f.detalhe}</small> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

// ------------------------------------------------------------------------- janela da resposta

type Saida = "ACEITOU" | "MUDANCA" | "RECUSOU";
const CANAIS = Object.entries(CANAIS_RESPOSTA) as [string, string][];
const MOTIVOS = Object.entries(MOTIVOS_RECUSA) as [string, string][];

const MSG_RESPOSTA: Record<string, string> = {
  resposta: "Escolha como o cliente respondeu.",
  em: "Escreva a data da resposta, hoje ou antes, no formato dd/mm/aaaa.",
  canal: "Escolha por onde o cliente respondeu.",
  motivo: "Escolha o motivo. Ele entra na conta do Funil e ajuda a rever as próximas propostas.",
  observacao: "Escreva até 1.000 letras.",
};

export function JanelaResposta({ aberta, f, aoFechar, aoFeito }: {
  aberta: boolean;
  f: FichaProposta;
  aoFechar: () => void;
  aoFeito: (saida: Saida) => void;
}) {
  const hoje = hojeBrasilia();
  const [saida, setSaida] = useState<Saida>("ACEITOU");
  const [em, setEm] = useState(dataBr(hoje));
  const [canal, setCanal] = useState("WHATSAPP");
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [comCondicoes, setComCondicoes] = useState(true);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const cli = primeiroNome(f.cliente.nome);

  async function enviar() {
    if (saida === "ACEITOU" && !comCondicoes) return irPara(ROTAS_COMERCIAL.editar(f.id));
    const e: string[] = [];
    const dia = lerDia(em);
    if (!dia || dia > hoje) e.push("em");
    if (saida === "RECUSOU" && !motivo) e.push("motivo");
    if (obs.length > 1000) e.push("observacao");
    setFalha(null);
    if (e.length) {
      setErros(e);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const r = await chamarPortal<{ situacao: string }>(`/v1/escritorio/propostas/${f.id}/resposta`, {
      metodo: "POST",
      corpo: { versao: f.versao, resposta: saida, em: dia, canal, motivo: saida === "RECUSOU" ? motivo : null, observacao: obs.trim() || null },
    });
    setEnviando(false);
    if (r.ok) {
      setErros([]);
      return aoFeito(saida);
    }
    const campos = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      setErros(campos.map(String));
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Alguém mudou esta proposta enquanto você registrava. Feche, recarregue a página e registre de novo." : textoDoErro(r.erro));
  }

  const tem = (c: string) => erros.includes(c);
  const opcoes: [Saida, string, string][] = [["ACEITOU", "Aceitou", "Vira contrato"], ["MUDANCA", "Pediu mudança", "Você edita a proposta"], ["RECUSOU", "Recusou", "Pede o motivo"]];
  const efeito = {
    ACEITOU: f.podeContrato
      ? "A proposta fica Aceita e o próximo contato de hoje é encerrado. Em seguida você gera o contrato, já com as condições preenchidas."
      : "A proposta fica Aceita e o próximo contato é encerrado. Quem tem a área Contratos gera o contrato, já com as condições preenchidas.",
    MUDANCA: `A proposta fica Em negociação e o retorno passa para hoje, com ${f.responsavel.nome}. Em seguida você edita a proposta.`,
    RECUSOU: `A proposta fica Recusada e guardada, com o motivo. O próximo contato de ${cli} é encerrado.`,
  }[saida];
  const botao = saida === "ACEITOU"
    ? (!comCondicoes ? "Editar a proposta antes" : f.podeContrato ? "Registrar e gerar o contrato" : "Registrar a aceitação")
    : saida === "MUDANCA" ? "Registrar e editar a proposta" : "Registrar a recusa";

  return (
    <Janela id="j-resposta" aberta={aberta} aoFechar={aoFechar} sobretitulo={`${f.numero} · ${f.cliente.nome}`} titulo="Registrar resposta" descricao="j-resposta-d"
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            {botao}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-resposta-d">Fica no histórico da proposta e no atendimento do cliente, com seu nome e a hora.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>A resposta ainda não foi registrada.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="A resposta não foi registrada.">{falha}</Aviso> : null}
        <fieldset className="cm-resposta">
          <legend>Como {cli} respondeu</legend>
          <div className="cm-ops">
            {opcoes.map(([v, t, s]) => (
              <label className="opcao" key={v}>
                <input className="marcar" type="radio" name="rs" value={v} checked={saida === v} data-foco={saida === v ? "" : undefined}
                  onChange={() => { setSaida(v); setErros([]); }} />
                <span>{t}<small>{s}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="cm-dois">
          <div className="campo">
            <label htmlFor="rs-data">Data da resposta</label>
            <input className="entrada" id="rs-data" type="text" inputMode="numeric" autoComplete="off" value={em} onChange={(e) => setEm(e.target.value)}
              aria-invalid={tem("em") || undefined} aria-describedby={descritoPor("rs-data-aj", tem("em") && "rs-data-er")} />
            <p className="ajuda" id="rs-data-aj">dd/mm/aaaa</p>
            {tem("em") ? <ErroCampo id="rs-data-er">{MSG_RESPOSTA.em}</ErroCampo> : null}
          </div>
          <div className="campo">
            <label htmlFor="rs-canal">Por onde</label>
            <select className="entrada" id="rs-canal" value={canal} onChange={(e) => setCanal(e.target.value)} aria-invalid={tem("canal") || undefined}
              aria-describedby={tem("canal") ? "rs-canal-er" : undefined}>
              {CANAIS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            {tem("canal") ? <ErroCampo id="rs-canal-er">{MSG_RESPOSTA.canal}</ErroCampo> : null}
          </div>
        </div>
        {saida === "RECUSOU" ? (
          <div className="campo">
            <label htmlFor="rs-motivo">Motivo da recusa</label>
            <select className="entrada" id="rs-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-invalid={tem("motivo") || undefined}
              aria-describedby={tem("motivo") ? "rs-motivo-er" : undefined}>
              <option value="">Escolha</option>
              {MOTIVOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            {tem("motivo") ? <ErroCampo id="rs-motivo-er">{MSG_RESPOSTA.motivo}</ErroCampo> : null}
          </div>
        ) : null}
        <div className="campo">
          <label htmlFor="rs-obs">Observação<span className="opcional"> (opcional)</span></label>
          <textarea className="entrada" id="rs-obs" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} aria-invalid={tem("observacao") || undefined}
            aria-describedby={descritoPor("rs-obs-aj", tem("observacao") && "rs-obs-er")} />
          <p className="ajuda" id="rs-obs-aj">{saida === "MUDANCA" ? "O que o cliente pediu. Ex.: 5 parcelas no lugar de 4." : "Vai para o atendimento do cliente."}</p>
          {tem("observacao") ? <ErroCampo id="rs-obs-er">{MSG_RESPOSTA.observacao}</ErroCampo> : null}
        </div>
        {saida === "ACEITOU" ? (
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={comCondicoes} onChange={(e) => setComCondicoes(e.target.checked)} />
            <span>
              Aceitou com as condições da proposta
              <small>Se combinaram outra coisa, desmarque e edite a proposta antes.</small>
            </span>
          </label>
        ) : null}
        <p className="cm-efeito">
          <Icone nome={saida === "RECUSOU" ? "historico" : saida === "MUDANCA" ? "lapis" : "pena"} className="ico" />
          <span>{efeito}</span>
        </p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- ficha

function Dir({ f, hoje, eu, aoResponder, aoEnviada, aoPedir, ocupado }: {
  f: FichaProposta; hoje: string; eu: string; aoResponder: () => void; aoEnviada: () => void; aoPedir: () => void; ocupado: boolean;
}) {
  const r = f.retornoCompleto;
  let corpo: ReactNode;
  let titulo: string;
  if (f.situacao === "RASCUNHO") {
    titulo = "Rascunho";
    corpo = (
      <>
        <p className="grande" style={{ fontSize: 30 }}>Falta enviar</p>
        <p className="hn-oque">
          <b>O escritório envia a proposta como já envia.</b>
          <br />
          Depois de enviar, marque aqui. O retorno vira o próximo contato do cliente.
        </p>
        <button data-muda className="btn btn-pri" type="button" onClick={aoEnviada} disabled={ocupado}>
          <Icone nome="enviar" className="ico" />
          Marcar como enviada
        </button>
      </>
    );
  } else if (f.situacao === "ENVIADA" || f.situacao === "NEGOCIACAO") {
    titulo = "Retorno";
    corpo = (
      <>
        <div className="hn-dir-linha">
          <p className="grande">{r ? diaCurto(r.em) : "Sem data"}</p>
          {r ? (r.vencido ? <Selo tom="urgente" icone="alerta">vencido {quandoRetorno(r.em, hoje)}</Selo> : r.em === hoje ? <Selo tom="ativo">hoje</Selo> : <Selo tom="neutro">{quandoRetorno(r.em, hoje)}</Selo>) : null}
        </div>
        <p className="hn-oque">
          {r ? <><b>{r.oque ?? "Falar com o cliente"}</b><br />com {r.responsavel?.nome ?? f.responsavel.nome}</> : "Nenhum retorno marcado. Marque ao editar a proposta."}
        </p>
        <button data-muda className="btn btn-pri" type="button" onClick={aoResponder}>
          <Icone nome="conversas" className="ico" />
          Registrar resposta
        </button>
      </>
    );
  } else if (f.situacao === "ACEITA" && saiuACliente(f)) {
    titulo = `Aceita${f.respondidaEm ? ` em ${diaCurto(f.respondidaEm)}` : ""}`;
    const em = f.clienteSaiuEm ? ` em ${dataBr(diaDoInstante(f.clienteSaiuEm))}` : "";
    corpo = (
      <>
        <p className="grande" style={{ fontSize: 30 }}>Não vira contrato</p>
        <p className="hn-oque">
          {f.clienteSituacao === "EXCLUIDO"
            ? `O cliente foi excluído a pedido do titular${em}. A proposta fica só como registro.`
            : `O cliente foi arquivado a pedido do titular${em}. Cliente arquivado não ganha contrato novo. A proposta fica só como registro.`}
        </p>
      </>
    );
  } else if (f.situacao === "ACEITA") {
    titulo = `Aceita${f.respondidaEm ? ` em ${diaCurto(f.respondidaEm)}` : ""}`;
    const nomes = f.quemTemContratos.filter((n) => n !== eu);
    corpo = (
      <>
        <p className="grande" style={{ fontSize: 30 }}>Falta o contrato</p>
        {f.podeContrato ? (
          <>
            <p className="hn-oque">
              <b>As condições abaixo já entram no contrato.</b>
              {r ? <><br />{r.oque ?? "Próximo contato"} em {diaCurto(r.em)}, com {r.responsavel?.nome ?? f.responsavel.nome}.</> : null}
            </p>
            <a data-muda className="btn btn-pri" href={ROTAS_COMERCIAL.gerarContrato(f.id)}>
              <Icone nome="pena" className="ico" />
              Gerar o contrato
            </a>
          </>
        ) : (
          <>
            {f.contratoPedidoEm ? (
              // IN-01 (estado pc-pedido-feito): quem pediu sabe quem recebeu o aviso no sino.
              <p className="hn-oque">
                <b>Você pediu {diaDoInstante(f.contratoPedidoEm) === hoje ? "hoje" : `em ${diaCurto(diaDoInstante(f.contratoPedidoEm))}`}, às {horaDoInstante(f.contratoPedidoEm)}.</b><br />
                {nomes.length ? <>{juntar(nomes)} {nomes.length === 1 ? "recebeu" : "receberam"} o aviso no sino. </> : null}Quando o contrato for gerado, você também recebe um aviso.
              </p>
            ) : (
              <p className="hn-oque">
                {nomes.length ? <>Quem cria contratos é quem tem a área Contratos: <b>{juntar(nomes)}</b>. O contrato nasce com estas condições.</>
                  : <>Ninguém do escritório tem a área Contratos ainda. Quem libera áreas é o sócio dono.</>}
              </p>
            )}
            {f.contratoPedidoEm ? (
              <p className="pc-pedido"><Selo tom="andamento" icone="relogio">Contrato pedido</Selo></p>
            ) : nomes.length ? (
              <button data-muda className="btn btn-pri" type="button" onClick={aoPedir} disabled={ocupado}>
                <Icone nome="enviar" className="ico" />
                Pedir o contrato
              </button>
            ) : null}
          </>
        )}
      </>
    );
  } else if (f.situacao === "CONTRATO") {
    titulo = "Contrato";
    corpo = (
      <>
        <p className="grande" style={{ fontSize: 30 }}>Virou contrato</p>
        <p className="hn-oque">As condições desta proposta passaram para o contrato.</p>
      </>
    );
  } else {
    titulo = `Recusada${f.respondidaEm ? ` em ${diaCurto(f.respondidaEm)}` : ""}`;
    corpo = (
      <>
        <p className="grande" style={{ fontSize: 30 }}>Recusada</p>
        <p className="hn-oque">
          {f.motivoRecusa ? <><b>{MOTIVOS_RECUSA[f.motivoRecusa]}.</b><br /></> : null}
          Fica guardada com o motivo e entra na conta do Funil.
        </p>
      </>
    );
  }
  return (
    <section className="dir campo-ambar" aria-labelledby="t-dir">
      <p className="sobretitulo" id="t-dir">{titulo}</p>
      {corpo}
    </section>
  );
}

/** F3.181: o cliente foi excluído ou arquivado a pedido do titular; a proposta aceita não vira contrato. */
function saiuACliente(f: FichaProposta): boolean {
  return f.clienteSituacao === "EXCLUIDO" || f.clienteSituacao === "ARQUIVADO";
}

function juntar(nomes: string[]): string {
  return nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

function Escopo({ texto, apagado }: { texto: string | null; apagado?: boolean }) {
  const partes = (texto ?? "").split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className="folha" aria-labelledby="t-es">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-es">O que está incluído</h2></div>
      </div>
      <div className="cm-escopo">
        {partes.length ? partes.map((p, i) => <p key={i}>{p}</p>)
          : <p className="hn-nota">{apagado ? "Apagado a pedido do titular." : "Ainda não escrito. Edite a proposta para escrever."}</p>}
      </div>
    </section>
  );
}

type Feito = { titulo: string; texto: string };

function FichaConteudo({ id, escritorio, aoNumero }: { id: string; escritorio: EscritorioPortal; aoNumero: (n: string) => void }) {
  const [f, setF] = useState<FichaProposta | null | "erro" | "nao">(null);
  const [janela, setJanela] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [falha, setFalha] = useState<ErroApi | null>(null);
  // F3.181: o pedir recusado porque o cliente saiu enquanto a página estava aberta.
  const [recusa, setRecusa] = useState<"EXCLUIDO" | "ARQUIVADO" | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const hoje = hojeBrasilia();

  const carregar = useCallback(async () => {
    const r = await chamarPortal<FichaProposta>(`/v1/escritorio/propostas/${id}`);
    setF(r.ok ? r.dados : r.status === 404 ? "nao" : "erro");
    if (r.ok) aoNumero(r.dados.numero);
  }, [id, aoNumero]);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  const bx = useBaixar();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.has("criada") ? { titulo: "Proposta salva", texto: "Ela está na lista de Propostas, com o retorno no próximo contato do cliente." }
      : q.has("salva") ? { titulo: "Mudanças salvas", texto: "A versão anterior fica no histórico da proposta." } : null;
    if (!t) return;
    window.history.replaceState(null, "", window.location.pathname);
    void Promise.resolve().then(() => setFeito(t));
  }, []);
  // Da ficha do cliente (F3.110): "Registrar resposta" abre a proposta com a janela da resposta.
  const responder = f && f !== "erro" && f !== "nao" && (f.situacao === "ENVIADA" || f.situacao === "NEGOCIACAO");
  useEffect(() => {
    if (!responder) return;
    const q = new URLSearchParams(window.location.search);
    if (!q.has("responder")) return;
    window.history.replaceState(null, "", window.location.pathname);
    void Promise.resolve().then(() => setJanela(true));
  }, [responder]);

  if (f === "erro") return <ErroAoCarregar oque="a proposta" aoTentar={() => void carregar()} />;
  if (f === "nao") return <ErroAoCarregar oque="a proposta" aoTentar={() => void carregar()} texto="Ela não existe ou é de outro escritório. Volte para Propostas e abra de novo." />;
  if (!f) return <Carregando rotulo="Carregando a proposta…" linhas={4} />;
  const ficha = f;

  async function acao(caminho: string, ok: Feito, corpo?: unknown) {
    setOcupado(true);
    setFalha(null);
    setRecusa(null);
    const r = await chamarPortal(`/v1/escritorio/propostas/${ficha.id}/${caminho}`, { metodo: "POST", corpo: corpo ?? {} });
    setOcupado(false);
    if (!r.ok) {
      const motivo = r.erro.codigo === "VALIDATION_ERROR" ? r.erro.detalhes?.motivo : undefined;
      if (caminho === "pedir-contrato" && (motivo === "CLIENTE_EXCLUIDO" || motivo === "CLIENTE_ARQUIVADO")) {
        setRecusa(motivo === "CLIENTE_EXCLUIDO" ? "EXCLUIDO" : "ARQUIVADO");
        return void carregar();
      }
      return setFalha(r.erro);
    }
    setFeito(ok);
    await carregar();
  }

  const editavel = EDITAVEL.has(f.situacao);
  const editar = (
    <a data-muda className="btn btn-sec" href={ROTAS_COMERCIAL.editar(f.id)}>
      <Icone nome="lapis" className="ico" />
      Editar
    </a>
  );
  // F3.181: a proposta aceita de cliente excluído ou arquivado fica só como registro.
  const registro = f.situacao === "ACEITA" && saiuACliente(f);
  const apagada = registro && f.clienteSituacao === "EXCLUIDO";
  const semContratos = f.situacao === "ACEITA" && !f.podeContrato && !registro;
  const dono = escritorio.socios[0];

  return (
    <div className="hn">
      <div className="ficha-cab">
        <div className="esq campo-vinho">
          <Icone nome="maleta" className="ico estatua" />
          <a className="voltar" href={ROTAS_COMERCIAL.propostas}>
            <Icone nome="esquerda" className="ico ico-s" />
            Propostas
          </a>
          <div className="ident">
            <div>
              <p className="sobretitulo">Proposta {f.numero}</p>
              <h1>{f.servico}</h1>
              <p className="meta">
                <span className={`selo ${f.situacao === "RASCUNHO" || f.situacao === "RECUSADA" ? "selo-neutro" : "selo-ativo"}`}>{nomeSituacao(f.situacao)}</span>
                <span>para {f.cliente.nome}</span>
                <span className="sep" aria-hidden="true" />
                <span>{valorDaProposta(f.condicoes)}</span>
              </p>
            </div>
          </div>
        </div>
        <Dir f={f} hoje={hoje} eu={escritorio.pessoa} ocupado={ocupado} aoResponder={() => setJanela(true)}
          aoEnviada={() => void acao("enviada", { titulo: "Proposta marcada como enviada", texto: "O retorno dela é o próximo contato do cliente, em Atendimentos e na ficha." }, { versao: ficha.versao })}
          aoPedir={() => void acao("pedir-contrato", { titulo: "Contrato pedido.", texto: f.quemTemContratos.length ? `${juntar(f.quemTemContratos)} ${f.quemTemContratos.length === 1 ? "recebeu" : "receberam"} o aviso, com o link desta proposta.` : "O pedido fica na proposta, com seu nome e a hora, para quem tem a área Contratos." })} />
      </div>
      {recusa ? (
        <Aviso tom="urgencia" titulo="Não deu para pedir o contrato.">
          O cliente foi {recusa === "EXCLUIDO" ? "excluído" : "arquivado"} a pedido do titular agora há pouco. A proposta abaixo já mostra como ficou: ela não vira contrato.
        </Aviso>
      ) : falha ? (
        <Aviso tom="urgencia" titulo="Não deu para concluir.">
          {falha.codigo === "VERSION_CONFLICT" ? "Alguém mudou esta proposta agora há pouco. Recarregue a página e tente de novo." : textoDoErro(falha)}
        </Aviso>
      ) : null}
      <div className="hn-grade">
        <div className="hn-col">
          {semContratos ? (
            <Aviso tom="info" titulo="Você vê a proposta, mas não cria o contrato.">
              A área Contratos não está liberada para você. Ao pedir, o pedido fica registrado nesta proposta para quem tem a área.
              {dono ? ` Quem libera áreas é ${dono}, sócio dono.` : ""}
            </Aviso>
          ) : null}
          <CondicoesLeitura condicoes={f.condicoes} sub={f.situacao === "CONTRATO" ? "Passaram para o contrato." : registro ? "Ficam como registro." : "Passam para o contrato como estão."}
            acoes={editavel ? editar : undefined} gera={geraNaProposta} />
          <Escopo texto={f.escopo} apagado={apagada} />
          <Historico eventos={f.historico} hoje={hoje} />
        </div>
        <aside className="hn-col" aria-label="Sobre a proposta">
          <section className="folha" aria-labelledby="t-pc">
            <div className="folha-cab" style={{ paddingBottom: 8 }}>
              <div><h2 id="t-pc" style={{ fontSize: 20 }}>Cliente</h2></div>
            </div>
            <dl className="hn-dl">
              <div><dt>Nome</dt><dd><a href={ROTAS_COMERCIAL.ficha(f.cliente.id)}>{f.cliente.nome}</a></dd></div>
              <div><dt>Como chegou</dt><dd>{f.origem ? ORIGENS[f.origem] : "Não marcado no cadastro"}</dd></div>
              <div><dt>Responsável</dt><dd>{f.responsavel.nome}</dd></div>
              <div><dt>Vale até</dt><dd>{f.validaAte ? dataBr(f.validaAte) : "Sem data"}{f.vencida ? " (vencida)" : ""}</dd></div>
            </dl>
            {bx.falha ? <div style={{ padding: "0 24px 12px" }}><Aviso tom="urgencia" titulo="Não deu para baixar.">{bx.falha}</Aviso></div> : null}
            <div className="hn-folha-acao">
              {/* AP-05: o arquivo no timbrado do escritório; o escritório envia como já envia (decisão 4). */}
              {apagada ? (
                <p>O arquivo Word da proposta foi apagado com os dados do cliente.</p>
              ) : (
                <button className="btn btn-sec" type="button" onClick={() => void bx.baixar(`/v1/escritorio/propostas/${f.id}/docx`)}
                  disabled={!!bx.baixando} aria-busy={!!bx.baixando || undefined}>
                  <Icone nome="baixar" className="ico" />
                  Baixar a proposta (.docx)
                </button>
              )}
              {editavel ? (
                <a data-muda className="btn btn-sec" href={ROTAS_COMERCIAL.editar(f.id)}>
                  <Icone nome="lapis" className="ico" />
                  Editar a proposta
                </a>
              ) : null}
            </div>
          </section>
          {registro ? null : <section className="explica campo-ambar" aria-labelledby="t-pex">
            <p className="sobretitulo">Sem redigitar</p>
            <h2 id="t-pex">A proposta aceita vira contrato.</h2>
            <ul>
              <li><Icone nome="pena" className="ico" /><span>As condições de honorário passam para o contrato como estão. Lá só se confere e acrescenta o que faltar.</span></li>
              <li><Icone nome="relogio" className="ico" /><span>O retorno da proposta é o próximo contato do cliente: aparece na ficha e em Atendimentos.</span></li>
              <li><Icone nome="historico" className="ico" /><span>Mudou o valor? Edite a proposta. A versão anterior fica no histórico.</span></li>
            </ul>
          </section>}
        </aside>
      </div>
      <JanelaResposta key={janela ? "aberta" : "fechada"} aberta={janela} f={f} aoFechar={() => setJanela(false)}
        aoFeito={(s) => {
          setJanela(false);
          if (s === "MUDANCA") return irPara(ROTAS_COMERCIAL.editar(ficha.id));
          if (s === "ACEITOU" && ficha.podeContrato) return irPara(ROTAS_COMERCIAL.gerarContrato(ficha.id));
          setFeito(s === "ACEITOU"
            ? { titulo: "Aceitação registrada", texto: "A proposta está Aceita. Falta o contrato." }
            : { titulo: "Recusa registrada", texto: "A proposta fica guardada com o motivo e entra na conta do Funil." });
          void carregar();
        }} />
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </div>
  );
}

export function FichaPropostaPortal({ id }: { id: string }) {
  const [numero, setNumero] = useState("Proposta");
  return (
    <MolduraArea area="COMERCIAL" secao="propostas" trilha={[{ nome: numero }]} pagina="co-ficha">
      {(e) => <FichaConteudo id={id} escritorio={e} aoNumero={setNumero} />}
    </MolduraArea>
  );
}
