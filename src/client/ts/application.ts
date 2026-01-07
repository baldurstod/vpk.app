
import { MemoryCacheRepository, MemoryRepository, Repositories, Repository, RepositoryEntry, Source1MaterialManager, Source1TextureManager, VpkRepository, ZipRepository } from 'harmony-3d';
import { addNotification, NotificationType, OptionsManager, saveFile } from 'harmony-browser-utils';
import { themeCSS } from 'harmony-css';
import { createShadowRoot, documentStyle, I18n } from 'harmony-ui';
import applicationCSS from '../css/application.css';
import htmlCSS from '../css/html.css';
import english from '../json/i18n/english.json';
import optionsmanager from '../json/optionsmanager.json';
import { ApiRepository } from './apirepository';
import { Controller } from './controller';
import { AddTask, ControllerEvents, NavigateTo, SelectFile, SelectRepository } from './controllerevents';
import { GameEngine } from './enums';
import { fetchApi } from './fetchapi';
import { FileCache } from './filecache';
import { ApplicationListResponse } from './responses/repository';
import { MainContent } from './view/maincontent';
import { TaskManager } from './view/taskmanager';
import { Toolbar } from './view/toolbar';

documentStyle(htmlCSS);
documentStyle(themeCSS);

Repositories.addRepository(new MemoryCacheRepository(new ApiRepository('tf2/tf/tf2_textures_dir.vpk')));
Repositories.addRepository(new MemoryCacheRepository(new ApiRepository('tf2/tf/tf2_misc_dir.vpk')));
Source1TextureManager.fallbackRepository = 'tf2/tf/tf2_textures_dir.vpk';
Source1MaterialManager.fallbackRepository = 'tf2/tf/tf2_misc_dir.vpk';

class Application {
	#shadowRoot!: ShadowRoot;
	#appContent = new MainContent();
	#toolbar = new Toolbar();
	#taskManager = new TaskManager();
	#fileCache = new FileCache();
	#currentRepository = '';
	#currentFile = '';
	#localRepo = Repositories.addRepository(new MemoryRepository('local')) as MemoryRepository;
	#localRepositories: Repository[] = [this.#localRepo];

	constructor() {
		this.#init();
	}

	async #init() {
		I18n.setOptions({ translations: [english] });
		I18n.start();
		this.#initEvents();
		this.#initPage();
		await this.#refreshApplicationList();
		await this.#startup();
		OptionsManager.init({ json: optionsmanager });
	}

	#initEvents() {
		Controller.addEventListener(ControllerEvents.RefreshRepositoryList, () => this.#refreshApplicationList());
		Controller.addEventListener(ControllerEvents.SelectRepository, (event: Event) => this.#selectRepository((event as CustomEvent<SelectRepository>).detail.repository, false));
		Controller.addEventListener(ControllerEvents.SelectFile, (event: Event) => this.#selectFile((event as CustomEvent<SelectFile>).detail.repository, (event as CustomEvent<SelectFile>).detail.path, (event as CustomEvent<SelectFile>).detail.hash ?? '', true));
		Controller.addEventListener(ControllerEvents.DownloadFile, (event: Event) => this.#downloadFile(event as CustomEvent<SelectFile>));
		Controller.addEventListener(ControllerEvents.CreateRepositoryLink, (event: Event) => this.#createRepositoryLink(event as CustomEvent<SelectRepository>));
		Controller.addEventListener(ControllerEvents.CreateFileLink, (event: Event) => this.#createFileLink(event as CustomEvent<SelectFile>));
		Controller.addEventListener(ControllerEvents.ToogleOptions, () => this.#appContent.toogleOptions());
		Controller.addEventListener(ControllerEvents.OpenAdvancedOptions, () => OptionsManager.showOptionsManager());
		Controller.addEventListener(ControllerEvents.NavigateTo, (event: Event) => this.#navigateTo((event as CustomEvent<NavigateTo>).detail.url, (event as CustomEvent).detail.replaceSate));
		Controller.addEventListener(ControllerEvents.AddTask, (event: Event) => this.#addTask((event as CustomEvent<AddTask>).detail.root));
		addEventListener('popstate', event => this.#startup(event.state ?? {}));
	}

	#initPage() {
		createShadowRoot('div', {
			parent: document.body,
			adoptStyle: applicationCSS,
			childs: [
				//this.#appToolbar.getHTML(),
				this.#toolbar.getHTML(),
				this.#appContent.getHTML(),
				this.#taskManager.getHTML(),
				//this.#appFooter.getHTML(),
			],
			$dragover: (event: Event) => event.preventDefault(),
			$drop: (event: Event) => this.#handleDrop(event as DragEvent),
		});
	}

	async #startup(historyState = {}) {
		this.#restoreHistoryState(historyState);
		let pathname = document.location.pathname;
		switch (true) {
			case pathname.includes('@view'):
				this.#initViewFromUrl();
				break;
			case pathname == '':
			case pathname == '/':
				break;
			default:
				this.#navigateTo('/');
				break;
		}

		//this.#appContent.setActivePage(this.#pageType, this.#pageSubType);
	}

	#navigateTo(url: string, replaceSate = false) {
		history[replaceSate ? 'replaceState' : 'pushState']({}, '', url);
		this.#startup();
	}

	#addTask(root: RepositoryEntry) {
		console.info(root);
		this.#taskManager.createTask(root);
	}

	#restoreHistoryState({ } = {}) {
	}

	async #initViewFromUrl() {
		let result = /@view\/([^\/]*)\/?(.*)/i.exec(decodeURI(document.location.pathname));

		if (result && result.length > 2) {
			const path = result[2]!.replace(/(\/)+$/, '');

			await this.#selectRepository(result[1]!, true, path);
			if (path) {
				await this.#viewFile(result[1]!, path, document.location.hash.substring(1), new URLSearchParams(document.location.search), false);
			}
		}
	}

	async #refreshApplicationList() {
		const { requestId, response } = await fetchApi('get-application-list', 1) as { requestId: string, response: ApplicationListResponse };

		if (!response.success) {
			return;
		}

		/*
		const localRepositories: string[] = [];
		for (const localRepository of this.#localRepositories) {
			localRepositories.push(localRepository.name);
		}
		*/

		let repositories = new Map<string, string>();
		for (const path in response.result?.applications!) {
			repositories.set(path, response.result?.applications[path]!);
		}

		this.#appContent.setApplicationList(repositories/*response.result!.files.concat(localRepositories)*/);
	}

	async #selectRepository(repository: string, scrollIntoView: boolean, path?: string): Promise<void> {
		if (this.#currentRepository == repository) {
			return;
		}
		this.#currentRepository = repository;

		let repo = Repositories.getRepository(repository);
		if (!repo) {
			repo = Repositories.addRepository(new MemoryCacheRepository(new ApiRepository(repository)));
		}

		this.#selectRepository2(repository, repo, scrollIntoView, path);
	}

	async #selectRepository2(repository: string, repo: Repository, scrollIntoView: boolean, path?: string): Promise<void> {
		const response = await repo.getFileList();
		if (response.error || !response.root) {
			// TODO: log error
			return;
		}

		let files = new Map<string, RepositoryEntry>();
		for (const child of response.root.getAllChilds()) {
			files.set(child.getFullName(), child);
		}

		this.#appContent.setFileList(repository, files);
		this.#appContent.selectRepository(repository, scrollIntoView);
		if (path) {
			this.#appContent.selectFile(path, scrollIntoView);
		}
	}

	async #selectFile(repository: string, path: string, hash: string, userAction: boolean) {
		this.#navigateTo(this.#getFileLink(repository, path));
	}

	async #viewFile(repository: string, path: string, hash: string, search: URLSearchParams | null, userAction: boolean) {
		path = path.replace(/\.(vvd|dx80\.vtx|dx90\.vtx|sw\.vtx)$/, '.mdl');
		this.#appContent.selectRepository(repository, !userAction);
		this.#appContent.selectFile(path, !userAction);

		const response = await Repositories.getFile(repository, path);
		if (response.error) {
			addNotification(I18n.getString('#file_not_found'), NotificationType.Error, 5)
			return;
		}

		this.#appContent.viewFile(repository, path, hash, search, GameEngine.Source1/*TODO: param*/, response.file!, userAction);
	}

	async #downloadFile(event: CustomEvent<SelectFile>) {
		const response = await Repositories.getFile(event.detail.repository, event.detail.path);
		if (response.error) {
			return
		}

		let file = response.file!;
		if (OptionsManager.getItem('app.files.export.namingscheme') == 'name') {
			file = new File([file], file.name.split('/').pop() ?? file.name, { type: file.type });
		}

		saveFile(file);
	}

	#createRepositoryLink(event: CustomEvent<SelectRepository>): void {
		this.#copyLink(`${document.location.origin}/@view/${encodeURI(event.detail.repository)}`);
	}

	#getFileLink(repository: string, path: string): string {
		return `${document.location.origin}/@view/${encodeURI(repository)}/${encodeURI(path)}`
	}

	#createFileLink(event: CustomEvent<SelectFile>): void {
		this.#copyLink(this.#getFileLink(event.detail.repository, event.detail.path));
	}

	async #copyLink(url: string): Promise<void> {

		let notificationText = `${I18n.getString('#share_this_url')}<input value='${url}'>`;
		try {
			navigator.clipboard.writeText(url).then(
				() => addNotification(I18n.getString('#share_link_clipboard_ok'), NotificationType.Info, 5),
				() => addNotification(notificationText, NotificationType.Info, 15)
			);
		} catch (e) {
			addNotification(notificationText, NotificationType.Info, 15);
		}
	}

	async #handleDrop(event: DragEvent): Promise<void> {
		event.preventDefault();

		if (!event.dataTransfer) {
			return;
		}

		for (const item of event.dataTransfer.items) {
			if (item.kind === 'file') {
				const file = item.getAsFile();
				if (file) {
					console.log(`… file.name = ${file.name}`, file);
					await this.#openLocalFile(file);
				}
			}
		}
	}

	async #openLocalFile(file: File): Promise<void> {
		const dot = file.name.lastIndexOf('.');
		const name = file.name.substring(0, dot - 1);
		const extension = file.name.substring(dot + 1);
		switch (extension) {
			case 'vpk':

				break;

			default:
				break;
		}
		if (extension == 'vpk' || extension == 'zip') {
			let repo: Repository;
			const repoName = 'local_' + file.name;
			if (extension == 'vpk') {
				repo = new VpkRepository(repoName, [file]);
			} else {
				repo = new ZipRepository(repoName, file);
			}
			//Repositories.addRepository(new MergeRepository(repoName, repo, tf2MaterialsRepo));
			Repositories.addRepository(repo);
			this.#localRepositories.push(repo);
			await this.#refreshApplicationList();
			this.#selectRepository(repoName, true);
		} else {
			let filename = file.name;
			let i = 0;
			while ((await this.#localRepo.getFile(filename)).file) {
				filename = `${name}(${++i}).${extension}`;
			}

			this.#localRepo.setFile(filename, file);
			await this.#viewFile('local', filename, '', null, false);
		}
	}
}
const app = new Application();
