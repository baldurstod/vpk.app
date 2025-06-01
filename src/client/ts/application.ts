
import { createShadowRoot, documentStyle } from 'harmony-ui';
import applicationCSS from '../css/application.css';
import { themeCSS } from 'harmony-css';
import htmlCSS from '../css/html.css';

documentStyle(htmlCSS);
documentStyle(themeCSS);

class Application {
	#shadowRoot!: ShadowRoot;

	constructor() {
		this.#initHtml();
	}


	#initHtml() {
		this.#shadowRoot = createShadowRoot('div', {
			parent: document.body,
			adoptStyle: applicationCSS,
		});
	}
}
const app = new Application();
