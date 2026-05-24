import { useId } from "react";

interface CircleLabelProps {
  text: string;
  children: React.ReactNode;
}

export function CircleLabel({ text, children }: CircleLabelProps) {
  const id = useId().replace(/:/g, "");
  const pathId = `circle-label-${id}`;

  return (
    <div className="relative inline-flex items-center justify-center p-2.5">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 60 60"
        aria-hidden="true"
      >
        <defs>
          {/* Arc along the top of the circle */}
          <path
            id={pathId}
            d="M 7,30 A 23,23 0 0 1 53,30"
            fill="none"
          />
        </defs>
        <text
          className="fill-muted-foreground"
          style={{ fontSize: 6.5, letterSpacing: 1.2, fontWeight: 600 }}
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      </svg>
      {children}
    </div>
  );
}
