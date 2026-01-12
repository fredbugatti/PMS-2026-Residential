# UI Component Library

This is the core component library for the Property Management Software. All components follow the design system principles defined in the UI/UX plan.

## Installation

The component library uses `lucide-react` for icons:

```bash
npm install lucide-react
```

## Usage

Import components from the barrel export:

```tsx
import { Button, Input, Card, Badge } from '@/components/ui';
```

---

## Components

### Button

A button component with multiple variants and sizes.

**Variants**: `primary` | `secondary` | `destructive` | `ghost`
**Sizes**: `default` | `compact` | `large`

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="default">
  Save changes
</Button>

<Button variant="destructive" loading>
  Deleting...
</Button>
```

---

### Input

Text input with label, error, and helper text support.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error="Invalid email address"
  helperText="We'll never share your email"
/>
```

---

### Select

Dropdown select with consistent styling.

```tsx
import { Select } from '@/components/ui';

<Select
  label="Property"
  options={[
    { value: '1', label: 'Property 1' },
    { value: '2', label: 'Property 2' },
  ]}
  error="Please select a property"
/>
```

---

### Textarea

Multi-line text input.

```tsx
import { Textarea } from '@/components/ui';

<Textarea
  label="Description"
  placeholder="Enter description"
  rows={4}
/>
```

---

### Card

Container component with optional header, content, and footer.

**Variants**: `default` | `metric` | `clickable`

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';

<Card variant="default">
  <CardHeader>
    <CardTitle>Property Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>123 Main Street</p>
  </CardContent>
  <CardFooter>
    <Button>Edit</Button>
  </CardFooter>
</Card>
```

---

### Badge

Status indicator with semantic colors.

**Variants**: `success` | `warning` | `error` | `info` | `draft` | `default`
**Sizes**: `default` | `small`

```tsx
import { Badge, StatusBadge, PriorityBadge } from '@/components/ui';

<Badge variant="success">Active</Badge>
<StatusBadge status="ACTIVE" />
<PriorityBadge priority="HIGH" />
```

**Preset Badges**:
- `StatusBadge`: For lease/work order status (ACTIVE, DRAFT, ENDED, etc.)
- `PriorityBadge`: For work order priority (LOW, MEDIUM, HIGH, EMERGENCY)

---

### Modal

Dialog component with overlay, header, content, and footer.

**Sizes**: `small` | `medium` | `large`

```tsx
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui';

<Modal isOpen={isOpen} onClose={handleClose} size="medium">
  <ModalHeader onClose={handleClose}>
    Confirm Action
  </ModalHeader>
  <ModalContent>
    <p>Are you sure you want to proceed?</p>
  </ModalContent>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </ModalFooter>
</Modal>
```

---

### Table

Data table with consistent styling.

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Smith</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>
        <Badge variant="success">Active</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Design Tokens

Semantic color tokens are available in `globals.css`:

### Light Mode
- `--background`: Page background (gray-50)
- `--foreground`: Primary text (gray-900)
- `--surface`: Card/modal background (white)
- `--border`: Border color (gray-200)
- `--text-primary`: Primary text (gray-900)
- `--text-secondary`: Secondary text (gray-600)
- `--text-muted`: Muted text (gray-500)
- `--status-success`: Green-600
- `--status-warning`: Amber-500
- `--status-error`: Red-600
- `--status-info`: Blue-600

### Dark Mode
All tokens have dark mode variants that are automatically applied with the `.dark` class.

---

## Design Principles

1. **Clarity Over Density**: Show less, show it well
2. **Progressive Disclosure**: Summary first, details on demand
3. **Status-Driven Design**: Color communicates meaning, not decoration
4. **Predictable Patterns**: Learn once, apply everywhere
5. **Forgiving Interactions**: Undo where possible, confirm destructive actions

---

## Component Guidelines

### When to Use

- **Button**: All clickable actions (save, delete, cancel, etc.)
- **Input/Select/Textarea**: All form fields
- **Card**: Grouped information, entity summaries, metric displays
- **Badge**: Status indicators, priorities, tags
- **Modal**: Quick forms, confirmations, detail views
- **Table**: Structured data lists, sortable/filterable data

### When NOT to Use

- **Card**: Single data points (use inline display)
- **Table**: Fewer than 5 items (use cards), mobile-first views (use stacked cards)
- **Modal**: Complex multi-step flows (use full page)

---

## Migration Notes

This component library is designed to be incrementally adopted. Components can be used alongside existing UI code without breaking changes.

**Next Steps**:
1. Use new components in new features
2. Gradually replace inline styles with components
3. Update high-traffic screens (Dashboard, Leases, Accounting)
4. Ensure consistency across all screens

For full design system documentation, see: `~/.claude/plans/shimmying-frolicking-balloon.md`
