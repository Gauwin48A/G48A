import React from "react";
import { Grid } from "lucide-react";

const AllPostsCategoryBar = ({
  categories,
  activeCategory,
  onSelectAll,
  onSelectCategory,
  subcategories,
  activeSubcategory,
  onSelectAllSubcategories,
  onSelectSubcategory,
  subcategoryIconResolver,
  showSubcategoryCounts = true,
  showCategoryCounts = true,
  translate,
  icons,
  iconResolver,
  maxWidthClass = "max-w-[640px]",
  compact = false,
}) => {
  const list = Array.isArray(categories) ? categories : [];
  const subcategoryList = Array.isArray(subcategories) ? subcategories : [];
  const t = (key, fallback) =>
    typeof translate === "function" ? translate(key, fallback) : fallback;
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const isComponentType = (value) =>
    typeof value === "function" ||
    (typeof value === "object" && value !== null && "$$typeof" in value);
  const wrapperPad = compact ? "px-2.5 pt-1 pb-1" : "px-3 pt-1.5 pb-1.5";
  const barPad = compact
    ? "py-1 px-1.5 md:px-2"
    : "py-1 px-2 md:px-2.5";
  const barGap = compact ? "gap-1.5 md:gap-2" : "gap-1.5 md:gap-2";
  const buttonPad = compact
    ? "px-3 py-2 rounded-full min-h-[44px] min-w-[44px]"
    : "px-3 py-2 rounded-full min-h-[44px] min-w-[52px] sm:min-w-[60px]";
  const labelSize = compact
    ? "text-[13px]"
    : "text-[13px] md:text-sm";
  const iconSize = compact
    ? "w-3.5 h-3.5"
    : "w-4 h-4 sm:w-5 sm:h-5";
  const iconTextSize = compact
    ? "text-sm sm:text-sm"
    : "text-lg sm:text-xl";
  const itemLayoutClass = compact
    ? "mhub-chip-compact flex-row gap-1.5"
    : "flex-col";

  return (
    <div className={`w-full flex justify-center ${wrapperPad}`}>
      <div className={`flex flex-col gap-2 ${maxWidthClass} w-full`}>
        <div
          className={`mhub-category-shell mhub-chipbar ${barPad} rounded-full overflow-x-auto scrollbar-hide w-full backdrop-blur`}
        >
          <div
            className={`mhub-category-track flex items-center ${barGap} ${
              compact ? "w-max min-w-full justify-start px-1" : "w-fit mx-auto justify-center"
            }`}
          >
            <button
              type="button"
              onClick={onSelectAll}
              className={`mhub-category-item mhub-chip flex items-center ${itemLayoutClass} cursor-pointer transition ${buttonPad} hover:opacity-90 ${
                normalize(activeCategory) === "all"
                  ? "mhub-category-item-active mhub-chip-active"
                  : ""
              }`}
            >
              <span className={`mhub-category-icon ${iconTextSize} ${compact ? "" : "mb-0.5"}`}>
                <Grid className={iconSize} />
              </span>
              <span
                className={`mhub-category-label font-semibold ${labelSize} ${
                  normalize(activeCategory) === "all"
                    ? "text-white"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {t("all", "All")}
              </span>
            </button>
            {list.map((item, index) => {
              const rawName =
                item?.name ||
                item?.title ||
                item?.category_name ||
                item?.label ||
                item?.category ||
                "";
              const id = item?.category_id || item?.id || rawName;
              const name = String(rawName || id || "").trim();
              if (!name) return null;
              const isActive =
                normalize(activeCategory) === normalize(name) ||
                String(activeCategory) === String(id);
              const labelKey = normalize(name).replace(/\s+/g, "_");
              const resolvedIcon =
                typeof iconResolver === "function"
                  ? iconResolver(name, item)
                  : icons?.[name];
              const resolvedIconType = isComponentType(resolvedIcon)
                ? resolvedIcon
                : isComponentType(resolvedIcon?.default)
                  ? resolvedIcon.default
                  : null;
              const iconUrl = item?.icon_url || item?.iconUrl || "";
              const iconNode = iconUrl
                ? (
                  <img
                    src={iconUrl}
                    alt={`${name} icon`}
                    className="w-4 h-4 object-contain"
                    loading="lazy"
                  />
                )
                : React.isValidElement(resolvedIcon)
                  ? resolvedIcon
                  : resolvedIconType
                    ? React.createElement(resolvedIconType, { className: "w-4 h-4" })
                    : typeof resolvedIcon === "string" || typeof resolvedIcon === "number"
                      ? resolvedIcon
                      : "??";
              const countValue = Number(
                item?.product_count ?? item?.post_count ?? item?.count ?? 0
              );
              return (
                <button
                  key={`${id || name || "item"}-${name || "name"}-${index}`}
                  type="button"
                  onClick={() => onSelectCategory?.(name, item)}
                  className={`mhub-category-item mhub-chip flex items-center ${itemLayoutClass} cursor-pointer transition ${buttonPad} whitespace-nowrap hover:opacity-90 ${
                    isActive
                      ? "mhub-category-item-active mhub-chip-active"
                      : ""
                  }`}
                >
                  <span className={`mhub-category-icon ${iconTextSize} ${compact ? "" : "mb-0.5"}`}>
                    {iconNode}
                  </span>
                  <span
                    className={`mhub-category-label font-semibold ${labelSize} ${
                      isActive ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {t(labelKey, name)}
                  </span>
                  {showCategoryCounts && !compact && (
                    <span
                      className={`mhub-category-count text-xs sm:text-xs font-semibold ${
                        isActive ? "text-white/90" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {Number.isFinite(countValue) ? countValue : 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {subcategoryList.length > 0 ? (
          <div
            className={`mhub-subcategory-shell mhub-chipbar ${barPad} rounded-full overflow-x-auto scrollbar-hide w-full backdrop-blur`}
          >
            <div
              className={`mhub-subcategory-track flex items-center ${barGap} ${
                compact ? "w-max min-w-full justify-start px-1" : "w-fit mx-auto justify-center"
              }`}
            >
              <button
                type="button"
                onClick={onSelectAllSubcategories}
                className={`mhub-subcategory-item mhub-chip flex items-center ${itemLayoutClass} cursor-pointer transition ${buttonPad} hover:opacity-90 ${
                  normalize(activeSubcategory) === "all"
                    ? "mhub-subcategory-item-active mhub-chip-active"
                    : ""
                }`}
              >
                <span className={`mhub-subcategory-icon ${iconTextSize} ${compact ? "" : "mb-0.5"}`}>
                  <Grid className={iconSize} />
                </span>
                <span
                  className={`mhub-subcategory-label font-semibold ${labelSize} ${
                    normalize(activeSubcategory) === "all"
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t("all", "All")}
                </span>
              </button>
              {subcategoryList.map((item, index) => {
                const rawName =
                  item?.name ||
                  item?.title ||
                  item?.subcategory_name ||
                  item?.label ||
                  item?.subcategory ||
                  "";
                const id = item?.subcategory_id || item?.id || rawName;
                const name = String(rawName || id || "").trim();
                if (!name) return null;
                const isActive =
                  normalize(activeSubcategory) === normalize(name) ||
                  String(activeSubcategory) === String(id);
                const labelKey = normalize(name).replace(/\s+/g, "_");
                const resolvedIcon =
                  typeof subcategoryIconResolver === "function"
                    ? subcategoryIconResolver(name, item)
                    : icons?.[name];
                const resolvedIconType = isComponentType(resolvedIcon)
                  ? resolvedIcon
                  : isComponentType(resolvedIcon?.default)
                    ? resolvedIcon.default
                    : null;
                const iconUrl = item?.icon_url || item?.iconUrl || "";
                const iconNode = iconUrl
                  ? (
                    <img
                      src={iconUrl}
                      alt={`${name} icon`}
                      className="w-4 h-4 object-contain"
                      loading="lazy"
                    />
                  )
                  : React.isValidElement(resolvedIcon)
                    ? resolvedIcon
                    : resolvedIconType
                      ? React.createElement(resolvedIconType, { className: "w-4 h-4" })
                      : typeof resolvedIcon === "string" || typeof resolvedIcon === "number"
                        ? resolvedIcon
                        : "???";
                const countValue = Number(
                  item?.post_count ?? item?.count ?? item?.postCount ?? 0
                );
                return (
                <button
                  key={`${id || name || "sub"}-${name || "name"}-${index}`}
                  type="button"
                  onClick={() => onSelectSubcategory?.(name, item)}
                  className={`mhub-subcategory-item mhub-chip flex items-center ${itemLayoutClass} cursor-pointer transition ${buttonPad} whitespace-nowrap hover:opacity-90 ${
                    isActive
                      ? "mhub-subcategory-item-active mhub-chip-active"
                      : ""
                  }`}
                >
                    <span className={`mhub-subcategory-icon ${iconTextSize} ${compact ? "" : "mb-0.5"}`}>
                      {iconNode}
                    </span>
                    <span
                      className={`mhub-subcategory-label font-semibold ${labelSize} ${
                        isActive ? "text-white" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {t(labelKey, name)}
                    </span>
                    {showSubcategoryCounts && !compact && (
                      <span
                        className={`mhub-subcategory-count text-xs sm:text-xs font-semibold ${
                          isActive ? "text-white/90" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {Number.isFinite(countValue) ? countValue : 0}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AllPostsCategoryBar;


