import { RepositoryEntry } from 'harmony-3d';
import { createElement, createShadowRoot } from 'harmony-ui';
import repositorySelectorCSS from '../../css/repositoryselector.css';
import { exportToPng } from '../tasks/converttopng';
import { downloadFile } from '../tasks/downloadfile';
import { Task } from '../tasks/task';
import { TaskRunner } from '../tasks/taskrunner';
import { SiteElement } from './siteelement';
export * as test from '../files/export';

export class TaskManager extends SiteElement {
	#root?: RepositoryEntry;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		this.shadowRoot = createShadowRoot('div', {
			adoptStyle: repositorySelectorCSS,
			parent: document.body,

			childs: [
				createElement('button', {
					i18n: 'convert to png',
					$click: () => {
						if (!this.#root) {
							return;
						}

						TaskRunner.addTask(new Task(exportToPng, { root: this.#root, filter: { files: true } }));

					}
				}),
				createElement('button', {
					i18n: 'download file',
					$click: () => {
						if (!this.#root) {
							return;
						}

						TaskRunner.addTask(new Task(downloadFile, { root: this.#root, filter: { files: true } }));

					}
				}),
			]
		});
	}

	protected refreshHTML(): void {
		this.initHTML();
	}

	createTask(root: RepositoryEntry): void {
		this.initHTML();
		this.#root = root;

	}
}
