import { imageDataToImage, Source1TextureManager } from 'harmony-3d';
import { createElement, createShadowRoot, defineHarmonyTab, defineHarmonyTabGroup, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, TabEventData } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import contentViewerCSS from '../../css/contentviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { ContentType, GameEngine } from '../enums';
import { ModelViewer } from './modelviewer';
import { SiteElement } from './siteelement';
import { TextureViewer } from './textureviewer';
import { TextViewer } from './textviewer';

const TypePerExtension: { [key: string]: ContentType } = {
	'cfg': ContentType.Txt,
	'txt': ContentType.Txt,

	// Source 1
	'vtf': ContentType.Source1Texture,
	'mdl': ContentType.Source1Model,
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
	#htmlTextureViewer?: TextureViewer;
	#htmlModelViewer?: ModelViewer;
	#openViewers = new Map2<string, string, HTMLHarmonyTabElement>();

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

	async viewFile(vpkPath: string, path: string, engine: GameEngine, file: File) {
		let tab = this.#openViewers.get(vpkPath, path);
		if (tab) {
			tab.activate();
			return;
		}
		tab = await this.#viewFile(vpkPath, path, engine, file);
		tab.activate();
		tab.addEventListener('activated', (event: Event) => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.SelectFile, { detail: { vpkPath: vpkPath, path: path } })));

		this.#openViewers.set(vpkPath, path, tab);
	}

	#closeFile(vpkPath: string, path: string): boolean {
		const tab = this.#openViewers.get(vpkPath, path);
		if (!tab) {
			return false;
		}
		this.#openViewers.delete(vpkPath, path);

		//tab.close();

		return true;
	}

	async #viewFile(vpkPath: string, path: string, engine: GameEngine, file: File): Promise<HTMLHarmonyTabElement> {
		const extension = path.split('.').pop() ?? '';
		const filename = path.split('/').pop() ?? '';
		const fileType = TypePerExtension[extension];

		switch (fileType) {
			case ContentType.Source1Texture:
				return await this.#addSource1TextureContent(vpkPath, path, filename, engine, await file.arrayBuffer());
			case ContentType.Source1Model:
				return await this.#addSource1ModelContent(vpkPath, path, filename, engine, await file.arrayBuffer());
			case ContentType.Txt:
			default:
				return this.#addTxtContent(vpkPath, path, filename, engine, new TextDecoder().decode(await file.arrayBuffer()));
		}
	}

	#addTxtContent(vpkPath: string, path: string, filename: string, engine: GameEngine, content: string): HTMLHarmonyTabElement {
		this.initHTML();

		if (!this.#htmlTextViewer) {
			this.#htmlTextViewer = new TextViewer();
		}

		this.#htmlTextViewer?.show();

		const tab = createElement('harmony-tab', {
			'data-text': filename,
			'data-closable': true,
			parent: this.#htmlTabs,
			$close: (event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(vpkPath, path) && event.detail.tab.isActive()) {
					this.#htmlTextViewer?.hide();
				};
			},
			$activated: () => {
				this.#htmlContent?.replaceChildren(this.#htmlTextViewer!.getHTML());
				this.#htmlTextViewer?.setText(String(content));
			},
		}) as HTMLHarmonyTabElement;

		this.#htmlTextViewer?.setText(String(content));
		return tab;
	}

	async #addSource1TextureContent(vpkPath: string, path: string, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlTextureViewer) {
			this.#htmlTextureViewer = new TextureViewer();
			this.#htmlContent?.append(this.#htmlTextureViewer.getHTML());
		}

		this.#htmlTextureViewer?.show();

		const vtf = await Source1TextureManager.getVtf(vpkPath, path);
		let image: HTMLImageElement | undefined;
		if (vtf) {
			const imageData = await vtf.getImageData();
			console.info(vtf, imageData);
			if (imageData) {
				image = imageDataToImage(imageData);
			}
		}

		if (!image) {
			image = createElement('img') as HTMLImageElement;
		}

		this.#htmlTextureViewer?.setImage(vpkPath, path, image);


		const tab = createElement('harmony-tab', {
			'data-text': filename,
			'data-closable': true,
			parent: this.#htmlTabs,
			$close: (event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(vpkPath, path) && event.detail.tab.isActive()) {
					this.#htmlTextureViewer?.hide();
				};
			},
			$activated: () => {
				this.#htmlContent?.replaceChildren(this.#htmlTextureViewer!.getHTML());
				this.#htmlTextureViewer?.setImage(vpkPath, path, image);
			},
		}) as HTMLHarmonyTabElement;

		return tab;
	}

	async #addSource1ModelContent(vpkPath: string, path: string, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlModelViewer) {
			this.#htmlModelViewer = new ModelViewer();
			this.#htmlContent?.append(this.#htmlModelViewer.getHTML());
		}

		this.#htmlModelViewer?.show();

		const vtf = await Source1TextureManager.getVtf(vpkPath, path);
		let image: HTMLImageElement | undefined;
		if (vtf) {
			const imageData = await vtf.getImageData();
			console.info(vtf, imageData);
			if (imageData) {
				image = imageDataToImage(imageData);
			}
		}

		if (!image) {
			image = createElement('img') as HTMLImageElement;
		}

		this.#htmlModelViewer?.setModel(vpkPath, path);

		const tab = createElement('harmony-tab', {
			'data-text': filename,
			'data-closable': true,
			parent: this.#htmlTabs,
			$close: (event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(vpkPath, path) && event.detail.tab.isActive()) {
					this.#htmlModelViewer?.hide();
				};
			},
			$activated: () => {
				this.#htmlContent?.replaceChildren(this.#htmlModelViewer!.getHTML());
				this.#htmlModelViewer?.setModel(vpkPath, path);
			},
		}) as HTMLHarmonyTabElement;

		return tab;
	}
}
