/** Review copy only: no unapproved refund guarantees, deadlines or legal waivers. */
export const policySections: Record<string, [string, string][]> = {
  "/terms-of-service": [
    [
      "Services and scope",
      "CodesBoxs provides software development and digital services. Website descriptions are invitations to discuss a project, not binding offers. Deliverables, exclusions and acceptance criteria belong in a written project agreement.",
    ],
    [
      "Quotations and customer obligations",
      "Before accepting a quote, confirm requirements, authorized contacts, dependencies and access arrangements. Customers must have permission to supply content, data and software licenses. Do not send passwords or confidential records through public forms.",
    ],
    [
      "Payment and milestones",
      "Currency, taxes, deposits, milestone amounts, invoice due dates and any recurring support schedule require written agreement. An inquiry is not an order and does not authorize a charge. Online checkout is currently disabled.",
    ],
    [
      "Revisions and changes",
      "Revision rounds, review windows and acceptance tests must be agreed for each engagement. Material changes need an updated scope, price and delivery estimate; no unlimited revisions are advertised.",
    ],
    [
      "Intellectual property",
      "The agreement must distinguish customer materials, newly developed work, pre-existing tools and third-party licenses. Ownership, permitted use, source-code access and handover conditions require explicit agreement.",
    ],
    [
      "Quality, security and support",
      "Agree testing responsibilities, security requirements, maintenance coverage and incident contacts before work. No certification, uninterrupted availability or guaranteed business outcome is implied by this website.",
    ],
    [
      "Liability and disputes — approval required",
      "Liability allocation, any enforceable limitations, termination rights, governing law and dispute forum require Pakistan-qualified legal review. No liability cap, waiver or jurisdiction clause has been approved in this review draft. Raise concerns with support and retain the relevant agreement and correspondence.",
    ],
  ],
  "/privacy-policy": [
    [
      "Information collected",
      "Contact and project forms collect the fields shown, including name, email, optional phone/company, service interests, budget, timing, project description and consent. Newsletter subscriptions collect email and consent. Job applications are accepted only for published openings and collect the displayed fields.",
    ],
    [
      "Purpose of processing",
      "Information supports responding to inquiries, project assessment, customer support, subscribed updates and recruitment for published opportunities. Administrator authentication, abuse prevention and audit records support secure operation. An inquiry does not subscribe someone to marketing.",
    ],
    [
      "Infrastructure and service providers",
      "The reviewed application uses Cloudflare Workers and D1. Turnstile verifies public form submissions when configured; a configured email provider handles notifications. The owner must approve the deployed processor inventory, contractual terms, processing locations and any required transfer safeguards.",
    ],
    [
      "Cookies and analytics",
      "The application uses an essential administrator session cookie. No optional analytics or advertising integration is enabled in the reviewed source. See the cookie policy for security processing and changes to this inventory.",
    ],
    [
      "Retention — approval required",
      "Inquiry, application, newsletter, audit and backup retention periods have not been approved. The owner must establish purpose-based periods and a deletion process before launch. Expired administrator sessions and rate-limit records have scheduled cleanup; production execution still needs verification.",
    ],
    [
      "Data security",
      "The implementation includes server-side validation, parameterized database writes, access checks and protected administrator sessions. These safeguards do not guarantee absolute security. Do not submit payment card details, credentials or highly sensitive personal data through inquiry forms.",
    ],
    [
      "Requests and rights",
      "Contact support to ask about access, correction, deletion or newsletter preferences. Requests may require identity checks and review of contractual or legal retention obligations. Applicable rights and lawful processing grounds need owner/legal review; this draft does not assert that every jurisdiction grants identical rights.",
    ],
  ],
  "/refund-policy": [
    [
      "Status and eligibility",
      "No universal refund promise has been approved and online purchases are not enabled. Before placing an order, request written eligibility rules covering deposits, work performed, third-party costs and the agreed project milestones.",
    ],
    [
      "Cancellation before work begins",
      "Send a written request identifying your quote or agreement and the work you wish to cancel. Whether an unstarted engagement qualifies for a refund, and treatment of committed costs, must be specified in the approved agreement.",
    ],
    [
      "Cancellation after work begins",
      "Ask for a written status of completed work, current milestones and committed external costs. Any payable balance, handover and refundable portion require assessment under the signed agreement; this draft does not promise a full or proportional refund.",
    ],
    [
      "Completed work and milestone payments",
      "Acceptance of a milestone, disputed deliverables and unused future milestones must be considered separately. Completed work is not automatically described as refundable or non-refundable here: actual contractual terms and applicable rights must be reviewed.",
    ],
    [
      "How to request review",
      "Email support with your project reference, contact details, cancellation reason and relevant correspondence. Do not include card numbers, passwords or unnecessary bank records. Ask for written acknowledgement and a decision against the agreed terms.",
    ],
    [
      "Processing and disputes — approval required",
      "The owner must approve review deadlines, payment return methods, processing periods and any permitted fees before accepting payments. No refund processing time is currently guaranteed. Escalate unresolved concerns through support and the dispute procedure in your approved agreement.",
    ],
  ],
  "/service-delivery-policy": [
    [
      "Digital services only",
      "Software development and digital services are delivered electronically. No physical shipping applies. The agreed delivery may include source files, repository access, design files, documentation, API access or deployment handover.",
    ],
    [
      "Onboarding and responsibilities",
      "Confirm the project scope, customer contact, required content, authorized access and any agreed initial payment before scheduling work. Share credentials only through a separately agreed secure method, not a public contact form.",
    ],
    [
      "Milestones and estimated turnaround",
      "The written quote must identify milestones, dependencies, review points and estimated completion dates. No universal turnaround is offered. Missing inputs, scope changes or third-party review may affect estimates; revised scheduling should be documented.",
    ],
    [
      "Revisions and approval",
      "Review demonstrable deliverables against the agreed acceptance criteria. Revision rounds, response windows and change requests must be defined in the agreement. Do not assume silence constitutes acceptance unless an approved agreement explicitly addresses it.",
    ],
    [
      "Acceptance and handover",
      "Agree how delivery and acceptance are recorded and who can approve them. Confirm ownership/licensing conditions, access transfer, deployment responsibility and outstanding items before closing the project.",
    ],
    [
      "Support and maintenance",
      "Use the support email with your project reference and a description of the issue. Warranty terms, maintenance, response expectations, coverage hours and recurring charges require an approved written scope; no automatic lifetime or 24-hour support is promised.",
    ],
  ],
  "/cookie-policy": [
    [
      "Essential session storage",
      "The reviewed application sets an HTTP-only administrator session cookie for authenticated dashboard access. Its maximum lifetime is eight hours, with Secure on non-local hosts and SameSite protection. It is not an advertising cookie.",
    ],
    [
      "Security and third parties",
      "Cloudflare Turnstile processes browser and challenge information for abuse prevention when configured. Hosting-layer security behavior and any third-party cookie names, purposes and lifetimes must be checked on the actual deployed domain; this source review is not a production cookie inventory.",
    ],
    [
      "Analytics and advertising",
      "No optional analytics or advertising scripts are enabled in this application. There are therefore no optional tracking categories to toggle and no decorative consent banner. Before adding optional tracking, implement and test preferences that prevent scripts from loading until the required consent exists.",
    ],
    [
      "Changing preferences",
      "You can inspect, remove or block stored site data using your browser’s privacy settings. Removing an administrator session cookie signs you out; blocking essential security functionality can prevent protected forms or login from working. Newsletter unsubscribe is separate from cookie choices.",
    ],
    [
      "Retention and review",
      "The owner must verify the live cookie inventory, security-provider configuration and retention before publication, and update this notice when integrations change. Contact support with cookie or privacy questions.",
    ],
  ],
};
