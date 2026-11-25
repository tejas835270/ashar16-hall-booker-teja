# Booking Review AI and Staff Security

## What will change

- Add an Admin dashboard review that summarizes bookings created in the last seven days and highlights details that may need staff attention.
- Keep the staff sign-in screen username-and-password only. No email field, public staff sign-ups, resident accounts, or extra staff profile details; keep access roles separate from profile data.
- Preserve resident booking as a guest flow. Public pages will receive only the schedule and settings they need, and booking submissions will go through a restricted server-side path rather than direct table access.
- Protect staff-only booking, settings, credential, audit-log, and upload operations with server-verified roles. Preserve existing admin, viewer, and guard capabilities according to their current permissions.
- Keep the work limited to the selected security findings and the new booking-review feature.

## AI review

- Use Lovable AI on the server, with the verified zero-retention `openai/gpt-6.1-sol` model.
- Send only booking fields needed for review; omit names, flat numbers, phone numbers, and screenshot contents.
- Compare bookings against existing society rules and settings, and present the output as review suggestions rather than automatic booking changes.
- Include clear loading, empty, and error states; never substitute a fabricated summary when the AI request fails.

## Technical approach

- Keep the React/Vite client. Put authentication checks, privileged database access, protected file access, and the AI Gateway call in Lovable Cloud Edge Functions.
- Store only staff usernames and role assignments; use a separate protected role table. Validate every privileged request on the server, not with browser storage.
- Replace direct public CRUD with narrow server operations and database policies. Preserve the public guest booking flow while limiting public reads to non-sensitive calendar/configuration data.
- Keep existing payment proof, rules PDF, and payment QR workflows available through protected upload and viewing paths.

## Verification

- Test username/password sign-in without an email field, Admin/Viewer/Guard role restrictions, guest booking, and protected file viewing.
- Test booking-review output and failure handling with real booking-shaped input, without exposing resident contact details to the model.
- Recheck only the requested security findings after the changes.