
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSwipeable } from "react-swipeable";
import { useQuestionBank } from "@/hooks/use-question-bank";
import SearchBar from "./question-bank/SearchBar";
import NoResultsMessage from "./question-bank/NoResultsMessage";
import QuestionBankContent from "./question-bank/QuestionBankContent";
import ExtrasContent from "./question-bank/ExtrasContent";
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

const QuestionBank = () => {
  const {
    searchQuery,
    activeTab,
    expandedItems,
    hasSearchResults,
    isRendered,
    essayFilteredData,
    shortNotesFilteredData,
    hasContentToDisplay,
    setActiveTab,
    setExpandedItems,
    handleSearch
  } = useQuestionBank();
  
  const { theme } = useTheme();

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === "extras") {
        setActiveTab("essay");
      } else if (activeTab === "essay") {
        setActiveTab("short-notes");
      }
    },
    onSwipedRight: () => {
      if (activeTab === "short-notes") {
        setActiveTab("essay");
      } else if (activeTab === "essay") {
        setActiveTab("extras");
      }
    },
    trackMouse: true
  });

  if (!isRendered) {
    return (
      <div className="bg-white dark:bg-black h-full min-h-[600px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const googleDriveLink = "https://drive.google.com/drive/folders/1FT6Tg6K4POa5jfet_twGk7iC3nH2yJdm";

  const getExtraButtonClass = () => {
    if (theme === "blackpink") {
      return activeTab === "extras" 
        ? "bg-black text-[#FF5C8D] border-2 border-[#FF5C8D] shadow-[0_0_10px_rgba(255,92,141,0.5)] font-semibold" 
        : "bg-black text-[#FF5C8D]/70 border border-[#FF5C8D]/30 hover:border-[#FF5C8D]/50";
    }
    return activeTab === "extras" 
      ? "bg-blue-600 text-white" 
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";
  };

  const getTabsListClass = () => {
    if (theme === "blackpink") {
      return "bg-black border border-[#FF5C8D]/30";
    }
    return "bg-gray-100 dark:bg-gray-950";
  };

  return (
    <div className="bg-white dark:bg-black h-full min-h-[600px]">
      <div className="flex-1 p-4 max-w-4xl mx-auto space-y-4" {...handlers}>
        {/* Extras Tab as a separate section above the main tabs */}
        <div className="w-full mb-4">
          <button 
            onClick={() => setActiveTab("extras")}
            data-active={activeTab === "extras"}
            className={`extras-tab-button w-full py-3 text-lg font-medium rounded-lg ${getExtraButtonClass()} transition-colors`}
          >
            {theme === "blackpink" && activeTab === "extras" && (
              <span className="relative">
                MEDICOS ZONE study material
                <span className="absolute -bottom-1 left-1/4 right-1/4 h-0.5 bg-[#FF5C8D]"></span>
              </span>
            )}
            {!(theme === "blackpink" && activeTab === "extras") && "MEDICOS ZONE study material"}
          </button>
        </div>
        
        <Tabs 
          defaultValue="essay" 
          value={activeTab}
          className="w-full"
          onValueChange={(value) => setActiveTab(value as "extras" | "essay" | "short-notes")}
        >
          <TabsList className={`w-full grid grid-cols-2 h-12 ${getTabsListClass()} rounded-lg mb-4`}>
            <TabsTrigger 
              value="essay" 
              className={`text-lg font-medium ${theme === "blackpink" 
                ? "text-[#FF5C8D]/70 data-[state=active]:text-[#FF5C8D]" 
                : "text-gray-700 dark:text-gray-400 data-[state=active]:text-black dark:data-[state=active]:text-white"}`}
            >
              Essay
            </TabsTrigger>
            <TabsTrigger 
              value="short-notes"
              className={`text-lg font-medium ${theme === "blackpink" 
                ? "text-[#FF5C8D]/70 data-[state=active]:text-[#FF5C8D]" 
                : "text-gray-700 dark:text-gray-400 data-[state=active]:text-black dark:data-[state=active]:text-white"}`}
            >
              Short notes
            </TabsTrigger>
          </TabsList>

          {activeTab !== "extras" && (
            <SearchBar 
              searchQuery={searchQuery}
              handleSearch={handleSearch}
            />
          )}

          <ScrollArea className="h-[calc(100vh-12rem)] min-h-[500px]">
            {!hasSearchResults && searchQuery.trim() !== "" && (
              <NoResultsMessage searchQuery={searchQuery} />
            )}
            
            <TabsContent value="extras" className="mt-0 min-h-[500px] bg-transparent">
              <ExtrasContent driveLink={googleDriveLink} />
            </TabsContent>
            
            <TabsContent value="essay" className="mt-0 min-h-[500px] bg-transparent">
              <QuestionBankContent
                activeTab="essay"
                hasContentToDisplay={hasContentToDisplay}
                filteredData={essayFilteredData}
                expandedItems={expandedItems}
                searchQuery={searchQuery}
              />
            </TabsContent>

            <TabsContent value="short-notes" className="mt-0 min-h-[500px] bg-transparent">
              <QuestionBankContent
                activeTab="short-notes"
                hasContentToDisplay={hasContentToDisplay}
                filteredData={shortNotesFilteredData}
                expandedItems={expandedItems}
                searchQuery={searchQuery}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};

export default QuestionBank;
