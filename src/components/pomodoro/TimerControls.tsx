
import React from 'react';
import { Pause, Play, RotateCcw, Droplets } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

interface TimerControlsProps {
  isRunning: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  waterCount: number;
  setWaterCount: React.Dispatch<React.SetStateAction<number>>;
  theme: "dark" | "light" | "blackpink" | "liquid-glass";
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  toggleTimer,
  resetTimer,
  waterCount,
  setWaterCount,
  theme
}) => {
  const { toast } = useToast();

  const drinkWater = () => {
    setWaterCount(prev => prev + 1);
    toast({
      title: "Water break!",
      description: `You've had ${waterCount + 1} glasses of water today. Stay hydrated!`,
    });
  };

  // Helper function to get theme-specific button styles
  const getButtonStyles = () => {
    if (theme === "blackpink") {
      return {
        normal: "border-[#FF5C8D] text-[#FF5C8D] hover:bg-[#FF5C8D]/20 focus:bg-[#FF5C8D]/20 active:bg-[#FF5C8D]/20",
        water: "border-[#FF5C8D] bg-[#FF5C8D]/20 text-[#FF5C8D] hover:bg-[#FF5C8D]/30 focus:bg-[#FF5C8D]/30 active:bg-[#FF5C8D]/30"
      };
    } else if (theme === "dark") {
      return {
        normal: "border-white text-white hover:bg-white hover:text-black",
        water: "border-blue-500 bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white"
      };
    } else {
      return {
        normal: "border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white",
        water: "border-blue-500 bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white"
      };
    }
  };

  const styles = getButtonStyles();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        data-tour="pomodoro-start"
        onClick={(e) => {
          e.stopPropagation();
          toggleTimer();
        }}
        className={`h-8 w-8 rounded-full ${styles.normal}`}
        aria-label={isRunning ? "Pause timer" : "Start timer"}
      >
        {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          resetTimer();
        }}
        className={`h-8 w-8 rounded-full ${styles.normal}`}
        aria-label="Reset timer"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          drinkWater();
        }}
        className={`h-8 w-8 rounded-full ${styles.water}`}
        aria-label="Track water intake"
      >
        <Droplets className="h-4 w-4" />
      </Button>
    </div>
  );
};
