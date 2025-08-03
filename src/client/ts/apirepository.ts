import { Repository, RepositoryArrayBufferResponse, RepositoryBlobResponse, RepositoryEntry, RepositoryError, RepositoryFileListResponse, RepositoryFileResponse, RepositoryFilter, RepositoryJsonResponse, RepositoryTextResponse } from 'harmony-3d';
import { getFile, getFileList } from './api';

export class ApiRepository implements Repository {
	#name: string;
	active: boolean = true;

	constructor(name: string) {
		this.#name = name;
	}

	get name() {
		return this.#name;
	}

	async getFile(filename: string): Promise<RepositoryFileResponse> {
		if (!this.active) {
			return { error: RepositoryError.RepoInactive };
		}
		const file = await getFile(this.#name, filename);
		if (!file) {
			return { error: RepositoryError.FileNotFound };
		}
		return { file: file };
	}

	async getFileAsArrayBuffer(filename: string): Promise<RepositoryArrayBufferResponse> {
		if (!this.active) {
			return { error: RepositoryError.RepoInactive };
		}
		const response = await this.getFile(filename);
		if (response.error) {
			return response;
		}

		return { buffer: await response.file!.arrayBuffer() };
	}

	async getFileAsText(filename: string): Promise<RepositoryTextResponse> {
		if (!this.active) {
			return { error: RepositoryError.RepoInactive };
		}
		const response = await this.getFile(filename);
		if (response.error) {
			return response;
		}

		return { text: await response.file!.text() };
	}

	async getFileAsBlob(filename: string): Promise<RepositoryBlobResponse> {
		if (!this.active) {
			return { error: RepositoryError.RepoInactive };
		}
		const response = await this.getFile(filename);
		if (response.error) {
			return response;
		}

		return { blob: response.file };
	}

	async getFileAsJson(filename: string): Promise<RepositoryJsonResponse> {
		if (!this.active) {
			return { error: RepositoryError.RepoInactive };
		}
		const response = await this.getFile(filename);
		if (response.error) {
			return response;
		}

		return { json: JSON.parse(await response.file!.text()) };
	}

	async getFileList(): Promise<RepositoryFileListResponse> {
		const files = await getFileList(this.#name);
		const root = new RepositoryEntry(this, '', true, 0);
		for (const filename of files) {
			root.addPath(filename);
		}
		return { root: root };
	}
}
