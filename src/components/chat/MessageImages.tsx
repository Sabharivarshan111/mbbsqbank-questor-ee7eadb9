import { motion } from "framer-motion";

export interface MessageImage {
  term: string;
  imageUrl: string;
  caption?: string;
  sourceUrl?: string;
}

interface MessageImagesProps {
  images: MessageImage[];
}

export const MessageImages = ({ images }: MessageImagesProps) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="mt-3 -mx-1">
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-1 scrollbar-thin">
        {images.map((img, i) => (
          <motion.a
            key={`${img.term}-${i}`}
            href={img.sourceUrl || img.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
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
              <p className="text-[10px] text-gray-500 mt-1">Source: Wikipedia</p>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
};
