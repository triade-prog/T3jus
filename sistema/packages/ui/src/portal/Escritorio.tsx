"use client";
// Área Escritório do Portal (F1.7, PT-15), tela aprovada em
// docs/design/aprovadas/portal-v1/escritorio.html: os dados do escritório só para leitura
// (quem muda é a equipe T3jus nesta versão), "Seus escritórios" para quem está em mais de um
// e a exportação completa dos dados, só do sócio dono. Quem não é o dono vê "Quem cuida".

import { useEffect, useId, useRef, useState } from "react";
import { CONTATO_T3JUS } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, Carregando, ErroAoCarregar, Janela } from "../console/pecas.tsx";
import { formatarCnpj, formatarTelefone } from "../console/ficha.ts";
import { dataLonga, hora, iniciais } from "../console/tempo.ts";
import { listaAreas, primeiroNome } from "./equipe.ts";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal, type EscritorioPortal } from "./Moldura.tsx";

const LEVA = [
  "Dados do escritório e equipe",
  "Clientes e contatos",
  "Atendimentos e propostas",
  "Contratos e honorários",
  "Lançamentos, parcelas e repasses",
  "Casos, prazos e tarefas",
  "Agenda e conversas",
  "Histórico de mudanças",
];

/** "hoje, às 14h22" ou "17/11/2026, às 15h10". */
function quandoFoi(iso: string): string {
  return dataLonga(iso) === dataLonga(new Date().toISOString()) ? `hoje, às ${hora(iso)}` : `${dataLonga(iso)}, às ${hora(iso)}`;
}

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Nome do arquivo: o nome do escritório sem acento e a data. */
export function nomeArquivoExportacao(escritorio: string, iso: string): string {
  const base = escritorio
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "escritorio"}-${iso.slice(0, 10)}.json`;
}

function Dados({ e }: { e: EscritorioPortal }) {
  return (
    <section className="folha" aria-labelledby="t-dados" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-dados">
            <Icone nome="coluna" className="ico" />
            Dados do escritório
          </h2>
          <p className="sub">Cadastrados pela equipe T3jus na implantação</p>
        </div>
      </div>
      <dl className="dados-ficha">
        <div className="inteira">
          <dt>Nome</dt>
          <dd>{e.nome}</dd>
        </div>
        <div>
          <dt>CNPJ</dt>
          <dd className="num">{e.cnpj ? formatarCnpj(e.cnpj) : "Não informado"}</dd>
        </div>
        <div>
          <dt>Cidade e UF</dt>
          <dd>{e.cidade ? `${e.cidade}${e.uf ? `, ${e.uf}` : ""}` : "Não informado"}</dd>
        </div>
        <div className="inteira">
          <dt>Endereço</dt>
          <dd>{e.endereco || "Não informado"}</dd>
        </div>
      </dl>
      {e.contatos.length ? (
        <>
          <h3 className="sr">Contatos</h3>
          <ul className="lista" aria-label="Contatos do escritório">
            {e.contatos.map((c, i) => (
              <li key={`${c.nome}-${i}`} className="contato">
                <div>
                  <strong>{c.nome}</strong>
                  {c.papel ? <small>{c.papel}</small> : null}
                </div>
                {c.telefone ? (
                  <a href={`tel:${c.telefone}`}>
                    <Icone nome="telefone" className="ico" />
                    {formatarTelefone(c.telefone)}
                  </a>
                ) : null}
                {c.email ? (
                  <a href={`mailto:${c.email}`}>
                    <Icone nome="envelope" className="ico" />
                    {c.email}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {e.encerramento ? (
        <div className="pt-muda">
          <Icone nome="cadeado" className="ico" />
          <p>
            Só consulta até {diaBr(e.encerramento.consultaAte)}. Os dados do escritório não mudam mais. Dúvidas? <a href={`mailto:${CONTATO_T3JUS}`}>Fale com o T3jus</a>.
          </p>
        </div>
      ) : (
        <div className="pt-muda">
          <Icone nome="ajuda" className="ico" />
          <p>
            Nesta versão, quem muda estes dados é a equipe T3jus. Precisa corrigir algo? <a href={ROTAS_PORTAL.ajuda}>Fale com a equipe T3jus</a> pela Ajuda, e a
            mudança aparece aqui.
          </p>
        </div>
      )}
    </section>
  );
}

interface OutroEscritorio {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
}

function SeusEscritorios({ e }: { e: EscritorioPortal }) {
  const [lista, setLista] = useState<(OutroEscritorio & { funcoes: string[] })[] | null>(null);
  useEffect(() => {
    let vivo = true;
    void Promise.all([
      chamarPortal<{ escritorios: OutroEscritorio[] }>("/v1/sessao/escolha"),
      chamarPortal<{ escritorios: { id: string; funcoes: string[] }[] }>("/v1/sessao"),
    ]).then(([a, b]) => {
      if (!vivo || !a.ok) return;
      const funcoes = new Map(b.ok ? b.dados.escritorios.map((x) => [x.id, x.funcoes]) : []);
      setLista(a.dados.escritorios.map((x) => ({ ...x, funcoes: funcoes.get(x.id) ?? [] })));
    });
    return () => {
      vivo = false;
    };
  }, []);

  const total = e.outrosEscritorios + 1;
  const papel = (x: OutroEscritorio & { funcoes: string[] }) => {
    if (x.id === e.id) return e.dono ? "sócio dono" : e.areas.length ? `${e.areas.length === 1 ? "área" : "áreas"}: ${listaAreas(e.areas)}` : "só as partes comuns";
    return x.funcoes.includes("SOCIO") ? "sócio" : "equipe";
  };
  return (
    <section className="folha" aria-labelledby="t-escs" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-escs">
            <Icone nome="trocar" className="ico" />
            Seus escritórios
          </h2>
          <p className="sub">Você está em {total} escritórios</p>
        </div>
      </div>
      {lista ? (
        <ul className="pt-lista-esc">
          {lista.map((x) => (
            <li key={x.id}>
              <div>
                <strong>{x.nome}</strong>
                <small>
                  {x.cidade ? `${x.cidade}${x.uf ? `, ${x.uf}` : ""} · ` : ""}
                  {papel(x)}
                </small>
              </div>
              {x.id === e.id ? (
                <span className="selo selo-ok">
                  <Icone nome="check" className="ico" />
                  Aberto agora
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="pt-acao-folha">
        <a className="btn btn-sec" href={ROTAS_PORTAL.escolher}>
          <Icone nome="trocar" className="ico" />
          Trocar de escritório
        </a>
        <p className="pt-ultima">A troca abre a mesma tela de escolha da entrada. Em cada escritório, você vê só o que aquele escritório liberou.</p>
      </div>
    </section>
  );
}

const diaBr = (iso: string, curta = false) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
};

/** Dias até o acesso fechar, contando hoje (horário de Brasília). */
export function diasParaFechar(acessoFechaEm: string, agora: Date = new Date()): number {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
  return Math.max(0, Math.round((Date.parse(`${acessoFechaEm}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000));
}

/** O aviso do fim do contrato, no alto da página Escritório (F0.14). */
function AvisoFim({ e, aoBaixar }: { e: EscritorioPortal; aoBaixar: () => void }) {
  const d = e.encerramento!;
  const n = diasParaFechar(d.acessoFechaEm);
  const urgente = n <= 3;
  const dona = e.socios[0];
  const exportou = e.dono && e.ultimaExportacao && e.ultimaExportacao.em >= d.fimEm ? e.ultimaExportacao : null;
  const baixados = !!(d.exportadoEm || exportou);
  return (
    <section className={`fc-aviso-fim${urgente ? " fc-urgente" : ""}`} aria-labelledby="t-fim-portal" role="region">
      <p className="fc-conta" aria-hidden="true">
        <b>{n}</b>
        <small>{n === 1 ? "dia" : "dias"}</small>
      </p>
      <div className="fc-corpo">
        <p className="sobretitulo">Fim do contrato</p>
        <h2 id="t-fim-portal">
          {urgente ? `${n === 1 ? "Falta 1 dia" : `Faltam ${n} dias`} para baixar os dados` : `O contrato com o T3jus terminou em ${diaBr(d.fimEm)}`}
        </h2>
        {urgente ? (
          <p className="fc-txt">
            Em <b>{diaBr(d.acessoFechaEm)}</b>, o acesso ao Portal fecha para toda a equipe; os dados ficam guardados pelo T3jus por 5 anos.{" "}
            {baixados ? "Os dados já foram baixados." : e.dono ? "Você ainda não baixou os dados." : `${dona ?? "O sócio dono"}, quem cuida do escritório, ainda não baixou os dados.`}
          </p>
        ) : (
          <p className="fc-txt">
            Até <b>{diaBr(d.consultaAte)}</b>, o Portal fica só para consulta: dá para ver tudo e baixar os dados, mas ninguém cria nem muda nada. Em{" "}
            <b>{diaBr(d.acessoFechaEm, true)}</b>, o acesso fecha para toda a equipe. Os dados ficam guardados pelo T3jus por 5 anos, e o escritório pode pedir uma
            cópia nesse período pelo contato do T3jus.
          </p>
        )}
        <p className="fc-datas">
          <span>
            <Icone nome="cadeado" className="ico" />
            Só consulta: <b>{diaBr(d.fimEm, true)} a {diaBr(d.consultaAte)}</b>
          </span>
          <span>
            <Icone nome="cadeado" className="ico" />
            Acesso fecha: <b>{diaBr(d.acessoFechaEm)}</b>
          </span>
          <span>
            <Icone nome="guardar" className="ico" />
            Dados guardados pelo T3jus até <b>{diaBr(d.guardaAte)}</b>
          </span>
        </p>
        <p className="sr">
          {n === 1 ? "Falta 1 dia" : `Faltam ${n} dias`} para o acesso fechar.
        </p>
      </div>
      <div className="fc-botoes">
        {e.dono ? (
          <>
            <button className="btn btn-pri" type="button" onClick={aoBaixar}>
              <Icone nome="baixar" className="ico" />
              Baixar os dados
            </button>
            <a className="btn btn-sec" href={`mailto:${CONTATO_T3JUS}`}>
              <Icone nome="envelope" className="ico" />
              Falar com o T3jus
            </a>
            <small>
              {exportou
                ? `Última exportação: ${quandoFoi(exportou.em)}, por ${exportou.por === e.pessoa ? "você" : (exportou.por ?? "alguém da equipe")}`
                : "Arquivo JSON com tudo o que o escritório guardou"}
            </small>
          </>
        ) : (
          <>
            <p className="fc-leitura">
              <Icone nome="cadeado" className="ico" />
              {`Quem baixa os dados é ${dona ?? "o sócio dono"}, quem cuida do escritório.`}
            </p>
            <a className="btn btn-sec" href={`mailto:${CONTATO_T3JUS}`}>
              <Icone nome="envelope" className="ico" />
              Falar com o T3jus
            </a>
          </>
        )}
      </div>
    </section>
  );
}

type Fase = { tipo: "pronto" } | { tipo: "gerando" } | { tipo: "ok"; nome: string; bytes: number } | { tipo: "erro"; erro: ErroApi };

function salvarArquivo(url: string, nome: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
}

function Exportar({ e, aoExportar, abrirRef }: { e: EscritorioPortal; aoExportar: () => void; abrirRef?: { current: (() => void) | null } }) {
  const ids = useId();
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    if (!abrirRef) return;
    abrirRef.current = () => setAberta(true);
    return () => {
      abrirRef.current = null;
    };
  }, [abrirRef]);
  const [fase, setFase] = useState<Fase>({ tipo: "pronto" });
  // O arquivo fica na memória da página: "Salvar de novo" não gera outra exportação.
  const arquivo = useRef<{ url: string; nome: string } | null>(null);
  useEffect(() => () => {
    if (arquivo.current) URL.revokeObjectURL(arquivo.current.url);
  }, []);

  async function exportar() {
    setAberta(false);
    setFase({ tipo: "gerando" });
    const r = await chamarPortal<Record<string, unknown>>("/v1/escritorio/exportacao", { corpo: {} });
    if (!r.ok) return setFase({ tipo: "erro", erro: r.erro });
    const texto = JSON.stringify(r.dados, null, 2);
    const blob = new Blob([texto], { type: "application/json" });
    if (arquivo.current) URL.revokeObjectURL(arquivo.current.url);
    const nome = nomeArquivoExportacao(e.nome, String(r.dados.geradoEm ?? new Date().toISOString()));
    arquivo.current = { url: URL.createObjectURL(blob), nome };
    salvarArquivo(arquivo.current.url, nome);
    setFase({ tipo: "ok", nome, bytes: blob.size });
    aoExportar();
  }

  const ultima = e.ultimaExportacao ? (
    <p className="pt-ultima">
      Última exportação: <b>{quandoFoi(e.ultimaExportacao.em)}</b>, por {e.ultimaExportacao.por === e.pessoa ? "você" : e.ultimaExportacao.por ?? "alguém da equipe"}.
      {fase.tipo === "ok" ? " Ficou no histórico da equipe." : null}
    </p>
  ) : (
    <p className="pt-ultima">Os dados ainda não foram exportados.</p>
  );

  return (
    <section className="folha" aria-labelledby="t-exp" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-exp">
            <Icone nome="baixar" className="ico" />
            Exportar os dados
          </h2>
          <p className="sub">Só o sócio dono · arquivo JSON completo</p>
        </div>
      </div>
      <div className="pt-acao-folha">
        <p>
          Baixe uma cópia de tudo o que o escritório guardou no T3jus. Serve para guardar com você ou levar para outro sistema. Senhas e códigos de acesso não vão
          no arquivo.
        </p>
        <ul className="pt-leva" aria-label="O que vai no arquivo">
          {LEVA.map((x) => (
            <li key={x}>
              <Icone nome="check" className="ico" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
        {fase.tipo === "gerando" ? (
          <>
            <div className="pt-gerando" role="status">
              <p>
                <b>Gerando o arquivo…</b> Pode levar alguns segundos. Deixe esta página aberta.
              </p>
              <div className="pt-barra-indet" aria-hidden="true" />
            </div>
            <button className="btn btn-pri" type="button" aria-busy="true" aria-disabled="true">
              Gerando o arquivo…
            </button>
          </>
        ) : fase.tipo === "ok" ? (
          <Aviso tom="sucesso" titulo="Arquivo baixado."
            acoes={
              <button className="btn btn-sec btn-compacto" type="button" onClick={() => arquivo.current && salvarArquivo(arquivo.current.url, arquivo.current.nome)}>
                <Icone nome="baixar" className="ico ico-s" />
                Salvar de novo
              </button>
            }>
            {fase.nome}, {tamanho(fase.bytes)}, na pasta de downloads deste aparelho. Guarde em lugar seguro: ele tem dados pessoais dos seus clientes.
          </Aviso>
        ) : fase.tipo === "erro" ? (
          <Aviso tom="urgencia" titulo="Não deu para gerar o arquivo."
            acoes={
              <button className="btn btn-pri btn-compacto" type="button" onClick={() => setAberta(true)}>
                <Icone nome="reenviar" className="ico ico-s" />
                Tentar de novo
              </button>
            }>
            {textoDoErro(fase.erro)} Nada foi baixado e nada mudou no escritório.
          </Aviso>
        ) : (
          <button className="btn btn-pri" type="button" onClick={() => setAberta(true)}>
            <Icone nome="baixar" className="ico" />
            Exportar os dados
          </button>
        )}
        {ultima}
      </div>
      <Janela id={`${ids}-j`} aberta={aberta} aoFechar={() => setAberta(false)} sobretitulo="Escritório" descricao={`${ids}-d`}
        titulo={`Exportar os dados da ${e.nome}?`} aoEnviar={() => void exportar()}
        pe={
          <>
            <button className="btn btn-fantasma" type="button" onClick={() => setAberta(false)}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" data-foco>
              <Icone nome="baixar" className="ico" />
              Exportar e baixar
            </button>
          </>
        }>
        <p id={`${ids}-d`}>Vamos gerar um arquivo JSON com tudo o que o escritório guardou no T3jus e baixar neste aparelho.</p>
        <p className="pt-cuidado">
          <Icone nome="cadeado" className="ico" />
          <span>O arquivo tem dados pessoais dos seus clientes. Guarde em lugar seguro e não mande por e-mail ou WhatsApp sem necessidade.</span>
        </p>
        <p className="pt-comuns">
          <Icone nome="historico" className="ico" />
          <span>A exportação fica no histórico da equipe, com seu nome e a hora.</span>
        </p>
      </Janela>
    </section>
  );
}

function QuemCuida({ e }: { e: EscritorioPortal }) {
  const dono = e.socios[0];
  return (
    <section className="folha" aria-labelledby="t-cuida" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-cuida">
            <Icone nome="cracha" className="ico" />
            Quem cuida do escritório
          </h2>
        </div>
      </div>
      {dono ? (
        <ul className="pt-lista-esc">
          <li>
            <span className="av-p forte" aria-hidden="true">
              {iniciais(dono)}
            </span>
            <div>
              <strong>{dono}</strong>
              <small>Sócio dono · libera as áreas e convida a equipe</small>
            </div>
          </li>
        </ul>
      ) : null}
      <div className="pt-acao-folha">
        <p className="pt-ultima">Precisa de outra área ou de uma mudança na equipe? Fale com {dono ? primeiroNome(dono) : "o sócio dono"}.</p>
      </div>
    </section>
  );
}

export function EscritorioDoPortal() {
  const { escritorio: e, erro, recarregar } = useEscritorioPortal();
  const abrirExportar = useRef<(() => void) | null>(null);
  const trilha = [{ nome: "Escritório" }];
  return (
    <MolduraPortal atual="escritorio" trilha={trilha} escritorio={e} pagina="co-equipe">
      <div className="cabeca-ambar campo-ambar cabeca-equipe">
        <div>
          <p className="sobretitulo">Escritório</p>
          <h1>{e?.nome ?? "Escritório"}</h1>
          <span className="fio" aria-hidden="true" />
          <p className="lede">Os dados que aparecem nos contratos, nas procurações e no Portal.</p>
        </div>
      </div>
      {erro ? (
        <ErroAoCarregar oque="os dados do escritório" aoTentar={recarregar}
          texto="O servidor não respondeu. Nada do que estava guardado se perdeu. Tente de novo em instantes." />
      ) : !e ? (
        <Carregando rotulo="Carregando os dados do escritório…" linhas={4} />
      ) : (
        <div className="pt-grade">
          {e.encerramento ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <AvisoFim e={e} aoBaixar={() => abrirExportar.current?.()} />
            </div>
          ) : null}
          <div className="pt-col">
            <Dados e={e} />
          </div>
          <div className="pt-col">
            {e.outrosEscritorios > 0 ? <SeusEscritorios e={e} /> : null}
            {e.dono ? <Exportar e={e} aoExportar={recarregar} abrirRef={abrirExportar} /> : <QuemCuida e={e} />}
          </div>
        </div>
      )}
    </MolduraPortal>
  );
}
