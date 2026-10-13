INSERT OR IGNORE INTO blog_categories(id,name,slug) VALUES ('engineering','Engineering','engineering'),('ai','AI','ai'),('product','Product','product');
INSERT OR IGNORE INTO blog_posts(id,slug,title,summary,body,category,author,image,status,published_at) VALUES
('article-discovery','a-useful-discovery-brief','What belongs in a useful discovery brief?','A practical way to turn an ambitious product idea into shared goals, clear constraints and a reviewable first release.','A discovery brief is a decision tool, not a long document created for its own sake. It should help everyone explain the same problem and identify what remains uncertain.

## Start with the workflow

Describe who is trying to do what, what makes the task difficult today, and why changing it matters. A concrete example is more useful than a broad statement such as “we need digital transformation.” Note the existing tools, manual handoffs and exceptions that people work around.

## Define the first useful outcome

Separate the long-term vision from the first release. A useful release completes a real journey for a defined user. It is not simply a collection of screens. Agree acceptance criteria that can be checked through observation, tests or a clearly defined business process.

## Make constraints visible

Record budget boundaries, timing dependencies, data sensitivity, required integrations and the people who can approve decisions. Unknowns should remain visible. Do not turn a missing answer into an assumption without naming it.

## Close with decisions and questions

Keep a list of agreed choices, unresolved questions and the next person responsible for each answer. Review the brief when evidence changes. Its value comes from reducing ambiguity—not from freezing every requirement before learning begins.','Product','CodesBoxs Editorial','/images/team.svg','published','2026-10-13 00:00:00'),
('article-ai','designing-ai-with-review-boundaries','Designing AI features with review boundaries','Useful AI product planning starts with a bounded task, an evaluation approach and a clear answer to who approves consequential actions.','An AI feature should have a defined job. “Add AI” is not a specification. “Help a support agent locate relevant approved documentation and draft a response” gives a team something concrete to design and evaluate.

## Evaluate the task, not the demo

Collect representative examples, including ambiguous requests and cases where no answer should be produced. Define what a useful answer looks like and what would make it unsafe or misleading. Keep the evaluation set separate from the examples used to tune the experience.

## Treat retrieved text as untrusted input

Documents and tool responses can contain instructions that should not override application policy. Keep system instructions, user requests and retrieved material conceptually separate. Apply permissions before retrieval so the model never receives data the current user is not allowed to see.

## Put approvals at the action boundary

Drafting a suggestion and performing an action are different responsibilities. Sending a message, changing an account or committing money should have an explicit approval rule. Limit tool permissions and record enough information to investigate a run without unnecessarily logging sensitive content.

## Plan the fallback

Models can be unavailable, expensive or wrong. A product needs a response for each situation: a retry where appropriate, a normal search interface, a request for clarification or a handoff to a person. Good boundaries make AI more useful because users can understand what it can and cannot do.','AI','CodesBoxs Editorial','/images/ai.svg','published','2026-10-13 00:00:00'),
('article-release','a-release-checklist-that-helps','A release checklist that actually helps','A release is a coordinated change. Use a concise checklist to verify configuration, critical journeys, observability and recovery before launch.','A release checklist should be short enough to use and specific enough to catch important mistakes. Copying a large generic checklist can hide the few checks that matter most for your application.

## Verify the environment

Confirm the target environment, database bindings, public URL and secret names. Never assume that a successful local build proves production configuration is correct. Migrations deserve a separate review of their data impact and recovery plan.

## Test complete journeys

Exercise the paths that connect the interface to persistence and external services. A form showing a success toast is not proof that a record was stored or a notification delivered. Verify each outcome independently and make partial failures visible.

## Know how to observe failure

Check safe structured logs, alert destinations and the person responsible for responding. Avoid logging passwords, session tokens or complete private form payloads. Decide which errors are actionable and which are expected user mistakes.

## Prepare the way back

Record the previous release, rollback command and any database compatibility constraints. Test restoration procedures outside production. A backup is only useful if the team can recover from it. After launch, recheck the real domain, critical journeys and error signals before calling the release verified.','Engineering','CodesBoxs Editorial','/images/cloud.svg','published','2026-10-13 00:00:00');
INSERT OR IGNORE INTO portfolio_projects(id,slug,title,category,summary,body,technologies,image,is_concept,status) VALUES
('concept-workspace','orbit-workspace','Orbit Workspace','SaaS','An illustrative operations dashboard bringing tasks, approvals and workspace activity into one coherent interface.','## Project overview

Orbit Workspace is an original concept for a team operations product. It is not a commissioned client project or a deployed service.

## Design challenge

The imagined workflow involves scattered tasks, approval requests and access permissions. The concept explores how one interface could show what needs attention without making every user navigate every module.

## Proposed solution architecture

A React interface could connect to a typed API with tenant-aware permissions. Structured task and approval records would belong in a relational database. Notifications would use durable events and idempotent delivery.

## Validation still required

Real user research, security testing, deployment and business outcome measurement would be required before this concept could be considered a production product. No client results are claimed.','React,TypeScript,PostgreSQL','/images/dashboard.svg',1,'published'),
('concept-assistant','atlas-knowledge','Atlas Knowledge','AI','A source-aware knowledge assistant concept for finding approved information with a deliberate human review boundary.','## Project overview

Atlas Knowledge is an illustrative AI product concept, not a real client case study. The interface explores a source-aware answer experience.

## Design challenge

Teams may struggle to find current guidance across disconnected documents. A model-generated answer is not enough when users need to understand the source and whether the information applies to their situation.

## Proposed solution architecture

An ingestion workflow could index approved documents with access metadata. Retrieval would enforce user permissions before providing context to a model. Answers would cite retrieved sections and offer a fallback when evidence is insufficient.

## Validation still required

Retrieval quality, model behavior, prompt injection resistance, privacy controls and operational cost require testing with representative authorized data. This concept claims no accuracy score or client outcome.','Python,LLMs,RAG','/images/ai.svg',1,'published'),
('concept-mobile','field-notes','Field Notes','Mobile','An offline-aware mobile workflow concept for coordinating field tasks and reviewing updates after synchronization.','## Project overview

Field Notes is an original mobile application concept. It has not been delivered for a client and does not represent a published store application.

## Design challenge

Field teams may work with intermittent connectivity and need a clear way to distinguish saved local work from synchronized records. The concept focuses on simple task capture and visible sync state.

## Proposed solution architecture

A cross-platform mobile interface could maintain an encrypted local task queue and synchronize through an authenticated API. Server records would use versioning or an explicit conflict-resolution policy. Supervisors would review updates in a web dashboard.

## Validation still required

Device testing, offline failure recovery, privacy review and real workflow research are necessary before implementation. No operational savings or delivery metrics are claimed.','React Native,REST APIs,Cloudflare','/images/mobile.svg',1,'published');