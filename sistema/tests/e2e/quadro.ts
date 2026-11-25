// O quadro antes do commit (F3.176): depois de um await, o React 19 aplica o setState numa
// tarefa do Scheduler, e o quadro de animação pode chegar antes dela. Na hora real isso acontece
// de vez em quando; aqui acontece sempre, para o teste não depender de sorte.
import type { Page } from "@playwright/test";

/** Faz o requestAnimationFrame rodar num microtask: o quadro chega antes do commit do React
 *  depois de um await. O caminho síncrono (clique, envio) não muda: o React põe o microtask dele
 *  na fila antes, no próprio setState. Chamar antes do primeiro goto, só nos testes que precisam:
 *  troca o rAF da página inteira.
 *  - rAF pedido de dentro de um rAF vai ao quadro de verdade: um laço de animação não vira uma
 *    cadeia infinita de microtasks.
 *  - cada pedido ganha um número próprio, e cancelAnimationFrame cancela: a deduplicação e o
 *    cancelamento de console/foco.ts continuam valendo. */
export async function quadroAntesDoCommit(page: Page) {
  await page.addInitScript(() => {
    const real = window.requestAnimationFrame.bind(window);
    const cancelarReal = window.cancelAnimationFrame.bind(window);
    const cancelados = new Set<number>();
    let id = 1e6;
    let dentro = false;
    window.requestAnimationFrame = (cb) => {
      if (dentro) return real(cb);
      const n = ++id;
      queueMicrotask(() => {
        if (cancelados.delete(n)) return;
        dentro = true;
        try {
          cb(performance.now());
        } finally {
          dentro = false;
        }
      });
      return n;
    };
    window.cancelAnimationFrame = (n) => (n > 1e6 ? void cancelados.add(n) : cancelarReal(n));
  });
}
