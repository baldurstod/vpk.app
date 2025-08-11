import { Source1TextureManager } from 'harmony-3d';
import { saveFile } from 'harmony-browser-utils';
import { createElement } from 'harmony-ui';
import { GameEngine } from '../enums';
import { GameFile } from './file';
import { registerFileExtension } from './files';

export class VtfFile extends GameFile {

	async exportToPng(): Promise<void> {
		const vtf = await Source1TextureManager.getVtf(this.repository, this.path);
		if (!vtf) {
			return;
		}

		const imageData = await vtf.getImageData();
		if (!imageData) {
			return;
		}

		const canvas = createElement('canvas', { width: imageData.width, height: imageData.height }) as HTMLCanvasElement;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		canvas.width = imageData.width;
		canvas.height = imageData.height;
		ctx.putImageData(imageData, 0, 0);

		canvas.toBlob(blob => {
			if (!blob) {
				return;
			}
			saveFile(new File([blob], `${this.path}.png`));
		});
	}
}

registerFileExtension(GameEngine.Source1, 'vtf', VtfFile);
