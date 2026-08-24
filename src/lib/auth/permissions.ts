export type UserRole = 'admin' | 'editor' | 'writer' | 'contributor';

export const permissions = {
  admin: {
    canCreateUser: true,
    canDeleteUser: true,
    canEditUser: true,
    canViewUsers: true,
    canManageRoles: true,
    canPublish: true,
    canDeleteArticle: true,
    canEditArticle: true,
    canManageMedia: true,
    canManageCategories: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  editor: {
    canCreateUser: false,
    canDeleteUser: false,
    canEditUser: false,
    canViewUsers: false,
    canManageRoles: false,
    canPublish: true,
    canDeleteArticle: true,
    canEditArticle: true,
    canManageMedia: true,
    canManageCategories: true,
    canViewAnalytics: true,
    canManageSettings: false,
  },
  writer: {
    canCreateUser: false,
    canDeleteUser: false,
    canEditUser: false,
    canViewUsers: false,
    canManageRoles: false,
    canPublish: false,
    canDeleteArticle: false,
    canEditArticle: true,
    canManageMedia: false,
    canManageCategories: false,
    canViewAnalytics: false,
    canManageSettings: false,
  },
  contributor: {
    canCreateUser: false,
    canDeleteUser: false,
    canEditUser: false,
    canViewUsers: false,
    canManageRoles: false,
    canPublish: false,
    canDeleteArticle: false,
    canEditArticle: false,
    canManageMedia: false,
    canManageCategories: false,
    canViewAnalytics: false,
    canManageSettings: false,
  },
};

export function hasPermission(
  userRole: UserRole,
  permission: keyof typeof permissions.admin
): boolean {
  return permissions[userRole]?.[permission] || false;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    editor: 'Editor',
    writer: 'Writer',
    contributor: 'Contributor',
  };
  return labels[role] || role;
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-red-500 text-white',
    editor: 'bg-blue-500 text-white',
    writer: 'bg-green-500 text-white',
    contributor: 'bg-yellow-500 text-white',
  };
  return colors[role] || 'bg-gray-500 text-white';
}
