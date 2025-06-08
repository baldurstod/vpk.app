import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import textViewerCSS from '../../css/textviewer.css';
import { SiteElement } from './siteelement';


export class TextureViewer extends SiteElement {
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

	setImage(image: HTMLImageElement) {
		this.show();
		this.#htmlText!.replaceChildren(image);
	}

	show() {
		this.initHTML();
		show(this.#htmlText);
	}

	hide() {
		hide(this.#htmlText);
	}
}
