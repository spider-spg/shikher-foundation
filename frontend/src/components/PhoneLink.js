import React from 'react';
import { FaPhoneAlt } from 'react-icons/fa';

/**
 * PhoneLink — renders a tappable phone number.
 * On mobile: tapping opens the dialler immediately.
 * Props:
 *   phone      — the phone number string (e.g. '+91-9324335478' or '9111122222')
 *   showIcon   — whether to show the phone icon (default: true)
 *   className  — extra Tailwind classes
 */
const PhoneLink = ({ phone, showIcon = true, className = '' }) => {
  if (!phone) return null;

  // Strip everything except digits and leading + for the href
  const dialNumber = phone.replace(/[^\d+]/g, '');
  // Ensure Indian numbers have country code
  const href = dialNumber.startsWith('+')
    ? `tel:${dialNumber}`
    : `tel:+91${dialNumber}`;

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline transition-colors ${className}`}
      // Don't open a new tab — dialler handles it
      onClick={(e) => e.stopPropagation()}
    >
      {showIcon && <FaPhoneAlt className="flex-shrink-0 text-xs" />}
      {phone}
    </a>
  );
};

export default PhoneLink;