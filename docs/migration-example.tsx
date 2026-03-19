/**
 * Migration Example: Button Component
 *
 * This file demonstrates how to migrate from the old Button component
 * to the new design system v2 Button component.
 *
 * Before running this migration:
 * 1. Import tokens in your root layout: import "@/styles/tokens.css"
 * 2. Ensure all dependencies are installed
 * 3. Test thoroughly on mobile devices
 */

import React from "react";

// ============================================================================
// BEFORE: Old Button Component (src/components/teacher/ui/Button.tsx)
// ============================================================================

/*
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base = "inline-flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes: Record<Size, string> = {
    sm: "px-3 py-2 text-xs",      // ❌ Only ~32px height - below 44px minimum
    md: "px-4 py-2.5 text-sm",    // ❌ Only ~38px height - below 44px minimum
  };
  const variants: Record<Variant, string> = {
    primary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    secondary: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm",
    danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}
*/

// Issues with old component:
// ❌ Button sizes below 44px minimum (WCAG violation)
// ❌ No loading state
// ❌ Inconsistent focus states
// ❌ No proper touch target sizing
// ❌ Danger variant looks like secondary button

// ============================================================================
// AFTER: New Button Component (src/components/ui-v2/Button.tsx)
// ============================================================================

import { Button, ButtonGroup } from "@/components/ui-v2";

// ✅ All sizes meet 44px minimum touch target
// ✅ Loading state included
// ✅ Consistent focus states (3px ring)
// ✅ Proper WCAG AA compliance
// ✅ Danger variant clearly destructive

// ============================================================================
// MIGRATION EXAMPLES
// ============================================================================

// Example 1: Simple button migration
// -----------------------------------

// BEFORE:
/*
<button
  onClick={handleSave}
  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold"
>
  Save Changes
</button>
*/

// AFTER:
function Example1() {
  const handleSave = () => console.log("Saved!");

  return (
    <Button variant="primary" size="md" onClick={handleSave}>
      Save Changes
    </Button>
  );
}

// Example 2: Button with loading state
// -------------------------------------

// BEFORE (no loading state):
/*
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl"
>
  {isSubmitting ? "Submitting..." : "Submit"}
</button>
*/

// AFTER:
function Example2() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // ... submit logic
    setIsSubmitting(false);
  };

  return (
    <Button
      variant="primary"
      size="md"
      loading={isSubmitting}
      onClick={handleSubmit}
    >
      Submit
    </Button>
  );
}

// Example 3: Button group with proper spacing
// --------------------------------------------

// BEFORE (cramped spacing):
/*
<div className="flex gap-2">
  <button className="...">Cancel</button>
  <button className="...">Save</button>
</div>
*/

// AFTER (proper 8px spacing):
function Example3() {
  return (
    <ButtonGroup align="right">
      <Button variant="secondary" onClick={() => console.log("Cancel")}>
        Cancel
      </Button>
      <Button variant="primary" onClick={() => console.log("Save")}>
        Save
      </Button>
    </ButtonGroup>
  );
}

// Example 4: Destructive action button
// -------------------------------------

// BEFORE (looks like secondary button):
/*
<button
  onClick={handleDelete}
  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl"
>
  Delete
</button>
*/

// AFTER (clearly destructive):
function Example4() {
  const handleDelete = () => {
    if (confirm("Are you sure?")) {
      console.log("Deleted!");
    }
  };

  return (
    <Button variant="danger" size="sm" onClick={handleDelete}>
      Delete
    </Button>
  );
}

// Example 5: Full modal footer migration
// ---------------------------------------

// BEFORE:
/*
<div className="flex gap-3 pt-2">
  <button
    type="submit"
    disabled={loading}
    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold"
  >
    {loading ? "Creating..." : "Create Course"}
  </button>
  <button
    type="button"
    onClick={onClose}
    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold"
  >
    Cancel
  </button>
</div>
*/

// AFTER:
function Example5({ onClose, loading }: { onClose: () => void; loading: boolean }) {
  return (
    <ButtonGroup align="right">
      <Button
        variant="secondary"
        size="md"
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        size="md"
        type="submit"
        loading={loading}
      >
        Create Course
      </Button>
    </ButtonGroup>
  );
}

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/*
For each button in your codebase:

1. ✅ Replace with new Button component
2. ✅ Ensure size is "sm" (44px) or larger
3. ✅ Use appropriate variant (primary/secondary/danger/ghost)
4. ✅ Add loading state if async action
5. ✅ Use ButtonGroup for multiple buttons
6. ✅ Test keyboard navigation (Tab, Enter, Space)
7. ✅ Test on mobile device (touch targets)
8. ✅ Verify focus indicator visible (3px ring)

Common patterns:

- Primary action: variant="primary"
- Cancel/secondary: variant="secondary"
- Delete/destructive: variant="danger"
- Minimal action: variant="ghost"

- Default size: size="md" (48px)
- Compact UI: size="sm" (44px)
- Hero/CTA: size="lg" (56px)
*/

// ============================================================================
// TESTING GUIDE
// ============================================================================

/*
After migration, test:

1. Visual appearance:
   - Buttons have proper padding
   - Touch targets are at least 44x44px
   - Spacing between buttons is at least 8px
   - Colors match design system

2. Interaction:
   - Hover states work
   - Active states work
   - Focus ring visible (3px, high contrast)
   - Loading spinner shows during async actions

3. Accessibility:
   - Keyboard navigation works (Tab, Enter, Space)
   - Focus indicator clearly visible
   - Screen reader announces button purpose
   - Disabled state prevents interaction

4. Mobile:
   - Touch targets easy to tap
   - No accidental taps on adjacent buttons
   - Buttons don't overflow on small screens
   - Loading state visible on mobile

5. Edge cases:
   - Very long button text wraps properly
   - Disabled + loading state handled
   - Multiple rapid clicks handled
   - Button in modal/overlay works
*/

export {
  Example1,
  Example2,
  Example3,
  Example4,
  Example5,
};
