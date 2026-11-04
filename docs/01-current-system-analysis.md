# 01 — Current System Analysis

Source analysed: `E:\Projects\Learning\Krg` (`Krg-WebAPI`, `Krg-UI`, `DBScripts`). Read-only analysis; nothing in the old projects was changed.

## 1. What the system is

An **invoice-billing application** (GST, India) for "Namma Socials": manage **customers**, **products with stock**, and **invoices** (with optional e-way bill image), plus a dashboard and a recent-activity feed.

## 2. Current tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18 (standalone, routed modules), Angular Material/CDK **17** (version mismatch with core 18), Tailwind 3, RxJS 7.8, ngx-sonner, ngx-cookie-service, ngx-infinite-scroll |
| Backend | ASP.NET Core Web API, .NET 10, controllers + service layer (`DBLayer`) + `UtilityLayer` |
| ORM / mapping | EF Core 10 (SQL Server), Riok.Mapperly |
| Database | SQL Server, DB `NSInvoiceBilling` (tables + views + triggers + stored proc + scalar functions) |
| Auth | Hand-rolled JWT (HS256), SHA-512 password hash, token also set as HttpOnly cookie |
| Logging | Serilog → SQL table `Logs` + rolling file |
| Caching / queue | `IMemoryCache` + LiteDB "persistent queue" for customer writes |
| CI | `.github/workflows` (in Krg-WebAPI) |

## 3. Functional modules and endpoints

All routes are `KrgWebAPI/{Controller}/{action}`; everything except `Authenticate` requires JWT.

| Module | Endpoints |
|---|---|
| User | `POST Authenticate`, `GET logout`, `GET Validate` |
| Customer | `getAllCustomerList`, `getRecentlyAddedCustomers`, `getCustomerStats`, `getCustomerDetails/{id}`, `getCustomerPhoto/{id}`, `POST AddCustomer`, `POST EditCustomer`, `DELETE DeleteCustomer/{id}` |
| Product | `getAllProductList`, `getProductDetails/{id}`, `getProductPhoto/{id}`, `POST AddProduct`, `POST EditProduct`, `DELETE DeleteProduct/{id}`, `fetchStockList/{id}`, `POST AddStockEntry` |
| Invoice | `fetchInvoiceList`, `fetchInvoiceDetails/{id}`, `POST AddInvoice`, `getEwayBillPhoto/{id}` |
| Common | `getProductUnitType` |
| Activity | `getRecentActivityLogs` |

UI routes: `/login`, `/dashboard`, `/customer`, `/customer/:id`, `/product`, `/product/:id`, `/invoice`, `/new-invoice`, `/invoice/:id`.

## 4. Current data flow (as implemented)

### 4.1 Create invoice
```
UI (multipart form)
 → InvoiceController.AddInvoice
   → InvoiceService.AddInvoiceAsync
      1. INSERT InvInvoice (GST column = customer's GSTIN)          [SaveChanges #1]
      2. for each item: read product, compute cost/CGST/SGST in C#
      3. INSERT InvInvoice_Items                                     [SaveChanges #2]
         └ trigger trg_AfterInsert_InvInvoiceItems (cursor)
            └ usp_CalculateAndUpdateGST  → recomputes item tax, net, invoice GST + TotalCost
      4. per item: EXEC InvProducts_StockUpdate (Stock-Out)          [raw SQL #3]
         └ trigger trg_InvProducts_Stock_Quantity → recompute InvProducts.CurrentStock
      5. every table write also fires its *_Audit trigger
```
Three separate commits, no wrapping transaction.

### 4.2 Stock
Append-only ledger `InvProducts_Stock` (signed quantity, txn type from `InvConstant`) + denormalized `InvProducts.CurrentStock` maintained by trigger. A new product's opening stock is written by `trg_InvProducts_InitialStock`.

### 4.3 Auth
Login → SHA-512(password) compared with stored hash → JWT (3-minute expiry). `SecurityAndExceptionMiddleware` re-issues a fresh JWT on **every** authenticated request (cookie + `X-New-JWT` header) — i.e. a sliding session implemented by token churn.

## 5. Current database inventory

| Object | Kind | Purpose |
|---|---|---|
| `UserType`, `InvUser` | tables | roles, users |
| `InvConstant` (+`VConstant`) | table | generic key/value lookup (unit types, stock txn types) |
| `InvCustomers` (+`_Audit`, `VCustomers`) | table | customers, logo as `VARBINARY(MAX)` |
| `InvProducts` (+`_Audit`, `VProducts`) | table | products, logo blob, `CurrentStock` |
| `InvProducts_Stock` (+`VStock`) | table | stock ledger |
| `InvInvoice`, `InvInvoice_Items` (+2 `_Audit`, `VInvoices`, `VInvoiceDetail`) | tables | invoices, lines, e-way bill blob |
| `ActivityLog` (+`VActivityLog`) | table | user-facing activity feed |
| `Logs` | table | Serilog sink |
| `fn_CalculateIntraStateGST`, `fn_CalculateInterStateGST` | functions | tax maths (used in a view) |
| `usp_CalculateAndUpdateGST`, `InvProducts_StockUpdate` | procs | tax recompute, stock write |
| 8 triggers | triggers | 4 audit, initial stock, stock total, GST recompute |

## 6. Findings (defects and design debt)

Severity: **H** = correctness/security, **M** = maintainability/performance, **L** = hygiene.

### Correctness
| # | Sev | Finding | Where |
|---|---|---|---|
| C1 | H | `trg_InvProducts_InitialStock` declares `@isAddStock` and never assigns it → it is `NULL` → the proc takes the **Stock-Out** branch, so opening stock is recorded as an outflow (and the next trigger may then reject it as negative). | `07.InvProducts_Stock.sql` |
| C2 | H | `item.StateGst = productDetails.CentralGstPer` (copy-paste); state % taken from the central %. Masked only because the SQL proc later overwrites amounts, but the stored `StateGst` **rate** stays wrong. | `InvoiceService.cs` |
| C3 | H | `InvInvoice.GST` is `NVARCHAR(30)`: first the customer's GSTIN, then overwritten by the proc with the **sum of tax amounts**. One column, two meanings. | `InvoiceService.cs`, `11.usp_…` |
| C4 | H | Tax is computed **three times** (C#, proc, view functions) with different precisions (`decimal(10,2)`, `(20,4)`, `(18,2)`, `(5,2)`). | multiple |
| C5 | H | Invoice creation is not transactional (2 `SaveChanges` + raw SQL). A failure after step 1 leaves an invoice with no lines or no stock deduction. | `InvoiceService.cs` |
| C6 | H | Stock-check/total triggers read `@ProductCode` from `inserted` as a scalar → wrong for multi-row inserts. Stock check is also racy (no row lock). | `07.InvProducts_Stock.sql` |
| C7 | M | Audit tables have an **FK to the source table**. The `DELETE` audit trigger inserts a row referencing a row that is being deleted → hard delete of a customer/product is likely to fail on the FK. | `03`, `05`, `08` |
| C8 | M | `fetchInvoiceDetails` uses `FirstOrDefault` on a one-row-per-item view → returns a single line. Verify against UI behaviour. | `InvoiceService.cs` |
| C9 | M | `InvUser.Username` has no unique constraint. | `01.InvUsers.sql` |
| C10 | M | `UQ_Constant` includes `isActive`, so duplicates are possible as long as one is inactive. | `02.InvConstant.sql` |
| C11 | L | Duplicate scripts `05.InvProducts.sql` and `06.InvProducts.sql` create the same table with different shapes; script order is ambiguous. | DB scripts |
| C12 | M | Only CGST+SGST are stored on invoices; **IGST (inter-state)** exists only as a function used in a view. No place-of-supply logic. | schema |

### Security
| # | Sev | Finding |
|---|---|---|
| S1 | H | **Secrets are committed**: DB login/password in SQL scripts and `appsettings.json`, JWT signing key in `appsettings.json`. Treat as compromised and rotate. (Values deliberately not reproduced in these docs.) |
| S2 | H | Passwords hashed with **unsalted SHA-512** (fast hash). Seed users' plaintext hints are in script comments. |
| S3 | M | API DB user has `CREATE TABLE` and `VIEW DEFINITION`; no separation between migration and runtime accounts. |
| S4 | M | JWT 3-minute lifetime with re-issue on every request + `ValidateIssuer/Audience = false`; no refresh-token rotation, no revocation. |
| S5 | M | Roles (`SuperAdmin`/`Admin`) exist but controllers only use plain `[Authorize]`; role is never enforced. |
| S6 | M | CORS origins hard-coded to LAN IPs in `Program.cs`. |
| S7 | M | Upload type checked only by decoding with `System.Drawing` (Windows-centric, no size limit shown). |

### Performance / maintainability
| # | Sev | Finding |
|---|---|---|
| P1 | M | Images stored as `VARBINARY(MAX)` in rows and **copied into every audit row**. `VInvoiceDetail` returns the product image blob on every line. |
| P2 | M | Business rules split across C#, triggers, procs, functions and views — hard to test and to port. |
| P3 | M | Pass-through views (`VCustomers`, `VConstant`, `VActivityLog`, …) add a layer with no logic. |
| P4 | M | Clustered random GUID PKs (`NEWID()`) → page splits/fragmentation. |
| P5 | M | No pagination on list endpoints; no explicit indexes beyond PK/unique. |
| P6 | L | Customer write queue (LiteDB) + in-memory cache: single-node only, complexity with unclear benefit at this scale. |
| P7 | L | `DATETIME` + `GETDATE()` (server-local, no time zone). |
| P8 | L | `WeatherForecast` template controller and a second `KrgWeb` project still in the solution. |

## 7. What to preserve (behaviour that must carry over)

- Entities and screens: customers, products, stock entries, invoices, e-way bill image, dashboard stats, recent activity.
- Append-only stock ledger and "stock cannot go negative".
- Per-line GST snapshot on invoices (rate and amount stored at invoice time).
- Audit trail of who changed what.
- Unit types: Piece (`pc`/`pcs`) and Pack (`pk`/`pks`, 10 units); display text like "5 Packs (pks)".
- Existing record IDs (GUIDs) — preserved so bookmarked/linked URLs and audit history stay valid.
