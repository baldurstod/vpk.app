import { createElement, createShadowRoot, defineHarmonyTree, HTMLHarmonyTreeElement, ItemClickEventData, TreeElement } from 'harmony-ui';
import { SiteElement } from './siteelement';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile, SelectVpk } from '../controllerevents';
import vpkSelectorCSS from '../../css/vpkselector.css';
import treeCSS from '../../css/tree.css';

export class VpkSelector extends SiteElement {
	#htmlList?: HTMLHarmonyTreeElement;
	#htmlFileTree?: HTMLHarmonyTreeElement;
	#vpkPath: string = '';
	#vpkList?: Array<string>;
	#fileList?: Array<string>;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		defineHarmonyTree();
		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: vpkSelectorCSS,
			childs: [
				createElement('button', {
					i18n: '#refresh_vpks',
					$click: () => Controller.dispatchEvent(new CustomEvent(ControllerEvents.RefreshVpkList)),
				}),
				this.#htmlList = createElement('harmony-tree', {
					$itemclick: (event: CustomEvent<ItemClickEventData>) => this.#itemClick(event),
				}) as HTMLHarmonyTreeElement,
				this.#htmlFileTree = createElement('harmony-tree', {
					$itemclick: (event: CustomEvent<ItemClickEventData>) => this.#fileItemClick(event),
				}) as HTMLHarmonyTreeElement,
			]
		});

		this.#htmlList.adoptStyle(treeCSS);
	}

	protected refreshHTML(): void {
		this.initHTML();
		this.#htmlList?.replaceChildren();
		this.#htmlFileTree?.replaceChildren();

		this.#htmlList?.setRoot(TreeElement.createFromPathList(this.#vpkList));
		this.#htmlFileTree?.setRoot(TreeElement.createFromPathList(this.#fileList));
	}

	setVpkList(vpkList: Array<string>) {
		this.#vpkList = vpkList;
		this.refreshHTML();
	}

	setFileList(vpkPath: string, fileList: Array<string>) {
		this.#vpkPath = vpkPath;
		this.#fileList = fileList;
		this.refreshHTML();
	}

	#itemClick(event: CustomEvent<ItemClickEventData>) {
		const clickedItem = event.detail.item;
		if (!clickedItem || clickedItem.type != 'file') {
			return;
		}

		Controller.dispatchEvent(new CustomEvent<SelectVpk>(ControllerEvents.SelectVpk, { detail: { path: clickedItem.getPath() } }));
	}

	#fileItemClick(event: CustomEvent<ItemClickEventData>) {
		const clickedItem = event.detail.item;
		if (!clickedItem || clickedItem.type != 'file') {
			return;
		}

		Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.SelectFile, { detail: { vpkPath: this.#vpkPath, path: clickedItem.getPath() } }));
	}
}
