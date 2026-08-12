import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import BottomNav from '@/components/BottomNav';
import HomeScreen from '@/screens/HomeScreen';
import BrowseHomeScreen from '@/screens/BrowseHomeScreen';
import BrowseNodeScreen from '@/screens/BrowseNodeScreen';
import NotesScreen from '@/screens/NotesScreen';
import TimerScreen from '@/screens/TimerScreen';
import AskAiScreen from '@/screens/AskAiScreen';
import ProgressScreen from '@/screens/ProgressScreen';
import type { HomeStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

/** Home plus the question-bank drill-down it pushes. */
function HomeNavigator() {
  const { colors } = useTheme();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: 16, fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen
        name="BrowseHome"
        component={BrowseHomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen name="BrowseNode" component={BrowseNodeScreen} />
    </HomeStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      // Must stay an element, not a bare function reference: React Navigation
      // invokes `tabBar` directly, so passing the component would call it
      // outside React and break its hooks.
      // eslint-disable-next-line react/no-unstable-nested-components
      tabBar={props => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Timer" component={TimerScreen} />
      <Tab.Screen name="AskAI" component={AskAiScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}
