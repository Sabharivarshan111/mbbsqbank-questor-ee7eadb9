import type { NavigatorScreenParams } from '@react-navigation/native';
import type { YearKey } from '@/lib/questionBank';

export type HomeStackParamList = {
  HomeMain: undefined;
  BrowseHome: { year?: YearKey; focusSearch?: boolean } | undefined;
  /** `path` is a list of subtopic keys walked down from the year node. */
  BrowseNode: { year: YearKey; path: string[]; title: string };
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Notes: undefined;
  Timer: undefined;
  AskAI: { question?: string; nonce?: number } | undefined;
  Progress: undefined;
};
