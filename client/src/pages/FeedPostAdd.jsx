import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";
import api from "@/services/api";

const FeedPostAdd = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    description: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateFields = () => {
    const errors = {};
    if (
      !formData.description ||
      formData.description.length < 5 ||
      formData.description.length > 500
    )
      errors.description = "Description is required (5-500 chars).";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;
    setIsLoading(true);
    try {
      const response = await api.post("/feed/add", { description: formData.description });
      const result = response?.data ?? response;
      toast({
        title: "Feed Post Created",
        description: "Your text post has been published.",
      });
      navigate("/feed");
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to create feed post.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-sky-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          onClick={() => navigate("/feed")}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden dark:border-0">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white dark:bg-gradient-to-r dark:text-white">
            <CardTitle className="text-2xl dark:text-2xl">{t("create_text_post")}</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              <div>
                <Label
                  htmlFor="description"
                  className="text-sm font-semibold text-gray-700 dark:text-slate-200 dark:text-sm dark:text-gray-200"
                >
                  Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={t("write_update_here")}
                  className="mt-2 h-32 border-2 border-gray-200 focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-sky-400 dark:border-2 dark:border-gray-700 dark:focus:border-sky-500/40"
                  required
                  maxLength={500}
                  minLength={5}
                />
                {formErrors.description && (
                  <div className="text-red-500 text-xs mt-1 dark:text-red-300 dark:text-xs">
                    {formErrors.description}
                  </div>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 dark:bg-gradient-to-r"
                disabled={isLoading}
              >
                {isLoading ? "Publishing..." : "Publish Post"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedPostAdd;
