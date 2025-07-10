export type AudioParam = {
	name: string,
	i18n: string,
	type: AudioParamType,
	value: AudioParamValue,
}

export enum AudioParamType {
	Boolean = 0,
	Number,
	String,
}

export enum AudioType {
	Wav = 0,
	Mp3,
}

export type AudioParamValue = boolean | number | string;

export class Audio {
	#repository: string;
	#path: string;
	#type: AudioType;
	#data: ArrayBuffer;
	#params = new Map<string, AudioParam>();

	constructor(repository: string, path: string, type: AudioType, data: ArrayBuffer) {
		this.#repository = repository;
		this.#path = path;
		this.#type = type;
		this.#data = data;
	}

	getRepository(): string {
		return this.#repository;
	}

	getPath(): string {
		return this.#path;
	}

	getType(): AudioType {
		return this.#type;
	}

	getData(): ArrayBuffer {
		return this.#data;
	}

	setParam(param: AudioParam) {
		this.#params.set(param.name, param);
	}

	getParams() {
		return this.#params;
	}
}
