import { DitheringShader } from "@/components/ui/dithering-shader";

export default function DemoOne() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <DitheringShader 
              shape="swirl"
              type="4x4"
              colorBack="#220011"
              colorFront="#00ffff"
              pxSize={4}
              speed={0.9}
            />
      <span className="pointer-events-none z-10 text-center text-7xl leading-none absolute font-semibold text-white tracking-tighter whitespace-pre-wrap">
        Swirl
      </span>
    </div>
  )
}
