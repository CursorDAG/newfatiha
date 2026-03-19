# Fatiha.ru Design System Specification
**Version:** 1.0.0
**Date:** 2026-03-19
**Status:** Draft

---

## Overview

This design system addresses the 47 UI/UX issues identified in the analysis report by establishing consistent patterns, tokens, and components. It provides a foundation for redesigning both teacher and student dashboards while maintaining brand identity.

**Goals:**
- Ensure WCAG AA accessibility compliance
- Create mobile-first responsive patterns
- Establish consistent visual language
- Improve development velocity through reusable components
- Reduce design debt and technical inconsistencies

---

## Design Tokens

### Color Palette

#### Primary Colors
```css
--color-primary-50: #ecfdf5;   /* Lightest emerald */
--color-primary-100: #d1fae5;
--color-primary-200: #a7f3d0;
--color-primary-300: #6ee7b7;
--color-primary-400: #34d399;
--color-primary-500: #10b981;  /* Brand emerald */
--color-primary-600: #059669;
--color-primary-700: #047857;
--color-primary-800: #065f46;
--color-primary-900: #064e3b;  /* Darkest emerald */
```

#### Neutral Colors (Light Theme)
```css
--color-neutral-50: #f8fafc;   /* Backgrounds */
--color-neutral-100: #f1f5f9;
--color-neutral-200: #e2e8f0;  /* Borders */
--color-neutral-300: #cbd5e1;
--color-neutral-400: #94a3b8;  /* Disabled text */
--color-neutral-500: #64748b;  /* Secondary text */
--color-neutral-600: #475569;  /* Body text */
--color-neutral-700: #334155;  /* Headings */
--color-neutral-800: #1e293b;
--color-neutral-900: #0f172a;  /* Darkest */
```

#### Semantic Colors
```css
/* Success */
--color-success-50: #ecfdf5;
--color-success-500: #10b981;
--color-success-700: #047857;

/* Warning */
--color-warning-50: #fffbeb;
--color-warning-500: #f59e0b;
--color-warning-700: #b45309;

/* Error */
--color-error-50: #fef2f2;
--color-error-500: #ef4444;
--color-error-700: #b91c1c;

/* Info */
--color-info-50: #eff6ff;
--color-info-500: #3b82f6;
--color-info-700: #1d4ed8;
```

---

### Typography Scale

```css
--text-display: 3rem;        /* 48px - Hero sections */
--text-h1: 2.25rem;          /* 36px */
--text-h2: 1.875rem;         /* 30px */
--text-h3: 1.5rem;           /* 24px */
--text-h4: 1.25rem;          /* 20px */
--text-base: 1rem;           /* 16px - Default body */
--text-sm: 0.875rem;         /* 14px - Secondary */
--text-xs: 0.75rem;          /* 12px - Captions */
```

---

### Spacing Scale

```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
```

**Usage:**
- Component padding: space-4 to space-6
- Card padding: space-6 to space-8
- Section spacing: space-8 to space-12

---

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
--radius-full: 9999px;   /* Pills, avatars */
```

---

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

---

## Component Specifications

### Buttons

**Minimum touch target: 44x44px**

```tsx
// Small (44px height)
<button className="px-4 py-2.5 text-sm min-h-[44px] rounded-lg">

// Medium (48px height - default)
<button className="px-6 py-3 text-base min-h-[48px] rounded-lg">

// Large (56px height)
<button className="px-8 py-4 text-base min-h-[56px] rounded-lg">
```

**Variants:**
- Primary: emerald-600 bg, white text
- Secondary: white bg, border, neutral-700 text
- Danger: red-600 bg, white text
- Ghost: transparent bg, neutral-700 text

---

### Form Inputs

```tsx
<input className="w-full px-4 py-3 min-h-[48px] border-2 border-neutral-300 rounded-lg bg-neutral-50 focus:border-primary-500 focus:ring-4 focus:ring-primary-100" />
```

**States:**
- Default: neutral-300 border
- Hover: neutral-400 border
- Focus: primary-500 border + ring
- Error: error-500 border + ring
- Disabled: 60% opacity

---

### Cards

```tsx
<div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
  {/* Card content */}
</div>
```

**Interactive cards:**
```tsx
<div className="... hover:border-primary-300 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer">
```

---

### Modals

```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
    {/* Modal content */}
  </div>
</div>
```

---

## Accessibility Requirements

### WCAG AA Compliance

1. **Color Contrast**
   - Normal text: 4.5:1 minimum
   - Large text (18px+): 3:1 minimum
   - UI components: 3:1 minimum

2. **Touch Targets**
   - Minimum: 44x44px
   - Spacing: 8px between targets

3. **Focus Indicators**
   - 3px ring minimum
   - High contrast color
   - Visible on all interactive elements

4. **Keyboard Navigation**
   - Tab order logical
   - All functions keyboard-accessible
   - Skip links provided

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
- Create design tokens CSS file
- Update Tailwind config
- Build base component library

### Phase 2: Critical Fixes (Weeks 3-4)
- Fix button sizes (44px minimum)
- Increase padding throughout
- Fix color contrast issues
- Make modals responsive

### Phase 3: Dashboard Redesign (Weeks 5-8)
- Redesign TeacherShell
- Update all teacher tabs
- Redesign StudentDashboard
- Fix mobile navigation

### Phase 4: Polish (Weeks 9-10)
- Add animations
- Improve loading states
- Add keyboard shortcuts
- Final accessibility audit

---

## Migration Strategy

1. **Create token system** - Define all design tokens as CSS variables
2. **Build component library** - Create new components following specs
3. **Gradual migration** - Replace old components one at a time
4. **Testing** - Ensure accessibility and responsiveness
5. **Documentation** - Update component docs and usage guidelines

---

## Success Metrics

- WCAG AA compliance: 100%
- Mobile usability score: 90%+
- Component reuse: 80%+
- Development velocity: 30% faster
- User satisfaction: 4.5/5+

---

*Design System v1.0.0 - Draft*
*Last updated: 2026-03-19*
