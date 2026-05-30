
import React, { useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface TimerDisplayProps {
  isEditing: boolean;
  isRunning: boolean;
  minutes: number;
  seconds: number;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  startEditing: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  theme: "dark" | "light" | "blackpink" | "liquid-glass";
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  isEditing,
  isRunning,
  minutes,
  seconds,
  inputValue,
  setInputValue,
  startEditing,
  handleInputChange,
  handleKeyDown,
  handleSubmit,
  inputRef,
  theme
}) => {
  // Get theme-specific styles
  const getThemeStyles = () => {
    if (theme === "blackpink") {
      return {
        text: "text-pink-400",
        input: "text-pink-400 border-pink-500 focus:ring-2 focus:ring-pink-500 bg-black",
        button: "text-pink-400 border-pink-500 hover:bg-pink-500 hover:text-black"
      };
    } else if (theme === "dark") {
      return {
        text: "text-white",
        input: "text-white border-white focus:ring-2 focus:ring-white bg-transparent",
        button: "text-white border-white hover:bg-white hover:text-black"
      };
    } else {
      return {
        text: "text-gray-900",
        input: "text-gray-900 border-gray-900 focus:ring-2 focus:ring-gray-900 bg-transparent",
        button: "text-gray-900 border-gray-900 hover:bg-gray-900 hover:text-white"
      };
    }
  };

  const styles = getThemeStyles();

  return (
    <>
      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
            className={`w-16 h-8 text-center ${styles.input}`}
            maxLength={2}
            aria-label="Set minutes"
          />
          <Button 
            type="submit"
            variant="outline" 
            size="sm"
            className={`h-8 ${styles.button} rounded-full`}
          >
            Set
          </Button>
        </form>
      ) : (
        <div 
          className={`text-2xl font-mono ${styles.text} cursor-pointer`}
          onClick={startEditing}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      )}
    </>
  );
};
