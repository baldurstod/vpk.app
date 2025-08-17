import { Repositories } from 'harmony-3d';
import { OptionsManager, saveFile } from 'harmony-browser-utils';
import { Task, TaskDefinition } from './task';

export const downloadFile: TaskDefinition = {
	executor: async (task: Task, repository: string, path: string, params?: any): Promise<boolean> => {

		const response = await Repositories.getFile(repository, path);
		if (response.error) {
			return false;
		}

		let file = response.file!;
		if (OptionsManager.getItem('app.files.export.namingscheme') == 'name') {
			file = new File([file], file.name.split('/').pop() ?? file.name, { type: file.type });
		}

		saveFile(file);
		return true;
	},
}
