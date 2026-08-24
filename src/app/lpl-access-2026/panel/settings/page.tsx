'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  FaGlobe,
  FaEnvelope,
  FaShieldAlt,
  FaSearch,
  FaSave,
  FaMailBulk,
  FaKey,
  FaUserLock,
  FaClock,
  FaDatabase,
} from 'react-icons/fa';

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);

  const [generalSettings, setGeneralSettings] = useState({
    siteName: '',
    siteDescription: '',
    siteUrl: '',
    defaultLanguage: 'fr',
    timezone: 'Europe/Paris',
    articlesPerPage: '12',
    commentsEnabled: true,
    registrationEnabled: true,
  });

  const [seoSettings, setSeoSettings] = useState({
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    robotsTxt: '',
    sitemapEnabled: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    enableNotifications: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '120',
    maxLoginAttempts: '5',
    passwordMinLength: '8',
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    backupEnabled: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      setIsFetching(true);
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Impossible de charger les paramètres.');
        }
        const s = json.settings;

        setGeneralSettings({
          siteName: s.site_name || '',
          siteDescription: s.site_description || '',
          siteUrl: s.site_url || '',
          defaultLanguage: s.default_language || 'fr',
          timezone: s.timezone || 'Europe/Paris',
          articlesPerPage: String(s.articles_per_page ?? 12),
          commentsEnabled: !!s.comments_enabled,
          registrationEnabled: !!s.registration_enabled,
        });
        setSeoSettings({
          metaTitle: s.meta_title || '',
          metaDescription: s.meta_description || '',
          metaKeywords: s.meta_keywords || '',
          robotsTxt: s.robots_txt || '',
          sitemapEnabled: !!s.sitemap_enabled,
        });
        setEmailSettings({
          smtpHost: s.smtp_host || '',
          smtpPort: s.smtp_port || '',
          smtpUser: s.smtp_user || '',
          smtpPassword: '',
          fromEmail: s.from_email || '',
          fromName: s.from_name || '',
          enableNotifications: !!s.enable_notifications,
        });
        setSmtpPasswordSet(!!s.smtp_password_set);
        setSecuritySettings({
          twoFactorEnabled: !!s.two_factor_enabled,
          sessionTimeout: String(s.session_timeout ?? 120),
          maxLoginAttempts: String(s.max_login_attempts ?? 5),
          passwordMinLength: String(s.password_min_length ?? 8),
          requireSpecialChars: !!s.require_special_chars,
          requireNumbers: !!s.require_numbers,
          requireUppercase: !!s.require_uppercase,
          backupEnabled: !!s.backup_enabled,
        });
      } catch (error: any) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    loadSettings();
  }, []);

  // Returns whether the save actually succeeded, so callers that need to
  // chain a follow-up action (see handleTestEmail below) know whether to
  // proceed - the toast alone doesn't give the caller that signal.
  const saveSection = async (payload: Record<string, any>, label: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Une erreur est survenue.');
      }
      if (typeof result.settings?.smtp_password_set === 'boolean') {
        setSmtpPasswordSet(result.settings.smtp_password_set);
      }
      toast({
        title: 'Paramètres enregistrés',
        description: `Les paramètres ${label} ont été enregistrés avec succès.`,
      });
      return true;
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneral = () =>
    saveSection(
      {
        site_name: generalSettings.siteName,
        site_description: generalSettings.siteDescription,
        site_url: generalSettings.siteUrl,
        default_language: generalSettings.defaultLanguage,
        timezone: generalSettings.timezone,
        articles_per_page: parseInt(generalSettings.articlesPerPage, 10) || 12,
        comments_enabled: generalSettings.commentsEnabled,
        registration_enabled: generalSettings.registrationEnabled,
      },
      'généraux'
    );

  const handleSaveSeo = () =>
    saveSection(
      {
        meta_title: seoSettings.metaTitle,
        meta_description: seoSettings.metaDescription,
        meta_keywords: seoSettings.metaKeywords,
        robots_txt: seoSettings.robotsTxt,
        sitemap_enabled: seoSettings.sitemapEnabled,
      },
      'SEO'
    );

  const handleSaveEmail = async () => {
    const ok = await saveSection(
      {
        smtp_host: emailSettings.smtpHost,
        smtp_port: emailSettings.smtpPort,
        smtp_user: emailSettings.smtpUser,
        // Only sent when the admin actually typed something new - see
        // /api/admin/settings PATCH, which ignores an empty value so an
        // unedited field never wipes the stored secret.
        smtp_password: emailSettings.smtpPassword,
        from_email: emailSettings.fromEmail,
        from_name: emailSettings.fromName,
        enable_notifications: emailSettings.enableNotifications,
      },
      'email'
    );
    if (ok) setEmailSettings((prev) => ({ ...prev, smtpPassword: '' }));
    return ok;
  };

  // "Tester" used to just show a hardcoded "no email service connected"
  // toast no matter what was saved. This now actually saves the current
  // form values first (so a freshly-typed app password is in the DB
  // before the test reads it), then asks the server to really attempt a
  // send through /api/admin/settings/test-email and reports the real
  // outcome - including the real SMTP error when it fails.
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const handleTestEmail = async () => {
    const saved = await handleSaveEmail();
    if (!saved) return; // saveSection already showed the failure toast

    setIsTestingEmail(true);
    try {
      const res = await fetch('/api/admin/settings/test-email', { method: 'POST' });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Le test de connexion SMTP a échoué.");
      }
      toast({
        title: 'Connexion réussie',
        description: `Un email de test a été envoyé à ${result.to}. Vérifiez cette boîte de réception.`,
      });
    } catch (error: any) {
      toast({ title: 'Échec du test', description: error.message, variant: 'destructive' });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveSecurity = () =>
    saveSection(
      {
        session_timeout: parseInt(securitySettings.sessionTimeout, 10) || 120,
        max_login_attempts: parseInt(securitySettings.maxLoginAttempts, 10) || 5,
        password_min_length: parseInt(securitySettings.passwordMinLength, 10) || 8,
        require_special_chars: securitySettings.requireSpecialChars,
        require_numbers: securitySettings.requireNumbers,
        require_uppercase: securitySettings.requireUppercase,
        two_factor_enabled: securitySettings.twoFactorEnabled,
        backup_enabled: securitySettings.backupEnabled,
      },
      'de sécurité'
    );

  if (isFetching) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
          <p className="text-muted-foreground">
            Gérez la configuration de votre plateforme.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <FaGlobe className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <FaSearch className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <FaEnvelope className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <FaShieldAlt className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Nom du site</Label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">URL du site</Label>
                  <Input
                    id="siteUrl"
                    value={generalSettings.siteUrl}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteUrl: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="siteDescription">Description du site</Label>
                <Textarea
                  id="siteDescription"
                  value={generalSettings.siteDescription}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                  rows={3}
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="defaultLanguage">Langue par défaut</Label>
                  <Select
                    value={generalSettings.defaultLanguage}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultLanguage: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ht">Kreyòl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select
                    value={generalSettings.timezone}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Fuseau horaire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                      <SelectItem value="America/Port-au-Prince">America/Port-au-Prince</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="articlesPerPage">Articles par page</Label>
                  <Select
                    value={generalSettings.articlesPerPage}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, articlesPerPage: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Articles par page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Commentaires</Label>
                    <p className="text-xs text-muted-foreground">
                      Activer/désactiver les commentaires sur les articles
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.commentsEnabled}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, commentsEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Inscription</Label>
                    <p className="text-xs text-muted-foreground">
                      Permettre aux nouveaux utilisateurs de s&apos;inscrire
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.registrationEnabled}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, registrationEnabled: checked })}
                  />
                </div>
              </div>
              <Button onClick={handleSaveGeneral} disabled={isLoading} className="gap-2">
                <FaSave className="h-4 w-4" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>Optimisation SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Titre méta</Label>
                <Input
                  id="metaTitle"
                  value={seoSettings.metaTitle}
                  onChange={(e) => setSeoSettings({ ...seoSettings, metaTitle: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">Description méta</Label>
                <Textarea
                  id="metaDescription"
                  value={seoSettings.metaDescription}
                  onChange={(e) => setSeoSettings({ ...seoSettings, metaDescription: e.target.value })}
                  rows={2}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="metaKeywords">Mots-clés méta</Label>
                <Input
                  id="metaKeywords"
                  value={seoSettings.metaKeywords}
                  onChange={(e) => setSeoSettings({ ...seoSettings, metaKeywords: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="robotsTxt">Robots.txt</Label>
                <Textarea
                  id="robotsTxt"
                  value={seoSettings.robotsTxt}
                  onChange={(e) => setSeoSettings({ ...seoSettings, robotsTxt: e.target.value })}
                  rows={5}
                  className="mt-1.5 font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label className="text-sm">Sitemap</Label>
                  <p className="text-xs text-muted-foreground">
                    Générer automatiquement le sitemap.xml
                  </p>
                </div>
                <Switch
                  checked={seoSettings.sitemapEnabled}
                  onCheckedChange={(checked) => setSeoSettings({ ...seoSettings, sitemapEnabled: checked })}
                />
              </div>
              <Button onClick={handleSaveSeo} disabled={isLoading} className="gap-2">
                <FaSave className="h-4 w-4" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Configuration email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">SMTP Hôte</Label>
                  <Input
                    id="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpUser">SMTP Utilisateur</Label>
                  <Input
                    id="smtpUser"
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPassword">SMTP Mot de passe</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                    placeholder={smtpPasswordSet ? '••••••••' : ''}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {smtpPasswordSet
                      ? 'Un mot de passe est enregistré. Laissez vide pour le conserver.'
                      : "Aucun mot de passe enregistré."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromEmail">Email d&apos;expédition</Label>
                  <Input
                    id="fromEmail"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="fromName">Nom d&apos;expédition</Label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label className="text-sm">Notifications email</Label>
                  <p className="text-xs text-muted-foreground">
                    Recevoir des notifications par email
                  </p>
                </div>
                <Switch
                  checked={emailSettings.enableNotifications}
                  onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, enableNotifications: checked })}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveEmail} disabled={isLoading} className="gap-2">
                  <FaSave className="h-4 w-4" />
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={isLoading || isTestingEmail}
                  className="gap-2"
                >
                  <FaMailBulk className="h-4 w-4" />
                  {isTestingEmail ? 'Test en cours...' : 'Tester'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Délai d&apos;expiration de session (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    <FaClock className="h-3 w-3 inline mr-1" />
                    Durée avant déconnexion automatique
                  </p>
                </div>
                <div>
                  <Label htmlFor="maxLoginAttempts">Tentatives de connexion max</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.target.value })}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    <FaUserLock className="h-3 w-3 inline mr-1" />
                    Nombre de tentatives avant blocage
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="passwordMinLength">Longueur minimale du mot de passe</Label>
                <Input
                  id="passwordMinLength"
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: e.target.value })}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  <FaKey className="h-3 w-3 inline mr-1" />
                  Nombre de caractères minimum
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Caractères spéciaux requis</Label>
                    <p className="text-xs text-muted-foreground">
                      Le mot de passe doit contenir des caractères spéciaux
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.requireSpecialChars}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireSpecialChars: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Chiffres requis</Label>
                    <p className="text-xs text-muted-foreground">
                      Le mot de passe doit contenir des chiffres
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.requireNumbers}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireNumbers: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Majuscules requises</Label>
                    <p className="text-xs text-muted-foreground">
                      Le mot de passe doit contenir des majuscules
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.requireUppercase}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireUppercase: checked })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Authentification à deux facteurs</Label>
                    <p className="text-xs text-muted-foreground">
                      Activer 2FA pour les comptes administrateurs
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorEnabled}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, twoFactorEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Sauvegarde automatique</Label>
                    <p className="text-xs text-muted-foreground">
                      Sauvegarde automatique de la base de données
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.backupEnabled}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, backupEnabled: checked })}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={handleSaveSecurity} disabled={isLoading} className="gap-2">
                  <FaSave className="h-4 w-4" />
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: 'Sauvegarde manuelle non disponible',
                      description: "Aucun pipeline de sauvegarde n'est encore connecté à ce serveur.",
                    });
                  }}
                  className="gap-2"
                >
                  <FaDatabase className="h-4 w-4" />
                  Sauvegarder maintenant
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
