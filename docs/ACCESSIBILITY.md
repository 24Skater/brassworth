# Accessibility Guide

This document outlines the accessibility features and best practices implemented in Home Asset Keeper.

## WCAG 2.1 AA Compliance

Home Asset Keeper aims to meet WCAG 2.1 Level AA standards for accessibility.

### Keyboard Navigation

- **Tab Navigation**: All interactive elements are keyboard accessible
- **Skip Links**: Skip to main content link available
- **Focus Management**: Visible focus indicators on all interactive elements
- **Keyboard Shortcuts**: Common actions have keyboard shortcuts

### Screen Reader Support

- **ARIA Labels**: All interactive elements have appropriate ARIA labels
- **Semantic HTML**: Proper use of semantic HTML elements
- **Live Regions**: Dynamic content updates announced to screen readers
- **Alt Text**: All images have descriptive alt text

### Color Contrast

- **Text Contrast**: All text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- **Interactive Elements**: Buttons and links have sufficient contrast
- **Focus Indicators**: High-contrast focus indicators

### Focus Management

- **Visible Focus**: All focusable elements have visible focus indicators
- **Focus Order**: Logical tab order throughout the application
- **Focus Trapping**: Modal dialogs trap focus appropriately

## Components

### Theme Toggle

The theme toggle component supports:

- Keyboard navigation (Enter/Space to activate)
- ARIA labels for screen readers
- System preference detection
- Manual theme selection

### Error Boundary

The error boundary component:

- Provides user-friendly error messages
- Includes recovery options
- Logs errors appropriately
- Maintains accessibility during errors

### Empty States

Empty state components:

- Provide clear messaging
- Include actionable next steps
- Use appropriate ARIA live regions
- Support keyboard navigation

### Skip Link

Skip link component:

- Allows keyboard users to skip navigation
- Visible on focus
- Links to main content area

## Testing

### Automated Testing

- **axe DevTools**: Integrated in development mode
- **Lighthouse**: Regular accessibility audits
- **ESLint**: Accessibility linting rules

### Manual Testing

- **Keyboard Navigation**: Test all features with keyboard only
- **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
- **Color Contrast**: Verify contrast ratios
- **Focus Management**: Verify focus indicators and order

## Best Practices

### 1. Use Semantic HTML

```tsx
// ✅ Good
<button onClick={handleClick}>Click me</button>
<nav aria-label="Main navigation">...</nav>

// ❌ Bad
<div onClick={handleClick}>Click me</div>
<div>...</div>
```

### 2. Provide ARIA Labels

```tsx
// ✅ Good
<button aria-label="Close dialog">×</button>
<input aria-label="Search items" />

// ❌ Bad
<button>×</button>
<input />
```

### 3. Ensure Keyboard Accessibility

```tsx
// ✅ Good
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</button>
```

### 4. Maintain Color Contrast

- Use design system colors (they meet contrast requirements)
- Test custom colors with contrast checkers
- Don't rely on color alone to convey information

### 5. Provide Alternative Text

```tsx
// ✅ Good
<img src="item.jpg" alt="Red bicycle with basket" />

// ❌ Bad
<img src="item.jpg" alt="image" />
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Last Updated**: December 2024
