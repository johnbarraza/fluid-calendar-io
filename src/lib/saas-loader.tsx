import { Suspense, lazy, ComponentType } from "react";
import { isSaasEnabled, isFeatureEnabled } from "./config";

/**
 * Dynamically loads a SAAS component if SAAS features are enabled
 * Falls back to a fallback component or null if SAAS is disabled
 *
 * @param path Path to the SAAS component relative to src/saas
 * @param featureName Name of the feature to check in feature flags
 * @param fallback Optional fallback component to use if SAAS is disabled
 * @returns The loaded component or fallback
 */
export function loadSaasComponent<T extends object>(
  path: string,
  featureName: string,
  fallback: ComponentType<T> | null = null
): ComponentType<T> {
  // If SAAS is disabled or the specific feature is disabled, return fallback
  if (!isSaasEnabled || !isFeatureEnabled(featureName)) {
    return fallback || (() => null);
  }

  try {
    // Dynamically import the SAAS component
    // Use a function that returns a promise to make it compatible with React.lazy
    const Component = lazy(() => {
      return import(`@/saas/${path}`).then((module) => {
        // Handle both default and named exports
        return {
          default: module.default || module[path.split("/").pop() || ""],
        };
      });
    });

    // Wrap in Suspense to handle loading state
    const SaasComponentWrapper = (props: T) => (
      <Suspense fallback={<div>Loading...</div>}>
        <Component {...props} />
      </Suspense>
    );

    SaasComponentWrapper.displayName = `SaasComponent(${path})`;
    return SaasComponentWrapper;
  } catch (error) {
    console.error(`Error loading SAAS component ${path}:`, error);
    return fallback || (() => null);
  }
}

/**
 * HOC to conditionally render a component only if SAAS is enabled
 *
 * @param Component The component to conditionally render
 * @param featureName Name of the feature to check in feature flags
 * @returns The component if SAAS is enabled, null otherwise
 */
export function withSaasFeature<T extends object>(
  Component: ComponentType<T>,
  featureName: string
): ComponentType<T> {
  const WithSaasFeature = (props: T) => {
    if (!isSaasEnabled || !isFeatureEnabled(featureName)) {
      return null;
    }

    return <Component {...props} />;
  };

  WithSaasFeature.displayName = `WithSaasFeature(${
    Component.displayName || Component.name || "Component"
  })`;
  return WithSaasFeature;
}
