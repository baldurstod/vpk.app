import { SceneExplorer, ShaderEditor } from 'harmony-3d';
import { createElement, createShadowRoot, defineHarmonyTab, defineHarmonyTabGroup, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement } from 'harmony-ui';
import optionsCSS from '../../css/options.css';
import { SiteElement } from './siteelement';

export class Options extends SiteElement {
	#htmlTabs?: HTMLHarmonyTabGroupElement;
	#htmlSceneExplorerTab?: HTMLHarmonyTabElement;
	#shaderEditor?: ShaderEditor;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		defineHarmonyTab();
		defineHarmonyTabGroup();

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: optionsCSS,
			childs: [
				this.#htmlTabs = createElement('harmony-tab-group', { class: 'tabs' }) as HTMLHarmonyTabGroupElement,
			]
		});
		this.#initHtmlSceneExplorer();
		this.#initHtmlShaderEditor();
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	#initHtmlSceneExplorer() {
		this.#htmlSceneExplorerTab = createElement('harmony-tab', {
			'data-i18n': '#scene_explorer',
			parent: this.#htmlTabs,
			child: new SceneExplorer().htmlElement as HTMLElement,
		}) as HTMLHarmonyTabElement;
	}

	#initHtmlShaderEditor() {
		this.#shaderEditor = new ShaderEditor();
		let htmlShaderEditorTab = createElement('harmony-tab', {
			'data-i18n': '#shader_editor',
			parent: this.#htmlTabs,
			$activated: () => {
				this.#shaderEditor!.initEditor({ aceUrl: './assets/js/ace-builds/src-min/ace.js', displayCustomShaderButtons: true });
				htmlShaderEditorTab.append(this.#shaderEditor!);
			}
		});
	}


}
