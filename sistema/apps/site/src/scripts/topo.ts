// Topo de todas as páginas, onde o navegador não anima pela rolagem (sem a classe "sd"):
// a barra âmbar acompanha a leitura e o topo encolhe depois de 60 px. Com "menos movimento", nada se move.
const raiz = document.documentElement;
const menos = window.matchMedia("(prefers-reduced-motion: reduce)");
const barra = document.querySelector<HTMLElement>(".topo .progresso");

if (!raiz.classList.contains("sd")) {
  let pedido = false;
  const quadro = () => {
    pedido = false;
    if (menos.matches) {
      raiz.classList.remove("compacto");
      if (barra) barra.style.transform = "";
      return;
    }
    const y = window.scrollY;
    const total = raiz.scrollHeight - window.innerHeight;
    if (barra) barra.style.transform = `scaleX(${(total > 0 ? Math.min(1, y / total) : 0).toFixed(4)})`;
    raiz.classList.toggle("compacto", y > 60);
  };
  const pedir = () => {
    if (!pedido) {
      pedido = true;
      requestAnimationFrame(quadro);
    }
  };
  window.addEventListener("scroll", pedir, { passive: true });
  window.addEventListener("resize", pedir);
  quadro();
}

export {};
