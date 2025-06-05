import { createElement, createShadowRoot } from 'harmony-ui';
import textViewerCSS from '../../css/textviewer.css';
import { SiteElement } from './siteelement';


export class TextViewer extends SiteElement {
	#htmlText?: HTMLElement;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: textViewerCSS,
			childs: [
				this.#htmlText = createElement('div') ,
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	setText(text: string) {
		this.initHTML();
		this.#htmlText!.innerText = text;

	}
}
