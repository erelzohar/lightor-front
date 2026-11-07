import { optionalPart } from '../designs/parts';

/**
 * LT-603: the contact window (with its QR code) is its own part: a page
 * downloads it after it shows, or at the first tap that opens it. The window
 * itself is ContactModalView.
 */
export const ContactModal = optionalPart('contactModal', (m) => m.ContactModal, (props) => props.isOpen);
