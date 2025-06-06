import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
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
		this.show();
		this.#htmlText!.innerText = text;
	}

	show() {
		this.initHTML();
		show(this.#htmlText);
	}

	hide() {
		hide(this.#htmlText);
	}
}
