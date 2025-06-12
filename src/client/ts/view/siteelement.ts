import { hide, show } from 'harmony-ui';

export class SiteElement {
	protected shadowRoot?: ShadowRoot;
	protected initHTML(): void {
		throw 'override me';
	}

	protected refreshHTML(): void {}

	getHTML() {
		if (!this.shadowRoot?.host) {
			this.initHTML();
		}
		this.refreshHTML();
		this.activated();
		return this.shadowRoot?.host as HTMLElement;
	}

	hide() {
		hide(this.shadowRoot?.host as HTMLElement);
	}

	show() {
		this.initHTML();
		show(this.shadowRoot?.host as HTMLElement);
	}

	protected activated(): void {}
}
