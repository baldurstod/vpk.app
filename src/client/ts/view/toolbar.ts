import { bugReportSVG } from 'harmony-svg';
import { createElement, createShadowRoot } from 'harmony-ui';
import toolbarCSS from '../../css/toolbar.css';
import { DISCORD_BUG_URL } from '../constants';
import { SiteElement } from './siteelement';

export class Toolbar extends SiteElement {

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: toolbarCSS,
			childs: [

				createElement('span', {
					innerHTML: bugReportSVG,
					i18n: { title: '#report_bug' },
					$click: () => open(DISCORD_BUG_URL),
				}),
			],
		});
	}
}
