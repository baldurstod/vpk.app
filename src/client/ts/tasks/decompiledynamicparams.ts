import { Source2MaterialManager } from 'harmony-3d';
import { saveFile } from 'harmony-browser-utils';
import { startupRenderer } from '../graphics';
import { Task, TaskDefinition } from './task';

const txtPerTask = new Map<number, string>();
const txt2PerTask = new Map<number, string>();

export const decompileDynamicParam: TaskDefinition = {
	executor: async (task: Task, repository: string, path: string, params?: any): Promise<boolean> => {
		console.info('doing', path);
		const material = await Source2MaterialManager.getMaterial(repository, path);
		if (material) {
			const params = material.getDynamicParams();
			if (params && params.size > 0) {
				let txt = '';
				let txt2 = '';
				//console.error(path, params);
				for (const param of params) {
					if (param[1][0] == null) {
						const message = `unable to decompile param, bytecode: ${param[1][1]}`;
						txt += `${param[0]}: <${message}>\n`
						txt2 += `${message}}\n\n`
					} else {
						txt += `${param[0]}: <${param[1][0]}>\n`
						txt2 += `${param[1][0]}\n\n`
					}
				}

				txt = txtPerTask.get(task.id) + path + '\n' + txt + '\n';
				txtPerTask.set(task.id, txt);
				txt2 = txt2PerTask.get(task.id) + txt2 + '\n';
				txt2PerTask.set(task.id, txt2);
			}
		}

		return true;
	},
	preExecution: async (task: Task, params?: any): Promise<boolean> => {
		await startupRenderer();
		txtPerTask.set(task.id, `Repository: ${task.getRepository()}\nRoot: ${task.getRoot()}\n\n`);
		txt2PerTask.set(task.id, `Repository: ${task.getRepository()}\nRoot: ${task.getRoot()}\n\n`);
		return true;
	},
	postExecution: async (task: Task, params?: any): Promise<boolean> => {
		saveFile(new File([txtPerTask.get(task.id)!], 'decompiled_expressionsmaterials.txt'));
		saveFile(new File([txt2PerTask.get(task.id)!], 'decompiled2_expressionsmaterials.txt'));
		txtPerTask.delete(task.id)
		txt2PerTask.delete(task.id)
		return true;
	},
}
