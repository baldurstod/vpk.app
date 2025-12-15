import { EditSession } from 'ace-builds';
import { loadScripts } from 'harmony-browser-utils';
import { downloadSVG } from 'harmony-svg';
import { createElement, createShadowRoot } from 'harmony-ui';
import textViewerCSS from '../../css/textviewer.css';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { SiteElement } from './siteelement';

type Token = { start: number, value: string, row?: number };
export type TextViewerRange = {
	startRow: number;
	startCol: number;
	endRow?: number;
	endCol?: number;
}

type EditSessionAttributes = {
	anchors?: Map<string, TextViewerRange>;
	repository: string;
	path: string;
}

export class TextViewer extends SiteElement {
	#htmlText?: HTMLElement;
	#aceEditor?: any;
	#aceEditorResolve!: () => void;
	#aceEditorReady = new Promise((resolve: (value: void) => void) => this.#aceEditorResolve = resolve);
	#marker = -1;
	#isOpen = false;
	#uuid?: Token;
	//#anchors = new Map<EditSession, Map<string, TextViewerRange>>;
	#htmlToolbar?: HTMLElement;
	#repository: string = '';
	#path: string = '';
	#currentSession: EditSession | null = null;
	#sessions = new Map<EditSession, EditSessionAttributes>;

	initHTML() {
		if (this.shadowRoot) {
			return;
		}

		this.shadowRoot = createShadowRoot('section', {
			adoptStyle: textViewerCSS,
			childs: [
				this.#htmlToolbar = createElement('div', {
					class: 'toolbar',
					childs: [
						createElement('span', {
							i18n: { title: '#download_file' },
							innerHTML: downloadSVG,
							$click: () => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.DownloadFile, { detail: { repository: this.#repository, path: this.#path } }))
						}),
					],
				}),
				this.#htmlText = createElement('div', {
					class: 'editor',
				}),
			]
		});

		(async () => {
			await loadScripts(['./js/ace-builds/src-min/ace.js']);
			this.#aceEditor = (globalThis as any).ace.edit(this.#htmlText);
			this.#aceEditor.setTheme('ace/theme/monokai');
			//this.#aceEditor.session.setMode('ace/mode/javascript');
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
			/*
			if (selectionRange.start.row <= row && selectionRange.end.row >= row) {
				console.info('clear');
			}
				*/
			//return this.clear();
		}
		const token = this.#findUuid(docPos.row, docPos.column);

		this.#uuid = token;
		if (!token) {
			return this.#clear();
		}
		this.#isOpen = true
		this.#aceEditor.renderer.setCursorStyle('pointer');

		session.removeMarker(this.#marker);

		const range = new (globalThis as any).ace.Range(token.row, token.start, token.row, token.start + token.value.length);
		this.#marker = session.addMarker(range, 'ace_link_marker', 'text', true);
	}

	#onClick(event: MouseEvent) {
		if (!this.#uuid) {
			return;
		}
		this.#selectToken(this.#uuid.value);
	}

	#selectToken(token: string) {
		const anchors = this.#sessions.get(this.#currentSession!)?.anchors;
		if (!anchors) {
			return;
		}

		const textRange = anchors.get(token);
		console.info(anchors.get(token));

		this.#aceEditor.resize(true);
		this.#aceEditor.gotoLine(textRange?.startRow, 0);

		if (textRange) {
			this.#aceEditor.session.removeMarker(this.#marker);
			const range = new (globalThis as any).ace.Range(textRange?.startRow, textRange?.startCol, textRange?.startRow, 1000);
			this.#marker = this.#aceEditor.session.addMarker(range, 'ace_link_marker', 'text', true);
		}
	}

	#clear() {
		if (this.#isOpen) {
			this.#aceEditor.session.removeMarker(this.#marker);
			this.#aceEditor.renderer.setCursorStyle('');
			this.#isOpen = false;
		}
	};

	#getMatchAround(regExp: RegExp, line: string, col: number) {
		let match: undefined | Token;
		regExp.lastIndex = 0;
		line.replace(regExp, (str: string, ...args: any[]): string => {
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

	#findUuid(row: number, column: number): Token | undefined {
		const editor = this.#aceEditor;
		const session = editor.session;
		const line: string = session.getLine(row);

		if (line.includes('"id" "elementid"')) {
			return;
		}

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

	/*
	async setText(repository: string, path: string, text: string, anchors?: Map<string, TextViewerRange>) {
		this.#repository = repository;
		this.#path = path;
		this.show();
		//this.#htmlText!.innerText = text;
		//this.#anchors = anchors;

		await this.#aceEditorReady;
		this.#aceEditor.setValue(text);
	}
	*/

	async select(hash: string): Promise<void> {
		const line = Number(hash);
		if (Number.isNaN(line)) {
			this.#selectToken(hash);
		} else {
			await this.#aceEditorReady;
			this.#aceEditor.resize(true);
			this.#aceEditor.gotoLine(line);
		}

		const range = new (globalThis as any).ace.Range(1000, 1, 1000, 20);
		const marker = this.#aceEditor.getSession().addMarker(range, 'ace_selected_word', 'text');
	}

	async addSession(repository: string, path: string, anchors?: Map<string, TextViewerRange>): Promise<EditSession> {
		await this.#aceEditorReady;
		const attributes = {
			anchors,
			repository,
			path,
		}

		const session = new (globalThis as any).ace.EditSession('');
		this.#sessions.set(session, attributes);

		return session;
	}

	async setSession(session: EditSession): Promise<void> {
		await this.#aceEditorReady;
		this.#currentSession = session;
		this.#aceEditor.setSession(session);

		const attributes = this.#sessions.get(session);
		if (attributes) {
			this.#repository = attributes.repository;
			this.#path = attributes.path;
		}
	}
}
