# Dashboard Migration Plan

## Overview
This document outlines the proposed changes to migrate the Dashboard (`src/app/page.tsx`) to use the new UI component library.

**Scope**: Dashboard screen ONLY
**Approach**: Replace inline UI code with reusable components
**No Changes To**: Layout structure, data logic, queries, behavior

---

## Changes Summary

### 1. Buttons
**Current**: Inline Tailwind classes on every button
**New**: Use `Button` component

#### Quick Action Buttons (Header)
```tsx
// BEFORE
<button
  onClick={() => setShowPaymentModal(true)}
  className="px-4 sm:px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap flex-shrink-0 shadow-sm"
>
  <span>💵</span> Collect Payment
</button>

// AFTER
<Button
  variant="primary"
  onClick={() => setShowPaymentModal(true)}
  className="bg-green-600 hover:bg-green-700 whitespace-nowrap shadow-sm"
>
  <span>💵</span> Collect Payment
</Button>
```

**Locations**:
- Header quick action buttons (2 buttons)
- Alert action buttons ("Post Now", "Apply All", etc.)
- Modal footer buttons (Cancel, Submit)
- Floating action button (+ Quick Create)

**Estimated Changes**: ~30 button replacements

---

### 2. Cards
**Current**: Inline `div` with Tailwind classes
**New**: Use `Card` component

#### Metric Cards
```tsx
// BEFORE
<Link href="/properties" className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer">
  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Properties</p>
  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalProperties}</p>
  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{stats.totalUnits} units total →</p>
</Link>

// AFTER
<Link href="/properties">
  <Card variant="clickable" className="hover:border-blue-300 dark:hover:border-blue-600">
    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Properties</p>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalProperties}</p>
    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{stats.totalUnits} units total →</p>
  </Card>
</Link>
```

**Locations**:
- 4 metric cards (Properties, Occupancy, Revenue, Need to Collect)
- 6 navigation cards (Properties, Leases, Maintenance, etc.)
- Alert cards (Cron warning, pending charges, rent increases)
- Needs Attention section
- Expiring Leases card

**Estimated Changes**: ~15 card replacements

---

### 3. Form Inputs
**Current**: Inline input/select styling
**New**: Use `Input`, `Select`, `Textarea` components

#### Input Example
```tsx
// BEFORE
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
  <input
    type="number"
    value={paymentForm.amount}
    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
    placeholder="0.00"
  />
</div>

// AFTER
<Input
  label="Amount *"
  type="number"
  value={paymentForm.amount}
  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
  placeholder="0.00"
/>
```

**Locations**:
- Payment modal (5 form fields)
- Charge modal (4 form fields)
- Work Order modal (8 form fields)
- Quick Create modal (property, unit, lease, expense, vendor forms)

**Estimated Changes**: ~40 form field replacements

---

### 4. Modals
**Current**: Custom modal structure with overlay
**New**: Use `Modal`, `ModalHeader`, `ModalContent`, `ModalFooter` components

#### Modal Example
```tsx
// BEFORE
{showPaymentModal && (
  <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
    <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
        <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
      </div>
      <div className="space-y-4">
        {/* Form content */}
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
        <button>Cancel</button>
        <button>Submit</button>
      </div>
    </div>
  </div>
)}

// AFTER
<Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} size="medium">
  <ModalHeader onClose={() => setShowPaymentModal(false)}>
    Record Payment
  </ModalHeader>
  <ModalContent>
    {/* Form content */}
  </ModalContent>
  <ModalFooter>
    <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleRecordPayment} loading={submittingPayment}>
      Record Payment
    </Button>
  </ModalFooter>
</Modal>
```

**Locations**:
- Payment modal
- Charge modal
- Work Order modal
- Quick Create modal

**Estimated Changes**: 4 modals

---

## What WILL NOT Change

### Layout Structure
- Grid layouts remain the same
- Responsive breakpoints unchanged
- Section organization unchanged
- Max-width containers unchanged

### Data Logic
- No changes to `fetchAllData()` or API calls
- No changes to state management
- No changes to form handlers
- No changes to optimistic updates

### Behavior
- Click handlers unchanged
- Navigation unchanged
- Pull-to-refresh unchanged
- Toast notifications unchanged
- Form validation unchanged

### Styling Details
- Color scheme unchanged
- Spacing unchanged
- Typography hierarchy unchanged
- Dark mode unchanged
- Responsive behavior unchanged

---

## Import Changes

**Add to top of file**:
```tsx
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from '@/components/ui';
```

---

## Benefits

1. **Consistency**: All UI elements follow design system
2. **Maintainability**: Changes to buttons/cards update everywhere
3. **Accessibility**: Built-in focus management, keyboard navigation
4. **Type Safety**: TypeScript props ensure correct usage
5. **Loading States**: Button loading states handled automatically
6. **Error Handling**: Form inputs have built-in error display
7. **Code Reduction**: ~500 lines of inline styling replaced with components

---

## Risk Assessment

**Low Risk**:
- Components tested and type-checked
- No logic changes
- Incremental migration (one screen)
- Easy to rollback if needed

**Testing Required**:
- Manual testing of all modals
- Form submission testing
- Mobile responsive testing
- Dark mode testing

---

## Timeline

**Estimated effort**: 2-3 hours
- Replace buttons: 30 min
- Replace cards: 30 min
- Replace form inputs: 60 min
- Replace modals: 60 min
- Testing: 30 min

---

## Next Steps

1. **User Review**: Review this plan
2. **User Approval**: Confirm approach
3. **Implementation**: Apply changes to Dashboard
4. **Testing**: Verify all functionality
5. **Commit**: Create git commit with changes
6. **Evaluation**: Assess results before next screen

---

## Questions for User

1. Should we keep emoji icons in buttons/cards?
2. Any specific button colors/variants to preserve?
3. Should floating action button (+) use Button component or keep custom?
