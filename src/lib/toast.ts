import { toast } from "sonner";

export const showSuccess = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 4000,
  });
};

export const showError = (message: string, description?: string) => {
  toast.error(message, {
    description,
    duration: 5000,
  });
};

export const showInfo = (message: string, description?: string) => {
  toast.info(message, {
    description,
    duration: 3000,
  });
};

export const showWarning = (message: string, description?: string) => {
  toast.warning(message, {
    description,
    duration: 4000,
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (id: number | string) => {
  toast.dismiss(id);
};

export const updateToast = (id: number | string, message: string, type: "success" | "error" | "info" | "warning" = "info") => {
  toast[type](message, { id });
};
