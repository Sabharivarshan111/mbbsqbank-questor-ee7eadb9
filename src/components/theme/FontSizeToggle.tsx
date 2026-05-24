
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Type } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { CircleLabel } from "./CircleLabel";

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;
const DEFAULT_FONT_SIZE = 15;
const FONT_SIZE_STORAGE_KEY = "app-font-size";

export function FontSizeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    // Load saved font size from local storage on initial render
    const savedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (savedFontSize) {
      setFontSize(Number(savedFontSize));
      applyFontSize(Number(savedFontSize));
    } else {
      // If no saved font size, apply the default
      applyFontSize(DEFAULT_FONT_SIZE);
    }
  }, []);

  const applyFontSize = (size: number) => {
    document.documentElement.style.fontSize = `${size}px`;
    
    // Save to local storage
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, size.toString());
  };

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    applyFontSize(newSize);
  };

  const handlePresetClick = (size: number) => {
    setFontSize(size);
    applyFontSize(size);
    setIsOpen(false);
    
    toast({
      title: `Font size: ${size}px`,
      description: "Text size has been updated",
      duration: 2000,
    });
  };

  const buttonClass = theme === "blackpink" 
    ? "bg-black border border-[#FF5C8D] hover:bg-black/80 text-[#FF5C8D]" 
    : theme === "dark"
      ? "bg-gray-800/60 border border-gray-700/60 hover:bg-gray-700/60 text-white"
      : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-900";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className={`w-9 h-9 rounded-full ${buttonClass}`}
        >
          <Type className="h-4 w-4" />
          <span className="sr-only">Adjust font size</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`mt-2 w-64 p-4 ${theme === "blackpink" ? "bg-black border-[#FF5C8D]" : ""}`}>
        <div className={`mb-4 text-sm font-medium ${theme === "blackpink" ? "text-[#FF5C8D]" : ""}`}>
          Text Size: {fontSize}px
        </div>
        
        <Slider 
          value={[fontSize]} 
          min={MIN_FONT_SIZE} 
          max={MAX_FONT_SIZE} 
          step={1}
          onValueChange={handleFontSizeChange}
          className="mb-6"
        />
        
        <div className="grid grid-cols-3 gap-2">
          <DropdownMenuItem 
            onClick={() => handlePresetClick(12)}
            className={`flex justify-center ${theme === "blackpink" ? "text-[#FF5C8D] hover:bg-black/60" : ""}`}
          >
            Small
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetClick(15)}
            className={`flex justify-center ${theme === "blackpink" ? "text-[#FF5C8D] hover:bg-black/60" : ""}`}
          >
            Medium
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePresetClick(18)}
            className={`flex justify-center ${theme === "blackpink" ? "text-[#FF5C8D] hover:bg-black/60" : ""}`}
          >
            Large
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
