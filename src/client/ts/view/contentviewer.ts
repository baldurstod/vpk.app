import { getLoader, pcfToSTring, Repositories, Source1TextureManager, Source2TextureManager, SourceEnginePCFLoader, SourceEngineVTF, SourcePCF, TEXTUREFLAGS_CLAMPS, TEXTUREFLAGS_CLAMPT, TEXTUREFLAGS_NORMAL, TEXTUREFLAGS_SRGB } from 'harmony-3d';
import { createElement, createShadowRoot, defineHarmonyMenu, defineHarmonyTab, defineHarmonyTabGroup, HTMLHarmonyMenuElement, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, TabEventData } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import contentViewerCSS from '../../css/contentviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { ContentType, GameEngine } from '../enums';
import { Audio, AudioType } from '../model/audio';
import { Texture, TextureParamType, TextureWrap } from '../model/texture';
import { AudioPlayer } from './audioplayer';
import { MaterialViewer } from './materialviewer';
import { ModelViewer } from './modelviewer';
import { SiteElement } from './siteelement';
import { TextureViewer } from './textureviewer';
import { TextViewer, TextViewerRange } from './textviewer';

const TypePerExtension: { [key: string]: ContentType } = {
	'cfg': ContentType.Txt,
	'txt': ContentType.Txt,

	// Source 1
	'vtf': ContentType.Source1Texture,
	'mdl': ContentType.Source1Model,
	'pcf': ContentType.Source1Particle,

	// Source 2
	'vmat_c': ContentType.Source2Material,
	'vtex_c': ContentType.Source2Texture,
	'vmdl_c': ContentType.Source2Model,

	'mp3': ContentType.AudioMp3,
	'wav': ContentType.AudioWav,
	'flac': ContentType.AudioFlac,
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
	#htmlMaterialViewer?: MaterialViewer;
	#htmlAudioPlayer?: AudioPlayer;
	#openViewers = new Map2<string, string, HTMLHarmonyTabElement>();
	#htmlContextMenu?: HTMLHarmonyMenuElement;

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

	async viewFile(repository: string, path: string, hash: string, search: URLSearchParams | null, engine: GameEngine, file: File, userAction: boolean): Promise<void> {
		let tab: HTMLHarmonyTabElement | undefined | null = this.#openViewers.get(repository, path);
		if (tab) {
			tab.activate();
			return;
		}
		tab = await this.#viewFile(repository, path, hash, search, engine, file, userAction);
		if (!tab) {
			return;//TODO: error ?
		}
		tab.activate();
		tab.addEventListener('click', (event: Event) => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.SelectFile, { detail: { repository: repository, path: path } })));

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

	async #viewFile(repository: string, path: string, hash: string, search: URLSearchParams | null, engine: GameEngine, file: File, userAction: boolean): Promise<HTMLHarmonyTabElement | null> {
		const extension = path.split('.').pop() ?? '';
		const filename = path.split('/').pop() ?? '';
		const fileType = TypePerExtension[extension];

		switch (fileType) {
			case ContentType.Source1Texture:
				return await this.#addSource1TextureContent(repository, path, search, filename, engine, await file.arrayBuffer());
			case ContentType.Source1Model:
				return await this.#addSource1ModelContent(repository, path, search, filename, engine, await file.arrayBuffer());
			case ContentType.Source1Particle:
				return await this.#addSource1ParticleContent(repository, path, search, hash, filename, engine, await file.arrayBuffer());
			case ContentType.Source2Texture:
				return await this.#addSource2TextureContent(repository, path, search, filename, engine, await file.arrayBuffer());
			case ContentType.Source2Model:
				return await this.#addSource2ModelContent(repository, path, search, filename, engine, await file.arrayBuffer());
			case ContentType.Source2Material:
				return await this.#addSource2MaterialContent(repository, path, search, filename, engine, await file.arrayBuffer());
			case ContentType.AudioMp3:
			case ContentType.AudioWav:
			case ContentType.AudioFlac:
				return await this.#addAudioContent(repository, path, search, filename, GameEngine.None, await file.arrayBuffer(), fileType, userAction);
			case ContentType.Txt:
			default:
				return this.#addTxtContent(repository, path, filename, engine, new TextDecoder().decode(await file.arrayBuffer()));
		}
	}

	#createTab(filename: string, closeFn: (event: CustomEvent<TabEventData>) => void, activatedFn: () => void): HTMLHarmonyTabElement {
		return createElement('harmony-tab', {
			'data-text': filename,
			'data-closable': true,
			parent: this.#htmlTabs,
			$close: closeFn,
			$activated: activatedFn,
			$contextmenu: (event: CustomEvent<TabEventData>) => this.#onTabContextMenu(event),
		}) as HTMLHarmonyTabElement;
	}

	#onTabContextMenu(event: CustomEvent<TabEventData>) {
		defineHarmonyMenu();
		const originalEvent = event.detail.originalEvent as PointerEvent;
		originalEvent.preventDefault();

		if (!this.#htmlContextMenu) {
			this.#htmlContextMenu = createElement('harmony-menu') as HTMLHarmonyMenuElement;
		}

		const tab = event.detail.tab;

		const contextMenu = {
			close: { i18n: '#close', f: () => tab.close() },
			closeall: { i18n: '#close_all', f: () => this.#htmlTabs?.closeAllTabs() },
			closeother: {
				i18n: '#close_other', f: () => {
					const tabs = this.#htmlTabs?.getTabs();
					if (tabs) {
						for (const t of tabs) {
							if (t != tab) {
								t.close();
							}
						}
					}
				}
			},
			closetotheright: {
				i18n: '#close_to_the_right', f: () => {
					const tabs = this.#htmlTabs?.getTabs();
					if (tabs) {
						let close = false;
						for (const t of tabs) {
							if (close) {
								t.close();
							}
							if (t == tab) {
								close = true;
							}
						}
					}
				}
			},
		};

		this.#htmlContextMenu.showContextual(contextMenu, originalEvent.clientX, originalEvent.clientY, null);


		console.info(event);

	}

	#addTxtContent(repository: string, path: string, filename: string, engine: GameEngine, content: string): HTMLHarmonyTabElement {
		this.initHTML();

		if (!this.#htmlTextViewer) {
			this.#htmlTextViewer = new TextViewer();
			this.#htmlContent?.append(this.#htmlTextViewer.getHTML());
		}

		this.#htmlTextViewer?.show();

		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlTextViewer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlTextViewer!.getHTML());
				this.#htmlTextViewer?.setText(repository, path, String(content));
			}
		);

		this.#htmlTextViewer?.setText(repository, path, String(content));
		return tab;
	}

	async #addSource1TextureContent(repository: string, path: string, search: URLSearchParams | null, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
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
		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlTextureViewer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlTextureViewer!.getHTML());
				if (texture) {
					this.#htmlTextureViewer?.setTexture(texture);
				}
			}
		);

		return tab;
	}

	async #addSource1ModelContent(repository: string, path: string, search: URLSearchParams | null, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlModelViewer) {
			this.#htmlModelViewer = new ModelViewer();
			this.#htmlContent?.append(this.#htmlModelViewer.getHTML());
		}

		this.#htmlModelViewer?.show();

		this.#htmlModelViewer?.setSource1Model(repository, path);

		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlModelViewer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlModelViewer!.getHTML());
				this.#htmlModelViewer?.setSource1Model(repository, path);
			}
		);

		return tab;
	}

	async #addSource1ParticleContent(repository: string, path: string, search: URLSearchParams | null, hash: string, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlTextViewer) {
			this.#htmlTextViewer = new TextViewer();
			this.#htmlContent?.append(this.#htmlTextViewer.getHTML());
		}

		this.#htmlTextViewer?.show();

		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlTextViewer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlTextViewer!.getHTML());
				this.#htmlTextViewer?.setText(repository, path, String(content));
			}
		);

		const pcfLoader = getLoader('SourceEnginePCFLoader') as typeof SourceEnginePCFLoader;
		const pcf = await new pcfLoader().load(repository, path) as SourcePCF;


		const pcfResult = pcfToSTring(pcf);
		if (pcfResult) {

			const anchors = new Map<string, TextViewerRange>();
			for (const [id, line] of pcfResult.elementsLine) {
				anchors.set(id, {
					startRow: line,
					startCol: 0,
				});
			}

			await this.#htmlTextViewer?.setText(repository, path, pcfResult.text, anchors);
		}

		await this.#htmlTextViewer?.select(hash);

		return tab;
	}

	async #addSource2TextureContent(repository: string, path: string, search: URLSearchParams | null, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlTextureViewer) {
			this.#htmlTextureViewer = new TextureViewer();
			this.#htmlContent?.append(this.#htmlTextureViewer.getHTML());
		}

		this.#htmlTextureViewer?.show();

		const vtex = await Source2TextureManager.getVtex(repository, path);
		let texture: Texture;
		if (vtex) {
			const imageData = await vtex.getImageData();
			console.info(vtex, imageData);

			if (imageData) {
				texture = new Texture(repository, path, imageData);
				//vtfToTextureFlags(vtex, texture);
				this.#htmlTextureViewer?.setTexture(texture);
			}
		}

		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlTextureViewer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlTextureViewer!.getHTML());
				if (texture) {
					this.#htmlTextureViewer?.setTexture(texture);
				}
			}
		);

		return tab;
	}

	async #addSource2ModelContent(repository: string, path: string, search: URLSearchParams | null, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlModelViewer) {
			this.#htmlModelViewer = new ModelViewer();
			this.#htmlContent?.append(this.#htmlModelViewer.getHTML());
		}

		this.#htmlModelViewer?.show();

		this.#htmlModelViewer?.setSource2Model(repository, path);

		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlModelViewer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlModelViewer!.getHTML());
				this.#htmlModelViewer?.setSource2Model(repository, path);
			}
		);

		return tab;
	}

	async #addSource2MaterialContent(repository: string, path: string, search: URLSearchParams | null, filename: string, engine: GameEngine, content: ArrayBuffer): Promise<HTMLHarmonyTabElement> {
		this.initHTML();

		if (!this.#htmlMaterialViewer) {
			this.#htmlMaterialViewer = new MaterialViewer();
			this.#htmlContent?.append(this.#htmlMaterialViewer.getHTML());
		}

		this.#htmlMaterialViewer?.show();

		this.#htmlMaterialViewer?.setSource2Material(repository, path);

		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlMaterialViewer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlMaterialViewer!.getHTML());
				this.#htmlMaterialViewer?.setSource2Material(repository, path);
			}
		);

		return tab;
	}

	async #addAudioContent(repository: string, path: string, search: URLSearchParams | null, filename: string, engine: GameEngine, content: ArrayBuffer, fileType: ContentType.AudioMp3 | ContentType.AudioWav | ContentType.AudioFlac, userAction: boolean): Promise<HTMLHarmonyTabElement | null> {
		this.initHTML();

		const response = await Repositories.getFileAsArrayBuffer(repository, path);

		if (response.error) {
			return null;
		}

		if (!this.#htmlAudioPlayer) {
			this.#htmlAudioPlayer = new AudioPlayer();
			this.#htmlContent?.append(this.#htmlAudioPlayer.getHTML());
		}

		this.#htmlAudioPlayer?.show();

		const audio = new Audio(repository, path, fileTypeToAudioType(fileType), response.buffer as ArrayBuffer);
		this.#htmlAudioPlayer?.setAudio(audio, userAction);

		const tab = this.#createTab(filename,
			(event: CustomEvent<TabEventData>) => {
				if (this.#closeFile(repository, path) && event.detail.tab.isActive()) {
					this.#htmlAudioPlayer?.hide();
				};
			},
			() => {
				this.#htmlContent?.replaceChildren(this.#htmlAudioPlayer!.getHTML());
				this.#htmlAudioPlayer?.setAudio(audio, userAction);
			}
		);

		return tab;
	}
}

function fileTypeToAudioType(fileType: ContentType.AudioMp3 | ContentType.AudioWav | ContentType.AudioFlac): AudioType {
	switch (fileType) {
		case ContentType.AudioMp3:
			return AudioType.Mp3;
		case ContentType.AudioWav:
			return AudioType.Wav;
		case ContentType.AudioFlac:
			return AudioType.Flac;
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
