import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import textViewerCSS from '../../css/textviewer.css';
import { SiteElement } from './siteelement';
import { loadScripts } from 'harmony-browser-utils';


export class TextViewer extends SiteElement {
	#htmlText?: HTMLElement;
	#aceEditor?: any;
	#aceEditorResolve!: () => void;
	#aceEditorReady = new Promise((resolve: (value: void) => void) => this.#aceEditorResolve = resolve);

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: textViewerCSS,
			childs: [
				this.#htmlText = createElement('div', {
					class: 'editor',
				}),
			]
		});

		(async () => {
			await loadScripts(['./js/ace-builds/src-min/ace.js']);
			this.#aceEditor = (globalThis as any).ace.edit(this.#htmlText);
			this.#aceEditor.setTheme('ace/theme/monokai');
			//this.#aceEditor.session.setMode("ace/mode/javascript");
			this.#aceEditor.renderer.attachToShadowRoot();
			this.#aceEditorResolve();
		})();
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	async setText(text: string) {
		this.show();
		//this.#htmlText!.innerText = text;

		await this.#aceEditorReady;
		this.#aceEditor.setValue(text);
	}

	show() {
		this.initHTML();
		show(this.#htmlText);
	}

	hide() {
		hide(this.#htmlText);
	}
}
