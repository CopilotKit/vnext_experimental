export { HelloWorld } from './HelloWorld';

import { HelloWorld } from './HelloWorld';
if (!customElements.get('hello-world-wc')) {
  customElements.define('hello-world-wc', HelloWorld);
}