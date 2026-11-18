"use client";
// Páginas do Portal que ainda não têm dado (Início, Conversas, Clientes, Agenda, Ajuda e as
// quatro áreas), dentro da moldura aprovada (docs/design/aprovadas/portal-v1/moldura.html).
// A área aparece com a barra de seções e diz o que vem; área não liberada mostra quem libera.

import { AREAS_PORTAL, type AreaPortal } from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Carregando, ErroAoCarregar, Estado } from "../console/pecas.tsx";
import { primeiroNome } from "./equipe.ts";
import { ICONE_AREA, SECOES_AREA } from "./areas.ts";
import { MolduraPortal, ROTAS_PORTAL, useEscritorioPortal, type LugarPortal } from "./Moldura.tsx";

const IR_INICIO = (
  <a className="btn btn-sec" href={ROTAS_PORTAL.inicio}>
    <Icone nome="inicio" className="ico" />
    Ir para o Início
  </a>
);

const COMUNS: Record<"inicio" | "conversas" | "clientes" | "agenda" | "ajuda", { nome: string; icone: NomeIcone; titulo: string; texto: string }> = {
  inicio: {
    nome: "Início",
    icone: "inicio",
    titulo: "O Início está sendo preparado",
    texto: "Aqui vai aparecer o dia do escritório: conversas esperando alguém, a agenda de hoje e, para quem tem a área, os prazos e os recebimentos. Por enquanto, use o menu.",
  },
  conversas: {
    nome: "Conversas",
    icone: "conversas",
    titulo: "As Conversas estão sendo preparadas",
    texto: "Aqui vão ficar as conversas de WhatsApp com os clientes: a IA responde e passa para a equipe quando não sabe.",
  },
  clientes: {
    nome: "Clientes",
    icone: "pessoas",
    titulo: "Os Clientes estão sendo preparados",
    texto: "Aqui vai ficar a lista de clientes do escritório, com contatos, casos e contratos de cada um.",
  },
  agenda: {
    nome: "Agenda",
    icone: "agenda",
    titulo: "A Agenda está sendo preparada",
    texto: "Aqui vão ficar os compromissos da equipe: audiências, reuniões com clientes e o que é interno.",
  },
  ajuda: {
    nome: "Ajuda",
    icone: "ajuda",
    titulo: "A Ajuda está sendo preparada",
    texto: "Aqui vai ficar o contato com a equipe T3jus e as respostas para as dúvidas mais comuns.",
  },
};

/** Início, Conversas, Clientes, Agenda e Ajuda: a moldura e o que vem. */
export function PaginaComumPortal({ lugar }: { lugar: keyof typeof COMUNS }) {
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  const p = COMUNS[lugar];
  return (
    <MolduraPortal atual={lugar as LugarPortal} trilha={[{ nome: p.nome }]} escritorio={escritorio}>
      {erro ? (
        <Aviso tom="urgencia" titulo="Não deu para carregar os dados do escritório."
          acoes={
            <button className="btn btn-pri btn-compacto" type="button" onClick={recarregar}>
              <Icone nome="reenviar" className="ico ico-s" />
              Tentar de novo
            </button>
          }>
          O servidor não respondeu. O menu volta a mostrar as suas áreas quando ele responder.
        </Aviso>
      ) : null}
      <Estado icone={p.icone} titulo={p.titulo} nivel={1} moldura acoes={lugar === "inicio" ? undefined : IR_INICIO}>
        {p.texto}
      </Estado>
    </MolduraPortal>
  );
}

function listaNomes(n: string[]): string {
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} e ${n.at(-1)}`;
}

/** Uma área (e a seção aberta): só para quem tem a área liberada. */
export function PaginaAreaPortal({ area, secao }: { area: AreaPortal; secao?: string }) {
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  const nome = AREAS_PORTAL[area];
  const s = SECOES_AREA[area].find((x) => x.chave === secao) ?? SECOES_AREA[area][0]!;
  const liberada = escritorio?.areas.includes(area);

  if (erro || !escritorio) {
    return (
      <MolduraPortal atual={null} trilha={[{ nome }]} escritorio={null}>
        {erro ? <ErroAoCarregar oque="o Portal" aoTentar={recarregar} /> : <Carregando rotulo="Carregando…" linhas={3} />}
      </MolduraPortal>
    );
  }
  if (!liberada) {
    const dono = escritorio.socios[0];
    return (
      <MolduraPortal atual={null} trilha={[{ nome }]} escritorio={escritorio}>
        <Estado icone="cadeado" titulo="Esta área não está liberada para você" nivel={1} moldura
          acoes={
            <a className="btn btn-pri" href={ROTAS_PORTAL.inicio}>
              <Icone nome="inicio" className="ico" />
              Ir para o Início
            </a>
          }>
          {dono
            ? `Quem libera as áreas é ${dono}, sócio dono. Se você precisa do ${nome}, fale com ${primeiroNome(dono)}. O que você já abre continua no menu.`
            : `Quem libera as áreas é o sócio dono. Se você precisa do ${nome}, fale com ele. O que você já abre continua no menu.`}
        </Estado>
      </MolduraPortal>
    );
  }
  return (
    <MolduraPortal atual={area} trilha={[{ nome, href: `/${area.toLowerCase()}` }, { nome: s.nome }]} escritorio={escritorio} barraArea={{ area, secao: s.chave }}>
      <Estado icone={ICONE_AREA[area]} titulo={`O ${nome} está sendo preparado`} nivel={1} moldura acoes={IR_INICIO}>
        {`As seções acima são as que a área vai ter: ${listaNomes(SECOES_AREA[area].map((x) => x.nome))}. Enquanto isso, o que já existe está no Início.`}
      </Estado>
    </MolduraPortal>
  );
}
