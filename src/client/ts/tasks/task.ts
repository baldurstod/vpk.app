import { RepositoryEntry, RepositoryFilter } from 'harmony-3d';

export enum TaskResult {
	Error = 1,
	Ok = 2,
	Done = 3,
}

export type TaskAction = (repository: string, path: string, params?: any) => Promise<boolean>;
export type TaskParams = { root: RepositoryEntry, filter: RepositoryFilter };

export class Task {
	#action: TaskAction;
	#params: TaskParams;
	active = true;
	#result = false;
	#files: Set<RepositoryEntry>;

	constructor(action: TaskAction, params: TaskParams) {
		this.#action = action;
		this.#params = params;
		this.#files = params.root.getAllChilds(params.filter);
	}

	async process(): Promise<TaskResult> {
		const next = this.#getNextItem();
		if (!next) {
			return TaskResult.Done;
		}

		const path = next.getFullName();
		if (!path) {
			return TaskResult.Error;
		}

		return await this.#action(this.#params.root.getRepository().name, next.getFullName()) ? TaskResult.Ok : TaskResult.Error;
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
