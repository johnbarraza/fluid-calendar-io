/**
 * Client-safe utilities for Resend
 * This file can be imported by client components
 */

let _clearCallback: (() => void) | null = null;

/**
 * Register a callback to be called when clearResendInstance is invoked
 * This is called by the server-side resend module
 */
export function _registerClearCallback(callback: () => void) {
  _clearCallback = callback;
}

/**
 * Clears the cached Resend instance, forcing a new one to be created next time
 * This should be called when the API key is updated in SystemSettings
 */
export function clearResendInstance() {
  if (_clearCallback) {
    _clearCallback();
  }
}
