import { ColorBackground, Scene, Source1ModelManager } from 'harmony-3d';
import { downloadSVG } from 'harmony-svg';
import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import modelViewerCSS from '../../css/modelviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { setParent, setScene, startupRenderer } from '../graphics';
import { SiteElement } from './siteelement';

export class ModelViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlText?: HTMLElement;
	#vpkPath: string = '';
	#path: string = '';
	#scenes = new Map2<string, string, Scene>();

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: modelViewerCSS,
			childs: [
				this.#htmlToolbar = createElement('div', {
					class: 'toolbar',
					childs: [
						createElement('span', {
							i18n: { title: '#download_file' },
							innerHTML: downloadSVG,
							$click: () => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { vpkPath: this.#vpkPath, path: this.#path } })),
						}),
					],
				}),
				this.#htmlText = createElement('div', {
					class: 'viewer',
				}),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	async setModel(vpkPath: string, path: string): Promise<void> {
		startupRenderer();
		this.show();
		this.#vpkPath = vpkPath;
		this.#path = path;

		let scene = this.#scenes.get(vpkPath, path);
		if (!scene) {
			scene = new Scene();

			scene.background = new ColorBackground();
			this.#scenes.set(vpkPath, path, scene);
			const model = await Source1ModelManager.createInstance(vpkPath, path, true);
			scene.addChild(model);
			model.frame = 0.;
		}

		setScene(scene);
		//.append(getCanvas());
		setParent(this.#htmlText!);
	}

	show(): void {
		this.initHTML();
		show(this.#htmlText);
	}

	hide(): void {
		hide(this.#htmlText);
	}
}
