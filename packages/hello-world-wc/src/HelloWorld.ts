import { LitElement, html } from 'lit';
import { twMerge } from 'tailwind-merge';
import styles from './tw.css?inline';

// Custom merge function that handles our prefix
function mergePrefixedClasses(...inputs: (string | undefined)[]): string {
  // Remove prefix temporarily, merge, then add it back
  const unprefixed = inputs.map(input => 
    input?.replace(/copilotkit-/g, '') || ''
  );
  
  const merged = twMerge(...unprefixed);
  
  // Add prefix back to all classes
  return merged.split(' ')
    .filter(Boolean)
    .map(cls => `copilotkit-${cls}`)
    .join(' ');
}

let stylesInjected = false;
function ensureStylesInjected() {
  if (stylesInjected) return;
  if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-hello-world-wc', 'tw');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    stylesInjected = true;
  }
}

export class HelloWorld extends LitElement {
  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    ensureStylesInjected();
  }

  render() {
    const base = 'copilotkit-bg-red-500 copilotkit-text-white copilotkit-font-sans copilotkit-p-3';

    const user = this.getAttribute('class') ?? '';

    // User classes come after base classes so they override
    const merged = mergePrefixedClasses(base, user);

    return html`<div class="${merged}">Hello world</div>`;
  }
}