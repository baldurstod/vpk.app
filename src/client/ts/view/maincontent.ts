import { createShadowRoot } from 'harmony-ui';
import mainContentCSS from '../../css/maincontent.css';
import { SiteElement } from './sitepelement';
import { VpkSelector } from './vpkselector';

export class MainContent extends SiteElement {
	#vpkSelector = new VpkSelector();

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: mainContentCSS,
			childs: [
				this.#vpkSelector.getHTML(),
			],
		});
	}


	setVpkList(vpkList: Array<string>) {
		this.#vpkSelector.setVpkList(vpkList);
	}
}
