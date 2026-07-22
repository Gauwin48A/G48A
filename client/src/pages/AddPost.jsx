import e, {
  useState as n,
  useEffect as U,
  useCallback as z,
  useMemo as j,
} from "react";
import { Button as v } from "@/components/ui/button";
import { Input as h } from "@/components/ui/input";
import { Label as u } from "@/components/ui/label";
import {
  Card as W,
  CardContent as ce,
  CardDescription as Pe,
  CardHeader as Te,
  CardTitle as Le,
} from "@/components/ui/card";
import {
  Select as F,
  SelectContent as _,
  SelectItem as p,
  SelectTrigger as A,
  SelectValue as D,
} from "@/components/ui/select";
import { Textarea as $e } from "@/components/ui/textarea";
import { Badge as H } from "@/components/ui/badge";
import { useToast as Ee } from "@/hooks/use-toast";
import { ArrowLeft as be, Upload as Be, Eye as qe } from "lucide-react";
import {
  Link as Ue,
  useNavigate as je,
  useLocation as Fe,
} from "react-router-dom";
import _e from "@/components/AudioRecorder";
import { useTranslation as Ae } from "react-i18next";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { hasAuthSession as De, getUserId as Me } from "@/utils/authStorage";
import { fetchCategoriesCached as Oe } from "@/services/categoriesService";
import { fetchSubcategories as fetchPostSubcategories } from "@/services/subcategoriesService";
import { buildApiPath as G } from "@/lib/networkConfig";
import { getDeviceId as _getDeviceId } from "@/utils/device";
import { buildActiveAppMatcher } from "@/utils/categoryModeFilters";
const Xe = 2 * 1024 * 1024,
  M = [
    { key: "basic", name: "Basic", maxImages: 1, color: "bg-gray-500" },
    { key: "bronze", name: "Bronze", maxImages: 1, color: "bg-amber-500" },
    { key: "silver", name: "Silver", maxImages: 1, color: "bg-blue-500" },
    { key: "gold", name: "Gold", maxImages: 1, color: "bg-emerald-500" },
    { key: "premium", name: "Premium", maxImages: 10, color: "bg-yellow-500" },
  ],
  V = (a) => {
    if (!a) return "basic";
    const m = String(a).trim().toLowerCase();
    return m.includes("premium")
      ? "premium"
      : m.includes("gold")
        ? "gold"
        : m.includes("silver")
          ? "silver"
          : m.includes("bronze")
            ? "bronze"
            : m.includes("basic") || m.includes("free")
              ? "basic"
              : m;
  },
  ze = (a) => {
    if (!a) return "bg-gray-500";
    const m = String(a).trim();
    return m.startsWith("bg-") ? m : `bg-${m}`;
  },
  normalizeCategoryValue = (a) => String(a || "").trim().toLowerCase(),
  PLAN_COLOR_MAP = {
    basic: "bg-gray-500",
    bronze: "bg-amber-500",
    silver: "bg-blue-500",
    gold: "bg-emerald-500",
    premium: "bg-yellow-500",
  },
  We = (a) => {
    const m = V(
      a?.key ||
        a?.tier_key ||
        a?.slug ||
        a?.plan ||
        a?.planName ||
        a?.name ||
        a?.displayName,
    );
    const fallbackColor = PLAN_COLOR_MAP[m] || "bg-gray-500";
    return {
      ...a,
      key: m,
      name:
        a?.displayName ||
        a?.name ||
        m.charAt(0).toUpperCase() + m.slice(1),
      maxImages: Number(a?.maxImages ?? a?.max_images ?? 1),
      color: ze(a?.color || fallbackColor),
      icon: typeof a?.icon == "function" ? a.icon : null,
    };
  },
  He = () => {
    const { t: a } = Ae(),
      m = je(),
      S = Fe(),
      { activeCategory: categoryModeCategory, activeSubcategory: categoryModeSubcategory, activeApp, categories: categoryModeCategories, selectCategory: selectCategoryMode, selectSubcategory: selectSubcategoryMode, subcategories: categoryModeSubcategories, hasSelection: hasCategoryMode } =
        useCategoryMode(),
      { user: authUser } = useAuth(),
      { toast: y } = Ee(),
      {
        selectedTier: O,
        selectedCategoryId: Y,
        selectedCategoryName: _Y,
        selectedSubcategoryId: cee,
      } = j(() => {
        const r = new URLSearchParams(S.search);
        const tierFromUrl = V(r.get("tier") || "");
        const userTier = V(authUser?.current_plan || authUser?.tier || "");
        return {
          selectedTier: tierFromUrl || userTier || "basic",
          selectedCategoryId: r.get("category_id") || r.get("categoryId") || "",
          selectedCategoryName: r.get("category") || "",
          selectedSubcategoryId: r.get("subcategory_id") || r.get("subcategoryId") || "",
        };
      }, [S.search, authUser?.current_plan, authUser?.tier]),
      [ue, J] = n([]),
      [ye, K] = n([]),
      [Z, Q] = n(""),
      [pe, xe] = n(0),
      [categorySubcategories, setCategorySubcategories] = n([]),
      [subcategoriesLoading, setSubcategoriesLoading] = n(!1),
      [subcategoriesError, setSubcategoriesError] = n("");
    U(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.title = "MHub — Create Listing";
      return () => { document.title = "MHub"; };
    }, []);
    U(() => {
      let active = !0;
      if (!authUser) return;
      (async () => {
        let currentPlan = authUser?.current_plan || authUser?.tier || "";
        let postCredits = authUser?.post_credits || 0;
        let subscription = null;
        try {
          const response = await api.get("/subscriptions/my");
          if (!active) return;
          currentPlan = response?.currentPlan || response?.current_plan || currentPlan;
          postCredits = response?.postCredits ?? postCredits;
          subscription = response?.subscription || null;
        } catch {
          // fallback to auth user
        }
        const planKey = V(currentPlan || "");
        const subscriptionExpiresAt = subscription?.expiresAt
          ? new Date(subscription.expiresAt)
          : null;
        const hasActiveSubscription =
          subscription &&
          subscription.isActive !== false &&
          (!subscriptionExpiresAt ||
            (!Number.isNaN(subscriptionExpiresAt.getTime()) &&
              subscriptionExpiresAt > new Date()));
        // Trust server's currentPlan even when there is no subscription record.
        // Admins can set current_plan directly (e.g. "bronze") without creating
        // a user_subscriptions row.
        const hasDirectPlanGrant =
          planKey !== "basic" &&
          Boolean(currentPlan) &&
          (!subscriptionExpiresAt ||
            (!Number.isNaN(subscriptionExpiresAt.getTime()) &&
              subscriptionExpiresAt > new Date()));
        const canPost =
          planKey !== "basic"
            ? Boolean(hasActiveSubscription) || hasDirectPlanGrant
            : Number(postCredits) > 0;
        if (!canPost && active) {
          m("/post-welcome", { replace: !0 });
        }
      })();
      return () => {
        active = !1;
      };
    }, [authUser, m]);
    U(() => {
      let r = !1;
      return (
        (async () => {
          try {
            Q("");
            const [d, s] = await Promise.all([Oe(), api.get("/brands")]),
              l = s?.data ?? s;
            if (r) return;
            J(Array.isArray(d) ? d : []), K(Array.isArray(l) ? l : []);
          } catch {
            if (r) return;
            J([]),
              K([]),
              Q("Failed to load categories and brands. Please retry.");
          }
        })(),
        () => {
          r = !0;
        }
      );
    }, [pe]);
    const [t, R] = n({
        title: "",
        category: _Y || categoryModeCategory?.name || "",
        subcategory_id:
          cee ||
          categoryModeSubcategory?.subcategory_id ||
          categoryModeSubcategory?.id ||
          "",
        brand: "",
        model: "",
        condition: "",
        age: "",
        warranty: "",
        price: "",
        district: "",
        state: "",
        contactNumber: "",
        description: "",
        dimensions: "",
      }),
      [b, ee] = n([]),
      [re, he] = n(null),
      [N, ve] = n(!1),
      [k, I] = n(!1),
      [f, P] = n(0),
      [te, T] = n("idle"),
      [ae, w] = n(""),
      [ke, X] = n(!1),
      [currentStep, setCurrentStep] = n(1),
      [i, se] = n({}),
      L = j(() => b.map((r) => URL.createObjectURL(r)), [b]);
    // Warn user before leaving with unsaved form data
    const hasUnsavedChanges = j(() => !!(t.title || t.description || t.price || b.length > 0), [t.title, t.description, t.price, b]);
    useBeforeUnload(hasUnsavedChanges && te !== "success");
    const activeAppMatcher = j(
      () =>
        buildActiveAppMatcher(
          activeApp,
          Array.isArray(categoryModeCategories) && categoryModeCategories.length > 0
            ? categoryModeCategories
            : ue,
        ),
      [activeApp, categoryModeCategories, ue],
    );
    const availableCategories = j(() => {
      const list = Array.isArray(ue) ? ue : [];
      if (!activeAppMatcher?.activeApp) return list;
      return list.filter((entry) => {
        const id = entry?.category_id || entry?.id;
        if (id != null && activeAppMatcher.categoryIds.has(String(id))) {
          return !0;
        }
        const name = normalizeCategoryValue(
          entry?.name || entry?.title || entry?.label || entry?.category_name || "",
        );
        return !!name && activeAppMatcher.categoryNames.has(name);
      });
    }, [ue, activeAppMatcher]);

    const resolvedCategoryId = j(() => {
      const normalized = normalizeCategoryValue(t.category);
      if (!normalized) return null;
      const match = availableCategories.find(
        (r) => normalizeCategoryValue(r?.name) === normalized,
      );
      return match?.category_id || match?.id || null;
    }, [t.category, availableCategories]);

    const resolvedSubcategories = j(() => {
      const normalizedCategory = normalizeCategoryValue(t.category);
      if (
        hasCategoryMode &&
        categoryModeCategory?.name &&
        normalizeCategoryValue(categoryModeCategory.name) === normalizedCategory &&
        Array.isArray(categoryModeSubcategories) &&
        categoryModeSubcategories.length > 0
      ) {
        return categoryModeSubcategories;
      }
      return Array.isArray(categorySubcategories) ? categorySubcategories : [];
    }, [
      hasCategoryMode,
      categoryModeCategory?.name,
      categoryModeSubcategories,
      categorySubcategories,
      t.category,
    ]);
    U(() => {
      if (Y || _Y || !categoryModeCategory?.name) return;
      R((r) => (r.category ? r : { ...r, category: categoryModeCategory.name }));
    }, [Y, _Y, categoryModeCategory?.name]);
    U(() => {
      if (!Y) return;
      const match = availableCategories.find(
        (r) =>
          String(r?.category_id || r?.id || "") === String(Y),
      );
      if (!match) return;
      R((r) => (r.category === match.name ? r : { ...r, category: match.name }));
      if (match?.name && match.name !== categoryModeCategory?.name) {
        selectCategoryMode(match);
      }
    }, [Y, availableCategories, categoryModeCategory?.name, selectCategoryMode]);
    U(() => {
      if (Y || !_Y) return;
      if (_Y === categoryModeCategory?.name) return;
      selectCategoryMode(_Y);
    }, [Y, _Y, categoryModeCategory?.name, selectCategoryMode]);
    U(() => {
      if (!activeAppMatcher?.activeApp) return;
      if (!t.category) return;
      const hasMatch = availableCategories.some(
        (r) => normalizeCategoryValue(r?.name) === normalizeCategoryValue(t.category),
      );
      if (hasMatch) return;
      R((r) => ({ ...r, category: "", subcategory_id: "" }));
    }, [activeAppMatcher, availableCategories, t.category]);
    U(() => {
      let active = !0;
      if (!resolvedCategoryId) {
        setCategorySubcategories([]);
        setSubcategoriesError("");
        setSubcategoriesLoading(!1);
        return;
      }
      setSubcategoriesLoading(!0);
      setSubcategoriesError("");
      fetchPostSubcategories(resolvedCategoryId)
        .then((r) => {
          if (!active) return;
          setCategorySubcategories(Array.isArray(r) ? r : []);
        })
        .catch((r) => {
          if (!active) return;
          setCategorySubcategories([]);
          setSubcategoriesError(r?.message || "Failed to load subcategories.");
        })
        .finally(() => {
          if (active) setSubcategoriesLoading(!1);
        });
      return () => {
        active = !1;
      };
    }, [resolvedCategoryId]);
    U(() => {
      if (!t.category || !t.subcategory_id) return;
      if (!Array.isArray(resolvedSubcategories) || resolvedSubcategories.length === 0) return;
      const hasMatch = resolvedSubcategories.some(
        (r) => String(r.subcategory_id || r.id || "") === String(t.subcategory_id),
      );
      if (!hasMatch) {
        R((r) => ({ ...r, subcategory_id: "" }));
      }
    }, [t.category, t.subcategory_id, resolvedSubcategories]);
    U(() => {
      if (t.subcategory_id) return;
      const candidateId =
        cee ||
        categoryModeSubcategory?.subcategory_id ||
        categoryModeSubcategory?.id ||
        "";
      if (!candidateId) return;
      if (!Array.isArray(resolvedSubcategories) || resolvedSubcategories.length === 0) return;
      const match = resolvedSubcategories.find(
        (r) => String(r.subcategory_id || r.id || "") === String(candidateId),
      );
      if (!match) return;
      R((r) => ({
        ...r,
        subcategory_id: String(match.subcategory_id || match.id || ""),
      }));
      selectSubcategoryMode(match);
    }, [
      cee,
      categoryModeSubcategory?.subcategory_id,
      categoryModeSubcategory?.id,
      resolvedSubcategories,
      t.subcategory_id,
      selectSubcategoryMode,
    ]);
    // Draft autosave every 30s
    U(() => {
      if (!hasUnsavedChanges) return;
      const timer = setTimeout(() => {
        try { localStorage.setItem("mhub_post_draft", JSON.stringify(t)); } catch {}
      }, 30000);
      return () => clearTimeout(timer);
    }, [t, hasUnsavedChanges]);
    // Load draft on mount
    U(() => {
      try {
        const draft = localStorage.getItem("mhub_post_draft");
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed && typeof parsed === "object" && parsed.title) {
            R((prev) => ({ ...prev, ...parsed }));
            y({ title: a("draft_restored") || "Draft Restored", description: a("draft_restored_desc") || "Your previous draft has been loaded." });
          }
        }
      } catch {}
    }, []);
    U(
      () => () => {
        L.forEach((r) => URL.revokeObjectURL(r));
      },
      [L],
    );
    const [ie, $] = n([]),
      [oe, C] = n(""),
      [fe, Ne] = n(0);
    U(() => {
      let r = !1;
      return (
        (async () => {
          try {
            C("");
            const d = await api.get("/subscriptions/plans");
            const l = d?.data ?? d;
            if (!r) {
              const planList = Array.isArray(l?.plans)
                ? l.plans
                : Array.isArray(l)
                  ? l
                  : [];
              const c = planList.map(We);
              $(c.length > 0 ? c : M), C("");
            }
          } catch (d) {
            if (r) return;
            $(M),
              C(d.message || "Tier data unavailable. Using fallback tiers."),
              y({
                title: "Tier fetch error",
                description: d.message,
                variant: "destructive",
              });
          }
        })(),
        () => {
          r = !0;
        }
      );
    }, [y, fe]);
    const g = j(
        () =>
          ie.find((r) => V(r.key) === O) || M.find((r) => r.key === O) || M[0],
        [ie, O],
      ),
      E = j(
        () => [
          {
            key: "title",
            label: "Title (5-100 chars)",
            met:
              t.title.trim().length >= 5 &&
              t.title.trim().length <= 100,
            hint: `${t.title.trim().length}/100`,
          },
          {
            key: "category",
            label: "Category selected",
            met: !!t.category,
            hint: t.category ? t.category : "Required",
          },
          {
            key: "brand_model",
            label: "Brand and model",
            met: t.brand.trim().length >= 2 && t.model.trim().length >= 2,
            hint: t.brand && t.model ? `${t.brand} ${t.model}` : "Required",
          },
          {
            key: "condition",
            label: "Condition selected",
            met: !!t.condition,
            hint: t.condition || "Required",
          },
          {
            key: "price",
            label: "Valid price",
            met: Number(t.price) > 0,
            hint: t.price ? `INR ${Number(t.price) || 0}` : "Required",
          },
          {
            key: "location",
            label: "District and state",
            met: !!(t.district.trim() && t.state.trim()),
            hint:
              t.district && t.state ? `${t.district}, ${t.state}` : "Required",
          },
          {
            key: "contact",
            label: "Contact number",
            met: /^([6-9][0-9]{9})$/.test(t.contactNumber),
            hint: t.contactNumber
              ? `${t.contactNumber.length}/10 digits`
              : "Required",
          },
          {
            key: "description",
            label: "Description (20-1000 chars)",
            met:
              t.description.trim().length >= 20 &&
              t.description.trim().length <= 1e3,
            hint: `${t.description.trim().length}/1000`,
          },
          {
            key: "images",
            label: `Images (1-${g?.maxImages || 1})`,
            met:
              b.length > 0 &&
              b.length <= (g?.maxImages || 1),
            hint: `${b.length}/${g?.maxImages || 1}`,
          },
        ],
        [t, b.length, g?.maxImages],
      ),
      de = E.filter((r) => r.met).length,
      le = E.length - de,
      x = (r) => {
        const { name: o, value: d } = r.target;
        R((s) => ({ ...s, [o]: d }));
      },
      B = (r) => (o) => {
        R((d) => ({
          ...d,
          [r]: o,
          ...(r === "category" ? { subcategory_id: "" } : {}),
        }));
        if (r === "category" && o) {
          selectCategoryMode(o);
        }
      },
      we = (r) => {
        const o = Array.from(r.target.files || []),
          d = ["image/jpeg", "image/png", "image/webp"];
        for (const s of o) {
          if (!d.includes(s.type)) {
            y({
              title: "Invalid file type",
              description: "Only JPG, PNG, WEBP allowed.",
              variant: "destructive",
            });
            return;
          }
          if (s.size > Xe) {
            y({
              title: "File too large",
              description: "Each image must be <2MB.",
              variant: "destructive",
            });
            return;
          }
        }
        if (o.length + b.length > (g?.maxImages || 1)) {
          y({
            title: "Too many images",
            description: `Max ${g?.maxImages || 1} images allowed.`,
            variant: "destructive",
          });
          return;
        }
        ee((s) => [...s, ...o]);
      },
      Ce = (r) => {
        if (!window.confirm("Remove this image?")) return;
        ee((o) => o.filter((d, s) => s !== r));
      };
    U(() => {
      if (Object.keys(i).length > 0) {
        const r = Object.keys(i)[0],
          o = document.querySelector(`[name="${r}"]`);
        o && o.focus();
      }
    }, [i]);
    const ne = z(() => {
        const r = {};
        return (
          (!t.title || t.title.length < 5 || t.title.length > 100) &&
            (r.title = "Title is required (5-100 chars)."),
          t.category || (r.category = "Category is required."),
          Array.isArray(resolvedSubcategories) &&
            resolvedSubcategories.length > 0 &&
            !t.subcategory_id &&
            (r.subcategory_id = "Subcategory is required."),
          (!t.brand || t.brand.length < 2) &&
            (r.brand = "Brand is required (min 2 chars)."),
          (!t.model || t.model.length < 2) &&
            (r.model = "Model is required (min 2 chars)."),
          t.condition || (r.condition = "Condition is required."),
          (!t.price || isNaN(t.price) || Number(t.price) <= 0) &&
            (r.price = "Price must be a positive number."),
          (!t.district || t.district.trim().length < 2) &&
            (r.district = "District is required."),
          (!t.state || t.state.trim().length < 2) &&
            (r.state = "State is required."),
          (!t.contactNumber || !/^([6-9][0-9]{9})$/.test(t.contactNumber)) &&
            (r.contactNumber =
              "Contact number must be 10 digits and start with 6-9."),
          (!t.description ||
            t.description.length < 20 ||
            t.description.length > 1e3) &&
            (r.description = "Description is required (20-1000 chars)."),
          b.length === 0 && (r.images = "At least one image is required."),
          r
        );
      }, [t, b, resolvedSubcategories]),
      Se = () => {
        const r = ne();
        if ((se(r), Object.keys(r).length > 0)) {
          y({
            title: "Missing or Invalid Information",
            description: Object.values(r).join(" "),
            variant: "destructive",
          });
          return;
        }
        X(!0);
      },
      q = z(() => {
        P(0), T("idle"), w("");
      }, []),
      Ie = z(
        (r) =>
          new Promise((d, s) => {
            const l = new XMLHttpRequest();
            l.open("POST", G("/posts")),
              (l.withCredentials = !0),
              (l.timeout = 18e4);
            try {
              const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
              if (csrfMatch) l.setRequestHeader("X-XSRF-TOKEN", decodeURIComponent(csrfMatch[1]));
            } catch {}
            try {
              const did = _getDeviceId();
              if (did) l.setRequestHeader("X-Device-Id", did);
            } catch {}
            (l.upload.onprogress = (c) => {
                if ((T("uploading"), c.lengthComputable && c.total > 0)) {
                  const ge = Math.max(
                    1,
                    Math.min(99, Math.round((c.loaded / c.total) * 100)),
                  );
                  P(ge), w(`Uploading media ${ge}%`);
                } else w("Uploading media...");
              }),
              (l.upload.onload = () => {
                P(100),
                  T("processing"),
                  w("Upload complete. Finalizing listing...");
              }),
              (l.onload = () => {
                let c = {};
                try {
                  c = l.responseText ? JSON.parse(l.responseText) : {};
                } catch {
                  c = {};
                }
                if (
                  l.status >= 200 &&
                  l.status < 300
                ) {
                  d(c);
                  return;
                }
                s(
                  new Error(
                    c?.error ||
                      c?.message ||
                      `Upload failed (HTTP ${l.status})`,
                  ),
                );
              }),
              (l.onerror = () =>
                s(
                  new Error("Network issue while uploading. Please try again."),
                )),
              (l.ontimeout = () =>
                s(
                  new Error(
                    "Upload timed out. Please retry with a smaller payload.",
                  ),
                )),
              l.send(r);
          }),
        [],
      ),
      me = async () => {
        I(!0), T("uploading"), P(0), w("Preparing upload...");
        const r = ne();
        if ((se(r), Object.keys(r).length > 0)) {
          y({
            title: "Missing or Invalid Information",
            description: Object.values(r).join(" "),
            variant: "destructive",
          }),
            q(),
            I(!1);
          return;
        }
        const o = De(),
          d = Me();
        if (!o || !d) {
          y({
            title: "Login required",
            description: "Please log in to publish a listing.",
            variant: "destructive",
          }),
            m("/login", { state: { returnTo: S.pathname + S.search } }),
            q(),
            I(!1);
          return;
        }
        try {
          const s = new FormData();
          Object.entries(t).forEach(([l, c]) => {
            c && s.append(l, c);
          }),
            b.forEach((l) => s.append("images", l)),
            re && s.append("audio", re, "voice-description.webm"),
            s.append("is_flash_sale", N ? "true" : "false"),
            await Ie(s, o),
            localStorage.setItem("mhub:first-post-created", "true"),
            localStorage.removeItem("mhub_post_draft"),
            y({
              title: "Post Created Successfully",
              description: "Your mobile listing has been created.",
            }),
            q(),
            m("/all-posts");
        } catch (s) {
          y({
            title: "Error",
            description: s.message || "Failed to create post.",
            variant: "destructive",
          }),
            q();
        }
        I(!1);
      };
    return ke
      ? e.createElement(
          "div",
          {
            className:
              "mhub-page-addpost min-h-screen mhub-premium-page bg-gradient-to-br from-sky-50 to-blue-100 dark:bg-gradient-to-br dark:from-sky-950 dark:to-blue-950",
          },
          e.createElement(
            "div",
            { className: "max-w-[640px] mx-auto px-4 py-8" },
            e.createElement(
              "div",
              { className: "mb-8" },
              e.createElement(
                v,
                { onClick: () => X(!1), variant: "outline", className: "mb-4" },
                e.createElement(be, { className: "w-4 h-4 mr-2" }),
                "Edit Post",
              ),
              e.createElement(
                "h1",
                {
                  className:
                    "text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                },
                "Preview Your Post",
              ),
              e.createElement(
                "p",
                { className: "text-gray-600 dark:text-gray-200" },
                "Review your listing before publishing",
              ),
            ),
            e.createElement(
              W,
              {
                className:
                  "mhub-premium-surface mhub-shine rounded-2xl overflow-hidden mb-6",
              },
              e.createElement(
                "div",
                { className: "flex flex-col sm:flex-row" },
                e.createElement(
                  "div",
                  {
                    className:
                      "w-full sm:w-80 h-48 sm:h-64 relative bg-gray-100 dark:bg-gray-700 flex-shrink-0 dark:bg-gray-950",
                  },
                  b[0]
                    ? e.createElement("img", {
                        src: L[0],
                        onError: (r) => {
                          (r.target.onerror = null),
                            (r.target.src = "/placeholder.svg");
                        },
                        alt: "Product",
                        className: "w-full h-full object-cover",
                      })
                    : e.createElement(
                        "div",
                        {
                          className:
                            "w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-300",
                        },
                        "No Image",
                      ),
                  e.createElement(
                    H,
                    {
                      className: `absolute top-4 left-4 ${g?.color || "bg-gray-400"} text-white dark:text-white`,
                    },
                    g?.name || "Basic",
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "flex-1 p-6" },
                  e.createElement(
                    "h3",
                    {
                      className:
                        "text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                    },
                    t.brand,
                    " ",
                    t.model,
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-4 dark:text-green-300",
                    },
                    "\u20B9",
                    (Number.parseInt(t.price, 10) || 0).toLocaleString(),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700 dark:text-gray-200",
                    },
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "span",
                        { className: "font-medium" },
                        "Condition:",
                      ),
                      " ",
                      t.condition,
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "span",
                        { className: "font-medium" },
                        "Age:",
                      ),
                      " ",
                      t.age,
                      " months",
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "span",
                        { className: "font-medium" },
                        "Warranty:",
                      ),
                      " ",
                      t.warranty,
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "span",
                        { className: "font-medium" },
                        "Location:",
                      ),
                      " ",
                      t.district,
                      ", ",
                      t.state,
                    ),
                  ),
                  t.description &&
                    e.createElement(
                      "p",
                      { className: "text-gray-600 dark:text-gray-400 mb-4 dark:text-gray-200" },
                      t.description,
                    ),
                ),
              ),
            ),
            e.createElement(
              "div",
              { className: "flex flex-col sm:flex-row gap-3 sm:gap-4 p-4" },
              e.createElement(
                v,
                {
                  onClick: () => X(!1),
                  variant: "outline",
                  className:
                    "flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
                },
                "Edit Post",
              ),
              e.createElement(
                v,
                {
                  onClick: me,
                  className:
                    "flex-1 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 shadow-lg shadow-emerald-500/25 hover:shadow-xl font-bold transition-all duration-200 dark:bg-gradient-to-r",
                  disabled: k,
                },
                k
                  ? te === "processing"
                    ? "Finalizing..."
                    : "Publishing..."
                  : "Publish Post",
              ),
            ),
            k &&
              e.createElement(
                "div",
                {
                  className:
                    "mt-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-3 dark:border-sky-600/40 dark:bg-sky-950/20",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "flex items-center justify-between text-xs text-sky-700 dark:text-sky-300 mb-1",
                  },
                  e.createElement("span", null, ae || "Uploading media..."),
                  e.createElement("span", null, f > 0 ? `${f}%` : ""),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "h-2 w-full rounded-full bg-sky-100 dark:bg-sky-950/20",
                  },
                  e.createElement("div", {
                    className:
                      "h-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300 dark:bg-gradient-to-r",
style: { width: `${Math.min(100, Math.max(5, f || 5))}%` },
                  }),
                ),
              ),
          ),
        )
      : e.createElement(
          "div",
          {
            className:
              "mhub-page-addpost min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 text-slate-900 dark:text-slate-100",
          },
          e.createElement(
            "div",
            { className: "max-w-2xl mx-auto px-4 py-6 pb-40" },

            /* Hero Header */
            e.createElement(
              "div",
              {
                className:
                  "rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 shadow-xl shadow-indigo-500/20 relative overflow-hidden mb-6",
              },
              e.createElement("div", {
                className: "absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none",
              }),
              e.createElement(
                "div",
                { className: "relative z-10 flex items-center justify-between gap-4 mb-4" },
                e.createElement(
                  Ue,
                  {
                    to: "/all-posts",
                    className:
                      "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-white/25 transition-all",
                  },
                  e.createElement(be, { className: "w-4 h-4" }),
                  a("back_to_browse", "Back"),
                ),
                e.createElement(
                  H,
                  {
                    className: `${g?.color || "bg-emerald-500"} text-white text-xs px-3.5 py-1 rounded-full font-bold shadow-md shadow-black/10`,
                  },
                  g?.name ? `${g.name} Tier • Max ${g.maxImages} Photo(s)` : "Basic Plan",
                ),
              ),
              e.createElement(
                "h1",
                { className: "text-2xl sm:text-3xl font-extrabold tracking-tight" },
                a("create_new_listing", "Create New Listing"),
              ),
              e.createElement(
                "p",
                { className: "text-blue-100 text-sm mt-1" },
                "Step-by-step easy product listing for maximum buyer visibility",
              ),
            ),

            /* Wizard Progress Stepper */
            e.createElement(
              "div",
              { className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6" },
              e.createElement(
                "div",
                { className: "flex items-center justify-between gap-2" },
                [
                  { num: 1, label: "Photos & Audio", icon: "📸" },
                  { num: 2, label: "Details", icon: "📝" },
                  { num: 3, label: "Price & Location", icon: "📍" },
                  { num: 4, label: "Preview", icon: "🚀" },
                ].map((step) => {
                  const isActive = currentStep === step.num;
                  const isDone = currentStep > step.num;
                  return e.createElement(
                    "button",
                    {
                      key: step.num,
                      type: "button",
                      onClick: () => {
                        if (isDone || (step.num === 4 && ke)) setCurrentStep(step.num);
                      },
                      className: `flex-1 flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 shadow-sm scale-105"
                          : isDone
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-slate-500 opacity-60"
                      }`,
                    },
                    e.createElement(
                      "span",
                      {
                        className: `w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                            : isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`,
                      },
                      isDone ? "✓" : step.icon,
                    ),
                    e.createElement("span", { className: "hidden sm:inline" }, step.label),
                  );
                }),
              ),
              /* Progress Bar */
              e.createElement(
                "div",
                { className: "w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden" },
                e.createElement("div", {
                  className: "bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 rounded-full",
                  style: { width: `${(currentStep / 4) * 100}%` },
                }),
              ),
            ),

            /* STEP 1: Photos & Audio Description */
            currentStep === 1 &&
              e.createElement(
                W,
                { className: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden" },
                e.createElement(
                  Te,
                  { className: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6" },
                  e.createElement(Le, { className: "text-xl font-bold flex items-center gap-2" }, "📸 Step 1: Add Photos & Voice Note"),
                  e.createElement(Pe, { className: "text-indigo-100 text-xs" }, "High quality photos get 5x more buyer responses"),
                ),
                e.createElement(
                  ce,
                  { className: "p-6 space-y-6" },
                  /* Drag & Drop Zone */
                  e.createElement(
                    "div",
                    { className: "space-y-3" },
                    e.createElement("div", { className: "flex items-center justify-between" },
                      e.createElement(u, { className: "font-bold text-sm" }, "Product Photos *"),
                      e.createElement("span", { className: "text-xs font-semibold text-slate-500" }, `${b.length} / ${g?.maxImages || 1} photo(s)`),
                    ),
                    e.createElement(
                      "label",
                      {
                        className: `flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                          b.length >= (g?.maxImages || 1)
                            ? "border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900"
                            : "border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 hover:border-indigo-500"
                        }`,
                      },
                      e.createElement(Be, { className: "w-10 h-10 text-indigo-500 mb-2 animate-bounce" }),
                      e.createElement("span", { className: "font-bold text-slate-800 dark:text-slate-200 text-sm" }, "Click or Drag Photos Here"),
                      e.createElement("span", { className: "text-xs text-slate-500 mt-1" }, `Up to ${g?.maxImages || 1} photo(s) on your ${g?.name || "Basic"} plan (JPG, PNG, WEBP <2MB)`),
                      e.createElement("input", {
                        type: "file",
                        accept: "image/jpeg,image/png,image/webp",
                        multiple: (g?.maxImages || 1) > 1,
                        onChange: we,
                        disabled: b.length >= (g?.maxImages || 1),
                        className: "hidden",
                      }),
                    ),
                    /* Photo Thumbnail Grid */
                    b.length > 0 &&
                      e.createElement(
                        "div",
                        { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2" },
                        b.map((file, idx) =>
                          e.createElement(
                            "div",
                            { key: idx, className: "relative aspect-square rounded-2xl overflow-hidden border-2 border-indigo-400 group shadow-md" },
                            e.createElement("img", {
                              src: L[idx],
                              alt: `Upload ${idx + 1}`,
                              className: "w-full h-full object-cover",
                            }),
                            e.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => Ce(idx),
                                className: "absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition",
                              },
                              "✕",
                            ),
                            e.createElement(
                              "span",
                              { className: "absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-full font-bold" },
                              `Photo ${idx + 1}`,
                            ),
                          ),
                        ),
                      ),
                    i.images && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.images),
                  ),

                  /* Audio Voice Note Section */
                  e.createElement(
                    "div",
                    { className: "pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3" },
                    e.createElement("div", { className: "flex items-center gap-2" },
                      e.createElement("span", { className: "text-lg" }, "🎙️"),
                      e.createElement(u, { className: "font-bold text-sm" }, "Audio Description (Optional)"),
                    ),
                    e.createElement("p", { className: "text-xs text-slate-500" }, "Record a short voice note (up to 60s) describing your item features for buyers."),
                    e.createElement(_e, { onRecordingComplete: (blob) => he(blob) }),
                    re && e.createElement("p", { className: "text-xs text-emerald-600 font-bold flex items-center gap-1" }, "✓ Voice note recorded successfully!"),
                  ),
                ),
              ),

            /* STEP 2: Details & Category */
            currentStep === 2 &&
              e.createElement(
                W,
                { className: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden" },
                e.createElement(
                  Te,
                  { className: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6" },
                  e.createElement(Le, { className: "text-xl font-bold flex items-center gap-2" }, "📝 Step 2: Item Details & Category"),
                  e.createElement(Pe, { className: "text-blue-100 text-xs" }, "Select the right category and describe your item"),
                ),
                e.createElement(
                  ce,
                  { className: "p-6 space-y-6" },
                  /* Category Cards */
                  e.createElement(
                    "div",
                    { className: "space-y-3" },
                    e.createElement(u, { className: "font-bold text-sm" }, "Choose Category *"),
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
                      availableCategories.map((catItem) => {
                        const name = catItem?.name || catItem;
                        const isSelected = t.category === name;
                        return e.createElement(
                          "button",
                          {
                            key: name,
                            type: "button",
                            onClick: () => B("category")(name),
                            className: `p-3.5 rounded-2xl border-2 text-left flex flex-col items-center justify-center gap-1 transition-all ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-md scale-[1.03] font-bold text-indigo-700 dark:text-indigo-300"
                                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                            }`,
                          },
                          e.createElement("span", { className: "text-2xl mb-1" }, "📦"),
                          e.createElement("span", { className: "text-xs font-semibold text-center line-clamp-1" }, name),
                        );
                      }),
                    ),
                    i.category && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.category),
                  ),

                  /* Subcategory Selection */
                  Array.isArray(resolvedSubcategories) && resolvedSubcategories.length > 0 &&
                    e.createElement(
                      "div",
                      { className: "space-y-2" },
                      e.createElement(u, { className: "font-bold text-sm" }, "Subcategory *"),
                      e.createElement(
                        F,
                        {
                          name: "subcategory_id",
                          value: t.subcategory_id,
                          onValueChange: (val) => R((prev) => ({ ...prev, subcategory_id: val })),
                        },
                        e.createElement(A, { className: "h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl" },
                          e.createElement(D, { placeholder: "Select subcategory" }),
                        ),
                        e.createElement(_, null,
                          resolvedSubcategories.map((sub) =>
                            e.createElement(p, { key: sub.subcategory_id || sub.id, value: String(sub.subcategory_id || sub.id) }, sub.name || sub.title),
                          ),
                        ),
                      ),
                    ),

                  /* Title Field with Auto-Suggest */
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    e.createElement("div", { className: "flex items-center justify-between" },
                      e.createElement(u, { className: "font-bold text-sm" }, "Title *"),
                      e.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (!t.category) {
                              y({ title: "Select Category", description: "Select a category first to auto-generate a title.", variant: "destructive" });
                              return;
                            }
                            const suggested = `Brand New ${t.category} Item (Excellent Condition)`;
                            R((prev) => ({ ...prev, title: suggested }));
                            y({ title: "✨ Title Auto-Filled", description: "Suggested title added!" });
                          },
                          className: "text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline",
                        },
                        "✨ Auto-Fill Title",
                      ),
                    ),
                    e.createElement(h, {
                      name: "title",
                      value: t.title,
                      onChange: x,
                      placeholder: "e.g., iPhone 14 Pro 128GB Deep Purple",
                      className: "h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl text-base",
                      maxLength: 100,
                    }),
                    e.createElement("p", { className: "text-xs text-slate-500 flex justify-between" },
                      e.createElement("span", null, "Clear title with brand + model"),
                      e.createElement("span", null, `${t.title.trim().length}/100`),
                    ),
                    i.title && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.title),
                  ),

                  /* Brand & Model */
                  e.createElement(
                    "div",
                    { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
                    e.createElement(
                      "div",
                      { className: "space-y-2" },
                      e.createElement(u, { className: "font-bold text-sm" }, "Brand *"),
                      e.createElement(h, {
                        name: "brand",
                        value: t.brand,
                        onChange: x,
                        placeholder: "e.g., Apple, Samsung, Nike",
                        className: "h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl",
                      }),
                      i.brand && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.brand),
                    ),
                    e.createElement(
                      "div",
                      { className: "space-y-2" },
                      e.createElement(u, { className: "font-bold text-sm" }, "Model *"),
                      e.createElement(h, {
                        name: "model",
                        value: t.model,
                        onChange: x,
                        placeholder: "e.g., iPhone 14 Pro, Air Max",
                        className: "h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl",
                      }),
                      i.model && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.model),
                    ),
                  ),

                  /* Condition Pills */
                  e.createElement(
                    "div",
                    { className: "space-y-3" },
                    e.createElement(u, { className: "font-bold text-sm" }, "Condition *"),
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5" },
                      ["New", "Like New", "Used", "Refurbished"].map((cond) => {
                        const isSelected = t.condition === cond;
                        return e.createElement(
                          "button",
                          {
                            key: cond,
                            type: "button",
                            onClick: () => B("condition")(cond),
                            className: `py-3 px-4 rounded-xl border-2 text-xs font-bold transition-all ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105"
                                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                            }`,
                          },
                          cond,
                        );
                      }),
                    ),
                    i.condition && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.condition),
                  ),

                  /* Description */
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    e.createElement(u, { className: "font-bold text-sm" }, "Description *"),
                    e.createElement($e, {
                      name: "description",
                      value: t.description,
                      onChange: x,
                      placeholder: "Describe the item condition, accessories included, reason for selling...",
                      className: "min-h-[120px] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-base p-3 resize-none",
                      maxLength: 1000,
                    }),
                    e.createElement("p", { className: "text-xs text-slate-500 flex justify-between" },
                      e.createElement("span", null, "Detailed descriptions attract serious buyers"),
                      e.createElement("span", null, `${t.description.trim().length}/1000`),
                    ),
                    i.description && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.description),
                  ),
                ),
              ),

            /* STEP 3: Price & Location */
            currentStep === 3 &&
              e.createElement(
                W,
                { className: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden" },
                e.createElement(
                  Te,
                  { className: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6" },
                  e.createElement(Le, { className: "text-xl font-bold flex items-center gap-2" }, "📍 Step 3: Pricing & Location"),
                  e.createElement(Pe, { className: "text-emerald-100 text-xs" }, "Set a competitive price and your district location"),
                ),
                e.createElement(
                  ce,
                  { className: "p-6 space-y-6" },
                  /* Price Input */
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    e.createElement(u, { className: "font-bold text-sm" }, "Price (₹ INR) *"),
                    e.createElement(
                      "div",
                      { className: "relative flex items-center" },
                      e.createElement("span", { className: "absolute left-4 text-xl font-bold text-emerald-600 dark:text-emerald-400" }, "₹"),
                      e.createElement(h, {
                        name: "price",
                        type: "number",
                        value: t.price,
                        onChange: x,
                        placeholder: "e.g., 15000",
                        className: "h-14 pl-10 text-xl font-bold border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-700 dark:text-emerald-300 focus:border-emerald-500",
                      }),
                    ),
                    i.price && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.price),
                  ),

                  /* District & State */
                  e.createElement(
                    "div",
                    { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
                    e.createElement(
                      "div",
                      { className: "space-y-2" },
                      e.createElement(u, { className: "font-bold text-sm" }, "District / City *"),
                      e.createElement(h, {
                        name: "district",
                        value: t.district,
                        onChange: x,
                        placeholder: "e.g., Mumbai, Bengaluru",
                        className: "h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl",
                      }),
                      i.district && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.district),
                    ),
                    e.createElement(
                      "div",
                      { className: "space-y-2" },
                      e.createElement(u, { className: "font-bold text-sm" }, "State *"),
                      e.createElement(h, {
                        name: "state",
                        value: t.state,
                        onChange: x,
                        placeholder: "e.g., Maharashtra, Karnataka",
                        className: "h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl",
                      }),
                      i.state && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.state),
                    ),
                  ),

                  /* Contact Number */
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    e.createElement(u, { className: "font-bold text-sm" }, "Mobile Contact Number *"),
                    e.createElement(h, {
                      name: "contactNumber",
                      value: t.contactNumber,
                      onChange: x,
                      placeholder: "10-digit mobile (e.g., 9876543210)",
                      className: "h-12 border-2 border-slate-200 dark:border-slate-800 rounded-xl",
                      maxLength: 10,
                    }),
                    i.contactNumber && e.createElement("p", { className: "text-xs text-red-500 font-semibold" }, i.contactNumber),
                  ),

                  /* Flash Sale Highlight Toggle */
                  e.createElement(
                    "div",
                    { className: "p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4" },
                    e.createElement(
                      "div",
                      null,
                      e.createElement("p", { className: "font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1" }, "⚡ Flash Sale Highlight"),
                      e.createElement("p", { className: "text-xs text-amber-700 dark:text-amber-300" }, "Highlight this listing as an urgent deal"),
                    ),
                    e.createElement("input", {
                      type: "checkbox",
                      checked: N,
                      onChange: (e) => ve(e.target.checked),
                      className: "w-6 h-6 rounded accent-amber-600 cursor-pointer",
                    }),
                  ),
                ),
              ),

            /* STEP 4: Live Buyer Card Preview & Submit */
            (currentStep === 4 || ke) &&
              e.createElement(
                W,
                { className: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden" },
                e.createElement(
                  Te,
                  { className: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6" },
                  e.createElement(Le, { className: "text-xl font-bold flex items-center gap-2" }, "🚀 Step 4: Preview & Publish"),
                  e.createElement(Pe, { className: "text-purple-100 text-xs" }, "Review your listing before making it live"),
                ),
                e.createElement(
                  ce,
                  { className: "p-6 space-y-6" },
                  /* Live Marketplace Card Snippet */
                  e.createElement(
                    "div",
                    { className: "border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-4 space-y-4" },
                    e.createElement("div", { className: "flex flex-col sm:flex-row gap-4 items-center" },
                      e.createElement("div", { className: "w-full sm:w-40 aspect-square rounded-xl overflow-hidden bg-slate-200 relative flex-shrink-0" },
                        b[0]
                          ? e.createElement("img", { src: L[0], alt: "Preview", className: "w-full h-full object-cover" })
                          : e.createElement("div", { className: "w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold" }, "No Photo"),
                        e.createElement(H, { className: "absolute top-2 left-2 bg-indigo-600 text-white text-[10px]" }, t.category || "General"),
                      ),
                      e.createElement("div", { className: "flex-1 space-y-2 w-full" },
                        e.createElement("h3", { className: "font-extrabold text-lg text-slate-900 dark:text-slate-100 line-clamp-2" }, t.title || `${t.brand} ${t.model}`),
                        e.createElement("p", { className: "text-2xl font-black text-emerald-600 dark:text-emerald-400" }, `₹${(Number(t.price) || 0).toLocaleString()}`),
                        e.createElement("div", { className: "flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300" },
                          e.createElement("span", { className: "bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 rounded-full font-semibold" }, `Condition: ${t.condition || "N/A"}`),
                          e.createElement("span", { className: "bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 rounded-full font-semibold" }, `📍 ${t.district}, ${t.state}`),
                        ),
                      ),
                    ),
                    t.description && e.createElement("p", { className: "text-xs text-slate-600 dark:text-slate-300 line-clamp-3 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800" }, `"${t.description}"`),
                  ),

                  /* Upload Progress Indicator */
                  k &&
                    e.createElement(
                      "div",
                      { className: "p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2" },
                      e.createElement("div", { className: "flex justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300" },
                        e.createElement("span", null, ae || "Uploading media..."),
                        e.createElement("span", null, `${f}%`),
                      ),
                      e.createElement("div", { className: "w-full bg-indigo-100 dark:bg-indigo-950 h-2.5 rounded-full overflow-hidden" },
                        e.createElement("div", { className: "bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 rounded-full", style: { width: `${Math.max(5, f)}%` } }),
                      ),
                    ),

                  /* Final Submit Button */
                  e.createElement(
                    v,
                    {
                      onClick: me,
                      disabled: k,
                      className: "w-full h-14 text-lg font-extrabold bg-gradient-to-r from-emerald-500 via-teal-600 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white rounded-2xl shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.98]",
                    },
                    k ? (te === "processing" ? "Finalizing Listing..." : "Publishing...") : "🚀 Publish Listing Now",
                  ),
                ),
              ),

            /* Floating Bottom Navigation Controls Bar */
            e.createElement(
              "div",
              { className: "fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl" },
              e.createElement(
                "div",
                { className: "max-w-2xl mx-auto flex items-center justify-between gap-3" },
                e.createElement(
                  v,
                  {
                    type: "button",
                    variant: "outline",
                    disabled: currentStep === 1 || k,
                    onClick: () => {
                      if (currentStep > 1) {
                        if (currentStep === 4) X(false);
                        setCurrentStep((prev) => prev - 1);
                      }
                    },
                    className: "px-5 h-12 rounded-xl font-bold border-2 border-slate-300 dark:border-slate-700",
                  },
                  "← Back",
                ),
                e.createElement(
                  "span",
                  { className: "text-xs font-extrabold text-slate-500 uppercase tracking-wider" },
                  `Step ${currentStep} of 4`,
                ),
                currentStep < 4
                  ? e.createElement(
                      v,
                      {
                        type: "button",
                        onClick: () => {
                          if (currentStep === 1) {
                            if (b.length === 0) {
                              y({ title: "Photo Required", description: "Please upload at least 1 photo.", variant: "destructive" });
                              return;
                            }
                            setCurrentStep(2);
                          } else if (currentStep === 2) {
                            if (!t.title || t.title.trim().length < 5) {
                              y({ title: "Title Required", description: "Enter a valid title (min 5 characters).", variant: "destructive" });
                              return;
                            }
                            if (!t.category) {
                              y({ title: "Category Required", description: "Select a category.", variant: "destructive" });
                              return;
                            }
                            if (!t.condition) {
                              y({ title: "Condition Required", description: "Select condition.", variant: "destructive" });
                              return;
                            }
                            setCurrentStep(3);
                          } else if (currentStep === 3) {
                            if (!t.price || isNaN(t.price) || Number(t.price) <= 0) {
                              y({ title: "Price Required", description: "Enter a valid price in INR.", variant: "destructive" });
                              return;
                            }
                            if (!t.contactNumber || !/^([6-9][0-9]{9})$/.test(t.contactNumber)) {
                              y({ title: "Contact Number Required", description: "Valid 10-digit mobile number starting with 6-9 required.", variant: "destructive" });
                              return;
                            }
                            X(true);
                            setCurrentStep(4);
                          }
                        },
                        className: "px-6 h-12 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20",
                      },
                      "Next Step →",
                    )
                  : e.createElement(
                      v,
                      {
                        type: "button",
                        onClick: me,
                        disabled: k,
                        className: "px-6 h-12 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20",
                      },
                      k ? "Publishing..." : "🚀 Submit",
                    ),
              ),
            ),
          ),
        );
  };
var lr = He;
export { lr as default };
