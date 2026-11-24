"use client";
// Prioridade das colunas das tabelas do Portal (F3.124, decisão da Carol de 23/11: quando a tabela
// não cabe na folha, saem as colunas secundárias). Fonte única: prioridades.json, por tabela
// (<table data-prio-tabela="id">) e por cabeçalho: "3" sai primeiro, "2" depois; coluna que não
// está no arquivo nunca sai. O teste lê o mesmo arquivo e confere o <th> de cada tabela.
//
// Aplica data-prio no <th> e nas células da mesma coluna (tbody e tfoot), pela posição, contando o
// colSpan: célula que ocupa mais de uma coluna não recebe (ela não some). Roda no primeiro desenho e
// a cada mudança do DOM (MutationObserver: o retorno roda antes do próximo quadro, então a tabela
// nunca aparece sem as prioridades). Não observa atributos, para não chamar a si mesmo.
import { useEffect } from "react";
import PRIO from "./prioridades.json";

type Mapa = Partial<Record<"2" | "3", string[]>>;
const TABELAS = PRIO as Record<string, Mapa>;
const norm = (s: string | null) => (s ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");

function prioridadesDe(mapa: Mapa): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of ["2", "3"] as const) for (const h of mapa[p] ?? []) m.set(norm(h), p);
  return m;
}

function marcar(el: Element, p: string | undefined) {
  if (p) { if (el.getAttribute("data-prio") !== p) el.setAttribute("data-prio", p); }
  else if (el.hasAttribute("data-prio")) el.removeAttribute("data-prio");
}

export function aplicarPrioridades(raiz: ParentNode = document) {
  for (const t of raiz.querySelectorAll<HTMLTableElement>("table[data-prio-tabela]")) {
    const mapa = TABELAS[t.dataset.prioTabela ?? ""];
    if (!mapa) continue;
    const m = prioridadesDe(mapa);
    const ths = [...t.querySelectorAll(":scope>thead>tr>th")];
    // A primeira coluna nunca sai: ela nomeia a linha.
    const porCol = ths.map((th, i) => (i > 0 ? m.get(norm(th.textContent)) : undefined));
    ths.forEach((th, i) => marcar(th, porCol[i]));
    for (const tr of t.querySelectorAll(":scope>tbody>tr,:scope>tfoot>tr")) {
      let pos = 0;
      for (const c of tr.children) {
        const span = (c as HTMLTableCellElement).colSpan || 1;
        marcar(c, span === 1 ? porCol[pos] : undefined);
        pos += span;
      }
    }
  }
}

export function usePrioridadesDeColuna() {
  useEffect(() => {
    aplicarPrioridades();
    const o = new MutationObserver(() => aplicarPrioridades());
    o.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => o.disconnect();
  }, []);
}
