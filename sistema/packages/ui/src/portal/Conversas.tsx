"use client";
// Conversas do Portal, Mensagens (PD-07, EX-10, AP-02), tela aprovada em
// docs/design/aprovadas/portal-agenda-conversas (estados fila, conversa, assumida, devolver,
// passar, resolvida, novo-contato, fila-vazia, nao-conectado e nao-conectado-equipe).
// Lista à esquerda, conversa no meio e contexto à direita; no celular, uma coisa por vez.
// O banco decide quem responde e o que cada pessoa vê; a tela só mostra e pede.
// Contato novo (AP-07, docs/design/aprovadas/portal-jornada-fechamento, grupo 7): "Cadastrar como
// cliente" abre o Novo cliente com o nome e o telefone da conversa e volta para cá, já ligada à
// ficha; "Marcar primeira reunião" abre o Novo compromisso em cima da conversa.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ENVIO_MENSAGEM, FILTROS_CONVERSA, haQuanto, iniciaisConversa, MOTIVOS_CONVERSA, RAZOES_RESPONSAVEL, telefoneBr,
  type ClienteLinha, type Conversa, type FiltroConversa, type ListaClientes, type LinhaConversa, type ListaConversas, type MensagemConversa,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { diaCurto, diaDe, horaDe, nomeDoTipo, somarDias } from "./agenda.ts";
import { Toast, type Feito } from "./FichaCliente.tsx";
import { JanelaPedido, JanelaRetirar, SeloSemAvisos, type ClienteDoPedido, type PedidoNaConversa } from "./SemAvisos.tsx";
import { dataLonga, hora as horaCurta } from "../console/tempo.ts";
import { JanelaCompromisso, rascunhoNovo, type Pessoa, type Rascunho } from "./JanelaCompromisso.tsx";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";

export const ROTAS_CONVERSAS = {
  mensagens: "/conversas",
  automacoes: "/conversas/automacoes",
  avisos: "/conversas/avisos",
} as const;
type SecaoConversas = keyof typeof ROTAS_CONVERSAS;

const SECOES: { chave: SecaoConversas; nome: string }[] = [
  { chave: "mensagens", nome: "Mensagens" },
  { chave: "automacoes", nome: "Automações" },
  { chave: "avisos", nome: "Avisos automáticos" },
];

/** A barra de seções de Conversas, com o número de quem espera em Mensagens. */
export function BarraConversas({ secao, esperando }: { secao: SecaoConversas; esperando: number }) {
  return (
    <div className="pt-barra-area">
      <p className="pt-area-nome">
        <Icone nome="conversas" className="ico" />
        Conversas
      </p>
      <nav className="pt-secoes" aria-label="Seções de Conversas">
        {SECOES.map((s) => (
          <a key={s.chave} href={ROTAS_CONVERSAS[s.chave]} aria-current={s.chave === secao ? "page" : undefined}>
            {s.nome}
            {s.chave === "mensagens" && esperando > 0 ? <span className="q" aria-label={`, ${esperando} esperando`}>{esperando}</span> : null}
          </a>
        ))}
      </nav>
    </div>
  );
}

const ICONE_FILTRO: Record<FiltroConversa, NomeIcone> = { PRECISA: "mao", EQUIPE: "pessoas", IA: "ia", RESOLVIDAS: "check" };
const CONTAGEM: Record<FiltroConversa, keyof ListaConversas["contagem"]> = { PRECISA: "precisa", EQUIPE: "equipe", IA: "ia", RESOLVIDAS: "resolvidas" };
const ICONE_MOTIVO: Partial<Record<string, NomeIcone>> = { DOCUMENTO_NOVO: "imagem", CLIENTE_NOVO: "pessoa-mais", SEM_AVISOS: "sino-mudo" };

const primeiro = (nome: string) => nome.split(/\s+/)[0] ?? nome;
const voce = (p: { id: string; nome: string } | null | undefined, eu: string) => (p ? (p.id === eu ? `${p.nome} (você)` : p.nome) : "ninguém");

function quemEscreve(c: Pick<LinhaConversa, "cliente" | "quemEscreve" | "papel" | "telefone">): string {
  if (!c.cliente) return `Contato novo · ${telefoneBr(c.telefone)}`;
  if (!c.quemEscreve || c.quemEscreve === c.cliente.nome) return "O próprio cliente";
  return c.papel ? `${c.quemEscreve}, ${c.papel}` : c.quemEscreve;
}

/** Com quem fala a equipe: "Marta" (quem escreve) ou o nome do cliente. */
const comQuem = (c: Pick<LinhaConversa, "nome" | "quemEscreve">) => primeiro(c.quemEscreve ?? c.nome);

// ------------------------------------------------------------------------------- lista

function ItemConversa({ c, atual, eu, aoAbrir }: { c: LinhaConversa; atual: boolean; eu: string; aoAbrir: (id: string) => void }) {
  const espera = c.situacao === "PRECISA";
  const ult = c.ultima?.texto ? `“${c.ultima.texto}”` : c.ultima?.anexo ? `Mandou ${c.ultima.anexo}` : "";
  return (
    <li className={`cv-item${espera ? " espera" : ""}${atual ? " atual" : ""}`}>
      <span className={atual ? "av-p" : "av-p forte"} aria-hidden="true">{iniciaisConversa(c.nome)}</span>
      <div style={{ minWidth: 0 }}>
        <div className="cv-it-l1">
          <a className="cv-nome" href={`${ROTAS_CONVERSAS.mensagens}?c=${c.id}`} aria-current={atual || undefined}
            onClick={(e) => { e.preventDefault(); aoAbrir(c.id); }}>
            {c.nome}
          </a>
          {espera ? <span className="sr">, esperando </span> : null}
          <span className="cv-quando">
            {espera ? <Icone nome="relogio" className="ico" /> : null}
            {haQuanto(espera && c.esperandoDesde ? c.esperandoDesde : c.ultimaEm)}
          </span>
        </div>
        <small>{quemEscreve(c)}</small>
        {ult ? <p className="cv-ult">{ult}</p> : null}
        <div className="cv-it-pe">
          {espera ? (
            <>
              <span className="selo selo-atencao">
                <Icone nome={ICONE_MOTIVO[c.motivo ?? ""] ?? "mao"} className="ico" />
                {MOTIVOS_CONVERSA[c.motivo ?? "OUTRO"]}
              </span>
              <span className="cv-resp">com {c.responsavel?.id === eu ? `${primeiro(c.responsavel.nome)} (você)` : primeiro(c.responsavel?.nome ?? "")}</span>
            </>
          ) : c.situacao === "EQUIPE" ? (
            <span className="selo selo-ativo"><Icone nome="pessoas" className="ico" />Com {c.assumidaPor?.id === eu ? "você" : primeiro(c.assumidaPor?.nome ?? "")}</span>
          ) : c.resolvidaEm ? (
            <span className="selo selo-ok"><Icone nome="check" className="ico" />Resolvida pela IA</span>
          ) : (
            <span className="selo selo-implant"><Icone nome="ia" className="ico" />A IA está respondendo</span>
          )}
        </div>
      </div>
    </li>
  );
}

function ListaDeConversas({ lista, filtro, busca, atual, aoFiltro, aoBuscar, aoAbrir }: {
  lista: ListaConversas;
  filtro: FiltroConversa;
  busca: string;
  atual: string | null;
  aoFiltro: (f: FiltroConversa) => void;
  aoBuscar: (q: string) => void;
  aoAbrir: (id: string) => void;
}) {
  const [texto, setTexto] = useState(busca);
  const vazio = !lista.conversas.length;
  return (
    <section className="cv-lista" aria-labelledby="cv-lt">
      <h2 className="sr" id="cv-lt">Conversas</h2>
      <div className="cv-lista-cab">
        <form className="campo-busca" role="search" onSubmit={(e) => { e.preventDefault(); aoBuscar(texto.trim()); }}>
          <label className="sr" htmlFor="cv-busca">Buscar conversa por nome ou telefone</label>
          <Icone nome="busca" className="ico" />
          <input className="entrada" id="cv-busca" type="search" placeholder="Nome ou telefone" autoComplete="off" maxLength={80}
            value={texto} onChange={(e) => { setTexto(e.target.value); if (!e.target.value) aoBuscar(""); }} />
        </form>
        <div className="cv-filtros" role="group" aria-label="Mostrar">
          {(Object.keys(FILTROS_CONVERSA) as FiltroConversa[]).map((f) => (
            <button key={f} type="button" aria-pressed={!busca && f === filtro} onClick={() => { setTexto(""); aoFiltro(f); }}>
              <span>{FILTROS_CONVERSA[f]}</span>
              <b>{lista.contagem[CONTAGEM[f]]}</b>
            </button>
          ))}
        </div>
      </div>
      {vazio ? (
        <div style={{ padding: "8px 0" }}>
          {busca ? (
            <Estado icone="busca" titulo="Nenhuma conversa encontrada">Nada com “{busca}” no nome ou no telefone.</Estado>
          ) : filtro === "PRECISA" ? (
            <Estado icone="check" titulo="Ninguém esperando agora"
              acoes={<button className="btn btn-sec" type="button" onClick={() => aoFiltro("RESOLVIDAS")}><Icone nome="check" className="ico" />Ver as resolvidas hoje</button>}>
              Tudo o que a IA passou para a equipe já foi respondido. Quando ela precisar de alguém, a conversa aparece aqui, com o responsável.
            </Estado>
          ) : (
            <Estado icone={ICONE_FILTRO[filtro]} titulo="Nenhuma conversa aqui">Nada em “{FILTROS_CONVERSA[filtro]}” agora.</Estado>
          )}
        </div>
      ) : (
        <ul className="cv-itens" aria-label="Conversas">
          {lista.conversas.map((c) => <ItemConversa key={c.id} c={c} atual={c.id === atual} eu={lista.eu} aoAbrir={aoAbrir} />)}
        </ul>
      )}
      <p className="cv-lista-pe">
        <Icone nome="ia" className="ico" />
        <span>A IA responde o que está no T3jus. Valor, estratégia e chance de ganhar vão sempre para uma pessoa.</span>
      </p>
    </section>
  );
}

// ------------------------------------------------------------------------------- mensagens

function rotuloDia(iso: string, hoje: string): string {
  const d = diaDe(iso);
  return d === hoje ? "Hoje" : diaCurto(d);
}

function Momento({ m, eu }: { m: MensagemConversa; eu: string }): ReactNode {
  const quem = m.pessoa ? (m.pessoa.id === eu ? "Você" : m.pessoa.nome) : "A IA";
  switch (m.evento) {
    case "IA_PASSOU":
      return <>A IA passou a conversa para <b>{m.para?.nome}</b>{m.razao && m.razao !== "PASSADA" ? `, que ${RAZOES_RESPONSAVEL[m.razao]}` : ""}. Motivo: {MOTIVOS_CONVERSA[m.motivo ?? "OUTRO"].toLowerCase()}.</>;
    case "ASSUMIU":
      return m.pessoa?.id === eu
        ? <><b>Você assumiu</b> a conversa{m.de ? <>, que era de <b>{m.de.nome}</b></> : null}. A IA fica em silêncio até você devolver.</>
        : <><b>{quem} assumiu</b> a conversa{m.de ? <>, que era de <b>{m.de.nome}</b></> : null}. A IA fica em silêncio.</>;
    case "DEVOLVEU":
      return <><b>{quem} {m.pessoa?.id === eu ? "devolveu" : "devolveu"}</b> a conversa para a IA.{m.texto ? <> O que a IA precisa saber: “{m.texto}”</> : null}</>;
    case "PASSOU":
      return <><b>{quem} passou</b> a conversa para <b>{m.para?.nome}</b>.{m.texto ? <> Recado: “{m.texto}”</> : null}</>;
    case "IA_RESOLVEU":
      return <>A IA marcou a conversa como <b>resolvida</b>.</>;
    case "RESPONSAVEL_SAIU":
      return <><b>{m.de?.nome}</b> saiu da equipe; a conversa passou para <b>{m.para?.nome}</b>.</>;
    case "SEM_AVISOS_REGISTRADO":
    case "SEM_AVISOS_MUDADO":
    case "SEM_AVISOS_RETIRADO": {
      const de = m.quemPediu ? primeiro(m.quemPediu) : null;
      const oque = m.tipoAvisos === "TODOS" ? "sem avisos automáticos" : "sem avisos de cobrança";
      const quemFez = m.pessoa?.id === eu ? "Você" : m.pessoa?.nome ?? "Alguém da equipe";
      if (m.evento === "SEM_AVISOS_RETIRADO") {
        return <><b>{quemFez} retirou</b> o pedido de avisos{de ? <> a pedido de {de}</> : null}: o cliente volta a receber {m.tipoAvisos === "TODOS" ? "os avisos automáticos" : "os avisos de cobrança"}.</>;
      }
      return (
        <>
          <b>{quemFez} {m.evento === "SEM_AVISOS_MUDADO" ? "mudou" : "registrou"}</b> o pedido{de ? <> de {de}</> : null}: {oque}.
          {m.tipoAvisos === "TODOS" ? " As mensagens escritas pela equipe continuam." : " Lembretes de audiência e avisos de etapa continuam."}
        </>
      );
    }
    case "APP_RESPONDEU":
      return <>Alguém respondeu <b>pelo app do WhatsApp no celular</b>. A conversa ficou com <b>{m.para?.nome}</b>, e a IA fica em silêncio até devolverem.</>;
    default:
      return null;
  }
}

const ICONE_MOMENTO: Record<string, NomeIcone> = {
  IA_PASSOU: "mao", ASSUMIU: "pessoas", DEVOLVEU: "devolver", PASSOU: "trocar", IA_RESOLVEU: "check", RESPONSAVEL_SAIU: "trocar", APP_RESPONDEU: "celular",
  SEM_AVISOS_REGISTRADO: "sino-mudo", SEM_AVISOS_MUDADO: "sino-mudo", SEM_AVISOS_RETIRADO: "sino-volta",
};

function Anexo({ a }: { a: NonNullable<MensagemConversa["anexo"]> }) {
  const tam = a.bytes ? `${(Number(a.bytes) / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : "";
  const tipo = { IMAGEM: "Foto", DOCUMENTO: "Documento", AUDIO: "Áudio", VIDEO: "Vídeo" }[a.tipo];
  return (
    <span className="cv-anexo">
      <Icone nome={a.tipo === "IMAGEM" ? "imagem" : "doc"} className="ico" />
      <span>{a.nome}<small>{[tipo, tam].filter(Boolean).join(" · ")}</small></span>
    </span>
  );
}

function Mensagens({ c, hoje }: { c: Conversa; hoje: string }) {
  const itens: ReactNode[] = [];
  let dia = "";
  const de = c.quemEscreve ?? telefoneBr(c.telefone);
  for (const m of c.mensagens) {
    const d = rotuloDia(m.em, hoje);
    if (d !== dia) {
      dia = d;
      itens.push(<li key={`d-${m.id}`} className="cv-dia">{d}</li>);
    }
    const hora = <time dateTime={m.em}>{horaDe(m.em)}</time>;
    if (m.autor === "SISTEMA") {
      const avisos = m.evento?.startsWith("SEM_AVISOS_");
      itens.push(
        <li key={m.id} className={avisos ? "cv-sis ca-sis" : "cv-sis"}>
          <Icone nome={ICONE_MOMENTO[m.evento ?? ""] ?? "mao"} className="ico" />
          <span>
            <Momento m={m} eu={c.eu} />
            <time dateTime={m.em}>{horaDe(m.em)}</time>
            {avisos ? <small>Só a equipe vê esta linha. Nada foi enviado ao cliente; se quiser, responda abaixo.</small> : null}
          </span>
        </li>,
      );
    } else if (m.autor === "AVISO") {
      itens.push(
        <li key={m.id} className="cv-av">
          <span className="de"><Icone nome="whats" className="ico" />Aviso automático · {m.avisoTipo}</span>
          {m.texto}
          <small>{`${diaCurto(diaDe(m.em))}, ${horaDe(m.em)} · ${ENVIO_MENSAGEM[m.envio ?? "NA_FILA"]}`}</small>
        </li>,
      );
    } else {
      const cls = m.autor === "CLIENTE" ? "cli" : m.autor === "IA" ? "ia" : "eq";
      itens.push(
        <li key={m.id} className={`cv-m ${cls}`}>
          <div className="cv-b">
            <span className="de">
              {m.autor === "IA" ? <><Icone nome="ia" className="ico" />IA do escritório</> : m.autor === "EQUIPE" ? m.pessoa?.nome : m.autor === "APP" ? "Pelo app no celular" : de}
            </span>
            {m.anexo ? <Anexo a={m.anexo} /> : null}
            {m.texto}
            {hora}
            {m.autor === "EQUIPE" && m.envio && m.envio !== "LIDA" && m.envio !== "ENTREGUE" ? (
              <small className="envio">{m.envio === "FALHOU" ? `Não entregue: ${m.envioMotivo}` : ENVIO_MENSAGEM[m.envio]}</small>
            ) : null}
          </div>
        </li>,
      );
    }
  }
  return <ol className="cv-msgs" aria-label="Mensagens">{itens}</ol>;
}

// ------------------------------------------------------------------------------- conversa aberta

function Compor({ c, aoEnviado }: { c: Conversa; aoEnviado: () => void }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const para = comQuem(c);

  async function enviar() {
    if (!texto.trim()) {
      setErro("Escreva a mensagem.");
      return campo.current?.focus();
    }
    setEnviando(true);
    const r = await chamarPortal(`/v1/escritorio/conversas/${c.id}/mensagens`, { metodo: "POST", corpo: { texto: texto.trim() } });
    setEnviando(false);
    if (r.ok) {
      setTexto("");
      setErro(null);
      return aoEnviado();
    }
    setErro(r.erro.detalhes?.motivo === "WHATSAPP_NAO_LIGADO" ? "O WhatsApp do escritório não está ligado; nada saiu." : textoDoErro(r.erro));
    campo.current?.focus();
  }

  return (
    <form className="cv-compor" onSubmit={(e) => { e.preventDefault(); void enviar(); }} noValidate>
      <label className="sr" htmlFor="cv-txt">Mensagem para {para}</label>
      <textarea ref={campo} className="entrada" id="cv-txt" placeholder={`Escreva para ${para}`} maxLength={4096} value={texto}
        onChange={(e) => setTexto(e.target.value)} aria-invalid={erro ? true : undefined} aria-describedby={descritoPor(erro && "cv-txt-er")} />
      {erro ? <ErroCampo id="cv-txt-er">{erro}</ErroCampo> : null}
      <div className="cv-compor-pe">
        <span><Icone nome="whats" className="ico" />Sai pelo WhatsApp do escritório, com o seu nome.</span>
        <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
          <Icone nome="enviar" className="ico" />Enviar
        </button>
      </div>
    </form>
  );
}

function BarraSituacao({ c, aoAssumir, aoPassar, aoDevolver, mudando, dono }: {
  c: Conversa; aoAssumir: () => void; aoPassar: () => void; aoDevolver: () => void; mudando: boolean; dono: boolean;
}) {
  const passar = (
    <button className="btn btn-sec" type="button" onClick={aoPassar}><Icone nome="trocar" className="ico" />Passar para outra pessoa</button>
  );
  if (c.situacao === "PRECISA") {
    return (
      <div className="cv-est">
        <span className="selo selo-atencao"><Icone nome="mao" className="ico" />Precisa de alguém</span>
        <p>Desde {horaDe(c.esperandoDesde!)} · responsável: <b>{voce(c.responsavel, c.eu)}</b></p>
        {passar}
      </div>
    );
  }
  if (c.situacao === "EQUIPE") {
    const minha = c.assumidaPor?.id === c.eu;
    return (
      <div className="cv-est">
        <span className="selo selo-ativo"><Icone nome="pessoas" className="ico" />{minha ? "Com você" : `Com ${primeiro(c.assumidaPor?.nome ?? "")}`}</span>
        <p>{minha ? `Você assumiu às ${horaDe(c.assumidaEm!)}. A IA não responde enquanto isso.` : `${c.assumidaPor?.nome} assumiu às ${horaDe(c.assumidaEm!)}. A IA não responde enquanto isso.`}</p>
        {minha || dono ? (
          <button className="btn btn-sec" type="button" onClick={aoDevolver}><Icone nome="devolver" className="ico" />Devolver para a IA</button>
        ) : null}
        {passar}
      </div>
    );
  }
  return (
    <div className="cv-est">
      {c.resolvidaEm ? (
        <span className="selo selo-ok"><Icone nome="check" className="ico" />Resolvida pela IA</span>
      ) : (
        <span className="selo selo-implant"><Icone nome="ia" className="ico" />A IA está respondendo</span>
      )}
      <p>{c.resolvidaEm ? `A IA respondeu sozinha e encerrou às ${horaDe(c.resolvidaEm)}.` : "Ninguém precisa entrar por enquanto."}</p>
      <button className="btn btn-sec" type="button" onClick={aoAssumir} disabled={mudando} aria-busy={mudando || undefined}>
        <Icone nome="mao" className="ico" />Assumir mesmo assim
      </button>
    </div>
  );
}

function RodapeConversa({ c, aoAssumir, mudando, aoEnviado }: { c: Conversa; aoAssumir: () => void; mudando: boolean; aoEnviado: () => void }) {
  const para = comQuem(c);
  const bloq = (texto: string, botao = true) => (
    <div className="cv-compor bloq">
      <Icone nome="ia" className="ico" />
      <p>{texto}</p>
      {botao ? (
        <button className="btn btn-pri" type="button" onClick={aoAssumir} disabled={mudando} aria-busy={mudando || undefined}>
          <Icone nome="mao" className="ico" />Assumir conversa
        </button>
      ) : null}
    </div>
  );
  if (c.situacao === "PRECISA") {
    return c.responsavel?.id === c.eu
      ? bloq(`A IA está esperando alguém da equipe. Para escrever para ${para}, assuma a conversa: a IA fica em silêncio até você devolver.`)
      : bloq(`A IA está esperando alguém da equipe. ${primeiro(c.responsavel?.nome ?? "")} é o responsável, mas qualquer pessoa pode assumir.`);
  }
  if (c.situacao === "EQUIPE") {
    if (c.assumidaPor?.id !== c.eu) return bloq(`${c.assumidaPor?.nome} está nesta conversa. Para escrever, peça que ela passe a conversa para você.`, false);
    if (!c.whatsappLigado) return bloq("O WhatsApp do escritório foi desligado. Nada sai até a sócia dona ligar de novo.", false);
    return <Compor c={c} aoEnviado={aoEnviado} />;
  }
  return bloq(c.resolvidaEm
    ? `Se algo na resposta da IA estiver errado, assuma a conversa e corrija com ${para}. Se ${para} escrever de novo, a IA volta a responder.`
    : `A IA está respondendo ${para}. Se quiser entrar, use “Assumir mesmo assim”, no alto.`, false);
}

function CabConversa({ c, cadastrado }: { c: Conversa; cadastrado: boolean }) {
  const quem = !c.cliente ? "Nome dito na conversa"
    : !c.quemEscreve || c.quemEscreve === c.cliente.nome ? `${c.principal ? "O próprio cliente, contato principal" : "O próprio cliente"}`
    : null;
  return (
    <div className="cv-cab">
      <a className="cv-volta" href={ROTAS_CONVERSAS.mensagens}><Icone nome="esquerda" className="ico ico-s" />Conversas</a>
      <div>
        <p className="sobretitulo">WhatsApp · <span className="num">{telefoneBr(c.telefone)}</span></p>
        <h2 id="cv-ct" tabIndex={-1}>{c.nome}</h2>
        {c.avisos?.ativo ? <p className="ca-selos"><SeloSemAvisos ativo={c.avisos.ativo} /></p> : null}
      </div>
      <p className="cv-quem">
        {quem ?? <>Quem escreve: <b>{c.quemEscreve}</b>{c.papel ? `, ${c.papel}` : ""}{c.principal ? ", contato principal" : ""}</>}
        {c.cliente ? (
          <>
            <a href={`${ROTAS_PORTAL.clientes}/${c.cliente.id}`}><Icone nome="pessoas" className="ico ico-s" />Abrir a ficha</a>
            {cadastrado ? <> <span className="selo selo-implant"><Icone nome="check" className="ico ico-s" />Cliente desde hoje</span></> : null}
          </>
        ) : (
          <> <span className="selo selo-neutro">Ainda não está em Clientes</span></>
        )}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------------------- contexto

function Sec({ titulo, icone, children }: { titulo: string; icone: NomeIcone; children: ReactNode }) {
  return (
    <section className="cv-sec">
      <h3><Icone nome={icone} className="ico" />{titulo}</h3>
      {children}
    </section>
  );
}

function diasDesde(dia: string, hoje: string): number {
  return Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${dia}T12:00:00Z`)) / 86_400_000);
}

type JanelaAvisos = "avisos" | "avisos-mudar" | "avisos-retirar";

/** O cliente da conversa, no formato das janelas de "não receber avisos". */
function clienteDoPedido(c: Conversa): ClienteDoPedido | null {
  if (!c.cliente || !c.avisos) return null;
  return { id: c.cliente.id, nome: c.cliente.nome, tipo: c.avisos.tipo, contatos: c.avisos.contatos };
}

/** Quem escreve e a última mensagem do cliente, que fica ligada ao pedido (pergunta 2). */
function pedidoNaConversa(c: Conversa): PedidoNaConversa {
  const ultima = [...c.mensagens].reverse().find((m) => m.autor === "CLIENTE" && m.texto);
  const titular = !c.quemEscreve || c.quemEscreve === c.cliente?.nome;
  return {
    conversaId: c.id,
    contatoId: c.contatoId ?? null,
    titular,
    quemEscreve: c.contatoId ? null : c.quemEscreve,
    mensagem: ultima ? { id: ultima.id, texto: ultima.texto!, em: ultima.em, de: c.quemEscreve ?? c.cliente?.nome ?? telefoneBr(c.telefone) } : null,
  };
}

/** Os avisos automáticos do cliente, logo depois de Cliente (F3.65). */
function SecAvisos({ c, aoAbrir }: { c: Conversa; aoAbrir: (j: JanelaAvisos) => void }) {
  const av = c.avisos!;
  const a = av.ativo;
  const ficha = `${ROTAS_PORTAL.clientes}/${c.cliente!.id}`;
  if (!a) {
    const principal = av.contatos.find((x) => x.principal);
    const para = principal ? (principal.nome === c.cliente!.nome ? "o próprio cliente" : `${primeiro(principal.nome)}, o contato principal`) : "o contato principal";
    return (
      <Sec titulo="Avisos automáticos" icone="sino">
        <p className="ca-linha">
          <Icone nome="sino" className="ico" />
          <span><b>Recebe os avisos automáticos.</b> Saem para {para}. Se pedirem para não receber, registre aqui.</span>
        </p>
        {av.podeMudar ? (
          <div className="ca-acoes">
            <button className="btn btn-sec" type="button" onClick={() => aoAbrir("avisos")}><Icone nome="sino-mudo" className="ico" />Não receber avisos</button>
          </div>
        ) : null}
      </Sec>
    );
  }
  const reg = a.registradoPor;
  const quem = reg ? (reg.id === c.eu ? "você" : reg.nome) : "alguém da equipe";
  const quando = dataLonga(a.registradoEm) === dataLonga(new Date().toISOString()) ? `hoje às ${horaCurta(a.registradoEm)}` : `em ${dataLonga(a.registradoEm).slice(0, 5)} às ${horaCurta(a.registradoEm)}`;
  const como = { WHATSAPP: "pelo WhatsApp", TELEFONE: "por telefone", PRESENCIAL: "pessoalmente", EMAIL: "por e-mail" }[a.canal ?? "WHATSAPP"];
  return (
    <Sec titulo="Avisos automáticos" icone="sino-mudo">
      <div className="ca-fora">
        <strong><Icone nome="sino-mudo" className="ico" />{a.tipo === "COBRANCA" ? "Fora dos avisos de cobrança" : "Fora de todos os avisos automáticos"} desde {dataLonga(a.pedidoEm)}</strong>
        <p>
          {a.quemPediu ? <>Pedido de <b>{a.quemPediu}</b>{a.quemPapel ? ` (${a.quemPapel.split(" · ")[0]!.toLowerCase()})` : ""}, {como}. </> : null}
          Registrado por {quem}, {a.origem === "CONVERSA" ? "na conversa" : "na ficha"}, {quando}.
        </p>
      </div>
      <p className="ca-linha">
        <Icone nome="check" className="ico" />
        <span><b>Continua:</b> {a.tipo === "COBRANCA" ? "lembrete de audiência, aviso de etapa e prestação de contas, e o que a equipe escreve aqui." : "o que a equipe escreve aqui."}</span>
      </p>
      {av.podeMudar ? (
        <div className="ca-acoes">
          <button className="btn btn-sec" type="button" onClick={() => aoAbrir("avisos-mudar")}><Icone nome="lapis" className="ico" />Mudar o pedido</button>
          <button className="btn btn-sec" type="button" onClick={() => aoAbrir("avisos-retirar")}><Icone nome="sino-volta" className="ico" />Retirar o pedido</button>
        </div>
      ) : null}
      <a className="ver" href={ficha}>Ver o histórico na ficha<Icone nome="dir" className="ico ico-s" /></a>
    </Sec>
  );
}

function secoesDoContexto(c: Conversa, hoje: string, aoAvisos: (j: JanelaAvisos) => void, aoReuniao: () => void, cadastrado: boolean): ReactNode[] {
  const s: ReactNode[] = [];
  if (c.situacao !== "IA" && c.motivo) {
    const razao = c.responsavelRazao && c.responsavelRazao !== "ASSUMIU" ? RAZOES_RESPONSAVEL[c.responsavelRazao] : null;
    s.push(
      <Sec key="por" titulo="Por que a IA passou" icone="ia">
        <p className="cv-por"><b>{MOTIVOS_CONVERSA[c.motivo]}.</b>{c.motivoTexto ? ` ${c.motivoTexto}` : ""}</p>
        {razao && c.responsavel ? (
          <p className="sub">{c.responsavel.id === c.eu ? `Veio para você porque você ${razao.replace(/^é /, "é ")}.` : `Foi para ${primeiro(c.responsavel.nome)} porque ${c.responsavelRazao === "COMERCIAL" ? razao : `${primeiro(c.responsavel.nome)} ${razao}`}.`}</p>
        ) : null}
      </Sec>,
    );
  }
  const pc = c.contexto.proxContato;
  if (pc) {
    const atraso = diasDesde(pc.em, hoje);
    s.push(
      <Sec key="prox" titulo="Próximo contato" icone="relogio">
        {pc.vencido ? (
          <Aviso tom="urgencia" titulo={atraso === 1 ? "Vencido há 1 dia" : `Vencido há ${atraso} dias`}>
            Era {diaCurto(pc.em)}: {pc.oque}, com {pc.responsavel.nome}.
          </Aviso>
        ) : (
          <p>{diaCurto(pc.em)}: {pc.oque}, com {pc.responsavel.nome}.</p>
        )}
        <a className="btn btn-sec" href={`${ROTAS_PORTAL.clientes}/${c.cliente!.id}`}><Icone nome="mais" className="ico" />Registrar atendimento</a>
      </Sec>,
    );
  }
  if (c.cliente) {
    s.push(
      <Sec key="cli" titulo="Cliente" icone="pessoas">
        <dl className="cv-dl">
          <div><dt>Cliente</dt><dd>{c.cliente.nome}</dd></div>
          <div><dt>Quem escreve</dt><dd>{!c.quemEscreve || c.quemEscreve === c.cliente.nome ? "O próprio cliente" : `${primeiro(c.quemEscreve)}${c.papel ? `, ${c.papel}` : ""}`}</dd></div>
          <div><dt>Contato</dt><dd>{c.principal ? "Principal da ficha" : "Da ficha"}</dd></div>
        </dl>
        {cadastrado ? <button className="btn btn-pri" type="button" onClick={aoReuniao}><Icone nome="agenda" className="ico" />Marcar primeira reunião</button> : null}
        <a className="btn btn-sec" href={`${ROTAS_PORTAL.clientes}/${c.cliente.id}`}><Icone nome="pessoas" className="ico" />Abrir a ficha</a>
        {cadastrado ? (
          <p className="cv-nota"><Icone nome="escudo" className="ico" /><span>A conversa ficou ligada à ficha. Dado de saúde e outros dados sensíveis ditos aqui continuam só na conversa, fora do cadastro.</span></p>
        ) : null}
      </Sec>,
    );
    if (c.avisos) s.push(<SecAvisos key="avisos" c={c} aoAbrir={aoAvisos} />);
  } else {
    s.push(
      <Sec key="novo" titulo="Contato novo" icone="pessoa-mais">
        <p>Este número não está em Clientes. Se for um cliente novo, cadastre e confira os dados com a pessoa.</p>
        <a className="btn btn-pri" href={`${ROTAS_PORTAL.clientes}/novo?conversa=${c.id}`}><Icone nome="pessoa-mais" className="ico" />Cadastrar como cliente</a>
        <button className="btn btn-sec" type="button" onClick={aoReuniao}><Icone nome="agenda" className="ico" />Marcar primeira reunião</button>
        <p className="cv-nota"><Icone nome="escudo" className="ico" /><span>A IA não cadastra sozinha: o cadastro abre com o nome e o telefone da conversa, para você conferir, e ao salvar você volta para cá. Dado de saúde e outros dados sensíveis ditos na conversa ficam só aqui, fora do cadastro.</span></p>
      </Sec>,
    );
  }
  const k = c.contexto.caso;
  const cp = c.contexto.compromisso;
  const linkCp = cp ? (
    <a className="ver" href={`${ROTAS_PORTAL.agenda}?ver=dia&dia=${diaDe(cp.inicio)}&marcado=${cp.id}`}>
      {nomeDoTipo(cp)} {diaDe(cp.inicio) === hoje ? "hoje" : diaCurto(diaDe(cp.inicio))}, {horaDe(cp.inicio)}{cp.local ? `, ${cp.local}` : ""}
      <Icone nome="dir" className="ico ico-s" />
    </a>
  ) : null;
  if (k) {
    s.push(
      <Sec key="caso" titulo="Caso" icone="balanca">
        <dl className="cv-dl">
          <div><dt>Processo</dt><dd>{k.nome}</dd></div>
          <div><dt>Etapa</dt><dd>{k.etapa}</dd></div>
        </dl>
        {linkCp}
      </Sec>,
    );
  } else if (linkCp) {
    s.push(<Sec key="agenda" titulo="Na agenda" icone="agenda">{linkCp}</Sec>);
  }
  return s;
}

// ------------------------------------------------------------------------------- janelas

function JanelaDevolver({ c, aoFechar, aoFeito }: { c: Conversa; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [nota, setNota] = useState("");
  const [registrar, setRegistrar] = useState(!!c.cliente);
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const para = comQuem(c);

  async function enviar() {
    const falta = registrar && !nota.trim();
    setErro(falta);
    setFalha(null);
    if (falta) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal(`/v1/escritorio/conversas/${c.id}/devolver`, {
      metodo: "POST", corpo: { versao: c.versao, nota: nota.trim() || null, registrarAtendimento: registrar },
    });
    setEnviando(false);
    if (r.ok) return aoFeito({ titulo: "Conversa devolvida para a IA.", texto: registrar ? `O atendimento foi para a ficha de ${primeiro(c.nome)}.` : "Ela continua na lista “Com a IA”." });
    if ((r.erro.detalhes?.campos as string[] | undefined)?.includes("nota")) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Alguém mudou esta conversa agora. Feche e abra de novo." : textoDoErro(r.erro));
  }

  return (
    <Janela id="j-devolver" aberta aoFechar={aoFechar} sobretitulo={c.nome} titulo="Devolver a conversa para a IA" descricao="j-devolver-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}><Icone nome="devolver" className="ico" />Devolver para a IA</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-devolver-d">Você sai da conversa; ela continua na lista “Com a IA”.</p>
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="dv-nota">O que a IA precisa saber {registrar ? null : <span className="opc">(opcional)</span>}</label>
          <textarea className="entrada" id="dv-nota" rows={4} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor(!erro && "dv-nota-aj", erro && "dv-nota-er")} />
          {erro ? <ErroCampo id="dv-nota-er">Escreva o resumo para registrar o atendimento.</ErroCampo>
            : <p className="ajuda" id="dv-nota-aj">A IA usa isto nas próximas respostas desta conversa. {para} não vê.</p>}
        </div>
        {c.cliente ? (
          <label className="opcao">
            <input type="checkbox" checked={registrar} onChange={(e) => setRegistrar(e.target.checked)} />
            <span>
              Registrar como atendimento na ficha de {primeiro(c.cliente.nome)}
              <small>Vai para o histórico de atendimento, com o resumo acima, seu nome e a hora.</small>
            </span>
          </label>
        ) : null}
        <p className="pt-comuns"><Icone nome="ia" className="ico" /><span>A IA volta a responder as próximas mensagens de {para}. Se precisar de alguém de novo, passa para você.</span></p>
      </div>
    </Janela>
  );
}

function JanelaPassar({ c, aoFechar, aoFeito }: { c: Conversa; aoFechar: () => void; aoFeito: (f: Feito) => void }) {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [pessoa, setPessoa] = useState("");
  const [recado, setRecado] = useState("");
  const [erro, setErro] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((r) => setPessoas(r.ok ? r.dados.pessoas : []));
  }, []);

  async function enviar() {
    setErro(!pessoa);
    setFalha(null);
    if (!pessoa) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal(`/v1/escritorio/conversas/${c.id}/passar`, { metodo: "POST", corpo: { versao: c.versao, pessoa, recado: recado.trim() || null } });
    setEnviando(false);
    const nome = pessoas?.find((p) => p.id === pessoa)?.nome ?? "";
    if (r.ok) return aoFeito({ titulo: `Conversa passada para ${nome}.`, texto: "A troca ficou registrada na conversa, com seu nome e a hora." });
    if ((r.erro.detalhes?.campos as string[] | undefined)?.includes("pessoa")) {
      setErro(true);
      return focarPrimeiroErro(corpo.current);
    }
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Alguém mudou esta conversa agora. Feche e abra de novo." : textoDoErro(r.erro));
  }

  const opcoes = (pessoas ?? []).filter((p) => !(c.situacao === "PRECISA" && p.id === c.responsavel?.id));
  return (
    <Janela id="j-passar" aberta aoFechar={aoFechar} sobretitulo={c.nome} titulo="Passar para outra pessoa" descricao="j-passar-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando || !pessoas} aria-busy={enviando || undefined}><Icone nome="trocar" className="ico" />Passar a conversa</button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-passar-d">Hoje o responsável é {voce(c.responsavel, c.eu)}.</p>
        {falha ? <Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso> : null}
        <div className="campo">
          <label htmlFor="ps-quem">Passar para</label>
          <select className="entrada" id="ps-quem" value={pessoa} onChange={(e) => setPessoa(e.target.value)} data-foco=""
            aria-invalid={erro || undefined} aria-describedby={descritoPor(!erro && "ps-quem-aj", erro && "ps-quem-er")}>
            <option value="">{pessoas ? "Escolha uma pessoa" : "Carregando a equipe…"}</option>
            {opcoes.map((p) => <option key={p.id} value={p.id}>{p.id === c.eu ? `${p.nome} (você)` : p.nome}</option>)}
          </select>
          {erro ? <ErroCampo id="ps-quem-er">Escolha uma pessoa ativa na equipe.</ErroCampo>
            : <p className="ajuda" id="ps-quem-aj">Só pessoas ativas na equipe. A conversa nunca fica sem responsável.</p>}
        </div>
        <div className="campo">
          <label htmlFor="ps-recado">Recado <span className="opc">(opcional)</span></label>
          <textarea className="entrada" id="ps-recado" rows={3} maxLength={600} value={recado} onChange={(e) => setRecado(e.target.value)} aria-describedby="ps-recado-aj" />
          <p className="ajuda" id="ps-recado-aj">Fica na conversa, só para a equipe.</p>
        </div>
        <p className="pt-comuns"><Icone nome="pessoas" className="ico" /><span>A pessoa vê a conversa em “Precisa de alguém”. A troca fica registrada na conversa, com seu nome e a hora.</span></p>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------------- não ligado e vazio

function NaoLigado({ lista, dono }: { lista: ListaConversas; dono: boolean }) {
  const quem = lista.whatsapp.quemLiga?.nome ?? "a sócia dona";
  const emAnalise = lista.whatsapp.situacao === "EM_ANALISE";
  return (
    <div className="cv">
      <div className="cv-nc">
        <div className="cv-col">
          <div className="estado" role="status">
            <span className="icone-estado"><Icone nome="whats" className="ico" /></span>
            <h2 style={{ fontSize: 26 }}>{emAnalise ? "O WhatsApp do escritório está sendo ligado" : "O WhatsApp do escritório ainda não está ligado"}</h2>
            <p style={{ maxWidth: "60ch" }}>
              {dono
                ? "É o número que seus clientes já usam para falar com o escritório. Depois de ligado, a IA responde o que sabe e passa para a equipe o que não sabe."
                : "Enquanto isso, as conversas com clientes continuam no WhatsApp de sempre, fora do T3jus."}
            </p>
            {dono ? (
              <ol className="cv-passos">
                <li><span className="disco"><span>1</span></span><span><b>Separe um número só do escritório.</b><small>Um chip ou número fixo com WhatsApp Business. Não use o celular pessoal de ninguém: o número fica com o escritório.</small></span></li>
                <li><span className="disco"><span>2</span></span><span><b>Marque a ligação com a equipe T3jus.</b><small>Cerca de 30 minutos, por vídeo, com o celular desse número em mãos. A equipe T3jus faz a ligação com você.</small></span></li>
                <li><span className="disco"><span>3</span></span><span><b>Revise como a IA se apresenta e quais avisos saem.</b><small>Nada é enviado aos clientes antes da sua revisão.</small></span></li>
              </ol>
            ) : (
              <ol className="cv-passos">
                <li><span className="disco"><span><Icone nome="pessoas" className="ico" /></span></span><span><b>Quem liga é {quem}, a sócia dona.</b>
                  <small>Avise a ela que as conversas ainda não estão ligadas. A equipe T3jus faz a ligação junto com ela, em cerca de 30 minutos.</small></span></li>
              </ol>
            )}
            {dono ? (
              <div className="acoes">
                <a className="btn btn-pri" href="mailto:suporte@t3jus.pro?subject=Ligar%20o%20WhatsApp%20do%20escrit%C3%B3rio"><Icone nome="agenda" className="ico" />Marcar a ligação com a equipe T3jus</a>
                <a className="btn btn-sec" href={ROTAS_PORTAL.ajuda}><Icone nome="ajuda" className="ico" />Como funciona</a>
              </div>
            ) : null}
          </div>
        </div>
        <aside className="cv-col" aria-label="Enquanto isso">
          <section className="folha" aria-labelledby="t-enq">
            <div className="folha-cab"><div><h2 id="t-enq">Enquanto isso</h2><p className="sub">Nada se perde; só não sai mensagem.</p></div></div>
            <ul className="cv-lista-x">
              <li><Icone nome="relogio" className="ico" /><span><b>Lembretes de audiência</b> ficam na Agenda como “não enviados”, para a equipe avisar o cliente por conta própria.</span></li>
              <li><Icone nome="moeda" className="ico" /><span><b>Avisos de pagamento e atraso</b> não saem. O Financeiro continua mostrando o que vence.</span></li>
              <li><Icone nome="balanca" className="ico" /><span><b>Avisos de etapa do caso</b> não saem. A etapa muda normalmente no Jurídico.</span></li>
              <li><Icone nome="cracha" className="ico" /><p><b>Precisa de ajuda?</b> Fale com o suporte T3jus em <a href="mailto:suporte@t3jus.pro">suporte@t3jus.pro</a>.</p></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function HojeAteAgora({ lista }: { lista: ListaConversas }) {
  return (
    <section className="cv-conv" aria-labelledby="cv-ct">
      <div className="cv-nada">
        <div className="estado sem-moldura" role="status">
          <span className="icone-estado"><Icone nome="conversas" className="ico" /></span>
          <h2 id="cv-ct" style={{ fontSize: 24 }}>Hoje, até agora</h2>
          <p>Nenhuma conversa aberta. Escolha uma à esquerda, ou veja o que a IA fez hoje.</p>
          <div className="cv-hoje">
            <div><span className="disco"><span>{lista.hoje.resolvidas}</span></span>resolvidas pela IA</div>
            <div><span className="disco"><span>{lista.hoje.respondidas}</span></span>passadas e já respondidas</div>
            <div><span className="disco"><span>{lista.hoje.avisos}</span></span>avisos automáticos enviados</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------- página

function lerEndereco(): { c: string | null; mostrar: FiltroConversa; q: string } {
  const p = new URLSearchParams(window.location.search);
  const m = (p.get("mostrar") ?? "").toUpperCase();
  const c = p.get("c");
  return {
    c: c && /^[0-9a-f-]{36}$/i.test(c) ? c.toLowerCase() : null,
    mostrar: m in FILTROS_CONVERSA ? (m as FiltroConversa) : "PRECISA",
    q: (p.get("q") ?? "").slice(0, 80),
  };
}

function escreverEndereco(o: { c: string | null; mostrar: FiltroConversa; q: string }, novo: boolean) {
  const p = new URLSearchParams();
  if (o.mostrar !== "PRECISA") p.set("mostrar", o.mostrar.toLowerCase());
  if (o.q) p.set("q", o.q);
  if (o.c) p.set("c", o.c);
  const url = `${ROTAS_CONVERSAS.mensagens}${p.size ? `?${p}` : ""}`;
  if (novo) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export function ConversasPortal() {
  const { escritorio, erro: erroEsc, recarregar: recarregarEsc } = useEscritorioPortal();
  const [estado, setEstado] = useState<{ c: string | null; mostrar: FiltroConversa; q: string } | null>(null);
  const [lista, setLista] = useState<ListaConversas | "erro" | null>(null);
  const [conversa, setConversa] = useState<Conversa | "erro" | null>(null);
  const [vez, setVez] = useState(0);
  const [janela, setJanela] = useState<"devolver" | "passar" | JanelaAvisos | null>(null);
  const [vezJanela, setVezJanela] = useState(0);
  const [mudando, setMudando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const titulo = useRef(false);
  // Voltou do cadastro pela conversa (?cadastrado=1): o aviso e "Cliente desde hoje".
  const [cadastrado, setCadastrado] = useState<string | null>(null);
  const [reuniao, setReuniao] = useState<{ aberta: boolean; inicial: Rascunho; vez: number } | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [clientes, setClientes] = useState<ClienteLinha[] | null>(null);

  useEffect(() => {
    const ler = () => setEstado(lerEndereco());
    void Promise.resolve().then(() => {
      const e = lerEndereco();
      if (e.c && new URLSearchParams(window.location.search).get("cadastrado") === "1") {
        setCadastrado(e.c);
        escreverEndereco(e, false);
      }
      ler();
    });
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);

  useEffect(() => {
    if (!estado) return;
    let vivo = true;
    const p = new URLSearchParams({ mostrar: estado.mostrar });
    if (estado.q) p.set("q", estado.q);
    void chamarPortal<ListaConversas>(`/v1/escritorio/conversas?${p}`).then((r) => vivo && setLista(r.ok ? r.dados : "erro"));
    return () => { vivo = false; };
  }, [estado, vez]);

  useEffect(() => {
    if (!estado?.c) return;
    let vivo = true;
    void chamarPortal<Conversa>(`/v1/escritorio/conversas/${estado.c}`).then((r) => vivo && setConversa(r.ok ? r.dados : "erro"));
    return () => { vivo = false; };
  }, [estado?.c, vez]);

  useEffect(() => {
    if (conversa && conversa !== "erro" && titulo.current) {
      titulo.current = false;
      document.getElementById("cv-ct")?.focus();
    }
  }, [conversa]);

  function ir(o: Partial<{ c: string | null; mostrar: FiltroConversa; q: string }>) {
    if (!estado) return;
    const n = { ...estado, ...o };
    if (o.c !== undefined && o.c !== estado.c) {
      setConversa(null);
      titulo.current = true;
    }
    setFalha(null);
    escreverEndereco(n, o.c !== undefined);
    setEstado(n);
  }

  function depois(f: Feito | null) {
    setJanela(null);
    if (f) setFeito(f);
    setVez((v) => v + 1);
    recarregarEsc();
  }

  async function assumir(c: Conversa) {
    setMudando(true);
    setFalha(null);
    const r = await chamarPortal(`/v1/escritorio/conversas/${c.id}/assumir`, { metodo: "POST", corpo: { versao: c.versao } });
    setMudando(false);
    if (r.ok) return depois({ titulo: "Você assumiu a conversa.", texto: `A IA fica em silêncio até você devolver. Pode escrever para ${comQuem(c)}.` });
    setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Alguém mudou esta conversa agora. Ela foi carregada de novo." : textoDoErro(r.erro));
    setVez((v) => v + 1);
  }

  // Quando volta do cadastro, o aviso diz quem foi cadastrado.
  useEffect(() => {
    if (!cadastrado || !conversa || conversa === "erro" || conversa.id !== cadastrado || !conversa.cliente) return;
    const nome = conversa.cliente.nome;
    void Promise.resolve().then(() => setFeito((f) => f ?? {
      titulo: `${nome} cadastrada.`, texto: `A conversa ficou ligada à ficha de ${primeiro(nome)}. O histórico da conversa continua aqui.`,
    }));
  }, [cadastrado, conversa]);

  function abrirReuniao(c: Conversa) {
    if (!pessoas) void chamarPortal<{ pessoas: Pessoa[] }>("/v1/escritorio/pessoas").then((r) => setPessoas(r.ok ? r.dados.pessoas : []));
    if (c.cliente && !clientes) void chamarPortal<ListaClientes>("/v1/escritorio/clientes?situacao=ATIVO").then((r) => setClientes(r.ok ? r.dados.clientes : []));
    const nome = c.cliente?.nome ?? c.quemEscreve ?? c.nome;
    const base = rascunhoNovo(somarDias(diaDe(new Date().toISOString()), 1), "14:00", c.responsavel?.id ?? c.eu ?? "");
    setReuniao((x) => ({
      aberta: true, vez: (x?.vez ?? 0) + 1,
      inicial: { ...base, tipo: "CLIENTE", titulo: `Primeira reunião · ${nome}`.slice(0, 160), clienteId: c.cliente?.id ?? "", lembrete: true },
    }));
  }

  const esperando = escritorio?.conversasEsperando ?? (lista && lista !== "erro" ? lista.contagem.precisa : 0);
  const atual = conversa && conversa !== "erro" && estado?.c === conversa.id ? conversa : null;
  const trilha = [{ nome: "Conversas", href: ROTAS_CONVERSAS.mensagens }, { nome: atual ? atual.nome : "Mensagens" }];
  const barra = <BarraConversas secao="mensagens" esperando={esperando} />;

  let miolo: ReactNode;
  if (erroEsc || lista === "erro") {
    miolo = <ErroAoCarregar oque="as conversas" aoTentar={() => { recarregarEsc(); setVez((v) => v + 1); }} />;
  } else if (!lista || !estado || !escritorio) {
    miolo = <Carregando rotulo="Carregando as conversas" linhas={6} />;
  } else {
    const total = lista.contagem.precisa + lista.contagem.equipe + lista.contagem.ia + lista.contagem.resolvidas;
    if (lista.whatsapp.situacao !== "LIGADO" && total === 0 && !lista.conversas.length && !estado.q && !estado.c) {
      miolo = <NaoLigado lista={lista} dono={escritorio.dono} />;
    } else {
      const hoje = diaDe(new Date().toISOString());
      const abrirAvisos = (j: JanelaAvisos) => { setVezJanela((v) => v + 1); setJanela(j); };
      const comCadastro = !!atual && cadastrado === atual.id && !!atual.cliente;
      const ctx = atual ? secoesDoContexto(atual, hoje, abrirAvisos, () => abrirReuniao(atual), comCadastro) : [];
      const cliPedido = atual ? clienteDoPedido(atual) : null;
      const feitoAvisos = (x: Feito) => depois(x);
      miolo = (
        <div className="cv">
          {falha ? <Aviso tom="urgencia" titulo="Nada mudou.">{falha}</Aviso> : null}
          <div className={`folha cv-caixa ${estado.c ? "foco-conversa" : "foco-lista"}`}>
            <ListaDeConversas lista={lista} filtro={estado.mostrar} busca={estado.q} atual={estado.c}
              aoFiltro={(f) => ir({ mostrar: f, q: "" })} aoBuscar={(q) => ir({ q })} aoAbrir={(id) => ir({ c: id })} />
            {!estado.c ? (
              <HojeAteAgora lista={lista} />
            ) : conversa === "erro" ? (
              <section className="cv-conv" aria-labelledby="cv-ct">
                <div className="cv-nada">
                  <Estado icone="alerta" erro titulo="Não deu para abrir esta conversa"
                    acoes={<button className="btn btn-pri" type="button" onClick={() => setVez((v) => v + 1)}>Tentar de novo</button>}>
                    Ela pode ter sido aberta em outro escritório. Escolha outra à esquerda ou tente de novo.
                  </Estado>
                </div>
              </section>
            ) : !atual ? (
              <section className="cv-conv" aria-label="Conversa"><div style={{ padding: 24 }}><Carregando rotulo="Carregando a conversa" linhas={5} /></div></section>
            ) : (
              <section className="cv-conv" aria-labelledby="cv-ct">
                <CabConversa c={atual} cadastrado={comCadastro} />
                <BarraSituacao c={atual} dono={escritorio.dono} mudando={mudando} aoAssumir={() => void assumir(atual)}
                  aoPassar={() => setJanela("passar")} aoDevolver={() => setJanela("devolver")} />
                <Mensagens c={atual} hoje={hoje} />
                {ctx.length ? (
                  <details className="cv-ctx-cel">
                    <summary>
                      <Icone nome="pessoas" className="ico" />
                      Sobre {primeiro(atual.nome)}{atual.contexto.caso && atual.avisos ? ", o caso e os avisos" : atual.contexto.caso ? " e o caso" : atual.avisos ? " e os avisos" : ""}
                      <Icone nome="baixo" className="ico ico-s" />
                    </summary>
                    <div className="cv-ctx" role="group" aria-label={`Sobre ${primeiro(atual.nome)}, no celular`}>{secoesDoContexto(atual, hoje, abrirAvisos, () => abrirReuniao(atual), comCadastro)}</div>
                  </details>
                ) : null}
                <RodapeConversa c={atual} mudando={mudando} aoAssumir={() => void assumir(atual)} aoEnviado={() => setVez((v) => v + 1)} />
              </section>
            )}
            <aside className="cv-ctx" aria-label={atual ? `Sobre ${primeiro(atual.nome)}` : "Contexto"}>{ctx}</aside>
          </div>
          {atual && reuniao ? (
            <JanelaCompromisso key={`re-${reuniao.vez}`} aberta={reuniao.aberta && pessoas !== null} inicial={reuniao.inicial}
              conversa={atual.cliente ? null : { id: atual.id, nome: atual.quemEscreve ?? atual.nome, telefone: atual.telefone }}
              pessoas={pessoas ?? []} clientes={atual.cliente ? clientes : []} tiposEscritos={[]} eu={escritorio.pessoa}
              aoFechar={() => setReuniao((x) => x && { ...x, aberta: false })}
              aoFeito={(m) => { setReuniao((x) => x && { ...x, aberta: false }); depois({ titulo: m.titulo, texto: m.texto }); }} />
          ) : null}
          {atual && janela === "devolver" ? <JanelaDevolver c={atual} aoFechar={() => setJanela(null)} aoFeito={depois} /> : null}
          {atual && janela === "passar" ? <JanelaPassar c={atual} aoFechar={() => setJanela(null)} aoFeito={depois} /> : null}
          {atual && cliPedido && (janela === "avisos" || janela === "avisos-mudar") ? (
            <JanelaPedido key={`ap-${vezJanela}`} aberta f={cliPedido} atual={janela === "avisos-mudar" ? atual.avisos!.ativo : null}
              agora={pedidoNaConversa(atual)} aoFechar={() => setJanela(null)} aoFeito={feitoAvisos} />
          ) : null}
          {atual && cliPedido && janela === "avisos-retirar" && atual.avisos?.ativo ? (
            <JanelaRetirar key={`ar-${vezJanela}`} aberta f={cliPedido} atual={atual.avisos.ativo}
              agora={pedidoNaConversa(atual)} aoFechar={() => setJanela(null)} aoFeito={feitoAvisos} />
          ) : null}
        </div>
      );
    }
  }

  return (
    <MolduraPortal atual="conversas" trilha={trilha} escritorio={escritorio} barra={barra}>
      {miolo}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </MolduraPortal>
  );
}
