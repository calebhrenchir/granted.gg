import SequenceCanvas from './sequence-canvas';

export default function OnlineOnlyCanvas() {
  return (
    <SequenceCanvas
      sequencePath="online-only"
      frameCount={316}
      fps={60}
      scale="scale-100"
      startFrame={10}
      imageFormat="webp"
    />
  );
}