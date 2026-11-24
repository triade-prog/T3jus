// Retorno de foco das janelas (F3.165, PT-10). O componente Janela guarda uma pista de quem a abriu antes
// do showModal() e, quando a janela fecha (aberta vira falso ou a janela é desmontada, com ou sem o evento
// close), vigia a página por 3 s. Se nesse tempo o foco ficar perdido (no body, num elemento escondido ou
// fora da página) e nenhuma janela estiver aberta, ele vai, nesta ordem, para:
// 1. o botão que abriu, se ainda está na página e visível;
// 2. o equivalente da mesma linha (mesmo data-acao ou, sem ele, o mesmo nome acessível), visível;
// 3. a linha: o primeiro link ou botão visível dela;
// 4. se a linha sumiu: a linha que ficou no lugar dela (a mesma posição; se era a última, a anterior);
// 5. o título da folha, se é visível e não é .sr; senão, o h1 da página.
// A vigia de 3 s cobre a lista que volta do servidor depois de fechar e tira a linha que tinha o foco.
// Ela nunca tira o foco de onde a pessoa o pôs: só age com o foco perdido.

const FOCAVEL =
  "a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
const VIGIA_MS = 3000;

export type PistaDoFoco = {
  origem: HTMLElement | null;
  linha: Element | null;
  lista: Element | null;
  indice: number;
  acao: string | null;
  nome: string;
  folha: Element | null;
};

let pistaAtual: PistaDoFoco | null = null;
let pararAtual: (() => void) | null = null;

function visivel(e: Element | null | undefined): e is HTMLElement {
  if (!e || !e.isConnected || !(e instanceof HTMLElement)) return false;
  if (typeof e.checkVisibility === "function" && !e.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) return false;
  return e.getBoundingClientRect().width > 1;
}

const nomeDe = (e: Element) => (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim();
const linhaDe = (e: Element) => e.closest("tr, .cartao, li");

/** Para a vigia em curso (outra janela abriu, ou a mesma janela continua aberta). */
export function pararVigiaDoFoco() {
  pararAtual?.();
}

/**
 * Guarda de onde a janela foi aberta. Se a origem é o body ou está dentro de outra janela (uma janela que
 * abre outra e some), herda a pista da janela anterior.
 */
export function pistaDoFoco(origem: Element | null): PistaDoFoco {
  pararVigiaDoFoco();
  const herda = !origem || origem === document.body || !!origem.closest("dialog");
  if (herda && pistaAtual) return pistaAtual;
  const el = origem instanceof HTMLElement && origem !== document.body ? origem : null;
  const linha = el ? linhaDe(el) : null;
  const lista = linha?.parentElement ?? null;
  pistaAtual = {
    origem: el,
    linha,
    lista,
    indice: linha && lista ? [...lista.children].indexOf(linha) : -1,
    acao: el?.getAttribute("data-acao") ?? null,
    nome: el ? nomeDe(el) : "",
    folha: el?.closest(".folha") ?? null,
  };
  return pistaAtual;
}

function perdido() {
  const a = document.activeElement;
  return !a || a === document.body || !visivel(a);
}

function focar(e: Element | null | undefined) {
  if (!visivel(e)) return false;
  e.focus();
  return true;
}

function devolver(p: PistaDoFoco) {
  if (focar(p.origem)) return;
  const linha = p.linha?.isConnected ? p.linha : null;
  if (linha) {
    const cands = [...linha.querySelectorAll(FOCAVEL)].filter(visivel);
    const eq = cands.find((c) => (p.acao ? c.getAttribute("data-acao") === p.acao : nomeDe(c) === p.nome));
    if (focar(eq) || focar(cands[0])) return;
  }
  if (p.lista?.isConnected) {
    const linhas = [...p.lista.children].filter(visivel);
    const lugar = linhas[Math.min(Math.max(p.indice, 0), linhas.length - 1)];
    if (lugar && focar([...lugar.querySelectorAll(FOCAVEL)].find(visivel))) return;
  }
  const h2 = p.folha?.isConnected ? p.folha.querySelector("h2") : null;
  const titulo = h2 && visivel(h2) && !h2.classList.contains("sr") ? h2 : document.querySelector<HTMLElement>("main h1, h1");
  if (!titulo) return;
  if (!titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
  focar(titulo);
}

/** Depois que a janela fecha: por 3 s, se o foco ficar perdido e nenhuma janela estiver aberta, aplica a ordem. */
export function vigiarFoco(p: PistaDoFoco) {
  pararVigiaDoFoco();
  let pedido = 0;
  let viva = true;
  const checar = () => {
    pedido = 0;
    if (!viva || document.querySelector("dialog[open]")) return;
    if (perdido()) devolver(p);
  };
  const agendar = () => {
    if (!pedido) pedido = requestAnimationFrame(checar);
  };
  const obs = new MutationObserver(agendar);
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "style", "open"] });
  addEventListener("resize", agendar);
  const fim = setTimeout(() => parar(), VIGIA_MS);
  function parar() {
    viva = false;
    obs.disconnect();
    removeEventListener("resize", agendar);
    clearTimeout(fim);
    if (pedido) cancelAnimationFrame(pedido);
    if (pararAtual === parar) pararAtual = null;
  }
  pararAtual = parar;
  requestAnimationFrame(() => requestAnimationFrame(checar));
}
