// tooltip.ts

/**
 * Parametri di configurazione per l'azione tooltip.
 */
interface TooltipParams {
  text: string | HTMLElement; // Il testo o l'elemento HTML da mostrare
  textClass?: string;         // Classi CSS per il testo
  paddingClass?: string;      // Classi CSS per il padding
  width?: string;             // Larghezza (es. '48', che diventa 'w-48')
  background?: string;        // Classe CSS per lo sfondo (es. 'bg-gray-800')
}

/**
 * Azione Svelte per mostrare un tooltip al passaggio del mouse.
 * @param node L'elemento HTML a cui applicare l'azione.
 * @param params I parametri di configurazione.
 */
export const tooltip = (node: HTMLElement, params: TooltipParams) => {
    console.log(params)
  let alreadyLeft: boolean;
  let timer: number;
  let currentParams: TooltipParams = params;

  const getHtmlContent = (): string | HTMLElement => currentParams.text;

  function handleDebounceEnter(event: MouseEvent) {
    event.stopPropagation();
    alreadyLeft = false;
    
    const target = event.target as HTMLElement;
    target.querySelector(".js-tooltip")?.remove();
    
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!alreadyLeft) {
        render(event);
      }
    }, 300);
  }

  const render = (event: MouseEvent) => {
    const content = getHtmlContent();
    const target = event.target as HTMLElement;

    // Crea l'elemento contenitore del tooltip
    const span = document.createElement("span");
    const widthClass = currentParams.width ? `w-${currentParams.width}` : '';
    
    // 1. Aggiungi tutte le classi fisse
    span.classList.add(
         "js-tooltip", "invisible", "scale-null", 
      
      "animated", "delay-200", "pointer-events-none", "tooltip", "flex", 
      "text-xs", "absolute", "z-10", 
      "bottom-full", 
      "mb-2", 
    );

    // 2. Aggiungi la classe della larghezza SOLO SE esiste
    if (widthClass) {
      span.classList.add(widthClass);
    }

    // Contenuto interno del tooltip
    const backgroundClass = currentParams.background || 'bg-blue-400';
    const paddingClass = currentParams.paddingClass || 'md:px-4 md:py-2 py-2 px-4';
    const textClass = currentParams.textClass || '';
    const textContent = typeof content === 'string' ? content : '';
    
    span.innerHTML = /*html*/ `
      <span
        style="width: max-content;"
        class="js-tooltip-content flex shadow-md rounded-xl origin-top z-10 
               ${backgroundClass} text-white ${paddingClass} ${textClass}">
        ${textContent}
      </span>
    `;
    
    target.appendChild(span);

    // Se il contenuto è un elemento HTML, lo appende
    if (content instanceof HTMLElement) {
      content.classList.remove('hidden');
      content.classList.add('flex');
      span.querySelector('.js-tooltip-content')?.appendChild(content);
    }
  
    // Animazione di entrata
    window.setTimeout(() => {
      const tooltipEl = target.querySelector<HTMLElement>(".js-tooltip");
      if (tooltipEl) {
        tooltipEl.classList.remove("invisible", "scale-null");
        tooltipEl.classList.add("visible", "scale-full");
      }
    }, 200);
  };
  
  const handleLeave = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const tooltipEl = target.querySelector<HTMLElement>(".js-tooltip");
    
    if (tooltipEl) {
      tooltipEl.classList.add("scale-null");
      tooltipEl.classList.remove("delay-200", "visible", "scale-full");
    }
    
    alreadyLeft = true;
    window.setTimeout(() => {
      tooltipEl?.remove();
    }, 200);  
  };

  const isHtmlContent = getHtmlContent() instanceof HTMLElement;

  // Associa gli eventi al nodo
  node.addEventListener("mouseenter", handleDebounceEnter, isHtmlContent);
  node.addEventListener("mouseleave", handleLeave, isHtmlContent);

  return {
    update: (newParams: Partial<TooltipParams>) => {
      currentParams = { ...currentParams, ...newParams };
      const tooltipContent = node.querySelector<HTMLElement>('.js-tooltip-content');

      // Aggiorna il testo se il tooltip è già visibile e il testo è una stringa
      if (tooltipContent && typeof currentParams.text === 'string' && tooltipContent.innerText !== currentParams.text) {
        tooltipContent.innerText = currentParams.text;
      }
    },
    destroy() {
      window.clearTimeout(timer);
      node.removeEventListener("mouseenter", handleDebounceEnter, isHtmlContent);
      node.removeEventListener("mouseleave", handleLeave, isHtmlContent);
    },
  };
};