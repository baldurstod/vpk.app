import { RepositoryEntry, RepositoryFilter } from 'harmony-3d';

export enum TaskStatus {
	Pending,
	Completed,
	Failed,
	Stopped,
}

export enum TaskResult {
	Error = 1,
	Ok = 2,
	Done = 3,
}

export type TaskExecutor = (task: Task, repository: string, path: string, params: any) => Promise<boolean>;
export type TaskInit = (task: Task, params: any) => Promise<boolean>;
//export type TaskParams = { root: RepositoryEntry, filter: RepositoryFilter };

let taskId = 0;

export type TaskDefinition = {
	executor: TaskExecutor,
	preExecution?: TaskInit,
	postExecution?: TaskInit,
}

export class Task {
	readonly id = ++taskId;
	#definition: TaskDefinition;
	//#action: TaskExecutor;
	#root: RepositoryEntry;
	#filter: RepositoryFilter;
	#params: any;
	//#begin?: TaskInit;
	//#end?: TaskInit;
	paused = false;
	#result = false;
	#files: Set<RepositoryEntry>;
	#beginFired = false;
	#endFired = false;
	readonly initialCount: number;
	currentPath: string = '';
	#status: TaskStatus = TaskStatus.Pending;

	constructor(definition: TaskDefinition, root: RepositoryEntry, filter: RepositoryFilter, params?: any) {
		this.#definition = definition;
		this.#root = root;
		this.#filter = filter;
		this.#params = params;
		this.#files = root.getAllChilds(filter);
		this.initialCount = this.#files.size;
	}

	getRemainingCount(): number {
		return this.#files.size;
	}

	getRepository(): string {
		return this.#root.getRepository().name;
	}

	getRoot(): string {
		return this.#root.getFullName();
	}

	getFilter(): RepositoryFilter {
		return this.#filter;
	}

	async process(): Promise<TaskResult> {
		this.#runBegin();
		const next = this.#getNextItem();
		if (!next) {
			this.#runEnd();
			this.#status = TaskStatus.Completed;
			return TaskResult.Done;
		}

		const path = next.getFullName();
		if (!path) {
			this.#status = TaskStatus.Failed;
			return TaskResult.Error;
		}
		this.currentPath = path;

		return await this.#definition.executor(this, this.#root.getRepository().name, next.getFullName(), this.#params) ? TaskResult.Ok : TaskResult.Error;
	}

	async #runBegin(): Promise<boolean> {
		if (!this.#beginFired) {
			this.#beginFired = true;
			return await this.#definition.preExecution?.(this, this.#params) ?? true;
		}
		return true;
	}

	async #runEnd(): Promise<boolean> {
		if (!this.#endFired) {
			this.#endFired = true;
			return await this.#definition.postExecution?.(this, this.#params) ?? true;
		}
		return true;
	}

	#getNextItem(): RepositoryEntry | null {
		const first = this.#files.values().next();
		if (first.done) {
			return null;
		}

		this.#files.delete(first.value);
		return first.value;
	}

	getStatus(): TaskStatus {
		return this.#status;
	}

	isActive(): boolean {
		return this.#status == TaskStatus.Pending && !this.paused;
	}
}
