import SequenceCanvas from './sequence-canvas';

export default function MoneyLoopCanvas() {
  return (
    <SequenceCanvas
      sequencePath="money-loop"
      frameCount={242}
      fps={60}
      scale="scale-125"
      startFrame={10}
      imageFormat="webp"
    />
  );
}