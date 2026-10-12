"use client";

import toast from "react-hot-toast";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle } from "react-icons/fa";

// Icon colors come from the design system's muted state palette
// (--color-success / --color-error / --color-alert). These are literal hex
// strings (react-hot-toast's `style`/`icon` props take real CSS values, not
// Tailwind classes), so they do NOT track a `globals.css` palette swap
// automatically — keep them in sync with globals.css's --color-ink/-paper/
// -success/-error/-alert/-accent by hand when the palette changes.
const INK = "#3f3128";
const PAPER = "#ffffff";
const SUCCESS = "#6f6733";
const ERROR = "#b8503a";
const ALERT = "#a4762f";

const inkSlab = {
  background: INK,
  color: PAPER,
  borderRadius: "9999px",
};

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: <FaCheckCircle color={SUCCESS} size={20} />,
      style: inkSlab,
    });
  },
  error: (message: string) => {
    toast.error(message, {
      icon: <FaExclamationCircle color={ERROR} size={20} />,
      style: inkSlab,
    });
  },
  warning: (message: string) => {
    toast(message, {
      icon: <FaExclamationTriangle color={ALERT} size={20} />,
      style: inkSlab,
    });
  },
  info: (message: string) => {
    toast(message, {
      icon: <FaInfoCircle color={PAPER} size={20} />,
      style: inkSlab,
    });
  },
};
