import { Repositories } from 'harmony-3d';
import { saveFile } from 'harmony-browser-utils';
import { Task, TaskDefinition } from './task';

const txtPerTask = new Map<number, string>();

export const concatMaterials: TaskDefinition = {
	executor: async (task: Task, repository: string, path: string, params?: any): Promise<boolean> => {
		const response = await Repositories.getFileAsText(repository, path);
		if (response.error) {
			return false;
		}

		let txt = response.text!;

		txt = txtPerTask.get(task.id) + path + '\n' + txt + '\n';

		txtPerTask.set(task.id, txt);
		/*
		if (OptionsManager.getItem('app.files.export.namingscheme') == 'name') {
			file = new File([file], file.name.split('/').pop() ?? file.name, { type: file.type });
		}

		saveFile(file);
		*/
		return true;
	},
	preExecution: async (task: Task, params?: any): Promise<boolean> => {
		txtPerTask.set(task.id, `Repository: ${task.getRepository()}\nRoot: ${task.getRoot()}\n\n`);
		return true;
	},
	postExecution: async (task: Task, params?: any): Promise<boolean> => {
		saveFile(new File([txtPerTask.get(task.id)!], 'materials.txt'));
		txtPerTask.delete(task.id)
		return true;
	},
}
