import { vec3 } from 'gl-matrix';
import { AmbientLight, Camera, ColorBackground, ContextObserver, GraphicsEvents, OrbitControl, Plane, PointLight, Scene, Source1ModelManager, Source2MaterialManager, Source2ModelManager } from 'harmony-3d';
import { downloadSVG } from 'harmony-svg';
import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import { Map2 } from 'harmony-utils';
import modelViewerCSS from '../../css/modelviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { setParent, setScene, startupRenderer } from '../graphics';
import { SiteElement } from './siteelement';

export class MaterialViewer extends SiteElement {
	#htmlToolbar?: HTMLElement;
	#htmlText?: HTMLElement;
	#repository: string = '';
	#path: string = '';
	#scenes = new Map2<string, string, Scene>();
	#camera?: Camera;

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
					],
				}),
				this.#htmlText = createElement('div', {
					class: 'viewer',
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

			this.#camera = new Camera({ position: vec3.fromValues(0, 0, 100) });

			orbitControl = new OrbitControl(this.#camera);
			orbitControl.target.setPosition(vec3.fromValues(0, 0, 0));
			ContextObserver.observe(GraphicsEvents, this.#camera);
		}

		let scene = this.#scenes.get(repository, path);
		if (!scene) {
			scene = new Scene({ camera: this.#camera });
			scene.addChild(this.#camera);
			scene.addChild(orbitControl!.target);

			scene.background = new ColorBackground({/*color:[1, 1, 1, 1]*/ });
			this.#scenes.set(repository, path, scene);
			//const model = await Source2ModelManager.createInstance(repository, path, true);


			let plane = scene.addChild(new Plane({ width: 10, height: 10 })) as Plane;
			const material = await Source2MaterialManager.getMaterial(repository, path);
			if (material) {
				plane.setMaterial(material);

			}
			scene.addChild(new AmbientLight({ position: vec3.fromValues(0, -500, 0) }));
		}

		setScene(scene);
		setParent(this.#htmlText!);
	}

	show(): void {
		this.initHTML();
		show(this.#htmlText);
	}

	hide(): void {
		hide(this.#htmlText);
	}
}
