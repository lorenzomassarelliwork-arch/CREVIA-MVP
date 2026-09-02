import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Search: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ProjectDetail: { projectId: string };
  ApplyToProject: { projectId: string; roleId: string };
};
