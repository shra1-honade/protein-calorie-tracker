import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface Props {
  inviteCode: string;
}

export default function ShareLinkButton({ inviteCode }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join/${inviteCode}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my protein tracking group!',
          url: link,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="btn-secondary flex items-center gap-2 text-sm"
    >
      {copied ? (
        <>
          <Check size={16} /> Copied!
        </>
      ) : navigator.share !== undefined ? (
        <>
          <Share2 size={16} /> Share
        </>
      ) : (
        <>
          <Copy size={16} /> Copy Link
        </>
      )}
    </button>
  );
}
