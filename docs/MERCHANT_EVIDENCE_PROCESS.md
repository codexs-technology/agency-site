# Software-services evidence process — owner approval required

This is a proposed operating checklist, not proof of transactions, a tax invoice,
approved commercial terms, legal advice or RapidGateway acceptance. No payments
are enabled. Adopt it only after the owner confirms the actual workflow.

## Business verification

Privately obtain owner-approved registration and current address-proof documents.
Match the exact legal name, registered address, registration identifiers and NTN
to the merchant application and invoicing identity. Record document reference,
reviewer, review date and explicit publication approval. Do not commit identity
documents, signatures, tax documents or customer evidence to the public repository.
Do not infer NTN, postal code or jurisdiction from a city or company name.

## From inquiry to an authorized order

1. Preserve the saved inquiry reference. A submission is not an order or authority
   to charge; provider email acceptance is not inbox delivery.
2. Establish the client's identity and authorized approver, permitted business
   purpose, ownership/authorization for supplied assets, and access requirements.
3. Issue a versioned quote/scope specifying deliverables, exclusions, dependencies,
   acceptance tests, estimated dates, revision limits and support coverage.
4. Obtain explicit agreement to the quote, applicable policy versions, currency,
   tax treatment, any deposit, milestones, due dates and cancellation/refund terms.
   Keep the dated authorization and quote version with restricted access.
5. Only use a payment method separately approved by the owner and processor.
   Current software has no checkout adapter, payment capture, invoice generator,
   payment receipt, refund execution or delivery-acceptance recorder.

## Invoice record checklist — no fabricated sample transactions

Before issuing a real invoice, the owner/accountant must approve its numbering
and required tax fields. Record: unique invoice number, issue date, verified seller
identity/address and approved identifiers, customer billing identity, authorized
order/quote reference, itemized software deliverables or milestones, currency,
subtotal, taxes, total, any deposit already received, balance and agreed due date.
Keep draft, issued, paid, void and refunded states distinct. Mark paid only using
verified payment evidence and reconciliation, never a return-page visit or screenshot
alone. Retain payment reference and any credit/refund reference under access control.

## Delivery-confirmation record checklist

Link a delivery record to order, invoice and milestone references. Record actual
delivery timestamp, version/commit or artifact checksum, delivered items, test
results, secure repository/access handover, documentation, exceptions and remaining
work. Never include passwords or private download tokens in general email.
Request explicit dated acknowledgement from the authorized client contact against
the agreed acceptance tests. Record rejections and corrections, not invented or
backdated acceptance. A deployment by itself is not client acceptance.

## Support, cancellation and disputes

Use support@codesboxs.com with the project/invoice reference. Preserve the request,
scope, work completed, client authorization, relevant communications and decision.
Use only approved refund eligibility and review/processing timelines; none is
established by this checklist. Log actual refund execution and reconciliation
separately from an internal approval. Agree retention, deletion and disclosure
permissions before collecting evidence; provide only necessary redacted records
through the processor's authorized secure channel.

## Activity separation and release gates

Invoices must describe actual contracted software services. Do not use them to
disguise gambling, casino deposits, third-party aggregation, funds held for others
or any activity the processor has not approved. This application must not collect
such payments. Separate businesses require their own truthful disclosures and
specific authorization; a separate route does not confer approval.

Before merchant submission: approve documentary identity, address and NTN;
approve prices/currency and all policy terms; test actual Turnstile and email;
confirm serving Cloudflare deployment and retry scheduling; complete manual
accessibility/security review; obtain explicit owner release approval. Before any
payment launch: obtain processor approval and implement/review/test the adapter,
signed webhooks, replay protection, reconciliation and refund lifecycle separately.