import e, { useEffect as Ee, useMemo as G, useState as s } from "react";
import {
  createChannel as U,
  getChannelById as fetchChannelById,
  updateChannel as updateChannelById,
  uploadChannelMedia as uploadChannelMedia,
} from "@/lib/api";
import { useNavigate as V, useLocation as Se } from "react-router-dom";
import { useTranslation as Y } from "react-i18next";
import { useAuth as $ } from "@/context/AuthContext";
import { hasAuthSession as j, getUserId as z } from "@/utils/authStorage";
import {
  Card as k,
  CardContent as A,
  CardDescription as T,
  CardHeader as D,
  CardTitle as S,
} from "@/components/ui/card";
import { Button as m } from "@/components/ui/button";
import { Input as B } from "@/components/ui/input";
import { Textarea as J } from "@/components/ui/textarea";
import {
  Alert as h,
  AlertDescription as g,
  AlertTitle as p,
} from "@/components/ui/alert";
import {
  ArrowLeft as K,
  PlusCircle as O,
  AlertTriangle as _,
  CheckCircle2 as Q,
} from "lucide-react";
const W = ({ variant = "channel" } = {}) => {
  const { t: a } = Y(),
    n = V(),
    S = Se(),
    { user: L } = $(),
    I = j(),
    E = z(L),
    q = !!(I && E),
    isCentre = variant === "centre",
    editChannelId = G(() => {
      const params = new URLSearchParams(S.search || "");
      const raw = params.get("channelId") || params.get("id") || "";
      return raw ? String(raw).trim() : "";
    }, [S.search]),
    userTier = String(L?.current_plan || L?.tier || "").toLowerCase(),
    isPremium = ["premium", "pro", "business"].includes(userTier),
    [l, F] = s(""),
    [u, P] = s(""),
    [o, H] = s(""),
    [f, c] = s(""),
    [C, y] = s(""),
    [logoUrl, setLogoUrl] = s(""),
    [coverUrl, setCoverUrl] = s(""),
    [logoFile, setLogoFile] = s(null),
    [coverFile, setCoverFile] = s(null),
    [logoPreview, setLogoPreview] = s(""),
    [coverPreview, setCoverPreview] = s(""),
    [contactEmail, setContactEmail] = s(""),
    [contactPhone, setContactPhone] = s(""),
    [contactWebsite, setContactWebsite] = s(""),
    [location, setLocation] = s(""),
    [channelId, setChannelId] = s(null),
    [isEditing, setIsEditing] = s(!1),
    [x, b] = s(!1),
    d = G(
      () =>
        !l.trim() || !o.trim()
          ? isCentre
            ? a("centre_name_and_category_required", {
                defaultValue: "CentrePage name and category are required.",
              })
            : a("channel_name_and_category_required") ||
              "Channel name and category are required."
          : l.trim().length < 3
            ? isCentre
              ? a("centre_name_min", {
                  defaultValue: "CentrePage name must be at least 3 characters.",
                })
              : "Channel name must be at least 3 characters."
            : o.trim().length < 2
              ? "Category must be at least 2 characters."
              : "",
      [o, l, a, isCentre],
    ),
    v = !x && !d,
    createLabel = isEditing
      ? isCentre
        ? a("update_centre_page", { defaultValue: "Update CentrePage" })
        : a("update_channel", { defaultValue: "Update Channel" })
      : isCentre
        ? a("create_centre_page", { defaultValue: "Create CentrePage" })
        : a("create_channel") || "Create Channel",
    backPath = isCentre ? "/centre" : "/channels",
    M = async (r) => {
      if ((r.preventDefault(), !v)) {
        c(d || "Please fix form errors before submitting.");
        return;
      }
      b(!0), c(""), y("");
      try {
        const payload = {
          name: l.trim(),
          description: u.trim(),
          category: o.trim(),
        };
        if (isCentre) {
          payload.logo_url = logoUrl.trim() || null;
          payload.cover_url = coverUrl.trim() || null;
          payload.contact_email = contactEmail.trim() || null;
          payload.contact_phone = contactPhone.trim() || null;
          payload.contact_website = contactWebsite.trim() || null;
          payload.location = location.trim() || null;
        }
        const t = isEditing && channelId
            ? await updateChannelById(channelId, payload)
            : await U(payload),
          i = t?.data ?? t,
          N = i?.channel || i || null,
          w = N?.channel_id || N?.id || channelId || null;
        if (
          (y(
            isEditing
              ? a("channel_updated_successfully") ||
                  "Channel updated successfully."
              : a("channel_created_successfully") ||
                  "Channel created successfully.",
          ),
          w)
        ) {
          if (isCentre && (logoFile || coverFile)) {
            const formData = new FormData();
            if (logoFile) formData.append("logo", logoFile);
            if (coverFile) formData.append("cover", coverFile);
            try {
              await uploadChannelMedia(w, formData);
            } catch (mediaError) {
              c(
                mediaError?.message ||
                  mediaError?.response?.data?.error ||
                  "Media upload failed. Please retry.",
              );
              setChannelId(w);
              setIsEditing(!0);
              return;
            }
          }
          n(`${isCentre ? "/centre" : "/channels"}/${w}`);
          return;
        }
        n(backPath);
      } catch (t) {
        const i = Number(t?.status || t?.response?.status || 0),
          backendError =
            t?.response?.data?.error || t?.response?.data?.message || "",
          backendCode = t?.response?.data?.code || "",
          backendText = String(backendError || "").toLowerCase(),
          isAuthIssue =
            i === 401 ||
            (i === 403 &&
              (backendText.includes("token") ||
                backendText.includes("session") ||
                backendText.includes("login") ||
                backendText.includes("auth")));
        let fallbackMessage =
          backendError ||
          t?.message ||
          a("something_went_wrong") ||
          "Error creating channel.";
        if (backendCode === "DEVTOOLS_DETECTED") {
          fallbackMessage = "Please close developer tools to continue.";
        } else if (
          backendCode === "MISSING_TIMESTAMP" ||
          backendCode === "MISSING_NONCE"
        ) {
          fallbackMessage =
            "Request security headers missing. Please refresh and retry.";
        }
        c(
          isAuthIssue
            ? "Your session expired. Please sign in again to continue."
            : fallbackMessage,
        );
      } finally {
        b(!1);
      }
    };
  Ee(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreview(previewUrl);
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [logoFile]);

  Ee(() => {
    if (!coverFile) {
      setCoverPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [coverFile]);
  Ee(() => {
    let active = !0;
    if (!q || !isCentre || !editChannelId)
      return () => {
        active = !1;
      };

    (async () => {
      try {
        const response = await fetchChannelById(editChannelId);
        if (!active) return;
        const payload = response?.channel || response;
        if (!payload) return;
        setChannelId(payload.channel_id || payload.id || null);
        setIsEditing(!0);
        F(payload.name || "");
        P(payload.description || payload.bio || "");
        H(payload.category || "");
        setLogoUrl(payload.logo_url || payload.profile_pic || "");
        setCoverUrl(payload.cover_url || "");
        setContactEmail(payload.contact_email || "");
        setContactPhone(payload.contact_phone || "");
        setContactWebsite(payload.contact_website || "");
        setLocation(payload.location || "");
      } catch {
        // ignore missing channel
      }
    })();

    return () => {
      active = !1;
    };
  }, [q, isCentre, editChannelId]);
  Ee(() => {
    if (!editChannelId) {
      setIsEditing(!1);
      setChannelId(null);
    }
  }, [editChannelId]);
  return q
    ? isCentre && !isPremium
      ? e.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 px-4 py-20 dark:bg-gradient-to-br",
          },
          e.createElement(
            k,
            { className: "max-w-lg mx-auto" },
            e.createElement(
              D,
              null,
              e.createElement(
                S,
                null,
                a("premium_required", { defaultValue: "Premium required" }),
              ),
              e.createElement(
                T,
                null,
                a("premium_required_desc", {
                  defaultValue:
                    "Upgrade to Premium to create and manage your CentrePage.",
                }),
              ),
            ),
            e.createElement(
              A,
              { className: "space-y-4" },
              e.createElement(
                m,
                {
                  onClick: () => n("/tier-selection"),
                  className: "w-full",
                },
                a("upgrade_to_premium", { defaultValue: "Upgrade to Premium" }),
              ),
              e.createElement(
                m,
                {
                  variant: "outline",
                  className: "w-full",
                  onClick: () => n(backPath),
                },
                a("back", { defaultValue: "Back" }),
              ),
            ),
          ),
        )
      : e.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 px-4 py-8 dark:bg-gradient-to-br",
        },
        e.createElement(
          "div",
          { className: "max-w-2xl mx-auto space-y-4 page-shell page-pad" },
          e.createElement(
            m,
            {
              variant: "ghost",
              onClick: () => n(backPath),
              className: "gap-2",
            },
            e.createElement(K, { className: "w-4 h-4" }),
            isCentre
              ? a("back_to_centre_pages", { defaultValue: "Back to CentrePages" })
              : a("back_to_channels", "Back to Channels"),
          ),
          e.createElement(
            k,
            null,
            e.createElement(
              D,
              null,
              e.createElement(
                S,
                { className: "flex items-center gap-2" },
                e.createElement(O, { className: "w-5 h-5 text-blue-600 dark:text-blue-300" }),
                createLabel,
              ),
              e.createElement(
                T,
                null,
                isCentre
                  ? a("centre_page_desc", {
                      defaultValue:
                        "Create your premium seller profile and publish updates for followers.",
                    })
                  : "Launch a channel for your niche and publish updates for followers.",
              ),
            ),
            e.createElement(
              A,
              null,
              e.createElement(
                "form",
                { onSubmit: M, className: "space-y-4" },
                e.createElement(
                  "div",
                  null,
                e.createElement(
                  "label",
                  {
                    htmlFor: "channel-name",
                    className:
                      "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                  },
                  isCentre
                    ? a("centre_name_label", { defaultValue: "CentrePage Name" })
                    : "Channel Name",
                ),
                  e.createElement(B, {
                    id: "channel-name",
                    value: l,
                    onChange: (r) => F(r.target.value),
                    placeholder: "e.g. Verified Gadget Deals",
                    maxLength: 80,
                    required: !0,
                  }),
                ),
                e.createElement(
                  "div",
                  null,
                e.createElement(
                  "label",
                  {
                    htmlFor: "channel-description",
                    className:
                      "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                  },
                  isCentre
                    ? a("centre_description", { defaultValue: "About your CentrePage" })
                    : "Description",
                ),
                  e.createElement(J, {
                    id: "channel-description",
                    value: u,
                    onChange: (r) => P(r.target.value),
                    placeholder:
                      isCentre
                        ? a("centre_description_placeholder", {
                            defaultValue:
                              "Tell buyers about your brand, services, and what they can expect.",
                          })
                        : "Tell users what they can expect from this channel.",
                    rows: 4,
                    maxLength: 500,
                  }),
                  e.createElement(
                    "p",
                    { className: "mt-1 text-xs text-gray-500 dark:text-gray-300" },
                    u.length,
                    "/500",
                  ),
                ),
                e.createElement(
                  "div",
                  null,
                e.createElement(
                  "label",
                  {
                    htmlFor: "channel-category",
                    className:
                      "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                  },
                  "Category",
                ),
                e.createElement(B, {
                  id: "channel-category",
                  value: o,
                  onChange: (r) => H(r.target.value),
                  placeholder: "e.g. Electronics",
                  maxLength: 60,
                  required: !0,
                }),
              ),
              isCentre &&
                e.createElement(
                  "div",
                  { className: "space-y-4" },
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    e.createElement(
                      "label",
                      {
                        htmlFor: "centre-logo-file",
                        className:
                          "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                      },
                      a("centre_logo_label", { defaultValue: "Logo image" }),
                    ),
                    (logoPreview || logoUrl) &&
                      e.createElement("img", {
                        src: logoPreview || logoUrl,
                        alt: "Logo preview",
                        className: "h-16 w-16 rounded-full object-cover border",
                      }),
                    e.createElement(B, {
                      id: "centre-logo-file",
                      type: "file",
                      accept: "image/*",
                      onChange: (r) => {
                        const file = r.target.files?.[0] || null;
                        setLogoFile(file);
                        if (file) setLogoUrl("");
                      },
                    }),
                    e.createElement(
                      "p",
                      { className: "text-xs text-gray-500 dark:text-gray-300" },
                      a("logo_url_optional", { defaultValue: "Or paste a logo URL (optional)" }),
                    ),
                    e.createElement(B, {
                      id: "centre-logo",
                      value: logoUrl,
                      onChange: (r) => {
                        setLogoUrl(r.target.value);
                        if (r.target.value) setLogoFile(null);
                      },
                      placeholder: "https://...",
                      maxLength: 240,
                    }),
                  ),
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    e.createElement(
                      "label",
                      {
                        htmlFor: "centre-cover-file",
                        className:
                          "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                      },
                      a("centre_cover_label", { defaultValue: "Cover image" }),
                    ),
                    (coverPreview || coverUrl) &&
                      e.createElement("img", {
                        src: coverPreview || coverUrl,
                        alt: "Cover preview",
                        className: "h-24 w-full rounded-xl object-cover border",
                      }),
                    e.createElement(B, {
                      id: "centre-cover-file",
                      type: "file",
                      accept: "image/*",
                      onChange: (r) => {
                        const file = r.target.files?.[0] || null;
                        setCoverFile(file);
                        if (file) setCoverUrl("");
                      },
                    }),
                    e.createElement(
                      "p",
                      { className: "text-xs text-gray-500 dark:text-gray-300" },
                      a("cover_url_optional", { defaultValue: "Or paste a cover URL (optional)" }),
                    ),
                    e.createElement(B, {
                      id: "centre-cover",
                      value: coverUrl,
                      onChange: (r) => {
                        setCoverUrl(r.target.value);
                        if (r.target.value) setCoverFile(null);
                      },
                      placeholder: "https://...",
                      maxLength: 240,
                    }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "label",
                      {
                        htmlFor: "centre-email",
                        className:
                          "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                      },
                      a("centre_contact_email", { defaultValue: "Contact email" }),
                    ),
                    e.createElement(B, {
                      id: "centre-email",
                      value: contactEmail,
                      onChange: (r) => setContactEmail(r.target.value),
                      placeholder: "hello@brand.com",
                      maxLength: 120,
                    }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "label",
                      {
                        htmlFor: "centre-phone",
                        className:
                          "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                      },
                      a("centre_contact_phone", { defaultValue: "Contact phone" }),
                    ),
                    e.createElement(B, {
                      id: "centre-phone",
                      value: contactPhone,
                      onChange: (r) => setContactPhone(r.target.value),
                      placeholder: "+91 ...",
                      maxLength: 40,
                    }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "label",
                      {
                        htmlFor: "centre-website",
                        className:
                          "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                      },
                      a("centre_contact_website", { defaultValue: "Website" }),
                    ),
                    e.createElement(B, {
                      id: "centre-website",
                      value: contactWebsite,
                      onChange: (r) => setContactWebsite(r.target.value),
                      placeholder: "https://...",
                      maxLength: 160,
                    }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "label",
                      {
                        htmlFor: "centre-location",
                        className:
                          "text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                      },
                      a("centre_location", { defaultValue: "Location" }),
                    ),
                    e.createElement(B, {
                      id: "centre-location",
                      value: location,
                      onChange: (r) => setLocation(r.target.value),
                      placeholder: "City, Area",
                      maxLength: 120,
                    }),
                  ),
                ),
                d
                  ? e.createElement(
                      h,
                      { variant: "destructive" },
                      e.createElement(_, { className: "h-4 w-4" }),
                      e.createElement(p, null, "Form incomplete"),
                      e.createElement(g, null, d),
                    )
                  : null,
                f
                  ? e.createElement(
                      h,
                      { variant: "destructive" },
                      e.createElement(_, { className: "h-4 w-4" }),
                      e.createElement(
                        p,
                        null,
                        isCentre
                          ? a("centre_creation_failed", {
                              defaultValue: "CentrePage creation failed",
                            })
                          : "Channel creation failed",
                      ),
                      e.createElement(g, null, f),
                    )
                  : null,
                C
                  ? e.createElement(
                      h,
                      {
                        className:
                          "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-600/40 dark:bg-emerald-950/20 dark:text-emerald-200",
                      },
                      e.createElement(Q, { className: "h-4 w-4" }),
                      e.createElement(p, null, "Success"),
                      e.createElement(g, null, C),
                    )
                  : null,
                e.createElement(
                  "div",
                  { className: "flex flex-wrap gap-2" },
                  e.createElement(
                    m,
                    { type: "submit", disabled: !v },
                    x
                      ? a("loading") || "Loading..."
                      : createLabel,
                  ),
                  e.createElement(
                    m,
                    {
                      type: "button",
                      variant: "outline",
                      onClick: () => n(backPath),
                    },
                    "Cancel",
                  ),
                ),
              ),
            ),
          ),
        ),
      )
    : e.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 px-4 py-20 dark:bg-gradient-to-br",
        },
      e.createElement(
        k,
        { className: "max-w-lg mx-auto" },
        e.createElement(
          D,
          null,
          e.createElement(
            S,
            null,
            isCentre
              ? a("create_centre_page", { defaultValue: "Create CentrePage" })
              : a("create_channel", "Create Channel"),
          ),
          e.createElement(
            T,
            null,
            isCentre
              ? a("sign_in_to_create_centre_page", {
                  defaultValue:
                    "Sign in to create and manage your CentrePage.",
                })
              : a(
                  "sign_in_to_create_channel",
                  "Sign in to create and manage your own channel.",
                ),
          ),
        ),
        e.createElement(
            A,
            { className: "space-y-4" },
            e.createElement(
              m,
              {
                onClick: () =>
                  n("/login", {
                    state: { returnTo: isCentre ? "/centre/create" : "/channels/create" },
                  }),
                className: "w-full",
              },
              a("sign_in_to_continue", "Sign In to Continue"),
            ),
            e.createElement(
              m,
              {
                variant: "outline",
                className: "w-full",
                onClick: () => n(backPath),
              },
              isCentre
                ? a("back_to_centre_pages", { defaultValue: "Back to CentrePages" })
                : a("back_to_channels", "Back to Channels"),
            ),
          ),
        ),
      );
};
var me = W;
export { me as default };
