import { Source1TextureManager, SourceEngineVTF, TEXTUREFLAGS_CLAMPS, TEXTUREFLAGS_CLAMPT, TEXTUREFLAGS_NORMAL, TEXTUREFLAGS_SRGB } from 'harmony-3d';
import { createElement, createShadowRoot, defineHarmonyTab, defineHarmonyTabGroup, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, TabEventData } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import contentViewerCSS from '../../css/contentviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { ContentType, GameEngine } from '../enums';
import { Texture, TextureParam, TextureParamType, TextureWrap } from '../model/texture';
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

	async viewFile(repository: string, path: string, engine: GameEngine, file: File) {
		let tab = this.#openViewers.get(repository, path);
		if (tab) {
			tab.activate();
			return;
		}
		tab = await this.#viewFile(repository, path, engine, file);
		tab.activate();
		tab.addEventListener('activated', (event: Event) => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.SelectFile, { detail: { origin: repository, path: path } })));

		this.#openViewers.set(repository, path, tab);
	}

	#closeFile(repository: string, path: string): boolean {
		const tab = this.#openViewers.get(repository, path);
		if (!tab) {
			return false;
		}
		this.#openViewers.delete(repository, path);

		//tab.close();

		return true;
	}

	async #viewFile(repository: string, path: string, engine: GameEngine, file: File): Promise<HTMLHarmonyTabElement> {
		const extension = path.split('.').pop() ?? '';
		const filename = path.split('/').pop() ?? '';
		const fileType = TypePerExtension[extension];

		switch (fileType) {
			case ContentType.Source1Texture:
				return await this.#addSource1TextureContent(repository, path, filename, engine, await file.arrayBuffer());
			case ContentType.Source1Model:
				return await this.#addSource1ModelContent(repository, path, filename, engine, await file.arrayBuffer());
			case ContentType.Txt:
			default:
				return this.#addTxtContent(repository, path, filename, engine, new TextDecoder().decode(await file.arrayBuffer()));
		}
	}

	#addTxtContent(repository: string, path: string, filename: string, engine: GameEngine, content: string): HTMLHarmonyTabElement {
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
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
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

	async #addSource1TextureContent(repository: string, path: string, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlTextureViewer) {
			this.#htmlTextureViewer = new TextureViewer();
			this.#htmlContent?.append(this.#htmlTextureViewer.getHTML());
		}

		this.#htmlTextureViewer?.show();

		const vtf = await Source1TextureManager.getVtf(repository, path);
		let texture: Texture;
		if (vtf) {
			const imageData = await vtf.getImageData();
			console.info(vtf, imageData);

			if (imageData) {
				texture = new Texture(repository, path, imageData);
				vtfToTextureFlags(vtf, texture);
				this.#htmlTextureViewer?.setTexture(texture);
			}
		}

		const tab = createElement('harmony-tab', {
			'data-text': filename,
			'data-closable': true,
			parent: this.#htmlTabs,
			$close: (event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlTextureViewer?.hide();
				};
			},
			$activated: () => {
				this.#htmlContent?.replaceChildren(this.#htmlTextureViewer!.getHTML());
				if (texture) {
					this.#htmlTextureViewer?.setTexture(texture);
				}
			},
		}) as HTMLHarmonyTabElement;

		return tab;
	}

	async #addSource1ModelContent(repository: string, path: string, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlModelViewer) {
			this.#htmlModelViewer = new ModelViewer();
			this.#htmlContent?.append(this.#htmlModelViewer.getHTML());
		}

		this.#htmlModelViewer?.show();

		this.#htmlModelViewer?.setModel(repository, path);

		const tab = createElement('harmony-tab', {
			'data-text': filename,
			'data-closable': true,
			parent: this.#htmlTabs,
			$close: (event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlModelViewer?.hide();
				};
			},
			$activated: () => {
				this.#htmlContent?.replaceChildren(this.#htmlModelViewer!.getHTML());
				this.#htmlModelViewer?.setModel(repository, path);
			},
		}) as HTMLHarmonyTabElement;

		return tab;
	}
}

function vtfToTextureFlags(vtf: SourceEngineVTF, texture: Texture) {
	texture.setParam({ name: 'version', type: TextureParamType.String, i18n: '#version', value: `${vtf.versionMaj}.${vtf.versionMin}` });
	texture.setParam({ name: 'width', type: TextureParamType.Number, i18n: '#width', value: vtf.width });
	texture.setParam({ name: 'height', type: TextureParamType.Number, i18n: '#height', value: vtf.height });
	texture.setParam({ name: 'wraps', type: TextureParamType.TextureWrap, i18n: '#wrap_s', value: vtf.getFlag(TEXTUREFLAGS_CLAMPS) ? TextureWrap.Clamp : TextureWrap.Repeat });
	texture.setParam({ name: 'wrapt', type: TextureParamType.TextureWrap, i18n: '#wrap_t', value: vtf.getFlag(TEXTUREFLAGS_CLAMPT) ? TextureWrap.Clamp : TextureWrap.Repeat });
	texture.setParam({ name: 'srgb', type: TextureParamType.Boolean, i18n: '#srgb', value: vtf.getFlag(TEXTUREFLAGS_SRGB) });
	texture.setParam({ name: 'normal', type: TextureParamType.Boolean, i18n: '#normal', value: vtf.getFlag(TEXTUREFLAGS_NORMAL) });


	/*
export const TEXTUREFLAGS_POINTSAMPLE			= 0x00000001;
export const TEXTUREFLAGS_TRILINEAR			= 0x00000002;
export const TEXTUREFLAGS_CLAMPS				= 0x00000004;
export const TEXTUREFLAGS_CLAMPT				= 0x00000008;
export const TEXTUREFLAGS_ANISOTROPIC			= 0x00000010;
export const TEXTUREFLAGS_HINT_DXT5			= 0x00000020;
export const TEXTUREFLAGS_SRGB				= 0x00000040;
export const TEXTUREFLAGS_NORMAL				= 0x00000080;
export const TEXTUREFLAGS_NOMIP				= 0x00000100;
export const TEXTUREFLAGS_NOLOD				= 0x00000200;
export const TEXTUREFLAGS_ALL_MIPS			= 0x00000400;
export const TEXTUREFLAGS_PROCEDURAL			= 0x00000800;
export const TEXTUREFLAGS_ONEBITALPHA			= 0x00001000;
export const TEXTUREFLAGS_EIGHTBITALPHA		= 0x00002000;
export const TEXTUREFLAGS_ENVMAP				= 0x00004000;
export const TEXTUREFLAGS_RENDERTARGET		= 0x00008000;
export const TEXTUREFLAGS_DEPTHRENDERTARGET	= 0x00010000;
export const TEXTUREFLAGS_NODEBUGOVERRIDE		= 0x00020000;
export const TEXTUREFLAGS_SINGLECOPY			= 0x00040000;
export const TEXTUREFLAGS_NODEPTHBUFFER		= 0x00800000;
export const TEXTUREFLAGS_UNUSED_01000000		= 0x01000000;
export const TEXTUREFLAGS_CLAMPU				= 0x02000000;
export const TEXTUREFLAGS_VERTEXTEXTURE		= 0x04000000;// Useable as a vertex texture
export const TEXTUREFLAGS_SSBUMP				= 0x08000000;
// Clamp to border color on all texture coordinates
export const TEXTUREFLAGS_BORDER				= 0x20000000;
export const TEXTUREFLAGS_UNUSED_40000000		= 0x40000000;
export const TEXTUREFLAGS_UNUSED_80000000		= 0x80000000;

*/

}
