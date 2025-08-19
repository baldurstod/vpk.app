import { vec3, vec4 } from 'gl-matrix';
import { AmbientLight, Camera, ColorBackground, ContextObserver, GraphicsEvents, OrbitControl, Plane, RenderFace, Scene, smartRound, Source2Material, Source2MaterialManager } from 'harmony-3d';
import { downloadSVG, openInNewSVG } from 'harmony-svg';
import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import materialViewerCSS from '../../css/materialviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { setParent, setScene, startupRenderer } from '../graphics';
import { SiteElement } from './siteelement';
import { createResource } from './createresource';

export enum Source2Type {
	Int,
	Float,
	Texture,
	Vector,
	Color,
}

type Source2Param = {
	i18n: string,
	type: Source2Type,
	vectorSize?: number,
	subVariables?: string[],
	main?: boolean,
	values?: Map<number, string>;
}

const source2Params = new Map<string, Source2Param>([
	['g_tColor', { i18n: '#color', type: Source2Type.Texture, main: true, subVariables: ['g_vColorTint', 'g_vTexCoordOffset', 'g_vTexCoordScale'] }],
	['g_tMasks1', { i18n: '#masks1', type: Source2Type.Texture, main: true }],
	['g_tMasks2', { i18n: '#masks2', type: Source2Type.Texture, main: true }],
	['g_tDetail', { i18n: '#detail1', type: Source2Type.Texture, main: true, subVariables: ['g_flDetailBlendFactor', 'g_flDetailTexCoordRotation', 'g_vDetail1ColorTint', 'g_vDetailTexCoordOffset', 'g_vDetailTexCoordScale'] }],
	['g_tDetail2', { i18n: '#detail2', type: Source2Type.Texture, main: true }],
	['g_tFresnelWarp', { i18n: '#fresnel_waarp', type: Source2Type.Texture, main: true }],
	['g_tNormal', { i18n: '#normal', type: Source2Type.Texture, main: true }],
	['g_tCubeMap', { i18n: '#cube_map', type: Source2Type.Texture, main: true }],

	['g_vColorTint', { i18n: '#color_tint', type: Source2Type.Color }],
	['g_vTexCoordOffset', { i18n: '#coord_offset', type: Source2Type.Vector, vectorSize: 2 }],
	['g_vTexCoordScale', { i18n: '#coord_scale', type: Source2Type.Vector, vectorSize: 2 }],

	['g_flDetailBlendFactor', { i18n: '#blend_factor', type: Source2Type.Float }],
	['g_flDetailTexCoordRotation', { i18n: '#coord_rotation', type: Source2Type.Float }],
	['g_vDetail1ColorTint', { i18n: '#color_tint', type: Source2Type.Color }],
	['g_vDetailTexCoordOffset', { i18n: '#coord_offset', type: Source2Type.Vector, vectorSize: 2 }],
	['g_vDetailTexCoordScale', { i18n: '#coord_scale', type: Source2Type.Vector, vectorSize: 2 }],

	['g_vDetail2TexCoordOffset', { i18n: '#coord_offset', type: Source2Type.Vector, vectorSize: 2 }],
	['g_vDetail2TexCoordScale', { i18n: '#coord_scale', type: Source2Type.Vector, vectorSize: 2 }],

	/*
		g_flDetailBlendFactor "1.000"
	g_flDetailTexCoordRotation "0.000"
	g_vDetail1ColorTint "[1.000000 1.000000 1.000000 0.000000]"
	g_vDetailTexCoordOffset "[0.000 0.000]"
	g_vDetailTexCoordScale "[1.000 1.000]"
	TextureDetail "[1.000000 1.000000 1.000000 1.000000]"
*/

]);


/*
	g_vColorTint "[0.811765 0.172549 0.172549 0.000000]"
	g_vTexCoordOffset "[0.305 -0.610]"
	g_vTexCoordScale "[17.247 13.714]"
	TextureColor ""

	DynamicParams
	{
		g_vColorTint "a = 1 != 2;\nb = 2 > 3;\nc = 2 >= 3;\nd = 2 < 3;\ne = 2 <= 3;\nf = 2 % 3;\ng = a.wyxz;\nh=float4(0, 1, 2, 3).wzyx;\n\nreturn b;\n"
		g_vTexCoordOffset "2 * 3"
		g_vTexCoordScale "3 * 4"
	}
*/

export class MaterialViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlParams?: HTMLElement;
	#htmlViewer?: HTMLElement;
	#repository: string = '';
	#path: string = '';
	#scenes = new Map2<string, string, Scene>();
	#camera?: Camera;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: materialViewerCSS,
			childs: [
				this.#htmlToolbar = createElement('div', {
					class: 'toolbar',
					childs: [
						createElement('span', {
							i18n: { title: '#download_file' },
							innerHTML: downloadSVG,
							$click: () => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { repository: this.#repository, path: this.#path } })),
						}),
					],
				}),
				createElement('div', {
					class: 'container',
					childs: [
						this.#htmlParams = createElement('div', {
							class: 'params',
						}),
						this.#htmlViewer = createElement('div', {
							class: 'viewer',
						}),

					]
				}),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	async setSource2Material(repository: string, path: string): Promise<void> {
		startupRenderer();
		this.show();
		this.#repository = repository;
		this.#path = path;

		if (!this.#camera) {
			this.#camera = new Camera({ position: vec3.fromValues(0, 0, 10) });

			const orbitControl = new OrbitControl(this.#camera);
			orbitControl.target.setPosition(vec3.fromValues(0, 0, 0));
			ContextObserver.observe(GraphicsEvents, this.#camera);
		}

		let scene = this.#scenes.get(repository, path);
		if (!scene) {
			scene = new Scene({ camera: this.#camera });
			scene.addChild(this.#camera);

			scene.background = new ColorBackground({/*color:[1, 1, 1, 1]*/ });
			this.#scenes.set(repository, path, scene);
			//const model = await Source2ModelManager.createInstance(repository, path, true);


			let plane = scene.addChild(new Plane({ width: 10, height: 10 })) as Plane;
			const material = await Source2MaterialManager.getMaterial(repository, path);
			if (material) {
				plane.setMaterial(material);
				material.renderFace(RenderFace.Both);
			}
			scene.addChild(new AmbientLight({ position: vec3.fromValues(0, -500, 0) }));
		}

		const material = await Source2MaterialManager.getMaterial(repository, path);
		if (material) {
			this.#updateParams(material);
		}

		setScene(scene);
		setParent(this.#htmlViewer!);
	}

	#updateParams(material: Source2Material) {
		this.initHTML();
		this.#htmlParams!.replaceChildren();


		for (const [name, param] of source2Params) {
			if (param.main) {
				this.#updateParam(material, name);
			}
		}
	}

	#updateParam(material: Source2Material, name: string): void {
		const param = source2Params.get(name);
		if (!param) {
			return;
		}

		this.#createParamHtml(material, name, this.#htmlParams!);
	}

	#createParamHtml(material: Source2Material, name: string, parent: HTMLElement/*, value: number | vec4 | string*/): void {
		const param = source2Params.get(name);
		if (!param) {
			return;
		}

		const dynamicValue = material.getDecompiledDynamicParam(name);
		if (dynamicValue) {
			const text = (dynamicValue as [string | null, Uint8Array])[0] ?? 'error while decompiling expression';//TODO: i18n
			const rows = (text.match(/\n/g) || []).length + 1;
			createElement('div', {
				parent: parent,
				class: 'variable',
				childs: [
					createElement('div', {
						class: 'title',
						i18n: param.i18n,
					}),
					createElement('textarea', {
						rows: rows,
						cols: 60,
						disabled: true,
						properties: {
							value: text,
						},
					}),
				]
			});
			return;
		}

		let htmlChilds: HTMLElement | null = null;
		switch (param.type) {
			case Source2Type.Int:
				// TODO: enums
				const intValue = material.getFloatParam(name);
				if (intValue === null) {
					return;
				}
				createElement('label', {
					parent: parent,
					childs: [
						createElement('span', {
							class: 'param-label',
							i18n: param.i18n,
						}),
						createElement('span', {
							innerText: String(intValue),
						}),
						htmlChilds = createElement('span', {
							class: 'childs',
						}),
					]
				});
				break;
			case Source2Type.Float:
				const floatValue = material.getFloatParam(name);
				if (floatValue === null) {
					return;
				}
				createElement('label', {
					parent: parent,
					childs: [
						createElement('span', {
							class: 'param-label',
							i18n: param.i18n,
						}),
						createElement('span', {
							innerText: String(floatValue),
						}),
						htmlChilds = createElement('span', {
							class: 'childs',
						}),
					]
				});
				break;
			case Source2Type.Vector:
				const vectorValue = material.getVectorParam(name, vec4.create());
				if (vectorValue === null) {
					return;
				}
				let vectorText = '';
				for (let i = 0, l = (param.vectorSize ?? 4); i < l; i++) {
					vectorText += String(smartRound(vectorValue[i]!));
					if (i < l - 1) {
						vectorText += ', ';
					}
				}

				createElement('label', {
					parent: parent,
					childs: [
						createElement('span', {
							class: 'param-label',
							i18n: param.i18n,
						}),
						createElement('span', {
							innerText: vectorText//vec4.str(vectorValue),
						}),
						htmlChilds = createElement('span', {
							class: 'childs',
						}),
					]
				});
				break;
			case Source2Type.Color:
				const colorValue = material.getVectorParam(name, vec4.create());
				if (colorValue === null) {
					return;
				}
				let colorText = '';
				for (let i = 0, l = (param.vectorSize ?? 4); i < l; i++) {
					colorText += String(colorValue[i]);
					if (i < l - 1) {
						colorText += ', ';
					}
				}
				switch (param.vectorSize) {
					case 1:
						vectorText = String(colorValue[0]);
						break;
					case 2:
						vectorText = String(colorValue[0]);
						break;

					default:
						break;
				}
				createElement('label', {
					parent: parent,
					class: 'line-parameter',
					childs: [
						createElement('span', {
							class: 'param-label',
							i18n: param.i18n,
						}),
						createElement('span', {
							parent: parent,
							class: 'color parameter',
							style: `background-color:rgb(${colorValue[0] * 255}, ${colorValue[1] * 255}, ${colorValue[2] * 255});`,
						}),
					]
				});
				break;
			case Source2Type.Texture:
				const textureValue = material.getTextureParam(name);
				if (!textureValue) {
					return;
				}
				const path = textureValue.replace(/\.vtex_c$/, '').replace(/\.vtex$/, '') + '.vtex_c';
				createElement('label', {
					parent: parent,
					class: 'texture parameter',
					childs: [
						/*
						createElement('span', {
							class: 'param-label',
							i18n: param.i18n,
						}),
						createElement('span', {
							innerText: String(textureValue),
						}),
						*/
						createElement('div', {
							class: 'title',
							i18n: param.i18n,
						}),
						createResource(this.#repository, path),
						htmlChilds = createElement('span', {
							class: 'childs',
						}),
					]
				});
				break;
		}

		if (param.subVariables && htmlChilds) {
			for (const subVariable of param.subVariables) {
				this.#createParamHtml(material, subVariable, htmlChilds);
			}
		}
	}
	/*
	#updateParam(element: HTMLElement, params: Map<string, number> | Map<string, vec4> | Map<string, string> | Map<string, [string | null, Uint8Array]> | null, type: string): void {
		element.replaceChildren();
		if (params && params.size) {
			show(element);
			for (const [name, param] of params) {
				let value: HTMLElement;

				switch (type) {
					case 'number':
					case 'string':
						createElement('label', {
							class: 'param',
							parent: element,
							childs: [
								createElement('span', { innerText: name }),
								createElement('span', { innerText: String(param) }),
							],
						});
						break;
					case 'vec4':
						createElement('label', {
							class: 'param',
							parent: element,
							childs: [
								createElement('span', { innerText: name }),
								createElement('span', { innerText: String(vec4.str(param as vec4)) }),
							],
						});
						break;
					case 'expression':
						const text = (param as [string | null, Uint8Array])[0] ?? 'error while decompiling expression';//TODO: i18n
						const rows = (text.match(/,/g) || []).length;
						createElement('div', {
							parent: element,
							class: 'variable',
							childs: [
								createElement('div', {
									class: 'title',
									i18n: source2Variables.get(name) ?? name,
								}),
								createElement('textarea', {
									rows: rows,
									cols: 60,
									disabled: true,
									properties: {
										value: text,
									},
								}),
							]
						});
						break;
					case 'texture':
						const path = (param as string).replace(/\.vtex_c$/, '').replace(/\.vtex$/, '') + '.vtex_c';
						createElement('div', {
							parent: element,
							class: 'variable',
							childs: [
								createElement('div', {
									class: 'title',
									i18n: source2Variables.get(name) ?? name,
								}),
								createElement('div', {
									class: 'path',
									childs: [
										createElement('input', {
											disabled: true,
											value: param as string,
										}),
										createElement('span', {
											class: 'open',
											innerHTML: openInNewSVG,

											$click: () => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.SelectFile, { detail: { repository: this.#repository, path: path } })),
										}),
									],
								}),
							]
						});
						break;
				}
			}
		} else {
			hide(element);
		}
	}
	*/
}
