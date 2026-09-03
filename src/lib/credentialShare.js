// Shared by the Platform Console's client-onboarding flow and the in-app Team & Users
// flow -- both need to hand a temp password to someone through whatever channel the admin
// already uses, since there's no real transactional email service in this app yet.

export function buildCredentialMessage({ recipientName, email, tempPassword, roleLabel }) {
  const loginUrl = `${window.location.origin}/login`;
  return `Hi ${recipientName},

You've been added to the Scaleezy Inventory workspace${roleLabel ? ` as ${roleLabel}` : ''}.

Email: ${email}
Password: ${tempPassword}

Log in here: ${loginUrl}
If you ever need this password re-shared or changed, ask your Super Admin or Admin.`;
}

export function buildCredentialMailto({ recipientName, email, tempPassword, roleLabel }) {
  const subject = 'Your Scaleezy Inventory login';
  const body = buildCredentialMessage({ recipientName, email, tempPassword, roleLabel });
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildCredentialWhatsapp({ recipientName, email, tempPassword, roleLabel, phone }) {
  const text = buildCredentialMessage({ recipientName, email, tempPassword, roleLabel });
  // No phone on file -- open WhatsApp with the message ready and let the admin pick the
  // contact themselves, same tradeoff as mailto needing no stored phone number either.
  const target = phone ? phone.replace(/[^0-9]/g, '') : '';
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}
