import { Map2 } from 'harmony-utils';

export class FileCache {
	#files = new Map2<string, string, File>();

	async setFile(repository: string, path: string, file: File) {
		this.#files.set(repository, path, file);
	}

	async getFile(repository: string, path: string): Promise<File | null> {
		return this.#files.get(repository, path) ?? null;
	}
}
