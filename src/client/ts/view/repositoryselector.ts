import { RepositoryEntry } from 'harmony-3d';
import { addTaskSVG, downloadSVG, mediationSVG, shareSVG } from 'harmony-svg';
import { createElement, createShadowRoot, defineHarmonyTree, HTMLHarmonyTreeElement, ItemActionEventData, ItemClickEventData, TreeItem } from 'harmony-ui';
import { setTimeoutPromise } from 'harmony-utils';
import repositorySelectorCSS from '../../css/repositoryselector.css';
import treeCSS from '../../css/tree.css';
import { Controller } from '../controller';
import { AddTask, ControllerEvents, SelectFile, SelectRepository } from '../controllerevents';
import { Task } from '../tasks/task';
import { TaskRunner } from '../tasks/taskrunner';
import { SiteElement } from './siteelement';
import { downloadFile } from '../tasks/downloadfile';

export class RepositorySelector extends SiteElement {
	#htmlList?: HTMLHarmonyTreeElement;
	#htmlFileFilter?: HTMLInputElement;
	#htmlFileTree?: HTMLHarmonyTreeElement;
	#repository: string = '';
	#repositoryList?: Set<string>;
	#fileList?: Map<string, RepositoryEntry>;
	#repositoryRoot?: TreeItem;
	#fileRoot?: TreeItem;
	#dirtyRepositoryList = true;
	#dirtyFileList = true;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		defineHarmonyTree();
		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: repositorySelectorCSS,
			childs: [
				/*
				createElement('button', {
					i18n: '#refresh_vpks',
					$click: () => Controller.dispatchEvent(new CustomEvent(ControllerEvents.RefreshVpkList)),
				}),
				*/
				this.#htmlList = createElement('harmony-tree', {
					class: 'repositories',
					$itemclick: (event: CustomEvent<ItemClickEventData>) => this.#itemClick(event),
				}) as HTMLHarmonyTreeElement,
				this.#htmlFileFilter = createElement('input', {
					class: 'files',
					type: 'text',
					$input: (event: InputEvent) => this.setFileFilter((event.target as HTMLInputElement).value),
				}) as HTMLInputElement,
				this.#htmlFileTree = createElement('harmony-tree', {
					$itemclick: (event: CustomEvent<ItemClickEventData>) => this.#fileItemClick(event),
				}) as HTMLHarmonyTreeElement,
			]
		});


		this.#htmlList.addAction('sharelink', shareSVG, '#copy_link');
		this.#htmlList.addAction('mergematerials', mediationSVG, '#merge_materials');
		this.#htmlList.addEventListener('itemaction', (event: Event) => this.#handleRepositoryAction(event as CustomEvent<ItemActionEventData>));

		this.#htmlFileTree.addAction('add task', addTaskSVG, '#add_task');
		this.#htmlFileTree.addAction('sharelink', shareSVG, '#copy_link');
		this.#htmlFileTree.addEventListener('itemaction', (event: Event) => this.#handleItemAction(event as CustomEvent<ItemActionEventData>));
		this.#htmlList.adoptStyle(treeCSS);
	}

	#handleRepositoryAction(event: CustomEvent<ItemActionEventData>) {
		const clickedItem = event.detail.item;

		switch (event.detail.action) {
			case 'mergematerials':
				if (clickedItem) {
					clickedItem.removeAction('mergematerials');
					this.#htmlList?.refreshActions(clickedItem);
					Controller.dispatchEvent(new CustomEvent<SelectRepository>(ControllerEvents.DownloadMaterials, { detail: { repository: clickedItem.getPath() } }));
				}
				break;
			case 'sharelink':
				if (clickedItem) {
					Controller.dispatchEvent(new CustomEvent<SelectRepository>(ControllerEvents.CreateRepositoryLink, { detail: { repository: clickedItem.getPath() } }));
				}
				break;
		}
	}

	async #handleItemAction(event: CustomEvent<ItemActionEventData>): Promise<void> {
		const clickedItem = event.detail.item;
		if (!clickedItem) {
			return;
		}

		switch (event.detail.action) {
			case 'add task':
				Controller.dispatchEvent(new CustomEvent<AddTask>(ControllerEvents.AddTask, { detail: { root: clickedItem.userData } }));
				break;
			case 'sharelink':
				Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.CreateFileLink, { detail: { repository: this.#repository, path: clickedItem.getPath() } }));
				break;
		}
	}

	protected refreshHTML(): void {
		this.initHTML();

		if (this.#dirtyRepositoryList && this.#repositoryList) {
			this.#htmlList?.replaceChildren();
			this.#repositoryRoot = TreeItem.createFromPathList(this.#repositoryList);

			for (let item of this.#repositoryRoot.walk({ type: 'file' })) {
				item.addActions(['mergematerials', 'sharelink']);
			}

			this.#htmlList?.setRoot(this.#repositoryRoot);
			this.#dirtyRepositoryList = false;
		}

		if (this.#dirtyFileList && this.#fileList) {
			this.#htmlFileTree?.replaceChildren();
			this.#fileRoot = TreeItem.createFromPathList(this.#fileList);

			for (let item of this.#fileRoot.walk({})) {
				if (item.type == 'directory') {
					item.addActions(['add task']);
				}
				item.addActions(['sharelink']);
			}

			this.#htmlFileTree?.setRoot(this.#fileRoot);
			this.#dirtyFileList = false;
		}
	}

	setRepositoryList(repositoryList: Set<string>) {
		this.#repositoryList = repositoryList;
		this.#dirtyRepositoryList = true;
		this.refreshHTML();
	}

	setFileList(repository: string, fileList: Map<string, RepositoryEntry>) {
		this.#repository = repository;
		this.#fileList = fileList;
		this.#dirtyFileList = true;
		this.refreshHTML();
	}

	#itemClick(event: CustomEvent<ItemClickEventData>) {
		const clickedItem = event.detail.item;
		if (!clickedItem || clickedItem.type != 'file') {
			return;
		}

		Controller.dispatchEvent(new CustomEvent<SelectRepository>(ControllerEvents.SelectRepository, { detail: { repository: clickedItem.getPath() } }));
	}

	#fileItemClick(event: CustomEvent<ItemClickEventData>) {
		const clickedItem = event.detail.item;
		if (!clickedItem || clickedItem.type != 'file') {
			return;
		}

		Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.SelectFile, { detail: { repository: this.#repository, path: clickedItem.getPath() } }));
	}

	selectRepository(repository: string, scrollIntoView: boolean) {
		this.initHTML();

		if (!this.#repositoryRoot) {
			return
		}

		for (let item of this.#repositoryRoot.walk()) {
			if (item.getPath() == repository) {
				this.#htmlList?.selectItem(item);
				return;
			}
		}
	}

	selectFile(path: string, scrollIntoView: boolean) {
		this.initHTML();

		if (!this.#fileRoot) {
			return
		}

		for (let item of this.#fileRoot.walk()) {
			if (item.getPath() == path) {
				this.#htmlFileTree?.selectItem(item, scrollIntoView);
				return;
			}
		}
	}

	setFileFilter(filter: string) {
		this.#htmlFileTree?.setFilter({ name: filter });
	}
}
