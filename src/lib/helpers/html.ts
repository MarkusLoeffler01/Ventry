import React, { type ReactElement, type ComponentType } from "react";

/**
 * Renders a React component to static HTML string for email templates
 * 
 * @template T - The props type for the component
 * @param Component - React component to render
 * @param props - Props to pass to the component (fully typed with intellisense)
 * @returns Promise that resolves to complete HTML string with DOCTYPE
 * 
 * @example
 * ```typescript
 * // Full intellisense support for props
 * const html = await renderComponentToHTML(PasswordResetMail, {
 *   resetUrl: "https://example.com/reset",
 *   userName: "John Doe",
 *   expiryHours: 24
 * });
 * ```
 */
export async function renderComponentToHTML<T extends Record<string, unknown> = Record<string, never>>(
  Component: ComponentType<T>,
  props: T
): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");

  // Create React element without JSX for better compatibility
  const element: ReactElement<T> = React.createElement(Component, props);
  const html = renderToStaticMarkup(element);

  return `<!DOCTYPE html>${html}`;
}

/**
 * Type helper to extract props type from a React component
 * Useful for creating strongly typed email template functions
 * 
 * @example
 * ```typescript
 * type PasswordResetProps = ComponentProps<typeof PasswordResetMail>;
 * ```
 */
export type ComponentProps<T extends ComponentType<unknown>> = 
  T extends ComponentType<infer P> ? P : never;