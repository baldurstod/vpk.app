import { vec3, vec4 } from 'gl-matrix';
import { Camera, Composer, ContextObserver, Graphics, GraphicsEvent, GraphicsEvents, GraphicTickEvent, OrbitControl, Scene, SceneExplorer, WebGLStats } from 'harmony-3d';
import { createElement } from 'harmony-ui';

let renderer: typeof Graphics | undefined;
let scene: Scene | undefined;
let composer: Composer | undefined;
let activeCamera: Camera | null = null;
let orbitControl: OrbitControl | undefined;
let canvasContainer: HTMLElement | undefined;

export async function setScene(s: Scene): Promise<void> {
	await startupRenderer();
	scene = s;
	new SceneExplorer().setScene(scene);
	if (!s.activeCamera) {
		s.activeCamera = activeCamera;
	}
}

export async function setParent(parent: HTMLElement): Promise<void> {
	await startupRenderer();


	parent.append(canvasContainer!);
	//renderer!.checkCanvasSize();

}

export async function startupRenderer(): Promise<void> {
	if (renderer) {
		return;
	}

	let canvas: HTMLCanvasElement;

	canvasContainer = createElement('div', {
		style: 'width:100%;height:100%;',
		child: canvas = createElement('canvas') as HTMLCanvasElement,
	});


	renderer = await Graphics.initCanvas({
		autoResize: true,
		canvas: canvas,
		webGL: {
			alpha: true,
			preserveDrawingBuffer: true,
			premultipliedAlpha: false
		}
	});

	//renderer.setSize(1500, 500);

	const animate = (event: Event) => {
		WebGLStats.tick();
		if (composer?.enabled) {
			composer.render((event as CustomEvent).detail.delta, {});
		} else {
			renderer!.render(scene!, scene!.activeCamera ?? activeCamera!, (event as CustomEvent<GraphicTickEvent>).detail.delta, {});
		}

		/*
		if (showFps) {
			htmlCanvasFps.innerText = String(WebGLStats.getFps());
		}
		*/

		/*
		if (lightsRotateWithCamera) {
			let v = vec3.clone(orbitCamera.position);
			v[2] = 0;
			//lightsContainer.lookAt(orbitCamera.position);
			vec3.normalize(v, v);
			quat.rotationTo(lightsContainer._quaternion, [0, -1, 0], v);
		}
		*/
	}
	scene = new Scene();
	activeCamera = new Camera({ position: vec3.fromValues(0, -500, 40), autoResize: true });
	orbitControl = new OrbitControl(activeCamera);
	orbitControl.target.setPosition(vec3.fromValues(0, 0, 40));
	renderer.play();

	renderer.clearColor(vec4.create());
	GraphicsEvents.addEventListener(GraphicsEvent.Tick, animate);
	//ContextObserver.observe(GraphicsEvents, activeCamera);
}
