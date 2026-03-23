import { Composition } from "remotion";
import { AgentHandsDemo } from "./AgentHandsDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AgentHandsDemo"
        component={AgentHandsDemo}
        durationInFrames={30 * 130} // ~130 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
