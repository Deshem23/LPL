'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { updatePassword } from '@/lib/auth/actions';

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    name: z.string().min(1, 'Name is required'),
    bio: z.string().optional(),
    role_title: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

// The first-login gate: shown instead of the dashboard when an
// admin-created account still has its generic temporary password
// (users.must_change_password - see middleware.ts). Two things happen
// here in one submit: the password actually changes (updatePassword(),
// the same Supabase Auth call the "forgot password" flow uses), and the
// author profile (bio, socials, avatar) gets filled in or confirmed -
// then must_change_password clears and they land on their real
// dashboard.
export function CompleteProfileForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // True when an admin already filled in the author profile fields at
  // account-creation time (see the "Author profile" section of the
  // create-user dialog in admin/users/page.tsx). In that case this page
  // only needs to collect a new password - re-showing a big "fill in
  // your bio/socials" form for information that's already there just
  // makes first login feel longer than it needs to be.
  const [profileAlreadySet, setProfileAlreadySet] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      name: '',
      bio: '',
      role_title: '',
      twitter: '',
      linkedin: '',
      website: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users/profile', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.user) return;
        form.reset({
          password: '',
          confirmPassword: '',
          name: data.user.name || '',
          bio: data.user.bio || '',
          role_title: data.user.role_title || '',
          twitter: data.user.twitter || '',
          linkedin: data.user.linkedin || '',
          website: data.user.website || '',
        });
        setAvatarPreview(data.user.avatar_url || '');
        setProfileAlreadySet(
          !!(
            data.user.bio?.trim() ||
            data.user.role_title?.trim() ||
            data.user.twitter?.trim() ||
            data.user.linkedin?.trim() ||
            data.user.website?.trim() ||
            data.user.avatar_url
          )
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form]);

  // Real Storage upload (via /api/media/upload, type: 'avatar') instead
  // of embedding a base64 data: URI directly in avatar_url - same class
  // of bug already fixed for the admin's user-edit avatar picker (see
  // handleEditAvatarUpload in panel/users/page.tsx), just never applied
  // here on the self-service first-login path.
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const body = new FormData();
      body.append('files', file);
      body.append('type', 'avatar');
      const res = await fetch('/api/media/upload', { method: 'POST', body });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.media?.[0]?.url) {
        throw new Error(result.error || "Échec du téléversement de l'image.");
      }
      setAvatarPreview(result.media[0].url);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not upload this image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const passwordResult = await updatePassword(data.password);
      if (passwordResult.error) {
        toast({
          title: 'Could not set your new password',
          description: passwordResult.error,
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          bio: data.bio,
          role_title: data.role_title,
          twitter: data.twitter,
          linkedin: data.linkedin,
          website: data.website,
          avatar_url: avatarPreview || undefined,
          completeFirstLogin: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      toast({
        title: 'All set!',
        description: 'Your password has been changed and your profile is up to date.',
      });

      // Hard navigation so middleware re-checks must_change_password
      // fresh against the database instead of a stale client-side route
      // cache.
      // Logged so the browser console shows exactly what path this is
      // about to navigate to - matches the "🎯 First-login complete..."
      // line the server logs at the same moment, so the two can be
      // compared if the redirect ever lands somewhere unexpected.
      const destination = result.redirectTo || '/lpl-access-2026/panel';
      window.location.href = destination;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Set your password
            </h2>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" disabled={isLoading} className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" disabled={isLoading} className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {profileAlreadySet ? (
            <div className="flex items-center gap-4 border-t pt-6">
              <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {form.watch('name')?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{form.watch('name')}</p>
                {form.watch('role_title') && (
                  <p className="text-xs text-muted-foreground">{form.watch('role_title')}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Your author profile was already set up for you. You can update it anytime from your dashboard settings.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Your author profile
              </h2>
              <FormDescription>Shown on your public author page whenever a reader clicks your byline.</FormDescription>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/10">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                      {form.watch('name')?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-white cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" disabled={isUploadingAvatar} onChange={handleAvatarUpload} />
                </div>
                <p className="text-xs text-muted-foreground flex-1">
                  Click the upload icon to add a profile photo (JPG, PNG, WebP - max 5MB).
                </p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title / role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Sports Journalist" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="A short bio readers will see on your author page..." disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter / X</FormLabel>
                      <FormControl>
                        <Input placeholder="username" disabled={isLoading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input placeholder="username" disabled={isLoading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue to my dashboard'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
