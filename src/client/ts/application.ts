
import { themeCSS } from 'harmony-css';
import { createShadowRoot, documentStyle, I18n } from 'harmony-ui';
import applicationCSS from '../css/application.css';
import htmlCSS from '../css/html.css';
import english from '../json/i18n/english.json';
import { fetchApi } from './fetchapi';
import { MainContent } from './view/maincontent';
import { Controller } from './controller';
import { ControllerEvents, SelectFile, SelectVpk } from './controllerevents';
import { getFileResponse, VpkListResponse } from './responses/vpk';

documentStyle(htmlCSS);
documentStyle(themeCSS);

class Application {
	#shadowRoot!: ShadowRoot;
	#appContent = new MainContent();

	constructor() {
		this.#init();
	}

	async #init() {
		I18n.setOptions({ translations: [english] });
		I18n.start();
		this.#initEvents();
		this.#initPage();
	}

	#initEvents() {
		Controller.addEventListener(ControllerEvents.RefreshVpkList, () => this.#refreshVpkList());
		Controller.addEventListener(ControllerEvents.SelectVpk, (event: Event) => this.#selectVpk(event as CustomEvent<SelectVpk>));
		Controller.addEventListener(ControllerEvents.SelectFile, (event: Event) => this.#selectFile(event as CustomEvent<SelectFile>));
	}

	#initPage() {
		createShadowRoot('div', {
			parent: document.body,
			adoptStyle: applicationCSS,
			childs: [
				//this.#appToolbar.getHTML(),
				this.#appContent.getHTML(),
				//this.#appFooter.getHTML(),
			],
		});
	}

	async #refreshVpkList() {
		const { requestId, response } = await fetchApi('get-vpk-list', 1) as { requestId: string, response: VpkListResponse };

		if (!response.success) {
			return;
		}

		this.#appContent.setVpkList(response.result!.files);
	}

	async #selectVpk(event: CustomEvent<SelectVpk>) {
		const vpkPath = event.detail.path;
		const { requestId, response } = await fetchApi('get-file-list', 1, { vpk_path: vpkPath }) as { requestId: string, response: VpkListResponse };

		console.info(event, response);
		if (!response.success) {
			return;
		}
		this.#appContent.setFileList(vpkPath, response.result!.files);
	}

	async #selectFile(event: CustomEvent<SelectFile>) {
		const { requestId, response } = await fetchApi('get-file', 1, { vpk_path: event.detail.vpkPath, path:event.detail.path }) as { requestId: string, response: getFileResponse };

		//console.info(event, response);
		if (!response.success) {
			return;
		}

		console.info(atob(response.result!.content))
		//this.#appContent.setFileList(response.result!.files);
	}
}
const app = new Application();
