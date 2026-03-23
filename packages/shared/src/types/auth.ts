export type UUID = string;

export type RoleKey = 'owner' | 'admin' | 'editor' | 'viewer' | (string & {});

export interface User {
  id: UUID;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: UUID;
  slug: string;
  name: string;
  description?: string | null;
  createdById?: UUID | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: UUID;
  orgId: UUID;
  key: RoleKey;
  name: string;
  description?: string | null;
  permissions: Record<string, boolean>;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: UUID;
  orgId: UUID;
  userId: UUID;
  roleId: UUID;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  joinedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
