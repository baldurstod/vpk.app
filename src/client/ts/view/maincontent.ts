import { createShadowRoot, toggle } from 'harmony-ui';
import mainContentCSS from '../../css/maincontent.css';
import { SiteElement } from './siteelement';
import { VpkSelector } from './repositoryselector';
import { ContentViewer } from './contentviewer';
import { GameEngine } from '../enums';
import { Options } from './options';

export class MainContent extends SiteElement {
	#vpkSelector = new VpkSelector();
	#contentViewer = new ContentViewer();
	#options = new Options();

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: mainContentCSS,
			childs: [
				this.#vpkSelector.getHTML(),
				this.#options.getHTML(),
				this.#contentViewer.getHTML(),
			],
		});
		this.#options.hide();
	}

	selectVpk(repository: string) {
		this.#vpkSelector.selectVpk(repository);
	}

	selectFile(path: string) {
		this.#vpkSelector.selectFile(path);
	}

	setVpkList(vpkList: Array<string>) {
		this.#vpkSelector.setVpkList(vpkList);
	}

	setFileList(repository: string, fileList: Array<string>) {
		this.#vpkSelector.setFileList(repository, fileList);
	}

	viewFile(repository: string, path: string, engine: GameEngine, file: File) {
		this.#contentViewer.viewFile(repository, path, engine, file);
	}

	toogleOptions() {
		toggle(this.#options.getHTML());
	}
}
