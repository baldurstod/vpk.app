import { createElement, createShadowRoot, defineHarmonyTab, defineHarmonyTabGroup, hide, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, show } from 'harmony-ui';
import optionsCSS from '../../css/options.css';
import { SiteElement } from './siteelement';
import { SceneExplorer } from 'harmony-3d';

export class Options extends SiteElement {
	#htmlTabs?: HTMLHarmonyTabGroupElement;
	#htmlSceneExplorerTab?: HTMLHarmonyTabElement;

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
}
