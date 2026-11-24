"use client";
// Importar do Astrea e do ADVBOX (F3.56, VA-05), desenho aprovado em
// docs/design/aprovadas/portal-importacao-sistemas (Carol, 21/11/2026). Esta é a parte 1: a
// escolha da origem e os clientes, pelo backup do Astrea e pela planilha de clientes do ADVBOX.
// Os passos seguintes (colunas, prévia, importar, resultado, histórico e desfazer) são os da
// importação de planilha (Importacao.tsx), com a origem escrita em tudo. Só a sócia dona importa
// de outro sistema (pergunta 3); quem não é dona vê só a planilha.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  comprimirJson, ErroArquivo, LIMITE_ARQUIVO_BYTES, LIMITE_BACKUP_BYTES, LIMITES_BACKUP, lerPlanilha, montarBackup,
  type AbaSistema, type ArquivadosImportacao, type DestinoAba, type Importacao,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { dataCurta } from "../console/tempo.ts";
import { Aviso } from "../console/pecas.tsx";
import { Selo } from "./Comercial.tsx";
import {
  API, CabFluxo, Folha, Grade, kb, Lgpd, Pagina, PassoArquivo, Passos, plural, PROBLEMAS_ARQUIVO, SeloOrigem,
} from "./Importacao.tsx";
import { ROTAS_IMPORTACAO } from "./importacao.ts";
import { chamarPortal, irPara, ROTAS_PORTAL } from "./Moldura.tsx";

// ------------------------------------------------------------------------------- peças

function ExplicaIs({ sistema }: { sistema: string }) {
  return (
    <section className="explica campo-ambar is-explica" aria-labelledby="t-ex">
      <p className="sobretitulo">Como funciona</p>
      <h2 id="t-ex">Nada entra até você conferir.</h2>
      <ul>
        <li><Icone nome="enviar" className="ico" /><span><b>1. Os dados.</b> Do {sistema}, pelo arquivo. O T3jus só lê.</span></li>
        <li><Icone nome="ligar" className="ico" /><span><b>2. Ligar.</b> As colunas e os valores já vêm ligados pelo modelo do {sistema}. Você confere e ajusta.</span></li>
        <li><Icone nome="olho" className="ico" /><span><b>3. A prévia.</b> Cada linha pronta, com aviso ou com erro.</span></li>
        <li><Icone nome="check" className="ico" /><span><b>4. Importar.</b> Entra tudo de uma vez, ou nada. Dá para desfazer em até 7 dias.</span></li>
      </ul>
    </section>
  );
}

function QuemIs() {
  return (
    <Folha id="t-quem" titulo="Quem pode importar">
      <ul className="im-regras" style={{ padding: "0 24px 20px" }}>
        <li><Icone nome="coluna" className="ico" /><span><b>De outro sistema:</b> só a sócia dona. Traz o escritório inteiro de uma vez (pergunta 3).</span></li>
        <li><Icone nome="doc" className="ico" /><span><b>Planilha:</b> a regra de sempre. Clientes, todos da equipe; contratos, quem tem a área Contratos.</span></li>
        <li><Icone nome="historico" className="ico" /><span><b>Desfazer:</b> quem importou ou a sócia dona, em até 7 dias.</span></li>
      </ul>
    </Folha>
  );
}

/**
 * O que vem de cada sistema: os clientes, os processos ativos (casos, numa segunda prévia) e, do
 * backup do Astrea, o financeiro antigo só como informação (mais uma prévia). Pela planilha do
 * ADVBOX, o financeiro fica de fora (decisão 17).
 */
function VemDe({ sistema }: { sistema: "Astrea" | "ADVBOX" }) {
  const item = (ok: boolean, t: string, s: string) => (
    <li className={ok ? undefined : "is-nao"} key={t}>
      <Icone nome={ok ? "check" : "xis"} className="ico" />
      <span><b>{t}</b><small>{s}</small></span>
    </li>
  );
  return (
    <Folha id="t-vem" titulo={`O que vem do ${sistema}`}>
      <ul className="is-vem">
        {item(true, "Clientes", "Com contatos e qualificação. Quem já está no T3jus é juntado, só nos campos vazios.")}
        {item(true, "Processos ativos, como casos", sistema === "Astrea"
          ? "No Jurídico, sem contrato, numa segunda prévia depois dos clientes. Os arquivados ficam de fora, a não ser que você escolha trazê-los como encerrados."
          : "Pela planilha de processos, depois da de clientes. Cada processo se liga a um cliente já cadastrado.")}
        {sistema === "Astrea"
          ? item(true, "Financeiro, só como informação", "O recebido fica na ficha como “pago antes do T3jus”; o que está em aberto vira lembrete para criar o contrato. Nada vai para o Caixa.")
          : item(false, "Financeiro", "Pela planilha, o financeiro fica de fora. A cobrança nasce do contrato no T3jus.")}
        {item(false, "Contratos de honorários", "Crie na ficha do cliente ou importe pela planilha.")}
        {item(false, "Prazos, agenda e tarefas", "Prazo trazido sem conferência é risco. Cadastre os próximos no caso.")}
        {item(false, "Andamentos, publicações e documentos", "Ficam no sistema antigo. Os documentos que o caso pede, você envia no caso.")}
      </ul>
    </Folha>
  );
}

/** A área de soltar o arquivo, com o campo escondido e o rótulo-botão de 44 px. */
function Soltar({ id, texto, botao, regra, accept, aoEscolher }: {
  id: string; texto: string; botao: string; regra: string; accept: string; aoEscolher: (a: File) => void;
}) {
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const escolheu = (lista: FileList | null) => {
    const a = lista?.[0];
    if (a) aoEscolher(a);
    if (entrada.current) entrada.current.value = "";
  };
  return (
    <div className={`soltar${arrastando ? " e-arrastando" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); escolheu(e.dataTransfer.files); }}>
      <Icone nome="enviar" className="ico" />
      <p><strong className="so-pc-t">{texto}</strong></p>
      <input ref={entrada} className="sr" type="file" id={id} aria-describedby={`${id}-regra`} accept={accept} onChange={(e) => escolheu(e.target.files)} />
      <label className="btn btn-sec" htmlFor={id}><Icone nome="mais" className="ico" />{botao}</label>
      <p className="ajuda" id={`${id}-regra`}>{regra}</p>
    </div>
  );
}

function Lendo({ nome, tamanho, texto, aoCancelar }: { nome: string; tamanho: number; texto: ReactNode; aoCancelar: () => void }) {
  return (
    <>
      <div className="im-arq">
        <span className="im-ci"><Icone nome="doc" className="ico" /></span>
        <span><strong>{nome}</strong><small>{kb(tamanho)} · enviado agora</small></span>
      </div>
      <div className="pt-gerando" role="status" aria-live="polite">
        <p>{texto}</p>
        <div className="pt-barra-indet" aria-hidden="true" />
      </div>
      <div>
        <button className="btn btn-sec" type="button" onClick={aoCancelar}><Icone nome="xis" className="ico" />Cancelar e apagar o arquivo</button>
      </div>
    </>
  );
}

const PROBLEMAS_BACKUP: Record<string, { titulo: string; texto: string }> = {
  ARQUIVO_GRANDE: {
    titulo: "O backup é grande demais.",
    texto: "Passa de 20 MB ou de 10.000 linhas numa aba. Exporte do Astrea só os contatos, em planilha, e importe pela Planilha. Nada foi importado.",
  },
  SEM_PERMISSAO: {
    titulo: "Só a sócia dona importa de outro sistema.",
    texto: "O backup traz o escritório inteiro. Peça a ela, ou importe os clientes por uma planilha. Nada foi importado.",
  },
};

type Erro = { motivo: string; nome: string; texto?: string } | null;

function AvisoArquivo({ erro, backup }: { erro: NonNullable<Erro>; backup: boolean }) {
  const p = (backup ? PROBLEMAS_BACKUP[erro.motivo] : undefined) ?? (erro.motivo === "SEM_PERMISSAO" ? PROBLEMAS_BACKUP.SEM_PERMISSAO : undefined);
  const q = PROBLEMAS_ARQUIVO[erro.motivo];
  return (
    <Aviso tom="urgencia" titulo={p?.titulo ?? q?.titulo ?? (backup ? "Não deu para ler o backup." : "Não deu para ler a planilha.")}>
      {p ? p.texto : q ? q.texto(erro.nome) : `${erro.texto ?? ""} Nada foi importado.`}
    </Aviso>
  );
}

function motivoDe(r: { erro: { detalhes?: Record<string, unknown> } }): string {
  return typeof r.erro.detalhes?.motivo === "string" ? r.erro.detalhes.motivo : "";
}

// ------------------------------------------------------------------------------- escolher a origem

type Origem = "planilha" | "astrea" | "advbox";

/** /clientes/importar: a sócia dona escolhe a origem; os outros vão direto à planilha. */
export function ImportarDados() {
  return (
    <Pagina trilha={[{ nome: "Importar dados" }]}>
      {(e) => (e.dono ? <EscolherOrigem /> : <PassoArquivo escritorio={e} modeloAberto={false} />)}
    </Pagina>
  );
}

function EscolherOrigem() {
  const [origem, setOrigem] = useState<Origem>("planilha");
  const [ultimas, setUltimas] = useState<Importacao[] | null>(null);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<{ importacoes: Importacao[] }>(API).then((r) => vivo && r.ok && setUltimas(r.dados.importacoes.slice(0, 2)));
    return () => {
      vivo = false;
    };
  }, []);
  const destino: Record<Origem, string> = { planilha: ROTAS_IMPORTACAO.planilha, astrea: ROTAS_IMPORTACAO.astrea, advbox: ROTAS_IMPORTACAO.advbox };

  const cartao = (v: Origem, t: string, s: string, p: string, itens: [boolean, string][], pe: string) => (
    <label className="is-ori" key={v}>
      <span className="is-ori-t">
        <input type="radio" name="is-origem" value={v} checked={origem === v} onChange={() => setOrigem(v)} />
        <span><strong>{t}</strong><small>{s}</small></span>
      </span>
      <p>{p}</p>
      <ul>
        {itens.map(([ok, x]) => <li key={x} className={ok ? undefined : "is-nao"}><Icone nome={ok ? "check" : "xis"} className="ico" /><span>{x}</span></li>)}
      </ul>
      <span className="is-ori-pe">{pe}</span>
    </label>
  );

  const principal = (
    <Folha id="t-ori" titulo="Escolha a origem" sub="Planilha, Astrea ou ADVBOX. Os passos seguintes são os mesmos: ligar, conferir na prévia e importar.">
      <fieldset className="is-origens">
        <legend>De onde vêm os dados?</legend>
        <div className="is-ori-g">
          {cartao("planilha", "Planilha", "Excel ou Google Planilhas", "A importação de sempre. Você liga as colunas da sua planilha aos campos do T3jus.",
            [[true, "Clientes"], [true, "Contratos e parcelas"]], "Pronto em minutos. Clientes, todos da equipe; contratos, quem tem a área.")}
          {cartao("astrea", "Astrea", "Pelo backup do escritório", "O Astrea manda um arquivo com tudo do escritório. Você pede o backup lá e envia aqui.",
            [[true, "Clientes"], [true, "Processos ativos e o financeiro, como informação"], [false, "Contratos de honorários"]], "O backup chega por e-mail em até 24 horas.")}
          {cartao("advbox", "ADVBOX", "Pela planilha exportada", "Você exporta o relatório de clientes do ADVBOX em planilha e envia aqui.",
            [[true, "Clientes"], [true, "Processos ativos"], [false, "Financeiro e contratos"]], "Funciona em qualquer plano do ADVBOX.")}
        </div>
      </fieldset>
      <p className="is-outro"><Icone nome="ajuda" className="ico" /><span><b>Usa outro sistema?</b> Quase todos exportam os clientes em planilha. Escolha Planilha: o passo das colunas serve para qualquer uma.</span></p>
      <div className="im-pe">
        <span className="im-pe-t">Nada entra no cadastro antes da prévia. Em todas as origens, dá para desfazer em 7 dias.</span>
        <a className="btn btn-fantasma" href={ROTAS_PORTAL.clientes}>Cancelar</a>
        <a className="btn btn-pri" href={destino[origem]}><Icone nome="dir" className="ico" />Continuar</a>
      </div>
    </Folha>
  );

  const lateral = (
    <>
      <QuemIs />
      {ultimas?.length ? (
        <Folha id="t-ult" titulo="Importações anteriores">
          <ul className="im-ok">
            {ultimas.map((u) => (
              <li key={u.id}>
                <Icone nome="historico" className="ico" />
                <span>
                  <b>{u.arquivo}</b> <SeloOrigem origem={u.origem} leve />
                  <small>{dataCurta(u.importadoEm ?? u.criadoEm)} · {u.por.nome} · {u.desfeita ? "desfeita" : plural(u.resumo?.clientes ?? 0, "cliente", "clientes")}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="hn-pe" style={{ paddingTop: 12 }}><Icone nome="dir" className="ico" /><a href={ROTAS_IMPORTACAO.historico}>Ver todas as importações</a></p>
        </Folha>
      ) : null}
    </>
  );

  return (
    <div className="im">
      <CabFluxo titulo="Importar dados" lede="Clientes que já estão numa planilha ou em outro sistema, conferidos numa prévia antes de salvar." />
      <Grade principal={principal} lateral={lateral} rotulo="Quem pode e o histórico" />
    </div>
  );
}

/** Quem não é dona e abre o Astrea ou o ADVBOX: a regra e o caminho da planilha. */
function SoDona({ titulo }: { titulo: string }) {
  return (
    <div className="im">
      <CabFluxo titulo={titulo} />
      <Folha id="t-dona" titulo="Só a sócia dona importa de outro sistema">
        <div className="im-bloco">
          <p>O backup e os relatórios de outro sistema trazem o escritório inteiro de uma vez. Por isso, só a sócia dona importa por aqui. Os clientes de uma planilha, qualquer pessoa da equipe importa.</p>
          <p><a className="btn btn-pri" href={ROTAS_IMPORTACAO.planilha}><Icone nome="doc" className="ico" />Importar uma planilha</a></p>
        </div>
      </Folha>
    </div>
  );
}

// ------------------------------------------------------------------------------- Astrea: o backup

export function ImportarAstrea() {
  return (
    <Pagina trilha={[{ nome: "Importar dados", href: ROTAS_IMPORTACAO.enviar }, { nome: "Astrea" }]}>
      {(e) => (e.dono ? <PassoBackup /> : <SoDona titulo="Importar do Astrea" />)}
    </Pagina>
  );
}

function PassoBackup() {
  const [lendo, setLendo] = useState<{ nome: string; tamanho: number } | null>(null);
  const [erro, setErro] = useState<Erro>(null);
  const cancelar = useRef<AbortController | null>(null);

  async function enviar(arquivo: File) {
    setErro(null);
    if (arquivo.size === 0) return setErro({ motivo: "ARQUIVO_VAZIO", nome: arquivo.name });
    if (arquivo.size > LIMITE_BACKUP_BYTES) return setErro({ motivo: "ARQUIVO_GRANDE", nome: arquivo.name });
    const ac = new AbortController();
    cancelar.current = ac;
    setLendo({ nome: arquivo.name, tamanho: arquivo.size });
    // O backup é lido aqui, no navegador: ao T3jus chegam só as abas que podem entrar.
    let corpo: Uint8Array;
    try {
      const abas = await lerPlanilha(new Uint8Array(await arquivo.arrayBuffer()), arquivo.name, LIMITES_BACKUP);
      corpo = await comprimirJson(montarBackup(abas));
    } catch (e) {
      setLendo(null);
      return setErro({ motivo: e instanceof ErroArquivo ? e.motivo : "ARQUIVO_FORMATO", nome: arquivo.name });
    }
    if (ac.signal.aborted) return setLendo(null);
    if (corpo.length > LIMITE_ARQUIVO_BYTES) {
      setLendo(null);
      return setErro({ motivo: "ARQUIVO_GRANDE", nome: arquivo.name });
    }
    const r = await chamarPortal<Importacao>(`${API}?oQue=CLIENTES&origem=ASTREA&nome=${encodeURIComponent(arquivo.name.slice(0, 200))}`, {
      bruto: new Blob([corpo.slice()]), sinal: ac.signal,
    });
    cancelar.current = null;
    if (ac.signal.aborted) return setLendo(null);
    if (r.ok) return irPara(ROTAS_IMPORTACAO.abas(r.dados.id));
    setLendo(null);
    const motivo = motivoDe(r);
    setErro({ motivo, nome: arquivo.name, texto: PROBLEMAS_ARQUIVO[motivo] || PROBLEMAS_BACKUP[motivo] ? undefined : textoDoErro(r.erro) });
  }

  const passo = (n: number, titulo: string, corpo: ReactNode) => (
    <li>
      <span className="disco" aria-hidden="true"><span>{n}</span></span>
      <div><b>{titulo}</b>{corpo}</div>
    </li>
  );
  const pedir = (
    <Folha id="t-ped" titulo="Peça o backup no Astrea" sub="O Astrea não tem conexão direta. O caminho é o backup completo, que ele mesmo oferece.">
      <ol className="is-pp">
        {passo(1, "Entre no Astrea com o usuário administrador do escritório.", <p>Só o administrador da conta do Astrea pede o backup.</p>)}
        {passo(2, "Abra a Administração, no ícone da engrenagem, e vá à aba Escritório.",
          <span className="is-menu"><span>Administração</span><i>(engrenagem)</i><i aria-hidden="true">›</i><span>Escritório</span></span>)}
        {passo(3, "Em “Manutenção de conta”, use o “clique aqui” para pedir o backup.",
          <span className="is-menu"><span>Manutenção de conta</span><i aria-hidden="true">›</i><span>clique aqui</span></span>)}
        {passo(4, "Espere o e-mail e baixe o arquivo.", (
          <>
            <p>Chega em até 24 horas, com um link para baixar o backup em .xlsx. Não precisa abrir nem mudar o arquivo.</p>
            <span className="is-email"><Icone nome="envelope" className="ico" /><span><b>“Seu backup do Astrea está pronto”</b><small>Assunto do e-mail que o Astrea manda ao administrador</small></span></span>
          </>
        ))}
      </ol>
      <p className="is-nota">Os nomes dos menus são os do Astrea em novembro de 2026. Se mudarem, a ajuda do Astrea mostra o caminho atual. Pode sair desta página enquanto espera: quando o e-mail chegar, volte em Clientes › Importar dados.</p>
    </Folha>
  );

  const envio = (
    <Folha id="t-env" titulo="Envie o backup aqui">
      <div className="im-bloco" aria-busy={lendo ? true : undefined}>
        {lendo ? (
          <Lendo nome={lendo.nome} tamanho={lendo.tamanho} aoCancelar={() => cancelar.current?.abort()}
            texto={<><b>Lendo o backup.</b> As abas são lidas aqui, no seu computador; com 10.000 linhas, pode levar um minuto.</>} />
        ) : (
          <>
            {erro ? <AvisoArquivo erro={erro} backup /> : null}
            <Soltar id="is-arq" texto="Arraste o backup para cá ou" botao="Escolher o backup" regra="Arquivo .xlsx do backup do Astrea, até 20 MB."
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aoEscolher={(a) => void enviar(a)} />
            <ul className="im-lim" aria-label="Antes de enviar">
              <li><Icone nome="doc" className="ico" /><span><b>O .xlsx do backup, do jeito que veio.</b> Reconhecemos as abas pelo modelo do Astrea.</span></li>
              <li><Icone nome="filtro" className="ico" /><span><b>Até 20 MB e 10.000 linhas por aba.</b> É maior que o limite da planilha, porque o backup traz tudo.</span></li>
              <li><Icone nome="funcoes" className="ico" /><span><b>Você escolhe as abas.</b> As que ficarem de fora não chegam ao T3jus.</span></li>
            </ul>
          </>
        )}
        <Lgpd>
          <b>O backup não fica guardado.</b> Ele traz tudo do escritório, então ele é aberto aqui, no seu computador, e ao T3jus chegam só as abas que podem
          entrar. Elas ficam no servidor, no Brasil, até a importação terminar ou ser cancelada, ou por 24 horas. Fica registrado só o nome do arquivo, quem
          enviou e quando.
        </Lgpd>
      </div>
      {lendo ? null : (
        <div className="im-pe">
          <span className="im-pe-t">Ao escolher o arquivo, a leitura começa sozinha. Nada entra no cadastro neste passo.</span>
          <a className="btn btn-fantasma" href={ROTAS_IMPORTACAO.enviar}><Icone nome="esquerda" className="ico" />Trocar a origem</a>
          <label className="btn btn-pri" htmlFor="is-arq"><Icone nome="dir" className="ico" />Enviar e continuar</label>
        </div>
      )}
    </Folha>
  );

  return (
    <div className="im">
      <CabFluxo origem="ASTREA" lede="Os clientes do escritório, a partir do backup que o Astrea gera." />
      <Passos atual={1} origem="ASTREA" escolhas={[lendo?.nome ?? ""]} />
      <Grade principal={<>{pedir}{envio}</>} lateral={<><VemDe sistema="Astrea" /><ExplicaIs sistema="Astrea" /></>} rotulo="O que vem do Astrea" />
    </div>
  );
}

// ------------------------------------------------------------------------------- Astrea: as abas

const ICONE_DESTINO: Record<DestinoAba, NomeIcone> = {
  CLIENTES: "pessoas", CASOS: "balanca", FINANCEIRO: "carteira", TAREFAS: "check", AGENDA: "agenda", PUBLICACOES: "doc", FORA: "ajuda",
};
const POR_QUE_FORA: Partial<Record<DestinoAba, string>> = {
  CASOS: "Não foi lida: o backup não trouxe as colunas dos processos.",
  FINANCEIRO: "Não foi lida: o backup não trouxe as colunas dos lançamentos.",
  TAREFAS: "As tarefas se criam no caso, com responsável e data conferidos.",
  AGENDA: "Prazo e audiência trazidos sem conferência são risco. Cadastre os próximos.",
  PUBLICACOES: "Intimações antigas ficam no Astrea.",
};

/** Passo 2 do backup: para onde vai cada aba (decisão 7). Uma aba vai para os clientes; a dos processos
 * vira casos numa segunda prévia, depois que os clientes entram (decisão da Carol, 22/11). */
export function PassoAbas({ imp }: { imp: Importacao }) {
  const abas = imp.abasSistema ?? [];
  const [clientes, setClientes] = useState<number | null>(imp.aba);
  const reconhecidas = abas.filter((a) => a.reconhecida).length;
  const novas = abas.filter((a) => !a.reconhecida);
  const lidas = abas.filter((a) => a.lida);
  // F3.116 (estado astrea-abas): os processos arquivados ficam de fora ou entram como encerrados.
  const abaCasos = abas.find((a) => a.destino === "CASOS" && a.lida);
  const nArquivados = abaCasos?.arquivados ?? 0;
  const [arquivados, setArquivados] = useState<ArquivadosImportacao>(imp.arquivados ?? "FORA");
  const [salvando, setSalvando] = useState(false);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const conferir = async (aba: number) => {
    if (arquivados !== (imp.arquivados ?? "FORA")) {
      setSalvando(true);
      setErroArq(null);
      const r = await chamarPortal<Importacao>(`${API}/${imp.id}/arquivados`, { metodo: "PATCH", corpo: { versao: imp.versao, arquivados } });
      setSalvando(false);
      if (!r.ok) return setErroArq(textoDoErro(r.erro));
    }
    irPara(ROTAS_IMPORTACAO.colunasDaAba(imp.id, aba));
  };

  const situacao = (a: AbaSistema) => {
    if (!a.reconhecida) {
      return <div className="im-sit"><Selo tom="atencao" icone="ajuda">Não reconhecida</Selo><small>Não está no modelo do Astrea. Se for a dos contatos, ligue aos clientes; senão, deixe de fora.</small></div>;
    }
    if (a.destino === "FINANCEIRO" && a.lida) {
      return <div className="im-sit"><span className="hn-selo"><Icone nome="check" className="ico" />Pelo modelo do Astrea</span><small>Só como informação na ficha. Entra numa prévia própria, depois dos clientes. As despesas do escritório ficam de fora.</small></div>;
    }
    if (a.destino === "CASOS" && a.lida) {
      return (
        <div className="im-sit"><span className="hn-selo"><Icone nome="check" className="ico" />Pelo modelo do Astrea</span>
          <small>{typeof a.ativos === "number" && typeof a.arquivados === "number"
            ? `${plural(a.ativos, "ativo", "ativos")} e ${plural(a.arquivados, "arquivado", "arquivados")}.`
            : "Só os processos ativos. Entram numa segunda prévia, depois dos clientes, ligados a eles."}</small>
        </div>
      );
    }
    if (a.destino === "CLIENTES") {
      return <div className="im-sit"><span className="hn-selo"><Icone nome="check" className="ico" />Pelo modelo do Astrea</span><small>Os contatos do tipo cliente viram clientes; as partes contrárias e os terceiros ficam de fora.</small></div>;
    }
    return <div className="im-sit"><Selo tom="neutro" icone="xis">Fica de fora</Selo><small>{POR_QUE_FORA[a.destino]}</small></div>;
  };

  const linha = (a: AbaSistema) => {
    const vai = clientes === a.indice;
    const id = `is-aba-${a.indice}`;
    if ((a.destino === "CASOS" || a.destino === "FINANCEIRO") && a.lida) {
      return (
        <tr key={a.indice}>
          <td>
            <div className="is-aba">
              <span className="is-ci" aria-hidden="true"><Icone nome={ICONE_DESTINO[a.destino]} className="ico" /></span>
              <span><b>{a.nome}</b><small>{plural(a.linhas, "linha", "linhas")}</small></span>
            </div>
          </td>
          <td data-r="Vai para"><b style={{ fontWeight: 500 }}>{a.destino === "CASOS" ? "Casos no Jurídico" : "Histórico na ficha"}</b><small style={{ display: "block", color: "var(--texto-2)" }}>depois dos clientes</small></td>
          <td data-r="Situação">{situacao(a)}</td>
        </tr>
      );
    }
    return (
      <tr key={a.indice} className={!a.reconhecida ? "is-nova" : vai ? "" : "im-ign"}>
        <td>
          <div className="is-aba">
            <span className="is-ci" aria-hidden="true"><Icone nome={ICONE_DESTINO[a.destino]} className="ico" /></span>
            <span><b>{a.nome}</b><small>{plural(a.linhas, "linha", "linhas")}</small></span>
          </div>
        </td>
        <td data-r="Vai para">
          <div className="campo">
            <label className="sr" htmlFor={id}>Aba {a.nome}: vai para</label>
            <select className="entrada" id={id} value={vai ? "CLIENTES" : ""} disabled={!a.lida || a.destino === "CASOS" || a.destino === "FINANCEIRO"}
              onChange={(e) => setClientes(e.target.value === "CLIENTES" ? a.indice : clientes === a.indice ? null : clientes)}>
              <option value="">Não importar</option>
              {a.lida && a.destino !== "CASOS" && a.destino !== "FINANCEIRO" ? <option value="CLIENTES">Clientes</option> : null}
            </select>
          </div>
        </td>
        <td data-r="Situação">{situacao(a)}</td>
      </tr>
    );
  };

  const topo = novas.length ? (
    <Aviso tom="atencao" titulo="Este backup está um pouco diferente do modelo que conhecemos."
      acoes={<ul className="im-resumo" style={{ margin: "4px 0 0", paddingLeft: 18 }}>{novas.map((a) => <li key={a.indice}><a href={`#is-aba-${a.indice}`}>Aba “{a.nome}”: {plural(a.linhas, "linha", "linhas")}</a></li>)}</ul>}>
      Ligamos pelo modelo o que reconhecemos. {novas.length === 1 ? "Uma aba é nova: escolha" : `${novas.length} abas são novas: escolha`} se vai para os clientes ou deixe de fora. Nada foi importado.
    </Aviso>
  ) : (
    <Aviso tom="sucesso" titulo="Reconhecemos o backup do Astrea.">
      {plural(abas.length, "aba está", "abas estão")} no modelo que conhecemos. Ligamos cada uma pelo modelo; confira e ajuste o que precisar.
    </Aviso>
  );

  const principal = (
    <Folha id="t-abas" titulo="As abas do backup" sub={`${imp.arquivo} · ${plural(abas.length, "aba", "abas")} · ${plural(reconhecidas, "reconhecida", "reconhecidas")}`} estilo={{ overflow: "hidden" }}>
      <div style={{ padding: "0 24px 16px" }}>{topo}</div>
      <p className="is-arq-b">
        <Icone nome="doc" className="ico" />
        <span><b>{imp.arquivo}</b> · enviado por {imp.por.nome}</span>
        <a className="btn btn-fantasma" href={ROTAS_IMPORTACAO.astrea}><Icone nome="xis" className="ico" />Trocar o arquivo</a>
      </p>
      <table className="hn-tab is-abas-t" data-cartoes="480">
        <caption className="sr">Abas do backup</caption>
        <colgroup><col style={{ width: "24%" }} /><col style={{ width: "42%" }} /><col style={{ width: "34%" }} /></colgroup>
        <thead><tr><th scope="col">Aba do backup</th><th scope="col">Vai para</th><th scope="col">Situação</th></tr></thead>
        <tbody>{abas.map(linha)}</tbody>
      </table>
      {nArquivados > 0 ? (
        <fieldset className="is-escolha">
          <legend>Processos arquivados ({nArquivados.toLocaleString("pt-BR")})</legend>
          <p>Processos que já terminaram no Astrea.</p>
          <div className="im-ops">
            {([
              ["FORA", "Deixar de fora", "Recomendado. A lista de casos começa só com o que está em andamento."],
              ["ENCERRADOS", "Importar como encerrados", "Entram em Casos e processos › Encerrados, sem resultado nem acerto."],
            ] as [ArquivadosImportacao, string, string][]).map(([v, t, sub]) => (
              <label key={v} className="opcao">
                <input className="marcar" type="radio" name="is-arquiv" value={v} checked={arquivados === v} onChange={() => setArquivados(v)} />
                <span>{t}<small>{sub}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {erroArq ? (
        <div style={{ padding: "16px 24px 0" }}>
          <Aviso tom="urgencia" titulo="A escolha dos arquivados não foi salva.">{erroArq}</Aviso>
        </div>
      ) : null}
      {clientes === null ? (
        <div style={{ padding: "16px 24px 0" }}>
          <Aviso tom="urgencia" titulo="Escolha a aba dos clientes.">Sem ela, não há o que importar. {lidas.length ? "" : "Este backup não tem uma aba que possa ir para os clientes."}</Aviso>
        </div>
      ) : null}
      <div className="im-pe">
        <span className="im-pe-t">As abas de fora não chegam ao T3jus. Nada entrou no cadastro ainda.</span>
        <a className="btn btn-fantasma" href={ROTAS_IMPORTACAO.astrea}><Icone nome="esquerda" className="ico" />Voltar</a>
        {clientes !== null ? (
          <button className="btn btn-pri" type="button" disabled={salvando} onClick={() => void conferir(clientes)}><Icone nome="dir" className="ico" />Conferir as colunas</button>
        ) : null}
      </div>
    </Folha>
  );

  return (
    <div className="im">
      <CabFluxo origem="ASTREA" />
      <Passos atual={2} origem="ASTREA" escolhas={[imp.arquivo]} voltar={[ROTAS_IMPORTACAO.astrea]} />
      <Grade principal={principal} lateral={<><VemDe sistema="Astrea" /><ExplicaIs sistema="Astrea" /></>} rotulo="O que vem do Astrea" desce />
    </div>
  );
}

// ------------------------------------------------------------------------------- ADVBOX: a planilha

export function ImportarAdvbox() {
  return (
    <Pagina trilha={[{ nome: "Importar dados", href: ROTAS_IMPORTACAO.enviar }, { nome: "ADVBOX" }]}>
      {(e) => (e.dono ? <PassoAdvbox /> : <SoDona titulo="Importar do ADVBOX" />)}
    </Pagina>
  );
}

function PassoAdvbox() {
  const [oQue, setOQue] = useState<"CLIENTES" | "CASOS">("CLIENTES");
  const processos = oQue === "CASOS";
  const [lendo, setLendo] = useState<{ nome: string; tamanho: number } | null>(null);
  const [erro, setErro] = useState<Erro>(null);
  const cancelar = useRef<AbortController | null>(null);

  async function enviar(arquivo: File) {
    setErro(null);
    if (arquivo.size === 0) return setErro({ motivo: "ARQUIVO_VAZIO", nome: arquivo.name });
    if (arquivo.size > LIMITE_ARQUIVO_BYTES) return setErro({ motivo: "ARQUIVO_GRANDE", nome: arquivo.name });
    const ac = new AbortController();
    cancelar.current = ac;
    setLendo({ nome: arquivo.name, tamanho: arquivo.size });
    const r = await chamarPortal<Importacao>(`${API}?oQue=${oQue}&origem=ADVBOX_PLANILHA&nome=${encodeURIComponent(arquivo.name.slice(0, 200))}`, { bruto: arquivo, sinal: ac.signal });
    cancelar.current = null;
    if (ac.signal.aborted) return setLendo(null);
    if (r.ok) return irPara(ROTAS_IMPORTACAO.passo(r.dados.id, "colunas"));
    setLendo(null);
    const motivo = motivoDe(r);
    setErro({ motivo, nome: arquivo.name, texto: PROBLEMAS_ARQUIVO[motivo] || motivo === "SEM_PERMISSAO" ? undefined : textoDoErro(r.erro) });
  }

  const passo = (n: number, titulo: string, texto: string) => (
    <li><span className="disco" aria-hidden="true"><span>{n}</span></span><div><b>{titulo}</b><p>{texto}</p></div></li>
  );
  const exportar = (
    <Folha id="t-exp" titulo="Exporte do ADVBOX" sub={`Sem conexão e sem custo, pelo relatório de ${processos ? "processos" : "clientes"} em planilha.`}>
      <fieldset className="im-decide" style={{ padding: "0 24px 16px" }}>
        <legend>Qual planilha você vai enviar?</legend>
        <label className="opcao">
          <input className="marcar" type="radio" name="is-oque" value="CLIENTES" checked={!processos} disabled={!!lendo} onChange={() => { setOQue("CLIENTES"); setErro(null); }} />
          <span>A de clientes<small>Primeiro esta. Quem já está no T3jus é juntado, só nos campos vazios.</small></span>
        </label>
        <label className="opcao">
          <input className="marcar" type="radio" name="is-oque" value="CASOS" checked={processos} disabled={!!lendo} onChange={() => { setOQue("CASOS"); setErro(null); }} />
          <span>A de processos<small>Depois dos clientes. Os ativos viram casos no Jurídico, sem contrato, ligados aos clientes pelo CPF, CNPJ ou nome.</small></span>
        </label>
      </fieldset>
      <ol className="is-pp">
        {passo(1, `No ADVBOX, abra o relatório de ${processos ? "processos" : "clientes"} e exporte em planilha (Excel).`, "Se o relatório deixar escolher colunas, marque todas: as que não servem ficam de fora no passo 2.")}
        {passo(2, "Envie a planilha aqui.", "Ela passa pelos mesmos passos da planilha: colunas, prévia e importar.")}
      </ol>
      <p className="is-nota">O ADVBOX não publica as colunas dos relatórios. Reconhecemos os nomes mais comuns; o que não reconhecermos aparece no passo 2 para você ligar.</p>
    </Folha>
  );
  const envio = (
    <Folha id="t-env" titulo="Envie a planilha">
      <div className="im-bloco" aria-busy={lendo ? true : undefined}>
        {lendo ? (
          <Lendo nome={lendo.nome} tamanho={lendo.tamanho} aoCancelar={() => cancelar.current?.abort()}
            texto={<><b>Lendo a planilha.</b> Costuma levar poucos segundos; com milhares de linhas, até um minuto.</>} />
        ) : (
          <>
            {erro ? <AvisoArquivo erro={erro} backup={false} /> : null}
            <Soltar id="is-arq" texto="Arraste a planilha para cá ou" botao="Escolher a planilha" regra="Arquivo .xlsx ou .csv, até 5 MB e 10.000 linhas."
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" aoEscolher={(a) => void enviar(a)} />
            <ul className="im-lim" aria-label="Antes de enviar">
              <li><Icone nome="doc" className="ico" /><span><b>.xlsx ou .csv.</b> No Google Planilhas: Arquivo › Fazer download › Microsoft Excel.</span></li>
              <li><Icone nome="filtro" className="ico" /><span><b>Até 5 MB e 10.000 linhas.</b> Se passar, divida em duas planilhas e importe uma depois da outra.</span></li>
              <li><Icone nome="funcoes" className="ico" /><span><b>A primeira linha traz os nomes das colunas.</b> Se houver mais de uma aba, você escolhe no passo 2.</span></li>
            </ul>
          </>
        )}
        <Lgpd>
          <b>O arquivo não fica guardado.</b> Ele é lido no servidor, no Brasil, e apagado quando a importação termina ou é cancelada. Se você sair no meio, ele é
          apagado em 24 horas. Fica registrado só o nome do arquivo, quem enviou e quando.
        </Lgpd>
      </div>
      {lendo ? null : (
        <div className="im-pe">
          <span className="im-pe-t">Ao escolher o arquivo, a leitura começa sozinha. Nada entra {processos ? "no Jurídico" : "no cadastro"} neste passo.</span>
          <a className="btn btn-fantasma" href={ROTAS_IMPORTACAO.enviar}><Icone nome="esquerda" className="ico" />Voltar</a>
          <label className="btn btn-pri" htmlFor="is-arq"><Icone nome="dir" className="ico" />Enviar e continuar</label>
        </div>
      )}
    </Folha>
  );
  const muda = (
    <Folha id="t-muda" titulo="O que muda pela planilha">
      <ul className="is-vem">
        <li><Icone nome="check" className="ico" /><span>Os passos são os da importação de planilha, com as colunas ligadas pelo modelo do ADVBOX.</span></li>
        <li><Icone nome="balanca" className="ico" /><span>Os processos vêm pela planilha de processos, depois da de clientes. Só os ativos entram, como casos sem contrato.</span></li>
        <li className="is-nao"><Icone nome="xis" className="ico" /><span>O financeiro fica de fora pela planilha.</span></li>
        <li className="is-nao"><Icone nome="pena" className="ico" /><span>Contratos também ficam de fora. Crie cada um na ficha do cliente.</span></li>
      </ul>
    </Folha>
  );
  return (
    <div className="im">
      <CabFluxo origem="ADVBOX_PLANILHA" />
      <Passos atual={1} origem="ADVBOX_PLANILHA" escolhas={[lendo?.nome ?? ""]} />
      <Grade principal={<>{exportar}{envio}</>} lateral={<>{muda}<ExplicaIs sistema="ADVBOX" /></>} rotulo="O que muda pela planilha" />
    </div>
  );
}
