
import { MemoryCacheRepository, Repositories } from 'harmony-3d';
import { addNotification, NotificationType, saveFile } from 'harmony-browser-utils';
import { themeCSS } from 'harmony-css';
import { createShadowRoot, documentStyle, I18n } from 'harmony-ui';
import applicationCSS from '../css/application.css';
import htmlCSS from '../css/html.css';
import english from '../json/i18n/english.json';
import { ApiRepository } from './apirepository';
import { Controller } from './controller';
import { ControllerEvents, SelectFile, SelectVpk } from './controllerevents';
import { GameEngine } from './enums';
import { fetchApi } from './fetchapi';
import { FileCache } from './filecache';
import { VpkListResponse } from './responses/vpk';
import { MainContent } from './view/maincontent';
import { Toolbar } from './view/toolbar';

documentStyle(htmlCSS);
documentStyle(themeCSS);

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
		this.#refreshVpkList();
		await this.#startup();
	}

	#initEvents() {
		Controller.addEventListener(ControllerEvents.RefreshVpkList, () => this.#refreshVpkList());
		Controller.addEventListener(ControllerEvents.SelectVpk, (event: Event) => this.#selectVpk((event as CustomEvent<SelectVpk>).detail.path));
		Controller.addEventListener(ControllerEvents.SelectFile, (event: Event) => this.#selectFile((event as CustomEvent<SelectFile>).detail.vpkPath, (event as CustomEvent<SelectFile>).detail.path));
		Controller.addEventListener(ControllerEvents.DownloadFile, (event: Event) => this.#downloadFile(event as CustomEvent<SelectFile>));
		Controller.addEventListener(ControllerEvents.CreateFileLink, (event: Event) => this.#createFileLink(event as CustomEvent<SelectFile>));
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
		let result = /@view\/([^\:]*)\:(.*)/i.exec(document.location.pathname);
		if (result) {
			await this.#selectVpk(result[1]);
			await this.#selectFile(result[1], result[2]);
		}
	}

	async #refreshVpkList() {
		const { requestId, response } = await fetchApi('get-vpk-list', 1) as { requestId: string, response: VpkListResponse };

		if (!response.success) {
			return;
		}

		this.#appContent.setVpkList(response.result!.files);
	}

	async #selectVpk(vpkPath: string) {
		let repository = Repositories.getRepository(vpkPath);
		if (!repository) {
			repository = new MemoryCacheRepository(new ApiRepository(vpkPath));
			Repositories.addRepository(repository);
		}


		const { requestId, response } = await fetchApi('get-file-list', 1, { vpk_path: vpkPath }) as { requestId: string, response: VpkListResponse };

		console.info(event, response);
		if (!response.success) {
			return;
		}
		this.#appContent.setFileList(vpkPath, response.result!.files);
		this.#appContent.selectVpk(vpkPath);
	}

	async #selectFile(vpkPath: string, path: string) {
		const response = await Repositories.getFile(vpkPath, path);
		if (response.error) {
			return
		}

		console.info(response.file);
		this.#appContent.viewFile(vpkPath, path, GameEngine.Source1, response.file!);
		this.#appContent.selectVpk(vpkPath);
		this.#appContent.selectFile(path);
	}

	async #downloadFile(event: CustomEvent<SelectFile>) {
		const response = await Repositories.getFile(event.detail.vpkPath, event.detail.path);
		if (response.error) {
			return
		}

		saveFile(response.file!);
	}

	async #createFileLink(event: CustomEvent<SelectFile>) {
		const response = await Repositories.getFile(event.detail.vpkPath, event.detail.path);

		const url = `${document.location.origin}/@view/${encodeURI(event.detail.vpkPath)}:${encodeURI(event.detail.path)}`;
		console.info(url);

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
}
const app = new Application();
