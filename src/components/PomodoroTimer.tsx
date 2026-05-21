
import React, { useState, useEffect } from 'react';
import { Timer, X } from 'lucide-react';
import { usePomodoroTimer } from '@/hooks/use-pomodoro-timer';
import { TimerControls } from './pomodoro/TimerControls';
import { TimerDisplay } from './pomodoro/TimerDisplay';
import { TimerProgress } from './pomodoro/TimerProgress';
import { useTheme } from './theme/ThemeProvider';
import { Button } from './ui/button';

const PomodoroTimer = () => {
  const { theme: rawTheme } = useTheme();
  const theme: "dark" | "light" | "blackpink" = rawTheme === "custom" ? "dark" : rawTheme;
  const [isVisible, setIsVisible] = useState(true);
  const {
    minutes,
    seconds,
    isRunning,
    isEditing,
    inputValue,
    setInputValue,
    waterCount,
    progressPercentage,
    totalTime,
    inputRef,
    setWaterCount,
    toggleTimer,
    resetTimer,
    handleInputChange,
    handleSubmit,
    startEditing,
    handleKeyDown
  } = usePomodoroTimer();

  // Load visibility preference from localStorage on component mount
  useEffect(() => {
    const savedVisibility = localStorage.getItem('pomodoroVisible');
    if (savedVisibility !== null) {
      setIsVisible(savedVisibility === 'true');
    }
  }, []);

  // Save visibility preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pomodoroVisible', isVisible.toString());
  }, [isVisible]);

  const toggleVisibility = () => {
    setIsVisible(prev => !prev);
  };

  // Helper function for theme-based styling
  const getThemeStyles = () => {
    if (theme === "blackpink") {
      return {
        background: "bg-black border border-pink-500",
        text: "text-pink-400",
        button: "border-pink-500 text-pink-400 hover:bg-pink-500 hover:text-black",
        iconColor: "text-pink-400"
      };
    } else if (theme === "dark") {
      return {
        background: "bg-black border border-white",
        text: "text-white",
        button: "border-white text-white hover:bg-white hover:text-black",
        iconColor: "text-white"
      };
    } else {
      return {
        background: "bg-white border border-gray-300",
        text: "text-gray-900",
        button: "border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white",
        iconColor: "text-gray-900"
      };
    }
  };

  const styles = getThemeStyles();

  if (!isVisible) {
    return (
      <Button
        onClick={toggleVisibility}
        className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 rounded-full p-2 shadow-lg z-50 animate-fade-in ${styles.background} ${styles.text}`}
        size="icon"
        variant="outline"
        aria-label="Show Pomodoro Timer"
      >
        <Timer className={`w-5 h-5 ${styles.iconColor}`} />
      </Button>
    );
  }

  return (
    <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 ${styles.background} rounded-full px-8 py-3 shadow-lg min-w-[300px] z-50 animate-fade-in`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Timer className={`w-5 h-5 ${styles.iconColor}`} />
          
          <TimerDisplay 
            isEditing={isEditing}
            isRunning={isRunning}
            minutes={minutes}
            seconds={seconds}
            inputValue={inputValue}
            setInputValue={setInputValue}
            startEditing={startEditing}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            handleSubmit={handleSubmit}
            inputRef={inputRef}
            theme={theme}
          />

          <div className="flex items-center gap-2">
            <TimerControls 
              isRunning={isRunning}
              toggleTimer={toggleTimer}
              resetTimer={resetTimer}
              waterCount={waterCount}
              setWaterCount={setWaterCount}
              theme={theme}
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVisibility}
              className={`h-8 w-8 rounded-full ${styles.button}`}
              aria-label="Hide Pomodoro Timer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <TimerProgress 
          progressPercentage={progressPercentage}
          totalTime={totalTime}
          waterCount={waterCount}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default PomodoroTimer;
