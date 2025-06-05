import { createElement, createShadowRoot, defineHarmonyTab, defineHarmonyTabGroup, HTMLHarmonyTabGroupElement } from 'harmony-ui';
import contentViewerCSS from '../../css/contentviewer.css';
import { SiteElement } from './siteelement';
import { ContentType, GameEngine } from '../enums';
import { TextViewer } from './textviewer';

const TypePerExtension: { [key: string]: ContentType } = {
	'cfg': ContentType.Txt,
	'txt': ContentType.Txt,

	// Source 1
	'vtf': ContentType.Source1Texture,
};

export class Content {
	path: string = '';
	filename: string = '';
	type: ContentType = ContentType.Unknown;
	content?: ArrayBuffer;
	userData: any;
}

export class ContentViewer extends SiteElement {
	#htmlTabs?: HTMLHarmonyTabGroupElement;
	#htmlContent?: HTMLElement;
	#htmlTextViewer?: TextViewer;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		defineHarmonyTabGroup();
		defineHarmonyTab();
		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: contentViewerCSS,
			childs: [
				this.#htmlTabs = createElement('harmony-tab-group', { class: 'tabs' }) as HTMLHarmonyTabGroupElement,
				this.#htmlContent = createElement('div', { class: 'content' }),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	async addFile(path: string, engine: GameEngine, file: File) {
		console.info(path)
		const extension = path.split('.').pop() ?? '';
		const filename = path.split('/').pop() ?? '';
		const fileType = TypePerExtension[extension];

		switch (fileType) {
			case ContentType.Txt:
				file.arrayBuffer
				this.#addTxtContent(filename, engine, new TextDecoder().decode(await file.arrayBuffer()));
				break;
			default:
				break;
		}
	}

	#addTxtContent(filename: string, engine: GameEngine, content: string) {
		this.initHTML();

		if (!this.#htmlTextViewer) {
			this.#htmlTextViewer = new TextViewer();
			this.#htmlContent?.append(this.#htmlTextViewer.getHTML());
		}

		createElement('harmony-tab', {
			'data-text': filename,
			parent: this.#htmlTabs,
			$activated: () => this.#htmlTextViewer?.setText(String(content)),
		});

		this.#htmlTextViewer?.setText(String(content));
	}
}
