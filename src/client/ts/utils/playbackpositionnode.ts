// playback position hack:
// https://github.com/WebAudio/web-audio-api/issues/2397#issuecomment-459514360

// composite audio node:
// https://github.com/GoogleChromeLabs/web-audio-samples/wiki/CompositeAudioNode

// extends the interface of AudioBufferSourceNode with a `playbackPosition` property
export class PlaybackPositionNode {
	#context: BaseAudioContext;
	#bufferSource: AudioBufferSourceNode;
	#splitter: ChannelSplitterNode;
	#out: ChannelMergerNode;
	#sampleHolder: Float32Array;
	#analyser: AnalyserNode;

	constructor(context: BaseAudioContext, options?: AudioBufferSourceOptions) {
		this.#context = context;

		// initialize component audio nodes
		this.#bufferSource = new AudioBufferSourceNode(context/*, options*/);
		this.#splitter = new ChannelSplitterNode(context);
		this.#out = new ChannelMergerNode(context);
		this.#analyser = new AnalyserNode(context);
		this.#sampleHolder = new Float32Array(1);

		if (options?.buffer) {
			this.buffer = options.buffer;
		}
	}

	// get current progress between 0 and 1
	get playbackPosition() {
		this.#analyser?.getFloatTimeDomainData(this.#sampleHolder);
		return this.#sampleHolder[0];
	}

	// creates an AudioBuffer with an extra `position` track
	set buffer(audioBuffer: AudioBuffer) {
		// create a new AudioBuffer of the same length as param with one extra channel
		// load it into the AudioBufferSourceNode
		this.#bufferSource.buffer = new AudioBuffer({
			length: audioBuffer.length,
			sampleRate: audioBuffer.sampleRate,
			numberOfChannels: audioBuffer.numberOfChannels + 1,
		});

		// copy data from the audioBuffer arg to our new AudioBuffer
		for (let index = 0; index < audioBuffer.numberOfChannels; index++) {
			this.#bufferSource.buffer.copyToChannel(
				audioBuffer.getChannelData(index),
				index,
			);
		}

		// fill up the position channel with numbers from 0 to 1
		const positionChannelData = this.#bufferSource.buffer.getChannelData(audioBuffer.numberOfChannels);
		for (let index = 0; index < audioBuffer.length; index++) {
			positionChannelData[index] = index / audioBuffer.length;
		}

		// split the channels
		this.#bufferSource.connect(this.#splitter);

		// connect all the audio channels to the line out
		for (let index = 0; index < audioBuffer.numberOfChannels; index++) {
			this.#splitter.connect(this.#out, index, index);
		}

		// connect the position channel to an analyzer so we can extract position data
		this.#splitter.connect(this.#analyser, audioBuffer.numberOfChannels);
	}

	// forward component node properties

	get loop() {
		return this.#bufferSource.loop;
	}

	set loop(val) {
		this.#bufferSource.loop = val;
	}

	get playbackRate() {
		return this.#bufferSource.playbackRate;
	}

	start(when?: number, offset?: number, duration?: number) {
		this.#bufferSource.start(when, offset, duration);
	}

	connect(destinationNode: AudioNode, output?: number, input?: number): AudioNode {
		this.#out.connect(destinationNode, output, input);
		return destinationNode;
	}
}
