import { createShadowRoot, toggle } from 'harmony-ui';
import mainContentCSS from '../../css/maincontent.css';
import { SiteElement } from './siteelement';
import { RepositorySelector } from './repositoryselector';
import { ContentViewer } from './contentviewer';
import { GameEngine } from '../enums';
import { Options } from './options';

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

	selectRepository(repository: string) {
		this.#repositorySelector.selectRepository(repository);
	}

	selectFile(path: string) {
		this.#repositorySelector.selectFile(path);
	}

	setRepositoryList(repositoryList: Array<string>) {
		this.#repositorySelector.setRepositoryList(repositoryList);
	}

	setFileList(repository: string, fileList: Array<string>) {
		this.#repositorySelector.setFileList(repository, fileList);
	}

	viewFile(repository: string, path: string, engine: GameEngine, file: File) {
		this.#contentViewer.viewFile(repository, path, engine, file);
	}

	toogleOptions() {
		toggle(this.#options.getHTML());
	}
}
