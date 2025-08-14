import { RepositoryEntry } from 'harmony-3d';
import { createElement, createShadowRoot } from 'harmony-ui';
import taskManagerCSS from '../../css/taskmanager.css';
import { exportToPng } from '../tasks/converttopng';
import { downloadFile } from '../tasks/downloadfile';
import { Task, TaskStatus } from '../tasks/task';
import { TaskEvent, TaskRunner, TaskRunnerEvents } from '../tasks/taskrunner';
import { SiteElement } from './siteelement';
import { concatMaterials, concatMaterialsBegin, concatMaterialsEnd } from '../tasks/concatmaterials';
import { decompileDynamicParam, decompileDynamicParamBegin, decompileDynamicParamEnd } from '../tasks/decompiledynamicparams';
export * as test from '../files/export';

export class TaskManager extends SiteElement {
	#root?: RepositoryEntry;
	#htmlRoot?: HTMLElement;
	#htmlRootCount?: HTMLElement;
	#htmlCompletedList?: HTMLElement;
	#htmlTaskList?: HTMLElement;
	#htmlTasks = new Map<Task, TaskView>();

	constructor() {
		super();
		TaskRunner.addEventListener(TaskRunnerEvents.TaskAdded, (event: Event) => this.#addTask((event as CustomEvent<TaskEvent>).detail.task));
		TaskRunner.addEventListener(TaskRunnerEvents.TaskRunning, (event: Event) => this.#updateTask((event as CustomEvent<TaskEvent>).detail.task));
		TaskRunner.addEventListener(TaskRunnerEvents.TaskRemoved, (event: Event) => this.#removeTask((event as CustomEvent<TaskEvent>).detail.task));
		TaskRunner.addEventListener(TaskRunnerEvents.TaskCompleted, (event: Event) => this.#updateTask((event as CustomEvent<TaskEvent>).detail.task));
	}

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		this.shadowRoot = createShadowRoot('div', {
			adoptStyle: taskManagerCSS,
			//parent: document.body,
			hidden: true,

			childs: [
				createElement('div', {
					childs: [
						createElement('span', { i18n: '#root', }),
						this.#htmlRoot = createElement('span'),
						this.#htmlRootCount = createElement('span'),
					]
				}),
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
				createElement('button', {
					i18n: 'merge materials',
					$click: () => {
						if (!this.#root) {
							return;
						}
						TaskRunner.addTask(new Task(concatMaterials, { root: this.#root, filter: { files: true, extension: 'vmt' } }, concatMaterialsBegin, concatMaterialsEnd));
					}
				}),
				createElement('button', {
					i18n: 'decompile dynamic params',
					$click: () => {
						if (!this.#root) {
							return;
						}
						TaskRunner.addTask(new Task(decompileDynamicParam, { root: this.#root, filter: { files: true, extension: 'vmat_c' } }, decompileDynamicParamBegin, decompileDynamicParamEnd));
					}
				}),
				this.#htmlTaskList = createElement('div', {
					class: 'tasks',
				}),
				this.#htmlCompletedList = createElement('div', {
					class: 'tasks',
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
		this.#htmlRoot!.innerText = root.getFullName();
		this.show();
	}

	#addTask(task: Task) {
		this.initHTML();
		const taskHtml = new TaskView(task);
		this.#htmlTasks.set(task, taskHtml);
		this.#htmlTaskList?.append(taskHtml.getHTML());
	}

	#updateTask(task: Task) {
		this.initHTML();
		const taskHtml = this.#htmlTasks.get(task);
		if (taskHtml) {
			taskHtml.refreshHTML();
			const html = taskHtml.getHTML();
			if (task.getStatus() != TaskStatus.Pending && html.parentElement == this.#htmlTaskList) {
				this.#htmlCompletedList!.append(html);
			}
		}
	}

	#removeTask(task: Task) {
		const taskHtml = this.#htmlTasks.get(task);
		if (taskHtml) {
			taskHtml.getHTML().remove();
		}
		this.#htmlTasks.delete(task);
	}
}

class TaskView extends SiteElement {
	#task: Task;
	#htmlCount?: HTMLElement;
	#htmlPath?: HTMLElement;

	constructor(task: Task) {
		super();
		this.#task = task;
	}

	initHTML() {
		if (this.shadowRoot) {
			return;
		}
		this.shadowRoot = createShadowRoot('div', {
			adoptStyle: taskManagerCSS,
			class: 'task',
			//parent: document.body,

			childs: [
				this.#htmlCount = createElement('span'),
				this.#htmlPath = createElement('span'),
			]
		});
	}

	refreshHTML(): void {
		this.initHTML();
		this.#htmlCount!.innerText = `${this.#task.initialCount - this.#task.getRemainingCount()} / ${this.#task.initialCount}`;
		this.#htmlPath!.innerText = this.#task.currentPath;
	}

}
