import { vec3 } from 'gl-matrix';
import { AmbientLight, Camera, ColorBackground, ContextObserver, GraphicsEvents, OrbitControl, PointLight, Scene, Source1ModelManager, Source2ModelManager } from 'harmony-3d';
import { downloadSVG, resetCameraSVG } from 'harmony-svg';
import { createElement, createShadowRoot } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import modelViewerCSS from '../../css/modelviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { setParent, setScene, startupRenderer } from '../graphics';
import { SiteElement } from './siteelement';

const DEFAULT_CAMERA_POS = vec3.fromValues(0, 50, 0);
const DEFAULT_CAMERA_TARGET = vec3.create();

export class ModelViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlViewer?: HTMLElement;
	#repository: string = '';
	#path: string = '';
	#scenes = new Map2<string, string, Scene>();
	#camera?: Camera;
	#orbitControl?: OrbitControl;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: modelViewerCSS,
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
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	async setSource1Model(repository: string, path: string): Promise<void> {
		startupRenderer();
		this.#createCamera();
		this.show();
		this.#repository = repository;
		this.#path = path;

		let scene = this.#scenes.get(repository, path);
		if (!scene) {
			scene = new Scene({ camera: this.#camera });

			scene.background = new ColorBackground();
			this.#scenes.set(repository, path, scene);
			const model = await Source1ModelManager.createInstance(repository, path, true);

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

		setScene(scene);
		//.append(getCanvas());
		setParent(this.#htmlViewer!);
	}

	async setSource2Model(repository: string, path: string): Promise<void> {
		startupRenderer();
		this.#createCamera();
		this.show();
		this.#repository = repository;
		this.#path = path;

		let scene = this.#scenes.get(repository, path);
		if (!scene) {
			scene = new Scene({ camera: this.#camera });

			scene.background = new ColorBackground();
			this.#scenes.set(repository, path, scene);
			const model = await Source2ModelManager.createInstance(repository, path, true);

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

		setScene(scene);
		//.append(getCanvas());
		setParent(this.#htmlViewer!);
	}

	#createCamera() {
		if (!this.#camera) {
			this.#camera = new Camera();
			this.#orbitControl = new OrbitControl(this.#camera);
			ContextObserver.observe(GraphicsEvents, this.#camera);
			this.#resetCamera();
		}
	}

	#resetCamera(): void {
		this.#createCamera();
		this.#camera!.setPosition(DEFAULT_CAMERA_POS);
		this.#orbitControl!.target.setPosition(DEFAULT_CAMERA_TARGET);
	}
}
