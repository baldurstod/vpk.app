
import { MemoryCacheRepository, MemoryRepository, Repositories, Source1TextureManager } from 'harmony-3d';
import { addNotification, NotificationType, saveFile } from 'harmony-browser-utils';
import { themeCSS } from 'harmony-css';
import { createShadowRoot, documentStyle, I18n } from 'harmony-ui';
import applicationCSS from '../css/application.css';
import htmlCSS from '../css/html.css';
import english from '../json/i18n/english.json';
import { ApiRepository } from './apirepository';
import { Controller } from './controller';
import { ControllerEvents, SelectFile, SelectRepository } from './controllerevents';
import { GameEngine } from './enums';
import { fetchApi } from './fetchapi';
import { FileCache } from './filecache';
import { ConcatFilesResponse, RepositoryListResponse } from './responses/repository';
import { MainContent } from './view/maincontent';
import { Toolbar } from './view/toolbar';

documentStyle(htmlCSS);
documentStyle(themeCSS);

Repositories.addRepository(new MemoryCacheRepository(new ApiRepository('tf2/tf/tf2_textures_dir.vpk')));
const localRepo = Repositories.addRepository(new MemoryRepository('local')) as MemoryRepository;
Source1TextureManager.fallbackRepository = 'tf2/tf/tf2_textures_dir.vpk';

class Application {
	#shadowRoot!: ShadowRoot;
	#appContent = new MainContent();
	#toolbar = new Toolbar();
	#fileCache = new FileCache();

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
	}

	#initEvents() {
		Controller.addEventListener(ControllerEvents.RefreshRepositoryList, () => this.#refreshRepositoryList());
		Controller.addEventListener(ControllerEvents.SelectRepository, (event: Event) => this.#selectRepository((event as CustomEvent<SelectRepository>).detail.repository, false));
		Controller.addEventListener(ControllerEvents.SelectFile, (event: Event) => this.#selectFile((event as CustomEvent<SelectFile>).detail.repository, (event as CustomEvent<SelectFile>).detail.path, true));
		Controller.addEventListener(ControllerEvents.DownloadFile, (event: Event) => this.#downloadFile(event as CustomEvent<SelectFile>));
		Controller.addEventListener(ControllerEvents.DownloadMaterials, (event: Event) => this.#downloadMaterials(event as CustomEvent<SelectRepository>));
		Controller.addEventListener(ControllerEvents.CreateRepositoryLink, (event: Event) => this.#createRepositoryLink(event as CustomEvent<SelectRepository>));
		Controller.addEventListener(ControllerEvents.CreateFileLink, (event: Event) => this.#createFileLink(event as CustomEvent<SelectFile>));
		Controller.addEventListener(ControllerEvents.ToogleOptions, () => this.#appContent.toogleOptions());
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
		let result = /@view\/([^\:]*)\:?(.*)/i.exec(document.location.pathname);
		if (result) {
			await this.#selectRepository(result[1], true);
			await this.#selectFile(result[1], result[2], false);
		}
	}

	async #refreshRepositoryList() {
		const { requestId, response } = await fetchApi('get-repository-list', 1) as { requestId: string, response: RepositoryListResponse };

		if (!response.success) {
			return;
		}

		this.#appContent.setRepositoryList(response.result!.files);
	}

	async #selectRepository(repository: string, scrollIntoView: boolean) {
		let repo = Repositories.getRepository(repository);
		if (!repo) {
			Repositories.addRepository(new MemoryCacheRepository(new ApiRepository(repository)));
		}


		const { requestId, response } = await fetchApi('get-file-list', 1, { repository: repository }) as { requestId: string, response: RepositoryListResponse };

		console.info(event, response);
		if (!response.success) {
			return;
		}
		this.#appContent.setFileList(repository, response.result!.files);
		this.#appContent.selectRepository(repository, scrollIntoView);
	}

	async #selectFile(repository: string, path: string, userAction: boolean) {
		path = path.replace(/\.(vvd|dx80\.vtx|dx90\.vtx|sw\.vtx)$/, '.mdl');

		const response = await Repositories.getFile(repository, path);
		if (response.error) {
			return
		}

		console.info(response.file);
		this.#appContent.viewFile(repository, path, GameEngine.Source1, response.file!, userAction);
		this.#appContent.selectRepository(repository, !userAction);
		this.#appContent.selectFile(path, !userAction);
	}

	async #downloadFile(event: CustomEvent<SelectFile>) {
		const response = await Repositories.getFile(event.detail.repository, event.detail.path);
		if (response.error) {
			return
		}

		saveFile(response.file!);
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

	#createFileLink(event: CustomEvent<SelectFile>): void {
		this.#copyLink(`${document.location.origin}/@view/${encodeURI(event.detail.repository)}:${encodeURI(event.detail.path)}`);
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

	async  #handleDrop(event: DragEvent): Promise<void> {
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
		//const extension = file.name.split('.').pop() ?? '';
		localRepo.setFile(file.name, file);
		await this.#selectFile('local', file.name, false);

	}
}
const app = new Application();
