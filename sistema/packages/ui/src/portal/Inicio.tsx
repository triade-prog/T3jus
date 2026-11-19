"use client";
// Início do Portal com os contatos do dia (F1.14, AP-06). Desenho aprovado em
// docs/design/aprovadas/portal-clientes-pendencias (estados inicio-*): o hero do Início
// aprovado, o bloco "Contatos de hoje" na coluna da esquerda e, enquanto a direita não tem
// blocos, a explicação de como os contatos chegam. Os outros blocos (prazos, agenda, conversas)
// entram com as áreas deles; nenhum aparece vazio ou bloqueado. Sem a área Comercial, o bloco
// não aparece (PT-02). A sócia dona vê os dela e, com "Da equipe", os de todos (decisão 1).

import { useCallback, useEffect, useState } from "react";
import type {
  ContatoDoDia,
  ContatosDoInicio,
  FichaCliente,
  PessoaRef,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, Estado } from "../console/pecas.tsx";
import { primeiroNome } from "./equipe.ts";
import { JanelaRegistrar, Toast, type Feito } from "./FichaCliente.tsx";
import {
  diaDaSemana,
  diaMes,
  discoData,
  hojeLongo,
  nomesDeHoje,
  peDoLimite,
  rotuloAtraso,
  saudacao,
  subtituloContatos,
} from "./inicio.ts";
import {
  chamarPortal,
  MolduraPortal,
  ROTAS_PORTAL,
  useEscritorioPortal,
  type EscritorioPortal,
} from "./Moldura.tsx";

const VENCIDOS = `${ROTAS_PORTAL.clientes}?filtro=vencidos`;

type ItemDia = { n: number | string; titulo: string; sub: string };

function Hero({
  nome,
  dia,
  carregando,
}: {
  nome: string | null;
  dia?: ItemDia[];
  carregando?: boolean;
}) {
  return (
    <div className="hero">
      <div className="esq campo-vinho">
        <Icone nome="balanca" className="ico estatua" />
        <p className="sobretitulo">{hojeLongo()}</p>
        <h1>
          {saudacao()}
          {nome ? `, ${primeiroNome(nome)}` : ""}.
        </h1>
        <span className="fio" aria-hidden="true" />
        {carregando ? (
          <ul className="dia" aria-hidden="true">
            {[0, 1].map((i) => (
              <li key={i}>
                <span className="pd-esq-dia">
                  <span
                    className="esqueleto"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      opacity: 0.35,
                    }}
                  />
                  <span
                    className="esqueleto esq-linha"
                    style={{ width: 110, opacity: 0.35 }}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : dia?.length ? (
          <ul className="dia" aria-label="Os seus contatos de hoje">
            {dia.map((d) => (
              <li key={d.titulo}>
                <a href="#contatos">
                  <span className="disco">
                    <span>{d.n}</span>
                  </span>
                  <span>
                    <b>{d.titulo}</b>
                    {d.sub}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="dir campo-ambar">
        <p className="sobretitulo">Atalhos</p>
        <a className="btn btn-escuro" href={`${ROTAS_PORTAL.clientes}/novo`}>
          <Icone nome="pessoaMais" className="ico" />
          Novo cliente
        </a>
        <a className="btn btn-sec" href={ROTAS_PORTAL.clientes}>
          <Icone nome="pessoas" className="ico" />
          Abrir Clientes
        </a>
      </div>
    </div>
  );
}

const Explica = () => (
  <section className="explica campo-ambar" aria-labelledby="t-exi">
    <p className="sobretitulo">Contatos de hoje</p>
    <h2 id="t-exi">O retorno combinado não se perde.</h2>
    <ul>
      <li>
        <Icone nome="relogio" className="ico" />
        <span>
          Aqui ficam os próximos contatos em que você é o responsável: os
          vencidos, do mais antigo para o mais novo, e depois os de hoje.
        </span>
      </li>
      <li>
        <Icone nome="historico" className="ico" />
        <span>
          Quem marca o próximo contato e o responsável é o atendimento
          registrado na ficha do cliente.
        </span>
      </li>
      <li>
        <Icone nome="check" className="ico" />
        <span>
          Registrou o atendimento, o contato sai daqui. Se marcar outro, ele
          volta no dia certo.
        </span>
      </li>
    </ul>
  </section>
);

function Item({
  c,
  comResp,
  aoRegistrar,
}: {
  c: ContatoDoDia;
  comResp: boolean;
  aoRegistrar: (c: ContatoDoDia) => void;
}) {
  const d = discoData(c.em);
  const ct = c.contatoPrincipal;
  return (
    <li className="prazo">
      <div className="data" aria-hidden="true">
        <span className={c.vencido ? "disco pd-venc" : "disco hoje"}>
          <span>{d.dia}</span>
        </span>
        <small>{d.mes}</small>
      </div>
      <div>
        <span className="sr">Marcado para {diaMes(c.em)}. </span>
        <a href={`${ROTAS_PORTAL.clientes}/${c.clienteId}`}>{c.nome}</a>
        <span className="pd-oque">{c.oque}</span>
        {ct ? (
          <span className="pd-ct">
            <Icone
              nome={ct.telefone ? "telefone" : "envelope"}
              className="ico"
            />
            {ct.nome}
            {ct.papel ? ` · ${ct.papel}` : ""} ·{" "}
            <span className="num">
              {ct.telefone ? formatarTelefone(ct.telefone) : ct.email}
            </span>
          </span>
        ) : null}
      </div>
      <div className="lado">
        {c.vencido ? (
          <span className="selo selo-urgente">
            <Icone nome="alerta" className="ico" />
            {rotuloAtraso(c.diasAtraso)}
          </span>
        ) : (
          <span className="selo selo-atencao">
            <Icone nome="relogio" className="ico" />
            Hoje
          </span>
        )}
        {comResp ? (
          <span className="resp">
            <i aria-hidden="true">
              {c.responsavel.nome
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </i>
            {c.responsavel.nome}
          </span>
        ) : null}
        <button
          className="btn btn-sec btn-compacto"
          type="button"
          onClick={() => aoRegistrar(c)}
        >
          <Icone nome="mais" className="ico ico-s" />
          Registrar atendimento<span className="sr"> de {c.nome}</span>
        </button>
      </div>
    </li>
  );
}

function Lista({
  c,
  aoRegistrar,
}: {
  c: ContatosDoInicio;
  aoRegistrar: (c: ContatoDoDia) => void;
}) {
  const resp = c.de === "EQUIPE";
  return (
    <>
      {c.vencidos.length ? (
        <>
          <p className="pd-grupo" id="g-venc">
            Vencidos · {c.totalVencidos}
          </p>
          <ol className="prazos pd-contatos" aria-labelledby="g-venc">
            {c.vencidos.map((x) => (
              <Item
                key={x.clienteId}
                c={x}
                comResp={resp}
                aoRegistrar={aoRegistrar}
              />
            ))}
          </ol>
        </>
      ) : null}
      {c.hoje.length ? (
        <>
          <p className="pd-grupo" id="g-hoje">
            Para hoje · {c.totalHoje}
          </p>
          <ol className="prazos pd-contatos" aria-labelledby="g-hoje">
            {c.hoje.map((x) => (
              <Item
                key={x.clienteId}
                c={x}
                comResp={resp}
                aoRegistrar={aoRegistrar}
              />
            ))}
          </ol>
        </>
      ) : null}
    </>
  );
}

function Bloco({
  sub,
  ver = true,
  ocupado,
  chips,
  children,
}: {
  sub: string;
  ver?: boolean;
  ocupado?: boolean;
  chips?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="folha"
      id="contatos"
      aria-labelledby="t-contatos"
      aria-busy={ocupado || undefined}
    >
      <div className="folha-cab pd-folha-cab">
        <div>
          <h2 id="t-contatos">
            <Icone nome="relogio" className="ico" />
            Contatos de hoje
          </h2>
          <p className="sub">{sub}</p>
        </div>
        {ver ? (
          <a className="ver" href={VENCIDOS}>
            Ver todos
            <span className="sr"> os contatos vencidos em Clientes</span>
            <Icone nome="dir" className="ico ico-s" />
          </a>
        ) : null}
      </div>
      {chips}
      {children}
    </section>
  );
}

function Esqueleto() {
  return (
    <>
      <p className="sr" role="status">
        Carregando os seus contatos de hoje…
      </p>
      <div aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="pd-esq" key={i}>
            <span
              className="esqueleto"
              style={{ width: 48, height: 48, borderRadius: "50%" }}
            />
            <div style={{ display: "grid", gap: 8 }}>
              <span
                className="esqueleto esq-linha"
                style={{ width: "55%", height: 13 }}
              />
              <span
                className="esqueleto esq-linha"
                style={{ width: "40%", height: 10 }}
              />
            </div>
            <span
              className="esqueleto esq-linha so-pc-i"
              style={{ width: 150, height: 28 }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function diaDoHero(c: ContatosDoInicio): ItemDia[] {
  if (c.de === "MEUS" && c.dono) {
    return [
      {
        n: c.totalHoje,
        titulo: c.totalHoje === 1 ? "contato seu hoje" : "contatos seus hoje",
        sub: c.totalHoje ? nomesDeHoje(c.hoje, c.totalHoje) : "nada para hoje",
      },
      {
        n: c.equipeVencidos ?? 0,
        titulo:
          c.equipeVencidos === 1 ? "vencido na equipe" : "vencidos na equipe",
        sub: c.equipeVencidos ? "veja em “Da equipe”" : "a equipe está em dia",
      },
    ];
  }
  return [
    {
      n: c.totalVencidos,
      titulo: c.totalVencidos === 1 ? "contato vencido" : "contatos vencidos",
      sub: c.maisAntigo
        ? `o mais antigo, ${diaMes(c.maisAntigo)}`
        : "tudo em dia",
    },
    {
      n: c.totalHoje,
      titulo: c.totalHoje === 1 ? "contato hoje" : "contatos hoje",
      sub: c.totalHoje
        ? nomesDeHoje(c.hoje, c.totalHoje)
        : c.proximo
          ? `próximo ${diaDaSemana(c.proximo.em).split(",")[0]}`
          : "nada marcado",
    },
  ];
}

function Contatos({ escritorio }: { escritorio: EscritorioPortal }) {
  const [de, setDe] = useState<"MEUS" | "EQUIPE">("MEUS");
  const [c, setC] = useState<ContatosDoInicio | null>(null);
  const [erro, setErro] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [registrar, setRegistrar] = useState<{
    f: FichaCliente;
    pessoas: PessoaRef[];
    vez: number;
  } | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [erroAbrir, setErroAbrir] = useState(false);

  const carregar = useCallback(async (qual: "MEUS" | "EQUIPE") => {
    setErro(false);
    const r = await chamarPortal<ContatosDoInicio>(
      `/v1/escritorio/inicio/contatos?de=${qual}`,
    );
    if (r.ok) setC(r.dados);
    else setErro(true);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(() => carregar(de));
  }, [carregar, de]);

  async function abrirRegistrar(x: ContatoDoDia) {
    if (abrindo) return;
    setFeito(null);
    setErroAbrir(false);
    setAbrindo(true);
    const [f, p] = await Promise.all([
      chamarPortal<FichaCliente>(`/v1/escritorio/clientes/${x.clienteId}`),
      chamarPortal<{ pessoas: PessoaRef[] }>("/v1/escritorio/pessoas"),
    ]);
    setAbrindo(false);
    if (!f.ok || !p.ok) return setErroAbrir(true);
    setRegistrar((o) => ({
      f: f.dados,
      pessoas: p.dados.pessoas,
      vez: (o?.vez ?? 0) + 1,
    }));
  }

  const chips = escritorio.dono ? (
    <div className="pd-chips" role="group" aria-label="Mostrar">
      <button
        type="button"
        aria-pressed={de === "MEUS"}
        onClick={() => setDe("MEUS")}
      >
        Meus
      </button>
      <button
        type="button"
        aria-pressed={de === "EQUIPE"}
        onClick={() => setDe("EQUIPE")}
      >
        Da equipe
      </button>
    </div>
  ) : null;

  const vazio = c && !c.totalVencidos && !c.totalHoje;
  const pe = c ? peDoLimite(c) : null;
  const bloco = erro ? (
    <Bloco sub="Os seus contatos vencidos e de hoje" ver={false} chips={chips}>
      <Estado
        icone="alerta"
        erro
        titulo="Não deu para carregar os seus contatos"
        acoes={
          <>
            <button
              className="btn btn-pri"
              type="button"
              onClick={() => void carregar(de)}
            >
              <Icone nome="reenviar" className="ico" />
              Tentar de novo
            </button>
            <a className="btn btn-sec" href={VENCIDOS}>
              <Icone nome="pessoas" className="ico" />
              Abrir Clientes
            </a>
          </>
        }
      >
        O servidor não respondeu. Nenhum atendimento se perdeu, e o resto do
        Início continua funcionando. Se continuar, os vencidos também estão em
        Clientes, no filtro “Contato vencido”.
      </Estado>
    </Bloco>
  ) : !c || c.de !== de ? (
    <Bloco sub="Buscando os seus contatos…" ver={false} ocupado chips={chips}>
      <Esqueleto />
    </Bloco>
  ) : (
    <Bloco sub={subtituloContatos(c)} ver={!vazio} chips={chips}>
      {c.de === "MEUS" && c.dono && !c.totalVencidos && c.equipeVencidos ? (
        <p className="pd-nada-meu">
          <Icone nome="check" className="ico" />
          <span>
            Nenhum contato seu está vencido. Na equipe{" "}
            {c.equipeVencidos === 1
              ? "há 1 vencido"
              : `há ${c.equipeVencidos} vencidos`}
            . Veja em “Da equipe”.
          </span>
        </p>
      ) : null}
      {vazio && !(c.de === "MEUS" && c.dono && c.equipeVencidos) ? (
        <div className="pd-vazio" role="status">
          <span className="pd-sol">
            <Icone nome="check" className="ico" />
          </span>
          <h3>
            {c.de === "EQUIPE"
              ? "A equipe está em dia."
              : "Tudo em dia com os seus clientes."}
          </h3>
          <p>
            Nenhum contato vencido e nenhum para hoje. Quando um atendimento
            marcar você como responsável, o retorno aparece aqui no dia.
          </p>
          {c.proximo ? (
            <span className="pd-prox">
              <Icone nome="agenda" className="ico" />
              Próximo: <b>{diaDaSemana(c.proximo.em)}</b> · {c.proximo.nome}
            </span>
          ) : null}
        </div>
      ) : (
        <Lista c={c} aoRegistrar={(x) => void abrirRegistrar(x)} />
      )}
      {pe ? (
        <div className="mais">
          <span>{pe}</span>
          <a className="ver" href={VENCIDOS}>
            Ver todos os vencidos em Clientes
            <Icone nome="dir" className="ico ico-s" />
          </a>
        </div>
      ) : null}
    </Bloco>
  );

  return (
    <>
      <Hero
        nome={escritorio.pessoa}
        dia={c && c.de === de && !erro ? diaDoHero(c) : undefined}
        carregando={!c && !erro}
      />
      {c?.pedidosExclusao?.map((x, i, todos) => (
        <a key={x.id} className="pd-pedido-ini" href={`${ROTAS_PORTAL.clientes}/${x.clienteId}`}>
          <Icone nome="escudo" className="ico" />
          <span>
            <b>{todos.length === 1 ? "1 pedido de exclusão esperando você" : i === 0 ? `${todos.length} pedidos de exclusão esperando você` : "Outro pedido de exclusão"}</b>
            <small>
              {x.nome} · pedido em {diaMes(x.pedidoEm)} por {x.por} (LGPD)
            </small>
          </span>
          <Icone nome="dir" className="ico ico-s pd-ir" />
        </a>
      ))}
      {erroAbrir ? (
        <Aviso
          tom="urgencia"
          titulo="Não deu para abrir o registro de atendimento."
        >
          Tente de novo ou registre pela ficha do cliente.
        </Aviso>
      ) : null}
      <div className="pt-inicio">
        <div className="pt-col">{bloco}</div>
        <aside className="pt-col" aria-label="Sobre o Início">
          <Explica />
        </aside>
      </div>
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
      {registrar ? (
        <JanelaRegistrar
          key={`r-${registrar.vez}`}
          aberta
          f={registrar.f}
          pessoas={registrar.pessoas}
          eu={escritorio.pessoa}
          aoFechar={() => setRegistrar(null)}
          aoFeito={(x) => {
            const nome = primeiroNome(registrar.f.nome);
            setRegistrar(null);
            setFeito({
              titulo: `Atendimento de ${nome} registrado.`,
              texto: x.texto,
            });
            void carregar(de);
          }}
        />
      ) : null}
    </>
  );
}

export function InicioPortal() {
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  const comercial = escritorio?.areas.includes("COMERCIAL") ?? false;
  return (
    <MolduraPortal
      atual="inicio"
      trilha={[{ nome: "Início" }]}
      escritorio={escritorio}
    >
      <div className="pd-inicio">
        {erro ? (
          <>
            <Hero nome={null} />
            <Aviso
              tom="urgencia"
              titulo="Não deu para carregar os dados do escritório."
              acoes={
                <button
                  className="btn btn-sec"
                  type="button"
                  onClick={recarregar}
                >
                  Tentar de novo
                </button>
              }
            >
              Recarregue a página. Se continuar, fale com o suporte.
            </Aviso>
          </>
        ) : !escritorio ? (
          <Hero nome={null} carregando />
        ) : comercial ? (
          <Contatos escritorio={escritorio} />
        ) : (
          <>
            <Hero nome={escritorio.pessoa} />
            <Estado
              icone="inicio"
              moldura
              nivel={2}
              titulo="O seu Início ganha blocos com as suas áreas"
              acoes={
                <a className="btn btn-pri" href={ROTAS_PORTAL.clientes}>
                  <Icone nome="pessoas" className="ico" />
                  Abrir Clientes
                </a>
              }
            >
              Os prazos e as tarefas das suas áreas vão aparecer aqui quando
              elas tiverem tela, junto com as conversas e a agenda da equipe.
              Enquanto isso, os clientes e a qualificação para a procuração
              estão em Clientes.
            </Estado>
          </>
        )}
      </div>
    </MolduraPortal>
  );
}
