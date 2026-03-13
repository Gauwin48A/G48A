import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Link2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Send,
  Mail,
} from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

function ShareLinkDialog({ open, onOpenChange, url = "", title = "" }) {
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback });
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef(null);
  const inputId = useId();
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const safeUrl = useMemo(() => {
    if (typeof url === "string") return url.trim();
    if (url && typeof url === "object") {
      const candidate = url.url || url.href || url.link || "";
      return String(candidate || "").trim();
    }
    return "";
  }, [url]);
  const encodedUrl = useMemo(() => encodeURIComponent(safeUrl), [safeUrl]);
  const resolvedTitle = title || tr("share_link_title", "Share link");
  const resolvedDescription = tr(
    "share_link_description",
    "Share this post with a clean link and quick options.",
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const inputEl = typeof document !== "undefined" ? document.getElementById(inputId) : null;
      if (inputEl && typeof inputEl.focus === "function") {
        inputEl.focus();
        if (typeof inputEl.select === "function") {
          inputEl.select();
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [open, inputId]);

  useEffect(() => () => {
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }
  }, []);

  const handleCopy = async () => {
    if (!safeUrl) return;
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopied(true);
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (!safeUrl || !canUseNativeShare) return;
    try {
      await navigator.share({ title: resolvedTitle, url: safeUrl });
    } catch {
      // Ignore cancellation/errors from native share sheet.
    }
  };

  const openExternal = () => {
    if (!safeUrl) return;
    window.open(safeUrl, "_blank", "noopener,noreferrer");
  };

  const openQuickShare = (platform) => {
    if (!safeUrl) return;

    let shareUrl = "";
    if (platform === "whatsapp") {
      shareUrl = `https://wa.me/?text=${encodedUrl}`;
    } else if (platform === "telegram") {
      shareUrl = `https://t.me/share/url?url=${encodedUrl}`;
    } else if (platform === "x") {
      shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}`;
    } else if (platform === "email") {
      shareUrl = `mailto:?subject=${encodeURIComponent(resolvedTitle)}&body=${encodedUrl}`;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-950">
        <DialogHeader className="px-6 py-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-b border-blue-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Link2 className="w-4 h-4" />
            </span>
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">
            {resolvedDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              {tr("public_link", "Public Link")}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <Input
                id={inputId}
                value={safeUrl}
                readOnly
                onFocus={(event) => event.target.select()}
                autoFocus
                className="font-mono text-xs sm:text-sm h-11 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
              />
              <Button
                type="button"
                onClick={handleCopy}
                className={`h-11 min-w-[120px] shrink-0 ${copied ? "bg-emerald-600 hover:bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"}`}
                disabled={!safeUrl}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-1.5" />
                ) : (
                  <Copy className="w-4 h-4 mr-1.5" />
                )}
                {copied
                  ? tr("copied", "Copied")
                  : tr("copy_link", "Copy Link")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {tr(
                "share_link_tip",
                "Tip: link is selected automatically for fast sharing.",
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start border-slate-300 dark:border-slate-700"
              onClick={() => openQuickShare("whatsapp")}
              disabled={!safeUrl}
            >
              <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" />
              {tr("share_whatsapp", "WhatsApp")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start border-slate-300 dark:border-slate-700"
              onClick={() => openQuickShare("telegram")}
              disabled={!safeUrl}
            >
              <Send className="w-4 h-4 mr-2 text-sky-600" />
              {tr("share_telegram", "Telegram")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start border-slate-300 dark:border-slate-700"
              onClick={() => openQuickShare("x")}
              disabled={!safeUrl}
            >
              <FaXTwitter className="w-4 h-4 mr-2" />
              {tr("share_x", "X")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start border-slate-300 dark:border-slate-700"
              onClick={() => openQuickShare("email")}
              disabled={!safeUrl}
            >
              <Mail className="w-4 h-4 mr-2 text-violet-600" />
              {tr("share_email", "Email")}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={openExternal}
              disabled={!safeUrl}
              className="h-11 border-slate-300 dark:border-slate-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {tr("open_post", "Open Post")}
            </Button>
            {canUseNativeShare ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleNativeShare}
                disabled={!safeUrl}
                className="h-11 border-slate-300 dark:border-slate-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {tr("more_share_options", "More Share Options")}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareLinkDialog;

