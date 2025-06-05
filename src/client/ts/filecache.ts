import { Map2 } from 'harmony-utils';

export class FileCache {
	#files = new Map2<string, string, File>();

	async setFile(vpkPath: string, path: string, file: File) {
		this.#files.set(vpkPath, path, file);
	}

	async getFile(vpkPath: string, path: string): Promise<File | null> {
		return this.#files.get(vpkPath, path) ?? null;
	}
}

/*
export class FileCache {
	#files = new Map<string, Map<string, File>>();

	async setFile(vpkPath: string, path: string, file: File) {
		if (!this.#files.has(vpkPath)) {
			this.#files.set(vpkPath, new Map<string, File>());
		}

		this.#files.get(vpkPath)?.set(path, file);
	}

	async getFile(vpkPath: string, path: string): Promise<File | null> {
		if (!this.#files.has(vpkPath)) {
			return null;
		}

		return this.#files.get(vpkPath)?.get(path) ?? null;
	}

}
*/
