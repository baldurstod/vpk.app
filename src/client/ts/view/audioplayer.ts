import { downloadSVG, pauseSVG, playSVG } from 'harmony-svg';
import { createElement, createShadowRoot } from 'harmony-ui';
import textureViewerCSS from '../../css/textureviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { Audio, AudioParam, AudioParamType } from '../model/audio';
import { SiteElement } from './siteelement';

type AudioOption = {
	playing: boolean;
	loop: boolean;
	audioBuffer?: AudioBuffer;
}

export class AudioPlayer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlContainer?: HTMLElement;
	#htmlParams?: HTMLElement;
	#htmlImageContainer?: HTMLElement;
	#audio?: Audio;
	#htmlImage?: HTMLImageElement;
	#audioContext = new AudioContext();
	#audioBuffer?: AudioBuffer;
	#source: AudioBufferSourceNode | null = null;
	#audioOptions = new Map<Audio, AudioOption>;
	#loop = false;
	#htmlVolume?: HTMLInputElement;
	#gainNode = this.#audioContext.createGain();

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
						createElement('span', {
							childs: [
								this.#htmlVolume = createElement('input', {
									type: 'range',
									min: 0,
									max: 2,
									step: 0.01,
									value: 1,
									$input: (event: Event) => this.#setVolume(Number((event.target as HTMLInputElement).value)),
								}) as HTMLInputElement,
							]
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

	async setAudio(audio: Audio, autoPlay: boolean) {
		this.show();
		if (audio == this.#audio) {
			return;
		}

		if (this.#source) {
			this.#source.playbackRate.value = 0.0;
		}

		this.#audio = audio;

		let audioOption = this.#audioOptions.get(audio);
		if (!audioOption) {
			audioOption = { playing: true, loop: false };
			this.#audioOptions.set(audio, audioOption);
		}

		this.#loop = audioOption.loop;

		await this.#updateAudio();
		this.#updateParams();

		if (autoPlay && audioOption.playing) {
			this.#play();
		}
	}

	async #updateAudio() {
		if (!this.#audio) {
			return;
		}

		this.#source = null;

		const audioOption = this.#audioOptions.get(this.#audio);
		const audioBuffer = audioOption?.audioBuffer;
		if (audioBuffer) {
			this.#audioBuffer = audioBuffer;
		} else {
			this.#audioBuffer = await this.#audioContext.decodeAudioData(this.#audio.getData());
			if (audioOption) {
				audioOption.audioBuffer = this.#audioBuffer;
			}
		}
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

		this.#source = new AudioBufferSourceNode(this.#audioContext, { buffer: this.#audioBuffer, loop: this.#loop, })//this.#context.createBufferSource();
		//this.#source.addEventListener('ended', (event: Event) => this.#source = null);
		//this.#source.buffer = this.#audioBuffer;
		//this.#source.connect(this.#audioContext.destination);
		this.#source.connect(this.#gainNode).connect(this.#audioContext.destination);
		this.#source.start();
	}

	#pause(): void {
		if (this.#source) {
			this.#source.playbackRate.value = 0.0;
		}

		//this.#elapsed = this.#context.currentTime - this.#start;
	}

	#setVolume(volume: number): void {
		this.#gainNode.gain.value = volume;
	}
}

function createParam(param: AudioParam): HTMLElement {
	let htmlValue;
	switch (param.type) {
		case AudioParamType.String:
			htmlValue = createElement('span', {
				innerText: param.value as string,
			});
			break;
		case AudioParamType.Number:
			htmlValue = createElement('span', {
				innerText: String(param.value as number),
			});
			break;
		case AudioParamType.Boolean:
			htmlValue = createElement('input', {
				type: 'checkbox',
				checked: param.value as boolean,
				disabled: true,
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
