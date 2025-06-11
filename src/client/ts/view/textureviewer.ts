import { saveFile } from 'harmony-browser-utils';
import { downloadSVG, fileExportSVG } from 'harmony-svg';
import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import textureViewerCSS from '../../css/textureviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { SiteElement } from './siteelement';

export class TextureViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlText?: HTMLElement;
	#htmlImage?: HTMLImageElement;
	#vpkPath: string = '';
	#path: string = '';

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: textureViewerCSS,
			childs: [
				this.#htmlToolbar = createElement('div', {
					class: 'toolbar',
					childs: [
						createElement('span', {
							i18n: { title: '#download_file' },
							innerHTML: downloadSVG,
							$click: () => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { vpkPath: this.#vpkPath, path: this.#path } })),
						}),
						createElement('span', {
							i18n: { title: '#export_file' },
							innerHTML: fileExportSVG,
							$click: () => this.#convertImage(),
						}),

					],
				}),
				this.#htmlText = createElement('div'),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	setImage(vpkPath: string, path: string, image: HTMLImageElement) {
		this.show();
		this.#htmlText!.replaceChildren(image);
		this.#htmlImage = image;
		this.#vpkPath = vpkPath;
		this.#path = path;
	}

	#convertImage() {
		if (!this.#htmlImage) {
			return;
		}

		const canvas = createElement('canvas') as HTMLCanvasElement;
		const context = canvas.getContext('2d');
		if (!context) {
			return;
		}

		canvas.width = this.#htmlImage.width;
		canvas.height = this.#htmlImage.height;
		context.drawImage(this.#htmlImage, 0, 0);

		canvas.toBlob(blob => {
			if (!blob) {
				return;
			}
			saveFile(new File([blob], `${this.#path}.png`));
		});
	}

	show() {
		this.initHTML();
		show(this.#htmlText);
	}

	hide() {
		hide(this.#htmlText);
	}
}
