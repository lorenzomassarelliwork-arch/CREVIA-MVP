import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Create: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Notifications: undefined;
  ChatRoom: { conversationId: string };
  AddProjectRole: { projectId: string };
  LeaveProject: { projectId: string };
  ExperienceExclusion: { exclusionId: string };
  ManageProjectAdmins: { projectId: string };
  ProjectDetail: { projectId: string };
  ApplyToProject: { projectId: string; roleId: string };
  ProjectApplications: { projectId: string };
  ProjectTeam: { projectId: string };
  CompleteProject: { projectId: string };
  EditProfile: undefined;
  PublicProfile: { userId: string };
  ReportContent: { targetType: 'user' | 'project' | 'message'; targetId: string };
  ModerationQueue: undefined;
  ModerationDetail: { kind: 'content_report' | 'experience_exclusion'; id: string };
};
