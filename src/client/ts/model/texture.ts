export type TextureParam = {
	/*
	Version = 0,
	Width,
	Height,
	Srgb,
	WrapS,
	WrapT,
	*/
	name: string,
	i18n: string,
	type: TextureParamType,
	value: TextureParamValue,
}

export enum TextureParamType {
	Boolean = 0,
	Number,
	String,
	TextureWrap,
}

export enum TextureWrap {
	Clamp = 0,
	Repeat,
}

export type TextureParamValue = boolean | number | string | TextureWrap;

export class Texture {
	#repository: string;
	#path: string;
	#imageData: ImageData;
	#params: Map<string, TextureParam>;

	constructor(repository: string, path: string, imageData: ImageData, params?: Map<string, TextureParam>) {
		this.#repository = repository;
		this.#path = path;
		this.#imageData = imageData;
		this.#params = new Map<string, TextureParam>(params);
	}

	getRepository(): string {
		return this.#repository;
	}

	getPath(): string {
		return this.#path;
	}

	getImageData(): ImageData {
		return this.#imageData;
	}

	setParam(param: TextureParam) {
		this.#params.set(param.name, param);
	}

	getParams() {
		return this.#params;
	}
}
