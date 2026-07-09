import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSwipeable } from "react-swipeable";
import { useQuestionBank } from "@/hooks/use-question-bank";
import SearchBar from "./question-bank/SearchBar";
import NoResultsMessage from "./question-bank/NoResultsMessage";
import QuestionBankContent from "./question-bank/QuestionBankContent";
import StudyMaterialsCard from "./question-bank/StudyMaterialsCard";
import ProgressDashboard from "./progress/ProgressDashboard";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AdService } from "@/lib/ad-service";

export interface QuestionType {
  name: string;
  questions: string[];
}

export interface SubTopicContent {
  name: string;
  subtopics: {
    [key: string]: QuestionType | { name: string; questions: any[] };
  };
}

export interface SubTopic {
  name: string;
  subtopics: {
    [key: string]: SubTopicContent | any;
  };
}

export interface Topic {
  name: string;
  subtopics: {
    [key: string]: SubTopic | any;
  };
}

export interface QuestionBankData {
  [key: string]: Topic;
}

type TabValue = "progress" | "materials" | "essay" | "short-notes";

const ORDER: TabValue[] = ["progress", "materials", "essay", "short-notes"];

const QuestionBank = () => {
  const {
    searchQuery,
    activeSearchQuery,
    activeTab,
    expandedItems,
    hasSearchResults,
    otherTabHasResults,
    isRendered,
    essayFilteredData,
    shortNotesFilteredData,
    hasContentToDisplay,
    setActiveTab,
    setExpandedItems,
    handleSearch,
  } = useQuestionBank();

  const { theme } = useTheme();

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      const i = ORDER.indexOf(activeTab as TabValue);
      if (i >= 0 && i < ORDER.length - 1) setActiveTab(ORDER[i + 1]);
    },
    onSwipedRight: () => {
      const i = ORDER.indexOf(activeTab as TabValue);
      if (i > 0) setActiveTab(ORDER[i - 1]);
    },
    trackMouse: true,
  });

  // Walkthrough can request a tab switch.
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab === "progress" || tab === "materials" || tab === "essay" || tab === "short-notes") {
        setActiveTab(tab as TabValue);
      }
    };
    window.addEventListener("orbit:set-tab", handler);
    return () => window.removeEventListener("orbit:set-tab", handler);
  }, [setActiveTab]);

  if (!isRendered) {
    return (
      <div className="bg-white dark:bg-black h-full min-h-[600px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const googleDriveLink =
    "https://drive.google.com/drive/folders/1FT6Tg6K4POa5jfet_twGk7iC3nH2yJdm";

  const getTabsListClass = () => {
    if (theme === "blackpink") {
      return "bg-black border border-[#FF5C8D]/30";
    }
    return "bg-gray-100 dark:bg-gray-950";
  };

  // Static per-theme gradient strings so Tailwind JIT picks them up.
  const topActiveGradient =
    theme === "blackpink"
      ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5C8D] data-[state=active]:via-pink-500 data-[state=active]:to-black"
      : theme === "light"
      ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:via-fuchsia-500 data-[state=active]:to-rose-400"
      : theme === "liquid-glass"
      ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:via-sky-500 data-[state=active]:to-indigo-500"
      : theme === "custom"
      ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-pink-500 data-[state=active]:to-orange-400"
      : "data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:via-pink-500 data-[state=active]:to-orange-400";

  const topTriggerClass =
    "text-base sm:text-lg font-semibold rounded-md transition-all " +
    "data-[state=active]:text-white data-[state=active]:shadow-lg " +
    topActiveGradient + " " +
    (theme === "blackpink" ? "text-[#FF5C8D]/70" : "text-gray-700 dark:text-gray-300");

  const isTopTab = activeTab === "progress" || activeTab === "materials";

  return (
    <div className="bg-white dark:bg-black h-full min-h-[600px]">
      <div className="flex-1 p-4 max-w-4xl mx-auto space-y-4" {...handlers}>
        <Tabs
          defaultValue="essay"
          value={activeTab}
          className="w-full"
          onValueChange={(value) => {
            const next = value as TabValue;
            setActiveTab(next);
            if (next === "progress" || next === "materials") {
              window.dispatchEvent(new CustomEvent("orbit:hide-pomodoro"));
            }
            if (next === "progress") {
              AdService.showRewarded(undefined, "progress");
            }
          }}
        >
          {/* Top row: Your Progress / Study Materials — single TabsList with gradient */}
          <TabsList
            data-tour="qbank-header"
            className={`w-full grid grid-cols-2 h-12 ${getTabsListClass()} rounded-lg mb-3 p-1`}
          >
            <TabsTrigger value="progress" data-tour="progress-tab" className={`progress-tab-button ${topTriggerClass}`}>
              Your Progress
            </TabsTrigger>
            <TabsTrigger value="materials" data-tour="study-materials-tab" className={`extras-tab-button ${topTriggerClass}`}>
              Study Materials
            </TabsTrigger>
          </TabsList>

          <TabsList
            className={`w-full grid grid-cols-2 h-12 ${getTabsListClass()} rounded-lg mb-4`}
          >
            <TabsTrigger
              value="essay"
              className={`text-lg font-medium ${
                theme === "blackpink"
                  ? "text-[#FF5C8D]/70 data-[state=active]:text-[#FF5C8D]"
                  : "text-gray-700 dark:text-gray-400 data-[state=active]:text-black dark:data-[state=active]:text-white"
              }`}
            >
              Essay
            </TabsTrigger>
            <TabsTrigger
              value="short-notes"
              className={`text-lg font-medium ${
                theme === "blackpink"
                  ? "text-[#FF5C8D]/70 data-[state=active]:text-[#FF5C8D]"
                  : "text-gray-700 dark:text-gray-400 data-[state=active]:text-black dark:data-[state=active]:text-white"
              }`}
            >
              Short notes
            </TabsTrigger>
          </TabsList>

          {!isTopTab && (
            <SearchBar searchQuery={searchQuery} handleSearch={handleSearch} />
          )}

          <ScrollArea className="h-[calc(100vh-12rem)] min-h-[500px]">
            {!hasSearchResults && activeSearchQuery.trim() !== "" && (
              otherTabHasResults ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    No {activeTab === "essay" ? "essays" : "short notes"} found for
                    <span className="font-medium"> "{activeSearchQuery}"</span>, but matches exist in {activeTab === "essay" ? "Short notes" : "Essay"}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "essay" ? "short-notes" : "essay")}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white text-sm font-medium shadow hover:opacity-90 transition"
                  >
                    Switch to {activeTab === "essay" ? "Short notes" : "Essay"}
                  </button>
                </div>
              ) : (
                <NoResultsMessage searchQuery={activeSearchQuery} />
              )
            )}

            <TabsContent
              value="progress"
              className="mt-0 min-h-[500px] bg-transparent"
            >
              <ProgressDashboard />
            </TabsContent>

            <TabsContent
              value="materials"
              className="mt-0 min-h-[500px] bg-transparent"
            >
              <StudyMaterialsCard driveLink={googleDriveLink} />
            </TabsContent>

            <TabsContent
              value="essay"
              className="mt-0 min-h-[500px] bg-transparent"
            >
              <QuestionBankContent
                activeTab="essay"
                hasContentToDisplay={hasContentToDisplay}
                filteredData={essayFilteredData}
                expandedItems={expandedItems}
                searchQuery={activeSearchQuery}
              />
            </TabsContent>

            <TabsContent
              value="short-notes"
              className="mt-0 min-h-[500px] bg-transparent"
            >
              <QuestionBankContent
                activeTab="short-notes"
                hasContentToDisplay={hasContentToDisplay}
                filteredData={shortNotesFilteredData}
                expandedItems={expandedItems}
                searchQuery={activeSearchQuery}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};

export default QuestionBank;
