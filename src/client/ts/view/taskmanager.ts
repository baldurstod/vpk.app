import { RepositoryEntry } from 'harmony-3d';
import { createElement, createShadowRoot, updateElement } from 'harmony-ui';
import taskManagerCSS from '../../css/taskmanager.css';
import { concatVmts, } from '../tasks/concatvmts';
import { exportToPng } from '../tasks/converttopng';
import { decompileDynamicParam, } from '../tasks/decompiledynamicparams';
import { downloadFile } from '../tasks/downloadfile';
import { Task, TaskStatus } from '../tasks/task';
import { TaskEvent, TaskRunner, TaskRunnerEvents } from '../tasks/taskrunner';
import { SiteElement } from './siteelement';
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
					class: 'title',
					childs: [
						createElement('label', {
							childs: [
								createElement('span', { i18n: '#root', }),
								this.#htmlRoot = createElement('span'),
								this.#htmlRootCount = createElement('span', {
									i18n: {
										innerText: '#file_count',
										values: {
											count: 0,
										},
									}
								}),
							],
						}),
					],
				}),
				createElement('button', {
					i18n: '#export_to_png',
					$click: () => {
						if (!this.#root) {
							return;
						}
						TaskRunner.addTask(new Task(exportToPng, this.#root, { files: true }));
					}
				}),
				createElement('button', {
					i18n: '#download_file',
					$click: () => {
						if (!this.#root) {
							return;
						}
						TaskRunner.addTask(new Task(downloadFile, this.#root, { files: true }));
					}
				}),
				createElement('button', {
					i18n: '#concat_vmts',
					$click: () => {
						if (!this.#root) {
							return;
						}
						TaskRunner.addTask(new Task(concatVmts, this.#root, { files: true, extension: 'vmt' }));
					}
				}),
				createElement('button', {
					i18n: '#decompile_dynamic_params',
					$click: () => {
						if (!this.#root) {
							return;
						}
						TaskRunner.addTask(new Task(decompileDynamicParam, this.#root, { files: true, extension: 'vmat_c' }));
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
		updateElement(this.#htmlRootCount, {
			i18n: {
				innerText: '#file_count',
				values: {
					count: root.getAllChilds().size,
				},
			},
		});
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
