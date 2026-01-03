import SequenceCanvas from './sequence-canvas';

export default function SellAnythingCanvas() {
  return (
    <SequenceCanvas
      sequencePath="sell-anything"
      frameCount={250}
      fps={60}
      scale="scale-125"
      startFrame={10}
      imageFormat="webp"
    />
  );
}