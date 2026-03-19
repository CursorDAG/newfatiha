/**
 * UI Component Library v2 - Design System Implementation
 *
 * This is the new component library following the Fatiha.ru Design System v1.0.0.
 * All components are WCAG AA compliant and mobile-first responsive.
 *
 * @see docs/design-system.md for full specifications
 * @see docs/ui-analysis.md for issues addressed
 */

// Core Components
export { Button, ButtonGroup } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonGroupProps } from "./Button";

export { Input, Textarea } from "./Input";
export type { InputProps, TextareaProps } from "./Input";

export { Card, CardHeader, CardBody, CardFooter } from "./Card";
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from "./Card";

export { Modal, ModalFooter } from "./Modal";
export type { ModalProps, ModalFooterProps } from "./Modal";

export { Badge, StatusBadge } from "./Badge";
export type { BadgeProps, BadgeVariant, BadgeSize, StatusBadgeProps, StatusValue } from "./Badge";

export { ToastContainer, ToastItem, useToast } from "./Toast";
export type { Toast, ToastType, ToastProps, ToastContainerProps } from "./Toast";
