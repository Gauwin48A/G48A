import React from "react";
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

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              {t("homepage_hero_title_prefix")}{" "}
              <span className="text-blue-600">
                {t("homepage_hero_title_highlight")}
              </span>{" "}
              {t("homepage_hero_title_suffix")}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {t("homepage_hero_subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
                >
                  {t("start_selling")}
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-3"
                >
                  {t("browse_phones")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">
                {t("aadhaar_verified_badge")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("aadhaar_verified_desc")}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">
                {t("dual_confirmation")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("dual_confirmation_desc")}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">
                {t("rewards_system")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("rewards_system_desc")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("homepage_features_title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t("homepage_features_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>{t("easy_listing")}</CardTitle>
                <CardDescription>
                  {t("easy_listing_desc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-green-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>{t("verified_community")}</CardTitle>
                <CardDescription>
                  {t("verified_community_desc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-purple-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-purple-600" />
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
      <div className="py-16 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                10,000+
              </div>
              <div className="text-gray-600 dark:text-gray-400">{t("verified_users")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                25,000+
              </div>
              <div className="text-gray-600 dark:text-gray-400">{t("successful_sales")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
              <div className="text-gray-600 dark:text-gray-400">{t("cities_covered")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                â‚¹5Cr+
              </div>
              <div className="text-gray-600 dark:text-gray-400">{t("transaction_value")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t("homepage_cta_title")}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t("homepage_cta_subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-3"
              >
                {t("create_account")}
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3 text-white border-white hover:bg-white hover:text-blue-600"
              >
                {t("sign_in")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("brand_mobilemart")}</h3>
              <p className="text-gray-400">
                {t("homepage_footer_tagline")}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("quick_links")}</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/about" className="hover:text-white">
                    {t("about_us")}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white">
                    {t("contact")}
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="hover:text-white">
                    {t("help_center")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("legal")}</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/terms" className="hover:text-white">
                    {t("terms_of_service")}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white">
                    {t("privacy_policy")}
                  </Link>
                </li>
                <li>
                  <Link to="/security" className="hover:text-white">
                    {t("security")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("connect")}</h3>
              <ul className="space-y-2 text-gray-400">
                <li>{t("support_email")}</li>
                <li>{t("support_phone")}</li>
                <li>{t("follow_social")}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>{t("copyright_mobilemart")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

