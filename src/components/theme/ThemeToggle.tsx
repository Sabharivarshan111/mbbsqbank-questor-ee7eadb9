
import { useState, useEffect } from "react";
import { Moon, Sun, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { FontSizeToggle } from "./FontSizeToggle";
import { CustomThemeDialog } from "./CustomThemeDialog";
import { CircleLabel } from "./CircleLabel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, customColors } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  // After mounting, we have access to the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Allow the walkthrough to open/close the Create-Your-Own-Theme dialog
  useEffect(() => {
    const open = () => setCustomOpen(true);
    const close = () => setCustomOpen(false);
    window.addEventListener('orbit:open-custom-theme', open);
    window.addEventListener('orbit:close-custom-theme', close);
    return () => {
      window.removeEventListener('orbit:open-custom-theme', open);
      window.removeEventListener('orbit:close-custom-theme', close);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  // Function to get the button class based on theme
  const getButtonClass = () => {
    switch (theme) {
      case "light":
        return "bg-white text-black border-gray-200 hover:bg-gray-100";
      case "dark":
        return "bg-gray-800 text-white border-gray-700 hover:bg-gray-700";
      case "blackpink":
        return "bg-black text-pink-500 border-pink-500/30 hover:bg-pink-950/30";
      case "liquid-glass":
        return "text-slate-700 border-white/60 bg-gradient-to-br from-white/80 via-sky-100/60 to-violet-100/60 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_16px_rgba(120,150,200,0.25)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_22px_rgba(120,150,200,0.35)]";
      case "custom":
        return "border-border hover:opacity-90";
      default:
        return "bg-white text-black border-gray-200 hover:bg-gray-100";
    }
  };

  const customButtonStyle =
    theme === "custom"
      ? { backgroundColor: customColors.card, color: customColors.foreground }
      : undefined;

  return (
    <div className="flex items-center gap-2">
      <span data-tour="font-size"><FontSizeToggle /></span>
      <span data-tour="theme-toggle">
      <CircleLabel text="THEMES">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full transition-all duration-200 ${getButtonClass()}`}
            style={customButtonStyle}
          >
            {theme === "dark" && <Moon className="h-4 w-4" />}
            {theme === "light" && <Sun className="h-4 w-4" />}
            {theme === "liquid-glass" && <Sparkles className="h-4 w-4" />}
            {theme === "custom" && (
              <span
                className="h-4 w-4 rounded-full border border-border"
                style={{
                  background: `linear-gradient(135deg, ${customColors.background}, ${customColors.primary})`,
                }}
              />
            )}
            {theme === "blackpink" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.0099 2.99C14.0399 -1.01 7.01992 -0.97 2.08992 3.08C-0.370078 5.3 -0.610078 9.14 1.58992 11.57L12.4399 22.42L23.2899 11.57C25.4999 9.14 25.2499 5.3 22.8199 3.08C22.8199 3.08 22.8299 3.08 22.8199 3.08C22.0299 2.36 21.0999 1.82 20.0999 1.49C19.7099 1.36 19.3599 1.7 19.4399 2.1C19.5799 2.79 19.6599 3.51 19.5599 4.3C19.1599 7.49 16.9899 10.05 13.9499 10.94C13.6999 11.01 13.4399 10.89 13.2999 10.66C13.1499 10.42 13.1599 10.12 13.3399 9.89C14.2099 8.8 14.6999 7.4 14.6999 5.91C14.6999 3.36 13.3099 1.09 11.2399 0H11.2599C10.7699 -0.1 10.3099 0.28 10.3399 0.79C10.5099 3.01 9.94992 5.64 7.32992 7.72C5.84992 8.86 4.38992 10.01 2.93992 11.17C2.69992 11.35 2.64992 11.7 2.81992 11.94C2.99992 12.2 3.33992 12.25 3.57992 12.06C4.97992 10.94 6.39992 9.83 7.81992 8.74C8.78992 9.48 9.56992 10.42 10.1099 11.5C10.1399 11.57 10.1399 11.64 10.1799 11.71C9.93992 12.33 9.37992 12.79 8.68992 12.86C8.15992 12.92 7.64992 12.66 7.40992 12.18C7.26992 11.91 6.93992 11.77 6.65992 11.89C6.35992 12.01 6.23992 12.38 6.39992 12.67C6.91992 13.55 7.84992 14.11 8.91992 14.06C8.96992 14.06 9.00992 14.05 9.06992 14.05C9.12992 14.04 9.18992 14.04 9.24992 14.02C9.91992 13.93 10.4999 13.58 10.9099 13.09L11.0599 13.36C11.1099 13.47 11.1499 13.57 11.1999 13.68C11.2499 13.79 11.2899 13.9 11.3399 14.01C11.3899 14.12 11.4299 14.23 11.4799 14.34C11.5299 14.45 11.5699 14.56 11.6299 14.66C11.5999 14.96 11.5099 15.25 11.3499 15.49C11.0799 15.88 10.6399 16.12 10.1699 16.08C9.86992 16.05 9.58992 16.27 9.58992 16.58C9.56992 16.88 9.80992 17.14 10.1099 17.14C10.8999 17.15 11.6299 16.74 12.0599 16.06C12.3599 16.04 12.6599 16.03 12.9599 16.04C13.0299 16.04 13.1099 16.05 13.1799 16.05C13.2499 16.05 13.3299 16.06 13.3999 16.07C13.4699 16.07 13.5399 16.08 13.6099 16.09C13.6799 16.09 13.7499 16.1 13.8299 16.11C13.8999 16.12 13.9699 16.13 14.0499 16.14C14.1199 16.15 14.1899 16.16 14.2599 16.18C14.3299 16.19 14.3999 16.21 14.4699 16.22C14.5399 16.24 14.6099 16.25 14.6799 16.27C14.7499 16.29 14.8199 16.31 14.8899 16.33C14.9599 16.35 15.0299 16.37 15.0899 16.39C15.1599 16.41 15.2199 16.44 15.2899 16.47C15.3599 16.49 15.4299 16.52 15.4899 16.55C15.5599 16.58 15.6199 16.61 15.6899 16.64C15.7499 16.67 15.8199 16.7 15.8799 16.73C15.9399 16.77 15.9999 16.8 16.0699 16.84C16.1299 16.88 16.1899 16.91 16.2499 16.95C16.3099 16.99 16.3599 17.03 16.4199 17.07C16.4799 17.11 16.5299 17.16 16.5899 17.21C16.6399 17.25 16.6999 17.3 16.7499 17.34C16.7999 17.39 16.8499 17.44 16.9099 17.49C16.9599 17.54 17.0099 17.59 17.0499 17.64C17.0999 17.7 17.1399 17.75 17.1799 17.81C17.2199 17.86 17.2699 17.92 17.3099 17.98C17.3499 18.04 17.3899 18.1 17.4199 18.15C17.4599 18.21 17.4999 18.28 17.5299 18.34C17.5699 18.4 17.5999 18.47 17.6299 18.53C17.6599 18.59 17.6899 18.66 17.7199 18.73C17.7499 18.79 17.7699 18.86 17.7999 18.93C17.8199 18.99 17.8499 19.06 17.8699 19.13C17.8899 19.2 17.9099 19.27 17.9299 19.34C17.9499 19.41 17.9599 19.48 17.9699 19.55C17.9899 19.62 17.9899 19.69 17.9999 19.76C18.0099 19.83 18.0199 19.9 18.0199 19.97C18.0199 20.04 18.0299 20.11 18.0299 20.18C18.0299 20.25 18.0299 20.32 18.0199 20.39C18.0199 20.46 18.0099 20.53 17.9999 20.6C17.9899 20.67 17.9799 20.74 17.9599 20.81C17.9499 20.88 17.9299 20.95 17.9099 21.02C17.8999 21.09 17.8699 21.15 17.8499 21.22C17.8299 21.29 17.7999 21.35 17.7799 21.42C17.7499 21.48 17.7299 21.55 17.6999 21.61C17.6699 21.67 17.6399 21.74 17.5999 21.8C17.5699 21.86 17.5299 21.92 17.4899 21.98C17.4599 22.04 17.4199 22.09 17.3799 22.15C17.3399 22.2 17.2899 22.26 17.2399 22.31C17.1999 22.36 17.1499 22.41 17.0999 22.45C17.0499 22.5 16.9899 22.54 16.9399 22.59C16.8899 22.63 16.8299 22.67 16.7699 22.71C16.7099 22.75 16.6499 22.79 16.5899 22.82C16.5299 22.86 16.4599 22.89 16.3999 22.91C16.3399 22.94 16.2699 22.97 16.1999 23C16.1299 23.03 16.0699 23.05 15.9999 23.07C15.9299 23.09 15.8599 23.11 15.7899 23.12C15.7199 23.14 15.6499 23.15 15.5799 23.16C15.5099 23.17 15.4399 23.18 15.3699 23.19C15.2999 23.19 15.2299 23.2 15.1599 23.2C15.0899 23.2 15.0199 23.2 14.9499 23.2C14.8799 23.2 14.8099 23.2 14.7399 23.19C14.6699 23.19 14.5999 23.18 14.5299 23.17C14.4599 23.16 14.3999 23.15 14.3299 23.14C14.2599 23.12 14.1999 23.11 14.1299 23.09C14.0699 23.07 14.0099 23.05 13.9499 23.03C13.8899 23.01 13.8299 22.99 13.7699 22.97C13.7099 22.94 13.6599 22.91 13.6099 22.88C13.5499 22.86 13.5099 22.83 13.4599 22.79C13.4099 22.76 13.3599 22.72 13.3099 22.68C13.2699 22.64 13.2199 22.6 13.1799 22.56C13.1399 22.52 13.0999 22.47 13.0599 22.43C13.0299 22.38 12.9899 22.34 12.9599 22.28C12.9299 22.23 12.9099 22.18 12.8899 22.13C12.8699 22.07 12.8499 22.02 12.8399 21.96C12.8299 21.9 12.8199 21.85 12.8099 21.79C12.8099 21.73 12.7999 21.67 12.7999 21.61C12.7999 21.55 12.7999 21.49 12.7999 21.43C12.7999 21.37 12.8099 21.31 12.8199 21.25C12.8299 21.19 12.8499 21.13 12.8799 21.08C12.8999 21.02 12.9299 20.96 12.9599 20.91C12.9999 20.85 13.0399 20.8 13.0799 20.75C13.1299 20.7 13.1799 20.65 13.2399 20.6C13.2699 20.58 13.2999 20.55 13.3399 20.52L13.3699 20.5L2.52992 9.66C1.88992 8.93 1.87992 7.8 2.48992 7.04C2.34992 8.71 3.59992 10.07 5.26992 10.02C5.97992 10 6.62992 9.7 7.12992 9.19L7.30992 9.01L7.64992 8.67L7.84992 8.47L8.18992 8.13L8.41992 7.9C8.98992 7.33 9.54992 6.77 10.1299 6.2C10.9399 5.4 11.0899 4.23 10.6099 3.26C11.9999 3.75 12.9699 5.08 12.9699 6.59C12.9699 7.04 12.8799 7.46 12.7199 7.85C12.6399 8.04 12.7699 8.26 12.9799 8.23C15.5599 7.86 17.6099 5.84 18.0199 3.26C18.1799 2.15 17.9599 1.11 17.5299 0.23C18.1199 1.04 18.5899 1.98 19.0099 2.99Z"
                  fill="#FF5C8D"
                />
              </svg>
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
            {theme === "dark" && <span className="ml-auto">Default</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setTheme("blackpink")}
          >
            <span className="text-[#FF5C8D] font-bold">BP</span>
            <span>Black Pink</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setTheme("liquid-glass")}
            style={{
              fontFamily: '-apple-system, "SF Pro Display", "SF Pro", BlinkMacSystemFont, "Helvetica Neue", sans-serif',
              fontWeight: 700,
            }}
          >
            <span className="relative inline-flex items-center justify-center h-4 w-4 rounded-full border border-white/70 bg-gradient-to-br from-white/90 via-sky-200/70 to-violet-200/70 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(120,150,200,0.35)]" />
            <span>Liquid Glass</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setTheme("custom")}
          >
            <span
              className="h-4 w-4 rounded-full border border-border"
              style={{ background: `linear-gradient(135deg, ${customColors.background}, ${customColors.primary})` }}
            />
            <span>My Theme</span>
            {theme === "custom" && <span className="ml-auto text-xs">Active</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCustomOpen(true)}
          >
            <Palette className="h-4 w-4" />
            <span>Create Your Own…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </CircleLabel>
      </span>
      <CustomThemeDialog open={customOpen} onOpenChange={setCustomOpen} />
    </div>
  );
}
