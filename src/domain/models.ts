export type UserId = string;
export type ProjectId = string;
export type ProjectRoleId = string;
export type ApplicationId = string;

export type ProjectType = 'community' | 'startup' | 'university' | 'non_profit';
export type ProjectLocationMode = 'remote' | 'onsite' | 'hybrid';
export type CompensationType = 'unpaid' | 'expense_reimbursement' | 'prize' | 'paid_to_agree';
export type ProjectStatus = 'recruiting' | 'active' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type MemberStatus = 'active' | 'completed' | 'left' | 'removed';
export type ExperienceVerificationStatus = 'pending' | 'verified' | 'disputed';

export interface UserProfile {
  id: UserId;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  city?: string | null;
  bio?: string | null;
  headline?: string | null;
  skills: string[];
  availability?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: ProjectId;
  ownerId: UserId;
  title: string;
  description: string;
  goal: string;
  category: string;
  coverUrl?: string | null;
  type: ProjectType;
  locationMode: ProjectLocationMode;
  city?: string | null;
  expectedDuration?: string | null;
  weeklyCommitmentHours?: number | null;
  compensationType: CompensationType;
  compensationNotes?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRole {
  id: ProjectRoleId;
  projectId: ProjectId;
  title: string;
  description: string;
  requiredSkills: string[];
  seats: number;
  createdAt: string;
}

export interface Application {
  id: ApplicationId;
  projectId: ProjectId;
  roleId: ProjectRoleId;
  applicantId: UserId;
  motivation: string;
  portfolioUrl?: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: ProjectId;
  userId: UserId;
  roleId: ProjectRoleId;
  status: MemberStatus;
  joinedAt: string;
  completedAt?: string | null;
}

export interface VerifiedExperience {
  id: string;
  projectId: ProjectId;
  userId: UserId;
  roleTitle: string;
  skills: string[];
  startedAt: string;
  completedAt: string;
  verificationStatus: ExperienceVerificationStatus;
}
