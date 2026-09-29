# v48 Assurance Control Plane

Target architecture:

USER INTENT
-> V47 CONTROL PLANE
-> ASSURANCE VERIFICATION CONTRACT
-> MCP REGISTRY / CAPABILITIES / VERSION INTEGRITY
-> GITHUB CI QUALITY GATE
-> DELIVERY HANDOFF / NO-MERGE GUARD
-> EVIDENCE-BACKED REVIEW

This release does not optimize for shallow tool count. It adds an assurance layer that makes KROM Forge harder to over-claim:

- release gates must have linked verified evidence;
- MCP tool registration must match declared capabilities;
- version surfaces must derive from package metadata;
- GitHub CI can verify build/type/static consistency without Vercel preview capacity;
- delivery handoffs keep branch, commit, PR, evidence and no-merge state explicit.

External execution is still host-authorized. KROM Forge reasons over supplied evidence and never fabricates CI, build, deployment, merge or production success.

