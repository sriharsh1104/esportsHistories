---
name: react-native-coding-standards
description: Senior-level React Native coding standards for this project. Use when implementing, refactoring, or reviewing React Native code in this repository, especially when deciding patterns, structure, and quality expectations.
---

# React Native Coding Standards

Use these standards for all React Native code in this project. When they differ from generic advice, these rules win.

## Core Principles

- Prefer **clarity over cleverness**. Optimize for the next engineer reading the code.
- Keep **components small and focused**. Each file should ideally export a single main component or hook.
- Treat **types, tests, and accessibility** as non-optional for user-facing features.
- Prefer **predictable data flow** (props → state → UI). Avoid hidden side effects.

## Project Structure

- **Screens vs components**
  - Screens live under `app/` (or navigation-defined routes).
  - Reusable UI pieces live in `components/`.
  - Hooks live in `hooks/`.
- **Avoid "misc" folders**. If a folder name is not descriptive, rename it.
- **One responsibility per file**. If a file does more than one conceptual job, split it.

## TypeScript & Typing

- All new code must be **TypeScript-first** (no `.js` for React components).
- Export **named types** for props and complex values, e.g.:

```ts
type Props = {
  title: string;
  onPress: () => void;
};
```

- Prefer **exact types** over `any` or `unknown`. If you must temporarily use `any`, add a `TODO` with a clear follow-up.
- Always type:
  - Component `props`
  - Hook parameters and return types
  - Async function return types (`Promise<Result>` instead of implicit `Promise<any>`).

## Components

- Use **function components with hooks** only. No class components.
- Define components as:

```ts
export function MyComponent({ title }: Props) {
  // ...
}
```

- Keep render functions **pure**:
  - No network calls or navigation side effects directly in the render body.
  - Side effects go in `useEffect` / event handlers.
- Prefer **composition over configuration**:
  - Instead of many flags (`isSmall`, `isLarge`, `isDisabled`, etc.), compose smaller components when practical.

## State Management

- Prefer **local state** (`useState`) when:
  - Data is used in a single component (or close children).
- Prefer **context or global store** (if we have one) when:
  - Multiple unrelated branches need the same data.
- Avoid **prop drilling > 3 levels deep**; introduce context/hook instead.
- Avoid **uncontrolled shared mutable state**. Do not mutate state directly; always create new objects/arrays.

## Async Code & API Calls

- Keep **API logic out of components**:
  - Prefer calling APIs via a dedicated `services/` module or custom hook.
  - Components should know *what* they want, not *how* it is fetched.
- Always handle:
  - **Loading states**
  - **Error states**
  - **Empty states**
- Never ignore a promise. Either `await` it or explicitly handle it.

## Global loader & loading UX (this project)

- **Blocking, app-wide async** (auth, wallet, payments, critical submits): use Redux `showLoader` / `hideLoader` from `@/store/slices/loaderSlice`. Always call `hideLoader` in `finally` (or on every error path). Do not add a second full-screen loading `Modal` or duplicate `GlobalLoader` (it is mounted once in `app/_layout.tsx`).
- **Full-screen loading inside `Screen`**: use the `isLoading` prop on `components/ui/Screen.tsx`.
- **Lists / sections**: local `ActivityIndicator` with `colors.tint` is appropriate.
- **Toasts**: use `react-native-toast-message` as existing screens do; `Toaster` is wired in the root layout.

## Tooling

- **Dev server**: prefer `npm run dev` or `npm run start` (not a missing `dev` script). **Web**: `npm run web`. Static export for hosting uses `expo export` (config picks `web.output: 'static'` automatically). To force SPA mode anytime: `EXPO_WEB_OUTPUT=single`.

## Styling

- Prefer **StyleSheet.create** or **typed style helpers** over inline objects where styles are reused.
- Use a **design system** approach:
  - Centralize colors, spacing, typographic scale, and radii.
  - Avoid magic numbers. Reference constants (e.g. `spacing.md` instead of `12`).
- Do not hardcode colors or font sizes directly in components; use tokens from the theme.

## Naming & Conventions

- **Components**: `PascalCase` (`UserCard`, `LoginScreen`).
- **Hooks**: `useCamelCase` (`useAuth`, `useUserProfile`).
- **Functions/variables**: `camelCase`.
- **Files**:
  - Components: match component name (`UserCard.tsx`).
  - Hooks: `useX.ts` (`useAuth.ts`).
- Names must reflect **domain intent**, not implementation (`useTournamentSeeding`, not `useDataHook`).

## Error Handling & Logging

- Never silently swallow errors. At minimum:
  - Log them in development.
  - Surface a user-friendly message in production for user-visible failures.
- Prefer centralized error handling in:
  - API layer (`services/`).
  - App-level error boundary for unexpected React errors.
- Logs should be **actionable**:
  - Include IDs, parameters, and context.
  - Avoid logging secrets or personal data.

## Navigation

- Navigation code should be:
  - Type-safe (typed route params, strongly typed navigator).
  - Located near screen definitions or in a `navigation/` module.
- When navigating:
  - Use **semantic route names** (`"MatchDetails"`, not `"Screen3"`).
  - Pass minimal data; prefer IDs versus entire objects, then refetch if needed.

## Accessibility & UX

- All tappable elements must:
  - Have an accessible label when the visible text is not obvious.
  - Use minimum touch target sizes.
- Respect platform conventions:
  - Back behavior.
  - Safe areas.
  - System font scaling where appropriate.
- Avoid surprising navigation or destructive actions without user confirmation.

## Testing

- New features should ship with **tests at the right level**:
  - Unit tests for hooks and pure logic.
  - Component tests for complex UI behavior.
- Keep tests **deterministic**:
  - No reliance on real time, random values, or network.
- Name tests to describe **behavior**, not implementation:
  - `renders tournament details when data is loaded` rather than `testRender`.

## Performance

- Avoid unnecessary re-renders:
  - Memoize expensive computations with `useMemo`.
  - Memoize stable callbacks with `useCallback` when passing to deeply nested components.
- Do not prematurely optimize:
  - Only introduce memoization or virtualization when you have evidence (slow interactions, profiling data).

## Code Review Expectations

When reviewing or writing code, check:

- **Correctness**: Does it handle edge cases and error states?
- **Readability**: Would a new teammate understand this quickly?
- **Consistency**: Does it match these standards and existing patterns?
- **Safety**: Are there crashes, race conditions, or data leaks?
- **Test coverage**: Are important paths covered?

## How to Use This Skill

- When implementing a feature:
  - Make structure, naming, and types align with these standards.
  - Factor shared logic into hooks or services early.
- When refactoring:
  - Improve structure and naming toward these guidelines.
  - Eliminate dead code and duplicated logic.
- When reviewing:
  - Reference this skill explicitly in feedback.
  - Prefer concrete suggestions ("extract a hook for this polling logic") over vague comments.

