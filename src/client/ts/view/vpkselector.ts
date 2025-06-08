import { downloadSVG } from 'harmony-svg';
import { createElement, createShadowRoot, defineHarmonyTree, HTMLHarmonyTreeElement, ItemActionEventData, ItemClickEventData, TreeItem } from 'harmony-ui';
import treeCSS from '../../css/tree.css';
import vpkSelectorCSS from '../../css/vpkselector.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile, SelectVpk } from '../controllerevents';
import { SiteElement } from './siteelement';

export class VpkSelector extends SiteElement {
	#htmlList?: HTMLHarmonyTreeElement;
	#htmlFileTree?: HTMLHarmonyTreeElement;
	#vpkPath: string = '';
	#vpkList?: Array<string>;
	#fileList?: Array<string>;
	#dirtyVpkList = true;
	#dirtyFileList = true;

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


		this.#htmlFileTree.addAction('download', downloadSVG);
		this.#htmlFileTree.addEventListener('itemaction', (event: Event) => this.#handleItemAction(event as CustomEvent<ItemActionEventData>));
		this.#htmlList.adoptStyle(treeCSS);
	}

	#handleItemAction(event: CustomEvent<ItemActionEventData>) {
		const clickedItem = event.detail.item;

		switch (event.detail.action) {
			case 'download':
				if (clickedItem) {
					Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { vpkPath: this.#vpkPath, path: clickedItem.getPath() } }));
				}
				break;
		}
	}

	protected refreshHTML(): void {
		this.initHTML();

		if (this.#dirtyVpkList) {
			this.#htmlList?.replaceChildren();
			this.#htmlList?.setRoot(TreeItem.createFromPathList(this.#vpkList));
			this.#dirtyVpkList = false;
		}

		if (this.#dirtyFileList) {
			this.#htmlFileTree?.replaceChildren();
			const root = TreeItem.createFromPathList(this.#fileList);

			if (root) {
				for (let item of root.walk({ type: 'file' })) {
					item.addAction('download');
				}
			}

			this.#htmlFileTree?.setRoot(root);

			this.#dirtyFileList = false;
		}
	}

	setVpkList(vpkList: Array<string>) {
		this.#vpkList = vpkList;
		this.#dirtyVpkList = true;
		this.refreshHTML();
	}

	setFileList(vpkPath: string, fileList: Array<string>) {
		this.#vpkPath = vpkPath;
		this.#fileList = fileList;
		this.#dirtyFileList = true;
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
