# Rapido - Google Play Console - App Access (Copy/Paste)

Use this file to fill **App access** in Google Play Console.

---

## Step 1 - Select the correct option in Play Console

Choose:

- `Access is limited for all or some features of my app`

---

## Step 2 - Add up to 5 instructions (Google recommendation)

Prefilled review credentials:

- Email: `christopherguidibi@gmail.com`
- Password: `12345678`

---

## Instruction 1 - Main login flow (recommended)

### Instruction name
`Rapido - Client review access`

### Username and password

Username:
`christopherguidibi@gmail.com`

Password:
`12345678`

### Other instructions (max 500 chars, paste this)

```text
Use the test account above to access Rapido's client features. Review flow: 1) Open the app 2) Sign in with email/password 3) Allow location to view nearby restaurants 4) Browse menus, add items to cart, and continue to checkout. If location is denied, manual map selection is available. Push notifications and biometric login are not required.
```

---

## Instruction 2 - Activation code (if requested)

Use only if the submitted build asks for an activation code.

### Instruction name
`Rapido - Activation code`

### Other instructions (max 500 chars, paste this)

```text
If an activation/registration code is requested during onboarding, use:
DDT2GF57NQQ5EAAAAAAAAAAAAA
```

---

## Instruction 3 - Location permission clarification

### Instruction name
`Rapido - Location permission`

### Other instructions (max 500 chars, paste this)

```text
Location access improves nearby restaurant results. For review, tap "Allow" when prompted. If denied, continue with manual map/location selection and proceed with browsing and checkout tests.
```

---

## Instruction 4 - Optional permissions clarification

### Instruction name
`Rapido - Optional permissions`

### Other instructions (max 500 chars, paste this)

```text
Push notifications are optional and not required to test core features. Biometric authentication is not required for this review account.
```

---

## Instruction 5 - Fallback short version

### Instruction name
`Rapido - Review fallback`

### Username and password

Username:
`christopherguidibi@gmail.com`

Password:
`12345678`

### Other instructions (max 500 chars, paste this)

```text
Use the credentials above to sign in and access the app. Please allow location permission to test nearby restaurants and the order flow. Biometric login and push notifications are not required for core testing.
```

---

## Account deletion URL (Data safety section)

Public page hosted by Rapido, no login required:

- Primary URL: `https://<YOUR_DOMAIN>/account-deletion`
- French alias: `https://<YOUR_DOMAIN>/suppression-compte`

Replace `<YOUR_DOMAIN>` with the production frontend domain (the same used in `REACT_APP_BASE_URL` or your public website, e.g. `rapido.bj`).

What the page does:
- Lets the user choose between two actions:
  1. Request account deletion (with optional reason).
  2. Send a message to the Rapido support team.
- Lists what is deleted (profile, credentials, saved address) and what may be retained anonymized (order/invoice records, security logs).
- Submits to the Rapido backend; requests are reviewed manually in the admin dashboard within 7 days. Users are notified by email when their request is processed.

Paste this in the "Account deletion URL" field in Play Console > App content > Data safety.

---

## Final checklist before saving

- Credentials are valid and do not expire soon.
- Account is a regular client account (not restaurant/manager 2FA flow).
- Login works on the exact build submitted to Play Console.
- Each "Other instructions" block is under 500 characters.
- If needed, activation code is included.
- Add all 5 instructions in Play Console for maximum clarity.

