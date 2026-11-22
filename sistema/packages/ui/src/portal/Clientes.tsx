"use client";
// Lista de clientes do escritório (AP-01, AP-04, AP-06), tela aprovada em
// docs/design/aprovadas/portal-clientes. Todos da equipe abrem; quem não tem a área Comercial
// recebe a lista sem origem nem próximo contato (o servidor já manda assim) e vê uma linha
// dizendo quem libera. A busca olha nome, contatos e, só pelos dígitos, CPF, CNPJ e telefone.

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { hojeBrasilia, ORIGENS, TIPOS_CLIENTE, type ClienteLinha, type ListaClientes } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Carregando, ErroAoCarregar, Estado } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { dataBr, rotuloProx } from "./clientes.ts";
import { ROTAS_IMPORTACAO } from "./importacao.ts";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";

export type FiltroClientes = "ativos" | "inativos" | "vencidos";
const API = "/v1/escritorio/clientes";

/** Realça o termo buscado no texto (sem HTML: pedaços com <mark>). */
function Marca({ texto, termo }: { texto: string; termo: string }) {
  const t = termo.trim();
  if (!t) return <>{texto}</>;
  const i = texto.toLowerCase().indexOf(t.toLowerCase());
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark className="cl-m">{texto.slice(i, i + t.length)}</mark>
      {texto.slice(i + t.length)}
    </>
  );
}

export function SeloSituacao({ situacao }: { situacao: ClienteLinha["situacao"] }) {
  if (situacao === "ARQUIVADO") {
    return (
      <span className="selo selo-excl">
        <Icone nome="pasta" className="ico" />
        Arquivado
      </span>
    );
  }
  if (situacao === "EXCLUIDO") {
    return (
      <span className="selo selo-excl">
        <Icone nome="escudo" className="ico" />
        Excluído
      </span>
    );
  }
  return situacao === "ATIVO" ? (
    <span className="selo selo-ok">
      <Icone nome="check" className="ico" />
      Ativo
    </span>
  ) : (
    <span className="selo selo-neutro">
      <Icone nome="pasta" className="ico" />
      Inativo
    </span>
  );
}

function Prox({ c, hoje }: { c: ClienteLinha; hoje: string }) {
  const p = c.proxContato;
  if (!p) return <span className="cl-sem">Sem próximo contato</span>;
  const r = rotuloProx(p, hoje);
  const com = <small>com {p.responsavel.nome}</small>;
  if (r.tipo === "vencido") {
    return (
      <div className="cl-prox">
        <span className="selo selo-urgente">
          <Icone nome="alerta" className="ico" />
          {r.data} · {r.rotulo}
        </span>
        {com}
      </div>
    );
  }
  if (r.tipo === "hoje") {
    return (
      <div className="cl-prox">
        <span className="selo selo-atencao">
          <Icone nome="relogio" className="ico" />
          Hoje
        </span>
        {com}
      </div>
    );
  }
  return (
    <div className="cl-prox">
      <b className="num">
        {r.data} · {r.rotulo}
      </b>
      {com}
    </div>
  );
}

const vencido = (c: ClienteLinha) => c.situacao === "ATIVO" && !!c.proxContato?.vencido;

export function ListaClientesPortal({ termoInicial = "", filtroInicial = "ativos", importacao, juntados = false }: {
  termoInicial?: string; filtroInicial?: FiltroClientes; importacao?: string; juntados?: boolean;
}) {
  const ids = useId();
  const { escritorio, erro: erroEscritorio, recarregar } = useEscritorioPortal();
  const [termo, setTermo] = useState(termoInicial);
  const [buscado, setBuscado] = useState(termoInicial.trim());
  const [filtro, setFiltro] = useState<FiltroClientes>(filtroInicial);
  const [ativos, setAtivos] = useState<ListaClientes | null>(null);
  const [inativos, setInativos] = useState<ClienteLinha[] | null>(null);
  const [achados, setAchados] = useState<ClienteLinha[] | null>(null);
  const [erro, setErro] = useState(false);
  // O filtro "Desta importação" (F3.55): os clientes que vieram de uma planilha.
  const [daImportacao, setDaImportacao] = useState<(ListaClientes & { importacao: { id: string; arquivo: string; em: string } }) | null>(null);
  const busca = useRef<HTMLInputElement>(null);
  const hoje = hojeBrasilia();

  const carregar = useCallback(async () => {
    setErro(false);
    const [a, i] = await Promise.all([
      chamarPortal<ListaClientes>(`${API}?situacao=ATIVO`),
      chamarPortal<ListaClientes>(`${API}?situacao=INATIVO`),
    ]);
    if (!a.ok || !i.ok) return setErro(true);
    setAtivos(a.dados);
    setInativos(i.dados.clientes);
    if (importacao) {
      const d = await chamarPortal<ListaClientes & { importacao: { id: string; arquivo: string; em: string } }>(
        `/v1/escritorio/importacoes/${encodeURIComponent(importacao)}/clientes${juntados ? "?juntados=1" : ""}`);
      if (!d.ok) return setErro(true);
      setDaImportacao(d.dados);
    }
  }, [importacao, juntados]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  // Busca com uma pausa curta depois de digitar; o servidor procura em ativos e inativos.
  useEffect(() => {
    const t = termo.trim();
    const espera = setTimeout(() => setBuscado(t), t ? 300 : 0);
    return () => clearTimeout(espera);
  }, [termo]);
  useEffect(() => {
    let vivo = true;
    if (!buscado) {
      void Promise.resolve().then(() => vivo && setAchados(null));
    } else {
      void chamarPortal<ListaClientes>(`${API}?q=${encodeURIComponent(buscado)}`).then((r) => {
        if (!vivo) return;
        if (r.ok) setAchados(r.dados.clientes);
        else setErro(true);
      });
    }
    return () => {
      vivo = false;
    };
  }, [buscado]);

  // O endereço guarda a busca e o filtro, para voltar da ficha ao mesmo lugar.
  useEffect(() => {
    const u = new URL(window.location.href);
    if (buscado) u.searchParams.set("q", buscado);
    else u.searchParams.delete("q");
    if (filtro !== "ativos") u.searchParams.set("filtro", filtro);
    else u.searchParams.delete("filtro");
    window.history.replaceState(null, "", u);
  }, [buscado, filtro]);

  const comercial = ativos?.comercial ?? false;
  const vencidos = useMemo(() => (ativos?.clientes ?? []).filter(vencido), [ativos]);
  const lista: ClienteLinha[] | null = buscado
    ? achados
    : importacao
      ? daImportacao?.clientes ?? null
    : !ativos || !inativos
      ? null
      : filtro === "inativos"
        ? inativos
        : filtro === "vencidos" && comercial
          ? [...vencidos].sort((x, y) => (x.proxContato!.em < y.proxContato!.em ? -1 : 1))
          : ativos.clientes;

  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  let contagem: ReactNode = null;
  if (lista && lista.length) {
    if (buscado) contagem = <><b>{plural(lista.length, "cliente", "clientes")}</b> para “{buscado}”{/\d/.test(buscado) ? "" : ", no nome ou em um contato"}</>;
    else if (importacao && daImportacao) contagem = (
      <>
        <b>{plural(lista.length, juntados ? "cadastro completado" : "cliente", juntados ? "cadastros completados" : "clientes")}</b>
        {` ${juntados ? "pela" : "da"} importação de ${daImportacao.importacao.arquivo}. `}
        <a href={ROTAS_PORTAL.clientes}>Ver todos os clientes</a>
      </>
    );
    else if (filtro === "inativos") {
      const exc = lista.filter((c) => c.situacao === "EXCLUIDO").length;
      const arq = lista.filter((c) => c.situacao === "ARQUIVADO").length;
      const partes = [exc ? (exc === 1 ? "1 deles excluído" : `${exc} deles excluídos`) : "", arq ? (arq === 1 ? "1 deles arquivado" : `${arq} deles arquivados`) : ""].filter(Boolean);
      contagem = partes.length ? (
        <><b>{plural(lista.length, "cliente inativo", "clientes inativos")}</b>, {partes.join(" e ")} a pedido (LGPD). Nada some em silêncio: o excluído fica só com o registro, sem dado pessoal, e o arquivado fica com os dados, só leitura.</>
      ) : (
        <><b>{plural(lista.length, "cliente inativo", "clientes inativos")}</b>. Nada foi apagado: abra a ficha para ver ou reativar.</>
      );
    }
    else if (filtro === "vencidos") contagem = <><b>{plural(lista.length, "cliente", "clientes")}</b> com o próximo contato vencido, do mais atrasado para o mais recente</>;
    else contagem = (
      <>
        <b>{plural(lista.length, "cliente ativo", "clientes ativos")}</b>
        {comercial && vencidos.length ? ` · ${plural(vencidos.length, "com o próximo contato vencido", "com o próximo contato vencido")}` : ""}
      </>
    );
  }

  const trilha = [{ nome: "Clientes" }];
  if (erroEscritorio) {
    return (
      <MolduraPortal atual="clientes" trilha={trilha} escritorio={null}>
        <ErroAoCarregar oque="os clientes" aoTentar={recarregar} />
      </MolduraPortal>
    );
  }

  const dona = escritorio?.socios[0];
  const semNada = !buscado && ativos && inativos && !ativos.clientes.length && !inativos.length;
  const chips: [FiltroClientes, ReactNode][] = [
    ["ativos", `Ativos${ativos ? ` (${ativos.clientes.length})` : ""}`],
    ["inativos", `Inativos${inativos ? ` (${inativos.length})` : ""}`],
  ];
  if (comercial) {
    chips.push(["vencidos", <Fragment key="v"><Icone nome="alerta" className="ico ico-s" />Contato vencido ({vencidos.length})</Fragment>]);
  }

  const ferramentas = (
    <form className="cl-ferr" role="search" aria-busy={lista === null ? true : undefined} onSubmit={(e) => { e.preventDefault(); setBuscado(termo.trim()); }}>
      <div className="campo-busca">
        <label className="sr" htmlFor={`${ids}-busca`}>
          Buscar por nome, CPF, CNPJ ou telefone
        </label>
        <Icone nome="busca" className="ico" />
        <input ref={busca} className="entrada" id={`${ids}-busca`} type="search" placeholder="Nome, CPF, CNPJ ou telefone" autoComplete="off"
          spellCheck={false} value={termo} onChange={(e) => setTermo(e.target.value)} maxLength={120} />
      </div>
      <div className="chips" role="group" aria-label="Mostrar">
        {chips.map(([k, t]) => (
          <button key={k} type="button" aria-pressed={!buscado && filtro === k}
            onClick={() => { setTermo(""); setBuscado(""); setFiltro(k); }}>
            {t}
          </button>
        ))}
      </div>
    </form>
  );

  const hrefFicha = (c: ClienteLinha) => `${ROTAS_PORTAL.clientes}/${c.id}`;
  const tabela = lista && lista.length ? (
    <>
      <table className="so-pc cl-tab">
        <caption className="sr">Clientes</caption>
        <colgroup>
          {comercial ? (
            <>
              <col style={{ width: "26%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "13%" }} />
            </>
          ) : (
            <>
              <col style={{ width: "42%" }} />
              <col style={{ width: "40%" }} />
              <col style={{ width: "18%" }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th scope="col">Contato principal</th>
            {comercial ? (
              <>
                <th scope="col">Origem</th>
                <th scope="col">Próximo contato</th>
              </>
            ) : null}
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => {
            const ct = c.contatoPrincipal;
            return (
              <tr key={c.id} className={comercial && vencido(c) ? "cl-venc" : c.situacao === "EXCLUIDO" ? "pd-excl" : c.situacao === "INATIVO" || c.situacao === "ARQUIVADO" ? "cl-off" : undefined}>
                <td>
                  <div className="esc">
                    <span className={c.situacao === "ATIVO" ? "av-p forte" : "av-p"} aria-hidden="true">
                      {c.situacao === "EXCLUIDO" ? <Icone nome="escudo" className="ico ico-s" /> : iniciais(c.nome)}
                    </span>
                    <div>
                      <a href={hrefFicha(c)}>
                        <Marca texto={c.nome} termo={buscado} />
                      </a>
                      <small>{TIPOS_CLIENTE[c.tipo]}{c.exclusao ? ` · protocolo ${c.exclusao.protocolo}` : c.arquivamento ? ` · protocolo ${c.arquivamento.protocolo}` : ""}</small>
                    </div>
                  </div>
                </td>
                <td>
                  {c.exclusao ? <span className="cl-sem">Excluído a pedido (LGPD) em {dataBr(c.exclusao.em)}</span> : null}
                  {c.arquivamento ? <span className="cl-sem">Arquivado a pedido (LGPD) em {dataBr(c.arquivamento.em)}</span> : null}
                  {ct ? (
                    <div className="cl-ct">
                      <strong>
                        <Marca texto={ct.nome} termo={buscado} />
                        {ct.papel ? <span style={{ fontWeight: 400, color: "var(--texto-2)" }}> · {ct.papel}</span> : null}
                      </strong>
                      <small className="num">{ct.telefone ? formatarTelefone(ct.telefone) : (ct.email ?? "")}</small>
                    </div>
                  ) : null}
                </td>
                {comercial ? (
                  <>
                    <td>{c.origem ? ORIGENS[c.origem] : <span className="cl-sem">—</span>}</td>
                    <td>{c.situacao === "ATIVO" ? <Prox c={c} hoje={hoje} /> : <span className="cl-sem">—</span>}</td>
                  </>
                ) : null}
                <td>
                  <SeloSituacao situacao={c.situacao} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="cartoes so-cel" aria-label="Clientes">
        {lista.map((c) => {
          const ct = c.contatoPrincipal;
          const venc = comercial && vencido(c);
          return (
            <li key={c.id} className={venc ? "cartao cl-venc" : "cartao"}>
              <div className="c-topo">
                <span className={c.situacao === "ATIVO" ? "av-p forte" : "av-p"} aria-hidden="true">
                  {c.situacao === "EXCLUIDO" ? <Icone nome="escudo" className="ico ico-s" /> : iniciais(c.nome)}
                </span>
                <div>
                  <a className="c-nome" href={hrefFicha(c)}>
                    <Marca texto={c.nome} termo={buscado} />
                  </a>
                  <small>
                    {c.exclusao
                      ? `Excluído a pedido (LGPD) em ${dataBr(c.exclusao.em)}`
                      : c.arquivamento
                        ? `Arquivado a pedido (LGPD) em ${dataBr(c.arquivamento.em)}`
                        : TIPOS_CLIENTE[c.tipo]}
                  </small>
                </div>
                <Icone nome="dir" className="ico c-ir" />
              </div>
              <dl className="c-dados">
                {ct ? (
                  <>
                    <dt>Contato</dt>
                    <dd>
                      {ct.nome} ·{" "}
                      <span className="num" style={{ whiteSpace: "nowrap" }}>
                        {ct.telefone ? formatarTelefone(ct.telefone) : (ct.email ?? "")}
                      </span>
                    </dd>
                  </>
                ) : null}
                {comercial ? (
                  <>
                    <dt>Origem</dt>
                    <dd>{c.origem ? ORIGENS[c.origem] : "—"}</dd>
                  </>
                ) : null}
              </dl>
              {c.situacao !== "ATIVO" || comercial ? (
                <div className="c-selos">
                  {c.situacao !== "ATIVO" ? <SeloSituacao situacao={c.situacao} /> : null}
                  {comercial && c.situacao === "ATIVO" ? <Prox c={c} hoje={hoje} /> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  ) : null;

  const peSemComercial = ativos && !comercial ? (
    <p className="pt-pe-folha">
      <Icone nome="cadeado" className="ico" />
      <span>
        Origem, próximo contato e histórico de atendimento ficam na área Comercial, que não está liberada para você.
        {dona ? ` Quem libera as áreas é ${dona}.` : " Quem libera as áreas é o sócio dono."}
      </span>
    </p>
  ) : null;

  return (
    <MolduraPortal atual="clientes" trilha={trilha} escritorio={escritorio} pagina="co-equipe co-carteira">
      <div className="cl">
        <div className="cabeca-ambar campo-ambar cabeca-equipe cl-cab-lista">
          <div>
            <p className="sobretitulo">Cadastro único</p>
            <h1>Clientes</h1>
            <span className="fio" aria-hidden="true" />
            <p className="lede">
              {ativos && !comercial
                ? "Quem o escritório atende: contatos e a qualificação para procuração e contrato. Todos da equipe veem esta lista."
                : "Quem o escritório atende: contatos, qualificação para procuração e contrato, origem e histórico de atendimento. Todos da equipe veem esta lista."}
            </p>
          </div>
          <div className="im-cab-acoes">
            <a className="btn btn-sec" href={ROTAS_IMPORTACAO.enviar}>
              <Icone nome="enviar" className="ico" />
              Importar dados
            </a>
            <a data-muda className="btn btn-escuro" href={`${ROTAS_PORTAL.clientes}/novo`}>
              <Icone nome="pessoaMais" className="ico" />
              Novo cliente
            </a>
          </div>
        </div>

        {erro ? (
          <section className="folha" style={{ overflow: "hidden" }}>
            <h2 className="sr">Lista de clientes</h2>
            <ErroAoCarregar oque="os clientes" aoTentar={() => void carregar()}
              texto="O servidor não respondeu. Nenhum dado foi perdido. Tente de novo em instantes." />
          </section>
        ) : semNada ? (
          <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
            <h2 id={`${ids}-t`} className="sr">
              Lista de clientes
            </h2>
            <Estado icone="pessoas" titulo="Nenhum cliente cadastrado ainda"
              acoes={
                <>
                  <a className="btn btn-pri" href={ROTAS_IMPORTACAO.enviar}>
                    <Icone nome="enviar" className="ico" />
                    Importar dados
                  </a>
                  <a data-muda className="btn btn-sec" href={`${ROTAS_PORTAL.clientes}/novo`}>
                    <Icone nome="pessoaMais" className="ico" />
                    Cadastrar o primeiro cliente
                  </a>
                </>
              }>
              Se os clientes já estão numa planilha ou em outro sistema, traga todos de uma vez: você confere tudo numa prévia antes de salvar. Ou cadastre um por um.
            </Estado>
            <p className="pt-pe-folha">
              <Icone nome="doc" className="ico" />
              <span>Não sabe por onde começar? Baixe a <a href={ROTAS_IMPORTACAO.modelo}>planilha-modelo</a>, cole os seus clientes e envie.</span>
            </p>
          </section>
        ) : (
          <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
            <h2 id={`${ids}-t`} className="sr">
              Lista de clientes
            </h2>
            {ferramentas}
            {lista === null ? (
              <Carregando rotulo="Carregando os clientes…" linhas={6} />
            ) : lista.length ? (
              <>
                <p className="cl-cont" role="status">
                  {contagem}
                </p>
                {tabela}
              </>
            ) : buscado ? (
              <Estado icone="busca" titulo={`Nenhum cliente para “${buscado}”`}
                acoes={
                  <>
                    <button className="btn btn-sec" type="button" onClick={() => { setTermo(""); setBuscado(""); busca.current?.focus(); }}>
                      <Icone nome="xis" className="ico" />
                      Limpar busca
                    </button>
                    <a data-muda className="btn btn-pri" href={`${ROTAS_PORTAL.clientes}/novo`}>
                      <Icone nome="pessoaMais" className="ico" />
                      Cadastrar cliente
                    </a>
                  </>
                }>
                Confira a grafia, tente só o sobrenome ou busque pelo telefone ou CPF.
              </Estado>
            ) : (
              <Estado icone={filtro === "vencidos" ? "check" : "pessoas"}
                titulo={filtro === "vencidos" ? "Nenhum próximo contato vencido" : filtro === "inativos" ? "Nenhum cliente inativo" : "Nenhum cliente ativo"}>
                {filtro === "vencidos"
                  ? "Todos os retornos combinados estão em dia."
                  : filtro === "inativos"
                    ? "Quando alguém inativar um cliente, ele aparece aqui, com os dados e os atendimentos guardados."
                    : "Os clientes inativos estão no filtro “Inativos”."}
              </Estado>
            )}
            {peSemComercial}
            <p className="pt-pe-folha">
              <Icone nome="historico" className="ico" />
              <span>Clientes que vieram de planilha dizem isso na ficha. <a href={ROTAS_IMPORTACAO.historico}>Ver as importações</a></span>
            </p>
          </section>
        )}
      </div>
    </MolduraPortal>
  );
}
