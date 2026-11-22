// Início: abas do "Por dentro do Portal" e o movimento guiado pela rolagem (v3 aprovada em 22/11/2026).
// O movimento em si é CSS (src/styles/inicio.css). Este script cuida só do que o CSS não faz:
// - as abas (padrão WAI-ARIA) e, no computador, a troca de aba pela rolagem (classe "historia", posta no <head>);
// - a reserva com IntersectionObserver onde o navegador não anima pela rolagem (classe "io");
// - a volta do selo e a contagem dos números da abertura, uma vez só.
// Sem script, nada fica escondido: as entradas só existem com "sd" ou "io". Com "menos movimento", nada se move.

const raiz = document.documentElement;
const menos = window.matchMedia("(prefers-reduced-motion: reduce)");
const sd = raiz.classList.contains("sd");
const mqHistoria = window.matchMedia("(min-width: 1021px) and (min-height: 820px)");
const trilho = document.getElementById("trilho");
const resto = trilho?.querySelector<HTMLElement>(".trilho-resto") ?? null;
const TOPO = 92; // onde o palco das abas para: altura do topo + folga
const historia = () => raiz.classList.contains("historia");

// ---------- abas ----------
const abas = Array.from(document.querySelectorAll<HTMLButtonElement>("[role=tab]"));
const paineis = abas.map((a) => document.getElementById(a.getAttribute("aria-controls") ?? "") as HTMLElement);
let atual = -1;
let trava = 0;

const porDentro = document.getElementById("por-dentro");
function escolher(i: number, foco: boolean) {
  if (i !== atual) {
    if (atual !== -1) porDentro?.classList.add("trocou");
    abas.forEach((a, j) => {
      const sel = i === j;
      a.setAttribute("aria-selected", sel ? "true" : "false");
      a.tabIndex = sel ? 0 : -1;
      paineis[j].hidden = !sel;
    });
    atual = i;
  }
  if (foco) abas[i].focus({ preventScroll: historia() });
}
const inicioTrilho = () => (trilho ? trilho.getBoundingClientRect().top + window.scrollY - TOPO : 0);
const alvoDoPasso = (i: number) => Math.round(inicioTrilho() + ((i + 0.08) / abas.length) * (resto?.offsetHeight ?? 0));
function preencher(i: number, f: number) {
  abas.forEach((a, j) => a.style.setProperty("--f", String(j < i ? 1 : j > i ? 0 : f.toFixed(3))));
}
function irPara(i: number, foco: boolean) {
  escolher(i, foco);
  history.replaceState(null, "", "#" + abas[i].id);
  if (historia()) {
    trava = Date.now() + 1200;
    window.scrollTo({ top: alvoDoPasso(i), behavior: menos.matches ? "auto" : "smooth" });
    preencher(i, 0.08);
  }
}
abas.forEach((a, i) => {
  a.addEventListener("click", () => irPara(i, false));
  a.addEventListener("keydown", (e) => {
    const n = abas.length;
    let alvo: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") alvo = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") alvo = (i - 1 + n) % n;
    else if (e.key === "Home") alvo = 0;
    else if (e.key === "End") alvo = n - 1;
    if (alvo !== null) {
      e.preventDefault();
      irPara(alvo, true);
    }
  });
});
if (abas.length) {
  const inicial = abas.findIndex((a) => "#" + a.id === location.hash);
  escolher(inicial < 0 ? 0 : inicial, false);
  if (inicial >= 0) {
    if (historia()) window.scrollTo(0, alvoDoPasso(inicial));
    else porDentro?.scrollIntoView();
  }
}

// ---------- reserva: entrada das seções com IntersectionObserver, uma vez só ----------
if (!sd && !menos.matches && "IntersectionObserver" in window) {
  raiz.classList.add("io");
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visivel");
        io.unobserve(e.target);
      }
    }),
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  document.querySelectorAll("[data-revelar]").forEach((el) => io.observe(el));
}

// ---------- o selo da chamada dá uma volta devagar, uma vez (o desenho não muda) ----------
const selo = document.querySelector(".selo-bloco");
if (selo && !menos.matches && "IntersectionObserver" in window) {
  const ioSelo = new IntersectionObserver(
    (es) => {
      if (es[0].isIntersecting) {
        selo.classList.add("gira");
        ioSelo.disconnect();
      }
    },
    { threshold: 0.6 },
  );
  ioSelo.observe(selo);
}

// ---------- os números da anotação contam até o valor da tela (o HTML já traz o valor final) ----------
if (!menos.matches && window.matchMedia("(min-width: 1241px)").matches) {
  const contas = Array.from(document.querySelectorAll<HTMLElement>(".conta"));
  contas.forEach((c) => (c.textContent = "0"));
  window.setTimeout(() => {
    const t0 = performance.now();
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      contas.forEach((c) => (c.textContent = String(Math.round(e * Number(c.dataset.ate)))));
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }, 1750);
}

// ---------- um laço só para o que depende da rolagem ----------
const jan = document.getElementById("janela-abertura");
const largo = window.matchMedia("(min-width: 761px)");
let pedido = false;
function quadro() {
  pedido = false;
  const y = window.scrollY;
  // reserva da tela da abertura, que sai inclinada e assenta (com "sd" é CSS)
  if (!sd && jan) {
    if (menos.matches || !largo.matches) {
      jan.style.setProperty("--incl", "0deg");
      jan.style.setProperty("--escala", "1");
    } else {
      const t = Math.min(1, Math.max(0, y / 600));
      jan.style.setProperty("--incl", (14 * (1 - t)).toFixed(2) + "deg");
      jan.style.setProperty("--escala", (0.9 + 0.1 * t).toFixed(3));
    }
  }
  // no computador, a rolagem passa pelas 4 abas enquanto o palco fica parado
  if (historia() && resto && Date.now() > trava) {
    const p = (y - inicioTrilho()) / resto.offsetHeight;
    const n = abas.length;
    if (p >= 0 && p <= 1) {
      const i = Math.min(n - 1, Math.floor(p * n));
      escolher(i, false);
      preencher(i, Math.min(1, p * n - i));
    } else if (p > 1) preencher(n - 1, 1);
    else preencher(atual, 0);
  }
}
const pedir = () => {
  if (!pedido) {
    pedido = true;
    requestAnimationFrame(quadro);
  }
};
const conferirHistoria = () => {
  raiz.classList.toggle("historia", !menos.matches && mqHistoria.matches);
  pedir();
};
window.addEventListener("scroll", pedir, { passive: true });
window.addEventListener("resize", conferirHistoria);
menos.addEventListener("change", conferirHistoria);
quadro();

export {};
