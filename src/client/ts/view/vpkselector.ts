import { createElement, createShadowRoot } from 'harmony-ui';
import { SiteElement } from './sitepelement';
import { Controller } from '../controller';
import { ControllerEvents } from '../controllerevents';
import vpkSelectorCSS from '../../css/vpkselector.css';

export class VpkSelector extends SiteElement {
	#htmlFavorites?: HTMLElement;
	#htmlList?: HTMLElement;
	#vpkList?: Array<string>;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: vpkSelectorCSS,
			childs: [
				createElement('button', {
					i18n: '#refresh_vpk',
					$click: () => Controller.dispatchEvent(new CustomEvent(ControllerEvents.RefreshVpkList)),
				}),
				this.#htmlList = createElement('div', {
				}),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
		this.#htmlList?.replaceChildren();

		if (this.#vpkList) {
			for (const vpk of this.#vpkList) {
				createElement('div', {
					class: 'vpk-item',
					parent: this.#htmlList,
					innerText: vpk,
					$click: () => this.#selectVpk(vpk),
				});
			}
		}
	}

	setVpkList(vpkList: Array<string>) {
		this.#vpkList = vpkList;
		this.refreshHTML();
	}

	#selectVpk(vpk: string) {
		console.info(vpk);
	}
}
