"use client";
// Escritório › WhatsApp e IA (PA-04), tela aprovada em docs/design/aprovadas/portal-whatsapp
// (estados nao-ligado, passos, numero-erro, em-analise, ligado, modelo-recusado, desligar, ia,
// ia-passar, ia-saber, ia-testar, ia-ligar, ia-ligada e so-leitura). Só a sócia dona liga,
// muda e desliga; quem tem o Escritório vê para ler. O token da Meta nunca chega aqui.
// A parte e a seção vêm do endereço (?parte=ia&ia=passar, ?ligar=1, ?aviso=CHAVE).

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ASSUNTOS_IA, AVISOS_WHATSAPP, DIAS_SEMANA, QUALIDADES, telefoneBr, telefoneE164, textoAvisoValido, TONS_IA,
  type AssuntoIa, type AvisoWhatsapp, type ChaveAviso, type ConfigIa, type EventoWhatsapp, type PaginaIa, type PaginaWhatsapp,
  MOTIVOS_CONVERSA, type ClienteTesteIa, type MotivoConversa, type PlanoIa, type RegraBarrada, type RespostaIa, type RespostaTesteIa, type TomIa,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { diaCurto, diaDe, horaDe } from "./agenda.ts";
import { Toast, type Feito } from "./FichaCliente.tsx";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";

export const ROTAS_ESCRITORIO = {
  dados: ROTAS_PORTAL.escritorio,
  whatsapp: `${ROTAS_PORTAL.escritorio}/whatsapp`,
} as const;

/** A barra de seções do Escritório (decisão 1 do desenho). */
export function BarraEscritorio({ secao }: { secao: keyof typeof ROTAS_ESCRITORIO }) {
  return (
    <div className="pt-barra-area">
      <p className="pt-area-nome">
        <Icone nome="coluna" className="ico" />
        Escritório
      </p>
      <nav className="pt-secoes" aria-label="Seções do Escritório">
        <a href={ROTAS_ESCRITORIO.dados} aria-current={secao === "dados" ? "page" : undefined}>Dados do escritório</a>
        <a href={ROTAS_ESCRITORIO.whatsapp} aria-current={secao === "whatsapp" ? "page" : undefined}>WhatsApp e IA</a>
      </nav>
    </div>
  );
}

type Parte = "numero" | "ia";
type SecaoIa = "apresentacao" | "passar" | "saber" | "testar";
const SECOES_IA: { chave: SecaoIa; nome: string; icone: NomeIcone }[] = [
  { chave: "apresentacao", nome: "Apresentação e assuntos", icone: "conversas" },
  { chave: "passar", nome: "Quando passa para alguém", icone: "mao" },
  { chave: "saber", nome: "O que ela sabe", icone: "livro" },
  { chave: "testar", nome: "Testar sem enviar", icone: "olho" },
];

interface Endereco { parte: Parte; ia: SecaoIa | null; ligar: boolean; aviso: ChaveAviso | null }

function lerEndereco(): Endereco {
  const q = new URLSearchParams(window.location.search);
  const ia = q.get("ia");
  const aviso = q.get("aviso");
  return {
    parte: q.get("parte") === "ia" ? "ia" : "numero",
    ia: SECOES_IA.some((s) => s.chave === ia) ? (ia as SecaoIa) : null,
    ligar: q.get("ligar") === "1",
    aviso: aviso && aviso in AVISOS_WHATSAPP ? (aviso as ChaveAviso) : null,
  };
}

function hrefDe(e: Partial<Endereco>): string {
  const q = new URLSearchParams();
  if (e.parte === "ia") q.set("parte", "ia");
  if (e.ia) q.set("ia", e.ia);
  if (e.ligar) q.set("ligar", "1");
  if (e.aviso) q.set("aviso", e.aviso);
  const s = q.toString();
  return s ? `${ROTAS_ESCRITORIO.whatsapp}?${s}` : ROTAS_ESCRITORIO.whatsapp;
}

const primeiro = (nome: string | null | undefined) => (nome ?? "").split(/\s+/)[0] ?? "";
const quando = (iso: string | null | undefined) => (iso ? `${diaCurto(diaDe(iso))}, ${horaDe(iso)}` : "");
const cnpjBr = (c: string | null) => (c ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : null);

function Selo({ tipo, icone, children }: { tipo: "neutro" | "implant" | "atencao" | "ativo" | "urgente"; icone?: NomeIcone; children: ReactNode }) {
  return (
    <span className={`selo selo-${tipo}`}>
      {icone ? <Icone nome={icone} className="ico" /> : null}
      {children}
    </span>
  );
}

function Folha({ id, titulo, sub, icone, children }: { id: string; titulo: string; sub?: string; icone?: NomeIcone; children: ReactNode }) {
  return (
    <section className="folha" aria-labelledby={id} style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id={id}>{icone ? <Icone nome={icone} className="ico" /> : null}{titulo}</h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ListaX({ itens }: { itens: [NomeIcone, ReactNode][] }) {
  return (
    <ul className="cv-lista-x">
      {itens.map(([i, t], n) => (
        <li key={n}><Icone nome={i} className="ico" /><span>{t}</span></li>
      ))}
    </ul>
  );
}

function Passos({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <ol className="cv-passos" style={{ padding: "0 24px 20px", margin: 0 }}>
      {itens.map(([n, t]) => (
        <li key={n}><span className="disco"><span>{n}</span></span><span>{t}</span></li>
      ))}
    </ol>
  );
}

function Nota({ icone, children, estilo }: { icone: NomeIcone; children: ReactNode; estilo?: CSSProperties }) {
  return <p className="wa-nota" style={estilo}><Icone nome={icone} className="ico" /><span>{children}</span></p>;
}

// ------------------------------------------------------------------------------- situação

type SitNumero = "nao" | "analise" | "ligado" | "recusado";

function situacaoNumero(w: PaginaWhatsapp): SitNumero {
  const n = w.numero;
  if (!n || n.situacao === "DESLIGADO") return "nao";
  if (w.avisos.some((a) => a.situacao === "RECUSADO")) return "recusado";
  return n.situacao === "EM_ANALISE" ? "analise" : "ligado";
}

function SeloNumero({ sit }: { sit: SitNumero }) {
  if (sit === "nao") return <Selo tipo="neutro">Não ligado</Selo>;
  if (sit === "analise") return <Selo tipo="atencao" icone="relogio">Esperando a Meta</Selo>;
  if (sit === "recusado") {
    return <Selo tipo="urgente" icone="alerta">Aviso recusado</Selo>;
  }
  return <Selo tipo="ativo" icone="check">Ligado</Selo>;
}

function SeloIa({ sit }: { sit: PaginaIa["situacao"] }) {
  if (sit === "LIGADA") return <Selo tipo="ativo" icone="check">Ligada</Selo>;
  if (sit === "PAUSADA") return <Selo tipo="atencao" icone="pausa">Pausada</Selo>;
  return <Selo tipo="neutro">Desligada</Selo>;
}

function Abas({ parte, w, ia }: { parte: Parte; w: PaginaWhatsapp; ia: PaginaIa["situacao"] }) {
  const sit = situacaoNumero(w);
  const recusados = w.avisos.filter((a) => a.situacao === "RECUSADO").length;
  return (
    <nav className="abas wa-abas" aria-label="Partes da página">
      <a href={hrefDe({ parte: "numero" })} aria-current={parte === "numero" ? "page" : undefined}>
        <Icone nome="whats" className="ico ico-s" />Número do WhatsApp
        {sit === "recusado" ? <Selo tipo="urgente" icone="alerta">{recusados === 1 ? "1 aviso recusado" : `${recusados} avisos recusados`}</Selo> : <SeloNumero sit={sit} />}
      </a>
      <a href={hrefDe({ parte: "ia" })} aria-current={parte === "ia" ? "page" : undefined}>
        <Icone nome="ia" className="ico ico-s" />Como a IA atende<SeloIa sit={ia} />
      </a>
    </nav>
  );
}

function Cabeca({ lede }: { lede?: string }) {
  return (
    <div className="wa-cab">
      <div>
        <p className="sobretitulo">Escritório</p>
        <h1>WhatsApp e IA</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">{lede ?? "O número de WhatsApp do escritório e como a IA atende os clientes por ele."}</p>
      </div>
    </div>
  );
}

function SoLeitura({ quem }: { quem: string }) {
  return (
    <Aviso tom="info" icone="cadeado" titulo="Você vê esta página só para ler">
      Quem liga, muda e desliga o WhatsApp e a IA é <b>{quem}</b>, a sócia dona. Se algo estiver errado, fale com ela.
    </Aviso>
  );
}

const MARCAR_LIGACAO = "mailto:suporte@t3jus.pro?subject=Ligar%20o%20WhatsApp%20do%20escrit%C3%B3rio";

// ------------------------------------------------------------------------------- não ligado

function NaoLigado({ w }: { w: PaginaWhatsapp }) {
  const quem = w.quemCuida?.nome ?? "a sócia dona";
  const cnpj = cnpjBr(w.escritorio.cnpj);
  const n = w.numero;
  return (
    <div className="wa-grade">
      <div className="wa-col">
        {n?.situacao === "DESLIGADO" ? (
          <Aviso tom="atencao" icone="historico" titulo={`O WhatsApp foi desligado em ${quando(n.desligadoEm)}${n.desligadoPor ? `, por ${primeiro(n.desligadoPor.nome)}` : ""}`}>
            Motivo: {n.desligadoMotivo}. As conversas e o histórico continuam guardados; dá para ligar de novo.
          </Aviso>
        ) : null}
        <section className="folha" aria-labelledby="t-nl" style={{ overflow: "hidden" }}>
          <div className="wa-abre">
            <span className="icone-estado"><Icone nome="whats" className="ico" /></span>
            <div>
              <h2 id="t-nl">Ligue o WhatsApp do escritório</h2>
              <p>Os clientes escrevem para o número do escritório, as conversas aparecem em Conversas e, quando você quiser, a IA responde o que sabe e passa para a equipe o que não sabe.</p>
            </div>
          </div>
          <div className="wa-corpo">
            <h3 className="sobretitulo" style={{ marginTop: 12, fontFamily: "inherit", fontWeight: 500 }}>O que ter em mãos</h3>
            <ul className="wa-maos" aria-label="O que ter em mãos">
              <li><Icone nome="celular" className="ico" /><span><b>Um número só do escritório</b><small>Um chip novo ou o fixo do escritório. Não use o celular pessoal de ninguém: o número fica com o escritório, mesmo se a pessoa sair.</small></span></li>
              <li><Icone nome="telefone" className="ico" /><span><b>Esse telefone por perto</b><small>A Meta manda um código por SMS ou liga e dita o código. Número fixo recebe por ligação.</small></span></li>
              <li><Icone nome="chave" className="ico" /><span><b>A sua conta do Facebook</b><small>É com ela que a Meta (dona do WhatsApp) confirma quem você é. Nada é publicado no seu perfil, e o T3jus não vê a sua senha.</small></span></li>
              <li><Icone nome="coluna" className="ico" /><span><b>Nome e CNPJ do escritório</b><small>{w.escritorio.nome}{cnpj ? ` · ${cnpj}` : ""}. Já vêm do Escritório.</small></span></li>
            </ul>
            {w.dono ? (
              <div className="wa-caminhos">
                <div className="wa-caminho pri">
                  <span className="tempo"><Icone nome="relogio" className="ico" />Uns 15 minutos</span>
                  <h3>Ligar agora, passo a passo</h3>
                  <p>Você faz sozinha, com o T3jus explicando cada tela, inclusive a janela da Meta. Dá para parar e continuar depois.</p>
                  <a className="btn btn-pri" href={hrefDe({ ligar: true })}><Icone nome="ligar" className="ico" />{w.rascunho && w.rascunho.passo > 1 ? "Continuar de onde parei" : "Começar a ligar"}</a>
                </div>
                <div className="wa-caminho">
                  <span className="tempo"><Icone nome="video" className="ico" />30 minutos, por vídeo</span>
                  <h3>Marcar ligação com a equipe T3jus</h3>
                  <p>A equipe faz junto com você, com o telefone desse número em mãos.</p>
                  <a className="btn btn-sec" href={MARCAR_LIGACAO}><Icone nome="agenda" className="ico" />Marcar a ligação</a>
                </div>
              </div>
            ) : null}
            <Nota icone="cadeado">Só <b>{quem}</b>, a sócia dona, liga, muda e desliga. Fica no histórico do escritório quem fez e quando.</Nota>
          </div>
        </section>
      </div>
      <aside className="wa-col" aria-label="Antes de ligar">
        <Folha id="t-muda" titulo="O que muda ao ligar" sub="Nada sai para cliente sem você revisar">
          <ListaX itens={[
            ["conversas", <><b>As conversas chegam em Conversas.</b> Quem escrever para o número aparece lá, para a equipe responder.</>],
            ["ia", <><b>A IA só responde depois que você ligar a IA</b>, em “Como a IA atende”. Dá para preparar antes.</>],
            ["whats", <><b>Os avisos automáticos</b> (lembrete, cobrança, etapa do caso) saem depois que a Meta aprovar cada texto. Costuma levar até 1 dia.</>],
            ["moeda", <><b>A Meta cobra pelos avisos que o escritório começa</b>, por mensagem, no cartão da conta da Meta do escritório. Responder ao cliente em até 24 horas da mensagem dele não é cobrado.</>],
          ]} />
        </Folha>
        <Folha id="t-app" titulo="Já usa o WhatsApp Business no celular?">
          <div className="wa-corpo">
            <p>Pode continuar. O mesmo número fica no app do celular e no T3jus. O que alguém responder pelo celular também aparece em Conversas, e a IA fica quieta naquela conversa.</p>
            <Nota icone="ajuda">Algumas funções do app ficam desligadas, como mensagens temporárias e listas de transmissão.</Nota>
          </div>
        </Folha>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------------------- assistente

const PASSOS_LIGAR: { nome: string; curto?: string }[] = [
  { nome: "Número" }, { nome: "Entrar com a Meta", curto: "Meta" }, { nome: "Nome que aparece", curto: "Nome" }, { nome: "Código" }, { nome: "Pronto" },
];

function NavPassos({ atual, subs, aoVoltar }: { atual: number; subs: string[]; aoVoltar: (n: number) => void }) {
  return (
    <nav aria-label="Passos para ligar o WhatsApp">
      <ol className="wa-passos">
        {PASSOS_LIGAR.map((p, i) => {
          const n = i + 1;
          const rot = p.curto ? <><span className="so-pc-i">{p.nome}</span><span className="so-cel">{p.curto}</span></> : p.nome;
          const sub = subs[i] ? <small>{subs[i]}</small> : null;
          if (n < atual) {
            return (
              <li key={n}>
                <a className="feito" href={hrefDe({ ligar: true })} onClick={(e) => { e.preventDefault(); aoVoltar(n); }}>
                  <span className="disco"><Icone nome="check" className="ico" /></span>
                  <span><strong>{rot}<span className="sr">, feito</span></strong>{sub}</span>
                </a>
              </li>
            );
          }
          return (
            <li key={n}>
              <span className="p" aria-current={n === atual ? "step" : undefined}>
                <span className="disco"><span>{n}</span></span>
                <span><strong>{rot}</strong>{sub}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const TEXTO_ERRO_NUMERO: Record<string, string> = {
  NUMERO_INVALIDO: "Confira o número: com DDD, como (11) 97405-2210. Pode ser chip ou fixo, desde que seja do escritório.",
  FIXO_SEM_SMS: "Número fixo não recebe SMS. Escolha “Por ligação de voz”: atenda o fixo do escritório e anote os 6 números.",
  CONFIRME_NUMERO_DO_ESCRITORIO: "Confirme que o número é do escritório, não o celular pessoal de alguém.",
};
const ROTULO_ERRO: Record<string, string> = { telefone: "Número", receberCodigo: "Código", confirmouNumero: "Número do escritório" };

function Assistente({ w, aoMudar }: { w: PaginaWhatsapp; aoMudar: (w: PaginaWhatsapp) => void }) {
  const r = w.rascunho;
  const [passo, setPasso] = useState(r && r.passo >= 2 ? 2 : 1);
  const [tel, setTel] = useState(r?.telefone ? telefoneBr(r.telefone) : "");
  const [codigo, setCodigo] = useState<"SMS" | "VOZ">(r?.receberCodigo ?? "SMS");
  const [app, setApp] = useState(r?.usaAppCelular ?? false);
  const [dono, setDono] = useState(r?.confirmouNumero ?? false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [semJanela, setSemJanela] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const raiz = useRef<HTMLFormElement>(null);

  async function continuar() {
    setEnviando(true);
    setErroGeral(null);
    const res = await chamarPortal<PaginaWhatsapp["rascunho"]>("/v1/escritorio/whatsapp/conferir-numero", {
      corpo: { telefone: tel, receberCodigo: codigo, usaAppCelular: app, confirmouNumero: dono },
    });
    setEnviando(false);
    if (!res.ok) {
      const motivos = (res.erro.detalhes?.motivos ?? null) as Record<string, string> | null;
      if (motivos) {
        setErros(motivos);
        focarPrimeiroErro(raiz.current);
        if (!motivos.telefone && !motivos.confirmouNumero) requestAnimationFrame(() => raiz.current?.querySelector<HTMLElement>('#n-receberCodigo input')?.focus());
      } else setErroGeral(textoDoErro(res.erro));
      return;
    }
    setErros({});
    aoMudar({ ...w, rascunho: res.dados });
    setPasso(2);
  }

  const subs = [r?.telefone && passo > 1 ? telefoneBr(r.telefone) : Object.keys(erros).length ? "Com ajuste" : "", "Janela da Meta", "Conferido pela Meta",
    codigo === "VOZ" ? "Por ligação" : "Por SMS", "Revisar a IA e os avisos"];
  const nErros = Object.keys(erros).length;

  const principal = passo === 1 ? (
    <section className="folha" aria-labelledby="t-ne" style={{ overflow: "hidden" }}>
      <div className="wa-passo-cab">
        <p className="sobretitulo">Passo 1 de 5 · Número</p>
        <h2 id="t-ne">Qual número os clientes vão usar?</h2>
      </div>
      <form className="wa-form" ref={raiz} noValidate onSubmit={(e) => { e.preventDefault(); void continuar(); }}>
        {nErros ? (
          <Aviso tom="urgencia" titulo={nErros === 1 ? "1 ponto para corrigir antes de continuar" : `${nErros} pontos para corrigir antes de continuar`}>
            {Object.keys(erros).map((k, i) => (
              <span key={k}>{i ? " · " : ""}<a href={`#n-${k}`}>{ROTULO_ERRO[k] ?? k}: {TEXTO_ERRO_NUMERO[erros[k]!]?.split(".")[0] ?? "confira"}</a></span>
            ))}
          </Aviso>
        ) : null}
        {erroGeral ? <Aviso tom="urgencia" titulo="Não deu para continuar">{erroGeral}</Aviso> : null}
        <div className="campo">
          <label htmlFor="n-telefone">Número do WhatsApp do escritório</label>
          <input className="entrada" id="n-telefone" name="telefone" type="tel" inputMode="tel" autoComplete="off" value={tel} data-foco
            onChange={(e) => setTel(e.target.value)} aria-invalid={erros.telefone ? true : undefined}
            aria-describedby={descritoPor("n-telefone-aj", erros.telefone && "n-telefone-er")} />
          <p className="ajuda" id="n-telefone-aj">Com DDD. Pode ser chip ou fixo, desde que seja do escritório.</p>
          {erros.telefone ? <ErroCampo id="n-telefone-er">{TEXTO_ERRO_NUMERO[erros.telefone]}</ErroCampo> : null}
        </div>
        <label className="opcao">
          <input className="marcar" type="checkbox" id="n-confirmouNumero" checked={dono} onChange={(e) => setDono(e.target.checked)}
            aria-invalid={erros.confirmouNumero ? true : undefined} aria-describedby={descritoPor(erros.confirmouNumero && "n-dono-er")} />
          <span>Confirmo que este número é do escritório, não o celular pessoal de alguém<small>Se a pessoa sair, o número continua com o escritório.</small></span>
        </label>
        {erros.confirmouNumero ? <ErroCampo id="n-dono-er">{TEXTO_ERRO_NUMERO[erros.confirmouNumero]}</ErroCampo> : null}
        <fieldset className="x-ops" id="n-receberCodigo" aria-describedby={descritoPor(erros.receberCodigo && "n-cod-er")}>
          <legend>Como receber o código da Meta</legend>
          <div className="x-ops-l">
            <label className="opcao">
              <input className="marcar" type="radio" name="n-cod" value="SMS" checked={codigo === "SMS"} onChange={() => setCodigo("SMS")} />
              <span>Por SMS<small>Só para celular</small></span>
            </label>
            <label className="opcao">
              <input className="marcar" type="radio" name="n-cod" value="VOZ" checked={codigo === "VOZ"} onChange={() => setCodigo("VOZ")} />
              <span>Por ligação de voz<small>A Meta liga e uma voz dita o código. Serve para fixo.</small></span>
            </label>
          </div>
          {erros.receberCodigo ? <ErroCampo id="n-cod-er">{TEXTO_ERRO_NUMERO[erros.receberCodigo]}</ErroCampo> : null}
        </fieldset>
        <fieldset className="x-ops">
          <legend>Este número já está no app WhatsApp Business de algum celular?</legend>
          <div className="x-ops-l">
            <label className="opcao">
              <input className="marcar" type="radio" name="n-app" value="nao" checked={!app} onChange={() => setApp(false)} />
              <span>Não<small>O número passa a ser usado só pelo T3jus.</small></span>
            </label>
            <label className="opcao">
              <input className="marcar" type="radio" name="n-app" value="sim" checked={app} onChange={() => setApp(true)} />
              <span>Sim, e quero continuar usando<small>O app continua no celular. O que for respondido por lá aparece em Conversas.</small></span>
            </label>
          </div>
        </fieldset>
        <div className="wa-acoes" style={{ padding: 0 }}>
          <a className="btn btn-sec" href={hrefDe({})}><Icone nome="esquerda" className="ico" />Voltar</a>
          <button className="btn btn-pri" type="submit" disabled={enviando}>{enviando ? "Conferindo…" : "Continuar"}<Icone nome="dir" className="ico" /></button>
        </div>
      </form>
    </section>
  ) : (
    <section className="folha" aria-labelledby="t-ps" style={{ overflow: "hidden" }}>
      <div className="wa-passo-cab">
        <p className="sobretitulo">Passo 2 de 5 · Entrar com a Meta</p>
        <h2 id="t-ps">Agora abrimos a janela da Meta</h2>
        <p>O WhatsApp é da Meta, a empresa do Facebook. Para o número ficar no nome do escritório, a Meta pede que você entre numa janela dela. Veja antes o que vai aparecer, em ordem:</p>
      </div>
      <div className="wa-corpo">
        <ol className="wa-meta">
          <li><span className="disco" aria-hidden="true"><span>a</span></span><span><b>Entrar com o Facebook.</b><small>Use a sua conta. Ela só serve para a Meta saber quem você é; nada aparece no seu perfil.</small></span></li>
          <li><span className="disco" aria-hidden="true"><span>b</span></span><span><b>Escolher ou criar o “portfólio empresarial”.</b><small>É o cadastro do escritório na Meta. Se ainda não tiver, crie com estes dados:</small>
            <span className="wa-copiar"><span>Nome: <b>{w.escritorio.nome}</b></span><span>País: <b>Brasil</b></span>{w.escritorio.cnpj ? <span>CNPJ: <b>{cnpjBr(w.escritorio.cnpj)}</b></span> : null}</span></span></li>
          <li><span className="disco" aria-hidden="true"><span>c</span></span><span><b>Escolher ou criar a conta do WhatsApp do escritório.</b><small>Se aparecer uma conta antiga, escolha a do escritório. Na dúvida, crie uma nova.</small></span></li>
          <li><span className="disco" aria-hidden="true"><span>d</span></span><span><b>Confirmar o número e o nome que aparece para o cliente.</b><small>O número já vai preenchido: <span className="num">{r?.telefone ? telefoneBr(r.telefone) : tel}</span>. O nome, você escolhe no próximo passo daqui.</small></span></li>
          <li><span className="disco" aria-hidden="true"><span>e</span></span><span><b>Permitir que o T3jus envie e receba mensagens por esse número.</b><small>É o que liga o número às Conversas. Você pode tirar essa permissão depois, na própria Meta, ou desligando aqui.</small></span></li>
        </ol>
      </div>
      {semJanela ? (
        <div className="wa-corpo" style={{ paddingTop: 0 }}>
          <Aviso tom="atencao" icone="janela" titulo="A janela da Meta ainda não abre por aqui"
            acoes={<a className="btn btn-pri" href={MARCAR_LIGACAO}><Icone nome="agenda" className="ico" />Marcar a ligação com a equipe T3jus</a>}>
            O T3jus ainda está terminando o cadastro de parceiro na Meta. Marque a ligação com a equipe T3jus: ela continua de onde você parou, com o número que você já informou.
          </Aviso>
        </div>
      ) : null}
      <div className="wa-acoes">
        <button className="btn btn-sec" type="button" onClick={() => setPasso(1)}><Icone nome="esquerda" className="ico" />Voltar</button>
        <button className="btn btn-pri" type="button" onClick={() => setSemJanela(true)}><Icone nome="janela" className="ico" />Abrir a janela da Meta</button>
        <Nota icone="ajuda">A janela abre por cima desta página. Se não abrir, permita janelas novas no navegador. Quando você terminar lá, esta página segue sozinha para o passo 3.</Nota>
      </div>
    </section>
  );

  return (
    <>
      <NavPassos atual={passo} subs={subs} aoVoltar={(n) => setPasso(n)} />
      <div className="wa-grade">
        <div className="wa-col">{principal}</div>
        <aside className="wa-col" aria-label="Resumo">
          {passo === 1 ? (
            <Folha id="t-qn" titulo="Que número usar?">
              <ListaX itens={[
                ["check", <><b>Melhor: um chip só do escritório</b>, num celular que fica no escritório.</>],
                ["check", <><b>Pode: o fixo do escritório.</b> O código chega por ligação de voz.</>],
                ["proibido", <><b>Evite o celular pessoal</b> de quem trabalha aqui. Se a pessoa sair, leva os clientes junto.</>],
                ["sincronia", <><b>Número em outro sistema?</b> O sistema antigo precisa soltar o número antes. Isso não apaga as conversas de lá.</>],
              ]} />
            </Folha>
          ) : null}
          <Folha id="t-res" titulo="O que você já informou" sub="Fica salvo: dá para parar e continuar depois" icone="escudo">
            <dl className="wa-resumo">
              <div><dt>Número</dt><dd className="num">{r?.telefone ? telefoneBr(r.telefone) : "Ainda não informado"}</dd></div>
              <div><dt>Receber o código por</dt><dd>{(r?.receberCodigo ?? codigo) === "VOZ" ? "Ligação de voz" : "SMS"}</dd></div>
              <div><dt>App WhatsApp Business no celular</dt><dd>{(r?.usaAppCelular ?? app) ? "Continua usando" : "Não usa"}</dd></div>
              <div><dt>Escritório</dt><dd>{w.escritorio.nome}{w.escritorio.cnpj ? <small>CNPJ {cnpjBr(w.escritorio.cnpj)}</small> : null}</dd></div>
            </dl>
            <div className="wa-corpo" style={{ paddingTop: 0 }}>
              <Nota icone="cracha">Travou em alguma tela? <a href={MARCAR_LIGACAO}>Marque a ligação com a equipe T3jus</a>: ela continua de onde você parou.</Nota>
            </div>
          </Folha>
          {passo === 2 ? (
            <Folha id="t-dm" titulo="Depois da janela">
              <Passos itens={[
                ["3", <><b>Nome que aparece.</b><small>Ex.: “{w.escritorio.nome}”. A Meta confere em 1 a 2 dias; até lá, aparece só o número.</small></>],
                ["4", <><b>Código.</b><small>Chega por SMS ou ligação. Se o número já está no app do celular, você confirma pelo próprio app.</small></>],
                ["5", <><b>Pronto.</b><small>O número liga. A IA e os avisos esperam a sua revisão.</small></>],
              ]} />
            </Folha>
          ) : null}
        </aside>
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------- número ligado

function CabNumero({ w }: { w: PaginaWhatsapp }) {
  const n = w.numero!;
  const sit = situacaoNumero(w);
  return (
    <div className="wa-num-cab">
      <span className="disco"><Icone nome="whats" className="ico" /></span>
      <div>
        <p className="sobretitulo">Número do escritório</p>
        <h2 id="t-num" className="num">{telefoneBr(n.numero)}</h2>
      </div>
      <div className="lado">
        {sit === "analise" ? <Selo tipo="atencao" icone="relogio">Esperando a Meta</Selo> : <Selo tipo="ativo" icone="check">Ligado</Selo>}
        <span>{n.ligadoEm ? `Ligado em ${quando(n.ligadoEm)}${n.ligadoPor ? ` por ${primeiro(n.ligadoPor.nome)}` : ""}` : ""}</span>
      </div>
    </div>
  );
}

function SituacaoAviso({ a }: { a: AvisoWhatsapp }) {
  const q = a.situacaoEm ? quando(a.situacaoEm) : "";
  if (a.situacao === "APROVADO") return <div className="wa-sit"><Selo tipo="ativo" icone="check">Aprovado</Selo><small>{q && `Aprovado em ${q}`}</small></div>;
  if (a.situacao === "EM_ANALISE") return <div className="wa-sit"><Selo tipo="atencao" icone="relogio">Em análise na Meta</Selo><small>{q && `Enviado em ${q} · costuma levar até 1 dia`}</small></div>;
  if (a.situacao === "RECUSADO") return <div className="wa-sit"><Selo tipo="urgente" icone="alerta">Recusado</Selo><small>{`Recusado${q ? ` em ${q}` : ""}. O aviso não sai até ajustar.`}</small></div>;
  return <div className="wa-sit"><Selo tipo="neutro">Não enviado</Selo><small>Vai para a Meta quando o número ligar.</small></div>;
}

function TabelaAvisos({ w }: { w: PaginaWhatsapp }) {
  const acao = (a: AvisoWhatsapp, compacto: boolean) =>
    a.situacao === "RECUSADO" && w.dono ? (
      <a className={`btn btn-sec${compacto ? " btn-compacto" : ""}`} href={hrefDe({ aviso: a.chave })}>
        <Icone nome="lapis" className="ico" />Ajustar o texto<span className="sr">: {AVISOS_WHATSAPP[a.chave].nome}</span>
      </a>
    ) : null;
  const mod = (a: AvisoWhatsapp) => {
    const m = AVISOS_WHATSAPP[a.chave];
    return <div className="wa-mod"><Icone nome={m.icone} className="ico" /><div><strong>{m.nome}</strong><small>{m.quando}</small></div></div>;
  };
  return (
    <>
      <table className="so-pc wa-tab">
        <caption className="sr">Avisos automáticos e a situação na Meta</caption>
        <colgroup><col style={{ width: "46%" }} /><col style={{ width: "34%" }} /><col style={{ width: "20%" }} /></colgroup>
        <thead><tr><th scope="col">Aviso</th><th scope="col">Situação na Meta</th><th scope="col"><span className="sr">Ação</span></th></tr></thead>
        <tbody>
          {w.avisos.map((a) => (
            <tr key={a.chave} className={a.situacao === "RECUSADO" ? "recusado" : undefined}>
              <td>{mod(a)}</td><td><SituacaoAviso a={a} /></td><td>{acao(a, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="cartoes so-cel" aria-label="Avisos automáticos">
        {w.avisos.map((a) => (
          <li key={a.chave} className="cartao" style={a.situacao === "RECUSADO" ? { boxShadow: "inset 3px 0 0 var(--vinho-3)" } : undefined}>
            {mod(a)}<SituacaoAviso a={a} />{acao(a, false) ? <div className="c-acoes">{acao(a, false)}</div> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

const VERIFICACAO: Record<string, { tipo: "neutro" | "atencao" | "ativo" | "urgente"; txt: string; p: string }> = {
  NAO_ENVIADA: { tipo: "neutro", txt: "Não enviada", p: "Com o CNPJ, a Meta confirma o escritório. Isso aumenta o limite de conversas por dia." },
  EM_ANALISE: { tipo: "atencao", txt: "Em análise", p: "CNPJ enviado. A Meta costuma responder em alguns dias úteis." },
  VERIFICADA: { tipo: "ativo", txt: "Confirmada", p: "A Meta confirmou o escritório." },
  RECUSADA: { tipo: "urgente", txt: "Recusada", p: "A Meta não confirmou a empresa. A equipe T3jus ajuda a reenviar." },
};

function Saude({ w }: { w: PaginaWhatsapp }) {
  const n = w.numero!;
  const v = VERIFICACAO[n.empresaVerificada]!;
  const pct = n.limiteDia ? Math.min(100, (n.usadasHoje / n.limiteDia) * 100) : 0;
  const boa = n.qualidade === "ALTA";
  return (
    <ul className="wa-saude" aria-label="Saúde do número">
      <li className="wa-ind"><span className="ic"><Icone nome="selo" className="ico" /></span><div><p className="dt">Nome que o cliente vê</p><div className="dd">
        <span className="val">{n.nomeExibicao ?? telefoneBr(n.numero)}</span>
        <p>{n.nomeSituacao === "APROVADO" ? "Conferido pela Meta." : n.nomeSituacao === "RECUSADO" ? "A Meta não aprovou o nome. Até ajustar, o cliente vê só o número." : "A Meta está conferindo. Até lá, o cliente vê só o número."}</p>
      </div></div></li>
      <li className="wa-ind"><span className="ic"><Icone nome="medidor" className="ico" /></span><div><p className="dt">Qualidade, segundo a Meta</p><div className="dd">
        <span className="val">{QUALIDADES[n.qualidade]} {n.qualidade === "SEM_NOTA" ? null : boa ? <Selo tipo="ativo" icone="check">Boa</Selo> : <Selo tipo="urgente" icone="alerta">Atenção</Selo>}</span>
        <p>{boa ? "Quase ninguém bloqueou ou denunciou as mensagens. " : ""}Se cair para média ou baixa, avisamos no sino: o limite por dia pode baixar.</p>
      </div></div></li>
      <li className="wa-ind"><span className="ic"><Icone nome="whats" className="ico" /></span><div><p className="dt">Limite de conversas que o escritório começa, por dia</p><div className="dd">
        <span className="val num">{n.limiteDia ? `${n.usadasHoje} de ${n.limiteDia} hoje` : "A Meta ainda não informou"}</span>
        {n.limiteDia ? <div className="wa-medida" role="img" aria-label={`${n.usadasHoje} de ${n.limiteDia} usadas hoje`}><span style={{ width: `${pct}%` }} /></div> : null}
        <p>Responder a cliente não conta. O limite sobe quando a Meta confirmar a empresa e a qualidade continuar boa.</p>
      </div></div></li>
      <li className="wa-ind"><span className="ic"><Icone nome="coluna" className="ico" /></span><div><p className="dt">Empresa confirmada na Meta</p><div className="dd">
        <span className="val"><Selo tipo={v.tipo} icone={v.tipo === "ativo" ? "check" : v.tipo === "atencao" ? "relogio" : undefined}>{v.txt}</Selo></span>
        <p>{v.p}</p>
      </div></div></li>
    </ul>
  );
}

function textoEvento(h: EventoWhatsapp): ReactNode {
  const quem = h.pessoa ? <b>{primeiro(h.pessoa.nome)}</b> : null;
  const d = h.detalhe as Record<string, string | undefined>;
  const aviso = d.chave && d.chave in AVISOS_WHATSAPP ? `“${AVISOS_WHATSAPP[d.chave as ChaveAviso].nome}”` : "um aviso";
  switch (h.tipo) {
    case "LIGADO": return <>{quem} ligou o número <span className="num">{d.numero ? telefoneBr(d.numero) : ""}</span>.</>;
    case "DESLIGADO": return <>{quem} desligou o WhatsApp.</>;
    case "NOME": return d.situacao === "APROVADO" ? <>A Meta aprovou o nome{d.nome ? <> <b>{d.nome}</b></> : null}.</> : d.situacao === "RECUSADO" ? <>A Meta recusou o nome.</> : <>O nome foi para a Meta conferir.</>;
    case "QUALIDADE": return <>A qualidade, segundo a Meta, passou para <b>{QUALIDADES[(d.situacao ?? "SEM_NOTA") as keyof typeof QUALIDADES]}</b>.</>;
    case "LIMITE": return <>O limite por dia passou para <b>{d.limite}</b> conversas.</>;
    case "VERIFICACAO": return <>Empresa na Meta: <b>{VERIFICACAO[d.situacao ?? "NAO_ENVIADA"]?.txt.toLowerCase()}</b>.</>;
    case "AVISO":
      if (quem) return <>{quem} aprovou o texto de {aviso} e mandou à Meta.</>;
      return d.situacao === "APROVADO" ? <>A Meta aprovou {aviso}.</> : d.situacao === "RECUSADO" ? <>A Meta recusou {aviso}.</> : <>{aviso} foi para a análise da Meta.</>;
  }
}

function Historico({ itens, vazio }: { itens: { em: string; texto: ReactNode }[]; vazio: string }) {
  return itens.length ? (
    <ul className="wa-hist">
      {itens.map((h, i) => <li key={i}><time dateTime={h.em}>{quando(h.em)}</time><span>{h.texto}</span></li>)}
    </ul>
  ) : <div className="wa-corpo"><p>{vazio}</p></div>;
}

function LadoLigado({ w, aoDesligar }: { w: PaginaWhatsapp; aoDesligar: () => void }) {
  const n = w.numero!;
  return (
    <>
      <Folha id="t-conta" titulo={w.dono ? "Conta e pagamento" : "Conta na Meta"} icone="escudo">
        <dl className="wa-resumo">
          <div><dt>Conta na Meta</dt><dd>{w.escritorio.nome}<small>Portfólio empresarial do escritório</small></dd></div>
          <div><dt>App WhatsApp Business no celular</dt><dd>{n.usaAppCelular ? "Continua no celular" : "Não usa"}{n.usaAppCelular ? <small>O que for respondido por lá aparece em Conversas</small> : null}</dd></div>
          {w.dono ? (
            <div><dt>Pagamento à Meta</dt><dd>Cartão na conta da Meta do escritório<small>Este mês: {n.avisosEntreguesMes ?? 0} avisos entregues. O valor sai na fatura da Meta, não na do T3jus.</small></dd></div>
          ) : null}
        </dl>
        {w.dono ? (
          <div className="wa-btns">
            <a className="btn btn-sec" href={MARCAR_LIGACAO}><Icone nome="trocar" className="ico" />Trocar o número</a>
            <button className="btn btn-perigo" type="button" onClick={aoDesligar}><Icone nome="ligar" className="ico" />Desligar o WhatsApp</button>
            <Nota icone="cadeado">Só a sócia dona troca e desliga. Nada é apagado. Para trocar o número, a equipe T3jus faz junto com você.</Nota>
          </div>
        ) : (
          <div className="wa-corpo" style={{ paddingTop: 0 }}>
            <Nota icone="cadeado">Quem cuida: <b>{w.quemCuida?.nome ?? "a sócia dona"}</b>, a sócia dona. Só ela troca o número ou desliga.</Nota>
          </div>
        )}
      </Folha>
      <Folha id="t-hist" titulo="Histórico do número" sub="Nada é apagado" icone="historico">
        <Historico itens={w.historico.map((h) => ({ em: h.em, texto: textoEvento(h) }))} vazio="Nada ainda." />
      </Folha>
    </>
  );
}

function NumeroLigado({ w, aoDesligar }: { w: PaginaWhatsapp; aoDesligar: () => void }) {
  const sit = situacaoNumero(w);
  const recusados = w.avisos.filter((a) => a.situacao === "RECUSADO");
  const emAnalise = w.avisos.filter((a) => a.situacao !== "APROVADO").length;
  return (
    <>
      {recusados.length && w.dono ? (
        <Aviso tom="urgencia" titulo={`A Meta recusou o texto de “${AVISOS_WHATSAPP[recusados[0]!.chave].nome}”`}
          acoes={<a className="btn btn-pri" href={hrefDe({ aviso: recusados[0]!.chave })}><Icone nome="lapis" className="ico" />Ajustar o texto</a>}>
          Até ajustar, esse aviso não sai. Os outros avisos seguem saindo.
        </Aviso>
      ) : null}
      <div className="wa-grade">
        <div className="wa-col">
          <section className="folha" aria-labelledby="t-num" style={{ overflow: "hidden" }}>
            <CabNumero w={w} />
            {sit === "analise" ? (
              <div className="wa-duas">
                <section aria-labelledby="t-ja">
                  <h3 id="t-ja"><Icone nome="check" className="ico" />Já funciona</h3>
                  <ul className="cv-lista-x" style={{ padding: 0 }}>
                    <li><Icone nome="conversas" className="ico" /><span><b>Receber e responder clientes.</b> As mensagens chegam em Conversas. Responder é livre até 24 horas depois da última mensagem do cliente.</span></li>
                    {w.numero!.usaAppCelular ? <li><Icone nome="celular" className="ico" /><span><b>O app no celular continua.</b> O que alguém responder por lá aparece em Conversas.</span></li> : null}
                  </ul>
                </section>
                <section aria-labelledby="t-esp">
                  <h3 id="t-esp"><Icone nome="relogio" className="ico" />Espera a Meta</h3>
                  <ul className="cv-lista-x" style={{ padding: 0 }}>
                    <li><Icone nome="selo" className="ico" /><span><b>O nome{w.numero!.nomeExibicao ? ` “${w.numero!.nomeExibicao}”` : ""}.</b> Até a Meta conferir, o cliente vê só o número.</span></li>
                    <li><Icone nome="whats" className="ico" /><span><b>{emAnalise} dos {w.avisos.length} avisos automáticos.</b> Avisos que o escritório começa só saem com o texto aprovado pela Meta.</span></li>
                  </ul>
                </section>
              </div>
            ) : <Saude w={w} />}
          </section>
          <Folha id="t-mod" titulo="Avisos automáticos na Meta" icone="whats"
            sub={sit === "analise" ? "Cada texto que o escritório começa passa pela Meta antes de sair" : "Só saem com o texto aprovado pela Meta. Recusado volta com o motivo."}>
            <TabelaAvisos w={w} />
          </Folha>
        </div>
        <aside className="wa-col" aria-label={sit === "analise" ? "Próximos passos" : "Conta e histórico"}>
          {sit === "analise" ? (
            <Folha id="t-prox" titulo="O que fazer agora" sub="Enquanto a Meta confere">
              <Passos itens={[
                ["1", <><b>Prepare a IA.</b><small>Em “Como a IA atende”, revise como ela se apresenta.</small><a className="btn btn-sec" href={hrefDe({ parte: "ia" })} style={{ marginTop: 8 }}><Icone nome="ia" className="ico" />Preparar a IA</a></>],
                ["2", <><b>Confirme a empresa na Meta.</b><small>Com o CNPJ, a Meta confirma o escritório. Isso aumenta o limite de conversas por dia.</small></>],
                ["3", <><b>Espere o aviso no sino.</b><small>Avisamos quando o nome e cada aviso forem aprovados ou recusados.</small></>],
              ]} />
            </Folha>
          ) : null}
          <LadoLigado w={w} aoDesligar={aoDesligar} />
        </aside>
      </div>
    </>
  );
}

function JanelaDesligar({ w, aberta, aoFechar, aoFeito }: { w: PaginaWhatsapp; aberta: boolean; aoFechar: () => void; aoFeito: (w: PaginaWhatsapp) => void }) {
  const [motivo, setMotivo] = useState("");
  const [entendi, setEntendi] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function desligar() {
    const faltam = [...(motivo.trim().length < 3 ? ["motivo"] : []), ...(entendi ? [] : ["entendi"])];
    setErros(faltam);
    if (faltam.length) return;
    setEnviando(true);
    const r = await chamarPortal<PaginaWhatsapp>("/v1/escritorio/whatsapp/desligar", { corpo: { versao: w.numero!.versao, motivo, entendi } });
    setEnviando(false);
    if (!r.ok) { setErro(textoDoErro(r.erro)); return; }
    aoFeito(r.dados);
  }
  return (
    <Janela id="janela-desligar" aberta={aberta} aoFechar={aoFechar} alerta sobretitulo={`Número ${telefoneBr(w.numero!.numero)}`}
      titulo="Desligar o WhatsApp do escritório?" descricao="janela-desligar-d" aoEnviar={() => void desligar()}
      pe={<>
        <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
        <button className="btn btn-perigo" type="submit" disabled={enviando}><Icone nome="ligar" className="ico" />Desligar o WhatsApp</button>
      </>}>
      <p id="janela-desligar-d" className="sr">Leia o que acontece antes de confirmar.</p>
      {erro ? <Aviso tom="urgencia" titulo="Não deu para desligar">{erro}</Aviso> : null}
      <ul className="cv-lista-x" style={{ padding: 0 }}>
        <li><Icone nome="pausa" className="ico" /><span><b>Os avisos automáticos param agora.</b> Lembretes, cobranças e etapas ficam como “não enviados”, para a equipe avisar por conta própria.</span></li>
        <li><Icone nome="ia" className="ico" /><span><b>A IA para de responder.</b></span></li>
        <li><Icone nome="conversas" className="ico" /><span><b>Mensagens novas não chegam mais ao T3jus.</b> Se o app estiver no celular, chegam só lá.</span></li>
        <li><Icone nome="historico" className="ico" /><span><b>Nada é apagado.</b> Conversas, avisos enviados e histórico ficam guardados. O número continua do escritório, na conta da Meta, e dá para ligar de novo.</span></li>
      </ul>
      <div className="campo">
        <label htmlFor="dl-motivo">Motivo</label>
        <textarea className="entrada" id="dl-motivo" data-foco value={motivo} maxLength={600} onChange={(e) => setMotivo(e.target.value)}
          aria-invalid={erros.includes("motivo") || undefined} aria-describedby={descritoPor("dl-motivo-aj", erros.includes("motivo") && "dl-motivo-er")} />
        <p className="ajuda" id="dl-motivo-aj">Obrigatório. Fica no histórico do escritório, com o seu nome e a hora.</p>
        {erros.includes("motivo") ? <ErroCampo id="dl-motivo-er">Escreva o motivo.</ErroCampo> : null}
      </div>
      <label className="opcao">
        <input className="marcar" type="checkbox" checked={entendi} onChange={(e) => setEntendi(e.target.checked)}
          aria-invalid={erros.includes("entendi") || undefined} aria-describedby={descritoPor(erros.includes("entendi") && "dl-ok-er")} />
        <span>Entendi que os avisos aos clientes param agora</span>
      </label>
      {erros.includes("entendi") ? <ErroCampo id="dl-ok-er">Confirme que entendeu.</ErroCampo> : null}
    </Janela>
  );
}

function AjustarAviso({ w, chave, aoFeito }: { w: PaginaWhatsapp; chave: ChaveAviso; aoFeito: (w: PaginaWhatsapp) => void }) {
  const a = w.avisos.find((x) => x.chave === chave);
  const m = AVISOS_WHATSAPP[chave];
  const [texto, setTexto] = useState(a?.texto ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!a) return <Estado icone="whats" moldura titulo="Aviso não encontrado">Volte para a lista de avisos.</Estado>;
  const valido = textoAvisoValido(texto);
  async function aprovar() {
    if (!valido) { setErro("A Meta pede que o texto não comece nem termine com um campo entre chaves."); return; }
    setEnviando(true);
    const r = await chamarPortal<PaginaWhatsapp>(`/v1/escritorio/whatsapp/avisos/${chave}`, { corpo: { versao: a!.versao, texto } });
    setEnviando(false);
    if (!r.ok) { setErro(textoDoErro(r.erro)); return; }
    aoFeito(r.dados);
  }
  return (
    <>
      {a.situacao === "RECUSADO" ? <Aviso tom="urgencia" titulo="Este aviso não sai até o texto ser aprovado">Os outros avisos seguem saindo normalmente.</Aviso> : null}
      <div className="wa-grade">
        <div className="wa-col">
          <Folha id="t-mr" titulo={`Ajustar o texto: ${m.nome}`} sub={`Aviso ${m.quando.replace(" · ", " · ")}`} icone="lapis">
            <div className="wa-corpo">
              {a.motivoSimples ? <Aviso tom="urgencia" titulo="Motivo da Meta, em palavras simples">{a.motivoSimples}</Aviso> : null}
              {a.sugestaoIa ? (
                <div className="wa-sug" role="group" aria-labelledby="t-sug">
                  <div className="cab"><Selo tipo="implant" icone="ia">Sugerido pela IA</Selo><strong id="t-sug" className="wa-rot">Texto ajustado para a regra da Meta</strong></div>
                  <p>{a.sugestaoIa}</p>
                  <div className="bts"><button className="btn btn-sec" type="button" onClick={() => setTexto(a.sugestaoIa!)}><Icone nome="check" className="ico" />Usar esta sugestão</button></div>
                  <Nota icone="escudo">Sugestão não vale até você aprovar. A IA não envia nada.</Nota>
                </div>
              ) : null}
              <div className="campo">
                <div className="campo-linha"><label htmlFor="mr-txt">Texto do aviso</label><span className="contador" id="mr-cont">{texto.length} de 1.024 caracteres</span></div>
                <textarea className="entrada" id="mr-txt" style={{ minHeight: 110 }} maxLength={1024} value={texto} data-foco onChange={(e) => { setTexto(e.target.value); setErro(null); }}
                  aria-invalid={erro ? true : undefined} aria-describedby={descritoPor("mr-cont", "mr-aj", erro && "mr-er")} />
                <p className="ajuda" id="mr-aj">Os campos entre chaves trocam pelo dado de cada cliente; sem ameaça nem exposição (CDC, art. 42).</p>
                {erro ? <ErroCampo id="mr-er">{erro}</ErroCampo> : null}
              </div>
              <div className="wa-acoes" style={{ padding: 0 }}>
                <a className="btn btn-sec" href={hrefDe({})}>Cancelar</a>
                <button className="btn btn-pri" type="button" disabled={enviando} onClick={() => void aprovar()}><Icone nome="check" className="ico" />Aprovar o texto e mandar à Meta</button>
                <Nota icone="cadeado">Só a sócia dona aprova texto. Fica no histórico quem aprovou e quando.</Nota>
              </div>
            </div>
          </Folha>
        </div>
        <aside className="wa-col" aria-label="Prévia e o que acontece">
          <Folha id="t-pv" titulo="Como o cliente veria" sub="Com os campos ainda entre chaves">
            <div className="wa-corpo">
              <div className="wa-prev" aria-label="Prévia da mensagem">
                <div className="b"><span className="de"><Icone nome="whats" className="ico" />{w.numero?.nomeExibicao ?? w.escritorio.nome}</span>{texto}</div>
                <small>Prévia. Nada foi enviado.</small>
              </div>
            </div>
          </Folha>
          <Folha id="t-dep" titulo="Depois de aprovar">
            <Passos itens={[
              ["1", <><b>Vai para a Meta.</b><small>Costuma responder em minutos; às vezes, até 1 dia.</small></>],
              ["2", <><b>Aprovado, volta a sair sozinho.</b><small>Você recebe um aviso no sino.</small></>],
              ["3", <><b>Recusado de novo, volta para cá</b> com o motivo.<small>A versão antiga fica no histórico.</small></>],
            ]} />
          </Folha>
        </aside>
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------- IA

function NavIa({ atual, ia }: { atual: SecaoIa | null; ia: PaginaIa }) {
  const subs: Record<SecaoIa, string> = {
    apresentacao: `${ia.config.assuntos.length} de 6 assuntos`,
    passar: `7 casos${ia.config.palavras.length ? ` e ${ia.config.palavras.length} palavras` : " e quando não sabe"}`,
    saber: ia.respostas.length === 1 ? "1 resposta" : `${ia.respostas.length} respostas`,
    testar: ia.situacao === "LIGADA" ? "Continua aberto" : "Nada é enviado",
  };
  return (
    <nav aria-label="Partes da IA">
      <ol className="wa-ia-nav">
        {SECOES_IA.map((s) => (
          <li key={s.chave}>
            <a href={hrefDe({ parte: "ia", ia: s.chave })} aria-current={s.chave === atual ? "page" : undefined}>
              <Icone nome={s.icone} className="ico" /><span><strong>{s.nome}</strong><small>{subs[s.chave]}</small></span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function FaixaIa({ ia, aoLigar, aoPausar, pausando }: { ia: PaginaIa; aoLigar: () => void; aoPausar: () => void; pausando: boolean }) {
  if (ia.situacao === "LIGADA") {
    return (
      <div className="wa-ia-faixa ligada" role="status">
        <span className="disco"><Icone nome="ia" className="ico" /></span>
        <div className="txt">
          <strong>A IA está ligada</strong>
          <small>Desde {quando(ia.ligadaEm)}{ia.ligadaPor ? `, por ${primeiro(ia.ligadaPor.nome)}` : ""}. Pausar manda as conversas direto para a equipe, pela regra de responsável; volta quando você quiser.</small>
        </div>
        {ia.dono ? <div className="bts"><button className="btn btn-sec" type="button" onClick={aoPausar} disabled={pausando}><Icone nome="pausa" className="ico" />Pausar a IA agora</button></div> : null}
      </div>
    );
  }
  const pausada = ia.situacao === "PAUSADA";
  return (
    <div className="wa-ia-faixa">
      <span className="disco"><Icone nome="ia" className="ico" /></span>
      <div className="txt">
        <strong>{pausada ? "A IA está pausada" : "A IA ainda está desligada"}</strong>
        <small>{pausada ? `Pausada em ${quando(ia.pausadaEm)}${ia.pausadaPor ? ` por ${primeiro(ia.pausadaPor.nome)}` : ""}. ` : "Prepare e teste à vontade: nada é enviado. "}Enquanto estiver {pausada ? "pausada" : "desligada"}, toda conversa vai direto para a equipe.</small>
      </div>
      {ia.dono ? (
        <div className="bts">
          <a className="btn btn-sec" href={hrefDe({ parte: "ia", ia: "testar" })}><Icone nome="olho" className="ico" />Testar sem enviar</a>
          <button className="btn btn-pri" type="button" onClick={aoLigar}><Icone nome="ligar" className="ico" />{pausada ? "Ligar de novo" : "Ligar a IA"}</button>
        </div>
      ) : null}
    </div>
  );
}

function Nunca() {
  return (
    <>
      <ul className="wa-nunca">
        <li><Icone nome="proibido" className="ico" /><span><b>Opinião jurídica ou chance de ganhar.</b><small>“Acho que vamos ganhar” nunca. Passa para quem cuida do caso.</small></span></li>
        <li><Icone nome="proibido" className="ico" /><span><b>Negociar honorários ou desconto.</b><small>Passa para a sócia dona ou para o Financeiro.</small></span></li>
        <li><Icone nome="proibido" className="ico" /><span><b>Falar de outro cliente.</b><small>Nem confirmar se alguém é cliente do escritório.</small></span></li>
        <li><Icone nome="proibido" className="ico" /><span><b>Prometer prazo.</b><small>Diz o que está registrado e que uma pessoa confirma.</small></span></li>
      </ul>
      <p className="wa-fixo"><Icone nome="cadeado" className="ico" /><span><b>Fixo no T3jus, não desliga.</b> Vale para todo escritório: protege o cliente e o sigilo profissional.</span></p>
    </>
  );
}

function Salvar({ salvando, aoSalvar }: { salvando: boolean; aoSalvar: () => void }) {
  return (
    <div className="wa-acoes" style={{ padding: 0 }}>
      <button className="btn btn-pri" type="button" onClick={aoSalvar} disabled={salvando}><Icone nome="check" className="ico" />{salvando ? "Salvando…" : "Salvar"}</button>
      <Nota icone="historico">Cada mudança fica no histórico, com quem mudou e quando. Vale na próxima mensagem.</Nota>
    </div>
  );
}

type Rascunho = ConfigIa;
type AoSalvar = (mudou: Partial<ConfigIa>) => Promise<string[] | null>;

function IaApresentacao({ ia, aoSalvar }: { ia: PaginaIa; aoSalvar: AoSalvar }) {
  const [c, setC] = useState<Rascunho>(ia.config);
  const [erros, setErros] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const ro = !ia.dono;
  const nomeErrado = !/^assistente virtual/i.test(c.nome.trim());
  async function salvar() {
    if (nomeErrado) { setErros(["nome"]); return; }
    setSalvando(true);
    const e = await aoSalvar({ nome: c.nome, apresentacao: c.apresentacao, tom: c.tom, assuntos: c.assuntos });
    setSalvando(false);
    setErros(e ?? []);
  }
  const marcarAssunto = (a: AssuntoIa, sim: boolean) => setC({ ...c, assuntos: sim ? [...c.assuntos, a] : c.assuntos.filter((x) => x !== a) });
  return (
    <div className="wa-grade">
      <div className="wa-col">
        <Folha id="t-ap" titulo="Como ela se apresenta" sub="Sempre diz que é assistente virtual" icone="ia">
          <div className="wa-form">
            <div className="campo">
              <label htmlFor="ia-nome">Nome da assistente</label>
              <input className="entrada" id="ia-nome" value={c.nome} maxLength={80} readOnly={ro} onChange={(e) => setC({ ...c, nome: e.target.value })}
                aria-invalid={erros.includes("nome") || undefined} aria-describedby={descritoPor("ia-nome-aj", erros.includes("nome") && "ia-nome-er")} />
              <p className="ajuda" id="ia-nome-aj">Sempre começa com “Assistente virtual”. A IA nunca finge ser uma pessoa.</p>
              {erros.includes("nome") ? <ErroCampo id="ia-nome-er">O nome precisa começar com “Assistente virtual”.</ErroCampo> : null}
            </div>
            <div className="campo">
              <div className="campo-linha"><label htmlFor="ia-ola">Como ela se apresenta na primeira mensagem</label><span className="contador" aria-hidden="true">{c.apresentacao.length} de 300</span></div>
              <textarea className="entrada" id="ia-ola" value={c.apresentacao} maxLength={300} readOnly={ro} onChange={(e) => setC({ ...c, apresentacao: e.target.value })}
                aria-invalid={erros.includes("apresentacao") || undefined} aria-describedby={descritoPor("ia-ola-aj", erros.includes("apresentacao") && "ia-ola-er")} />
              <p className="ajuda" id="ia-ola-aj">Ela se apresenta assim a cada conversa nova e sempre que alguém perguntar “é robô?”.</p>
              {erros.includes("apresentacao") ? <ErroCampo id="ia-ola-er">Escreva de 10 a 300 caracteres.</ErroCampo> : null}
            </div>
            <fieldset className="x-ops wa-tres">
              <legend>Tom</legend>
              <div className="x-ops-l">
                {(Object.keys(TONS_IA) as TomIa[]).map((t) => (
                  <label key={t} className="opcao">
                    <input className="marcar" type="radio" name="ia-tom" value={t} checked={c.tom === t} disabled={ro} onChange={() => setC({ ...c, tom: t })} />
                    <span>{TONS_IA[t].nome}<small>{TONS_IA[t].ex}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Folha>
        <Folha id="t-pode" titulo="O que ela pode responder" sub="Só sobre o cliente que está escrevendo" icone="check">
          <div className="wa-pode" role="group" aria-labelledby="t-pode">
            {(Object.keys(ASSUNTOS_IA) as AssuntoIa[]).map((a) => (
              <label key={a} className="opcao">
                <input className="marcar" type="checkbox" checked={c.assuntos.includes(a)} disabled={ro} onChange={(e) => marcarAssunto(a, e.target.checked)} />
                <span><b>{ASSUNTOS_IA[a].nome}</b>{ASSUNTOS_IA[a].extra}<small>{ASSUNTOS_IA[a].de}</small></span>
              </label>
            ))}
          </div>
        </Folha>
        <Folha id="t-nunca" titulo="O que ela nunca faz" icone="proibido"><Nunca /></Folha>
        <Folha id="t-quem" titulo="Quem pode falar com a IA" sub="Só os números que estão na ficha do cliente" icone="pessoas">
          <ul className="wa-quem">
            <li><span className="av-p forte" aria-hidden="true">CP</span><span><b>Contato principal da ficha</b><small>Recebe tudo o que está marcado acima.</small></span></li>
            <li><span className="av-p" aria-hidden="true">CA</span><span><b>Contatos autorizados na ficha</b><small>Ex.: a filha de uma cliente, cadastrada na ficha. Recebe o mesmo, porque a ficha autoriza.</small></span></li>
            <li className="novo"><span className="av-p" aria-hidden="true">?</span><span><b>Número que não está em nenhuma ficha</b><small>É contato novo. A IA se apresenta, pergunta nome e assunto, não fala de nenhum caso e passa para o Comercial{ia.comercial ? ` (${ia.comercial.nome})` : ""}.</small></span></li>
          </ul>
          <p className="wa-fixo"><Icone nome="escudo" className="ico" /><span><b>Dado sensível fica só na conversa.</b> Se o cliente contar algo de saúde, por exemplo, a IA não copia para a ficha nem para resumo (LGPD).</span></p>
        </Folha>
        {ro ? null : <Salvar salvando={salvando} aoSalvar={() => void salvar()} />}
      </div>
      <aside className="wa-col" aria-label="Prévia">
        <Folha id="t-prev" titulo="Como o cliente vê" sub="A primeira mensagem de uma conversa nova">
          <ol className="cv-msgs" aria-label="Prévia da conversa" style={{ background: "var(--sal-2)" }}>
            <li className="cv-m cli"><div className="cv-b"><span className="de">Cliente</span>Bom dia, tem novidade do meu processo?</div></li>
            <li className="cv-m ia"><div className="cv-b"><span className="de"><Icone nome="ia" className="ico" />IA do escritório</span>{c.apresentacao}</div></li>
          </ol>
          <Nota icone="ajuda" estilo={{ padding: "12px 24px 18px" }}>No T3jus, a resposta da IA aparece em âmbar claro com “IA do escritório”, como em Conversas.</Nota>
        </Folha>
      </aside>
    </div>
  );
}

const hhmm = (t: string) => t.replace(/^0/, "").replace(":00", "h").replace(":", "h");

function IaPassar({ ia, aoSalvar }: { ia: PaginaIa; aoSalvar: AoSalvar }) {
  const [c, setC] = useState<Rascunho>(ia.config);
  const [nova, setNova] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const ro = !ia.dono;
  async function salvar() {
    setSalvando(true);
    let tel: string | null = null;
    if (c.telefoneUrgencia && c.telefoneUrgencia.trim()) tel = telefoneE164(c.telefoneUrgencia);
    const e = await aoSalvar({ palavras: c.palavras, dias: c.dias, horaInicio: c.horaInicio, horaFim: c.horaFim, msgForaHorario: c.msgForaHorario, telefoneUrgencia: tel });
    setSalvando(false);
    setErros(e ?? []);
  }
  function acrescentar() {
    const p = nova.trim().toLowerCase();
    if (!p || c.palavras.includes(p)) { setNova(""); return; }
    setC({ ...c, palavras: [...c.palavras, p].sort((a, b) => a.localeCompare(b, "pt-BR")) });
    setNova("");
  }
  const quem = ia.quemCuida?.nome ?? "a sócia dona";
  return (
    <div className="wa-grade">
      <div className="wa-col">
        <Folha id="t-sempre" titulo="Sempre passa para uma pessoa" icone="mao">
          <ul className="wa-sempre">
            <li><Icone nome="pessoas" className="ico" /><span><b>Pediu para falar com advogado</b> ou com uma pessoa.</span></li>
            <li><Icone nome="alerta" className="ico" /><span><b>Reclamação.</b><small>Insatisfação com o escritório ou com o atendimento.</small></span></li>
            <li><Icone nome="relogio" className="ico" /><span><b>Urgência.</b><small>Prisão, liminar, audiência hoje, oficial de justiça na porta.</small></span></li>
            <li><Icone nome="mao" className="ico" /><span><b>Proposta de acordo.</b></span></li>
            <li><Icone nome="doc" className="ico" /><span><b>Documento novo.</b><small>Alguém precisa conferir.</small></span></li>
            <li><Icone nome="pessoa-mais" className="ico" /><span><b>Contato novo.</b><small>Número que não está em ficha: vai para o Comercial.</small></span></li>
            <li><Icone nome="ajuda" className="ico" /><span><b>Quando não sabe.</b><small>Se a resposta não está no T3jus nem nas respostas do escritório.</small></span></li>
          </ul>
          <p className="wa-fixo"><Icone nome="cadeado" className="ico" /><span><b>Fixo no T3jus.</b> O escritório pode acrescentar casos, não tirar.</span></p>
        </Folha>
        <Folha id="t-pal" titulo="Palavras do escritório" sub="Se o cliente escrever uma destas, a IA passa para uma pessoa" icone="lapis">
          <div className="wa-form">
            {c.palavras.length ? (
              <ul className="wa-palavras" aria-label="Palavras que fazem a IA passar">
                {c.palavras.map((p) => (
                  <li key={p}>{p}{ro ? null : <button type="button" aria-label={`Tirar “${p}”`} onClick={() => setC({ ...c, palavras: c.palavras.filter((x) => x !== p) })}><Icone nome="xis" className="ico" /></button>}</li>
                ))}
              </ul>
            ) : <p className="ajuda">Nenhuma palavra ainda. Ex.: penhora, despejo, pensão atrasada.</p>}
            {ro ? null : (
              <div className="wa-add">
                <div className="campo">
                  <label htmlFor="pal-nova">Nova palavra ou expressão</label>
                  <input className="entrada" id="pal-nova" value={nova} maxLength={60} placeholder="Ex.: rescisão" onChange={(e) => setNova(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); acrescentar(); } }} />
                </div>
                <button className="btn btn-sec" type="button" onClick={acrescentar}><Icone nome="mais" className="ico" />Acrescentar</button>
              </div>
            )}
          </div>
        </Folha>
        <Folha id="t-regra" titulo="Para quem vai" sub="Sempre há um responsável" icone="pessoas">
          <ol className="wa-regra">
            <li><span className="disco"><span>1</span></span><span><b>Quem cuida do caso.</b><small>O responsável pelo caso em andamento do cliente, no Jurídico.</small></span></li>
            <li><span className="disco"><span>2</span></span><span><b>Senão, quem tem o próximo contato do cliente.</b></span></li>
            <li><span className="disco"><span>3</span></span><span><b>Contato novo vai para o Comercial.</b>{ia.comercial ? <small>Hoje: {ia.comercial.nome}.</small> : null}</span></li>
            <li><span className="disco"><span>4</span></span><span><b>Sem ninguém, vai para a sócia dona.</b><small>{quem}. Quem sai da equipe nunca recebe.</small></span></li>
          </ol>
          <p className="wa-fixo"><Icone nome="conversas" className="ico" /><span>A mesma regra aprovada em Conversas. A conversa diz por que foi para aquela pessoa, e dá para passar para outra.</span></p>
        </Folha>
        <Folha id="t-hora" titulo="Horário da equipe" sub="Fora dele, a IA continua respondendo o que sabe" icone="relogio">
          <div className="wa-form">
            <fieldset className="x-ops" aria-describedby={descritoPor(erros.includes("dias") && "d-er")}>
              <legend>Dias de atendimento</legend>
              <div className="wa-dias">
                {DIAS_SEMANA.map((d, i) => (
                  <label key={d} className="opcao">
                    <input className="marcar" type="checkbox" checked={c.dias.includes(i + 1)} disabled={ro}
                      onChange={(e) => setC({ ...c, dias: e.target.checked ? [...c.dias, i + 1].sort() : c.dias.filter((x) => x !== i + 1) })} />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
              {erros.includes("dias") ? <ErroCampo id="d-er">Escolha ao menos um dia.</ErroCampo> : null}
            </fieldset>
            <div className="wa-hora">
              <div className="campo">
                <label htmlFor="h-ini">Das</label>
                <input className="entrada" id="h-ini" type="time" value={c.horaInicio} readOnly={ro} onChange={(e) => setC({ ...c, horaInicio: e.target.value })}
                  aria-invalid={erros.includes("horaInicio") || undefined} aria-describedby={descritoPor(erros.includes("horaInicio") && "h-er")} />
              </div>
              <div className="campo">
                <label htmlFor="h-fim">Às</label>
                <input className="entrada" id="h-fim" type="time" value={c.horaFim} readOnly={ro} onChange={(e) => setC({ ...c, horaFim: e.target.value })}
                  aria-invalid={erros.includes("horaFim") || undefined} aria-describedby={descritoPor(erros.includes("horaFim") && "h-er")} />
              </div>
            </div>
            {erros.includes("horaInicio") ? <ErroCampo id="h-er">O início vem antes do fim.</ErroCampo> : null}
            <Nota icone="agenda"><b>Feriados nacionais</b> entram sozinhos. Recesso do escritório: marque na Agenda.</Nota>
            <div className="campo">
              <div className="campo-linha"><label htmlFor="h-fora">O que a IA diz fora do horário e em feriado</label><span className="contador" aria-hidden="true">{c.msgForaHorario.length} de 400</span></div>
              <textarea className="entrada" id="h-fora" value={c.msgForaHorario} maxLength={400} readOnly={ro} onChange={(e) => setC({ ...c, msgForaHorario: e.target.value })}
                aria-invalid={erros.includes("msgForaHorario") || undefined} aria-describedby={descritoPor("h-fora-aj", erros.includes("msgForaHorario") && "h-fora-er")} />
              <p className="ajuda" id="h-fora-aj">{"{próximo atendimento}"} vira, por exemplo, “segunda, 23/11, a partir das 9h”.</p>
              {erros.includes("msgForaHorario") ? <ErroCampo id="h-fora-er">Escreva de 10 a 400 caracteres.</ErroCampo> : null}
            </div>
            <div className="campo">
              <label htmlFor="h-plantao">Telefone para urgência fora do horário <span className="opcional">(opcional)</span></label>
              <input className="entrada" id="h-plantao" type="tel" inputMode="tel" readOnly={ro} value={c.telefoneUrgencia ? (c.telefoneUrgencia.startsWith("+") ? telefoneBr(c.telefoneUrgencia) : c.telefoneUrgencia) : ""}
                onChange={(e) => setC({ ...c, telefoneUrgencia: e.target.value })}
                aria-invalid={erros.includes("telefoneUrgencia") || undefined} aria-describedby={descritoPor("h-plantao-aj", erros.includes("telefoneUrgencia") && "h-plantao-er")} />
              <p className="ajuda" id="h-plantao-aj">Só aparece quando a urgência for de prisão, liminar ou audiência no dia.</p>
              {erros.includes("telefoneUrgencia") ? <ErroCampo id="h-plantao-er">Confira o telefone, com DDD.</ErroCampo> : null}
            </div>
          </div>
        </Folha>
        {ro ? null : <Salvar salvando={salvando} aoSalvar={() => void salvar()} />}
      </div>
      <aside className="wa-col" aria-label="Prévia">
        <Folha id="t-prev" titulo="Fora do horário" sub="Como fica a resposta">
          <ol className="cv-msgs" aria-label="Prévia da conversa" style={{ background: "var(--sal-2)" }}>
            <li className="cv-m cli"><div className="cv-b"><span className="de">Cliente</span>Recebi uma carta do INSS pedindo perícia. O que eu faço?</div></li>
            <li className="cv-m ia"><div className="cv-b"><span className="de"><Icone nome="ia" className="ico" />IA do escritório</span>
              {c.msgForaHorario.replace("{próximo atendimento}", `no próximo dia de atendimento, a partir das ${hhmm(c.horaInicio)}`)}</div></li>
            <li className="cv-sis"><Icone nome="mao" className="ico" /><span>Passa para <b>quem cuida do caso</b>. Motivo: documento novo.</span></li>
          </ol>
        </Folha>
      </aside>
    </div>
  );
}

function JanelaResposta({ r, perguntaId, inicial, aberta, aoFechar, aoSalvar }: {
  r: RespostaIa | null; perguntaId?: string; inicial?: string; aberta: boolean; aoFechar: () => void;
  aoSalvar: (d: { id?: string; versao?: number; pergunta: string; resposta: string; perguntaId?: string }) => Promise<string[] | null>;
}) {
  const [p, setP] = useState(r?.pergunta ?? inicial ?? "");
  const [t, setT] = useState(r?.resposta ?? "");
  const [erros, setErros] = useState<string[]>([]);
  async function enviar() {
    const faltam = [...(p.trim().length < 3 ? ["pergunta"] : []), ...(t.trim().length < 3 ? ["resposta"] : [])];
    setErros(faltam);
    if (faltam.length) return;
    const e = await aoSalvar({ ...(r ? { id: r.id, versao: r.versao } : {}), pergunta: p.slice(0, 120), resposta: t, ...(perguntaId ? { perguntaId } : {}) });
    if (e) setErros(e);
  }
  return (
    <Janela id="janela-resposta" aberta={aberta} aoFechar={aoFechar} sobretitulo="O que ela sabe" titulo={r ? `Editar: ${r.pergunta}` : "Nova resposta do escritório"}
      descricao="janela-resposta-d" aoEnviar={() => void enviar()}
      pe={<><button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button><button className="btn btn-pri" type="submit"><Icone nome="check" className="ico" />Salvar</button></>}>
      <p id="janela-resposta-d" className="ajuda">A IA usa a resposta como está, sem inventar.</p>
      <div className="campo">
        <label htmlFor="rp-p">Assunto</label>
        <input className="entrada" id="rp-p" data-foco value={p} maxLength={120} onChange={(e) => setP(e.target.value)} placeholder="Ex.: Estacionamento"
          aria-invalid={erros.includes("pergunta") || undefined} aria-describedby={descritoPor(erros.includes("pergunta") && "rp-p-er")} />
        {erros.includes("pergunta") ? <ErroCampo id="rp-p-er">Escreva o assunto.</ErroCampo> : null}
      </div>
      <div className="campo">
        <div className="campo-linha"><label htmlFor="rp-t">Resposta</label><span className="contador" aria-hidden="true">{t.length} de 1.000</span></div>
        <textarea className="entrada" id="rp-t" value={t} maxLength={1000} onChange={(e) => setT(e.target.value)}
          aria-invalid={erros.includes("resposta") || undefined} aria-describedby={descritoPor(erros.includes("resposta") && "rp-t-er")} />
        {erros.includes("resposta") ? <ErroCampo id="rp-t-er">Escreva a resposta.</ErroCampo> : null}
      </div>
    </Janela>
  );
}

function IaSaber({ ia, aoMudar }: { ia: PaginaIa; aoMudar: (ia: PaginaIa, feito?: Feito) => void }) {
  const [editar, setEditar] = useState<{ r: RespostaIa | null; perguntaId?: string; inicial?: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  async function salvar(d: { id?: string; versao?: number; pergunta: string; resposta: string; perguntaId?: string }) {
    const r = await chamarPortal<PaginaIa>("/v1/escritorio/ia/respostas", { corpo: d });
    if (!r.ok) {
      const c = r.erro.detalhes?.campos as string[] | undefined;
      if (c?.length) return c;
      setErro(textoDoErro(r.erro));
      setEditar(null);
      return null;
    }
    setEditar(null);
    aoMudar(r.dados, { titulo: ia.dono ? "Resposta publicada" : "Resposta sugerida", texto: ia.dono ? "A IA usa a partir da próxima mensagem." : `${ia.quemCuida?.nome ?? "A sócia dona"} revisa e publica.` });
    return null;
  }
  async function situacao(r: RespostaIa, s: "PUBLICADA" | "ARQUIVADA") {
    const res = await chamarPortal<PaginaIa>(`/v1/escritorio/ia/respostas/${r.id}`, { metodo: "PATCH", corpo: { versao: r.versao, situacao: s } });
    if (!res.ok) { setErro(textoDoErro(res.erro)); return; }
    aoMudar(res.dados, { titulo: s === "PUBLICADA" ? "Resposta publicada" : "Resposta arquivada", texto: s === "PUBLICADA" ? "A IA usa a partir da próxima mensagem." : "Fica guardada no histórico." });
  }
  const h = ia.config;
  const diasTxt = h.dias.length === 5 && h.dias.every((d, i) => d === i + 1) ? "Segunda a sexta" : h.dias.map((d) => DIAS_SEMANA[d - 1]).join(", ");
  return (
    <div className="wa-grade">
      <div className="wa-col">
        {erro ? <Aviso tom="urgencia" titulo="Não deu para salvar">{erro}</Aviso> : null}
        <Folha id="t-resp" titulo="Respostas do escritório" sub="A IA usa estas respostas como estão, sem inventar" icone="livro">
          <ul className="wa-resp">
            {ia.respostas.map((r) => {
              const podeEditar = ia.dono || r.situacao === "SUGERIDA";
              return (
                <li key={r.id} className={r.situacao === "SUGERIDA" ? "sug" : undefined}>
                  <h3>{r.pergunta}</h3>
                  {podeEditar ? (
                    <button className="btn btn-fantasma btn-icone" type="button" aria-label={`Editar: ${r.pergunta}`} onClick={() => setEditar({ r })}><Icone nome="lapis" className="ico" /></button>
                  ) : null}
                  <p>{r.resposta}</p>
                  <small>{r.situacao === "SUGERIDA" ? `Sugerida por ${primeiro(r.escritaPor?.nome)}, ${diaCurto(diaDe(r.escritaEm))} · ainda não vale` : `Escrita por ${primeiro(r.escritaPor?.nome)}, ${diaCurto(diaDe(r.escritaEm))}`}</small>
                  {ia.dono ? (
                    <div className="bts">
                      {r.situacao === "SUGERIDA" ? <button className="btn btn-sec btn-compacto" type="button" onClick={() => void situacao(r, "PUBLICADA")}><Icone nome="check" className="ico" />Publicar<span className="sr">: {r.pergunta}</span></button> : null}
                      <button className="btn btn-fantasma btn-compacto" type="button" onClick={() => void situacao(r, "ARQUIVADA")}>Arquivar<span className="sr">: {r.pergunta}</span></button>
                    </div>
                  ) : null}
                </li>
              );
            })}
            <li className="auto">
              <h3>Horário de atendimento</h3>
              <p>{diasTxt}, das {hhmm(h.horaInicio)} às {hhmm(h.horaFim)}.</p>
              <small>Vem de “Quando passa para alguém”. Muda lá.</small>
            </li>
          </ul>
          <div className="wa-acoes">
            <button className="btn btn-sec" type="button" onClick={() => setEditar({ r: null })}><Icone nome="mais" className="ico" />Nova resposta</button>
            <Nota icone="historico">Quem tem acesso ao Escritório sugere; só a sócia dona publica. Versões antigas ficam no histórico.</Nota>
          </div>
        </Folha>
        <Folha id="t-usa" titulo="O que mais ela usa" sub="Só do cliente que está escrevendo" icone="fonte">
          <ListaX itens={[
            ["balanca", <><b>Jurídico:</b> o texto da etapa do caso, escrito pela equipe. Nunca peças, nem notas internas.</>],
            ["agenda", <><b>Agenda:</b> compromissos do cliente com data, hora e local.</>],
            ["moeda", <><b>Financeiro:</b> parcelas, vencimentos e o link da segunda via.</>],
            ["doc", <><b>Clientes:</b> documentos pedidos e o que já chegou.</>],
          ]} />
          <p className="wa-fixo"><Icone nome="escudo" className="ico" /><span><b>A IA não aprende com as conversas</b> nem usa conversa de um cliente para responder a outro.</span></p>
        </Folha>
      </div>
      <aside className="wa-col" aria-label="O que ela não soube">
        <Folha id="t-ns" titulo="Perguntas que ela não soube" sub={ia.naoSoube.length ? (ia.naoSoube.length === 1 ? "1 para virar resposta" : `${ia.naoSoube.length} para virar resposta`) : "Para virar resposta"}>
          {ia.naoSoube.length ? (
            <ul className="wa-naosoube">
              {ia.naoSoube.map((q) => (
                <li key={q.id}>
                  <q>{q.texto}</q>
                  <small>{q.conversa.nome}, {quando(q.em)}</small>
                  <button className="btn btn-sec" type="button" onClick={() => setEditar({ r: null, perguntaId: q.id, inicial: q.texto })}><Icone nome="mais" className="ico" />Virar resposta do escritório</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="wa-corpo">
              <Estado icone="ajuda" titulo="Nada por enquanto">Quando a IA estiver ligada, as perguntas que ela não souber responder aparecem aqui. Com um clique, viram resposta do escritório.</Estado>
            </div>
          )}
        </Folha>
      </aside>
      <JanelaResposta key={editar ? `${editar.r?.id ?? "nova"}-${editar.perguntaId ?? ""}` : "fechada"} r={editar?.r ?? null} perguntaId={editar?.perguntaId} inicial={editar?.inicial} aberta={!!editar} aoFechar={() => setEditar(null)} aoSalvar={salvar} />
    </div>
  );
}

const REGRA_BARRADA_TEXTO: Record<RegraBarrada, string> = {
  OPINIAO: "Regra fixa: nunca dá opinião sobre o resultado.",
  NEGOCIAR: "Regra fixa: nunca negocia valor nem desconto.",
  PROMETER: "Regra fixa: nunca promete prazo nem resultado.",
  FINGIR_PESSOA: "Regra fixa: nunca diz que é uma pessoa.",
  LONGA: "A resposta ficou longa demais para o WhatsApp.",
  VAZIA: "A IA não montou uma resposta.",
};
const EXPERIMENTE = ["Manda a segunda via do boleto", "Quero falar com a doutora", "Meu filho foi preso agora", "Quanto custa uma ação?"];
type MsgTeste = { autor: "CLIENTE" | "IA"; texto: string; hora: string; plano?: PlanoIa };
const agoraHora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Testar sem enviar (F3.53): a mesma IA que atende, com o contexto de um contato da ficha ou de um
 * número desconhecido, sem enviar nada nem gravar na ficha. Só a sócia dona testa. */
function IaTestar({ ia, aoTestar }: { ia: PaginaIa; aoTestar: (ia: PaginaIa) => void }) {
  const [clientes, setClientes] = useState<ClienteTesteIa[] | null>(null);
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [quem, setQuem] = useState<string>("novo");
  const [msgs, setMsgs] = useState<MsgTeste[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroTexto, setErroTexto] = useState(false);
  const fim = useRef<HTMLLIElement>(null);

  async function buscar(q: string) {
    const r = await chamarPortal<{ clientes: ClienteTesteIa[] }>(`/v1/escritorio/ia/teste/clientes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (!r.ok) { setErro(textoDoErro(r.erro)); setClientes([]); return; }
    setClientes(r.dados.clientes);
    const c = r.dados.clientes[0];
    if (c && !r.dados.clientes.some((x) => x.id === clienteId)) escolher(c);
  }
  useEffect(() => { if (ia.dono) void Promise.resolve().then(() => buscar("")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fim.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length]);

  function escolher(c: ClienteTesteIa | null) {
    setClienteId(c?.id ?? null);
    const principal = c?.contatos.find((x) => x.principal) ?? c?.contatos[0];
    setQuem(principal?.id ?? "novo");
    setMsgs([]);
  }
  const cliente = clientes?.find((c) => c.id === clienteId) ?? null;
  const contato = quem === "novo" ? null : cliente?.contatos.find((x) => x.id === quem) ?? null;
  const nomeTeste = contato ? primeiro(contato.nome) : "o número desconhecido";

  async function enviar(t: string) {
    const limpo = t.trim();
    if (!limpo) { setErroTexto(true); return; }
    setErroTexto(false);
    setErro(null);
    const novas: MsgTeste[] = [...msgs, { autor: "CLIENTE", texto: limpo, hora: agoraHora() }];
    setMsgs(novas);
    setTexto("");
    setEnviando(true);
    const r = await chamarPortal<RespostaTesteIa>("/v1/escritorio/ia/testar", {
      corpo: {
        clienteId: contato ? clienteId : null, contatoId: contato?.id ?? null,
        mensagens: novas.slice(-20).map((m) => ({ autor: m.autor, texto: m.texto })),
      },
    });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro.codigo === "UPSTREAM_UNAVAILABLE"
        ? "A IA não respondeu agora. Nada foi enviado; tente de novo em alguns minutos."
        : textoDoErro(r.erro));
      return;
    }
    setMsgs([...novas, { autor: "IA", texto: r.dados.plano.enviar ?? "", hora: agoraHora(), plano: r.dados.plano }]);
    aoTestar(r.dados.ia);
  }

  if (!ia.dono) {
    return (
      <div className="wa-grade">
        <div className="wa-col">
          <Estado icone="olho" moldura nivel={2} titulo="Só a sócia dona testa a IA">
            {ia.quemCuida?.nome ?? "A sócia dona"} testa a IA antes de ligar. Você pode sugerir respostas em “O que ela sabe”.
          </Estado>
        </div>
      </div>
    );
  }

  const respostas = msgs.filter((m) => m.plano);
  return (
    <div className="wa-grade">
      <div className="wa-col">
        <section className="folha" aria-labelledby="t-ts" style={{ overflow: "hidden" }}>
          <div className="folha-cab"><div><h2 id="t-ts"><Icone nome="olho" className="ico" />Testar sem enviar</h2><p className="sub">Escreva como se fosse o cliente</p></div></div>
          <div className="wa-sim-ctl" style={{ display: "grid", gap: 12 }}>
            <form className="wa-compor" style={{ padding: 0, border: 0 }} role="search" onSubmit={(e) => { e.preventDefault(); void buscar(busca.trim()); }}>
              <div className="campo">
                <label htmlFor="ts-busca">Cliente do teste</label>
                <input className="entrada" id="ts-busca" type="search" placeholder="Nome do cliente" autoComplete="off" maxLength={80} value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <button className="btn btn-sec" type="submit"><Icone nome="busca" className="ico" />Buscar</button>
            </form>
            {clientes && clientes.length > 1 ? (
              <div className="campo" style={{ margin: 0 }}>
                <label htmlFor="ts-cliente">Escolha o cliente</label>
                <select className="entrada" id="ts-cliente" value={clienteId ?? ""} onChange={(e) => escolher(clientes.find((c) => c.id === e.target.value) ?? null)}>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            ) : null}
            {clientes === null ? <Carregando rotulo="Buscando clientes…" linhas={1} /> : null}
            <fieldset className="x-ops">
              <legend>Conversar como</legend>
              <div className="x-ops-l">
                {(cliente?.contatos ?? []).map((x) => (
                  <label key={x.id} className="opcao">
                    <input className="marcar" type="radio" name="ts-quem" value={x.id} checked={quem === x.id} onChange={() => { setQuem(x.id); setMsgs([]); }} />
                    <span>{x.nome}<small>{x.principal ? "Cliente · contato principal" : `${x.papel ? `${x.papel[0]!.toUpperCase()}${x.papel.slice(1)} · ` : ""}contato autorizado`}</small></span>
                  </label>
                ))}
                <label className="opcao">
                  <input className="marcar" type="radio" name="ts-quem" value="novo" checked={quem === "novo"} onChange={() => { setQuem("novo"); setMsgs([]); }} />
                  <span>Número desconhecido<small>Fora de qualquer ficha</small></span>
                </label>
              </div>
            </fieldset>
            {clientes && !clientes.length ? <p className="wa-nota"><Icone nome="ajuda" className="ico" /><span>Nenhum cliente com contato na ficha{busca ? " com esse nome" : ""}. Dá para testar como número desconhecido.</span></p> : null}
          </div>
          <p className="wa-simfaixa"><Icone nome="escudo" className="ico" /><span><b>Simulação.</b> Nada é enviado {contato ? `a ${primeiro(contato.nome)}` : "a ninguém"}, e nada fica na ficha{contato ? " dele ou dela" : ""}.</span></p>
          <ol className="cv-msgs" aria-label="Conversa de teste" aria-live="polite">
            {msgs.length ? null : <li className="cv-sis"><Icone nome="conversas" className="ico" /><span>Escreva a primeira mensagem como {nomeTeste} e veja o que a IA responderia.</span></li>}
            {msgs.map((m, i) => m.autor === "CLIENTE" ? (
              <li key={i} className="cv-m cli"><div className="cv-b"><span className="de">{contato ? primeiro(contato.nome) : "Número desconhecido"} (teste)</span>{m.texto}<time>{m.hora}</time></div></li>
            ) : (
              <MsgIaTeste key={i} m={m} />
            ))}
            {enviando ? <li className="cv-sis"><Icone nome="ia" className="ico" /><span>A IA está pensando…</span></li> : null}
            <li ref={fim} aria-hidden="true" style={{ height: 0 }} />
          </ol>
          {erro ? <div className="wa-corpo"><Aviso tom="urgencia" titulo="Não deu para testar">{erro}</Aviso></div> : null}
          <form className="wa-compor" onSubmit={(e) => { e.preventDefault(); void enviar(texto); }}>
            <div className="campo">
              <label htmlFor="ts-txt">Escreva como {contato ? primeiro(contato.nome) : "o número desconhecido"}</label>
              <input className="entrada" id="ts-txt" placeholder="Ex.: manda a segunda via do boleto" autoComplete="off" maxLength={1000} value={texto}
                onChange={(e) => setTexto(e.target.value)} aria-invalid={erroTexto ? true : undefined} aria-describedby={descritoPor(erroTexto && "ts-txt-er")} />
              {erroTexto ? <ErroCampo id="ts-txt-er">Escreva a mensagem do teste.</ErroCampo> : null}
            </div>
            <button className="btn btn-pri" type="submit" disabled={enviando}><Icone nome="enviar" className="ico" />Enviar no teste</button>
          </form>
        </section>
      </div>
      <aside className="wa-col" aria-label="Explicação">
        <Folha id="t-por" titulo="Por que respondeu assim" sub="Cada resposta, com a regra e a fonte" icone="fonte">
          {respostas.length ? (
            <ol className="wa-por">
              {respostas.map((m, i) => {
                const p = m.plano!;
                return (
                  <li key={i}>
                    <span className="disco"><span>{i + 1}</span></span>
                    {p.passar ? (
                      <span className="passa"><b>Passaria para {primeiro(p.passariaPara) || "a equipe"}.</b>
                        <small>{p.barrada ? REGRA_BARRADA_TEXTO[p.barrada] : p.motivoTexto ?? MOTIVOS_CONVERSA[p.passar as MotivoConversa] ?? "Precisa de alguém da equipe."}{p.foraDoHorario ? " Fora do horário: a resposta diz quando alguém vai ver." : ""}</small></span>
                    ) : (
                      <span><b>Respondeu sozinha.</b><small>{p.fonte ? `Com o que está em ${p.fonte}.` : "Com as respostas do escritório."}{contato ? ` ${primeiro(contato.nome)} é ${contato.principal ? "contato principal" : "contato autorizado"} da ficha.` : ""}</small></span>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="wa-corpo"><p className="wa-nota"><Icone nome="fonte" className="ico" /><span>Depois de cada resposta, aqui aparece de onde ela veio e, quando for o caso, para quem a conversa passaria e por quê.</span></p></div>
          )}
          {ia.testadaEm ? <div className="wa-corpo" style={{ paddingTop: 0 }}><Nota icone="historico">Último teste: {quando(ia.testadaEm)}{ia.testadaComo ? `, como ${ia.testadaComo}` : ""}.</Nota></div> : null}
        </Folha>
        <Folha id="t-exp" titulo="Experimente também">
          <div className="wa-corpo">
            <div className="au-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EXPERIMENTE.map((t) => <button key={t} className="btn btn-sec" type="button" style={{ minHeight: 44, fontSize: 13 }} disabled={enviando} onClick={() => void enviar(t)}>{t}</button>)}
            </div>
            <p className="wa-nota"><Icone nome="ajuda" className="ico" /><span>Como “Número desconhecido”, a IA só se apresenta, pergunta nome e assunto e passa para o Comercial, sem falar de nenhum caso.</span></p>
          </div>
        </Folha>
      </aside>
    </div>
  );
}

function MsgIaTeste({ m }: { m: MsgTeste }) {
  const p = m.plano!;
  return (
    <>
      {p.enviar ? (
        <li className="cv-m ia"><div className="cv-b"><span className="de"><Icone nome="ia" className="ico" />IA do escritório</span><span style={{ whiteSpace: "pre-line" }}>{p.enviar}</span><time>{m.hora}</time></div></li>
      ) : null}
      {p.fonte && !p.passar ? <li className="wa-fonte"><Icone nome="fonte" className="ico" /><span>De onde veio: <b>{p.fonte}</b>.</span></li> : null}
      {p.passar ? (
        <li className="cv-sis"><Icone nome="mao" className="ico" /><span>Aqui a IA <b>passaria</b> a conversa para <b>{p.passariaPara ?? "a equipe"}</b>. Motivo: {(p.barrada ? REGRA_BARRADA_TEXTO[p.barrada] : MOTIVOS_CONVERSA[p.passar as MotivoConversa] ?? "precisa de alguém").replace(/\.$/, "").toLowerCase()}.</span></li>
      ) : null}
    </>
  );
}

function IaLigada({ ia }: { ia: PaginaIa }) {
  const d = ia.desdeQueLigou ?? { conversas: 0, resolvidasIa: 0, passadas: 0 };
  return (
    <div className="wa-grade">
      <div className="wa-col">
        <Folha id="t-hoje" titulo={`Desde ${quando(ia.ligadaEm)}`} icone="conversas">
          <div className="wa-nums">
            <div><span className="disco"><span>{d.conversas}</span></span>{d.conversas === 1 ? "conversa" : "conversas"} desde que ligou</div>
            <div><span className="disco"><span>{d.resolvidasIa}</span></span>resolvidas pela IA</div>
            <div><span className="disco"><span>{d.passadas}</span></span>{d.passadas === 1 ? "passada" : "passadas"} para a equipe</div>
          </div>
          <div className="wa-corpo" style={{ paddingTop: 0 }}><p><a href={`${ROTAS_PORTAL.conversas}?mostrar=IA`}>Ver em Conversas</a>, na lista “Com a IA”.</p></div>
        </Folha>
        <Folha id="t-res" titulo="Como ela está atendendo" sub="Mudança vale na próxima mensagem" icone="ia">
          <ul className="cv-lista-x">
            <li><Icone nome="conversas" className="ico" /><p><b>Apresentação e assuntos.</b> Tom {TONS_IA[ia.config.tom].nome.toLowerCase()}; {ia.config.assuntos.length} de 6 assuntos ligados. <a href={hrefDe({ parte: "ia", ia: "apresentacao" })}>Revisar</a></p></li>
            <li><Icone nome="mao" className="ico" /><p><b>Quando passa para alguém.</b> 7 casos fixos e {ia.config.palavras.length} palavras; das {hhmm(ia.config.horaInicio)} às {hhmm(ia.config.horaFim)}. <a href={hrefDe({ parte: "ia", ia: "passar" })}>Revisar</a></p></li>
            <li><Icone nome="livro" className="ico" /><p><b>O que ela sabe.</b> {ia.respostas.length} respostas do escritório. <a href={hrefDe({ parte: "ia", ia: "saber" })}>Revisar</a></p></li>
          </ul>
        </Folha>
      </div>
      <aside className="wa-col" aria-label="Perguntas e histórico">
        <Folha id="t-hist" titulo="Histórico da IA" sub="Nada é apagado" icone="historico">
          <Historico itens={ia.historico.map((h) => ({ em: h.em, texto: <><b>{primeiro(h.pessoa?.nome)}</b> {h.oQueMudou.charAt(0).toLowerCase() + h.oQueMudou.slice(1)}.</> }))} vazio="Nada ainda." />
        </Folha>
      </aside>
    </div>
  );
}

function JanelaLigarIa({ ia, aberta, aoFechar, aoFeito }: { ia: PaginaIa; aberta: boolean; aoFechar: () => void; aoFeito: (ia: PaginaIa) => void }) {
  const [revisou, setRevisou] = useState(false);
  const [erroCampo, setErroCampo] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  async function ligar() {
    if (!revisou) { setErroCampo(true); return; }
    const r = await chamarPortal<PaginaIa>("/v1/escritorio/ia/ligar", { corpo: { versao: ia.versao, revisou } });
    if (!r.ok) { setErro(r.erro); return; }
    aoFeito(r.dados);
  }
  const c = ia.config;
  const assuntos = c.assuntos.map((a) => ASSUNTOS_IA[a].nome.toLowerCase());
  const lista = assuntos.length > 1 ? `${assuntos.slice(0, -1).join(", ")} e ${assuntos.at(-1)}` : assuntos[0] ?? "nada";
  return (
    <Janela id="janela-ligar" aberta={aberta} aoFechar={aoFechar} sobretitulo="Como a IA atende" titulo="Ligar a IA do escritório" descricao="janela-ligar-d"
      aoEnviar={() => void ligar()}
      pe={<><button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button><button className="btn btn-pri" type="submit"><Icone nome="ligar" className="ico" />Ligar a IA</button></>}>
      <p id="janela-ligar-d" className="ajuda">Em linguagem simples, o que vai acontecer. Só a sócia dona liga; fica no histórico.</p>
      {erro ? (
        <Aviso tom="urgencia" titulo="A IA não ligou"
          acoes={erro.detalhes?.motivo === "SEM_TESTE" ? <a className="btn btn-sec" href={hrefDe({ parte: "ia", ia: "testar" })}><Icone nome="olho" className="ico" />Testar sem enviar</a> : undefined}>
          {textoDoErro(erro)}
        </Aviso>
      ) : null}
      <p className="wa-frase">Quando um cliente da ficha escrever para <b className="num">{ia.whatsapp.numero ? telefoneBr(ia.whatsapp.numero) : "o número do escritório"}</b>, a <b>{c.nome.replace(/^Assistente/, "assistente")}</b> responde {lista}, sempre dizendo que é assistente virtual. Ela <b>passa para uma pessoa</b> nos 7 casos fixos{c.palavras.length ? `, nas ${c.palavras.length} palavras do escritório` : ""} e quando não sabe. Fora do horário, responde e diz <b>quando alguém vai ver</b>.</p>
      <ul className="cv-lista-x" style={{ padding: 0 }}>
        <li><Icone nome="conversas" className="ico" /><span><b>Conversas abertas hoje</b> continuam com quem está; a IA entra só nas novas.</span></li>
        <li><Icone nome="pausa" className="ico" /><span><b>“Pausar a IA agora”</b> fica no alto desta página, a qualquer hora.</span></li>
      </ul>
      <label className="opcao">
        <input className="marcar" type="checkbox" checked={revisou} onChange={(e) => { setRevisou(e.target.checked); setErroCampo(false); }}
          aria-invalid={erroCampo || undefined} aria-describedby={descritoPor("lg-ok-s", erroCampo && "lg-ok-er")} />
        <span>Testei a IA e revisei o que ela responde<small id="lg-ok-s">{ia.testadaEm ? `Último teste: ${quando(ia.testadaEm)}${ia.testadaComo ? `, como ${ia.testadaComo}` : ""}.` : "Ainda sem teste."}</small></span>
      </label>
      {erroCampo ? <ErroCampo id="lg-ok-er">Confirme que testou e revisou.</ErroCampo> : null}
    </Janela>
  );
}

// ------------------------------------------------------------------------------- página

export function WhatsappPortal() {
  const { escritorio, erro: erroEsc } = useEscritorioPortal();
  const [end, setEnd] = useState<Endereco | null>(null);
  const [w, setW] = useState<PaginaWhatsapp | null>(null);
  const [ia, setIa] = useState<PaginaIa | null>(null);
  const [erro, setErro] = useState(false);
  const [vez, setVez] = useState(0);
  const [janela, setJanela] = useState<"desligar" | "ligar-ia" | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [pausando, setPausando] = useState(false);

  useEffect(() => {
    const voltar = () => setEnd(lerEndereco());
    void Promise.resolve().then(voltar);
    window.addEventListener("popstate", voltar);
    return () => window.removeEventListener("popstate", voltar);
  }, []);

  useEffect(() => {
    let vivo = true;
    void Promise.all([chamarPortal<PaginaWhatsapp>("/v1/escritorio/whatsapp"), chamarPortal<PaginaIa>("/v1/escritorio/ia")]).then(([a, b]) => {
      if (!vivo) return;
      if (a.ok && b.ok) { setW(a.dados); setIa(b.dados); setErro(false); } else setErro(true);
    });
    return () => { vivo = false; };
  }, [vez]);

  function ir(e: Partial<Endereco>) {
    window.history.pushState(null, "", hrefDe(e));
    setEnd(lerEndereco());
    window.scrollTo(0, 0);
  }

  async function salvarIa(mudou: Partial<ConfigIa>): Promise<string[] | null> {
    setErroAcao(null);
    const r = await chamarPortal<PaginaIa>("/v1/escritorio/ia", { metodo: "PATCH", corpo: { versao: ia!.versao, ...mudou } });
    if (!r.ok) {
      const c = r.erro.detalhes?.campos as string[] | undefined;
      if (r.erro.codigo === "VERSION_CONFLICT") setErroAcao("Outra pessoa mudou a IA antes de você. Recarregue a página para ver o que mudou.");
      else if (!c?.length) setErroAcao(textoDoErro(r.erro));
      return c?.length ? c : [];
    }
    setIa(r.dados);
    setW((x) => (x ? { ...x, ia: { situacao: r.dados.situacao } } : x));
    setFeito({ titulo: "Salvo", texto: "Vale na próxima mensagem. A versão anterior fica no histórico." });
    return null;
  }

  async function pausar() {
    setPausando(true);
    const r = await chamarPortal<PaginaIa>("/v1/escritorio/ia/pausar", { corpo: { versao: ia!.versao } });
    setPausando(false);
    if (!r.ok) { setErroAcao(textoDoErro(r.erro)); return; }
    setIa(r.dados);
    setW((x) => (x ? { ...x, ia: { situacao: r.dados.situacao } } : x));
    setFeito({ titulo: "IA pausada", texto: "As conversas novas vão direto para a equipe. Volte a ligar quando quiser." });
  }

  const trilha = [{ nome: "Escritório", href: ROTAS_ESCRITORIO.dados }, { nome: "WhatsApp e IA", href: ROTAS_ESCRITORIO.whatsapp },
    ...(end?.parte === "ia" ? [{ nome: "Como a IA atende" }] : end?.ligar ? [{ nome: "Ligar o número" }] : end?.aviso ? [{ nome: AVISOS_WHATSAPP[end.aviso].nome }] : [])];

  let corpo: ReactNode;
  if (erro || erroEsc) {
    corpo = <ErroAoCarregar oque="o WhatsApp e a IA" aoTentar={() => { setErro(false); setVez((v) => v + 1); }} />;
  } else if (!w || !ia || !end) {
    corpo = <Carregando rotulo="Carregando o WhatsApp e a IA…" linhas={4} />;
  } else {
    const ligado = !!w.numero && w.numero.situacao !== "DESLIGADO";
    const quem = w.quemCuida?.nome ?? "a sócia dona";
    let parte: ReactNode;
    let lede: string | undefined;
    if (end.parte === "ia") {
      const secao = end.ia ?? (ia.situacao === "LIGADA" ? null : "apresentacao");
      parte = (
        <>
          <FaixaIa ia={ia} aoLigar={() => setJanela("ligar-ia")} aoPausar={() => void pausar()} pausando={pausando} />
          <NavIa atual={secao} ia={ia} />
          {secao === null ? <IaLigada ia={ia} />
            : secao === "apresentacao" ? <IaApresentacao key={ia.versao} ia={ia} aoSalvar={salvarIa} />
            : secao === "passar" ? <IaPassar key={ia.versao} ia={ia} aoSalvar={salvarIa} />
            : secao === "saber" ? <IaSaber ia={ia} aoMudar={(x, f) => { setIa(x); if (f) setFeito(f); }} />
            : <IaTestar ia={ia} aoTestar={setIa} />}
          <JanelaLigarIa key={`l${ia.versao}${janela}`} ia={ia} aberta={janela === "ligar-ia"} aoFechar={() => setJanela(null)}
            aoFeito={(x) => { setIa(x); setW({ ...w, ia: { situacao: x.situacao } }); setJanela(null); ir({ parte: "ia" }); setFeito({ titulo: "IA ligada", texto: "Ela entra nas conversas novas. Pausar fica no alto da página." }); }} />
        </>
      );
    } else if (end.aviso && w.dono && ligado) {
      parte = <AjustarAviso w={w} chave={end.aviso} aoFeito={(x) => { setW(x); ir({}); setFeito({ titulo: "Texto mandado à Meta", texto: "Você recebe um aviso no sino quando ela responder." }); }} />;
    } else if (!ligado && end.ligar && w.dono) {
      lede = "Ligar o número do escritório, passo a passo. Uns 15 minutos.";
      parte = <Assistente w={w} aoMudar={setW} />;
    } else if (!ligado) {
      parte = <NaoLigado w={w} />;
    } else {
      parte = (
        <>
          <NumeroLigado w={w} aoDesligar={() => setJanela("desligar")} />
          <JanelaDesligar key={`d${janela}`} w={w} aberta={janela === "desligar"} aoFechar={() => setJanela(null)}
            aoFeito={(x) => { setW(x); setIa({ ...ia, situacao: x.ia.situacao }); setJanela(null); setFeito({ titulo: "WhatsApp desligado", texto: "Nada foi apagado. Dá para ligar de novo quando quiser." }); }} />
        </>
      );
    }
    corpo = (
      <div className="wa" onClickCapture={(e) => {
        // Links desta página trocam a parte sem recarregar.
        const a = (e.target as HTMLElement).closest("a");
        const href = a?.getAttribute("href");
        if (a && href?.startsWith(ROTAS_ESCRITORIO.whatsapp) && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const q = new URL(href, window.location.origin).searchParams;
          ir({ parte: q.get("parte") === "ia" ? "ia" : "numero", ia: (q.get("ia") as SecaoIa) ?? null, ligar: q.get("ligar") === "1", aviso: (q.get("aviso") as ChaveAviso) ?? null });
        }
      }}>
        <Cabeca lede={lede} />
        {!w.dono ? <SoLeitura quem={quem} /> : null}
        {lede ? null : <Abas parte={end.parte} w={w} ia={ia.situacao} />}
        {erroAcao ? <Aviso tom="urgencia" titulo="Não deu para salvar">{erroAcao}</Aviso> : null}
        {parte}
      </div>
    );
  }

  return (
    <MolduraPortal atual="escritorio" trilha={trilha} escritorio={escritorio} pagina="co-equipe co-carteira" barra={<BarraEscritorio secao="whatsapp" />}>
      {corpo}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </MolduraPortal>
  );
}
