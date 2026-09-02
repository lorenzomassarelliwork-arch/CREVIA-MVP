import type {
  Application,
  ApplicationId,
  Project,
  ProjectId,
  ProjectMember,
  ProjectRole,
  UserId,
  UserProfile,
  VerifiedExperience,
} from './models';

export interface AuthRepository {
  signIn(email: string, password: string): Promise<UserId>;
  signUp(email: string, password: string): Promise<UserId>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  getCurrentUserId(): Promise<UserId | null>;
}

export interface ProfileRepository {
  getById(userId: UserId): Promise<UserProfile | null>;
  update(profile: UserProfile): Promise<UserProfile>;
}

export interface ProjectRepository {
  list(): Promise<Project[]>;
  getById(projectId: ProjectId): Promise<Project | null>;
  create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  update(project: Project): Promise<Project>;
  listRoles(projectId: ProjectId): Promise<ProjectRole[]>;
}

export interface ApplicationRepository {
  create(application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<Application>;
  listForProject(projectId: ProjectId): Promise<Application[]>;
  accept(applicationId: ApplicationId): Promise<ProjectMember>;
  reject(applicationId: ApplicationId): Promise<void>;
}

export interface ExperienceRepository {
  listForUser(userId: UserId): Promise<VerifiedExperience[]>;
  confirmProjectCompletion(projectId: ProjectId, userId: UserId): Promise<VerifiedExperience>;
}
