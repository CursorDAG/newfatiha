# UI Component Library v2

**Design System Implementation for Fatiha.ru**

This component library implements the Fatiha.ru Design System v1.0.0, addressing all critical UI/UX issues identified in the analysis report.

## Overview

All components in this library are:
- ✅ **WCAG AA Compliant** - Proper color contrast, focus states, and keyboard navigation
- ✅ **Mobile-First** - Responsive design with minimum 44px touch targets
- ✅ **Accessible** - Semantic HTML, ARIA labels, and screen reader support
- ✅ **Consistent** - Following design tokens for spacing, colors, typography
- ✅ **Type-Safe** - Full TypeScript support with proper prop types

## Components

### Button
Accessible button component with proper touch targets (44px minimum).

```tsx
import { Button, ButtonGroup } from "@/components/ui-v2";

// Variants: primary, secondary, danger, ghost
<Button variant="primary" size="md" onClick={handleSave}>
  Save Changes
</Button>

// Button groups with proper spacing
<ButtonGroup align="right">
  <Button variant="secondary">Cancel</Button>
  <Button variant="primary">Save</Button>
</ButtonGroup>
```

**Addresses:** Issue #3 (button sizes too small)

---

### Input & Textarea
Form inputs with inline validation feedback.

```tsx
import { Input, Textarea } from "@/components/ui-v2";

<Input
  label="Email"
  type="email"
  required
  error="Please enter a valid email"
  helperText="We'll never share your email"
/>

<Textarea
  label="Description"
  rows={4}
  error={errors.description}
/>
```

**Addresses:** Issue #14 (form validation feedback missing)

---

### Card
Consistent card styling with proper spacing and elevation.

```tsx
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui-v2";

<Card interactive>
  <CardHeader>
    <h3>Card Title</h3>
  </CardHeader>
  <CardBody>
    Card content with proper padding (24px)
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Addresses:** Issue #1 (cramped padding), Issue #26 (shadow usage)

---

### Modal
Accessible modal with backdrop scroll locking and responsive sizing.

```tsx
import { Modal, ModalFooter } from "@/components/ui-v2";

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  subtitle="This action cannot be undone"
  size="md"
>
  <p>Are you sure you want to continue?</p>
  <ModalFooter align="right">
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="danger" onClick={onConfirm}>Delete</Button>
  </ModalFooter>
</Modal>
```

**Addresses:** Issue #5 (modal overflow), Issue #13 (backdrop scroll)

---

### Badge & StatusBadge
Consistent badge styling with semantic colors and Russian labels.

```tsx
import { Badge, StatusBadge } from "@/components/ui-v2";

<Badge variant="success" icon={<CheckIcon />}>
  Active
</Badge>

// Pre-configured status badges with Russian labels
<StatusBadge status="ACTIVE" />  // Shows "Активен" with checkmark
<StatusBadge status="KICKED" />  // Shows "Исключён" with X
```

**Addresses:** Issue #23 (status badges inconsistent)

---

### Toast Notifications
Accessible toast notifications with auto-dismiss, positioned bottom-right.

```tsx
import { useToast } from "@/components/ui-v2";

function MyComponent() {
  const { showToast, ToastContainer } = useToast();

  const handleSave = () => {
    showToast({
      type: "success",
      title: "Saved!",
      message: "Changes saved successfully",
      duration: 5000
    });
  };

  return (
    <>
      <Button onClick={handleSave}>Save</Button>
      <ToastContainer />
    </>
  );
}
```

**Addresses:** Issue #9 (toast notifications block content)

---

## Design Tokens

All components use CSS custom properties defined in `src/styles/tokens.css`:

```css
/* Colors */
--color-primary-600: #059669;
--color-neutral-700: #334155;

/* Spacing */
--space-4: 1rem;    /* 16px */
--space-6: 1.5rem;  /* 24px */

/* Typography */
--text-base: 1rem;  /* 16px */
--font-semibold: 600;

/* Shadows */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
```

Import tokens before using components:

```tsx
import "@/styles/tokens.css";
```

---

## Migration Guide

### Phase 1: Import Tokens
Add to your root layout or global CSS:

```tsx
import "@/styles/tokens.css";
```

### Phase 2: Replace Components Gradually
Replace old components one at a time:

```tsx
// Old
import { Button } from "@/components/teacher/ui/Button";

// New
import { Button } from "@/components/ui-v2";
```

### Phase 3: Update Styling
Use design tokens instead of hardcoded values:

```tsx
// Old
<div className="p-4 rounded-xl">

// New (using tokens)
<div className="p-6 rounded-xl">  // p-6 = 24px (proper spacing)
```

---

## Accessibility Features

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Proper tab order maintained
- Escape key closes modals
- Focus indicators visible (3px ring)

### Screen Readers
- Semantic HTML elements used
- ARIA labels provided where needed
- Form inputs properly associated with labels
- Error messages announced via `role="alert"`

### Color Contrast
- All text meets WCAG AA minimum (4.5:1 for normal text)
- UI components meet 3:1 minimum
- Focus indicators have high contrast

### Touch Targets
- Minimum 44x44px for all interactive elements
- 8px spacing between adjacent targets
- Proper padding for comfortable tapping

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

---

## Contributing

When adding new components:

1. Follow design system specifications in `docs/design-system.md`
2. Ensure WCAG AA compliance
3. Add TypeScript types
4. Include usage examples in this README
5. Test on mobile devices

---

## Related Documentation

- [Design System Specification](../../docs/design-system.md)
- [UI/UX Analysis Report](../../docs/ui-analysis.md)
- [Design Tokens](../../styles/tokens.css)

---

**Version:** 1.0.0
**Last Updated:** 2026-03-19
