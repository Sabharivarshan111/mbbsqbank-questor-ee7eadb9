
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

  if (!isRendered) {
    return (
      <div className="bg-white dark:bg-black h-full min-h-[600px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const googleDriveLink =
    "https://drive.google.com/drive/folders/1FT6Tg6K4POa5jfet_twGk7iC3nH2yJdm";

  const getTopButtonClass = (value: TabValue) => {
    const active = activeTab === value;
    if (theme === "blackpink") {
      return active
        ? "bg-black text-[#FF5C8D] border-2 border-[#FF5C8D] shadow-[0_0_10px_rgba(255,92,141,0.5)] font-semibold"
        : "bg-black text-[#FF5C8D]/70 border border-[#FF5C8D]/30 hover:border-[#FF5C8D]/50";
    }
    return active
      ? "bg-blue-600 text-white"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";
  };

  const getTabsListClass = () => {
    if (theme === "blackpink") {
      return "bg-black border border-[#FF5C8D]/30";
    }
    return "bg-gray-100 dark:bg-gray-950";
  };

  const isTopTab = activeTab === "progress" || activeTab === "materials";

  return (
    <div className="bg-white dark:bg-black h-full min-h-[600px]">
      <div className="flex-1 p-4 max-w-4xl mx-auto space-y-4" {...handlers}>
        {/* Top row: Your Progress + Study Materials */}
        <div
          className="w-full mb-4 grid grid-cols-2 gap-3"
          data-tour="qbank-header"
        >
          <button
            onClick={() => setActiveTab("progress")}
            data-active={activeTab === "progress"}
            className={`w-full py-3 text-base sm:text-lg font-medium rounded-lg transition-colors ${getTopButtonClass(
              "progress"
            )}`}
          >
            Your Progress
          </button>
          <button
            onClick={() => setActiveTab("materials")}
            data-active={activeTab === "materials"}
            className={`extras-tab-button w-full py-3 text-base sm:text-lg font-medium rounded-lg transition-colors ${getTopButtonClass(
              "materials"
            )}`}
          >
            Study Materials
          </button>
        </div>

        <Tabs
          defaultValue="essay"
          value={activeTab}
          className="w-full"
          onValueChange={(value) => setActiveTab(value as TabValue)}
        >
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
              <NoResultsMessage searchQuery={activeSearchQuery} />
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
