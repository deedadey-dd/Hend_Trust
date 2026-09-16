# TASK: Audit, Expand, and Operationalize the Automated Testing System

You are acting as a **Senior QA Engineer, Test Automation Architect, Django/DRF Engineer, React/TypeScript Engineer, and Security Engineer**.

You are working on an existing production-oriented web application with:

- **Backend:** Django
- **API:** Django REST Framework
- **Database:** PostgreSQL
- **Frontend:** React + TypeScript
- **Existing backend tests:** 100+ pytest tests
- **Architecture:** Django backend + React frontend
- **Domain:** Escrow / Trust Infrastructure platform involving users, sellers, buyers, transactions, payments, escrow funds, delivery, disputes, reviews, reputation, notifications, and administration.

Your task is to **inspect the existing codebase and build a comprehensive automated testing system around the application**.

## VERY IMPORTANT

**Do NOT start by creating a new testing system from scratch.**

There are already more than 100 pytest tests.

Your first responsibility is to:

1. Discover all existing tests.
2. Understand what they test.
3. Run them.
4. Determine their current status.
5. Identify duplicated tests.
6. Identify weak or superficial tests.
7. Identify missing coverage.
8. Preserve useful existing tests.
9. Refactor tests only where necessary.
10. Extend the existing test architecture rather than unnecessarily replacing it.

Do not delete existing tests simply because they are inconvenient, fail, or duplicate functionality.

If an existing test is incorrect, explain why and fix it appropriately.

---

# 1. FIRST: PERFORM A COMPLETE TESTING AUDIT

Before modifying code, inspect the entire repository.

Understand:

```text
Backend
Frontend
Database
Authentication
Authorization
API endpoints
Models
Serializers
Views/ViewSets
Services
Utilities
Signals
Tasks
Celery jobs
Payment integrations
Webhooks
Notifications
File/document uploads
Transaction state machine
Escrow logic
Dispute logic
Review/reputation system
Admin functionality
Configuration
Environment variables
Docker configuration
CI/CD configuration
Existing tests
```

Do not assume the README accurately represents the current implementation.

The source code is the source of truth.

---

# 2. AUDIT THE EXISTING 100+ PYTEST TESTS

Locate every existing test.

Determine:

- What each test covers.
- Which application/module it belongs to.
- Whether it is a unit, integration, API, security, or workflow test.
- Whether it actually tests meaningful behavior.
- Whether it relies on mocks where real integration testing would be more appropriate.
- Whether it creates real PostgreSQL-compatible test data.
- Whether tests are isolated.
- Whether tests depend on execution order.
- Whether tests leave database state behind.
- Whether fixtures are reusable.
- Whether there are redundant tests.
- Whether there are tests that pass without actually proving the intended behavior.
- Whether important business rules have no tests.

Create an internal coverage map similar to:

```text
Feature                  Existing Tests    Quality       Missing Tests
---------------------------------------------------------------------
Authentication           15                Good         3
Seller                   12                Good         8
Buyer                    8                 Partial      10
Transactions             20                Good         5
Payments                 5                 Weak         15
Escrow                   4                 Partial      20
Disputes                 3                 Weak         12
Reviews                  2                 Partial      8
Permissions              5                 Weak         15
Security                 1                 Weak         20
Notifications            2                 Partial      8
```

The exact numbers should be determined from the codebase rather than invented.

---

# 3. ESTABLISH A BASELINE

Before making significant changes, run the existing test suite.

Record:

```text
Total tests
Passed
Failed
Skipped
Errors
Warnings
Execution time
Coverage percentage if available
```

Run the appropriate test commands based on the repository.

Do not assume the command is simply:

```bash
pytest
```

Inspect the project configuration first.

Also determine:

- Django version
- Python version
- pytest configuration
- pytest-django configuration
- database configuration
- test settings
- coverage configuration
- frontend test configuration
- Node version
- package manager

---

# 4. TEST DATABASE

The application uses PostgreSQL.

Do NOT silently switch the testing strategy to SQLite simply because it is easier.

Determine how the current tests handle PostgreSQL.

Where practical, establish a dedicated PostgreSQL test database.

The test environment should resemble production sufficiently to catch PostgreSQL-specific problems.

Consider:

```text
Docker PostgreSQL
Dedicated test database
Separate test environment variables
Database isolation
Transactional tests
Test data factories
```

The tests must never accidentally modify production data.

---

# 5. BUILD A CLEAN TEST ARCHITECTURE

After understanding the existing structure, improve it where necessary.

A possible structure is:

```text
backend/
├── tests/
│   ├── conftest.py
│   │
│   ├── factories/
│   │   ├── users.py
│   │   ├── sellers.py
│   │   ├── buyers.py
│   │   ├── transactions.py
│   │   ├── payments.py
│   │   └── disputes.py
│   │
│   ├── unit/
│   │   ├── users/
│   │   ├── transactions/
│   │   ├── payments/
│   │   ├── escrow/
│   │   └── reputation/
│   │
│   ├── api/
│   │   ├── authentication/
│   │   ├── sellers/
│   │   ├── buyers/
│   │   ├── transactions/
│   │   ├── payments/
│   │   ├── disputes/
│   │   └── reviews/
│   │
│   ├── permissions/
│   ├── security/
│   ├── integrations/
│   └── workflows/
│
frontend/
├── src/
└── tests/
```

However, **do not force this exact structure** if the existing architecture is already good.

Use the existing conventions where appropriate.

---

# 6. TEST FACTORIES AND FIXTURES

Create or improve reusable test fixtures/factories.

We should be able to easily create:

```text
User
Buyer
Seller
Admin
Verified Seller
Unverified Seller
Transaction
Paid Transaction
Unpaid Transaction
Shipped Transaction
Delivered Transaction
Disputed Transaction
Completed Transaction
Cancelled Transaction
Refunded Transaction
Payment
Refund
Review
Dispute
Evidence
Notification
Shipping record
```

Prefer reusable fixtures/factories rather than repeatedly constructing large amounts of test data manually.

Make fixtures explicit enough that tests remain readable.

---

# 7. AUTHENTICATION TESTS

Ensure automated tests cover:

### Registration

- Valid registration.
- Invalid email.
- Invalid phone.
- Duplicate email.
- Duplicate phone.
- Weak password.
- Missing required fields.
- Invalid data.
- Seller registration.
- Buyer registration.

### Login

- Valid credentials.
- Invalid password.
- Unknown user.
- Inactive account.
- Suspended account.
- Unverified account where applicable.
- Token/session behavior.

### Password

- Password reset.
- Invalid reset token.
- Expired reset token.
- Password change.
- Old password rejection.
- New password validation.

### Verification

- Email verification.
- Phone verification.
- Invalid verification code.
- Expired code.
- Reuse of verification code.
- Verification attempts/rate limiting.

---

# 8. SELLER TESTS

Automate the complete seller lifecycle.

Test:

```text
Register
Activate
Login
Verify email
Verify phone
Complete profile
Upload documents
Complete KYC if implemented
Create shop
Update shop
Configure shop
Create transaction
Edit transaction
Cancel transaction
Generate transaction/buyer link
Share transaction
View transaction
Receive payment notification
Confirm shipment
Add tracking information
Confirm delivery where applicable
Receive payout
View transaction history
View earnings
View reviews
Leave buyer review
Update profile
Change password
Logout
```

Also test invalid and unauthorized versions of each operation.

---

# 9. BUYER TESTS

Automate:

```text
Visit transaction link
View transaction details
Register
Login
Accept transaction terms
Make payment
Payment success
Payment failure
Payment cancellation
Monitor transaction
Track shipment
Confirm receipt
Raise dispute
Upload evidence
Respond to dispute requests
Receive refund
Review seller
View seller reputation
View transaction history
Update profile
Logout
```

Test both authenticated and unauthenticated flows where appropriate.

---

# 10. ESCROW STATE MACHINE TESTING

This is one of the highest-priority areas.

Identify the actual transaction states implemented by the application.

Do not invent states.

Document them.

Then test every valid transition.

For example:

```text
CREATED
    ↓
AWAITING_PAYMENT
    ↓
PAYMENT_RECEIVED
    ↓
AWAITING_SHIPMENT
    ↓
SHIPPED
    ↓
DELIVERED
    ↓
INSPECTION
    ↓
COMPLETED
```

And alternative paths such as:

```text
CANCELLED
REFUNDED
DISPUTED
EXPIRED
CHARGEBACK
UNDER_INVESTIGATION
```

The actual application may differ.

Test:

### Valid transitions

Every legal transition must succeed.

### Invalid transitions

Every illegal transition must be rejected.

For example:

```text
CREATED → COMPLETED
AWAITING_PAYMENT → COMPLETED
COMPLETED → AWAITING_PAYMENT
REFUNDED → SHIPPED
CANCELLED → PAYMENT_RECEIVED
```

These should not be possible unless explicitly allowed by the business rules.

---

# 11. MONEY AND ESCROW INTEGRITY

Treat every money-related operation as high risk.

Test:

```text
Transaction amount
Fees
Payment amount
Escrow amount
Seller amount
Platform fee
Refund amount
Payout amount
Balance calculations
Ledger entries
```

Verify that calculations occur server-side.

Attempt to manipulate:

```text
amount
fee
seller payout
buyer refund
currency
transaction owner
payment status
escrow status
```

from the client/API.

The backend must reject unauthorized manipulation.

---

# 12. PAYMENT TESTING

Identify the payment provider/integration currently used.

Do not assume which provider it is.

Test:

```text
Payment initiated
Successful payment
Failed payment
Cancelled payment
Timeout
Provider error
Incorrect amount
Incorrect transaction
Duplicate payment
Duplicate webhook
Delayed webhook
Webhook without matching transaction
Malformed webhook
Invalid webhook signature
Payment callback failure
Payment succeeds but frontend does not receive callback
Payment succeeds and webhook arrives later
Refund
Partial refund if supported
Full refund
Failed refund
Seller payout
Failed payout
Payout retry
```

Especially test **idempotency**.

If the same successful webhook arrives five times, the system must not:

```text
credit the transaction five times
release funds five times
create five ledger entries
send five payout requests
```

unless explicitly intended.

---

# 13. DISPUTE SYSTEM

Test the entire dispute lifecycle.

```text
Buyer raises dispute
        ↓
Transaction becomes disputed
        ↓
Funds remain protected
        ↓
Seller notified
        ↓
Seller responds
        ↓
Evidence submitted
        ↓
Admin reviews
        ↓
Decision
        ↓
Refund / release / partial resolution
        ↓
Transaction closed
```

Test:

- Valid dispute.
- Invalid dispute.
- Dispute outside allowed period.
- Duplicate dispute.
- Buyer trying to dispute completed transaction.
- Seller responding.
- Seller failing to respond.
- Evidence upload.
- Invalid evidence.
- Unauthorized evidence access.
- Admin resolution.
- Refund after dispute.
- Release after dispute.
- Concurrent dispute actions.

---

# 14. DELIVERY TESTING

If shipping/delivery functionality exists, test:

```text
Shipment created
Tracking number
Tracking updates
Seller marks shipped
Courier update
Delivered
Proof of delivery
OTP
Signature
Photo evidence
Buyer confirms receipt
Buyer claims non-delivery
Seller claims delivery
```

Test conflicting scenarios.

For example:

```text
Courier says DELIVERED
Buyer says NOT RECEIVED
```

The application should follow the defined dispute/evidence rules rather than simply trusting either party.

---

# 15. INSPECTION PERIOD / AUTO RELEASE

If the application has an inspection period:

Test:

```text
Inspection starts
Inspection deadline calculated correctly
Buyer confirms early
Buyer raises dispute
Buyer does nothing
Deadline expires
Automatic release occurs
```

Also test:

```text
Timezone differences
Midnight boundaries
Expired deadlines
Repeated background task execution
Server restart
Celery retry
```

If automatic release is implemented through Celery/background tasks, test idempotency.

---

# 16. REVIEWS AND REPUTATION

Test the transaction-backed review system.

Test:

```text
Buyer reviews seller
Seller reviews buyer
Review only after eligible transaction state
Review before transaction completion
Duplicate review
Review outside review window
Review editing
Review deletion if supported
Review moderation
Review reporting
Rating calculation
Verified transaction badge
```

Prevent users from manufacturing reputation.

For example:

```text
User creates fake transaction
User completes fake transaction
User gives themselves a 5-star review
```

The system should prevent or appropriately flag this.

---

# 17. AUTHORIZATION / OBJECT-LEVEL SECURITY

This is **P0/P1 priority**.

Test for IDOR and privilege escalation.

For every endpoint involving an object ID, test:

```text
Owner accesses object          → allowed
Non-owner accesses object      → denied
Admin accesses object          → according to policy
Suspended user accesses object → denied/limited
Unauthenticated access         → denied where appropriate
```

Examples:

```text
Buyer A attempts to access Buyer B's transaction.

Seller A attempts to modify Seller B's transaction.

Buyer modifies seller information.

Seller modifies buyer information.

User accesses another user's uploaded documents.

User accesses another user's dispute.

User accesses another user's payment information.

Normal user calls admin endpoint.
```

Do not only test that buttons are hidden in React.

Test the backend API directly.

---

# 18. API SECURITY

Test:

```text
Authentication bypass
Authorization bypass
IDOR
Privilege escalation
Mass assignment
Parameter tampering
Invalid object IDs
Malformed JSON
Unexpected fields
Missing fields
Oversized requests
Rate limiting
CSRF where applicable
CORS configuration
```

Also inspect for:

```text
SQL injection
XSS
unsafe HTML rendering
unsafe file uploads
path traversal
insecure direct file access
```

Do not perform destructive attacks against external systems.

All security tests must remain within the local/test environment.

---

# 19. FILE UPLOAD TESTING

If the application supports identity documents, dispute evidence, images, receipts, etc., test:

```text
Valid file
Invalid extension
Wrong MIME type
Oversized file
Empty file
Corrupt file
Executable file
Malicious filename
Path traversal filename
Unauthorized download
Unauthorized access
Deleted file
Missing file
Duplicate file
```

Verify that uploaded files cannot be accessed by users who should not have access.

---

# 20. NOTIFICATION TESTING

Test every implemented notification mechanism.

For example:

```text
Registration
Verification
Payment received
Seller notified
Shipment created
Delivery
Inspection period
Dispute created
Dispute response
Refund
Payout
Transaction completion
Review
Security events
```

Test:

- Correct recipient.
- Correct event.
- Duplicate prevention.
- Failure handling.
- Notification preferences.
- Links point to the correct transaction.
- Unauthorized users cannot use notification links to gain access.

---

# 21. ADMIN TESTING

Test every admin capability implemented by the application.

For example:

```text
Admin login
User management
Seller verification
User suspension
Transaction management
Payment inspection
Escrow management
Refund
Payout
Dispute management
Evidence review
Review moderation
Audit logs
Reports
```

Test that ordinary users cannot access these capabilities.

---

# 22. FRONTEND TESTING

Introduce an appropriate React testing framework if one does not already exist.

Inspect the current frontend first.

Use the project's existing conventions where possible.

Test:

```text
Forms
Validation
Components
Hooks
API services
State management
Loading states
Error states
Authentication state
Protected routes
Role-based UI
Transaction status display
Payment states
Dispute UI
Review UI
Notifications
```

Do not test implementation details unnecessarily.

Prefer testing observable user behavior.

---

# 23. TYPESCRIPT TESTING

Ensure the frontend passes strict type checking.

Run the appropriate TypeScript check, for example:

```bash
tsc --noEmit
```

Do not assume this exact command; inspect package.json and project configuration first.

Any new tests or code should maintain TypeScript safety.

---

# 24. END-TO-END TESTING WITH PLAYWRIGHT

If Playwright is not already installed, introduce it.

Use Playwright for complete browser workflows.

Create realistic end-to-end scenarios.

At minimum:

### E2E-01 — Successful transaction

```text
Seller registers
↓
Seller logs in
↓
Seller creates transaction
↓
Seller generates buyer link
↓
Buyer opens link
↓
Buyer pays
↓
Payment confirmed
↓
Seller ships
↓
Delivery recorded
↓
Buyer confirms receipt
↓
Funds released
↓
Transaction completed
↓
Buyer reviews seller
↓
Seller reviews buyer
```

### E2E-02 — Seller never ships

```text
Buyer pays
↓
Seller does not ship
↓
Deadline expires
↓
System follows cancellation/refund policy
```

### E2E-03 — Buyer raises dispute

```text
Buyer pays
↓
Seller ships
↓
Buyer receives item
↓
Buyer raises dispute
↓
Evidence submitted
↓
Admin resolves
↓
Correct financial outcome
```

### E2E-04 — Failed payment

```text
Buyer initiates payment
↓
Payment fails
↓
Transaction remains unpaid
↓
Seller is not incorrectly told funds are secured
```

### E2E-05 — Unauthorized access

```text
Buyer A
↓
Attempts to access Buyer B's transaction
↓
Access denied
```

### E2E-06 — Duplicate webhook

```text
Payment webhook
Payment webhook again
Payment webhook again
↓
Only one financial effect
```

---

# 25. TEST CONCURRENCY

Because this is a financial system, test concurrent actions.

Examples:

```text
Buyer confirms receipt
+
Admin opens dispute

Buyer confirms receipt
+
Automatic release task runs

Seller cancels
+
Buyer pays

Two payment webhooks arrive simultaneously

Two refund requests arrive simultaneously

Two release requests arrive simultaneously
```

The database and application should prevent inconsistent financial states.

Use transactions, database constraints, locking, idempotency, or other mechanisms where appropriate.

---

# 26. BUSINESS-RULE TESTING

Create explicit tests for every important business rule discovered in the codebase.

For each rule determine:

```text
Rule
Who can perform it
When it can happen
What happens if successful
What happens if rejected
What database state should result
What notification should occur
What financial impact occurs
```

Do not allow business rules to exist only in frontend code.

---

# 27. PROPERTY / INVARIANT TESTING

Where useful, test invariants such as:

```text
Escrowed amount cannot become negative.

Released amount cannot exceed escrowed amount.

Refund cannot exceed available refundable amount.

Transaction cannot have two successful payments unless explicitly supported.

Completed transaction cannot return to an earlier state.

A transaction cannot have two competing final outcomes.

Seller payout cannot exceed transaction amount minus applicable fees.

A user cannot own a transaction as both buyer and seller unless explicitly supported.

A review cannot exist without an eligible transaction.

A review cannot be counted multiple times.
```

Use property-based testing such as Hypothesis where it provides real value, but do not introduce it unnecessarily.

---

# 28. DATABASE INTEGRITY

Test database constraints and integrity.

Look for:

```text
Unique constraints
Foreign keys
Null constraints
Check constraints
Decimal precision
Indexes
Transactions
Race conditions
Cascade behavior
```

Pay particular attention to money fields.

Use `Decimal` rather than floating point for monetary values where appropriate.

---

# 29. TEST FAILURE BEHAVIOR

Do not only test success.

Every important feature should have:

```text
Happy path
Invalid input
Unauthorized user
Missing data
Expired data
Duplicate request
Network/API failure
Database failure where practical
Third-party failure where practical
Concurrent request
```

---

# 30. TEST THE ACTUAL USER JOURNEYS

Create a matrix of real-world journeys.

At minimum:

```text
JOURNEY 1
Seller → Create transaction → Buyer → Pay → Seller ships → Buyer confirms → Release

JOURNEY 2
Seller → Create transaction → Buyer → Payment fails

JOURNEY 3
Buyer → Pays → Seller never ships → Refund

JOURNEY 4
Buyer → Pays → Seller ships → Buyer disputes

JOURNEY 5
Buyer → Pays → Seller ships → Buyer claims non-delivery

JOURNEY 6
Buyer → Pays → Delivery → Buyer does nothing → Auto-release

JOURNEY 7
Seller → Receives payment → Attempts unauthorized manipulation

JOURNEY 8
Buyer → Attempts unauthorized transaction access

JOURNEY 9
Admin → Resolves dispute

JOURNEY 10
Payment provider → Sends duplicate webhook
```

Add other journeys discovered from the actual application.

---

# 31. TEST DATA SAFETY

All automated tests must use isolated test data.

Never:

- Send real money.
- Send real customer emails.
- Send real SMS.
- Modify production records.
- Call production payment endpoints.
- Upload sensitive real documents.
- Send real payouts.

Use test/sandbox providers and test credentials where integrations require them.

Never expose secrets in test output.

---

# 32. CI/CD

Inspect the existing CI/CD configuration.

If GitHub Actions is used or appropriate, create a robust testing workflow.

The pipeline should ideally execute:

```text
1. Backend linting
2. Python type checks if configured
3. Django checks
4. Database migrations check
5. pytest
6. Coverage
7. Frontend dependency installation
8. TypeScript checks
9. Frontend unit/component tests
10. Frontend build
11. Start test environment
12. Playwright E2E tests
13. Generate test artifacts
```

Do not deploy if critical tests fail.

---

# 33. TEST MARKERS

Introduce useful pytest markers where appropriate:

```text
unit
integration
api
security
e2e
payments
slow
critical
```

Then it should be possible to run:

```bash
pytest -m unit
pytest -m integration
pytest -m security
pytest -m payments
pytest -m critical
```

Use the actual project conventions if markers already exist.

---

# 34. COVERAGE

Introduce meaningful coverage reporting.

Do not chase 100% coverage merely for the number.

Prioritize coverage of:

```text
Financial logic
Escrow logic
Permissions
Authentication
Authorization
Transaction state transitions
Payment webhooks
Refunds
Payouts
Disputes
Security-sensitive operations
```

A line being executed does not necessarily mean the behavior is tested.

Report meaningful behavioral coverage.

---

# 35. REGRESSION TESTING

Every real bug discovered during this audit should result in:

```text
1. Reproduce bug
2. Write failing test
3. Fix bug
4. Confirm test passes
5. Keep test permanently
```

Never simply fix the bug without adding a regression test where practical.

---

# 36. DO NOT CHEAT

This is critical.

Do NOT:

- Delete failing tests simply to make the suite green.
- Weaken assertions.
- Mock away the behavior being tested.
- Skip important tests without justification.
- Change production logic merely to satisfy an incorrect test.
- Hard-code expected values without understanding business logic.
- Mark tests as passed without executing them.
- Hide warnings/errors.
- Modify security behavior merely to satisfy a test without understanding the implications.

If a test exposes a genuine application defect, report and fix the application defect where appropriate.

If the expected behavior is ambiguous, identify the ambiguity rather than inventing a business rule.

---

# 37. TEST REPORT

At the end of the implementation, produce a comprehensive report.

Include:

## A. Existing Test Baseline

```text
Tests before changes:
Passed:
Failed:
Skipped:
Coverage:
```

## B. New Tests

```text
Existing tests retained:
Existing tests modified:
New backend tests:
New security tests:
New frontend tests:
New E2E tests:
```

## C. Final Results

```text
Total tests:
Passed:
Failed:
Skipped:
Coverage:
Execution time:
```

## D. Feature Coverage

Create a table:

```text
Feature | Backend | Frontend | E2E | Security | Status
```

Use:

```text
PASS
PARTIAL
MISSING
FAIL
NOT APPLICABLE
```

## E. Critical Findings

Categorize:

```text
P0 — Critical
P1 — High
P2 — Medium
P3 — Low
```

Pay special attention to:

```text
Unauthorized access
Money manipulation
Payment errors
Escrow state corruption
Incorrect refunds
Incorrect payouts
Webhook duplication
Data leakage
Authentication bypass
```

## F. Remaining Gaps

Clearly list features that still lack adequate automated coverage.

---

# 38. DEFINITION OF DONE

Do not consider this task complete simply because `pytest` returns zero failures.

The task is complete only when:

- Existing tests have been audited.
- Existing tests still pass unless deliberately corrected.
- Important backend functionality is covered.
- Important API endpoints are covered.
- Authentication is tested.
- Authorization is tested.
- Object-level permissions are tested.
- Escrow state transitions are tested.
- Financial calculations are tested.
- Payment flows are tested.
- Webhooks are tested.
- Duplicate financial events are tested.
- Refunds are tested.
- Payouts are tested.
- Disputes are tested.
- Reviews/reputation are tested.
- File uploads are tested.
- Notifications are tested.
- Admin functionality is tested.
- React functionality has appropriate tests.
- TypeScript passes.
- Critical end-to-end workflows run through Playwright.
- PostgreSQL is used appropriately for integration testing.
- Security-sensitive operations have dedicated tests.
- CI can execute the test suite.
- Test failures produce useful diagnostics.
- No production credentials/data are used.
- No existing tests were removed merely to make the suite pass.

---

# 39. HOW TO WORK

Work incrementally.

### Step 1

Inspect the entire repository and existing tests.

### Step 2

Run the existing tests and establish a baseline.

### Step 3

Create a test coverage matrix.

### Step 4

Identify the highest-risk gaps.

### Step 5

Fix the test infrastructure where necessary.

### Step 6

Improve backend tests.

### Step 7

Add security/authorization tests.

### Step 8

Add payment/escrow/state-machine tests.

### Step 9

Add frontend tests.

### Step 10

Add Playwright E2E tests.

### Step 11

Integrate everything into CI.

### Step 12

Run the complete suite.

### Step 13

Fix legitimate failures.

### Step 14

Generate the final QA report.

---

# 40. PRIORITY

Do not distribute effort equally.

Prioritize the things that could cause the greatest harm.

Priority order should generally be:

```text
P0
Financial integrity
Escrow integrity
Authorization
Authentication
Payment/webhook security
Data leakage
Transaction state corruption

P1
Disputes
Refunds
Payouts
Identity/KYC
Delivery confirmation
Admin permissions

P2
Notifications
Reviews/reputation
Dashboard behavior
Search/filtering
Reporting

P3
Cosmetic UI behavior
Minor UX details
Non-critical edge cases
```

Use judgment based on the actual implementation.

---

# FINAL INSTRUCTION

Treat this application as a **financial trust platform**, not merely a CRUD web application.

The most important question is not:

> "Does the button work?"

The important questions are:

> "Can the wrong person perform this action?"

> "Can money move incorrectly?"

> "Can a transaction enter an impossible state?"

> "Can a user manipulate another user's transaction?"

> "Can a payment event be processed twice?"

> "Can a dispute be bypassed?"

> "Can someone manufacture or manipulate reputation?"

> "Can sensitive documents or transaction information be accessed by the wrong user?"

> "Can the system recover correctly when something fails?"

Build the automated testing system so that future developers and agentic coding tools can safely modify the application without silently breaking these guarantees.

At the end, give me:

1. The final test architecture.
2. The baseline versus final test statistics.
3. All important tests added.
4. All important bugs discovered.
5. All security issues discovered.
6. All remaining test gaps.
7. The exact commands required to run:
   - backend tests
   - frontend tests
   - security tests
   - E2E tests
   - complete test suite
8. CI/CD changes made.
9. A clear assessment of whether the application is:
   - NOT READY
   - EARLY MVP
   - MVP READY
   - PRODUCTION READY

Do not claim production readiness simply because the tests pass. Base the assessment on the actual test coverage, architecture, security findings, financial integrity, and unresolved risks.