"use client";
// Fim do contrato no Console (F0.14, PT-11), tela aprovada em
// docs/design/aprovadas/console-fim-contrato (ficha.html): a ação de encerrar no pé da folha
// Estágio, a janela com o que acontece e quando, a faixa de só leitura, a linha do tempo e
// reabrir. Decisões da Carol de 19/11/2026: 30 dias só de consulta, guarda de 5 anos, reabrir
// com motivo até o fim da guarda e só a Administração.

import { useId, useState } from "react";
import { dataDigitada, datasDoFim, diaBrasilia, nomeConfere, type EncerramentoConsole } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import type { FichaDoCliente } from "./ficha.ts";
import { chamarConsole } from "./Moldura.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, Janela } from "./pecas.tsx";
import { dataHora } from "./tempo.ts";

export const PODE_ENCERRAR = "console.contrato.encerrar";
const MAX_MOTIVO = 300;

/** "2026-11-19" ou um instante (o dia de Brasília, F3.175) vira "19/11/2026"; com `curta`, "19/11". */
export function dataBr(iso: string, curta = false): string {
  const [a, m, d] = diaBrasilia(iso).split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
}

/** Hoje em Brasília, "aaaa-mm-dd". */
export function hojeIso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** O contrato está encerrado de fato (já passou do fim): a ficha é só de leitura. */
export function soLeitura(f: Pick<FichaDoCliente, "encerramento">): boolean {
  const s = f.encerramento?.situacao;
  return s === "CONSULTA" || s === "FECHADO";
}

/** Abertura da ficha: o lado âmbar do contrato encerrado ou marcado. */
export function LadoEncerramento({ e }: { e: EncerramentoConsole }) {
  const ids = useId();
  const marcado = e.situacao === "MARCADO";
  const [, , ano] = dataBr(e.fimEm).split("/");
  return (
    <section className="dir campo-ambar" aria-labelledby={`${ids}-t`}>
      <p className="sobretitulo" id={`${ids}-t`}>
        {marcado ? "Encerramento marcado" : "Contrato encerrado"}
      </p>
      <p className="grande">
        {dataBr(e.fimEm, true)}
        <small>de {ano} · {marcado ? "último dia" : "fim do contrato"}</small>
      </p>
      <p className="dica" style={{ fontSize: 13 }}>
        {marcado ? (
          "Até lá, tudo segue normal no Portal. Depois, 30 dias só para consulta e para baixar os dados."
        ) : e.situacao === "CONSULTA" ? (
          <>
            Até <b>{dataBr(e.consultaAte)}</b> o escritório só consulta e baixa os dados. Em <b>{dataBr(e.acessoFechaEm, true)}</b> o acesso fecha; os dados
            ficam guardados até <b>{dataBr(e.guardaAte)}</b>.
          </>
        ) : (
          <>
            Acesso fechado em <b>{dataBr(e.acessoFechaEm)}</b>. Os dados do escritório e dos clientes dele ficam guardados até <b>{dataBr(e.guardaAte)}</b>.
          </>
        )}
      </p>
    </section>
  );
}

/** Faixa logo abaixo da abertura, em todas as abas. */
export function FaixaContrato({ f }: { f: FichaDoCliente }) {
  const e = f.encerramento;
  if (!e) return null;
  const marcado = e.situacao === "MARCADO";
  const por = e.por.nome ?? "Equipe T3jus";
  return (
    <div className={`fc-faixa${marcado ? " fc-marcada" : ""}`} role="note" aria-label="Situação do contrato">
      <Icone nome={marcado ? "relogio" : "cadeado"} className="ico" />
      <p>
        {marcado ? (
          <>
            <b>Encerramento marcado para {dataBr(e.fimEm)}</b> por {por}. Até essa data, o escritório usa o Portal normalmente.
          </>
        ) : e.situacao === "CONSULTA" ? (
          <>
            <b>Só leitura.</b> Contrato encerrado em {dataBr(e.fimEm)} por {por}. Ficha, contrato e equipe não mudam mais; notas e documentos continuam.
          </>
        ) : (
          <>
            <b>Só leitura.</b> Contrato encerrado em {dataBr(e.fimEm)}. O acesso do escritório fechou em {dataBr(e.acessoFechaEm)}. Reabrir devolve o acesso, até{" "}
            {dataBr(e.guardaAte)}.
          </>
        )}
      </p>
      <a href={`/clientes/${f.escritorio.id}/contrato#fim-contrato`}>
        <Icone nome="historico" className="ico ico-s" />
        Ver a linha do tempo
      </a>
    </div>
  );
}

/** Os três passos do estágio: Em implantação, Ativo e Encerrado. */
export function TrajetoTres({ f, desdeImplantacao }: { f: FichaDoCliente; desdeImplantacao: string }) {
  const e = f.encerramento;
  const encerrado = f.cliente.estagio === "ENCERRADO";
  const passouAtivo = f.cliente.estagio === "ATIVO" || (encerrado && e?.estagioAntes === "ATIVO");
  const implantacaoAgora = f.cliente.estagio === "IMPLANTACAO";
  return (
    <ol className="trajeto fc-tres">
      <li className={implantacaoAgora ? "agora" : "feito"} aria-current={implantacaoAgora ? "step" : undefined}>
        <span className="m">
          <Icone nome={implantacaoAgora ? "relogio" : "check"} className="ico" />
        </span>
        <strong>Em implantação</strong>
        desde {desdeImplantacao}
      </li>
      <li className={f.cliente.estagio === "ATIVO" ? "feito agora" : passouAtivo ? "feito" : undefined}
        aria-current={f.cliente.estagio === "ATIVO" ? "step" : undefined}>
        <span className="m">
          <Icone nome={passouAtivo ? "check" : "escritorios"} className="ico" />
        </span>
        <strong>Ativo</strong>
        {passouAtivo ? (encerrado ? "até o fim do contrato" : "Implantação concluída") : "Depois da implantação"}
      </li>
      <li className={encerrado ? "fc-fim agora" : "fc-fim"} aria-current={encerrado ? "step" : undefined}>
        <span className="m">
          <Icone nome={encerrado ? "cadeado" : "fim"} className="ico" />
        </span>
        <strong>Encerrado</strong>
        {encerrado && e ? `desde ${dataBr(e.fimEm)}` : e?.situacao === "MARCADO" ? `marcado para ${dataBr(e.fimEm)}` : "Só se o contrato terminar"}
      </li>
    </ol>
  );
}

/** A linha "Encerrar o contrato", separada por fio, no pé da folha Estágio. */
export function AcaoEncerrar({ f, aoAbrir }: { f: FichaDoCliente; aoAbrir: () => void }) {
  const pode = f.permissoes.includes(PODE_ENCERRAR);
  return (
    <div className="fc-acao">
      <span className="fc-ic" aria-hidden="true">
        <Icone nome="fim" className="ico" />
      </span>
      <div>
        <strong>Encerrar o contrato</strong>
        <p>Quando o escritório deixa de ser cliente. Nada é apagado: ele tem 30 dias para consultar e baixar os dados, e o T3jus guarda tudo por 5 anos.</p>
      </div>
      {pode ? (
        <button className="btn btn-perigo" type="button" onClick={aoAbrir}>
          <Icone nome="fim" className="ico" />
          Encerrar o contrato
        </button>
      ) : (
        <p className="permissao">
          <Icone nome="cadeado" className="ico" />
          Quem encerra o contrato é a Administração.
        </p>
      )}
    </div>
  );
}

/** O quadro "O que acontece e quando", com as datas calculadas da data digitada. */
function QuadroDatas({ fimEm }: { fimEm: string }) {
  const d = datasDoFim(fimEm);
  const [, , anoGuarda] = dataBr(d.guardaAte).split("/");
  return (
    <ol className="fc-mini" aria-label="O que acontece e quando">
      <li>
        <span className="d">
          {dataBr(d.fimEm)}
          <small>data do fim</small>
        </span>
        <span>
          O Portal do escritório passa a <b>só leitura</b>. A equipe dele consulta e baixa os dados; ninguém cria nem muda nada. Convites pendentes deixam de valer.
        </span>
      </li>
      <li>
        <span className="d">
          até {dataBr(d.consultaAte, true)}
          <small>30 dias</small>
        </span>
        <span>
          <b>Prazo para baixar os dados.</b> A sócia dona exporta pelo Portal.
        </span>
      </li>
      <li>
        <span className="d">
          {dataBr(d.acessoFechaEm, true)}
          <small>{dataBr(d.acessoFechaEm).slice(6)}</small>
        </span>
        <span>
          <b>O acesso fecha.</b> Nenhum dado é apagado: o escritório pode pedir uma cópia pelo contato do T3jus.
        </span>
      </li>
      <li>
        <span className="d">
          {dataBr(d.entradasAte, true)}
          <small>{dataBr(d.entradasAte).slice(6)}</small>
        </span>
        <span>
          <b>E-mail e senha</b> de quem só tinha este escritório são apagados (90 dias sem acesso). O nome fica como autor no histórico.
        </span>
      </li>
      <li className="fc-guarda">
        <span className="d">
          até {anoGuarda}
          <small>5 anos · {dataBr(d.guardaAte, true)}</small>
        </span>
        <span>
          <b>Fica guardado, só para a equipe T3jus:</b> clientes, atendimentos e pedidos de exclusão do escritório, o cadastro, as notas internas, os
          documentos e o histórico. Até aqui, a Administração pode reabrir.
        </span>
      </li>
    </ol>
  );
}

type ErrosEncerrar = { data?: boolean; motivo?: boolean; nome?: boolean };

/** Janela de encerrar (alertdialog): data, motivo e o nome do escritório para confirmar. */
export function JanelaEncerrar({ f, aberta, aoFechar, aoFeito }: {
  f: FichaDoCliente; aberta: boolean; aoFechar: () => void; aoFeito: () => void | Promise<void>;
}) {
  const ids = useId();
  const hoje = hojeIso();
  const [data, setData] = useState(dataBr(hoje));
  const [motivo, setMotivo] = useState("");
  const [nome, setNome] = useState("");
  const [erros, setErros] = useState<ErrosEncerrar>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fimEm = dataDigitada(data);
  const confere = nomeConfere(nome, f.escritorio.nome);
  const qtdErros = Object.values(erros).filter(Boolean).length;
  const conflito = erro?.codigo === "VERSION_CONFLICT";

  async function encerrar() {
    setErro(null);
    const novos: ErrosEncerrar = { data: !fimEm || fimEm < hoje, motivo: !motivo.trim(), nome: !confere };
    setErros(novos);
    if (novos.data || novos.motivo || novos.nome) {
      const primeiro = novos.data ? "data" : novos.motivo ? "motivo" : "nome";
      document.getElementById(`${ids}-${primeiro}`)?.focus();
      return;
    }
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/encerrar`, {
      metodo: "POST", corpo: { versao: f.cliente.versao, fimEm, motivo: motivo.trim(), nomeConfirmado: nome.trim() },
    });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setMotivo("");
    setNome("");
    await aoFeito();
  }

  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} alerta classe="fc-larga" sobretitulo="Encerrar contrato"
      titulo={`Encerrar o contrato da ${f.escritorio.nome}?`} descricao={`${ids}-d`} aoEnviar={() => void encerrar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} disabled={enviando} data-foco={!qtdErros || undefined}>
            {conflito ? "Fechar e conferir" : "Cancelar"}
          </button>
          <button className="btn fc-perigo-cheio" type="submit" aria-busy={enviando || undefined} aria-disabled={enviando || undefined}>
            {enviando ? <span className="fc-giro" aria-hidden="true" /> : <Icone nome={erro && !conflito ? "reenviar" : "fim"} className="ico" />}
            {enviando ? "Encerrando…" : conflito ? "Encerrar mesmo assim" : erro ? "Tentar de novo" : "Encerrar o contrato"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>O escritório deixa de ser cliente. Nada é apagado: são 30 dias só para consulta; depois o acesso fecha e o T3jus guarda os dados por 5 anos.</p>
      {enviando ? (
        <p className="sr" role="status">
          Encerrando o contrato…
        </p>
      ) : null}
      {qtdErros ? <Aviso tom="urgencia" titulo={faltaAcertar(qtdErros)}>O contrato não foi encerrado.</Aviso> : null}
      {conflito ? (
        <Aviso tom="urgencia" titulo="Alguém mudou este cliente enquanto a janela estava aberta.">
          Nada foi encerrado e o que você escreveu continua aqui. Feche para conferir o que mudou ou encerre mesmo assim.
        </Aviso>
      ) : erro ? (
        <Aviso tom="urgencia" titulo="Não deu para encerrar agora.">
          {`${textoDoErro(erro)} Nada mudou: o contrato continua ativo e o que você escreveu está aqui.`}
        </Aviso>
      ) : null}
      <div className="fc-duas">
        <div className="fc-col">
          <h3>O que acontece e quando</h3>
          <QuadroDatas fimEm={fimEm && fimEm >= hoje ? fimEm : hoje} />
          <p className="fc-nota">
            <Icone nome="ajuda" className="ico" />
            <span>São os prazos do inventário de dados. Os dados dos clientes ficam guardados com o resto, pelos 5 anos, e saem todos juntos no fim da guarda.</span>
          </p>
        </div>
        <div className="fc-col">
          <h3>O fim do contrato</h3>
          <div className="campo fc-campo-data">
            <label htmlFor={`${ids}-data`}>Último dia do contrato</label>
            <input className="entrada" id={`${ids}-data`} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" value={data}
              readOnly={enviando} onChange={(ev) => { setData(ev.target.value); setErros((x) => ({ ...x, data: false })); }} aria-invalid={erros.data || undefined}
              aria-describedby={descritoPor(erros.data && `${ids}-data-erro`, `${ids}-data-ajuda`)} />
            {erros.data ? (
              <ErroCampo id={`${ids}-data-erro`}>
                A data do fim é hoje ou depois. Se o contrato já terminou, use hoje: os 30 dias para baixar os dados contam a partir dela.
              </ErroCampo>
            ) : null}
            <p className="ajuda" id={`${ids}-data-ajuda`}>
              Dia, mês e ano (dd/mm/aaaa), hoje ou depois. Até essa data, tudo segue normal para o escritório. As datas do quadro “O que acontece e quando” mudam
              com ela.
            </p>
          </div>
          <div className="campo">
            <div className="fc-rot">
              <label htmlFor={`${ids}-motivo`}>Motivo</label>
              <span className="fc-contador" id={`${ids}-cont`}>
                {motivo.length} de {MAX_MOTIVO} caracteres
              </span>
            </div>
            <textarea className="entrada" id={`${ids}-motivo`} rows={3} maxLength={MAX_MOTIVO} aria-required="true" value={motivo} readOnly={enviando}
              onChange={(ev) => { setMotivo(ev.target.value); setErros((x) => ({ ...x, motivo: false })); }} aria-invalid={erros.motivo || undefined}
              aria-describedby={descritoPor(erros.motivo && `${ids}-motivo-erro`, `${ids}-motivo-ajuda`)} />
            {erros.motivo ? <ErroCampo id={`${ids}-motivo-erro`}>Escreva o motivo do fim. Ele fica no histórico do cliente.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-motivo-ajuda`}>
              Obrigatório. Fica no histórico do cliente, com seu nome e a data. O escritório não vê.
            </p>
          </div>
          <div className="fc-confirmar">
            <p>
              Para confirmar, escreva o nome do escritório: <span className="fc-nome">{f.escritorio.nome}</span>
            </p>
            <div className="campo">
              <label htmlFor={`${ids}-nome`}>Nome do escritório</label>
              <input className="entrada" id={`${ids}-nome`} type="text" autoComplete="off" spellCheck={false} value={nome} readOnly={enviando}
                onChange={(ev) => { setNome(ev.target.value); setErros((x) => ({ ...x, nome: false })); }} aria-invalid={erros.nome || undefined}
                aria-describedby={erros.nome ? `${ids}-nome-erro` : confere ? `${ids}-nome-ok` : undefined} />
              {erros.nome ? (
                <ErroCampo id={`${ids}-nome-erro`}>O nome não confere. Escreva exatamente: {f.escritorio.nome}.</ErroCampo>
              ) : confere ? (
                <p className="fc-confere" id={`${ids}-nome-ok`}>
                  <Icone nome="check" className="ico" />O nome confere.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Janela>
  );
}

type Passo = {
  quando: string;
  sub: string;
  icone: NomeIcone;
  titulo: string;
  texto: React.ReactNode;
  sai?: string[];
  fica?: string[];
  estado: "feito" | "agora" | "previsto";
};

const ROTULOS = { feito: ["e-feito", "Feito"], agora: ["e-agora", "Agora"], previsto: ["e-previsto", "Previsto"] } as const;

function passosDoFim(f: FichaDoCliente, e: EncerramentoConsole, hoje: string): Passo[] {
  const d = datasDoFim(e.fimEm);
  const marcado = e.situacao === "MARCADO";
  const fechado = e.situacao === "FECHADO";
  const entradasForam = hoje >= d.entradasAte;
  const exportou = e.exportadoEm ? (
    <>
      <b>Exportação:</b> feita em {dataHora(e.exportadoEm)}.
    </>
  ) : (
    <>
      <b>Exportação:</b> a sócia dona ainda não baixou os dados.
    </>
  );
  const est = (feito: boolean, agora: boolean): Passo["estado"] => (feito ? "feito" : agora ? "agora" : "previsto");
  return [
    {
      quando: dataBr(e.fimEm), sub: "Fim do contrato", icone: "fim", titulo: "Contrato encerrado",
      texto: `O Portal da ${f.escritorio.nome} passa a só leitura: a equipe do escritório consulta e baixa os dados, mas não cria nem muda nada. Convites pendentes deixam de valer.`,
      estado: est(!marcado, false),
    },
    {
      quando: `até ${dataBr(d.consultaAte, true)}`, sub: "30 dias", icone: "baixar", titulo: "Prazo para baixar os dados",
      texto: <>A sócia dona exporta tudo em Portal › Escritório › Exportar os dados. Reabrir o contrato desfaz tudo na hora. {exportou}</>,
      estado: est(fechado, e.situacao === "CONSULTA"),
    },
    {
      quando: dataBr(d.acessoFechaEm), sub: "Rotina da noite", icone: "cadeado", titulo: "O acesso do escritório fecha",
      texto: "Quem era da equipe do escritório não entra mais nele. Nenhum dado dos clientes é apagado: o T3jus guarda tudo, sem acesso do escritório, e ele pode pedir uma cópia pelo contato do T3jus.",
      sai: ["Sessões abertas"], fica: ["Clientes", "Atendimentos", "Pedidos de exclusão", "Quem tinha acesso e o que fez, no histórico"],
      estado: est(fechado, false),
    },
    {
      quando: dataBr(d.entradasAte), sub: "90 dias sem acesso", icone: "pessoa-menos", titulo: "E-mail e senha de quem só tinha este escritório",
      texto: "Quem tem outro escritório no T3jus continua entrando nele normalmente.",
      sai: ["E-mail e senha"], fica: ["O nome, como autor no histórico"],
      estado: est(entradasForam, fechado && !entradasForam),
    },
    {
      quando: dataBr(d.registrosAte), sub: "6 meses", icone: "historico", titulo: "Registros de entrada no sistema",
      texto: "Cada entrada sai 6 meses depois, o mínimo do Marco Civil (art. 15). A rotina já faz isso hoje.",
      sai: ["Registros de entrada"], estado: est(hoje >= d.registrosAte, false),
    },
    {
      quando: dataBr(e.guardaAte), sub: "5 anos depois", icone: "guardar", titulo: "Fim da guarda",
      texto: "Tudo o que o T3jus guardou do escritório e dos clientes dele sai 5 anos depois do fim do contrato. Daí em diante, não dá mais para reabrir.",
      sai: ["Clientes", "Atendimentos", "Pedidos de exclusão", "Contatos, endereço e CNPJ", "Notas internas", "Documentos e arquivos", "Histórico do escritório"],
      fica: ["O nome do escritório, no registro de que a guarda terminou"],
      estado: "previsto",
    },
  ];
}

/** Folha "Fim do contrato": a linha do tempo, reabrir (ou desmarcar) e a nota dos prazos. */
export function FolhaFim({ f, recarregar }: { f: FichaDoCliente; recarregar: () => Promise<void> }) {
  const ids = useId();
  const e = f.encerramento;
  const [aberta, setAberta] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);
  // Depois de reabrir ou desmarcar, a ficha volta sem o encerramento: fica só o aviso de feito.
  if (!e) return feito ? <Aviso tom="sucesso" titulo={feito}>O motivo ficou no histórico do cliente, com seu nome e a data.</Aviso> : null;
  const marcado = e.situacao === "MARCADO";
  const pode = f.permissoes.includes(PODE_ENCERRAR);
  const passos = passosDoFim(f, e, hojeIso());
  return (
    <>
      {feito ? <Aviso tom="sucesso" titulo={feito}>O motivo ficou no histórico do cliente, com seu nome e a data.</Aviso> : null}
      <section className="folha" aria-labelledby={`${ids}-t`} id="fim-contrato">
        <div className="folha-cab">
          <div>
            <h2 id={`${ids}-t`} tabIndex={-1}>
              Fim do contrato
            </h2>
            <p className="sub">{marcado ? `Nada mudou ainda. As datas abaixo contam a partir de ${dataBr(e.fimEm)}.` : "O que já aconteceu e o que vem, com as datas."}</p>
          </div>
        </div>
        <ol className="fc-linha">
          {passos.map((p) => {
            const [cls, rot] = ROTULOS[p.estado];
            return (
              <li key={p.titulo} className={p.estado} aria-current={p.estado === "agora" ? "step" : undefined}>
                <p className="fc-quando">
                  {p.quando}
                  <small>{p.sub}</small>
                </p>
                <span className="fc-m" aria-hidden="true">
                  <Icone nome={p.estado === "feito" ? "check" : p.estado === "agora" ? "relogio" : p.icone} className="ico" />
                </span>
                <div className="fc-oque">
                  <strong>
                    {p.titulo}
                    <span className={`fc-estado ${cls}`}>{rot}</span>
                  </strong>
                  <p>{p.texto}</p>
                  {p.sai?.length ? (
                    <p className="fc-sai">
                      <span>
                        <Icone nome="lixeira" className="ico ico-s" />
                        Apagado:
                      </span>
                      {p.sai.map((x) => (
                        <span key={x} className="selo fc-chip-sai">
                          {x}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {p.fica?.length ? (
                    <p className="fc-fica">
                      <span>
                        <Icone nome="guardar" className="ico ico-s" />
                        Fica:
                      </span>
                      {p.fica.map((x) => (
                        <span key={x} className="selo fc-chip-fica">
                          {x}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {pode ? (
          <div className="fc-reabrir">
            <span className="fc-ic">
              <Icone nome={marcado ? "relogio" : "abrir"} className="ico" />
            </span>
            <div>
              <strong>{marcado ? "Desmarcar o encerramento" : "Reabrir o contrato"}</strong>
              <p>
                {marcado
                  ? `Até ${dataBr(e.fimEm)} nada mudou para o escritório. Desmarcar cancela a data e as datas de apagar; o motivo fica no histórico.`
                  : e.situacao === "FECHADO"
                    ? `Até ${dataBr(e.guardaAte)}, enquanto os dados ficam guardados. Reabrir devolve o acesso: o escritório volta com os clientes e atendimentos de antes. Quem perdeu o e-mail e a senha (a partir de ${dataBr(e.entradasAte)}) volta por convite novo.`
                    : `Até ${dataBr(e.guardaAte)}, enquanto os dados ficam guardados. O escritório volta ao estágio de antes, o Portal volta ao normal na hora e as datas de apagar são canceladas.`}
              </p>
            </div>
            <button className="btn btn-sec" type="button" onClick={() => setAberta(true)}>
              <Icone nome={marcado ? "xis" : "abrir"} className="ico" />
              {marcado ? "Desmarcar" : "Reabrir o contrato"}
            </button>
          </div>
        ) : (
          <p className="permissao" style={{ margin: "0 24px 18px" }}>
            <Icone nome="cadeado" className="ico" />
            {marcado ? "Quem desmarca o encerramento é a Administração." : `Quem reabre o contrato é a Administração, até ${dataBr(e.guardaAte)}.`}
          </p>
        )}
        <p className="fc-pe-linha">
          <Icone nome="ajuda" className="ico" />
          <span>
            Os prazos são os do inventário de dados do T3jus. A rotina da noite aplica cada passo e registra no histórico o que fez, com a contagem. Só a equipe
            T3jus vê esta linha do tempo; o escritório vê o aviso no Portal.
          </span>
        </p>
      </section>
      <JanelaReabrir f={f} e={e} aberta={aberta} aoFechar={() => setAberta(false)}
        aoFeito={async (t) => { setAberta(false); setFeito(t); await recarregar(); }} />
    </>
  );
}

function JanelaReabrir({ f, e, aberta, aoFechar, aoFeito }: {
  f: FichaDoCliente; e: EncerramentoConsole; aberta: boolean; aoFechar: () => void; aoFeito: (titulo: string) => void | Promise<void>;
}) {
  const ids = useId();
  const marcado = e.situacao === "MARCADO";
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function reabrir() {
    setErro(null);
    if (!motivo.trim()) {
      setErroMotivo(true);
      document.getElementById(`${ids}-motivo`)?.focus();
      return;
    }
    setErroMotivo(false);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/reabrir`, { metodo: "POST", corpo: { versao: f.cliente.versao, motivo: motivo.trim() } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setMotivo("");
    await aoFeito(marcado ? `Encerramento da ${f.escritorio.nome} desmarcado.` : `Contrato da ${f.escritorio.nome} reaberto.`);
  }

  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} sobretitulo={marcado ? "Desmarcar encerramento" : "Reabrir contrato"}
      titulo={marcado ? `Desmarcar o encerramento da ${f.escritorio.nome}?` : `Reabrir o contrato da ${f.escritorio.nome}?`} descricao={`${ids}-d`}
      aoEnviar={() => void reabrir()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome={marcado ? "xis" : "abrir"} className="ico" />
            {enviando ? (marcado ? "Desmarcando…" : "Reabrindo…") : marcado ? "Desmarcar" : "Reabrir o contrato"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>
        {marcado ? "O escritório continua cliente e nada muda no Portal." : `Dá para reabrir até ${dataBr(e.guardaAte)}, enquanto os dados do escritório ficam guardados.`}
      </p>
      {!marcado ? (
        <div className="fc-passagem" aria-hidden="true">
          <span className="selo selo-enc">
            <Icone nome="cadeado" className="ico" />
            Encerrado
          </span>
          <Icone nome="seta" className="ico" />
          <span className="selo selo-ativo">
            <span className="bolinha" />
            {e.estagioAntes === "ATIVO" ? "Ativo" : "Em implantação"}
          </span>
        </div>
      ) : null}
      {erroMotivo ? <Aviso tom="urgencia" titulo={faltaAcertar(1)}>{marcado ? "O encerramento continua marcado." : "O contrato continua encerrado."}</Aviso> : null}
      {erro ? <Aviso tom="urgencia" titulo="Não deu para reabrir.">{textoDoErro(erro)}</Aviso> : null}
      {!marcado ? (
        <ul className="tratar" style={{ padding: 0, margin: 0 }}>
          <li>O Portal da {f.escritorio.nome} volta ao normal na hora, para toda a equipe do escritório.</li>
          <li>As datas de fechar o acesso e de apagar ({dataBr(e.acessoFechaEm)} e depois) são canceladas.</li>
          <li>Quem perdeu o e-mail e a senha (90 dias sem acesso) volta por convite novo.</li>
          <li>O encerramento e a reabertura ficam no histórico.</li>
        </ul>
      ) : null}
      <div className="campo">
        <label htmlFor={`${ids}-motivo`}>Motivo</label>
        <textarea className="entrada" id={`${ids}-motivo`} rows={3} maxLength={MAX_MOTIVO} aria-required="true" data-foco value={motivo}
          onChange={(ev) => setMotivo(ev.target.value)} aria-invalid={erroMotivo || undefined}
          aria-describedby={descritoPor(erroMotivo && `${ids}-motivo-erro`, `${ids}-motivo-ajuda`)} />
        {erroMotivo ? <ErroCampo id={`${ids}-motivo-erro`}>{marcado ? "Escreva o motivo. Ele fica no histórico." : "Escreva o motivo da reabertura. Ele fica no histórico."}</ErroCampo> : null}
        <p className="ajuda" id={`${ids}-motivo-ajuda`}>
          Obrigatório. Fica no histórico do cliente, com seu nome e a data.
        </p>
      </div>
    </Janela>
  );
}

