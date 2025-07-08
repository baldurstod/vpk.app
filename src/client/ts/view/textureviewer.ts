import { imageDataToImage } from 'harmony-3d';
import { saveFile } from 'harmony-browser-utils';
import { backgroundReplaceSVG, downloadSVG, fileExportSVG, textureSVG, wallpaperSVG } from 'harmony-svg';
import { createElement, createShadowRoot } from 'harmony-ui';
import textureViewerCSS from '../../css/textureviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { Texture, TextureParam, TextureParamType, TextureWrap } from '../model/texture';
import { SiteElement } from './siteelement';

enum TextureMode {
	Alpha = 0,
	Rgb = 1,
	Rgba = 2,
}

type TextureOption = {
	mode: TextureMode;
}

export class TextureViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlContainer?: HTMLElement;
	#htmlParams?: HTMLElement;
	#htmlImageContainer?: HTMLElement;
	//#imageData?: ImageData;
	#texture?: Texture;
	#htmlImage?: HTMLImageElement;
	#mode = TextureMode.Rgb;
	#textureOptions = new Map<Texture, TextureOption>;

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
							$click: () => {
								if (this.#texture) {
									Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { repository: this.#texture.getOrigin(), path: this.#texture.getPath() } }));
								}
							},
						}),
						createElement('span', {
							i18n: { title: '#export_file' },
							innerHTML: fileExportSVG,
							$click: () => this.#convertImage(),
						}),
						createElement('span', {
							i18n: { title: '#rgb' },
							innerHTML: wallpaperSVG,
							$click: () => this.setMode(TextureMode.Rgb),
						}),
						createElement('span', {
							i18n: { title: '#rgba' },
							innerHTML: backgroundReplaceSVG,
							$click: () => this.setMode(TextureMode.Rgba),
						}),
						createElement('span', {
							i18n: { title: '#alpha' },
							innerHTML: textureSVG,
							$click: () => this.setMode(TextureMode.Alpha),
						}),
					],
				}),
				this.#htmlContainer = createElement('div', {
					class: 'container',
					childs: [
						this.#htmlParams = createElement('div', { class: 'flags', }),
						this.#htmlImageContainer = createElement('div', { class: 'image', }),

					]
				}),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	setTexture(texture: Texture) {
		this.show();
		this.#texture = texture;
		const origin = texture.getOrigin();
		const path = texture.getPath();

		let textureOptions = this.#textureOptions.get(texture);
		if (!textureOptions) {
			textureOptions = { mode: this.#mode };
			this.#textureOptions.set(texture, textureOptions);
		}
		this.#mode = textureOptions.mode;
		this.#updateImage();
		this.#updateParams();
	}

	setMode(mode: TextureMode) {
		if (mode == this.#mode) {
			return;
		}

		if (this.#texture) {
			const textureOptions = this.#textureOptions.get(this.#texture);
			if (textureOptions) {
				textureOptions.mode = mode;
			}
		}

		this.#mode = mode;
		this.#updateImage();
	}

	#updateImage() {
		if (!this.#texture) {
			return;
		}

		const textureImageData = this.#texture.getImageData();
		const imageData = new ImageData(new Uint8ClampedArray(textureImageData.data), textureImageData.width, textureImageData.height);

		switch (this.#mode) {
			case TextureMode.Alpha:
				for (let i = 0; i < imageData?.data.length; i += 4) {
					const alpha = imageData.data[i + 3];
					imageData.data[i] = alpha;
					imageData.data[i + 1] = alpha;
					imageData.data[i + 2] = alpha;
					imageData.data[i + 3] = 255;
				}
				break;
			case TextureMode.Rgb:
				for (let i = 3; i < imageData?.data.length; i += 4) {
					imageData.data[i] = 255;
				}
				break;
		}

		const image = imageDataToImage(imageData);
		this.#htmlImageContainer!.replaceChildren(image);
		this.#htmlImage = image;
	}

	#updateParams() {
		if (!this.#texture || !this.#htmlParams) {
			return;
		}

		this.#htmlParams.replaceChildren();

		for (const [name, param] of this.#texture.getParams()) {
			this.#htmlParams.append(createParam(param));
		}
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

		canvas.width = this.#htmlImage.naturalWidth;
		canvas.height = this.#htmlImage.naturalHeight;
		context.drawImage(this.#htmlImage, 0, 0);

		canvas.toBlob(blob => {
			if (!blob || !this.#texture) {
				return;
			}
			saveFile(new File([blob], `${this.#texture.getPath()}.png`));
		});
	}
}

function createParam(param: TextureParam): HTMLElement {
	let htmlValue;
	switch (param.type) {
		case TextureParamType.String:
			htmlValue = createElement('span', {
				innerText: param.value as string,
			});
			break;
		case TextureParamType.Number:
			htmlValue = createElement('span', {
				innerText: String(param.value as number),
			});
			break;
		case TextureParamType.Boolean:
			htmlValue = createElement('input', {
				type: 'checkbox',
				checked: param.value as boolean,
				disabled: true,
			});
			break;
		case TextureParamType.TextureWrap:
			htmlValue = createElement('span', {
				i18n: param.value as TextureWrap == TextureWrap.Clamp ? '#clamp' : '#repeat',
			});
			break;
	}
	return createElement('label', {
		childs: [
			createElement('span', {
				i18n: param.i18n,
			}),
			htmlValue!,
		]
	});
}
