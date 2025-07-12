import { downloadSVG, earthquakeSVG, equalizerSVG, pauseSVG, playSVG } from 'harmony-svg';
import { createElement, createShadowRoot } from 'harmony-ui';
import audioPlayerCSS from '../../css/audioplayer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { Audio, AudioParam, AudioParamType } from '../model/audio';
import { PlaybackPositionNode } from '../utils/playbackpositionnode';
import { SiteElement } from './siteelement';

type AudioOption = {
	playing: boolean;
	loop: boolean;
	audioBuffer?: AudioBuffer;
}

enum AnalyserMode {
	Frequency = 0,
	TimeDomain,
}

const TRACK_MOVE_DELAY = 200;//ms

export class AudioPlayer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlContainer?: HTMLElement;
	#htmlParams?: HTMLElement;
	#htmlImageContainer?: HTMLElement;
	#audio?: Audio;
	#htmlImage?: HTMLImageElement;
	#audioContext = new AudioContext();
	#audioBuffer?: AudioBuffer;
	#source: PlaybackPositionNode | null = null;
	#audioOptions = new Map<Audio, AudioOption>;
	#loop = false;
	#htmlVolume?: HTMLInputElement;
	#gainNode = this.#audioContext.createGain();
	#analyser = this.#audioContext.createAnalyser();
	#bufferLength = this.#analyser.frequencyBinCount;
	#dataArray = new Uint8Array(this.#bufferLength);
	//this.#analyser.getByteTimeDomainData(this.#dataArray);
	#htmlCanvas?: HTMLCanvasElement;
	#canvasCtx: CanvasRenderingContext2D | null = null;
	#analyserMode = AnalyserMode.Frequency;
	#htmlTrackCanvas?: HTMLCanvasElement;
	#trackContext: CanvasRenderingContext2D | null = null;
	#lastMove = performance.now();

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: audioPlayerCSS,
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
							i18n: { title: '#oscilloscope' },
							innerHTML: earthquakeSVG,
							$click: () => this.#setAnalyserMode(AnalyserMode.TimeDomain),
						}),
						createElement('span', {
							i18n: { title: '#frequency' },
							innerHTML: equalizerSVG,
							$click: () => this.#setAnalyserMode(AnalyserMode.Frequency),
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
						this.#htmlImageContainer = createElement('div', {
							class: 'sound',
							childs: [
								this.#htmlTrackCanvas = createElement('canvas', {
									class: 'tracks',
									$mousedown: (event: MouseEvent) => this.#onTrackMouseDown(event),
									$mousemove: (event: MouseEvent) => this.#onTrackMouseMove(event),

								}) as HTMLCanvasElement,
								this.#htmlCanvas = createElement('canvas') as HTMLCanvasElement,
							]
						}),

					]
				}),
			]
		});
		this.#canvasCtx = this.#htmlCanvas.getContext("2d");
		this.#trackContext = this.#htmlTrackCanvas.getContext("2d");

		this.#draw();
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
			//this.#drawChannel(0);
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

	async #play(offset?: number): Promise<void> {
		this.#source?.stop();

		if (!this.#audioBuffer) {
			return;
		}

		this.#source = new PlaybackPositionNode(this.#audioContext, { buffer: this.#audioBuffer, loop: this.#loop, });
		this.#source.connect(this.#gainNode).connect(this.#audioContext.destination);
		this.#source.connect(this.#analyser);
		this.#source.start(undefined, offset);
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

	#setAnalyserMode(mode: AnalyserMode): void {
		this.#analyserMode = mode;
	}

	#onTrackMouseDown(event: MouseEvent) {
		if (!this.#audioBuffer) {
			return;
		}
		this.#play(event.offsetX / this.#htmlTrackCanvas!.width * this.#audioBuffer?.duration);
	}

	#onTrackMouseMove(event: MouseEvent) {
		if (!this.#audioBuffer || (event.buttons & 1) != 1) {
			return;
		}
		const now = performance.now();
		if (now - this.#lastMove < TRACK_MOVE_DELAY) {
			return;
		}
		this.#lastMove = now;
		this.#play(event.offsetX / this.#htmlTrackCanvas!.width * this.#audioBuffer?.duration);

	}

	#draw(): void {
		requestAnimationFrame(() => this.#draw());
		if (!this.#canvasCtx || !this.#htmlCanvas || !this.#htmlImageContainer) {
			return;
		}

		const styles = getComputedStyle(this.#htmlImageContainer)
		this.#htmlCanvas.width = parseInt(styles.getPropertyValue("width"), 10)
		this.#htmlCanvas.height = parseInt(styles.getPropertyValue("height"), 10) * 0.5;

		let endY: number;
		if (this.#analyserMode == AnalyserMode.Frequency) {
			this.#analyser.getByteFrequencyData(this.#dataArray);
			endY = this.#htmlCanvas.height;

		} else {
			this.#analyser.getByteTimeDomainData(this.#dataArray);
			endY = this.#htmlCanvas.height / 2;
		}

		this.#canvasCtx.fillStyle = "rgb(0 0 0)";
		this.#canvasCtx.fillRect(0, 0, this.#htmlCanvas.width, this.#htmlCanvas.height);

		this.#canvasCtx.lineWidth = 1;
		this.#canvasCtx.strokeStyle = "rgb(255 255 255)";

		this.#canvasCtx.beginPath();

		const sliceWidth = (this.#htmlCanvas.width * 1.0) / this.#bufferLength;
		let x = 0;

		for (let i = 0; i < this.#bufferLength; i++) {
			const v = this.#dataArray[i] / 128.0;
			const y = this.#htmlCanvas.height - (v * this.#htmlCanvas.height) / 2;

			if (i === 0) {
				this.#canvasCtx.moveTo(x, y);
			} else {
				this.#canvasCtx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		this.#canvasCtx.lineTo(this.#htmlCanvas.width, this.#htmlCanvas.height / 2);
		this.#canvasCtx.stroke();
		this.#drawChannel(0);
	}

	#drawChannel(channel: number): void {
		if (!this.#trackContext || !this.#htmlTrackCanvas || !this.#audioBuffer || !this.#htmlImageContainer || !this.#source) {
			return;
		}

		const styles = getComputedStyle(this.#htmlImageContainer)
		const canvasWidth = parseInt(styles.getPropertyValue("width"), 10);
		this.#htmlTrackCanvas.width = canvasWidth;
		const canvasHeight = parseInt(styles.getPropertyValue("height"), 10) * 0.5;
		this.#htmlTrackCanvas.height = canvasHeight;

		const dataArray = this.#audioBuffer.getChannelData(channel);
		const averageMin = new Array(canvasWidth);
		const averageMax = new Array(canvasWidth);

		this.#trackContext.fillStyle = "rgb(0 0 0)";
		this.#trackContext.fillRect(0, 0, canvasWidth, canvasHeight);

		this.#trackContext.lineWidth = 1;
		this.#trackContext.strokeStyle = "rgb(255 255 255)";

		this.#trackContext.beginPath();

		const mul = Math.floor(dataArray.length / canvasWidth);
		for (let i = 0; i < canvasWidth; i++) {
			let min = 0;
			let max = 0;
			let minCount = 0;
			let maxCount = 0;

			for (let j = 0; j < mul; j++) {
				const v = dataArray[i * mul + j];
				if (v < 0) {
					min += v;
					minCount += 1;
				} else {
					max += v;
					maxCount += 1;
				}
			}
			//const y = canvasHeight / 2 - (v * canvasHeight) / 2;
			if (minCount != 0) {
				averageMin[i] = min / minCount;
			} else {
				averageMin[i] = 0;
			}

			if (maxCount != 0) {
				averageMax[i] = max / maxCount;
			} else {
				averageMax[i] = 0;
			}
		}

		this.#trackContext.beginPath();
		for (let i = 0; i < canvasWidth; i++) {
			const v = averageMin[i];
			const y = canvasHeight / 2 - (v * canvasHeight) / 2;
			if (i == 0) {
				this.#trackContext.moveTo(i, y);
			} else {
				this.#trackContext.lineTo(i, y);
			}
		}
		this.#trackContext.lineTo(canvasWidth, canvasHeight / 2);
		this.#trackContext.stroke();

		this.#trackContext.beginPath();
		for (let i = 0; i < canvasWidth; i++) {
			const v = averageMax[i];
			const y = canvasHeight / 2 - (v * canvasHeight) / 2;
			if (i == 0) {
				this.#trackContext.moveTo(i, y);
			} else {
				this.#trackContext.lineTo(i, y);
			}
		}
		this.#trackContext.lineTo(canvasWidth, canvasHeight / 2);
		this.#trackContext.stroke();

		this.#trackContext.beginPath();
		this.#trackContext.lineWidth = 3;

		const cursorX = this.#source.playbackPosition * this.#htmlTrackCanvas.width;
		this.#trackContext.moveTo(cursorX, 0);
		this.#trackContext.lineTo(cursorX, this.#htmlTrackCanvas.height);
		this.#trackContext.stroke();


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
