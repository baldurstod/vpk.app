
import { MemoryCacheRepository, MemoryRepository, Repositories, Repository, Source1TextureManager, VpkRepository, ZipRepository } from 'harmony-3d';
import { addNotification, NotificationType, OptionsManager, saveFile } from 'harmony-browser-utils';
import { themeCSS } from 'harmony-css';
import { createShadowRoot, documentStyle, I18n } from 'harmony-ui';
import applicationCSS from '../css/application.css';
import htmlCSS from '../css/html.css';
import english from '../json/i18n/english.json';
import optionsmanager from '../json/optionsmanager.json';
import { ApiRepository } from './apirepository';
import { Controller } from './controller';
import { ControllerEvents, NavigateTo, SelectFile, SelectRepository } from './controllerevents';
import { GameEngine } from './enums';
import { fetchApi } from './fetchapi';
import { FileCache } from './filecache';
import { ConcatFilesResponse, RepositoryListResponse } from './responses/repository';
import { MainContent } from './view/maincontent';
import { Toolbar } from './view/toolbar';

documentStyle(htmlCSS);
documentStyle(themeCSS);

Repositories.addRepository(new MemoryCacheRepository(new ApiRepository('tf2/tf/tf2_textures_dir.vpk')));
Source1TextureManager.fallbackRepository = 'tf2/tf/tf2_textures_dir.vpk';

class Application {
	#shadowRoot!: ShadowRoot;
	#appContent = new MainContent();
	#toolbar = new Toolbar();
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
		await this.#refreshRepositoryList();
		await this.#startup();
		OptionsManager.init({ json: optionsmanager });
	}

	#initEvents() {
		Controller.addEventListener(ControllerEvents.RefreshRepositoryList, () => this.#refreshRepositoryList());
		Controller.addEventListener(ControllerEvents.SelectRepository, (event: Event) => this.#selectRepository((event as CustomEvent<SelectRepository>).detail.repository, false));
		Controller.addEventListener(ControllerEvents.SelectFile, (event: Event) => this.#selectFile((event as CustomEvent<SelectFile>).detail.repository, (event as CustomEvent<SelectFile>).detail.path, (event as CustomEvent<SelectFile>).detail.hash ?? '', true));
		Controller.addEventListener(ControllerEvents.DownloadFile, (event: Event) => this.#downloadFile(event as CustomEvent<SelectFile>));
		Controller.addEventListener(ControllerEvents.DownloadMaterials, (event: Event) => this.#downloadMaterials(event as CustomEvent<SelectRepository>));
		Controller.addEventListener(ControllerEvents.CreateRepositoryLink, (event: Event) => this.#createRepositoryLink(event as CustomEvent<SelectRepository>));
		Controller.addEventListener(ControllerEvents.CreateFileLink, (event: Event) => this.#createFileLink(event as CustomEvent<SelectFile>));
		Controller.addEventListener(ControllerEvents.ToogleOptions, () => this.#appContent.toogleOptions());
		Controller.addEventListener(ControllerEvents.OpenAdvancedOptions, () => OptionsManager.showOptionsManager());
		Controller.addEventListener(ControllerEvents.NavigateTo, (event: Event) => this.#navigateTo((event as CustomEvent<NavigateTo>).detail.url, (event as CustomEvent).detail.replaceSate));
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

	#restoreHistoryState({ } = {}) {
	}

	async #initViewFromUrl() {
		let result = /@view\/([^\:]*)\:?(.*)/i.exec(decodeURI(document.location.pathname));
		if (result) {
			await this.#selectRepository(result[1], true);
			await this.#viewFile(result[1], result[2], document.location.hash.substring(1), false);
		}
	}

	async #refreshRepositoryList() {
		const { requestId, response } = await fetchApi('get-repository-list', 1) as { requestId: string, response: RepositoryListResponse };

		if (!response.success) {
			return;
		}

		const localRepositories: string[] = [];
		for (const localRepository of this.#localRepositories) {
			localRepositories.push(localRepository.name);
		}

		this.#appContent.setRepositoryList(response.result!.files.concat(localRepositories));
	}

	async #selectRepository(repository: string, scrollIntoView: boolean): Promise<void> {
		if (this.#currentRepository == repository) {
			return;
		}

		let repo = Repositories.getRepository(repository);
		if (!repo) {
			repo = Repositories.addRepository(new MemoryCacheRepository(new ApiRepository(repository)));
		}

		const response = await repo.getFileList();
		if (response.error || !response.root) {
			// TODO: log error
			return;
		}

		let files = new Set<string>
		for (const child of response.root.getAllChilds()) {
			files.add(child.getFullName());
		}

		this.#appContent.setFileList(repository, files);
		this.#appContent.selectRepository(repository, scrollIntoView);
	}

	async #selectFile(repository: string, path: string, hash: string, userAction: boolean) {
		this.#navigateTo(this.#getFileLink(repository, path));
	}

	async #viewFile(repository: string, path: string, hash: string, userAction: boolean) {
		path = path.replace(/\.(vvd|dx80\.vtx|dx90\.vtx|sw\.vtx)$/, '.mdl');
		this.#appContent.selectRepository(repository, !userAction);
		this.#appContent.selectFile(path, !userAction);

		const response = await Repositories.getFile(repository, path);
		if (response.error) {
			return;
		}

		console.info(response.file);
		this.#appContent.viewFile(repository, path, hash, GameEngine.Source1, response.file!, userAction);
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

	async #downloadMaterials(event: CustomEvent<SelectRepository>) {
		const repository = event.detail.repository;
		const { requestId, response } = await fetchApi('concat-files', 1, { repository: event.detail.repository, extension: "vmt" }) as { requestId: string, response: ConcatFilesResponse };

		if (!response.success) {
			return;
		}

		console.info(response);

		saveFile(new File([response.result!.content], `${repository}_materials.txt`));
	}

	#createRepositoryLink(event: CustomEvent<SelectRepository>): void {
		this.#copyLink(`${document.location.origin}/@view/${encodeURI(event.detail.repository)}`);
	}

	#getFileLink(repository: string, path: string): string {
		return `${document.location.origin}/@view/${encodeURI(repository)}:${encodeURI(path)}`
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
			if (item.kind === "file") {
				const file = item.getAsFile();
				if (file) {
					console.log(`… file.name = ${file.name}`, file);
					await this.#openLocalFile(file);
				}
			}
		}
	}

	async #openLocalFile(file: File): Promise<void> {
		const extension = file.name.split('.').pop() ?? '';
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
			Repositories.addRepository(repo);
			this.#localRepositories.push(repo);
			await this.#refreshRepositoryList();
			this.#selectRepository(repoName, true);
		} else {
			this.#localRepo.setFile(file.name, file);
			await this.#viewFile('local', file.name, '', false);
		}

	}
}
const app = new Application();
