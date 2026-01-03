import SequenceCanvas from './sequence-canvas';

export default function SellEverywhereCanvas() {
  return (
    <SequenceCanvas
      sequencePath="sell-everywhere"
      frameCount={371}
      fps={60}
      scale="scale-100"
      startFrame={10}
      imageFormat="webp"
    />
  );
}