// EmailJS Automated Welcome Email Service for ArchSketch
// Uses standard EmailJS REST API with zero external dependencies

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

const STORAGE_KEY_EMAILJS = 'archsketch_emailjs_config_v1';

// Get EmailJS configuration from environment or localStorage
export function getEmailJSConfig(): EmailJSConfig {
  const envServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
  const envTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
  const envPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMAILJS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.serviceId && parsed.templateId && parsed.publicKey) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }

  return {
    serviceId: envServiceId,
    templateId: envTemplateId,
    publicKey: envPublicKey,
  };
}

export function saveEmailJSConfig(config: EmailJSConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_EMAILJS, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save EmailJS config to localStorage:', err);
  }
}

/**
 * Sends the personalized welcome email to the user on their first login
 */
export async function sendWelcomeEmail({
  toEmail,
  toName,
  appUrl,
}: {
  toEmail: string;
  toName?: string;
  appUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const config = getEmailJSConfig();

  // If EmailJS keys haven't been entered yet, log gracefully without breaking the app
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    console.info(
      'EmailJS is not fully configured yet. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to .env.local to enable automated emails.'
    );
    return {
      success: false,
      error: 'EmailJS credentials not configured yet.',
    };
  }

  const displayName = toName?.trim() || toEmail.split('@')[0] || 'Architect';
  const siteUrl = appUrl || window.location.origin;

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
          name: displayName,
          email: toEmail,
          to_email: toEmail,
          to_name: displayName,
          app_url: siteUrl,
        },
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      console.warn('EmailJS send failed:', errorText);
      return { success: false, error: errorText };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    console.error('Failed to send welcome email:', message);
    return { success: false, error: message };
  }
}
