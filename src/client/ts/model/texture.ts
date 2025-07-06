export enum TextureParam {
	Width = 0,
	Height,
	Srgb,
	ClampS,
	ClampT,
}

export type TextureParamValue = boolean | number;

export class Texture {
	#origin: string;
	#path: string;
	#imageData: ImageData;
	#params: Map<TextureParam, TextureParamValue>;

	constructor(origin: string, path: string, imageData: ImageData, params?: Map<TextureParam, TextureParamValue>) {
		this.#origin = origin;
		this.#path = path;
		this.#imageData = imageData;
		this.#params = new Map<TextureParam, TextureParamValue>(params);
	}

	getOrigin(): string {
		return this.#origin;
	}

	getPath(): string {
		return this.#path;
	}

	getImageData(): ImageData {
		return this.#imageData;
	}

	setParam(param: TextureParam, value: TextureParamValue) {
		this.#params.set(param, value);
	}
}
