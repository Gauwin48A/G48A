import React, { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import { useTranslation } from "react-i18next";
import api from "@/services/api";

const DealsSection = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get("/products/deals");
        const data = response?.data ?? response;
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setProducts(data);
          setLoading(false);
          return;
        }
      } catch {
        // fallback to trending
      }
      try {
        const response = await api.get("/feed/trending");
        const data = response?.data ?? response;
        const posts = data?.posts ?? [];
        if (!cancelled) {
          setProducts(
            posts.map((p) => ({
              id: p.post_id,
              name: p.title,
              image: Array.isArray(p.images) ? p.images[0] : p.images,
              price: p.price,
              rating: p.engagement_score ? Math.min(5, 3 + p.engagement_score / 100) : 4.5,
              user_id: p.user_id || p.seller_id || p.user?.id || null,
              trust: p.trust || p.user?.trust || null,
              risk_state: p.risk_state || p.user?.risk_state || null,
              under_review: p.under_review ?? p.user?.under_review ?? null,
            }))
          );
        }
      } catch {
        // no deals available
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section
      className="max-w-7xl mx-auto px-4 py-10"
      aria-label={t("todays_deals")}
    >
      <h2 className="text-2xl font-bold mb-6 text-primary">
        {t("todays_deals")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {loading ? (
          <div className="col-span-4 text-center text-gray-500">{t("loading") || "Loading..."}</div>
        ) : Array.isArray(products) && products.length > 0 ? (
          products.map(product => <ProductCard key={product.id} product={product} />)
        ) : (
          <div className="col-span-4 text-center text-gray-500">{t("no_deals_available")}</div>
        )}
      </div>
    </section>
  );
};

export default DealsSection;
