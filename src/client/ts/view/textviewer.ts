import { loadScripts } from 'harmony-browser-utils';
import { createElement, createShadowRoot, hide, show } from 'harmony-ui';
import textViewerCSS from '../../css/textviewer.css';
import { SiteElement } from './siteelement';

type Token = { start: number, value: string, row?: number };
export type TextViewerRange = {
	startRow: number;
	startCol: number;
	endRow?: number;
	endCol?: number;
}

export class TextViewer extends SiteElement {
	#htmlText?: HTMLElement;
	#aceEditor?: any;
	#aceEditorResolve!: () => void;
	#aceEditorReady = new Promise((resolve: (value: void) => void) => this.#aceEditorResolve = resolve);
	#marker = -1;
	#isOpen = false;
	#uuid?: Token;
	#anchors?: Map<string, TextViewerRange>;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: textViewerCSS,
			childs: [
				this.#htmlText = createElement('div', {
					class: 'editor',
				}),
			]
		});

		(async () => {
			await loadScripts(['./js/ace-builds/src-min/ace.js']);
			this.#aceEditor = (globalThis as any).ace.edit(this.#htmlText);
			this.#aceEditor.setTheme('ace/theme/monokai');
			//this.#aceEditor.session.setMode("ace/mode/javascript");
			this.#aceEditor.renderer.attachToShadowRoot();
			this.#aceEditorResolve();
			this.#initEditorEvents();
		})();
	}

	#initEditorEvents() {
		this.#aceEditor.renderer.content.addEventListener('mousemove', (event: MouseEvent) => this.#onMouseMove(event));
		this.#aceEditor.renderer.content.addEventListener('click', (event: MouseEvent) => this.#onClick(event));
	}

	#onMouseMove(event: MouseEvent): void {
		const canvasPos = this.#aceEditor.renderer.scroller.getBoundingClientRect();
		const offset = (event.clientX + this.#aceEditor.renderer.scrollLeft - canvasPos.left - this.#aceEditor.renderer.$padding) / this.#aceEditor.renderer.characterWidth;
		const row = Math.floor((event.clientY + this.#aceEditor.renderer.scrollTop - canvasPos.top) / this.#aceEditor.renderer.lineHeight);
		const col = Math.round(offset);

		const screenPos = { row: row, column: col, side: offset - col > 0 ? 1 : -1 };
		const session = this.#aceEditor.session;
		const docPos = session.screenToDocumentPosition(screenPos.row, screenPos.column);

		const selectionRange = this.#aceEditor.selection.getRange();
		if (!selectionRange.isEmpty()) {
			if (selectionRange.start.row <= row && selectionRange.end.row >= row) {
				console.info('clear');
			}
			//return this.clear();
		}
		const token = this.#findUuid(docPos.row, docPos.column);

		this.#uuid = token;
		if (!token) {
			return this.#clear();
		}
		this.#isOpen = true
		this.#aceEditor.renderer.setCursorStyle("pointer");

		session.removeMarker(this.#marker);

		const range = new (globalThis as any).ace.Range(token.row, token.start, token.row, token.start + token.value.length);
		this.#marker = session.addMarker(range, "ace_link_marker", "text", true);
	}

	#onClick(event: MouseEvent) {
		if (!this.#uuid || !this.#anchors) {
			return;
		}

		const range = this.#anchors.get(this.#uuid.value);
		console.info(this.#anchors.get(this.#uuid.value));

		this.#aceEditor.gotoLine(range?.startRow, 0);

	}

	#clear() {
		if (this.#isOpen) {
			this.#aceEditor.session.removeMarker(this.#marker);
			this.#aceEditor.renderer.setCursorStyle("");
			this.#isOpen = false;
		}
	};

	#getMatchAround(regExp: RegExp, string: string, col: number) {
		let match: undefined | Token;
		regExp.lastIndex = 0;
		string.replace(regExp, (str: string, ...args: any[]): string => {
			const offset = args[args.length - 2] as number;
			const length = str.length;
			if (offset <= col && offset + length >= col) {

				match = {
					start: offset,
					value: str
				};
			}
			return '';
		});

		return match;
	};

	#findUuid(row: number, column: number) {
		const editor = this.#aceEditor;
		const session = editor.session;
		const line = session.getLine(row);

		// example 946f0e0f-6b2b-4cd3-9117-8f5468f20936
		const match = this.#getMatchAround(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, line, column);
		if (!match) {
			return;
		}

		match.row = row;
		return match;
	};


	protected refreshHTML(): void {
		this.initHTML();
	}

	async setText(text: string, anchors?: Map<string, TextViewerRange>) {
		this.show();
		//this.#htmlText!.innerText = text;
		this.#anchors = anchors;

		await this.#aceEditorReady;
		this.#aceEditor.setValue(text);
	}

	async gotoLine(line: number, column?: number): Promise<void> {
		await this.#aceEditorReady;
		this.#aceEditor.resize(true);
		this.#aceEditor.gotoLine(line, column);

		const range = new (globalThis as any).ace.Range(1000, 1, 1000, 20);
		const marker = this.#aceEditor.getSession().addMarker(range, "ace_selected_word", "text");
	}

	show() {
		this.initHTML();
		show(this.#htmlText);
	}

	hide() {
		hide(this.#htmlText);
	}
}
