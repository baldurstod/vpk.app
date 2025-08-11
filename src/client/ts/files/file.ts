export class GameFile {
	protected repository: string;
	protected path: string;

	constructor(repository: string, path: string) {
		this.repository = repository;
		this.path = path;
	}

	async exportToPng(): Promise<void> { }
}
