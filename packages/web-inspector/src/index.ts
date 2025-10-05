import { LitElement, css, html, unsafeCSS } from 'lit';
import tailwindStyles from './styles/generated.css';

export const WEB_INSPECTOR_TAG = 'web-inspector' as const;

export class WebInspectorElement extends LitElement {
  static styles = [
    unsafeCSS(tailwindStyles),
    css`
      :host {
        display: block;
        padding: 1.5rem;
        box-sizing: border-box;
      }
    `,
  ];

  render() {
    return html`
      <section
        class="rounded-2xl bg-white p-6 shadow-lg shadow-slate-900/10 ring-1 ring-inset ring-slate-200"
      >
        <div class="flex items-center gap-3">
          <span
            class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600"
          >
            WI
          </span>

          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-slate-900">Web Inspector</h2>
            <p class="text-sm text-slate-500">
              Tailwind CSS now powers the styling directly inside this shadow DOM.
            </p>
          </div>
        </div>

        <p class="mt-4 text-base text-slate-600">
          Utility classes stay scoped to the inspector, keeping parent pages
          clean while you iterate.
        </p>

        <button
          class="mt-6 inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
        >
          Open inspector
        </button>
      </section>
    `;
  }
}

export function defineWebInspector(): void {
  if (!customElements.get(WEB_INSPECTOR_TAG)) {
    customElements.define(WEB_INSPECTOR_TAG, WebInspectorElement);
  }
}

defineWebInspector();

declare global {
  interface HTMLElementTagNameMap {
    'web-inspector': WebInspectorElement;
  }
}
