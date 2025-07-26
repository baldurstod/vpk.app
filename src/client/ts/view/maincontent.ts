import { createShadowRoot, toggle } from 'harmony-ui';
import mainContentCSS from '../../css/maincontent.css';
import { GameEngine } from '../enums';
import { ContentViewer } from './contentviewer';
import { Options } from './options';
import { RepositorySelector } from './repositoryselector';
import { SiteElement } from './siteelement';

export class MainContent extends SiteElement {
	#repositorySelector = new RepositorySelector();
	#contentViewer = new ContentViewer();
	#options = new Options();

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: mainContentCSS,
			childs: [
				this.#repositorySelector.getHTML(),
				this.#options.getHTML(),
				this.#contentViewer.getHTML(),
			],
		});
		this.#options.hide();
	}

	selectRepository(repository: string, scrollIntoView: boolean) {
		this.#repositorySelector.selectRepository(repository, scrollIntoView);
	}

	selectFile(path: string, scrollIntoView: boolean) {
		this.#repositorySelector.selectFile(path, scrollIntoView);
	}

	setRepositoryList(repositoryList: Array<string>) {
		this.#repositorySelector.setRepositoryList(repositoryList);
	}

	setFileList(repository: string, fileList: Array<string>) {
		this.#repositorySelector.setFileList(repository, fileList);
	}

	viewFile(repository: string, path: string, hash: string, engine: GameEngine, file: File, userAction: boolean) {
		this.#contentViewer.viewFile(repository, path, hash, engine, file, userAction);
	}

	toogleOptions() {
		toggle(this.#options.getHTML());
	}
}
