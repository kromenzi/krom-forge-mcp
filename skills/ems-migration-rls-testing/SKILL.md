---
name: ems-migration-rls-testing
description: KROM Forge-ready comprehensive test design and result analysis for EMS-1A, EMS-1B, REST API, E2E Smoke, and database Migration workflows, including incomplete migration-history reconstruction and Phase 7.4 Enterprise Tenant Isolation. Use when creating API or end-to-end smoke scenarios, validating migration safety and rollback, recovering missing migration lineage, proving new-database parity with Production, detecting cross-tenant exposure, reviewing or repairing RLS policies, or generating evidence-backed automated test reports and release decisions.
---

# EMS-1B, Migration, and RLS Testing

## KROM Forge integration

عند توفر KROM Forge، اقرأ `references/krom-forge-runbook.md` وطبّق `krom-forge.json`. ابدأ بـ route ثم mission plan ثم evidence verification؛ لا تدّعِ تنفيذ capability أو فحص Production ما لم تصل execution receipt أو evidence من المضيف. استخدم `READY` لمسار/عقد جاهز فقط، وليس كدليل أن الاختبارات نجحت. أي cross-tenant access أو فرق parity غير مفسر أو ادعاء غير موثق يوقف القرار.

للتشغيل في GitHub Actions، انسخ `templates/krom-forge-ed25519.yml` إلى `.github/workflows/` و`templates/ci/run_*_tests.sh` إلى `ci/`. عيّن `CI_RLS_COMMAND`, `CI_REST_COMMAND`, `CI_STORAGE_COMMAND`, و`CI_MIGRATION_COMMAND` إلى أوامر الاختبارات الحقيقية في المستودع؛ لا تستخدم `true` أو placeholders. يجب أن تنتج الأوامر `evidence/production.json`, `evidence/reconstructed.json`, و`evidence/test-results.json`، ويجب أن تنتج adapters الأربعة receipts في `evidence/ci-command-receipts/`. نجاح اختبارات المهارة المحلية لا يثبت تكامل المستودع. استخدم Environment محميًا لمفتاح Ed25519 الخاص، ولا تمنحه لطلبات Pull Request الخارجية. استخدم `references/reconstruct-33-migrations.md` لمسار استرجاع/إعادة بناء الـ33 Migration؛ baseline المعاد البناء ليس تاريخًا أصليًا.

قبل تشغيل أي Adapter، شغّل `scripts/validate_ci_commands.py`. يفحص أن الأمر ليس placeholder، وأنه يستخدم test runner معروفًا، وأنه يذكر نطاقه المتوقع. هذا **فحص شكل دفاعي فقط** وليس إثباتًا أن الاختبار يختبر RLS أو REST أو Storage أو Migration فعليًا؛ يجب مراجعة ملفات الاختبار، ومدخلات Supabase، والـartifacts الخام، وتشغيل Workflow على مستودع حقيقي. لا تحول `CI_COMMAND_SHAPE_OK` أو Receipt `passed` إلى `GO` دون evidence موقّع من التنفيذ الفعلي.

كل Adapter يتطلب أيضًا متغيرين مستقلين عن الأمر: `CI_<AREA>_TEST_PATHS` (قائمة ملفات اختبار موجودة فعلًا مفصولة بفواصل) و`CI_<AREA>_RAW_RESULTS` (ملف JSON خام ينتجه test runner)، مع `CI_<AREA>_MIN_COUNT` أكبر من صفر. يتحقق `scripts/verify_ci_test_evidence.py` من وجود الملفات، ووجود `tests[]`، وعدد الحالات المنفذة، وتطابق `area`، ووجود `id` و`status` و`run_id` و`source_revision`، وأن **كل حالة** تحمل حرفيًا `passed` أو `pass`؛ `complete`, `completed`, `success`, `ok`, `failed`, `blocked`, `error` والحالة المشوهة مرفوضة. إذا استخدم إطار الاختبار حالة نجاح مختلفة، يجب على adapter موثوق تحويلها صراحة إلى `passed` قبل إنتاج raw evidence. إذا نجح الأمر ولم ينتج هذه الأدلة، لا يصدر Adapter Receipt `passed`.

يجب أن يكتب test runner داخل ملف النتائج `test_framework`, و`run_nonce` الموروث من `CI_TEST_RUN_NONCE`, و`command_sha256` المحسوب من الأمر نفسه. يرفض verifier نتيجة قديمة أو نتيجة من تشغيل آخر أو نتيجة لا تطابق الأمر المنفذ؛ لذلك لا يمكن تجهيز JSON ثابت مسبقًا ثم تشغيل أمر ناجح منفصل.

## الهدف
استخدم هذه المهارة لبناء حزمة اختبارات قابلة للتنفيذ، لا مجرد قائمة عامة. اربط كل سيناريو بمتطلب واضح، وبيانات اختبار، وخطوات، ونتيجة متوقعة، وشدة فشل. لا تفترض تفاصيل EMS-1B غير المقدمة؛ اطلب أو استنتج من مخطط النظام مع وسم الافتراضات.

## عقد التنفيذ الإلزامي

قبل إصدار أي حكم، أنشئ مجلد أدلة يحتوي على نسخة من المدخلات ووقت الاستخراج وcommit SHA ونسخة schema وبيئة التشغيل. لا تقل إن اختبارًا نجح اعتمادًا على قراءة كود أو migration لاحقة فقط؛ يجب أن يوجد test evidence أو catalog/DDL evidence قابل للمراجعة. إذا كان المدخل ناقصًا، استخدم `UNKNOWN` أو `HOLD` بدل التخمين، واذكر ما يلزم للحصول على حكم نهائي.

كل مخرج يجب أن يحمل `run_id`, `environment`, `source_revision`, `generated_at`, و`evidence_refs`. افصل بوضوح بين `observed` (حالة مرصودة)، و`proven` (مدعومة بدليل تاريخي)، و`inferred` (استنتاج)، و`unknown`. لا تحوّل inferred إلى proven عند كتابة SQL أو تقرير Go/No-Go.

لا تعتبر JSON مدخلًا موثوقًا لمجرد أنه قابل للقراءة. اربط كل manifest بـ `provenance` و`execution_receipt` يتضمنان مصدر Supabase (`supabase_mcp` أو `supabase_cli` أو `host_ci`)، و`project_ref`، والبيئة، ووقت الالتقاط، و`source_revision`، و`host_attested: true`، و`exit_code: 0`، وقائمة الاختبارات المنفذة، وبصمة SHA-256 للحمل. يجب أن يحمل الإيصال توقيع Ed25519، وأن يتحقق `scripts/verify_signed_receipt.py` منه باستخدام public key موثوق مُمرر خارج JSON (`--trusted-key`). المفتاح المضمّن داخل الإيصال لا يُقبل كمصدر ثقة. استخدم `scripts/verify_evidence_provenance.py` للتحقق البنيوي قبل parity. هذا يثبت أن جهة تملك المفتاح الموثوق وقّعت الإيصال؛ ويظل مصدر المفتاح وموثوقية الجهة مسؤولية KROM/CI/المضيف.

## سير العمل

1. **اجمع السياق**: إصدار EMS-1B، نوع قاعدة البيانات، نموذج المستأجرين/المستخدمين، الجداول والسياسات، أداة الهجرة، وآلية تشغيل الاختبارات.
2. **عرّف النطاق والمخاطر**: افصل اختبارات EMS-1A وEMS-1B الوظيفية، REST، E2E Smoke، Migration، وعزل RLS. صنّف البيانات إلى tenant A وtenant B وبيانات عامة/إدارية عند الحاجة.
3. **أنشئ مصفوفة التغطية**: اربط المتطلبات والكيانات والعمليات بالسيناريوهات، مع أولوية P0/P1/P2 ونوع الاختبار.
4. **اكتب السيناريوهات** وفق القوالب أدناه، بما يشمل الحالات السليمة، السلبية، الحدودية، والتراجع بعد الفشل.
5. **راجع عزل RLS**: افحص سياسة `USING` للقراءة/التحديث/الحذف و`WITH CHECK` للإدراج/التحديث، واختبر كل دور في جلسة مستقلة.
6. **نفّذ بأقل صلاحيات**: لا تستخدم دور مالك الجدول أو `BYPASSRLS` لاختبار العزل. تحقق من `row_security` وبيئة الاختبار قبل أي بيانات حقيقية.
7. **حلّل النتائج** عبر `scripts/analyze_results.py` عند توفر JSON أو JUnit XML، ثم أنشئ تقرير Markdown وملخص JSON.
8. **قدّم الإصلاحات**: اشرح السبب الجذري، التغيير المقترح، مخاطر التغيير، واختبارات الانحدار المطلوبة. لا تطبق SQL تدميريًا أو تغيّر سياسات الإنتاج دون موافقة صريحة.

## متطلبات سيناريوهات EMS-1A وEMS-1B

طبّق نفس نموذج السيناريو على EMS-1A وEMS-1B، لكن لا تخلط نتائج الإصدارين. أضف `system_version` و`phase` و`compatibility_expectation` لكل اختبار، وغطِّ التوافق بين المكونات القديمة والجديدة، اختلاف schema أو claims، الترحيل التدريجي، والرجوع إلى الإصدار السابق. عند استخدام EMS-1A كمرجع تاريخي، سجّل ما هو مثبت من الكود أو قاعدة البيانات وما هو مجرد افتراض.
لكل سيناريو أدرج: `id`, `title`, `requirement`, `priority`, `preconditions`، الأدوار والـ tenant context، بيانات الإدخال والقيم الحدية، خطوات قابلة لإعادة الإنتاج، النتيجة المتوقعة وشرط النجاح، الآثار الجانبية والتدقيق والتزامن وإعادة المحاولة، وبيانات التنظيف.

غطِّ على الأقل: المسار الأساسي، المصادقة والتفويض، المدخلات الناقصة وغير الصحيحة، التكرار/idempotency، المهلات وإعادة المحاولة، التزامن، pagination، حالات الفراغ، حدود الحجم، أخطاء الاعتماديات، التسجيل والتدقيق، واستعادة الحالة بعد الفشل.

## متطلبات سيناريوهات Migration
أنشئ حزمة تشمل baseline للمخطط والقيود والفهارس وtriggers وpermissions وRLS؛ تطبيقًا نظيفًا وفوق نسخة سابقة وإعادة تشغيل idempotent؛ توافق التطبيق القديم والجديد أثناء النشر المتدرج؛ backfill وnull/default وprecision وtimezone؛ حقن فشل منتصف الهجرة وانقطاع الاتصال والقفل ونقص الصلاحيات؛ rollback أو forward-fix دون فقدان البيانات؛ قياس المدة وlock waits وreplica lag؛ ثم post-migration counts/checksums وorphan records والقيود والصلاحيات وفعالية RLS.

لا تعتبر نجاح أمر migration دليلًا كافيًا؛ يجب أن تمر اختبارات البيانات والسلوك والصلاحيات والأداء.

### أدوات التحقيق القابلة للتشغيل

استخدم `scripts/build_lineage_inventory.py` لإنشاء سجل قابل للمراجعة للـ33 Migration:

```bash
python scripts/build_lineage_inventory.py migrations.json --count 33 --out evidence/migration-lineage-inventory.csv
```

استخدم `scripts/compare_schema_manifests.py` لمقارنة manifest مطبع من Production مع manifest القاعدة الجديدة. يجب أن يحتوي كل ملف على الأقسام التسعة كاملة (`tables`, `columns`, `indexes`, `constraints`, `functions`, `triggers`, `views`, `grants`, `policies`) وعلى `test_evidence` صريح بحالة `passed` لاختبارات RLS وREST وStorage وMigration. الملف الفارغ أو الناقص أو الذي يحتوي على `tables` فقط مرفوض. إذا وُجد فرق أو نتيجة أمنية `blocked/bypassed/unverified`، يعيد البرنامج `NO-GO` ورمز خروج غير صفري.

```bash
python scripts/compare_schema_manifests.py evidence/production.json evidence/reconstructed.json \
  --trusted-key ci-ed25519-public.pem \
  --approval-receipt evidence/approval-receipt.json \
  --approval-key approval-ed25519-public.pem \
  --approver-registry evidence/approver-registry.json \
  --target-revision "$GITHUB_SHA" \
  --out evidence/schema-parity.json
python scripts/verify_evidence_provenance.py evidence/production.json
python scripts/verify_signed_receipt.py evidence/production.json --trusted-key ci-ed25519-public.pem
```

النتيجة تفصل بين `provenance_gate`, و`schema_parity`, و`required_test_gate`, و`security_gate`, و`migration_lineage_gate`, و`tests_passed`, و`merge_approval`, و`deploy_approval`, و`release_decision`. نجاح الاختبارات لا يمنح موافقة الدمج أو النشر؛ الموافقتان يجب أن تكونا صريحتين وحديثتين. لا تعتبر comparator بديلًا عن فحص السلوك أو إثبات المصدر: أضف counts/checksums، rollback، REST، E2E Smoke، Storage، وRLS matrix إلى evidence bundle، واربط النتائج بإيصال تنفيذ صادر من Supabase/CI موثوق وموقّع بمفتاح خارج JSON.

لا ترفع حظر Phase 7.4 إذا كان `migration_lineage.missing_count` أكبر من صفر أو كانت حالة الـ33 Migration غير `complete/resolved/proven`. نجاح المهارة أو توقيع الأدلة لا يعيد كتابة التاريخ المفقود.

شغّل Regression tests التي تمنع عودة الخلل:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
```

## Phase 7.4 — Enterprise Tenant Isolation ومشكلة الـ33 Migration

عند اكتشاف أن 33 Migration تأسيسية مفقودة من GitHub، اعتبر ذلك **فجوة في سلسلة النَسَب (migration lineage)** ومانعًا لإثبات reproducibility، وليس مجرد ملفات ناقصة. لا تنشئ ملفات SQL تخمينية وتضعها كأنها التاريخ الأصلي.

نفّذ مسار التحقيق التالي:

1. **جمّد الادعاء**: سجّل أرقام الـ33 Migration، ما هو مفقود، أول migration لاحقة تعتمد عليها، والكائنات المتوقعة (tables, columns, indexes, constraints, functions, triggers, views, grants, policies).
2. **اجمع الأدلة**: افحص Git history والفروع والوسوم وCI artifacts ونسخ الحزم وملفات ORM/schema dumps وملفات Supabase/وظائف النشر وسجلات Migration في Production. احفظ commit SHA ووقت الاستخراج ومصدر كل دليل.
3. **استخرج حالة Production دون أسرار**: صدّر catalog metadata وDDL للكائنات، تعريفات policies/functions/triggers، grants، extensions، وإصدارات التطبيق. لا تعتبر Production مرجعًا وحيدًا للتاريخ؛ هو دليل على الحالة الحالية فقط.
4. **أنشئ dependency graph**: اربط كل migration لاحقة بالكائنات التي تقرأها أو تعدلها، وحدد أول ظهور معروف لكل كائن، والتعارضات بين ترتيب Git وترتيب Production.
5. **صنّف الثقة**: `proven` إذا دعمه commit أو سجل تطبيق موثوق؛ `observed` إذا ظهر في Production فقط؛ `inferred` إذا استُنتج من migration لاحقة؛ `unknown` إذا تعذر إثباته. لا تخلط هذه التصنيفات.
6. **ابنِ Baseline معتمدًا منفصلًا**: أنشئ snapshot/DDL حاليًا قابلًا للتطبيق على قاعدة فارغة، وسمّه `reconstructed baseline` لا migration تاريخية. راجع ترتيب الإنشاء وidempotency والـ grants وRLS يدويًا.
7. **اختبر parity**: شغّل baseline ثم كل migrations المتاحة على قاعدة جديدة، وقارن مع Production عبر schema diff وcatalog diff وcounts/checksums وconstraints/indexes/functions/triggers/grants/policies. سجّل الفروقات المقبولة وغير المقبولة.
8. **اختبر Enterprise Tenant Isolation**: نفّذ مصفوفة cross-tenant عبر SQL وREST وE2E Smoke، خصوصًا للجداول والدوال التي ظهرت من الأدلة غير المكتملة. لا تعتبر parity مكتملًا إذا كانت سياسات RLS أو security-definer functions غير مثبتة.
9. **أصدر قرارًا**: `GO` فقط عند اكتمال الأدلة أو اعتماد baseline معاد البناء مع parity موثق؛ وإلا `NO-GO` أو `CONDITIONAL` مع المخاطر، الفروقات، المالك، وخطة الإصلاح.

### مخرجات التحقيق المطلوبة

أنتج `migration-lineage-inventory` للـ33 عنصرًا، و`object-provenance-matrix`، و`production-vs-empty-schema-diff`، و`reconstruction-assumptions`، و`tenant-isolation-evidence`. لكل عنصر اذكر: migration ID، الحالة، الكائنات، مصدر الدليل، درجة الثقة، الاعتماديات، اختبار التحقق، والقرار.

استخدم `templates/phase-7-4-evidence-report.md` كتقرير نهائي، و`templates/migration-lineage-inventory.csv` كنقطة بداية. يجب أن يحتوي evidence bundle على: manifest Production، manifest reconstructed، نتيجة comparator، سجل الـ33 Migration، نتائج الاختبارات الخام، وسجل الفروقات المقبولة مع موافقة مالك النظام.

### قاعدة عدم اليقين

إذا كانت Production تحتوي كائنًا لا يمكن ربطه بتاريخ موثوق، فقل: **الكائن observed في Production، لكن تاريخ إنشائه وترتيب اعتماده غير مثبت**. لا تدّعِ أن بناء قاعدة جديدة يطابق Production حتى تمر مقارنة آلية ومراجعة بشرية للـDDL والسياسات والصلاحيات.

## اختبارات REST API

أنشئ سيناريوهات لكل endpoint رئيسي تتضمن method وURL وheaders وauth وbody/query/path parameters، ثم تحقق من status code وresponse schema وheaders والبيانات وآثار قاعدة البيانات. غطِّ المسارات الناجحة، 400/401/403/404/409/429/5xx، validation، pagination/filter/sort، idempotency، timeouts، retry، content type، CORS عند الحاجة، وحدود payload.

اربط كل endpoint بمصفوفة RLS: مستخدم tenant A يجب أن يقرأ ويعدل موارده فقط؛ لا يقبل API `tenant_id` المرسل من العميل كمرجع موثوق؛ محاولات تغيير المعرّف أو استخدام resource من tenant B يجب أن تفشل دون تسريب count أو تفاصيل حساسة. اختبر أيضًا bulk endpoints وupsert وRPC وعمليات export، وسجّل correlation/request ID دون أسرار.

مثال REST:

```yaml
id: REST-RLS-001
title: GET orders rejects cross-tenant resource access
area: REST
priority: P0
request:
  method: GET
  path: /api/orders/{tenant_b_order_id}
  actor: tenant_a_user
expected:
  status: 403 or 404 according to the API contract
  body contains no tenant B data
  database query is subject to RLS
```

## E2E Smoke

أنشئ suite قصيرة وحتمية تعمل بعد deploy أو migration للتأكد من أن النظام قابل للاستخدام من البداية للنهاية. ابدأ بتهيئة آمنة لبيانات اصطناعية، ثم نفّذ: فتح التطبيق/health check، تسجيل الدخول، إنشاء أو قراءة مورد أساسي عبر REST/UI، تحديثه، التحقق من ظهوره بالحالة الصحيحة، تسجيل الخروج، والتحقق من أن مستخدم tenant آخر لا يرى المورد. أضف مسارًا واحدًا لفشل المصادقة ومسارًا واحدًا للتحقق من استجابة API غير متاحة.

اجعل Smoke tests مستقلة وقابلة لإعادة التشغيل، بمهلة واضحة وcleanup مضمون، ولا تضع اختبارات flaky أو load ضمنها. خزّن screenshots/trace وrequest IDs عند الفشل، واربط كل خطوة بـ `test id` و`requirement`. بعد Migration شغّل Smoke قبل وبعد الترحيل، وقارن schema/data/RLS والـ critical user journey.

## تدقيق RLS وعزل قاعدة البيانات

1. احصر الجداول الحساسة ومفتاح tenant/owner وكل الأدوار وطرق تعيين context.
2. تحقق من تفعيل RLS وفرضه عند الحاجة (`relrowsecurity` و`relforcerowsecurity`) ومن عدم وجود مسار يتجاوزها.
3. افحص سياسات `SELECT`, `INSERT`, `UPDATE`, `DELETE`، وراجع `USING` و`WITH CHECK` كل على حدة.
4. اختبر أن tenant A يرى ويعدل بياناته فقط، وأنه لا يرى ولا يعدل بيانات B، وأن المجهول لا يحصل على بيانات.
5. اختبر محاولات الالتفاف من SQL وREST وE2E: تغيير claims أو session context، tenant ID في body/URL، تغيير primary key، joins/views، RPC/functions، bulk operations، pagination، soft-delete، وupsert.
6. افحص تسرب counts وerror messages وsearch وexports وlogs وcache وmaterialized views.
7. راجع `SECURITY DEFINER`: ثبّت `search_path`، تحقق من المدخلات، وقلّل الصلاحيات.
8. اقترح deny-by-default واربط السياق بجلسة موثوقة، وأضف regression test لكل ثغرة.

صنّف الثغرات كالتالي: **Critical** لقراءة/تعديل/حذف cross-tenant أو تجاوز كامل؛ **High** لإدراج أو تحديث يغير ملكية السجل أو RPC يكشف بيانات؛ **Medium** لتسرب metadata أو التفاف محدود؛ **Low** لضعف التدقيق أو الرسائل دون وصول مباشر.

## قالب السيناريو

```yaml
id: RLS-SEL-001
title: Tenant A cannot read Tenant B rows
area: RLS
priority: P0
preconditions:
  - RLS enabled on orders
actors: [tenant_a_user, tenant_b_user]
setup: seed orders for tenant A and tenant B
steps:
  - authenticate as tenant_a_user
  - SELECT id, tenant_id FROM orders ORDER BY id
expected:
  rows contain only tenant A records
  no count or error reveals tenant B data
cleanup: remove seeded rows
```

## تقرير النتائج
استخدم بنية التقرير التالية: **Executive summary** بعدد الاختبارات والنسب والثغرات؛ **Scope and assumptions**؛ **Coverage** حسب area وpriority وsuite؛ **REST contract and status matrix**؛ **E2E Smoke journey results**؛ **Failures and security findings** بالدليل والأثر والسبب وإعادة الإنتاج؛ **Migration integrity**؛ **RLS matrix**؛ **Remediation plan** مرتبًا حسب الشدة؛ ثم **Go/no-go recommendation**. لا توصي بالمرور إذا فشل P0 أو وُجد cross-tenant exposure أو migration غير قابل للاستعادة أو فشل Smoke في رحلة حرجة.

لتوليد تقرير آلي:

```bash
python /home/ubuntu/skills/ems-migration-rls-testing/scripts/analyze_results.py results.json --out report.md --summary summary.json
python /home/ubuntu/skills/ems-migration-rls-testing/scripts/analyze_results.py junit.xml --format junit --out report.md
python /home/ubuntu/skills/ems-migration-rls-testing/scripts/analyze_results.py results.json \
  --trusted-key ci-ed25519-public.pem \
  --manifest evidence/production.json \
  --manifest evidence/reconstructed.json \
  --out report.md --summary summary.json
```

الاستدعاء الأخير هو الوحيد الذي يمكنه اجتياز بوابة المصدر؛ غياب `--trusted-key` أو manifests موقعة يبقي القرار `BLOCKED` حتى لو كانت كل النتائج `PASS` والموافقات موجودة داخل JSON.

للفحص الكامل على قاعدة تجريبية بعد أن تنفذ adapters الخاصة بالمستودع وتنتج `evidence/production.json` و`evidence/reconstructed.json` و`test-results.json`:

```bash
python scripts/run_full_evidence_check.py \
  --production evidence/production.json \
  --reconstructed evidence/reconstructed.json \
  --trusted-key "$CI_EXECUTION_PUBLIC_KEY" \
  --approval-receipt evidence/approval-receipt.json \
  --approval-key "$CI_APPROVAL_PUBLIC_KEY" \
  --approver-registry evidence/approver-registry.json \
  --ci-attestation evidence/ci-attestation.json \
  --ci-project-ref "$SUPABASE_PROJECT_REF" \
  --ci-environment phase-7-4-staging \
  --workflow-template .github/workflows/krom-forge-ed25519.yml \
  --target-revision "$GITHUB_SHA" \
  --results evidence/test-results.json \
  --out-dir evidence/full-check
```

ينتج الأمر `schema-parity.json` و`test-report.md` و`test-summary.json` و`full-check.json`. لا ينجح إذا قُدم نفس الملف مرتين، أو تشابهت هوية المشروع/الـpayload، أو غابت أدوار `production` و`reconstructed`، أو لم يكن Execution Receipt يحتوي على `test_results` موقعة مع artifact SHA-256 لكل اختبار.

صيغة JSON المفضلة: `{"run_id":"migration-2026-10-15","environment":"staging","tests":[{"id":"RLS-SEL-001","area":"RLS","priority":"P0","status":"passed","duration_ms":42,"message":""}]}`.

## ضوابط السلامة
استخدم staging أو نسخة معزولة وبيانات اصطناعية. أخفِ الأسرار وPII. تعامل مع فشل RLS كإخفاق أمني. لا تنفّذ إصلاحات schema أو policy تلقائيًا؛ أنشئ patch مقترحًا واطلب مراجعة مالك النظام.

## متى تتوقف ولا تخمّن

توقف بحالة `HOLD` إذا تعذر تحديد ترتيب migration، أو كانت Production هي الدليل الوحيد على التاريخ، أو لم تتوفر صلاحيات قراءة catalog/DDL، أو تعذر إعادة تشغيل قاعدة فارغة. أوقف الإصدار بحالة `NO-GO` عند cross-tenant exposure، أو فرق غير مفسر في RLS/grants/functions، أو فشل parity، أو فشل رحلة E2E حرجة. اطلب من المستخدم فقط المدخل الناقص المحدد، مثل dump منقح، manifest، commit SHA، أو نتيجة اختبار، بدل طلب معلومات عامة.
