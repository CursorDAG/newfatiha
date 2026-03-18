"use client";

import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes: Record<Size, string> = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    secondary: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm",
    danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

