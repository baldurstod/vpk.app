export enum TextureParam {
	Width = 0,
	Height,
	Srgb,
	ClampS,
	ClampT,
}

export type TextureParamValue = boolean | number;

export class Texture {
	#imageData: ImageData;
	//#flags = new Map<string, boolean>();
	#params: Map<TextureParam, TextureParamValue>;

	constructor(imageData: ImageData, params?: Map<TextureParam, TextureParamValue>) {
		this.#imageData = imageData;
		this.#params = new Map<TextureParam, TextureParamValue>(params);
	}

	getImageData(): ImageData {
		return this.#imageData;
	}

	setParam(param: TextureParam, value: TextureParamValue) {
		this.#params.set(param, value);
	}
}
