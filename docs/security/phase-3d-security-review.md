# ZAK | زاك — Phase 3D Security Review

**الحالة:** Pre-Production Review

**المراجع:** Manus AI

**النطاق:** مسار `Client → Auth → /api/errors/ingest → Validation → Redaction → Storage → Push`، مع مراجعة Retention وSecrets وProduction guards. لم تُفعّل أي خدمة إنتاجية في هذه المراجعة.

## الخلاصة التنفيذية

المسار الحالي يطبق أساساً جيداً للمصادقة، التحقق، التنقيح، التخزين المنفصل، وتجميع التنبيهات. لا يظهر **Blocker** يسمح حالياً بتفعيل Production Push أو Scheduled Retention، لأن مزود الإنتاج غير مفعّل والبيئة الإنتاجية لا تُستخدم في الاختبارات.

مع ذلك، توجد نقاط **NEEDS FIX** قبل بوابة الإنتاج النهائية: سياسة CORS الحالية تعكس أي Origin مع تفعيل credentials، ولا توجد بعد حراسة route-level مستقلة لمعدل ingest، كما أن ProductionPushProvider لا يملك بعد wiring نهائياً من Secrets إلى startup guard. وقد تم إغلاق ملاحظة parser الخاصة بحجم ingest بتطبيق parser محدود 64KB قبل parser العام. لذلك تكون نتيجة المراجعة الحالية: **NEEDS FIX — لا يُعتمد للتفعيل الإنتاجي بعد**.

## مصفوفة المراجعة

| المجال | النتيجة | الدليل | الملاحظة والإجراء المطلوب |
|---|---|---|---|
| Authentication | **PASS** | `server/_core/error-ingest.ts`, `server/_core/sdk.ts` | المعالج يستدعي `authenticateRequest` قبل قبول payload، ويدعم Bearer أو session cookie عبر مصدر المصادقة المركزي. |
| Authorization | **PASS** | `server/_core/error-ingest.ts`, `server/_core/index.ts` | ingest لا يقبل role أو status من العميل، وuserId يعاد من الجلسة الموثقة. مسار retention منفصل ومقيد بـadmin أو cron. |
| Unauthenticated rejection | **PASS** | `tests/error-ingest-http.test.ts` | الطلب بلا جلسة أو بجلسة غير صالحة يُرفض بـ401 برسالة عامة. |
| Payload shape and fields | **PASS** | `server/_core/error-ingest.ts` | يقبل كائناً JSON فقط ويمرر whitelist محددة إلى طبقة المراقبة. |
| Payload size | **PASS** | `server/_core/index.ts`, `server/_core/error-ingest.ts` | مسار ingest يطبق parser route-level بحد 64KB قبل parser العام البالغ 50MB. |
| Redaction before storage | **PASS** | `server/_core/error-monitoring.ts`, `tests/server-error-monitoring.test.ts` | يتم تنقيح password وOTP وtoken وauthorization وcookie وcard data وBearer قبل التخزين والتنبيه. |
| Sensitive response data | **PASS** | `server/_core/error-ingest.ts` | الاستجابة تعيد accepted وincidentId وuserId للمستخدم الموثق فقط، ولا تعيد stack trace أو تفاصيل داخلية. |
| Client-controlled severity/status/role | **PASS** | `server/_core/error-monitoring.ts`, `tests/server-error-monitoring.test.ts` | severity محصورة في القيم المعروفة، والقيم غير المعروفة تتحول إلى MEDIUM. status وrole لا يدخلان نموذج الحدث. |
| Storage isolation | **PASS** | `server/db.ts`, `drizzle/schema.ts` | ingest يكتب إلى `error_events` فقط عبر helper مخصص، ولا يملك مساراً لقراءة أو تعديل جداول Customer/Order/Driver. |
| Production fallback | **PASS** | `server/_core/error-monitoring.ts` | fallback الذاكرة محصور عملياً في Development؛ في Production يسجل فشل التخزين ولا يعتبره نجاحاً صامتاً. يجب إبقاء هذا السلوك مغطى باختبار تشغيل إنتاجي. |
| Abuse/rate limiting | **NEEDS FIX** | `server/_core/error-monitoring.ts`, `server/_core/push-provider.ts` | يوجد deduplication للتنبيهات وrate limiting لمزود Push، لكن لا توجد حراسة route-level مستقلة لمعدل ingest لكل مستخدم أو IP. يجب إضافة rate limit قبل Production. |
| Push credentials | **NEEDS FIX** | `server/_core/push-provider.ts`, `server/_core/env.ts` | المزود الإنتاجي يقبل config مباشرة، لكن لا يوجد بعد ربط موثق بـSecrets ولا startup validation مشروط بمفتاح تفعيل Production. لا تُضاف credentials قبل اعتماد المزود. |
| Push secret logging | **PASS** | `server/_core/push-provider.ts` | لا يسجل bearer token أو response body، واختبارات Phase 3C تتحقق من عدم تسريب الأسرار. |
| Push activation guard | **PASS / LIMITED** | `server/_core/push-provider.ts` | المزود الخامل يرفض الإرسال ما لم يمرر `enabled: true`. الاعتماد الإنتاجي يتطلب startup guard صريحاً بعد تحديد المزود. |
| Retention environment guard | **PASS** | `server/_core/error-retention.ts`, `server/_core/index.ts` | الجدولة التلقائية تبدأ في Development فقط، والدالة ترفض التشغيل عند `NODE_ENV=production`. |
| Retention retry behavior | **NEEDS FIX** | `server/_core/error-retention.ts`, `tests/phase-3d-security.test.ts` | توجد retries واختبارات فشل/إعادة محاولة متعددة الدورات، لكن لا يوجد backoff أو مراقبة خارجية durable لنتيجة job. يلزم اعتماد سياسة retry/backoff قبل التشغيل الإنتاجي. |
| Production data isolation in tests | **PASS** | `tests/error-ingest-http.test.ts`, `tests/server-error-monitoring.test.ts` | الاختبارات تستخدم mocks وharness معزولاً ولا تعتمد على بيانات إنتاجية. |

## تدفق البيانات الأمني

يبدأ الطلب عند `/api/errors/ingest` حيث تُستدعى المصادقة قبل قراءة الحدث المقبول. بعد ذلك يمر payload عبر تحقق النوع والحجم وwhitelist، ثم تقوم طبقة المراقبة بتحويل النصوص إلى قيم محدودة الطول ومنقحة. التخزين يتم من خلال `upsertErrorEvent` في جدول `error_events`، بينما تصل تنبيهات HIGH وCRITICAL فقط إلى الواجهة الموحدة لـPushProvider مع deduplication. [1] [2] [3]

> لا يسمح عقد ingest الحالي للعميل بتحديد `status` أو `role` أو `userId`؛ الهوية تأتي من جلسة الخادم، ولا تُعاد تفاصيل stack trace في استجابة HTTP.

## Secrets Review

لم يتم اعتماد مزود Push إنتاجي في هذه المرحلة، ولم تتم إضافة أي credential. قبل التفعيل يجب أن تأتي القيم من Secrets/Environment Variables فقط، مثل `PUSH_PROVIDER`, `PUSH_API_KEY`, و`PUSH_PROJECT_ID` أو ما يعادلها حسب المزود المعتمد. يجب رفض بدء Production إذا كان المزود مفعلاً وكانت قيمة مطلوبة ناقصة، مع إبقاء القيم خارج Git والمصدر وملفات migration وfixtures والlogs.

**النتيجة الحالية:** **NEEDS FIX** بسبب عدم وجود wiring نهائي وstartup validation مكتملين. هذا ليس Blocker تشغيلياً الآن لأن ProductionPushProvider غير مفعّل، لكنه يمنع اعتماد بوابة Production.

## قرار المراجعة

| التصنيف | القرار |
|---|---|
| **PASS** | المصادقة، رفض الطلبات غير الموثقة، whitelist، التنقيح قبل التخزين، عزل جدول الأخطاء، عدم كشف التفاصيل الداخلية، fallback غير الصامت في Production، وعزل الاختبارات. |
| **NEEDS FIX** | حد parser العام، rate limiting لمسار ingest، wiring وstartup validation للـSecrets، وتحسين retry/backoff ومراقبة retention قبل الإنتاج. |
| **BLOCKER** | لا يوجد Blocker مكتشف في بيئة Pre-Production الحالية، بشرط عدم تفعيل Production Push أو Production Retention قبل إغلاق نقاط NEEDS FIX. |

## بوابة الإغلاق قبل Production

لا تُفعّل Production حتى يتم توثيق وإغلاق جميع بنود NEEDS FIX، ثم تشغيل Security Review مرة ثانية على diff النهائي، واختبار secrets من بيئة الإدارة، واختبار retention متعدد الدورات على قاعدة Development منفصلة. اختبار Phase 3D الحالي متعدد الدورات معزول باستخدام mocks ولا يستخدم بيانات إنتاجية. يجب أن تبقى flags الإنتاج مغلقة افتراضياً حتى ذلك الحين.

## المراجع

[1]: ../../server/_core/error-ingest.ts "ZAK Error Ingest Handler"
[2]: ../../server/_core/error-monitoring.ts "ZAK Error Monitoring Core"
[3]: ../../server/_core/error-retention.ts "ZAK Retention Heartbeat"
[4]: ../../server/_core/push-provider.ts "ZAK Push Provider Interface"
[5]: ../../server/_core/index.ts "ZAK Express Server Bootstrap"
[6]: ../../tests/error-ingest-http.test.ts "ZAK HTTP Ingest Tests"
