# Security Review

## Scope and audit order

The recommended order is:

1. Audit and harden the Laravel backend in `apotek-capstone`.
2. Audit the Next.js frontend in `apotek-frontend`.
3. Re-test the integration between both applications.

The backend is first because authentication, authorization, tenant isolation, stock mutation, transaction data, and PDF exports are enforced there. Frontend route guards and hidden UI controls must not be treated as security boundaries.

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | HIGH | `app/Http/Controllers/KasirTransaksiController.php` | 24, 56, 88, 150 | Web cashier queries do not consistently scope medicines by the logged-in pharmacy. A cashier may view, add, remove, or check out medicines belonging to another pharmacy. | 10/10 |
| 2 | HIGH | `app/Http/Controllers/PenjualanController.php` | 19, 23, 24, 38 | Web sales history, statistics, and PDF exports query sales globally without pharmacy scoping. A user may access another pharmacy's transaction by ID. | 10/10 |
| 3 | HIGH | `app/Http/Controllers/UserController.php` | 22-25, 40, 61, 77 | Admin user management is global. An admin can list, create, update, or delete users belonging to another pharmacy. | 8/10 |
| 4 | MEDIUM | `.env.example` | 4, 24, 35, 37 | The template uses development-oriented debug/logging defaults and does not explicitly require secure session cookies for production deployment. | 8/10 |

## Recommendations

### P0

- Apply pharmacy scoping to every web medicine query, cart operation, checkout query, sales history query, dashboard statistic, and PDF export.
- Add policies or centralized tenant scopes so authorization cannot depend only on route middleware.
- Add cross-pharmacy authorization tests for web routes, PDF endpoints, and model IDs.
- Never return raw exception messages from API responses; log details internally and return a generic client message.

### P1

- Scope admin user management to the administrator's pharmacy.
- Introduce a normalized `apotek` entity and foreign keys such as `apotek_id` instead of relying on free-form pharmacy strings.
- Define whether medicine codes are globally unique or unique per pharmacy, then enforce that rule at the database level.

### Deployment hardening

- Use `APP_ENV=production` and `APP_DEBUG=false` in production.
- Use an appropriate non-debug log level and review log access permissions.
- Serve the application over HTTPS and enable secure session cookies.
- Keep `.env` and all credential values out of version control; this review intentionally does not record their values.

## Positive controls observed

- API medicine and transaction endpoints use pharmacy-aware filtering in several paths.
- Checkout uses a database transaction and row locking for stock updates.
- Login includes rate limiting and session regeneration.
- Passwords use Laravel's hashed cast.

## Validation note

The review was read-only. PHP syntax and Composer manifest validation passed, but the Laravel test suite could not be executed before dependencies were installed because `vendor/autoload.php` was absent.
