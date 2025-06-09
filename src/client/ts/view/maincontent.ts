import { createShadowRoot } from 'harmony-ui';
import mainContentCSS from '../../css/maincontent.css';
import { SiteElement } from './siteelement';
import { VpkSelector } from './vpkselector';
import { ContentViewer } from './contentviewer';
import { GameEngine } from '../enums';

export class MainContent extends SiteElement {
	#vpkSelector = new VpkSelector();
	#contentViewer = new ContentViewer();

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: mainContentCSS,
			childs: [
				this.#vpkSelector.getHTML(),
				this.#contentViewer.getHTML(),
			],
		});
	}

	selectVpk(vpkPath: string) {
		this.#vpkSelector.selectVpk(vpkPath);
	}

	selectFile(path: string) {
		this.#vpkSelector.selectFile(path);
	}

	setVpkList(vpkList: Array<string>) {
		this.#vpkSelector.setVpkList(vpkList);
	}

	setFileList(vpkPath: string, fileList: Array<string>) {
		this.#vpkSelector.setFileList(vpkPath, fileList);
	}

	viewFile(vpkPath: string, path: string, engine: GameEngine, file: File) {
		this.#contentViewer.viewFile(vpkPath, path, engine, file);
	}
}
