import { vec3 } from 'gl-matrix';
import { AmbientLight, Camera, ColorBackground, HasMaterials, OrbitControl, PointLight, Scene, Source1ModelInstance, Source1ModelManager, Source2ModelInstance, Source2ModelManager } from 'harmony-3d';
import { downloadSVG, resetCameraSVG } from 'harmony-svg';
import { createElement, createShadowRoot, defineHarmonyRadio, display, HTMLHarmonyRadioElement } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import modelViewerCSS from '../../css/modelviewer.css';
import resourceCss from '../../css/resource.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { setParent, setScene, startupRenderer } from '../graphics';
import { createResource } from './createresource';
import { SiteElement } from './siteelement';

const DEFAULT_CAMERA_POS = vec3.fromValues(0, 50, 0);
const DEFAULT_CAMERA_TARGET = vec3.create();

type SceneModel = {
	scene: Scene;
	model: Source1ModelInstance | Source2ModelInstance | null;
}

export class ModelViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlViewer?: HTMLElement;
	#htmlMaterials?: HTMLElement;
	#htmlSkinSelector?: HTMLHarmonyRadioElement;
	#htmlSkins?: HTMLHarmonyRadioElement;
	#repository: string = '';
	#path: string = '';
	#scenes = new Map2<string, string, SceneModel>();
	#camera?: Camera;
	#orbitControl?: OrbitControl;
	#model?: HasMaterials | null;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		defineHarmonyRadio();
		this.shadowRoot = createShadowRoot('section', {
			adoptStyles: [modelViewerCSS, resourceCss],
			childs: [
				this.#htmlToolbar = createElement('div', {
					class: 'toolbar',
					childs: [
						createElement('span', {
							i18n: { title: '#download_file' },
							innerHTML: downloadSVG,
							$click: () => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { repository: this.#repository, path: this.#path } })),
						}),
						createElement('span', {
							i18n: { title: '#reset_camera' },
							innerHTML: resetCameraSVG,
							$click: () => this.#resetCamera(),
						}),
					],
				}),
				this.#htmlViewer = createElement('div', {
					class: 'viewer',
				}),
				this.#htmlMaterials = createElement('div', {
					class: 'materials',
					childs: [
						createElement('div', { class: 'title', i18n: '#materials' }),
						this.#htmlSkinSelector = createElement('harmony-radio', {
							class: 'selector',
							$change: (event: CustomEvent) => this.#selectSkin((event as CustomEvent).detail.value),
						}) as HTMLHarmonyRadioElement,
						this.#htmlSkins = createElement('div', { class: 'skins' }) as HTMLHarmonyRadioElement,
					],
				}),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	async setSource1Model(repository: string, path: string): Promise<void> {
		await startupRenderer();
		this.#createCamera();
		this.show();
		this.#repository = repository;
		this.#path = path;

		let sceneModel = this.#scenes.get(repository, path);
		if (!sceneModel) {
			const scene = new Scene({ camera: this.#camera });

			scene.background = new ColorBackground();
			const model = await Source1ModelManager.createInstance(repository, path, true);
			sceneModel = { scene, model }
			this.#scenes.set(repository, path, sceneModel);

			if (model) {
				scene.addChild(model);
				model.frame = 0.;

				let seq = model.sourceModel.mdl.getSequenceById(0);
				if (seq) {
					model.playSequence(seq.name);
				}
			}

			scene.addChild(new PointLight({ position: vec3.fromValues(0, -500, 0) }));
			scene.addChild(new AmbientLight({ position: vec3.fromValues(0, -500, 0) }));
		}

		await setScene(sceneModel.scene);
		this.#updateSkins(sceneModel.model);
		//.append(getCanvas());
		await setParent(this.#htmlViewer!);
	}

	async setSource2Model(repository: string, path: string): Promise<void> {
		await startupRenderer();
		this.#createCamera();
		this.show();
		this.#repository = repository;
		this.#path = path;

		let sceneModel = this.#scenes.get(repository, path);
		if (!sceneModel) {
			const scene = new Scene({ camera: this.#camera });

			scene.background = new ColorBackground();
			const model = await Source2ModelManager.createInstance(repository, path, true);
			sceneModel = { scene, model }
			this.#scenes.set(repository, path, sceneModel);

			if (model) {
				scene.addChild(model);
				//model.frame = 0.;
				/*
								let seq = model.sourceModel.mdl.getSequenceById(0);
								if (seq) {
									model.playSequence(seq.name);
								}
									*/
			}

			scene.addChild(new PointLight({ position: vec3.fromValues(0, -500, 0) }));
			scene.addChild(new AmbientLight({ position: vec3.fromValues(0, -500, 0) }));
		}

		await setScene(sceneModel.scene);
		this.#updateSkins(sceneModel.model);
		//.append(getCanvas());
		await setParent(this.#htmlViewer!);
	}

	#createCamera() {
		if (!this.#camera) {
			this.#camera = new Camera({ autoResize: true });
			this.#orbitControl = new OrbitControl(this.#camera);
			//ContextObserver.observe(GraphicsEvents, this.#camera);
			this.#resetCamera();
		}
	}

	#resetCamera(): void {
		this.#createCamera();
		this.#camera!.setPosition(DEFAULT_CAMERA_POS);
		this.#orbitControl!.target.setPosition(DEFAULT_CAMERA_TARGET);
	}

	async #updateSkins(model: HasMaterials | null): Promise<void> {
		this.initHTML();
		this.#model = model;
		this.#htmlSkinSelector?.clear();
		this.#htmlSkins?.replaceChildren();
		const skins = await model?.getSkins();
		if (skins) {

			let first = true;
			for (const skin of skins) {
				createElement('button', {
					parent: this.#htmlSkinSelector,
					innerText: skin,
					value: skin,
					...(first) && { attributes: { selected: '' } },
				});
				first = false;
			}

			display(this.#htmlSkinSelector, skins.size > 1);
		}
	}

	async #selectSkin(skin: string): Promise<void> {
		await this.#model?.setSkin(skin);
		const materials = await this.#model?.getMaterialsName(skin);
		if (!materials) {
			return;
		}
		this.#htmlSkins?.replaceChildren();

		for (const material of materials[1]) {
			let path = material;
			if (path.endsWith('.vmat')) {
				path = path.replace(/\.vmat$/, '') + '.vmat_c';
			}
			this.#htmlSkins!.append(createResource(materials[0], path));
		}

	}
}
