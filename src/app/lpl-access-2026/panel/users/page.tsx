'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  UserCog,
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'writer' | 'contributor';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login?: string;
  articles_count?: number;
  avatar_url?: string;
  bio?: string;
  role_title?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

const roleColors = {
  admin: 'bg-red-500',
  editor: 'bg-blue-500',
  writer: 'bg-green-500',
  contributor: 'bg-yellow-500',
};

const roleLabels = {
  admin: '👑 Administrateur',
  editor: '📝 Éditeur',
  writer: '✍️ Rédacteur',
  contributor: '📄 Contributeur',
};

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  suspended: 'Suspendu',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState({
    name: '',
    status: 'active',
    bio: '',
    role_title: '',
    twitter: '',
    linkedin: '',
    website: '',
    avatar_url: '',
  });
  const [uploadingEditAvatar, setUploadingEditAvatar] = useState(false);
  const [uploadingNewUserAvatar, setUploadingNewUserAvatar] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'contributor',
    // Author profile fields - shown on the public /author/[id] page, so
    // an admin can seed these right away instead of leaving a new
    // author's public byline blank until they log in and fill it in
    // themselves (they can still edit these on first login).
    bio: '',
    role_title: '',
    twitter: '',
    linkedin: '',
    website: '',
    avatar_url: '',
  });
  const [newRole, setNewRole] = useState('contributor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching users from API...');
      // Was a Date.now() cache-busting query param - works, but only by
      // accident (a unique URL every call). Using cache:'no-store'
      // directly says what's actually meant, same as everywhere else
      // this pass touched.
      const response = await fetch('/api/users', { cache: 'no-store' });
      const data = await response.json();

      console.log('📊 Full API Response:', data);
      console.log('📊 Users array:', data.users);
      console.log('📊 Users count:', data.users?.length);

      if (response.ok && data.users) {
        console.log('✅ Setting users:', data.users);
        setUsers(data.users);
      } else {
        throw new Error(data.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      toast({
        title: 'Erreur',
        description: 'Échec du chargement des utilisateurs.',
        variant: 'destructive',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users?id=${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      toast({
        title: 'Utilisateur supprimé',
        description: `${selectedUser.name} a été supprimé.`,
      });
      await loadUsers();
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Échec de la suppression de l\'utilisateur.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      toast({
        title: 'Rôle mis à jour',
        description: `${selectedUser.name} est maintenant ${roleLabels[newRole as keyof typeof roleLabels] || newRole}.`,
      });
      await loadUsers();
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Échec de la mise à jour du rôle.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full profile edit for an EXISTING user - previously the only actions
  // available from this page's row menu were "Changer le rôle" and
  // "Supprimer"; there was no way for an admin to fix a typo in someone's
  // name, update their bio/avatar, or reactivate a suspended account
  // without going through Supabase directly. PUT /api/users/[id] already
  // supported all of this (see updateUser() in user-service.ts) - it just
  // had no UI wired to it.
  const handleEditUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }
      toast({
        title: 'Utilisateur mis à jour',
        description: `${editUser.name} a été mis à jour avec succès.`,
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Échec de la mise à jour de l\'utilisateur.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real Storage upload (via /api/media/upload, type: 'avatar') instead
  // of the base64-data-URI-in-the-DB-column pattern the "create user"
  // dialog below still uses for its own avatar field.
  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingEditAvatar(true);
    try {
      const body = new FormData();
      body.append('files', file);
      body.append('type', 'avatar');
      const res = await fetch('/api/media/upload', { method: 'POST', body });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.media?.[0]?.url) {
        throw new Error(result.error || "Échec du téléversement de l'image.");
      }
      setEditUser((prev) => ({ ...prev, avatar_url: result.media[0].url }));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de téléverser cette image.",
        variant: 'destructive',
      });
    } finally {
      setUploadingEditAvatar(false);
    }
  };

  const handleCreateUser = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast({
        title: 'Utilisateur créé',
        description: `${newUser.name} a été ajouté. Il/elle devra changer son mot de passe et confirmer son profil lors de sa première connexion.`,
      });
      setIsCreateDialogOpen(false);
      setNewUser({ email: '', name: '', password: '', role: 'contributor', bio: '', role_title: '', twitter: '', linkedin: '', website: '', avatar_url: '' });
      await loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Échec de la création de l\'utilisateur.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Same fix as handleEditAvatarUpload above (real Storage upload via
  // /api/media/upload instead of embedding a base64 data: URI directly
  // in the avatar_url column) - this was the one remaining spot still
  // using the old pattern, per that function's comment.
  const handleNewUserAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingNewUserAvatar(true);
    try {
      const body = new FormData();
      body.append('files', file);
      body.append('type', 'avatar');
      const res = await fetch('/api/media/upload', { method: 'POST', body });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.media?.[0]?.url) {
        throw new Error(result.error || "Échec du téléversement de l'image.");
      }
      setNewUser((prev) => ({ ...prev, avatar_url: result.media[0].url }));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de téléverser cette image.",
        variant: 'destructive',
      });
    } finally {
      setUploadingNewUserAvatar(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(search.toLowerCase()) ||
                         user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  console.log('🔄 Rendering users page:', {
    totalUsers: users.length,
    filteredUsers: filteredUsers.length,
    roleFilter,
    search,
    users: users.map(u => ({ name: u.name, role: u.role }))
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les utilisateurs, les rôles et les permissions</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Stats - NOW WITH 5 CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        {/* Total Users */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total des utilisateurs</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        {/* Admins */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Administrateurs</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>

        {/* Editors */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Éditeurs</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'editor').length}</p>
              </div>
              <UserCog className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>

        {/* Writers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rédacteurs</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'writer').length}</p>
              </div>
              <UserMinus className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>

        {/* ✅ NEW: Contributors */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contributeurs</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'contributor').length}</p>
              </div>
              <Users className="h-8 w-8 text-yellow-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher des utilisateurs..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="editor">Éditeur</SelectItem>
                  <SelectItem value="writer">Rédacteur</SelectItem>
                  <SelectItem value="contributor">Contributeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredUsers.length} utilisateurs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur trouvé. Créez votre premier utilisateur !
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="font-semibold text-primary">
                            {user.name?.substring(0, 2).toUpperCase() || '??'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        user.status === 'active' ? 'bg-green-500' :
                        user.status === 'inactive' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }>
                        {statusLabels[user.status] || 'Actif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {timeAgo(user.created_at)}
                    </TableCell>
                    <TableCell>{user.articles_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setEditUser({
                              name: user.name || '',
                              status: user.status || 'active',
                              bio: user.bio || '',
                              role_title: user.role_title || '',
                              twitter: user.twitter || '',
                              linkedin: user.linkedin || '',
                              website: user.website || '',
                              avatar_url: user.avatar_url || '',
                            });
                            setIsEditDialogOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setIsRoleDialogOpen(true);
                            setNewRole(user.role);
                          }}>
                            <Shield className="mr-2 h-4 w-4" />
                            Changer le rôle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;utilisateur</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr(e) de vouloir supprimer <strong>{selectedUser?.name}</strong> ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog - lets an admin modify an existing user's own
          info (name, status, author-profile fields, avatar), separate
          from the narrower "Changer le rôle" dialog. */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                  <AvatarImage src={editUser.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {editUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="edit-user-avatar-upload"
                  className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-white cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {uploadingEditAvatar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                </label>
                <input
                  id="edit-user-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingEditAvatar}
                  onChange={handleEditAvatarUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground flex-1">
                Cliquez sur l&apos;icône pour changer sa photo de profil (JPG, PNG, WebP - 5 Mo max).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Nom complet</label>
              <Input
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Statut du compte</label>
              <Select
                value={editUser.status}
                onValueChange={(value) => setEditUser({ ...editUser, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Profil d&apos;auteur (affiché sur sa page d&apos;auteur publique)
              </p>
              <div>
                <label className="text-sm font-medium">Titre / fonction</label>
                <Input
                  placeholder="Ex. Journaliste sportif"
                  value={editUser.role_title}
                  onChange={(e) => setEditUser({ ...editUser, role_title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Biographie</label>
                <Input
                  placeholder="Courte biographie de l'auteur..."
                  value={editUser.bio}
                  onChange={(e) => setEditUser({ ...editUser, bio: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Twitter / X</label>
                  <Input
                    placeholder="nom d'utilisateur"
                    value={editUser.twitter}
                    onChange={(e) => setEditUser({ ...editUser, twitter: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">LinkedIn</label>
                  <Input
                    placeholder="nom d'utilisateur"
                    value={editUser.linkedin}
                    onChange={(e) => setEditUser({ ...editUser, linkedin: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Site web</label>
                <Input
                  placeholder="https://example.com"
                  value={editUser.website}
                  onChange={(e) => setEditUser({ ...editUser, website: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditUser} disabled={isSubmitting || uploadingEditAvatar}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
          </DialogHeader>
          <p>Changer le rôle de <strong>{selectedUser?.name}</strong></p>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">👑 Administrateur</SelectItem>
              <SelectItem value="editor">📝 Éditeur</SelectItem>
              <SelectItem value="writer">✍️ Rédacteur</SelectItem>
              <SelectItem value="contributor">📄 Contributeur</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleRoleChange} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mettre à jour le rôle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom complet</label>
              <Input
                placeholder="John Doe"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe temporaire</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ils devront le modifier lors de leur première connexion.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Rôle</label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributor">📄 Contributeur</SelectItem>
                  <SelectItem value="writer">✍️ Rédacteur</SelectItem>
                  <SelectItem value="editor">📝 Éditeur</SelectItem>
                  <SelectItem value="admin">👑 Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Profil d&apos;auteur (affiché sur sa page d&apos;auteur publique - facultatif, il/elle pourra aussi le compléter lors de sa première connexion)
              </p>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                    <AvatarImage src={newUser.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                      {newUser.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="new-user-avatar-upload"
                    className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-white cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {uploadingNewUserAvatar ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                  </label>
                  <input
                    id="new-user-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingNewUserAvatar}
                    onChange={handleNewUserAvatarUpload}
                  />
                </div>
                <p className="text-xs text-muted-foreground flex-1">
                  Cliquez sur l&apos;icône de téléchargement pour définir sa photo de profil (JPG, PNG, WebP).
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Titre / fonction</label>
                <Input
                  placeholder="Ex. Journaliste sportif"
                  value={newUser.role_title}
                  onChange={(e) => setNewUser({ ...newUser, role_title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Biographie</label>
                <Input
                  placeholder="Courte biographie de l'auteur..."
                  value={newUser.bio}
                  onChange={(e) => setNewUser({ ...newUser, bio: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Twitter / X</label>
                  <Input
                    placeholder="nom d'utilisateur"
                    value={newUser.twitter}
                    onChange={(e) => setNewUser({ ...newUser, twitter: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">LinkedIn</label>
                  <Input
                    placeholder="nom d'utilisateur"
                    value={newUser.linkedin}
                    onChange={(e) => setNewUser({ ...newUser, linkedin: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Site web</label>
                <Input
                  placeholder="https://example.com"
                  value={newUser.website}
                  onChange={(e) => setNewUser({ ...newUser, website: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer l\'utilisateur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
