import type { NavigatorScreenParams } from '@react-navigation/native';
export type MainTabParamList={Home:undefined;Search:undefined;Create:undefined;Chat:undefined;Profile:undefined};
export type RootStackParamList={Login:undefined;Register:undefined;ForgotPassword:undefined;Main:NavigatorScreenParams<MainTabParamList>|undefined;ProjectDetail:{projectId:string};ApplyToProject:{projectId:string;roleId:string};ProjectApplications:{projectId:string};ProjectTeam:{projectId:string};CompleteProject:{projectId:string}};
