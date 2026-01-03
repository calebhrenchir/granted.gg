import SequenceCanvas from './sequence-canvas';

export default function CashOutCanvas() {
  return (
    <SequenceCanvas
      sequencePath="cash-out"
      frameCount={178}
      fps={60}
      scale="scale-125"
      startFrame={10}
      imageFormat="webp"
    />
  );
}