import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Star, Phone, Users, Award, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { useCmsPage } from "@/hooks/useCmsPage";

const Index = () => {
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("home");
  const heroPrefix =
    cmsContent?.hero?.prefix || t("homepage_hero_title_prefix");
  const heroHighlight =
    cmsContent?.hero?.highlight || t("homepage_hero_title_highlight");
  const heroSuffix =
    cmsContent?.hero?.suffix || t("homepage_hero_title_suffix");
  const heroSubtitle =
    cmsContent?.hero?.subtitle || t("homepage_hero_subtitle");
  const featureTitle =
    cmsContent?.features?.title || t("homepage_features_title");
  const featureSubtitle =
    cmsContent?.features?.subtitle || t("homepage_features_subtitle");
  const ctaTitle = cmsContent?.cta?.title || t("homepage_cta_title");
  const ctaSubtitle =
    cmsContent?.cta?.subtitle || t("homepage_cta_subtitle");
  const ctaPrimaryLabel =
    cmsContent?.cta?.primaryLabel || t("create_account");
  const ctaSecondaryLabel =
    cmsContent?.cta?.secondaryLabel || t("sign_in");

  const stats = useMemo(() => {
    const fallback = [
      { value: "10,000+", label: t("verified_users") },
      { value: "25,000+", label: t("successful_sales") },
      { value: "50+", label: t("cities_covered") },
      { value: "₹5Cr+", label: t("transaction_value") },
    ];
    const list = Array.isArray(cmsContent?.stats) ? cmsContent.stats : null;
    if (!list || list.length === 0) return fallback;
    return list.map((entry, index) => ({
      value: entry?.value || entry?.count || fallback[index]?.value || "-",
      label: entry?.label || entry?.title || fallback[index]?.label || "",
    }));
  }, [cmsContent, t]);
  const statColorClasses = [
    "text-blue-600 dark:text-blue-300",
    "text-green-600 dark:text-green-300",
    "text-purple-600 dark:text-purple-300",
    "text-orange-600 dark:text-orange-300",
  ];
  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center dark:text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 dark:text-4xl dark:md:text-6xl dark:text-gray-100">
              {heroPrefix}{" "}
              <span className="text-blue-600 dark:text-sky-300 dark:text-blue-300">
                {heroHighlight}
              </span>{" "}
              {heroSuffix}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto dark:text-xl dark:text-gray-200">
              {heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3 dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-lg"
                >
                  {t("start_selling")}
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-3 dark:text-lg"
                >
                  {t("browse_phones")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center dark:text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-green-950/20">
                <Shield className="w-8 h-8 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white dark:text-lg">
                {t("aadhaar_verified_badge")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-200">
                {t("aadhaar_verified_desc")}
              </p>
            </div>
            <div className="text-center dark:text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-blue-950/20">
                <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white dark:text-lg">
                {t("dual_confirmation")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-200">
                {t("dual_confirmation_desc")}
              </p>
            </div>
            <div className="text-center dark:text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-purple-950/20">
                <Award className="w-8 h-8 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white dark:text-lg">
                {t("rewards_system")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-200">
                {t("rewards_system_desc")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 mhub-premium-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 dark:text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 dark:text-3xl dark:md:text-4xl dark:text-gray-100">
              {featureTitle}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 dark:text-xl dark:text-gray-200">
              {featureSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-200 transition-colors dark:border-slate-800 dark:hover:border-sky-500/40 dark:border-2 dark:hover:border-blue-600/40">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-sky-900/40 rounded-lg flex items-center justify-center mb-4 dark:bg-blue-950/20">
                  <Phone className="w-6 h-6 text-blue-600 dark:text-sky-300 dark:text-blue-300" />
                </div>
                <CardTitle>{t("easy_listing")}</CardTitle>
                <CardDescription>
                  {t("easy_listing_desc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-green-200 transition-colors dark:border-slate-800 dark:hover:border-emerald-500/40 dark:border-2 dark:hover:border-green-600/40">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center mb-4 dark:bg-green-950/20">
                  <Users className="w-6 h-6 text-green-600 dark:text-emerald-300 dark:text-green-300" />
                </div>
                <CardTitle>{t("verified_community")}</CardTitle>
                <CardDescription>
                  {t("verified_community_desc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-purple-200 transition-colors dark:border-slate-800 dark:hover:border-purple-400/40 dark:border-2 dark:hover:border-purple-600/40">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mb-4 dark:bg-purple-950/20">
                  <Star className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                </div>
                <CardTitle>{t("ranking_system")}</CardTitle>
                <CardDescription>
                  {t("ranking_system_desc")}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 mhub-premium-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center dark:text-center">
            {stats.map((stat, index) => (
              <div key={`stat-${index}`}>
                <div
                  className={`text-3xl font-bold mb-2 dark:text-3xl ${statColorClasses[index % statColorClasses.length]}`}
                >
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400 dark:text-gray-200">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-blue-600 dark:bg-blue-700/40">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 dark:text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 dark:text-3xl dark:md:text-4xl dark:text-white">
            {ctaTitle}
          </h2>
          <p className="text-xl text-blue-100 mb-8 dark:text-xl dark:text-blue-200">
            {ctaSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-3 dark:text-lg"
              >
                {ctaPrimaryLabel}
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3 text-white border-white hover:bg-white hover:text-blue-600 dark:text-lg dark:text-white dark:border-white/20 dark:hover:bg-slate-900 dark:hover:text-blue-300"
              >
                {ctaSecondaryLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 dark:bg-gray-700 dark:text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 dark:text-lg">{t("brand_mobilemart")}</h3>
              <p className="text-gray-400 dark:text-gray-300">
                {t("homepage_footer_tagline")}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 dark:text-lg">{t("quick_links")}</h3>
              <ul className="space-y-2 text-gray-400 dark:text-gray-300">
                <li>
                  <Link to="/about" className="hover:text-white dark:hover:text-white">
                    {t("about_us")}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white dark:hover:text-white">
                    {t("contact")}
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="hover:text-white dark:hover:text-white">
                    {t("help_center")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 dark:text-lg">{t("legal")}</h3>
              <ul className="space-y-2 text-gray-400 dark:text-gray-300">
                <li>
                  <Link to="/terms" className="hover:text-white dark:hover:text-white">
                    {t("terms_of_service")}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white dark:hover:text-white">
                    {t("privacy_policy")}
                  </Link>
                </li>
                <li>
                  <Link to="/security" className="hover:text-white dark:hover:text-white">
                    {t("security")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 dark:text-lg">{t("connect")}</h3>
              <ul className="space-y-2 text-gray-400 dark:text-gray-300">
                <li>{t("support_email")}</li>
                <li>{t("support_phone")}</li>
                <li>{t("follow_social")}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 dark:border-t dark:border-gray-500 dark:text-center dark:text-gray-300">
            <p>{t("copyright_mobilemart")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

