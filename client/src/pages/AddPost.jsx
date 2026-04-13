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
import { buildActiveAppMatcher } from "@/utils/categoryModeFilters";
const Xe = 2 * 1024 * 1024,
  M = [
    { key: "basic", name: "Basic", maxImages: 1, color: "bg-gray-500" },
    { key: "bronze", name: "Bronze", maxImages: 3, color: "bg-amber-500" },
    { key: "silver", name: "Silver", maxImages: 5, color: "bg-blue-500" },
    { key: "premium", name: "Premium", maxImages: 10, color: "bg-yellow-500" },
  ],
  V = (a) => {
    if (!a) return "basic";
    const m = String(a).trim().toLowerCase();
    return m.includes("premium")
      ? "premium"
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
              (l.timeout = 18e4),
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
            { className: "max-w-4xl mx-auto px-4 py-8" },
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
                    "text-3xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                },
                "Preview Your Post",
              ),
              e.createElement(
                "p",
                { className: "text-gray-600 dark:text-gray-300 dark:text-gray-200" },
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
                        "text-2xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100",
                    },
                    t.brand,
                    " ",
                    t.model,
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "text-3xl font-bold text-green-600 dark:text-green-400 mb-4 dark:text-green-300",
                    },
                    "\u20B9",
                    (Number.parseInt(t.price, 10) || 0).toLocaleString(),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700 dark:text-gray-300 dark:text-gray-200",
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
                    "mt-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-3 dark:border dark:border-sky-600/40 dark:bg-sky-950/20",
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
                      "h-2 w-full rounded-full bg-sky-100 dark:bg-sky-900 dark:bg-sky-950/20",
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
              "mhub-page-addpost min-h-screen mhub-premium-page bg-gradient-to-br from-sky-50 to-blue-100 dark:bg-gradient-to-br dark:from-sky-950 dark:to-blue-950",
          },
          e.createElement(
            "div",
            { className: "max-w-4xl mx-auto px-4 py-4 pb-40" },
            " ",
            e.createElement(
              "div",
              { className: "rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 overflow-hidden relative mb-6 dark:bg-gradient-to-br" },
              e.createElement("div", {
                className: "absolute inset-0 opacity-10",
                style: { backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' },
              }),
              e.createElement(
                "div",
                { className: "relative z-10 px-5 py-4 sm:py-5" },
                e.createElement(
                  Ue,
                  {
                    to: "/all-posts",
                    className:
                      "inline-flex items-center text-white/80 hover:text-white mb-3 font-medium transition-colors duration-200 text-sm dark:text-white/80 dark:hover:text-white",
                  },
                  e.createElement(be, { className: "w-4 h-4 mr-2" }),
                  a("back_to_browse"),
                ),
                e.createElement(
                  "p",
                  { className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 mb-1 dark:text-white/70" },
                  "Create listing",
                ),
                e.createElement(
                  "div",
                  { className: "flex items-center gap-3" },
                  e.createElement(
                    "h1",
                    { className: "text-lg sm:text-xl font-bold text-white dark:text-white" },
                    a("create_new_listing"),
                  ),
                  e.createElement(
                    H,
                    {
                      className: `${g?.color || "bg-gray-400"} text-white text-xs px-3 py-1 shadow-lg shadow-current/20 rounded-lg font-bold dark:text-white`,
                    },
                    g?.icon
                      ? e.createElement(g.icon, { className: "w-4 h-4 mr-1" })
                      : null,
                    g?.name ? `${g.name} ${a("tier")}` : a("tier"),
                  ),
                ),
                e.createElement(
                  "p",
                  { className: "text-white/70 text-sm mt-1 dark:text-white/70" },
                  a("fill_details"),
                ),
              ),
            ),
            Z &&
              e.createElement(
                "div",
                {
                  className:
                    "mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 flex flex-wrap items-center justify-between gap-2 dark:border dark:border-amber-600/40 dark:bg-amber-950/20",
                },
                e.createElement(
                  "p",
                  { className: "text-sm text-amber-800 dark:text-amber-300 dark:text-amber-200" },
                  Z,
                ),
                e.createElement(
                  v,
                  {
                    type: "button",
                    variant: "outline",
                    className: "border-amber-300 text-amber-800 dark:border-amber-600/40 dark:text-amber-200",
                    onClick: () => xe((r) => r + 1),
                  },
                  "Retry",
                ),
              ),
            oe &&
              e.createElement(
                "div",
                {
                  className:
                    "mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 flex flex-wrap items-center justify-between gap-2 dark:border dark:border-amber-600/40 dark:bg-amber-950/20",
                },
                e.createElement(
                  "p",
                  { className: "text-sm text-amber-800 dark:text-amber-300 dark:text-amber-200" },
                  oe,
                ),
                e.createElement(
                  v,
                  {
                    type: "button",
                    variant: "outline",
                    className: "border-amber-300 text-amber-800 dark:border-amber-600/40 dark:text-amber-200",
                    onClick: () => Ne((r) => r + 1),
                  },
                  "Retry",
                ),
              ),
            e.createElement(
              W,
              {
                className:
                  "mb-4 border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/20 dark:border dark:border-sky-600/40",
              },
              e.createElement(
                ce,
                { className: "p-4" },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between gap-3 mb-3" },
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm font-semibold text-sky-800 dark:text-sky-300 dark:text-sky-200",
                    },
                    a("pre_submit_checklist", "Pre-submit checklist"),
                  ),
                  e.createElement(
                    H,
                    {
                      className: `${le === 0 ? "bg-emerald-600 shadow-sm shadow-emerald-200" : "bg-sky-600"} text-white transition-colors dark:text-white`,
                    },
                    de,
                    "/",
                    E.length,
                    " complete",
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "grid grid-cols-1 md:grid-cols-2 gap-2" },
                  E.map((r) =>
                    e.createElement(
                      "div",
                      {
                        key: r.key,
                        className: `rounded-lg border px-3 py-2 text-xs transition-all duration-300 dark:border ${r.met ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900"}`,
                      },
                      e.createElement(
                        "p",
                        {
                          className: `font-semibold ${r.met ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"}`,
                        },
                        r.met ? "Complete:" : "Pending:",
                        " ",
                        r.label,
                      ),
                      e.createElement(
                        "p",
                        { className: "text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                        r.hint,
                      ),
                    ),
                  ),
                ),
                le > 0 &&
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-xs text-amber-700 dark:text-amber-300 mt-3",
                    },
                    a("complete_pending_hint", "Complete pending fields above to reduce submit errors and rework."),
                  ),
              ),
            ),
            e.createElement(
              W,
              {
                className:
                  "mhub-premium-surface mhub-shine rounded-2xl overflow-hidden",
              },
              e.createElement(
                Te,
                {
                  className:
                    "bg-gradient-to-r from-sky-500 to-blue-600 text-white dark:bg-gradient-to-r dark:text-white",
                },
                e.createElement(
                  Le,
                  { className: "text-lg sm:text-xl font-bold" },
                  a("mobile_phone_details"),
                ),
                e.createElement(
                  Pe,
                  { className: "text-sky-100 dark:text-sky-200" },
                  a("provide_accurate_info"),
                ),
              ),
              e.createElement(
                ce,
                { className: "p-5 sm:p-6 bg-gradient-to-br from-white to-slate-50/50 dark:from-gray-800 dark:to-gray-800 dark:bg-gradient-to-br" },
                e.createElement(
                  "div",
                  { className: "space-y-6", role: "form", "aria-label": a("create_new_listing") },
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 before:content-[''] before:w-1 before:h-4 before:rounded-full before:bg-gradient-to-b before:from-blue-500 before:to-indigo-500 dark:text-gray-100 dark:before:bg-gradient-to-b",
                      },
                      a("basic_information"),
                    ),
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "title",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("title"),
                          " *",
                        ),
                        e.createElement(h, {
                          id: "title",
                          name: "title",
                          value: t.title,
                          onChange: x,
                          placeholder: "e.g., iPhone 14 Pro for Sale",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          required: !0,
                          maxLength: 100,
                          minLength: 5,
                          "aria-describedby": i.title ? "title-error" : undefined,
                          "aria-invalid": !!i.title,
                        }),
                        i.title &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "title-error", "aria-live": "polite" },
                            i.title,
                          ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-gray-500 dark:text-gray-400 mt-1 dark:text-gray-300",
                          },
                          "Use a clear title with brand + model. ",
                          t.title.trim().length,
                          "/100",
                        ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("category"),
                          " *",
                        ),
                        hasCategoryMode
                          ? e.createElement(h, {
                              name: "category",
                              value: categoryModeCategory?.name || t.category,
                              readOnly: !0,
                              disabled: !0,
                              className:
                                "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed dark:border-2 dark:border-gray-700 dark:bg-gray-950",
                            })
                          : Y
                          ? e.createElement(h, {
                              name: "category",
                              value: t.category,
                              readOnly: !0,
                              disabled: !0,
                              className:
                                "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed dark:border-2 dark:border-gray-700 dark:bg-gray-950",
                            })
                          : e.createElement(
                              F,
                              {
                                name: "category",
                                value: t.category,
                                onValueChange: B("category"),
                                required: !0,
                              },
                              e.createElement(
                                A,
                                {
                                  className:
                                    "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                                },
                                e.createElement(D, {
                                  placeholder: "Select category",
                                }),
                              ),
                              e.createElement(
                                _,
                                null,
                                availableCategories.map((r) =>
                                  e.createElement(
                                    p,
                                    { key: r.id || r, value: r.name || r },
                                    r.name || r,
                                  ),
                                ),
                              ),
                            ),
                        i.category &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "category-error", "aria-live": "polite" },
                            i.category,
                          ),
                      ),
                      t.category &&
                        e.createElement(
                          "div",
                          null,
                          e.createElement(
                            u,
                            {
                              className:
                                "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                            },
                            a("subcategory", "Subcategory"),
                            Array.isArray(resolvedSubcategories) &&
                              resolvedSubcategories.length > 0
                              ? " *"
                              : "",
                          ),
                          e.createElement(
                            F,
                            {
                              name: "subcategory_id",
                              value: t.subcategory_id,
                              onValueChange: B("subcategory_id"),
                              required:
                                Array.isArray(resolvedSubcategories) &&
                                resolvedSubcategories.length > 0,
                              disabled:
                                subcategoriesLoading ||
                                !Array.isArray(resolvedSubcategories) ||
                                resolvedSubcategories.length === 0,
                            },
                            e.createElement(
                              A,
                              {
                                className:
                                  "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                              },
                              e.createElement(D, {
                                placeholder:
                                  subcategoriesLoading
                                    ? "⏳ Loading subcategories..."
                                    : a("select_subcategory") ||
                                      "Select subcategory",
                              }),
                            ),
                            e.createElement(
                              _,
                              null,
                              Array.isArray(resolvedSubcategories) &&
                                resolvedSubcategories.length > 0
                                ? resolvedSubcategories.map((r) =>
                                    e.createElement(
                                      p,
                                      {
                                        key: r.subcategory_id || r.id || r.name,
                                        value: String(r.subcategory_id || r.id),
                                      },
                                      r.name,
                                    ),
                                  )
                                : e.createElement(
                                    p,
                                    { key: "no-subcategories", value: "none" },
                                    a("no_subcategories", "No subcategories"),
                                  ),
                            ),
                          ),
                          subcategoriesError &&
                            e.createElement(
                              "div",
                              { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert" },
                              subcategoriesError,
                            ),
                          i.subcategory_id &&
                            e.createElement(
                              "div",
                              { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "subcategory-error", "aria-live": "polite" },
                              i.subcategory_id,
                            ),
                        ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("brand"),
                          " *",
                        ),
                        e.createElement(
                          F,
                          {
                            name: "brand",
                            value: t.brand,
                            onValueChange: B("brand"),
                            required: !0,
                          },
                          e.createElement(
                            A,
                            {
                              className:
                                "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                            },
                            e.createElement(D, {
                              placeholder: a("select_brand"),
                            }),
                          ),
                          e.createElement(
                            _,
                            null,
                            ye.map((r) =>
                              e.createElement(
                                p,
                                { key: r.id || r, value: r.name || r },
                                r.name || r,
                              ),
                            ),
                          ),
                        ),
                        i.brand &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "brand-error", "aria-live": "polite" },
                            i.brand,
                          ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "model",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("model"),
                          " *",
                        ),
                        e.createElement(h, {
                          id: "model",
                          name: "model",
                          value: t.model,
                          onChange: x,
                          placeholder: "e.g., iPhone 14 Pro, Galaxy S23",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          required: !0,
                          "aria-describedby": i.model ? "model-error" : undefined,
                          "aria-invalid": !!i.model,
                        }),
                        i.model &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "model-error", "aria-live": "polite" },
                            i.model,
                          ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("condition"),
                          " *",
                        ),
                        e.createElement(
                          F,
                          {
                            value: t.condition || "",
                            onValueChange: B("condition"),
                          },
                          e.createElement(
                            A,
                            {
                              className:
                                "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                            },
                            e.createElement(D, {
                              placeholder: a("select_condition"),
                            }),
                          ),
                          e.createElement(
                            _,
                            null,
                            e.createElement(p, { value: "new" }, "New"),
                            e.createElement(
                              p,
                              { value: "like-new" },
                              "Like New",
                            ),
                            e.createElement(
                              p,
                              { value: "excellent" },
                              "Excellent",
                            ),
                            e.createElement(p, { value: "good" }, "Good"),
                            e.createElement(p, { value: "fair" }, "Fair"),
                          ),
                        ),
                        i.condition &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "condition-error", "aria-live": "polite" },
                            i.condition,
                          ),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 dark:text-gray-100",
                      },
                      e.createElement("span", { className: "inline-block h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 dark:bg-gradient-to-b" }),
                      a("additional_details"),
                    ),
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "age",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("age_months"),
                        ),
                        e.createElement(h, {
                          id: "age",
                          name: "age",
                          type: "number",
                          value: t.age,
                          onChange: x,
                          placeholder: "0-48 months",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          min: "0",
                          max: "48",
                        }),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("warranty_status"),
                        ),
                        e.createElement(
                          F,
                          {
                            value: t.warranty || "",
                            onValueChange: B("warranty"),
                          },
                          e.createElement(
                            A,
                            {
                              className:
                                "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                            },
                            e.createElement(D, {
                              placeholder: "Warranty status",
                            }),
                          ),
                          e.createElement(
                            _,
                            null,
                            e.createElement(
                              p,
                              { value: "active" },
                              "Under Warranty",
                            ),
                            e.createElement(
                              p,
                              { value: "expired" },
                              "Warranty Expired",
                            ),
                            e.createElement(
                              p,
                              { value: "no-warranty" },
                              "No Warranty",
                            ),
                          ),
                        ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "dimensions",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          a("dimensions"),
                        ),
                        e.createElement(h, {
                          id: "dimensions",
                          name: "dimensions",
                          value: t.dimensions,
                          onChange: x,
                          placeholder: "e.g., 6.1 inch",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                        }),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 before:content-[''] before:w-1 before:h-4 before:rounded-full before:bg-gradient-to-b before:from-blue-500 before:to-indigo-500 dark:text-gray-100 dark:before:bg-gradient-to-b",
                      },
                      a("pricing_location"),
                    ),
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "price",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          "Price (\u20B9) *",
                        ),
                        e.createElement(h, {
                          id: "price",
                          name: "price",
                          type: "number",
                          value: t.price,
                          onChange: x,
                          placeholder: "Enter price",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          required: !0,
                          "aria-describedby": i.price ? "price-error" : undefined,
                          "aria-invalid": !!i.price,
                        }),
                        i.price &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "price-error", "aria-live": "polite" },
                            i.price,
                          ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-gray-500 dark:text-gray-400 mt-1 dark:text-gray-300",
                          },
                          "Enter your expected final selling price.",
                        ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "district",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          "District *",
                        ),
                        e.createElement(h, {
                          id: "district",
                          name: "district",
                          value: t.district,
                          onChange: x,
                          placeholder: "Enter district",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          required: !0,
                          "aria-describedby": i.district ? "district-error" : undefined,
                          "aria-invalid": !!i.district,
                        }),
                        i.district &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "district-error", "aria-live": "polite" },
                            i.district,
                          ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "state",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          "State *",
                        ),
                        e.createElement(h, {
                          id: "state",
                          name: "state",
                          value: t.state,
                          onChange: x,
                          placeholder: "Enter state",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          required: !0,
                          "aria-describedby": i.state ? "state-error" : undefined,
                          "aria-invalid": !!i.state,
                        }),
                        i.state &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "state-error", "aria-live": "polite" },
                            i.state,
                          ),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h3",
                      {
                        className:
                          "text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 before:content-[''] before:w-1 before:h-4 before:rounded-full before:bg-gradient-to-b before:from-blue-500 before:to-indigo-500 dark:text-gray-100 dark:before:bg-gradient-to-b",
                      },
                      "Contact & Images",
                    ),
                    e.createElement(
                      "div",
                      { className: "space-y-6" },
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "contactNumber",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          "Contact Number *",
                        ),
                        e.createElement(h, {
                          id: "contactNumber",
                          name: "contactNumber",
                          type: "tel",
                          value: t.contactNumber,
                          onChange: x,
                          placeholder: "+91 XXXXXXXXXX",
                          className:
                            "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          required: !0,
                          "aria-describedby": i.contactNumber ? "contactNumber-error" : undefined,
                          "aria-invalid": !!i.contactNumber,
                        }),
                        i.contactNumber &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "contactNumber-error", "aria-live": "polite" },
                            i.contactNumber,
                          ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-gray-500 dark:text-gray-400 mt-1 dark:text-gray-300",
                          },
                          "Use a 10-digit Indian number starting with 6-9.",
                        ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          "Images (1-",
                          g?.maxImages || 1,
                          " photos) *",
                        ),
                        e.createElement(
                          "div",
                          { className: "mt-2" },
                          e.createElement(
                            "div",
                            {
                              className:
                                "border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 transition-all duration-300 hover:border-solid hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.98] dark:border-2 dark:border-dashed dark:border-blue-600/40 dark:bg-gradient-to-br dark:hover:border-solid dark:hover:border-blue-600/40 dark:hover:bg-gradient-to-br",
                              "aria-label": a("upload_images", { defaultValue: "Upload product images" }),
                            },
                            e.createElement(
                              "div",
                              { className: "text-center dark:text-center" },
                              e.createElement(Be, {
                                className:
                                  "mx-auto h-12 w-12 text-sky-400 mb-4 dark:text-sky-200",
                              }),
                              e.createElement(
                                "div",
                                null,
                                e.createElement(
                                  "label",
                                  {
                                    htmlFor: "images",
                                    className: "cursor-pointer",
                                  },
                                  e.createElement(
                                    v,
                                    {
                                      type: "button",
                                      className:
                                        "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-200 dark:bg-gradient-to-r",
                                      onClick: () =>
                                        document
                                          .getElementById("images")
                                          .click(),
                                    },
                                    "Upload Images",
                                  ),
                                  e.createElement("input", {
                                    id: "images",
                                    name: "images",
                                    type: "file",
                                    multiple: !0,
                                    accept: "image/*",
                                    onChange: we,
                                    className: "sr-only",
                                  }),
                                ),
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300",
                                  },
                                  "Selected: ",
                                  b.length,
                                  "/",
                                  g?.maxImages || 1,
                                ),
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300",
                                  },
                                  "PNG, JPG up to 2MB each \u2022 Max ",
                                  g?.maxImages || 1,
                                  " images",
                                ),
                              ),
                            ),
                          ),
                          b.length > 0 &&
                            e.createElement(
                              "div",
                              {
                                className:
                                  "mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3",
                              },
                              b.map((r, o) =>
                                e.createElement(
                                  "div",
                                  { key: o, className: "relative" },
                                  e.createElement("img", {
                                    src: L[o],
                                    onError: (d) => {
                                      (d.target.onerror = null),
                                        (d.target.src = "/placeholder.svg");
                                    },
                                    alt: `Upload ${o + 1}`,
                                    className:
                                      "h-24 w-full object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:ring-2 hover:ring-blue-400 transition-all duration-200 cursor-pointer dark:border-2 dark:border-gray-700",
                                  }),
                                  e.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => Ce(o),
                                      className:
                                        "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-all duration-200 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 hover:scale-110 dark:bg-red-800/30 dark:text-white dark:hover:bg-red-950/20 dark:hover:text-red-300",
                                    },
                                    "\xD7",
                                  ),
                                ),
                              ),
                            ),
                        ),
                        i.images &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-2 dark:text-red-300", role: "alert", id: "images-error", "aria-live": "polite" },
                            i.images,
                          ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          u,
                          {
                            htmlFor: "description",
                            className:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200",
                          },
                          "Description *",
                        ),
                        e.createElement($e, {
                          id: "description",
                          name: "description",
                          value: t.description,
                          onChange: x,
                          placeholder:
                            "Add any additional details about your mobile phone...",
                          className:
                            "mt-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                          rows: 4,
                          required: !0,
                          minLength: 20,
                          maxLength: 1e3,
                          "aria-describedby": i.description ? "description-error" : undefined,
                          "aria-invalid": !!i.description,
                        }),
                        i.description &&
                          e.createElement(
                            "div",
                            { className: "text-red-500 dark:text-red-400 text-xs mt-1 dark:text-red-300", role: "alert", id: "description-error", "aria-live": "polite" },
                            i.description,
                          ),
                        e.createElement(
                          "p",
                          {
                            className:
                              `text-xs mt-1 transition-colors duration-300 ${t.description.trim().length > 900 ? "text-red-500 dark:text-red-400" : t.description.trim().length > 750 ? "text-amber-500 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`,
                          },
                          "Share condition, accessories, and reason for selling. ",
                          t.description.trim().length,
                          "/1000",
                        ),
                      ),
                      e.createElement(_e, {
                        onAudioReady: (r) => he(r),
                        existingAudio: null,
                      }),
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex flex-col gap-3 p-4 border-2 border-dashed border-orange-200 dark:border-orange-800/30 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 shadow-sm hover:shadow-md transition-all duration-200 dark:border-2 dark:border-dashed dark:border-orange-600/40 dark:bg-gradient-to-br",
                        },
                        e.createElement(
                          "div",
                          { className: "flex items-center justify-between" },
                          e.createElement(
                            "div",
                            { className: "flex items-center gap-2" },
                            e.createElement(
                              "span",
                              { className: "text-xl" },
                              "\u23F3",
                            ),
                            e.createElement(
                              "div",
                              null,
                              e.createElement(
                                "h3",
                                {
                                  className:
                                    "text-sm font-semibold text-orange-800 dark:text-orange-300 dark:text-orange-200",
                                },
                                a("flash_sale_label", "24-Hour Flash Sale"),
                              ),
                              e.createElement(
                                "p",
                                {
                                  className:
                                    "text-xs text-gray-600 dark:text-gray-400 dark:text-gray-200",
                                },
                                "Auto-expires in 24 hours \u2022 Gets 2x visibility boost",
                              ),
                            ),
                          ),
                          e.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () => ve(!N),
                              className: `relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${N ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"}`,
                            },
                            e.createElement("span", {
                              className: `inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform dark:bg-slate-900${N ? "translate-x-7" : "translate-x-1"}`,
                            }),
                          ),
                        ),
                        N &&
                          e.createElement(
                            "div",
                            {
                              className:
                                "text-xs text-center text-orange-600 bg-orange-100 dark:bg-orange-900/40 py-2 px-3 rounded-lg dark:text-center dark:text-orange-300 dark:bg-orange-950/20",
                            },
                            "\uD83D\uDD25 Your listing will appear at the TOP of feeds and auto-delete after 24 hours!",
                          ),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "sticky bottom-0 z-10 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 pb-4 border-t border-gray-200/60 dark:border-gray-700/60 mt-8 mhub-premium-bar backdrop-blur-xl -mx-8 px-8 rounded-b-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:border-t",
                    },
                    e.createElement(
                      v,
                      {
                        type: "button",
                        onClick: Se,
                        variant: "outline",
                        className:
                          "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold px-6 py-3 text-base shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:border-blue-600/40 dark:text-blue-300 dark:hover:bg-blue-950/20",
                        style: { minWidth: 120 },
                      },
                      e.createElement(qe, { className: "w-5 h-5 mr-2" }),
                      "Preview",
                    ),
                    e.createElement(
                      v,
                      {
                        onClick: me,
                        className: `bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 font-bold px-6 py-3 text-base shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:bg-gradient-to-r ${k ? "opacity-60 cursor-not-allowed" : ""}`,
                        disabled: k,
                        style: { minWidth: 140 },
                        "aria-busy": k,
                      },
                      k
                        ? e.createElement(
                            "span",
                            { className: "flex items-center justify-center" },
                            e.createElement(
                              "svg",
                              {
                                className:
                                  "animate-spin mr-2 w-5 h-5 text-white dark:text-white",
                                fill: "none",
                                viewBox: "0 0 24 24",
                                "aria-hidden": "true",
                              },
                              e.createElement("circle", {
                                className: "opacity-25",
                                cx: "12",
                                cy: "12",
                                r: "10",
                                stroke: "currentColor",
                                strokeWidth: "4",
                              }),
                              e.createElement("path", {
                                className: "opacity-75",
                                fill: "currentColor",
                                d: "M4 12a8 8 0 018-8v8z",
                              }),
                            ),
                            te === "processing"
                              ? "Finalizing..."
                              : "Publishing...",
                          )
                        : "Publish Post",
                    ),
                  ),
                  k &&
                    e.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-3 dark:border dark:border-sky-600/40 dark:bg-sky-950/20",
                      },
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex items-center justify-between text-xs text-sky-700 dark:text-sky-300 mb-1",
                        },
                        e.createElement(
                          "span",
                          null,
                          ae || "Uploading media...",
                        ),
                        e.createElement("span", null, f > 0 ? `${f}%` : ""),
                      ),
                      e.createElement(
                        "div",
                        {
                          className:
                            "h-2 w-full rounded-full bg-sky-100 dark:bg-sky-900 dark:bg-sky-950/20",
                        },
                        e.createElement("div", {
                          className:
                            "h-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300 dark:bg-gradient-to-r",
                          style: {
                            width: `${Math.min(100, Math.max(5, f || 5))}%`,
                          },
                        }),
                      ),
                    ),
                ),
              ),
            ),
          ),
        );
  };
var lr = He;
export { lr as default };
