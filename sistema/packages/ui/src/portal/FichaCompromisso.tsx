"use client";
// Ficha do compromisso (PT-25, EX-11, PT-03), desenho aprovado em
// docs/design/aprovadas/portal-agenda-conversas (estados compromisso e cancelar): o cabeçalho da
// ficha aprovada, com a ação do momento no âmbar (entrar na sala, o endereço); os dados; o
// lembrete ao cliente; quem vai; o histórico; e cancelar, que não apaga.

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { TIPOS_COMPROMISSO, type ClienteLinha, type EnvioMensagem, type FichaCompromisso, type ListaClientes } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, Carregando, ErroAoCarregar, ErroCampo, Janela } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { DIAS_SEMANA, diaBr, diaCurto, diaDaSemana, diaDe, horaDe, horariosDoLembrete, jaPassou, nomeDoTipo, quandoCurto, rotaAgenda } from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { JanelaCompromisso, nomeDoCaso, rascunhoDe, useCasosDoCompromisso, type Marcado, type Pessoa } from "./JanelaCompromisso.tsx";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";
import { ROTAS_CONVERSAS } from "./Conversas.tsx";

function Folha({ titulo, sub, acoes, pequena, icone, children }: { titulo: string; sub?: ReactNode; acoes?: ReactNode; pequena?: boolean; icone?: "whats"; children: ReactNode }) {
  const id = useId();
  return (
    <section className="folha" aria-labelledby={id}>
      <div className="folha-cab" style={pequena ? { paddingBottom: 8 } : undefined}>
        <div>
          <h2 id={id} style={pequena ? { fontSize: 20 } : undefined}>
            {icone ? <Icone nome={icone} className="ico" /> : null}
            {titulo}
          </h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {acoes ? <div className="acoes">{acoes}</div> : null}
      </div>
      {children}
    </section>
  );
}

const nomeDia = (d: string) => DIAS_SEMANA[diaDaSemana(d)]!;
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** O texto do lembrete que vai sair 1 dia antes (EX-11), no modelo do desenho aprovado. */
export function textoDoLembrete(f: Pick<FichaCompromisso, "tipo" | "tipoEscrito" | "inicio" | "modalidade" | "local">, escritorio: string, nome: string): string {
  const d = diaDe(f.inicio);
  const h = horaDe(f.inicio).replace(":00", "h").replace(":", "h");
  const oque = f.tipo === "AUDIENCIA" ? "Sua audiência" : f.tipo === "CLIENTE" ? "Sua reunião com o escritório" : f.tipo === "ASSINATURA" ? "A assinatura" : `Seu compromisso (${nomeDoTipo(f).toLowerCase()})`;
  const onde = f.modalidade === "VIRTUAL" ? "por vídeo. O link chega aqui 2 horas antes. Entre 10 minutos antes, com um documento com foto." : `${f.local ? `em ${f.local}` : "no local combinado"}. Leve um documento com foto.`;
  const multa = f.tipo === "AUDIENCIA" ? " Faltar sem justificativa pode gerar multa." : "";
  return `Olá, ${primeiroNome(nome)}. Aqui é do escritório ${escritorio}. ${oque} é amanhã, ${nomeDia(d)}, ${diaCurto(d)}, às ${h}, ${onde}${multa} Responda CONFIRMO, ou escreva se tiver dúvida.`;
}

/** O aviso de cancelamento, no texto pronto do servidor (aviso "Compromisso cancelado", F3.3). */
export function textoDoCancelamento(f: Pick<FichaCompromisso, "titulo" | "inicio">, escritorio: string, nome: string): string {
  return `Olá, ${primeiroNome(nome)}. Aqui é do escritório ${escritorio}. Avisamos que foi cancelado: ${f.titulo}, no dia ${diaCurto(diaDe(f.inicio))}, às ${horaDe(f.inicio)}. Se houver nova data, avisamos por aqui. Qualquer dúvida, é só responder esta mensagem.`;
}

const ENVIO: Record<EnvioMensagem, string> = { NA_FILA: "Na fila", ENVIADA: "Enviado", ENTREGUE: "Entregue", LIDA: "Lido", FALHOU: "Não entregue" };

/** "Lembrete · 1 dia antes" vira "Lembrete de 1 dia antes"; "Lembrete · nova data", "Lembrete com a nova data". */
export function nomeDoLembrete(nome: string | null | undefined): string {
  const n = (nome ?? "Lembrete").trim();
  if (/nova data/i.test(n)) return "Lembrete com a nova data";
  return n.replace(/^Lembrete\s*·\s*/, "Lembrete de ");
}

/** A resposta do cliente confirma a presença (“Confirmo”). */
export const confirmou = (texto: string | null | undefined) => /\bconfirm/i.test(texto ?? "");

/** Frase de cada evento do histórico do compromisso. */
export function fraseDoEvento(e: FichaCompromisso["historico"][number], nomes: Record<string, string>): { quem: string; oque: string; detalhe?: string } {
  const quem = e.autor ?? "O sistema";
  const d = e.dados as Record<string, string | boolean | string[] | undefined>;
  const quando = (x?: unknown) => (typeof x === "string" ? `${diaCurto(diaDe(x))}, às ${horaDe(x)}` : "");
  switch (e.acao) {
    case "compromisso.marcado":
      return { quem, oque: "marcou", detalhe: `Para ${quando(d.inicio)}${d.lembrete ? ", com lembrete ao cliente" : ""}` };
    case "compromisso.remarcado":
      return { quem, oque: "remarcou", detalhe: `De ${quando(d.de)} para ${quando(d.para)}. Motivo: ${String(d.motivo ?? "")}` };
    case "compromisso.editado":
      return { quem, oque: "editou", detalhe: `Mudou: ${(Array.isArray(d.campos) ? d.campos : []).map((c) => CAMPOS[c] ?? c).join(", ")}` };
    case "compromisso.responsavel_passado":
      return { quem, oque: "passou o compromisso", detalhe: `De ${nomes[String(d.de)] ?? "quem saiu da equipe"} para ${nomes[String(d.para)] ?? "outra pessoa"}, na saída da equipe` };
    case "estado.mudou":
      return d.para === "CANCELADO" ? { quem, oque: "cancelou", detalhe: d.motivo ? `Motivo: ${String(d.motivo)}` : undefined } : { quem, oque: "mudou a situação" };
    default:
      return { quem, oque: "registrou uma mudança" };
  }
}

const CAMPOS: Record<string, string> = {
  tipo: "tipo", tipo_escrito: "tipo", titulo: "o que é", modalidade: "onde", local: "endereço", link_sala: "link da sala", cliente_id: "cliente", caso_id: "processo",
  responsavel_id: "responsável", tambem_vai: "quem também vai", lembrete_cliente: "lembrete", observacoes: "observações",
};

function JanelaCancelar({ aberta, f, escritorio, aoFechar, aoFeito }: { aberta: boolean; f: FichaCompromisso; escritorio: string; aoFechar: () => void; aoFeito: () => void }) {
  const ids = useId();
  const [motivo, setMotivo] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [erroMotivo, setErroMotivo] = useState("");
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const d = diaDe(f.inicio);
  const audiencia = f.tipo === "AUDIENCIA";
  const nomeTipo = audiencia ? "a audiência" : f.tipo === "CLIENTE" ? "a reunião" : f.tipo === "ASSINATURA" ? "a assinatura" : "o compromisso";
  async function cancelar() {
    setErro(null);
    if (!motivo.trim()) {
      setErroMotivo("Escreva o motivo. Ele fica no histórico.");
      return;
    }
    setErroMotivo("");
    setEnviando(true);
    const r = await chamarPortal<{ versao: number }>(`/v1/escritorio/compromissos/${f.id}/cancelar`, {
      corpo: { versao: f.versao, motivo: motivo.trim(), avisar: !!f.cliente && avisar },
    });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    aoFeito();
  }
  return (
    <Janela id={`${ids}-c`} aberta={aberta} aoFechar={aoFechar} aoEnviar={() => void cancelar()} alerta sobretitulo="Agenda"
      titulo={`Cancelar ${nomeTipo}${d === diaDe(new Date().toISOString()) ? " de hoje" : ""}?`} descricao={`${ids}-d`}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Voltar</button>
          <button className="btn btn-perigo" type="submit" disabled={enviando}>
            {enviando ? "Cancelando…" : `Cancelar ${nomeTipo}`}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>
        {f.titulo}, {nomeDia(d)}, {diaCurto(d)}, às {horaDe(f.inicio)}.
      </p>
      {erro ? <Aviso tom="urgencia" titulo="Não deu para cancelar.">{textoDoErro(erro)}</Aviso> : null}
      <div className="campo">
        <label htmlFor={`${ids}-m`}>Motivo</label>
        <textarea className="entrada" id={`${ids}-m`} data-foco="" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} maxLength={300}
          aria-invalid={erroMotivo ? true : undefined} aria-describedby={erroMotivo ? `${ids}-m-er` : `${ids}-m-aj`} />
        {erroMotivo ? <ErroCampo id={`${ids}-m-er`}>{erroMotivo}</ErroCampo> : <p className="ajuda" id={`${ids}-m-aj`}>Ex.: redesignada pelo juízo; acordo fechado antes da audiência.</p>}
      </div>
      {f.cliente ? (
        <label className="opcao">
          <input className="marcar" type="checkbox" checked={avisar} onChange={(ev) => setAvisar(ev.target.checked)} />
          <span>
            Avisar {primeiroNome(f.cliente.nome)} pelo WhatsApp
            <small>
              Mensagem: “{textoDoCancelamento(f, escritorio, f.contatoCliente?.nome ?? f.cliente.nome)}”{" "}
              {f.whatsappLigado ? "Sai agora pelo WhatsApp do escritório." : "O WhatsApp do escritório ainda não está ligado: o aviso não sai. Avise por outro meio."}
            </small>
          </span>
        </label>
      ) : null}
      <p className="pt-comuns">
        <Icone nome="historico" className="ico" />
        <span>Nada é apagado: o compromisso fica na agenda, riscado, com o motivo, e no histórico. O lembrete que ainda não saiu é cancelado.</span>
      </p>
    </Janela>
  );
}

export function FichaCompromissoPortal({ id }: { id: string }) {
  const { escritorio, erro: erroEscritorio, recarregar } = useEscritorioPortal();
  const [f, setF] = useState<FichaCompromisso | null>(null);
  const [erro, setErro] = useState<"nao" | "falhou" | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [clientes, setClientes] = useState<ClienteLinha[] | null>(null);
  const [editar, setEditar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [feito, setFeito] = useState<{ titulo: string; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  // A hora de agora, lida ao carregar (o "começa em" não precisa correr sozinho).
  const [agora, setAgora] = useState(0);
  const casos = useCasosDoCompromisso(escritorio?.areas);

  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarPortal<FichaCompromisso>(`/v1/escritorio/compromissos/${id}`);
    if (!r.ok) return setErro(r.status === 404 ? "nao" : "falhou");
    setF(r.dados);
    setAgora(Date.now());
  }, [id]);
  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((r) => r.ok && setPessoas(r.dados.pessoas));
    void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((r) => setClientes(r.ok ? r.dados.clientes : []));
  }, []);

  const trilhaBase = { nome: "Agenda", href: ROTAS_PORTAL.agenda };
  if (erroEscritorio || erro === "falhou") {
    return (
      <MolduraPortal atual="agenda" trilha={[trilhaBase, { nome: "Compromisso" }]} escritorio={escritorio}>
        <ErroAoCarregar oque="o compromisso" aoTentar={() => { recarregar(); void carregar(); }} />
      </MolduraPortal>
    );
  }
  if (erro === "nao") {
    return (
      <MolduraPortal atual="agenda" trilha={[trilhaBase, { nome: "Não encontrado" }]} escritorio={escritorio}>
        <ErroAoCarregar oque="o compromisso" aoTentar={() => void carregar()} texto="Ele não existe ou é de outro escritório. Volte para a Agenda e abra de novo." />
      </MolduraPortal>
    );
  }
  if (!f || !escritorio) {
    return (
      <MolduraPortal atual="agenda" trilha={[trilhaBase, { nome: "Compromisso" }]} escritorio={escritorio} pagina="co-ficha">
        <Carregando rotulo="Carregando o compromisso…" />
      </MolduraPortal>
    );
  }

  const d = diaDe(f.inicio);
  const hoje = diaDe(new Date().toISOString());
  const cancelado = f.situacao === "CANCELADO";
  const passou = jaPassou(f);
  const virtual = f.modalidade === "VIRTUAL";
  const faltaMin = Math.round((new Date(f.inicio).getTime() - agora) / 60000);
  const subtipo = f.tipo === "OUTRO" ? nomeDoTipo(f) : TIPOS_COMPROMISSO[f.tipo];
  const nomes = Object.fromEntries(pessoas.map((p) => [p.id, p.nome]));

  const quando = faltaMin > 0 && faltaMin < 24 * 60 ? (faltaMin < 60 ? `começa em ${faltaMin} minutos` : `começa em ${Math.floor(faltaMin / 60)} h ${faltaMin % 60} min`) : `${nomeDia(d)}, ${diaCurto(d)}`;
  const dir = cancelado ? (
    <section className="dir campo-ambar" aria-labelledby="t-dir">
      <p className="sobretitulo" id="t-dir">Cancelado</p>
      <p className="ag-quando">
        <b>{f.cancelamento?.por?.nome ?? "Alguém da equipe"}</b> cancelou em {f.cancelamento ? `${diaBr(diaDe(f.cancelamento.em))}, às ${horaDe(f.cancelamento.em)}` : ""}.
        {f.cancelamento?.motivo ? ` Motivo: ${f.cancelamento.motivo}` : ""}
      </p>
    </section>
  ) : virtual ? (
    <section className="dir campo-ambar" aria-labelledby="t-sala">
      <p className="sobretitulo" id="t-sala">Sala virtual</p>
      <p className="grande">
        {horaDe(f.inicio)}
        <small>{passou ? "já aconteceu" : quando}</small>
      </p>
      <p className="ag-quando">Entre 10 minutos antes.</p>
      {f.linkSala && !passou ? (
        <div className="ag-btns">
          <a className="btn btn-pri" href={f.linkSala} target="_blank" rel="noopener noreferrer">
            <Icone nome="video" className="ico" />
            Entrar na sala
          </a>
          <button className="btn btn-sec" type="button" onClick={() => { void navigator.clipboard?.writeText(f.linkSala!).then(() => setCopiado(true)); }}>
            <Icone nome={copiado ? "check" : "copiar"} className="ico" />
            {copiado ? "Link copiado" : "Copiar o link"}
          </button>
        </div>
      ) : null}
    </section>
  ) : (
    <section className="dir campo-ambar" aria-labelledby="t-local">
      <p className="sobretitulo" id="t-local">Presencial</p>
      <p className="grande">
        {horaDe(f.inicio)}
        <small>{passou ? "já aconteceu" : quando}</small>
      </p>
      <p className="ag-quando">{f.local ? <><b>{f.local}</b></> : "Endereço não informado."}</p>
    </section>
  );

  const cab = (
    <div className="ficha-cab">
      <div className="esq campo-vinho">
        <Icone nome="balanca" className="ico estatua" />
        <a className="voltar" href={rotaAgenda({ ver: "semana", dia: d })}>
          <Icone nome="esquerda" className="ico ico-s" />
          Agenda
        </a>
        <div className="ident">
          <div>
            <p className="sobretitulo">{subtipo}</p>
            <h1>{f.titulo}</h1>
            <p className="meta">
              {cancelado ? <span className="selo selo-neutro">Cancelado</span> : d === hoje ? <span className="selo selo-ativo">Hoje</span> : passou ? <span className="selo selo-neutro">Já aconteceu</span> : null}
              <span>
                {nomeDia(d)}, {diaCurto(d)}, das {horaDe(f.inicio)} às {horaDe(f.fim)}
              </span>
              <span className="sep" aria-hidden="true" />
              <span>{virtual ? "Virtual" : "Presencial"}</span>
            </p>
          </div>
        </div>
      </div>
      {dir}
    </div>
  );

  const dados = (
    <Folha titulo="Compromisso" sub={`Marcado por ${f.criadoPor?.nome ?? "alguém da equipe"} em ${diaBr(diaDe(f.criadoEm))}`}
      acoes={cancelado ? undefined : (
        <button data-muda className="btn btn-sec" type="button" onClick={() => { setFeito(null); setEditar(true); }}>
          <Icone nome="lapis" className="ico" />
          Editar ou remarcar
        </button>
      )}>
      <dl className="dados-ficha ag-dados">
        <div><dt>Quando</dt><dd>{maiuscula(nomeDia(d))}, {diaBr(d)} · {horaDe(f.inicio)} às {horaDe(f.fim)}</dd></div>
        <div>
          <dt>Onde</dt>
          <dd>
            <Icone nome={virtual ? "video" : "local"} className="ico ico-s" />
            {virtual ? "Virtual" : "Presencial"}
            {f.local ? ` · ${f.local}` : ""}
          </dd>
        </div>
        {virtual && f.linkSala ? (
          <div className="inteira">
            <dt>Link da sala</dt>
            <dd className="ag-link-sala"><code>{f.linkSala}</code></dd>
          </div>
        ) : null}
        <div className="inteira">
          <dt>{f.conversa ? "Com quem" : "Cliente"}</dt>
          <dd>{f.cliente ? <a href={`${ROTAS_PORTAL.clientes}/${f.cliente.id}`}>{f.cliente.nome}</a>
            : f.conversa ? (
              <>
                <a href={`${ROTAS_CONVERSAS.mensagens}?c=${f.conversa.id}`}>{f.conversa.nome}</a> · <span className="num">{formatarTelefone(f.conversa.telefone)}</span>
                <small className="ajuda" style={{ display: "block", margin: 0 }}>
                  Da conversa. Ainda não está em Clientes; quando for cadastrada, o compromisso passa para a ficha{f.lembrete ? " e o lembrete começa" : ""}.
                </small>
              </>
            ) : "Sem cliente (compromisso interno)"}</dd>
        </div>
        {f.caso ? (
          <div className="inteira">
            <dt>Processo</dt>
            <dd>
              <a href={`/juridico/casos/${f.caso.id}`}>{nomeDoCaso(f.caso)}</a>
              {f.caso.parteContraria ? <><br /><small>Parte contrária: {f.caso.parteContraria}</small></> : null}
            </dd>
          </div>
        ) : null}
        <div><dt>Responsável</dt><dd>{f.responsavel.nome}</dd></div>
        <div><dt>Também vai</dt><dd>{f.tambemVai.length ? f.tambemVai.map((p) => p.nome).join(", ") : "Ninguém mais"}</dd></div>
        {f.observacoes ? (
          <div className="inteira">
            <dt>Observações da equipe</dt>
            <dd>{f.observacoes}</dd>
          </div>
        ) : null}
      </dl>
    </Folha>
  );

  const contato = f.contatoCliente;
  const lb = f.lembretes ?? null;
  const ligado = !!f.whatsappLigado;
  // Quando sai cada lembrete: do servidor; sem ele, a mesma regra calculada aqui.
  const l = lb ? { umDia: lb.umDia, duasHoras: lb.antes } : horariosDoLembrete(f.inicio);
  const horas = lb?.horasAntes ?? 2;
  const msgs = lb?.mensagens ?? [];
  const saiu = (q: string) => msgs.some((m) => (m.nome ?? "").includes(q));
  const ativo = f.lembrete && !cancelado && !passou && lb?.situacao !== "FICOU_DE_FORA" && lb?.situacao !== "FALHOU";
  type Item = { em: string; chave: string; corpo: ReactNode };
  const itens: Item[] = msgs.map((m) => ({
    em: m.em, chave: m.id,
    corpo: (
      <div>
        <p>
          {nomeDoLembrete(m.nome)}{m.envio === "NA_FILA" ? "" : " enviado"} <span className="selo selo-neutro">{ENVIO[m.envio]}</span>
        </p>
        <small>{m.envio === "FALHOU" ? m.envioMotivo ?? "Não foi entregue." : m.envio === "NA_FILA" ? "Na fila do WhatsApp do escritório" : "Pelo WhatsApp do escritório"}</small>
      </div>
    ),
  }));
  if (lb?.resposta) {
    itens.push({
      em: lb.resposta.em, chave: "resposta",
      corpo: (
        <div>
          <p>{primeiroNome(contato?.nome ?? f.cliente?.nome ?? "O cliente")} respondeu: “{lb.resposta.texto}”</p>
          <small>Em Conversas</small>
        </div>
      ),
    });
  }
  if (ativo) {
    const futuros: [string, string | null, boolean][] = [
      ["1 dia antes", l.umDia, saiu("1 dia antes")],
      [`${horas} horas antes`, l.duasHoras, saiu("horas antes")],
    ];
    for (const [q, em, foi] of futuros) {
      if (foi) continue;
      if (!em) {
        itens.push({ em: f.inicio, chave: q, corpo: <div><p>Lembrete de {q} <span className="selo selo-neutro">Não sai</span></p><small>Faltaria menos de 30 minutos para o compromisso.</small></div> });
        continue;
      }
      if (new Date(em).getTime() < agora - 15 * 60000) continue;
      itens.push({
        em, chave: q,
        corpo: (
          <div>
            <p>
              Lembrete de {q}{q !== "1 dia antes" && virtual ? ", com o link da sala" : ""}{" "}
              <span className="selo selo-neutro">{ligado ? "Agendado" : "Ainda não sai"}</span>
            </p>
            <small>Pelo WhatsApp do escritório, {quandoCurto(em)}</small>
          </div>
        ),
      });
    }
  }
  itens.sort((a, b) => a.em.localeCompare(b.em));
  const ultima = msgs.length ? msgs[msgs.length - 1]! : null;
  const fim = cancelado || passou ? null : lb?.situacao === "FICOU_DE_FORA" || lb?.situacao === "FALHOU" ? lb.motivo : null;
  const aviso = f.cancelamento?.aviso ?? null;
  const conversa = lb?.conversaId ?? aviso?.mensagem?.conversaId ?? null;
  const lembrete = f.cliente ? (
    <Folha titulo="Lembrete ao cliente" icone="whats"
      sub={contato ? <>Para {contato.nome}{contato.telefone ? <>, <span className="num">{formatarTelefone(contato.telefone)}</span></> : null}, contato principal da ficha</> : "O cliente não tem contato principal."}
      acoes={confirmou(lb?.resposta?.texto) && !cancelado
        ? <span className="selo selo-implant"><Icone nome="check" className="ico" />Confirmou presença</span>
        : f.lembrete && !cancelado ? <span className="selo selo-implant"><Icone nome="whats" className="ico" />Lembrete marcado</span> : <span className="selo selo-neutro">Sem lembrete</span>}>
      {f.tipo === "AUDIENCIA" ? (
        <p className="ag-por">
          <Icone nome="balanca" className="ico" />
          <span>
            <b>Por que lembrar.</b> Na audiência de conciliação, faltar sem justificativa é ato atentatório à dignidade da justiça e pode gerar multa de até 2% do valor da causa ou da vantagem pretendida (CPC, art. 334, § 8º).
          </span>
        </p>
      ) : null}
      {itens.length ? (
        <div className="ag-hist">
          <div className="eventos-dia">
            <ol className="eventos">
              {itens.map((it) => (
                <li key={it.chave}>
                  <time dateTime={it.em}>{diaCurto(diaDe(it.em))} {horaDe(it.em)}</time>
                  <span className="pto" aria-hidden="true" />
                  {it.corpo}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
      {cancelado ? (
        <p className="ag-hist-nota">
          O compromisso foi cancelado; nenhum lembrete sai.
          {aviso?.mensagem ? <> O aviso de cancelamento a {primeiroNome(contato?.nome ?? f.cliente.nome)} está {aviso.mensagem.envio === "NA_FILA" ? "na fila do WhatsApp do escritório" : ENVIO[aviso.mensagem.envio].toLowerCase()} desde {quandoCurto(aviso.mensagem.em)}.</>
            : aviso?.motivo ? <> O aviso de cancelamento não saiu: {aviso.motivo.charAt(0).toLowerCase() + aviso.motivo.slice(1)}</> : null}
        </p>
      ) : !f.lembrete ? (
        <p className="ag-hist-nota">O lembrete pelo WhatsApp está desmarcado. Para marcar, use “Editar ou remarcar”.</p>
      ) : fim ? (
        <p className="ag-hist-nota">O lembrete parou: {fim.charAt(0).toLowerCase() + fim.slice(1)}</p>
      ) : !ligado && !passou ? (
        <p className="ag-hist-nota">
          O WhatsApp do escritório ainda não está ligado. O lembrete fica marcado e sai quando o número for ligado; até lá, avise o cliente por outro meio.
        </p>
      ) : null}
      {ultima ? (
        <div className="ag-msg">
          <small>{ultima.envio === "NA_FILA" ? "Mensagem na fila desde" : "Mensagem enviada em"} {diaCurto(diaDe(ultima.em))}, às {horaDe(ultima.em)}</small>
          <p className="ag-balao">
            <span className="de">
              <Icone nome="whats" className="ico" />
              {escritorio.nome}
            </span>
            {ultima.texto}
          </p>
        </div>
      ) : contato && ativo ? (
        <div className="ag-msg">
          <small>Mensagem que vai sair 1 dia antes</small>
          <p className="ag-balao">
            <span className="de">
              <Icone nome="whats" className="ico" />
              {escritorio.nome}
            </span>
            {lb?.previa ?? textoDoLembrete(f, escritorio.nome, contato.nome)}
          </p>
        </div>
      ) : null}
      {conversa ? (
        <p className="ag-hist-nota">
          <a href={`${ROTAS_CONVERSAS.mensagens}?c=${conversa}`}>Ver a conversa com {primeiroNome(contato?.nome ?? f.cliente.nome)}<Icone nome="seta" className="ico ico-s" /></a>
        </p>
      ) : null}
    </Folha>
  ) : null;

  const quem = (
    <Folha titulo="Na agenda de" pequena>
      <ul className="ag-pessoas">
        <li>
          <span className="av-p forte" aria-hidden="true">{iniciais(f.responsavel.nome)}</span>
          <div><strong>{f.responsavel.nome}</strong><small>Responsável</small></div>
        </li>
        {f.tambemVai.map((p) => (
          <li key={p.id}>
            <span className="av-p" aria-hidden="true">{iniciais(p.nome)}</span>
            <div><strong>{p.nome}</strong><small>Também vai</small></div>
          </li>
        ))}
      </ul>
    </Folha>
  );

  const hist = (
    <Folha titulo="Histórico" pequena>
      <div className="ag-hist">
        <div className="eventos-dia">
          <ol className="eventos">
            {f.historico.map((e, i) => {
              const fr = fraseDoEvento(e, nomes);
              return (
                <li key={i}>
                  <time dateTime={e.em}>{diaCurto(diaDe(e.em))} {horaDe(e.em)}</time>
                  <span className={i === f.historico.length - 1 && i > 0 ? "pto forte" : "pto"} aria-hidden="true" />
                  <div>
                    <p><b>{fr.quem}</b> {fr.oque}</p>
                    {fr.detalhe ? <small>{fr.detalhe}</small> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <p className="ag-hist-nota">Nada aqui é apagado. Remarcar e cancelar pedem motivo.</p>
    </Folha>
  );

  const acoes = cancelado ? null : (
    <Folha titulo="Cancelar" pequena>
      <div className="ag-acoes">
        <p>Cancelar pede o motivo e pode avisar o cliente pelo WhatsApp. O compromisso continua na agenda, riscado.</p>
        <button data-muda className="btn btn-perigo" type="button" onClick={() => setCancelar(true)}>
          <Icone nome="xis" className="ico" />
          Cancelar compromisso
        </button>
      </div>
    </Folha>
  );

  return (
    <MolduraPortal atual="agenda" trilha={[trilhaBase, { nome: f.titulo }]} escritorio={escritorio} pagina="co-ficha">
      <div className="ag">
        {cab}
        <div className="ag-grade">
          <div className="ag-col2">
            {dados}
            {lembrete}
          </div>
          <aside className="ag-col2" aria-label="Contexto do compromisso">
            {quem}
            {hist}
            {acoes}
          </aside>
        </div>
      </div>
      <JanelaCompromisso aberta={editar} inicial={rascunhoDe(f)} editar={f} pessoas={pessoas} clientes={clientes} casos={casos} tiposEscritos={f.tipoEscrito ? [f.tipoEscrito] : []}
        eu={escritorio.pessoa} aoFechar={() => setEditar(false)}
        aoFeito={(m: Marcado) => { setEditar(false); setFeito({ titulo: m.titulo, texto: m.texto }); void carregar(); }} />
      <JanelaCancelar aberta={cancelar} f={f} escritorio={escritorio?.nome ?? ""} aoFechar={() => setCancelar(false)}
        aoFeito={() => { setCancelar(false); setFeito({ titulo: "Compromisso cancelado.", texto: "Ele continua na agenda, riscado, com o motivo no histórico." }); void carregar(); }} />
      {feito ? (
        <div className="aviso aviso-sucesso toast" role="status">
          <Icone nome="check" className="ico" />
          <div>
            <strong className="aviso-titulo">{feito.titulo}</strong>
            <p>{feito.texto}</p>
          </div>
          <button className="fechar" type="button" aria-label="Fechar aviso" onClick={() => setFeito(null)}>
            <Icone nome="xis" className="ico" />
          </button>
        </div>
      ) : null}
    </MolduraPortal>
  );
}
