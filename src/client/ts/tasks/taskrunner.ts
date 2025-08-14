import { Task, TaskResult } from './task';

export enum TaskRunnerEvents {
	TaskAdded = 'taskadded',
	TaskRunning = 'taskruning',
	TaskCompleted = 'taskcompleted',
	TaskRemoved = 'taskremoved',
}

export type TaskEvent = {
	task: Task;
}

export class TaskRunner {
	static readonly #tasks: Task[] = [];
	static #running = true;
	static #processing = false;
	static #channel = new MessageChannel();
	static #eventTarget = new EventTarget();

	static {
		this.#channel.port1.onmessage = () => this.#process();
		this.#channel.port2.postMessage(null);
	}

	static addTask(task: Task): void {
		const remaining = task.getRemainingCount();
		if (remaining > 100/*TODO: create a variable*/) {
			if (!confirm(`This task will be executed on ${remaining} files. Proceed ?`)) {
				return;
			}
		}

		activateBeforeUnload();
		this.#dispatchEvent(TaskRunnerEvents.TaskAdded, { task: task });
		this.#tasks.push(task);
		this.#channel.port2.postMessage(null);
	}

	static run(): void {
		this.#running = true;
		this.#process();
	}

	static pause(): void {
		this.#running = false;
	}

	static stop(): void {
	}

	static async #process(): Promise<void> {
		if (!this.#running || this.#processing) {
			return;
		}

		const task = this.#getFirstActiveTask();
		if (!task) {
			deactivateBeforeUnload();
			return;
		}

		try {
			this.#processing = true;
			this.#dispatchEvent(TaskRunnerEvents.TaskRunning, { task: task });
			const taskResult = await task.process();
			if (taskResult == TaskResult.Done) {
				this.#taskCompleted(task);
			}
		} finally {
			this.#processing = false;
			this.#channel.port2.postMessage(null);
		}
	}

	static #getFirstActiveTask(): Task | null {
		for (const task of this.#tasks) {
			if (task.isActive()) {
				return task;
			}
		}

		return null;
	}

	static #taskCompleted(task: Task): void {
		this.#dispatchEvent(TaskRunnerEvents.TaskCompleted, { task: task });
		const index = this.#tasks.indexOf(task);
		if (index != -1) {
			this.#tasks.splice(index, 1);
		}
	}

	static hasActiveTasks(): boolean {
		return this.#getFirstActiveTask() != null
	}

	static addEventListener(type: TaskRunnerEvents, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
		this.#eventTarget.addEventListener(type, callback, options);
	}

	static #dispatchEvent(type: TaskRunnerEvents, detail: TaskEvent): boolean {
		return this.#eventTarget.dispatchEvent(new CustomEvent<typeof detail>(type, { detail: detail }));
	}
}

function beforeUnloadListener(event: BeforeUnloadEvent) {
	if (TaskRunner.hasActiveTasks()) {
		event.preventDefault();
	}
};

let activated = false;
function activateBeforeUnload() {
	if (!activated) {
		window.addEventListener('beforeunload', beforeUnloadListener);
		activated = true;
	}
}
function deactivateBeforeUnload() {
	window.removeEventListener('beforeunload', beforeUnloadListener);
	activated = false;
}
