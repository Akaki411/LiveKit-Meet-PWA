import { Track } from 'livekit-client';
import type { AudioProcessorOptions, TrackProcessor } from 'livekit-client';

export interface MicGainProcessor
  extends TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  setGain(value: number): void;
  setNoiseSuppression(enabled: boolean): void;
}

export const createMicGainProcessor = (
  initialGain: number,
  initialNoiseSuppression: boolean,
): MicGainProcessor => {
  let sourceTrack: MediaStreamTrack | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let gainNode: GainNode | undefined;
  let dest: MediaStreamAudioDestinationNode | undefined;
  let gainValue = initialGain;
  let noiseSuppression = initialNoiseSuppression;

  const build = (opts: AudioProcessorOptions) => {
    sourceTrack = opts.track;
    sourceTrack.applyConstraints({ noiseSuppression }).catch(() => {});
    const ctx = opts.audioContext;
    source = ctx.createMediaStreamSource(new MediaStream([sourceTrack]));
    gainNode = ctx.createGain();
    gainNode.gain.value = gainValue;
    dest = ctx.createMediaStreamDestination();
    source.connect(gainNode);
    gainNode.connect(dest);
    processor.processedTrack = dest.stream.getAudioTracks()[0];
  };

  const teardown = () => {
    try {
      source?.disconnect();
      gainNode?.disconnect();
      dest?.disconnect();
    } catch {
    }
    source = undefined;
    gainNode = undefined;
    dest = undefined;
    sourceTrack = undefined;
  };

  const processor: MicGainProcessor = {
    name: 'mic-gain',
    init: async (opts) => {
      build(opts);
    },
    restart: async (opts) => {
      teardown();
      build(opts);
    },
    destroy: async () => {
      teardown();
      processor.processedTrack = undefined;
    },
    processedTrack: undefined,
    setGain: (value: number) => {
      gainValue = value;
      if (gainNode) gainNode.gain.value = value;
    },
    setNoiseSuppression: (enabled: boolean) => {
      noiseSuppression = enabled;
      sourceTrack?.applyConstraints({ noiseSuppression: enabled }).catch(() => {});
    },
  };
  return processor;
};
