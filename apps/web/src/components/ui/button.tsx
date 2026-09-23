"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-slate-900 hover:bg-black text-white border-transparent shadow-xs active:scale-[0.98]",
  secondary:
    "bg-slate-100 hover:bg-slate-200 text-slate-800 border-transparent active:scale-[0.98]",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-xs active:scale-[0.98]",
  outline:
    "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs active:scale-[0.98]",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-transparent",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-2.5 py-1.5 text-xs font-semibold rounded-lg gap-1.5",
  md: "px-3.5 py-2 text-xs font-semibold rounded-xl gap-2",
  lg: "px-5 py-2.5 text-sm font-semibold rounded-xl gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const isEffectivelyDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isEffectivelyDisabled}
        className={`inline-flex items-center justify-center font-medium border transition-all duration-150 cursor-pointer select-none ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${
          isEffectivelyDisabled
            ? "opacity-60 cursor-not-allowed pointer-events-none"
            : ""
        } ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{isLoading && loadingText ? loadingText : children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
