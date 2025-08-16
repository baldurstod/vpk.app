import { vec3, vec4 } from 'gl-matrix';
import { AmbientLight, Camera, ColorBackground, ContextObserver, GraphicsEvents, OrbitControl, Plane, RenderFace, Scene, Source2Material, Source2MaterialManager } from 'harmony-3d';
import { downloadSVG, openInNewSVG } from 'harmony-svg';
import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import materialViewerCSS from '../../css/materialviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { setParent, setScene, startupRenderer } from '../graphics';
import { SiteElement } from './siteelement';

const textureName = new Map<string, string>([
	['g_tColor', '#color'],
	['g_tMasks1', '#masks1'],
	['g_tMasks2', '#masks2'],
	['g_tDetail', '#detail1'],
	['g_tDetail2', '#detail2'],
	['g_tFresnelWarp', '#fresnel_waarp'],
	['g_tNormal', '#normal'],
	['g_tCubeMap', '#cube_map'],
]);


export class MaterialViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlParams?: HTMLElement;
	#htmlIntParams?: HTMLElement;
	#htmlFloatParams?: HTMLElement;
	#htmlVectorParams?: HTMLElement;
	#htmlDynamicParams?: HTMLElement;
	#htmlTextures?: HTMLElement;
	#html3d?: HTMLElement;
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
							childs: [
								this.#htmlIntParams = createElement('div', { class: 'variables', }),
								this.#htmlFloatParams = createElement('div', { class: 'variables', }),
								this.#htmlVectorParams = createElement('div', { class: 'variables', }),
								this.#htmlDynamicParams = createElement('div', { class: 'variables', }),
								this.#htmlTextures = createElement('div', { class: 'variables', }),
							]
						}),
						this.#html3d = createElement('div', {
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

		let orbitControl: OrbitControl;
		if (!this.#camera) {

			this.#camera = new Camera({ position: vec3.fromValues(0, 0, 10) });

			orbitControl = new OrbitControl(this.#camera);
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
		setParent(this.#html3d!);
	}

	#updateParams(material: Source2Material) {
		this.initHTML();

		this.#updateParam(this.#htmlIntParams!, material.getIntParams(), 'number');
		this.#updateParam(this.#htmlFloatParams!, material.getFloatParams(), 'number');
		this.#updateParam(this.#htmlVectorParams!, material.getVectorParams(), 'vec4');
		this.#updateParam(this.#htmlDynamicParams!, material.getDynamicParams(), 'expression');
		this.#updateParam(this.#htmlTextures!, material.getTextureParams(), 'texture');
	}

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
									i18n: textureName.get(name) ?? name,
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
									i18n: textureName.get(name) ?? name,
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

	show(): void {
		this.initHTML();
		show(this.#html3d);
	}

	hide(): void {
		hide(this.#html3d);
	}
}
