"use client";

import React from "react";

/**
 * Card Component - Design System v2
 *
 * Implements consistent card styling with proper spacing and elevation.
 * Addresses UI/UX issue #1 (cramped padding) and #26 (shadow usage).
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <h3>Card Title</h3>
 *   </CardHeader>
 *   <CardBody>
 *     Card content goes here
 *   </CardBody>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  noPadding?: boolean;
}

export function Card({
  children,
  interactive = false,
  noPadding = false,
  className = "",
  ...props
}: CardProps) {
  const baseStyles = [
    "bg-white",
    "border border-slate-200",
    "rounded-xl",
    "shadow-sm",
    "transition-all duration-200",
  ].join(" ");

  const paddingStyles = noPadding ? "" : "p-6";

  const interactiveStyles = interactive
    ? [
        "cursor-pointer",
        "hover:border-emerald-300",
        "hover:shadow-md",
        "hover:-translate-y-1",
        "active:translate-y-0",
      ].join(" ")
    : "";

  const combinedStyles = [baseStyles, paddingStyles, interactiveStyles, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={combinedStyles} {...props}>
      {children}
    </div>
  );
}

/**
 * CardHeader Component
 *
 * Provides consistent header styling with bottom border.
 */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ children, className = "", ...props }: CardHeaderProps) {
  return (
    <div
      className={`pb-4 border-b border-slate-200 mb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardBody Component
 *
 * Main content area of the card.
 */

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardBody({ children, className = "", ...props }: CardBodyProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * CardFooter Component
 *
 * Provides consistent footer styling with top border.
 */

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ children, className = "", ...props }: CardFooterProps) {
  return (
    <div
      className={`pt-4 border-t border-slate-200 mt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
