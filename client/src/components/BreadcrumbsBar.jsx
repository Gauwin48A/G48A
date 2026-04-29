import React, { useMemo, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { fetchCategoriesCached } from "@/services/categoriesService";

const BreadcrumbsBar = ({
  className = "",
  compact = false,
  tone = "auto",
}) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    let active = true;
    fetchCategoriesCached({ includeSubcategories: true })
      .then((list) => {
        if (!active) return;
        setCategoryData(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!active) return;
        setCategoryData([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const crumbs = useMemo(() => {
    const path = location.pathname || "/";
    const params = new URLSearchParams(location.search || "");
    const purpose = String(params.get("purpose") || "").toLowerCase();
    const boostType = String(
      params.get("boostType") || params.get("boost_type") || "",
    ).toLowerCase();
    const postId = String(params.get("postId") || params.get("post_id") || "");
    const isBoostFlow = purpose === "boost" || Boolean(boostType || postId);

    const home = { label: t("home") || "Home", to: "/category-hub" };
    const sell = { label: t("sell") || "Sell", to: "/post-welcome" };

    if (path === "/post-welcome") {
      return [home, { label: t("sell") || "Sell" }];
    }

    if (path === "/add-post" || path === "/post_add" || path === "/feed/feedpostadd") {
      return [home, sell, { label: t("add_post") || "Add post" }];
    }

    if (path.startsWith("/edit-post/")) {
      return [
        home,
        { label: t("my_posts") || "My posts", to: "/my-home" },
        { label: t("edit_post") || "Edit post" },
      ];
    }

    if (path === "/tier-selection" || path === "/tiers" || path === "/pricing") {
      return [
        home,
        sell,
        { label: t("choose_tier") || "Choose tier" },
      ];
    }

    if (path === "/cart") {
      return [home, { label: t("cart") || "Cart" }];
    }

    if (path === "/payment") {
      return [
        home,
        { label: t("checkout") || "Checkout", to: "/cart" },
        {
          label: isBoostFlow
            ? t("boost_payment") || "Boost payment"
            : t("payment") || "Payment",
        },
      ];
    }

    if (path === "/verification") {
      return [home, { label: t("verification") || "Verification" }];
    }

    if (path === "/aadhaar-verify") {
      return [
        home,
        { label: t("verification") || "Verification", to: "/verification" },
        {
          label: t("aadhaar_verification") || "Aadhaar verification",
        },
      ];
    }

    if (path === "/kyc") {
      return [
        home,
        { label: t("verification") || "Verification", to: "/verification" },
        { label: t("kyc") || "KYC" },
      ];
    }

    // AllPosts with category/subcategory filters
    if (path === "/all-posts") {
      const categoryIdParam =
        params.get("category_id") || params.get("categoryId") || "";
      const subcategoryIdParam =
        params.get("subcategory_id") || params.get("subcategoryId") || "";
      const legacyCategory = params.get("category") || "";
      const legacySubcategory = params.get("subcategory") || "";

      const categoryNameById = new Map();
      const subcategoryNameById = new Map();
      const subcategoryCategoryById = new Map();

      (Array.isArray(categoryData) ? categoryData : []).forEach((category) => {
        const categoryId = category?.category_id || category?.id || null;
        if (categoryId != null) {
          categoryNameById.set(String(categoryId), category?.name || "");
        }
        const subs = Array.isArray(category?.subcategories)
          ? category.subcategories
          : [];
        subs.forEach((sub) => {
          const subId = sub?.subcategory_id || sub?.id || null;
          if (subId == null) return;
          subcategoryNameById.set(
            String(subId),
            sub?.name || sub?.subcategory_name || "",
          );
          subcategoryCategoryById.set(String(subId), {
            id: sub?.category_id || categoryId || null,
            name: sub?.category_name || category?.name || "",
          });
        });
      });

      let resolvedCategoryId = categoryIdParam;
      let resolvedCategoryLabel = "";
      if (resolvedCategoryId) {
        resolvedCategoryLabel =
          categoryNameById.get(String(resolvedCategoryId)) ||
          legacyCategory ||
          String(resolvedCategoryId);
      } else if (legacyCategory) {
        const legacyKey = String(legacyCategory).trim();
        resolvedCategoryLabel =
          categoryNameById.get(legacyKey) || legacyCategory;
      }

      const resolvedSubcategoryLabel = (() => {
        if (subcategoryIdParam) {
          return (
            subcategoryNameById.get(String(subcategoryIdParam)) ||
            legacySubcategory ||
            String(subcategoryIdParam)
          );
        }
        return legacySubcategory || "";
      })();

      if (!resolvedCategoryId && subcategoryIdParam) {
        const parent = subcategoryCategoryById.get(String(subcategoryIdParam));
        if (parent?.id) {
          resolvedCategoryId = String(parent.id);
        }
        if (!resolvedCategoryLabel && parent?.name) {
          resolvedCategoryLabel = parent.name;
        }
      }

      if (resolvedCategoryLabel && resolvedCategoryLabel !== "All") {
        const crumbList = [home];
        crumbList.push({
          label: t("subcategories") || "Subcategories",
          to: "/subcategories",
        });

        if (resolvedSubcategoryLabel && resolvedSubcategoryLabel !== "All") {
          const categoryLink = resolvedCategoryId
            ? `/all-posts?category_id=${encodeURIComponent(resolvedCategoryId)}`
            : `/all-posts?category=${encodeURIComponent(resolvedCategoryLabel)}`;
          crumbList.push({
            label: resolvedCategoryLabel,
            to: categoryLink,
          });
          crumbList.push({ label: resolvedSubcategoryLabel });
        } else {
          crumbList.push({ label: resolvedCategoryLabel });
        }

        return crumbList;
      }

      return [home, { label: t("all_posts") || "All Posts" }];
    }

    // Category mode selection
    if (path === "/category-mode" || path === "/category-hub") {
      return [home, { label: t("select_category") || "Select Category" }];
    }

    // Categories listing
    if (path === "/categories" || path === "/subcategories") {
      return [home, { label: t("subcategories") || "Subcategories" }];
    }

    // Post detail
    if (path.startsWith("/post/")) {
      return [
        home,
        { label: t("post_details") || "Post Details" },
      ];
    }

    return [];
  }, [location.pathname, location.search, t, categoryData]);

  if (!crumbs || crumbs.length < 2) return null;

  const resolvedTone =
    tone === "auto"
      ? typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
      : tone;
  const isDarkTone = resolvedTone === "dark";
  const listClassName = compact
    ? isDarkTone
      ? "text-xs text-white/80"
      : "text-xs text-slate-500"
    : isDarkTone
      ? "text-xs text-slate-200"
      : "text-xs text-slate-500";
  const linkClassName = isDarkTone
    ? "font-semibold text-white/80 hover:text-white"
    : "font-semibold text-slate-600 hover:text-slate-900";
  const pageClassName = isDarkTone ? "text-white" : "text-slate-900";
  const separatorClassName = isDarkTone ? "text-white/60" : "text-slate-400";

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className={listClassName}>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {crumb.to && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} className={linkClassName}>
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className={pageClassName}>
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className={separatorClassName} />
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadcrumbsBar;
