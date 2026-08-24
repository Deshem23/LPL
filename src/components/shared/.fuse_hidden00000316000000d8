'use client';

import { useState } from 'react';
import { 
  FaXTwitter, 
  FaFacebook, 
  FaWhatsapp, 
  FaTelegram,
  FaLink,
  FaCheck
} from 'react-icons/fa6';
import { toast } from '@/components/ui/use-toast';

interface SocialShareProps {
  url: string;
  title: string;
  className?: string;
}

export function SocialShare({ url, title, className = '' }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: 'X (Twitter)',
      icon: FaXTwitter,
      href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
      color: 'hover:bg-[#000000] hover:text-white',
    },
    {
      name: 'Facebook',
      icon: FaFacebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: 'hover:bg-[#1877F2] hover:text-white',
    },
    {
      name: 'WhatsApp',
      icon: FaWhatsapp,
      href: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
      color: 'hover:bg-[#25D366] hover:text-white',
    },
    {
      name: 'Copier le lien',
      icon: copied ? FaCheck : FaLink,
      href: '#',
      color: 'hover:bg-primary hover:text-white',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          toast({
            title: 'Lien copié !',
            description: 'Le lien a été copié dans votre presse-papiers.',
          });
          setTimeout(() => setCopied(false), 3000);
        }).catch(() => {
          toast({
            title: 'Erreur',
            description: 'Impossible de copier le lien.',
            variant: 'destructive',
          });
        });
      },
    },
  ];

  return (
    <div className={`${className}`}>
      <div className="flex flex-wrap gap-2">
        {shareLinks.map((social) => {
          const Icon = social.icon;
          const isCopyLink = social.name === 'Copier le lien';
          
          return (
            <a
              key={social.name}
              href={social.href}
              target={!isCopyLink ? '_blank' : undefined}
              rel={!isCopyLink ? 'noopener noreferrer' : undefined}
              onClick={isCopyLink ? social.onClick : undefined}
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:scale-110 ${social.color}`}
              aria-label={`Share on ${social.name}`}
            >
              <Icon className="h-5 w-5" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
