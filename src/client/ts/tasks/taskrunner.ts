import { Task, TaskResult } from './task';

export class TaskRunner {
	static readonly #tasks: Task[] = [];
	static #running = true;
	static #processing = false;
	static #channel = new MessageChannel();

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

			const taskResult = await task.process();
			if (taskResult == TaskResult.Done) {
				this.#removeTask(task);
			}
		} finally {
			this.#processing = false;
			this.#channel.port2.postMessage(null);
		}
	}

	static #getFirstActiveTask(): Task | null {
		for (const task of this.#tasks) {
			if (task.active) {
				return task;
			}
		}

		return null;
	}

	static #removeTask(task: Task): void {
		const index = this.#tasks.indexOf(task);
		if (index != -1) {
			this.#tasks.splice(index, 1);
		}
	}

	static hasActiveTasks(): boolean {
		return this.#getFirstActiveTask() != null
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
