import { RepositoryEntry } from 'harmony-3d';
import { OptionsManager } from 'harmony-browser-utils';
import { addTaskSVG, shareSVG } from 'harmony-svg';
import { createElement, createShadowRoot, defineHarmonyFilter, defineHarmonyTree, HarmonyFilterEvent, HarmonyFilterListType, HarmonyFilterOption, HTMLHarmonyFilterElement, HTMLHarmonyTreeElement, ItemActionEventData, ItemClickEventData, TreeItem, TreeItemFilter, TreeItemKind } from 'harmony-ui';
import { BugReporter } from 'harmony-utils';
import repositorySelectorCSS from '../../css/repositoryselector.css';
import treeCSS from '../../css/tree.css';
import { Controller } from '../controller';
import { AddTask, ControllerEvents, SelectFile, SelectRepository } from '../controllerevents';
import { SiteElement } from './siteelement';

type ExtensionSet = string[];
const Source1Extensions: ExtensionSet = ['all', 'others', 'vbsp', 'mdl', 'txt', 'pcf', 'res', 'tga'];
const Source2Extensions: ExtensionSet = ['all', 'others', 'vdata', 'vmdl', 'vmat', 'vtex', 'vpcf', 'vfont', 'vsnap', 'svg', 'css', 'txt'];

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

	constructor() {
		super();
		Controller.addEventListener(ControllerEvents.SelectRepository, (event: Event) => {
			switch ((event as CustomEvent<SelectRepository>).detail.repository) {
				case 'tf2':
					this.#initFilters(Source1Extensions);
					break;
				case 'dota2':
				case 'cs2':
				case 'deadlock':
					this.#initFilters(Source2Extensions);
					break;
				default:
					this.#initFilters();
					break;
			}
		});
	}

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
								this.#setExtensionFilter((event as CustomEvent<HarmonyFilterEvent<Map<string, boolean | undefined>>>).detail.value);
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
		//this.#initFilters();
	}

	#initFilters(extensionSet?: ExtensionSet): void {
		this.#htmlFileFilter!.clearFilter();

		const extensions = OptionsManager.getItem('app.fileselector.extensions') as Record<string, boolean | undefined>;

		const options: HarmonyFilterOption[] = [];

		this.#htmlFileFilter!.addFilters([
			{
				name: 'name',
				type: 'string',
				placeholder: '#filter_files',
			},
		]);

		if (extensionSet) {
			for (const name of extensionSet) {
				const option: HarmonyFilterOption =
				{
					name,
					title: `#asset_type_${name}`,
				};
				if (name === 'all' || name === 'others') {
					option.value = extensions[name] ?? true;
					option.optionType = HarmonyFilterListType.Boolean;
				} else {
					option.value = extensions[name];
				}
				options.push(option);
			}

			this.#htmlFileFilter!.addFilters([
				{
					name: 'filetype',
					title: '#file_type',
					type: 'list',
					listType: HarmonyFilterListType.Ternary,
					placeholder: '#filter_files',
					options,
				},
			]);
		}
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


	#setExtensionFilter(filter: Map<string, boolean | undefined>) {
		const extensions = new Map<string, boolean | undefined>();
		for (const [ext, value] of filter) {
			OptionsManager.setSubItem('app.fileselector.extensions', ext, value);
			/*
			if (!value) {
				continue;
			}
			*/
			switch (ext) {
				case 'all':
					extensions.set('*', value);
					break;
				case 'others':
					extensions.set('^', value);
					break;
				case 'vdata':
				case 'vmdl':
				case 'vmat':
				case 'vtex':
				case 'vpcf':
				case 'vfont':
				case 'vsnap':
				case 'vsvg':
					extensions.set(ext, value);
					extensions.set(ext + '_c', value);
					break;
				case 'txt':
				case 'vbsp':
				case 'pcf':
				case 'res':
				case 'tga':
					extensions.set(ext, value);
				case 'mdl':
					extensions.set(ext, value);
					extensions.set('vtx', value);
					extensions.set('vvd', value);
					break;
				case 'svg':
				case 'css':
					extensions.set(ext, value);
					extensions.set('v' + ext, value);
					extensions.set('v' + ext + '_c', value);
				default:
					BugReporter.reportBug('warning', `missing filter extension ${ext}`);
					break;
			}
		}

		this.#fileFilter.extensions = extensions;
		this.#htmlFileTree?.setFilter(this.#fileFilter);
	}
}
