import { downloadSVG, pauseSVG, playSVG } from 'harmony-svg';
import { createElement, createShadowRoot } from 'harmony-ui';
import textureViewerCSS from '../../css/textureviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { Audio } from '../model/audio';
import { TextureParam, TextureParamType, TextureWrap } from '../model/texture';
import { SiteElement } from './siteelement';

export class AudioPlayer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlContainer?: HTMLElement;
	#htmlParams?: HTMLElement;
	#htmlImageContainer?: HTMLElement;
	#audio?: Audio;
	#htmlImage?: HTMLImageElement;
	#context = new AudioContext();
	#audioBuffer?: AudioBuffer;
	#source: AudioBufferSourceNode | null = null;
	#elapsed: number = 0;
	#start: number = 0;

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
								if (this.#audio) {
									Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { repository: this.#audio.getRepository(), path: this.#audio.getPath() } }));
								}
							},
						}),
						createElement('span', {
							i18n: { title: '#play' },
							innerHTML: playSVG,
							$click: () => this.#play(),
						}),
						createElement('span', {
							i18n: { title: '#pause' },
							innerHTML: pauseSVG,
							$click: () => this.#pause(),
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

	setAudio(audio: Audio) {
		this.show();
		if (audio == this.#audio) {
			return;
		}

		this.#audio = audio;
		this.#elapsed = 0;

		this.#updateAudio();
		this.#updateParams();
	}

	async #updateAudio() {
		if (!this.#audio) {
			return;
		}

		this.#source = null;

		//this.#source.buffer =
		this.#audioBuffer = await this.#context.decodeAudioData(this.#audio.getData());
	}

	#updateParams() {
		if (!this.#audio || !this.#htmlParams) {
			return;
		}

		this.#htmlParams.replaceChildren();

		for (const [name, param] of this.#audio.getParams()) {
			this.#htmlParams.append(createParam(param));
		}
	}

	async #play(): Promise<void> {
		if (this.#source) {
			//this.#source.stop();
			this.#source.playbackRate.value = 1.0;
			return;
		}

		if (!this.#audioBuffer) {
			return;
		}

		this.#source = new AudioBufferSourceNode(this.#context, { buffer: this.#audioBuffer, loop: true, })//this.#context.createBufferSource();
		//this.#source.addEventListener('ended', (event: Event) => this.#source = null);
		//this.#source.buffer = this.#audioBuffer;
		this.#source.connect(this.#context.destination);
		this.#source.start(0, this.#elapsed);
		this.#start = this.#context.currentTime;
	}

	#pause(): void {
		if (this.#source) {
			this.#source.playbackRate.value = 0.0;
		}

		//this.#elapsed = this.#context.currentTime - this.#start;
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
