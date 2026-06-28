import { RepositoryEntry } from 'harmony-3d';
import { addTaskSVG, shareSVG } from 'harmony-svg';
import { createElement, createShadowRoot, defineHarmonyFilter, defineHarmonyTree, HarmonyFilterEvent, HarmonyFilterOption, HTMLHarmonyFilterElement, HTMLHarmonyTreeElement, ItemActionEventData, ItemClickEventData, TreeItem, TreeItemFilter, TreeItemKind } from 'harmony-ui';
import { BugReporter } from 'harmony-utils';
import repositorySelectorCSS from '../../css/repositoryselector.css';
import treeCSS from '../../css/tree.css';
import { Controller } from '../controller';
import { AddTask, ControllerEvents, SelectFile, SelectRepository } from '../controllerevents';
import { SiteElement } from './siteelement';

export class ApplicationSelector extends SiteElement {
	#htmlList?: HTMLHarmonyTreeElement;
	#htmlFileFilter?: HTMLHarmonyFilterElement;
	#htmlFileTree?: HTMLHarmonyTreeElement;
	#repository: string = '';
	#applicationList?: Map<string, string>;
	#fileList?: Map<string, RepositoryEntry>;
	#repositoryRoot?: TreeItem;
	#fileRoot?: TreeItem;
	#dirtyRepositoryList = true;
	#dirtyFileList = true;
	readonly #fileFilter: TreeItemFilter = {};

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		defineHarmonyTree();
		defineHarmonyFilter();
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
				this.#htmlFileFilter = createElement('harmony-filter', {
					class: 'filters',
					type: 'text',
					$filter: (event: CustomEvent<HarmonyFilterEvent<any>>) => {
						switch (event.detail.name) {
							case 'name':
								this.#setFileFilter(event.detail);
								break;
							case 'filetype':
								this.#setExtensionFilter(event.detail);
								break;
						}
					},
				}) as HTMLHarmonyFilterElement,
				this.#htmlFileTree = createElement('harmony-tree', {
					class: 'file-list',
					$itemclick: (event: CustomEvent<ItemClickEventData>) => this.#fileItemClick(event),
				}) as HTMLHarmonyTreeElement,
			]
		});


		this.#htmlList.addAction('sharelink', shareSVG, '#copy_link');
		this.#htmlList.addEventListener('itemaction', (event: Event) => this.#handleRepositoryAction(event as CustomEvent<ItemActionEventData>));

		this.#htmlFileTree.addAction('add task', addTaskSVG, '#add_task');
		this.#htmlFileTree.addAction('sharelink', shareSVG, '#copy_link');
		this.#htmlFileTree.addEventListener('itemaction', (event: Event) => this.#handleItemAction(event as CustomEvent<ItemActionEventData>));
		this.#htmlList.adoptStyle(treeCSS);
		this.#initFilters();
	}

	#initFilters(): void {
		const options: HarmonyFilterOption[] = [];

		for (const name of ['all', 'vmdl', 'vmat', 'vtex', 'txt']) {
			options.push(
				{
					name,
					title: `#asset_type_${name}`,
					value: true,
				});
		}

		this.#htmlFileFilter!.addFilters([
			{
				name: 'name',
				type: 'string',
				placeholder: '#filter_files',
			},
			{
				name: 'filetype',
				title: '#file_type',
				type: 'list',
				placeholder: '#filter_files',
				options,
			},
		]);
	}

	#handleRepositoryAction(event: CustomEvent<ItemActionEventData>) {
		const clickedItem = event.detail.item;

		switch (event.detail.action) {
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
				Controller.dispatchEvent(new CustomEvent<AddTask>(ControllerEvents.AddTask, { detail: { root: clickedItem.userData as RepositoryEntry } }));
				break;
			case 'sharelink':
				Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.CreateFileLink, { detail: { repository: this.#repository, path: clickedItem.getPath() } }));
				//Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.CreateFileLink, { detail: { repository: this.#repository, path: clickedItem.getPath().replace(/^(\/)+/g, '') } }));
				break;
		}
	}

	protected refreshHTML(): void {
		this.initHTML();

		if (this.#dirtyRepositoryList && this.#applicationList) {
			this.#htmlList?.replaceChildren();
			this.#repositoryRoot = TreeItem.createFromPathList(this.#applicationList);

			for (let item of this.#repositoryRoot.walk({ kind: TreeItemKind.File })) {
				item.addActions(['sharelink']);
			}

			this.#htmlList?.setRoot(this.#repositoryRoot);
			this.#dirtyRepositoryList = false;
		}

		if (this.#dirtyFileList && this.#fileList) {
			this.#htmlFileTree?.replaceChildren();
			this.#fileRoot = TreeItem.createFromPathList(this.#fileList, { rootUserData: this.#fileList?.get('') });

			for (let item of this.#fileRoot.walk({})) {
				if (item.kind == TreeItemKind.Directory || item.kind == TreeItemKind.Root) {
					item.addActions(['add task']);
				}
				item.addActions(['sharelink']);
			}

			this.#htmlFileTree?.setRoot(this.#fileRoot);
			this.#dirtyFileList = false;
		}
	}

	setApplicationList(applicationList: Map<string, string>) {
		this.#applicationList = applicationList;
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
		if (!clickedItem || clickedItem.kind != TreeItemKind.File) {
			return;
		}

		Controller.dispatchEvent(new CustomEvent<SelectRepository>(ControllerEvents.SelectRepository, { detail: { repository: clickedItem.getPath() } }));
	}

	#fileItemClick(event: CustomEvent<ItemClickEventData>) {
		const clickedItem = event.detail.item;
		if (!clickedItem || clickedItem.kind != TreeItemKind.File) {
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

	#setFileFilter(filter: HarmonyFilterEvent<string>) {
		this.#fileFilter.name = filter.value;
		this.#htmlFileTree?.setFilter(this.#fileFilter);
	}


	#setExtensionFilter(filter: HarmonyFilterEvent<Map<string, boolean | undefined>>) {
		let extensions: string[] | undefined = [];
		loop:
		for (const [ext, value] of filter.value) {
			if (!value) {
				continue;
			}
			switch (ext) {
				case 'all':
					extensions = undefined;
					break loop;
				case 'vmdl':
					extensions.push('.vmdl', '.vmdl_c');
					break;
				case 'vmat':
					extensions.push('.vmat', '.vmat_c');
					break;
				case 'vtex':
					extensions.push('.vtex', '.vtex_c');
					break;
				case 'txt':
					extensions.push('.txt');
					break;
				default:
					BugReporter.reportBug('warning', `missing filter extension ${ext}`);
					break;
			}
		}

		this.#fileFilter.extensions = extensions;
		this.#htmlFileTree?.setFilter(this.#fileFilter);
	}
}
