
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

const ToastDemo = () => {
  const { toast } = useToast();

  const showSuccessToast = () => {
    toast({
      title: "Success!",
      description: "Your post has been updated successfully.",
      action: (
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      ),
    });
  };

  const showErrorToast = () => {
    toast({
      variant: "destructive",
      title: "Error!",
      description: "Something went wrong. Please try again.",
      action: (
        <div className="flex items-center">
          <XCircle className="h-4 w-4" />
        </div>
      ),
    });
  };

  const showInfoToast = () => {
    toast({
      title: "Information",
      description: "Your post is now live and visible to buyers.",
      action: (
        <div className="flex items-center">
          <Info className="h-4 w-4 text-blue-500" />
        </div>
      ),
    });
  };

  const showWarningToast = () => {
    toast({
      title: "Warning",
      description: "Your post will expire in 24 hours.",
      action: (
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        </div>
      ),
    });
  };

  return (
    <div className="space-y-4 p-6">
      <h3 className="text-lg font-semibold">Toast Notifications</h3>
      <div className="flex flex-wrap gap-2">
        <Button onClick={showSuccessToast} className="bg-green-500 hover:bg-green-600">
          Show Success Toast
        </Button>
        <Button onClick={showErrorToast} variant="destructive">
          Show Error Toast
        </Button>
        <Button onClick={showInfoToast} className="bg-blue-500 hover:bg-blue-600">
          Show Info Toast
        </Button>
        <Button onClick={showWarningToast} className="bg-yellow-500 hover:bg-yellow-600">
          Show Warning Toast
        </Button>
      </div>
    </div>
  );
};

export default ToastDemo;
