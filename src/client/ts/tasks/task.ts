import { RepositoryEntry, RepositoryFilter } from 'harmony-3d';

export enum TaskResult {
	Error = 1,
	Ok = 2,
	Done = 3,
}

export type TaskAction = (task: Task, repository: string, path: string, params?: any) => Promise<boolean>;
export type TaskInit = (task: Task) => Promise<boolean>;
export type TaskParams = { root: RepositoryEntry, filter: RepositoryFilter };

let taskId = 0;

export class Task {
	readonly id = ++taskId;
	#action: TaskAction;
	#params: TaskParams;
	#begin?: TaskInit;
	#end?: TaskInit;
	active = true;
	#result = false;
	#files: Set<RepositoryEntry>;
	#beginFired = false;
	#endFired = false;


	constructor(action: TaskAction, params: TaskParams, begin?: TaskInit, end?: TaskInit) {
		this.#action = action;
		this.#params = params;
		this.#begin = begin;
		this.#end = end;
		this.#files = params.root.getAllChilds(params.filter);
	}

	getRemainingCount():number {
		return this.#files.size;
	}

	async process(): Promise<TaskResult> {
		this.#runBegin();
		const next = this.#getNextItem();
		if (!next) {
			this.#runEnd();
			return TaskResult.Done;
		}

		const path = next.getFullName();
		if (!path) {
			return TaskResult.Error;
		}

		return await this.#action(this, this.#params.root.getRepository().name, next.getFullName()) ? TaskResult.Ok : TaskResult.Error;
	}

	async #runBegin(): Promise<boolean> {
		if (!this.#beginFired) {
			this.#beginFired = true;
			return await this.#begin?.(this) ?? true;
		}
		return true;
	}

	async #runEnd(): Promise<boolean> {
		if (!this.#endFired) {
			this.#endFired = true;
			return await this.#end?.(this) ?? true;
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
}
