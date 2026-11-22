"use client";
// Moldura de uma área do Portal (PA-01): a barra de seções no alto e, para quem a área não
// foi liberada, quem libera. O servidor confere a área de novo em cada rota de dado.

import type { ReactNode } from "react";
import { AREAS_PORTAL, type AreaPortal } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Carregando, ErroAoCarregar, Estado } from "../console/pecas.tsx";
import { primeiroNome } from "./equipe.ts";
import { SECOES_AREA, trilhaDaArea } from "./areas.ts";
import { MolduraPortal, ROTAS_PORTAL, useEscritorioPortal, type EscritorioPortal } from "./Moldura.tsx";

export function MolduraArea({ area, secao, trilha = [], pagina = "co-equipe co-carteira", children }: {
  area: AreaPortal;
  secao: string;
  /** O que vem depois da seção na trilha (o número da proposta, por exemplo). */
  trilha?: { nome: string; href?: string }[];
  pagina?: string;
  children: (escritorio: EscritorioPortal) => ReactNode;
}) {
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  const nome = AREAS_PORTAL[area];
  const s = SECOES_AREA[area].find((x) => x.chave === secao) ?? SECOES_AREA[area][0]!;
  const base = trilhaDaArea(area, nome, s, trilha);

  if (erro || !escritorio) {
    return (
      <MolduraPortal atual={null} trilha={[{ nome }]} escritorio={null}>
        {erro ? <ErroAoCarregar oque="o Portal" aoTentar={recarregar} /> : <Carregando rotulo="Carregando…" linhas={3} />}
      </MolduraPortal>
    );
  }
  if (!escritorio.areas.includes(area)) {
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
    <MolduraPortal atual={area} trilha={base} escritorio={escritorio} barraArea={{ area, secao: s.chave }} pagina={pagina}>
      {children(escritorio)}
    </MolduraPortal>
  );
}
