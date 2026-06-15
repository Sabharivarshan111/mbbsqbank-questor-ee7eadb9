import { motion } from "framer-motion";

export interface MessageImage {
  term: string;
  imageUrl: string;
  caption?: string;
  sourceUrl?: string;
  source?: "wikipedia" | "commons" | "openverse";
}

interface MessageImagesProps {
  images: MessageImage[];
}

const sourceLabel = (img: MessageImage) => {
  switch (img.source) {
    case "wikipedia":
      return "Source: Wikipedia";
    case "commons":
      return "Source: Wikimedia Commons";
    case "openverse":
      return "Source: Openverse";
    default:
      return "Source: Wikipedia / Commons / Openverse";
  }
};


export const MessageImages = ({ images }: MessageImagesProps) => {
  if (!images || images.length === 0) return null;

  // Single-image layout: render larger, full-width — used for generated diagrams.
  if (images.length === 1) {
    const img = images[0];
    const Wrapper: any = img.sourceUrl ? motion.a : motion.div;
    const wrapperProps = img.sourceUrl
      ? { href: img.sourceUrl, target: "_blank", rel: "noopener noreferrer" }
      : {};
    return (
      <div className="mt-3">
        <Wrapper
          {...wrapperProps}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="block rounded-lg overflow-hidden bg-gray-800/60 border border-white/10 hover:border-white/30 transition-colors"
        >
          <div className="w-full bg-gray-900 overflow-hidden flex items-center justify-center">
            <img
              src={img.imageUrl}
              alt={img.caption || img.term}
              loading="lazy"
              className="w-full max-h-80 object-contain"
              onError={(e) => {
                (e.currentTarget.parentElement?.parentElement as HTMLElement)?.style.setProperty('display', 'none');
              }}
            />
          </div>
          <div className="p-2">
            <p className="text-xs font-medium text-gray-100 capitalize leading-tight">
              {img.term}
            </p>
            {img.caption && (
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                {img.caption}
              </p>
            )}
            <p className="text-[10px] text-gray-500 mt-1">{sourceLabel(img)}</p>
          </div>
        </Wrapper>
      </div>
    );
  }

  return (
    <div className="mt-3 -mx-1">
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-1 scrollbar-thin">
        {images.map((img, i) => {
          const Wrapper: any = img.sourceUrl ? motion.a : motion.div;
          const wrapperProps = img.sourceUrl
            ? { href: img.sourceUrl, target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <Wrapper
              key={`${img.term}-${i}`}
              {...wrapperProps}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="snap-start shrink-0 w-44 rounded-lg overflow-hidden bg-gray-800/60 border border-white/10 hover:border-white/30 transition-colors"
            >
              <div className="w-full aspect-[4/3] bg-gray-900 overflow-hidden">
                <img
                  src={img.imageUrl}
                  alt={img.caption || img.term}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget.parentElement?.parentElement as HTMLElement)?.style.setProperty('display', 'none');
                  }}
                />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-100 capitalize leading-tight line-clamp-1">
                  {img.term}
                </p>
                {img.caption && (
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-snug">
                    {img.caption}
                  </p>
                )}
                <p className="text-[10px] text-gray-500 mt-1">{sourceLabel(img)}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
};
