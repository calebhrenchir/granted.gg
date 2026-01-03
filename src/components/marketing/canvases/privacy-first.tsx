import SequenceCanvas from './sequence-canvas';

export default function PrivacyFirstCanvas() {
  return (
    <SequenceCanvas
      sequencePath="privacy-first"
      frameCount={325}
      fps={60}
      scale="scale-125"
      startFrame={10}
      imageFormat="webp"
    />
  );
}