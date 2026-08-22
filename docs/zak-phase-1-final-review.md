# ZAK — Phase 1 Final Review

## نطاق المراجعة وقرار عدم التنفيذ

هذه المراجعة تدقيق معماري وتنفيذي فقط. **لم يتم تعديل الكود، ولم تُنفذ أي Migration، ولم تُجرَ أي كتابة أو حذف في قاعدة البيانات.** التصميم المقترح أدناه يجب أن يبقى في Development/Staging إلى أن تُحسم نقاط الـ BLOCKER ويصدر اعتماد صريح للانتقال إلى Phase 2.

المصادر الداخلية التي تمت مقارنتها هي مخطط Drizzle الحالي، طبقة قاعدة البيانات، Routers وطبقة التفويض الخلفية، وحدة الطلبات والمحفظة المحلية، وثيقة `zak-phase-1-architecture.md`، وملف المواصفات المرفق.

---

## 1. DATABASE

### 1.1 الجداول المقترحة

| الجدول | الغرض | المفتاح الأساسي | المفاتيح الخارجية المقترحة | قيود Unique المقترحة | الفهارس المقترحة |
|---|---|---|---|---|---|
| `users` | الحساب الأساسي والهوية | `id` UUID/BigInt | — | `phone_e164`, `email` عند وجوده | `phone_e164`, `role`, `status` |
| `customers` | بيانات العميل الخاصة | `id` | `user_id → users.id` | `user_id` | `user_id` |
| `drivers` | ملف السائق وحالته واعتماده | `id` | `user_id → users.id` | `user_id`, `license_number` عند اعتماده | `user_id`, `approval_status`, `availability_status` |
| `driver_documents` | مستندات السائق والتحقق منها | `id` | `driver_id → drivers.id` | `(driver_id, document_type, version)` | `driver_id`, `verification_status`, `expires_at` |
| `vehicles` | مركبات السائق | `id` | `driver_id → drivers.id` | `plate_number` | `driver_id`, `status` |
| `addresses` | عناوين المستخدم المحفوظة | `id` | `user_id → users.id` | لا يوجد عام؛ يمكن قيد اسم محلي لكل مستخدم | `(user_id, label)`, location index عند دعم GIS |
| `orders` | الطلب التشغيلي | `id` | `customer_id`, `driver_id` nullable، وربما `merchant_id` nullable | `order_number`, `idempotency_key` بحسب المالك | `order_number`, `(customer_id, created_at)`, `(driver_id, status)`, `status`, `created_at` |
| `order_items` | عناصر الطلب والأسعار وقت الشراء | `id` | `order_id → orders.id`, `product_id` nullable | لا يوجد | `order_id`, `product_id` |
| `order_status_history` | سجل كل انتقال | `id` | `order_id`, `actor_user_id` nullable | لا يوجد؛ يمكن `event_id` Unique | `(order_id, created_at)`, `(from_state, to_state)` |
| `order_locations` | آخر وماضي مواقع التوصيل | `id` | `order_id`, `driver_id` nullable | لا يوجد | `(order_id, recorded_at)`, `driver_id` |
| `merchants` | المطعم/المتجر/الصيدلية | `id` | `owner_user_id → users.id` | `business_registration_number` عند توفره | `owner_user_id`, `status`, service/category |
| `merchant_products` | المنتجات والأسعار والمخزون | `id` | `merchant_id` | `(merchant_id, sku)` عند استخدام SKU | `merchant_id`, `is_active`, `stock_status` |
| `payments` | محاولة الدفع وحالتها | `id` | `order_id`, `customer_id` | `provider_reference`, `idempotency_key` | `order_id`, `status`, `provider_reference` |
| `transactions` | سجل قيود مالية عام | `id` | `order_id` nullable، `payment_id` nullable، `wallet_id` nullable | `external_reference` عند وجوده | `(account_id, created_at)`, `status`, `external_reference` |
| `wallets` | حساب المحفظة | `id` | `user_id → users.id` | `user_id` | `user_id`, `status` |
| `wallet_transactions` | قيود المحفظة غير القابلة للتلاعب | `id` | `wallet_id`, `transaction_id` | `transaction_id` | `(wallet_id, created_at)`, `status` |
| `driver_earnings` | استحقاقات السائق | `id` | `driver_id`, `order_id`, `transaction_id` | `(driver_id, order_id, earning_type)` إذا كانت القاعدة تسمح | `driver_id`, `order_id`, `settlement_status` |
| `commissions` | عمولة ZAK وقاعدتها | `id` | `order_id`, `merchant_id`/`driver_id` nullable | لا يوجد | `order_id`, `status`, `created_at` |
| `refunds` | طلبات ورد الأموال ونتيجتها | `id` | `payment_id`, `order_id`, `transaction_id` | `provider_refund_reference` | `payment_id`, `status`, `created_at` |
| `coupons` | القسائم وقواعدها | `id` | `created_by` nullable | `code` | `code`, `status`, `starts_at`, `ends_at` |
| `ratings` | تقييم العميل/السائق/التاجر | `id` | `order_id`, `author_user_id`, target nullable | `(order_id, author_user_id, target_type)` | `order_id`, `target_type`, `target_id` |
| `notifications` | إشعارات المستخدم | `id` | `user_id` | `dedupe_key` عند الحاجة | `(user_id, read_at, created_at)` |
| `device_tokens` | رموز push | `id` | `user_id` | `token` | `user_id`, `platform`, `is_active` |
| `otp_requests` | طلبات OTP ومحاولاتها | `id` | `user_id` nullable | `request_id` | `destination`, `created_at`, `expires_at`, `status` |
| `support_tickets` | الشكاوى والدعم | `id` | `opened_by_user_id`, `assigned_to_user_id` nullable، `order_id` nullable | `ticket_number` | `ticket_number`, `opened_by_user_id`, `status` |
| `messages` | رسائل التذكرة | `id` | `ticket_id`, `sender_user_id` | لا يوجد | `(ticket_id, created_at)` |
| `admin_users` | ملف الإدارة والتدقيق الإداري | `id` | `user_id → users.id` | `user_id` | `user_id`, `status` |
| `admin_permissions` | صلاحيات granular للإدارة | `id` | `admin_user_id` | `(admin_user_id, permission_key)` | `permission_key` |
| `audit_logs` | سجل الإجراءات الحساسة | `id` | `actor_user_id`, resource references nullable | `event_id` | `(actor_user_id, created_at)`, `(resource_type, resource_id)` |
| `app_settings` | إعدادات التشغيل والرسوم | `id` | `updated_by_user_id` nullable | `key` | `key`, `environment` |

### 1.2 العلاقات

العلاقات الأساسية هي: المستخدم يملك ملف عميل أو سائق ومحفظة وعناوين؛ العميل ينشئ الطلبات؛ السائق يستلم الطلبات؛ التاجر يملك المنتجات؛ الطلب يملك العناصر وسجل الحالات والمواقع والدفع والعمولات والتقييمات؛ المحفظة تملك قيودها؛ التذكرة تملك الرسائل؛ الإدارة تملك الصلاحيات وسجل التدقيق.

### 1.3 Enums المقترحة

يجب تثبيت القيم في طبقة مشتركة وقيود قاعدة البيانات، مع عدم استخدام نصوص حرة في الحقول الحساسة:

- `user_role`: `CUSTOMER`, `DRIVER`, `MERCHANT`, `ADMIN`, `SUPER_ADMIN`.
- `user_status`: `PENDING`, `ACTIVE`, `SUSPENDED`, `DELETED`.
- `driver_approval_status`: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`.
- `driver_availability`: `OFFLINE`, `AVAILABLE`, `BUSY`.
- `order_state`: الحالات العشر المحددة في القسم التالي.
- `payment_status`: `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUND_PENDING`, `REFUNDED`, `CANCELLED`.
- `transaction_status`: `PENDING`, `POSTED`, `REVERSED`, `FAILED`.
- `wallet_transaction_type`: `TOPUP`, `ORDER_PAYMENT`, `REFUND`, `DRIVER_EARNING`, `COMMISSION`, `ADJUSTMENT`.
- `support_status`: `OPEN`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `RESOLVED`, `CLOSED`.

### 1.4 الجداول التي قد تسبب مشكلة مستقبلاً

أخطر نقاط التصميم هي: استخدام `orders` لتخزين كل أنواع الخدمات دون `service_type` وحقول source/destination واضحة؛ تخزين الرصيد كرقم قابل للتعديل بدلاً من Ledger؛ ربط الأموال بـ `float/double` بدلاً من أصغر وحدة نقدية صحيحة؛ غياب idempotency في إنشاء الطلب والدفع؛ جعل الموقع الحي داخل الطلب فقط دون سجل locations؛ استخدام `users.role` وحده لإدارة صلاحيات الإدارة؛ وحفظ مستندات السائق أو الصور كرابط غير محمي. كما أن اختيار قاعدة البيانات غير محسوم: المخطط الحالي يستخدم `drizzle-orm/mysql-core` بينما وثيقة التصميم تقترح PostgreSQL. هذا **BLOCKER** قبل أول Migration.

---

## 2. ORDER SYSTEM

### 2.1 آلة الحالات

```text
PENDING
  → SEARCHING_DRIVER
  → DRIVER_ASSIGNED
  → DRIVER_ACCEPTED
  → DRIVER_ARRIVED
  → PICKED_UP
  → IN_DELIVERY
  → DELIVERED

من الحالة التشغيلية المسموح بها → CANCELLED وفق سياسة الإلغاء
من حالات فشل محددة → FAILED
```

### 2.2 مصفوفة الانتقالات

| من | إلى | المنفذ المسموح | الشروط |
|---|---|---|---|
| `PENDING` | `SEARCHING_DRIVER` | System / Admin | تحقق السعر والعنوان والدفع أو النقد |
| `SEARCHING_DRIVER` | `DRIVER_ASSIGNED` | System / Admin | سائق معتمد، متاح، داخل النطاق، وقفل إسناد ذري |
| `DRIVER_ASSIGNED` | `DRIVER_ACCEPTED` | Driver / Admin | السائق هو المسند إليه أو صلاحية إدارية صريحة |
| `DRIVER_ACCEPTED` | `DRIVER_ARRIVED` | Driver / Admin / System عند GPS موثوق | إثبات وصول أو حدث موقع صالح |
| `DRIVER_ARRIVED` | `PICKED_UP` | Driver / Merchant / Admin بحسب نوع الخدمة | تأكيد الاستلام أو جاهزية الطلب |
| `PICKED_UP` | `IN_DELIVERY` | Driver / Admin | التحقق من الاستلام |
| `IN_DELIVERY` | `DELIVERED` | Driver / Admin، مع System للتسوية لا للتخمين | إثبات تسليم/رمز/صورة حسب السياسة |
| أي حالة قابلة للإلغاء | `CANCELLED` | Customer قبل نقطة القطع، Driver في حالات محددة، Admin، System وفق TTL | حساب الرسوم والسبب وتسجيل الحدث |
| حالات الفشل المحددة | `FAILED` | System / Admin | سبب فشل مصنف، وليس بديلاً عن الإلغاء |

العميل يستطيع **طلب الإلغاء** وليس تجاوز سياسة الإلغاء أو فرض حالة نهائية. لا يستطيع العميل قبول الرحلة أو تغيير سعرها. السائق لا يستطيع تعديل طلب غير مسند إليه ولا إرجاع طلب من `DELIVERED` إلى حالة تشغيلية. المدير يستطيع تنفيذ انتقالات استثنائية فقط إذا كانت صلاحية `order.override_state` موجودة، مع سبب إلزامي وسجل تدقيق. المدير الأعلى يملك إدارة الصلاحيات، وليس تجاوزاً صامتاً.

### 2.3 منع الانتقالات غير القانونية

يجب أن يكون الانتقال داخل Backend في دالة واحدة مثل `transitionOrder()` تتحقق من الحالة الحالية، الدور، ownership، شروط الحالة، ووجود سبب عند الاستثناء. تنفذ العملية داخل Database Transaction مع قفل صف الطلب أو optimistic version، وتكتب `order_status_history` في العملية نفسها. يجب أن يكون `accept` و`assign` و`cancel` Idempotent بمفتاح طلب، مع قيد يمنع سائقاً من امتلاك رحلتين متعارضتين. الواجهة تعرض الحالة فقط ولا تُعد مصدراً للثقة.

---

## 3. MONEY

### 3.1 الحكم الحالي

المال **غير جاهز للإنتاج**. `lib/wallet.ts` يخزن `balance` محلياً في AsyncStorage، وطبقة الخادم الحالية تنفذ upsert/update مباشرة ولا تحتوي معاملات مالية أو Ledger. هذا يصلح للعرض التجريبي فقط، وليس للدفع أو التسوية.

### 3.2 النموذج المطلوب

- `payments` تمثل محاولة/نية الدفع وحالة المزود، ولا تعتبر نجاحاً من رد الواجهة.
- `transactions` تمثل القيد المالي المرجعي، مع `transaction_id`, actor, amount_minor, currency, type, status, reference, idempotency_key.
- `wallet_transactions` تسجل قيود المحفظة؛ الرصيد المشتق يساوي مجموع القيود المرحلة، أو يستخدم snapshot محمي يعاد التحقق منه.
- `driver_earnings` تمثل استحقاق السائق، منفصلة عن عملية الدفع، مع حالة settlement.
- `commissions` تسجل عمولة ZAK وقاعدة الحساب في وقت الطلب حتى لا تتغير بأثر رجعي.
- `refunds` ترتبط بالدفع والطلب والقيد الأصلي، وتمنع تكرار رد المبلغ.

كل مبلغ يجب أن يخزن في أصغر وحدة نقدية صحيحة، مثل `amount_minor`، مع `currency` صريح. لا يجوز استخدام `double` أو تعديل `balance` مباشرة من العميل.

### 3.3 قاعدة المعاملة المالية

كل عملية مالية مركبة يجب أن تستخدم Database Transaction: التحقق من idempotency، إنشاء القيد المتوازن، تحديث حالة الدفع/المحفظة، وإنشاء سجل التدقيق. لا تعتمد على callback من الواجهة. الدفع الخارجي يعتمد على Webhook موثق، مع التحقق من التوقيع والمبلغ والعملة والمرجع قبل posting. حالات الفشل تستخدم reversal أو refund موثقاً، وليس حذف القيد.

---

## 4. USERS & SECURITY

### 4.1 الأدوار والصلاحيات

| المجال | Customer | Driver | Merchant | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|
| قراءة/تعديل ملفه | نعم | نعم | نعم | نعم وفق النطاق | نعم |
| إنشاء طلب | نعم | لا | لا | حسب الصلاحية | نعم |
| رؤية طلباته | طلباته فقط | الرحلات المسندة/المسموح بها | طلبات متجره | حسب scope | نعم |
| قبول رحلة | لا | نعم للسائق المعتمد والمسند | لا | لا عادةً، override فقط | نعم |
| تحديث رحلة | لا | المراحل المسموحة لرحلته | تجهيز/قبول طلب متجره | override مسجل | نعم |
| إدارة المنتجات | لا | لا | متجره فقط | حسب الصلاحية | نعم |
| اعتماد/إيقاف سائق | لا | لا | لا | نعم | نعم |
| تغيير السعر/العمولة | لا | لا | لا | حسب الصلاحية | نعم |
| إدارة المستخدمين | لا | لا | لا | حسب الصلاحية | نعم |
| إدارة الصلاحيات | لا | لا | لا | لا | نعم |
| رؤية السجلات الحساسة | لا | سجله فقط | سجله فقط | حسب scope | نعم |
| إدارة إعدادات النظام | لا | لا | لا | حسب الصلاحية | نعم |

### 4.2 الوضع الحالي والمطلوب

الموجود حالياً هو `protectedProcedure` الذي يتحقق من وجود المستخدم، و`adminProcedure` الذي يتحقق من `role === admin`. هذا **تفويض خلفي موجود لكنه بدائي**. لا يوجد `super_admin`، ولا merchant role فعلي في المخطط، ولا resource-scoped authorization، ولا permission catalog كامل.

يجب فرض التفويض في Backend عبر middleware وpolicy functions تتحقق من role، permission، ownership، status، وscope. إخفاء الزر في Frontend تحسين UX فقط وليس حماية. يجب منع mass assignment، والتحقق من كل `id` على الخادم، وتسجيل الإجراءات الحساسة في `audit_logs`. يجب حماية OTP من enumeration وbrute force، وعدم تخزين الأسرار أو الرموز في Git أو السجلات.

---

## 5. EXTERNAL SERVICES

لا يجوز اختيار مزود غير مؤكد أو اختراع API. الجدول التالي يحدد الحاجة وواجهة التجريد فقط؛ أسماء المتغيرات placeholders تشغيلية بلا قيم، وتحتاج تثبيتاً بعد اختيار الحساب القانوني والمزود.

| الخدمة | الغرض | مطلوبة؟ | API/القرار | متغيرات بيئية مقترحة | Development | Staging | Production |
|---|---|---|---|---|---|---|---|
| OTP | تأكيد رقم الهاتف والجلسات | Required للإنتاج | `OTPService`؛ المزود لم يُحسم | `OTP_PROVIDER`, `OTP_API_KEY`, `OTP_SENDER_ID` | Mock deterministic | Sandbox/test credentials | حساب رسمي + rate limits |
| SMS | بديل/احتياط OTP | Optional حسب القرار | واجهة مزود رسمي فقط | `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID` | Mock | Sandbox | حساب يدعم ليبيا |
| WhatsApp | OTP/إشعارات أعمال | Optional/مطلوبة إذا اختيرت | WhatsApp Business Platform أو مزود رسمي، دون API شخصي | `WHATSAPP_PROVIDER`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | Mock | Business test environment | حساب أعمال موثق وسياسة قوالب |
| Google Maps | Maps/Places/Geocoding/Routes/ETA | Required للتتبع الجغرافي الإنتاجي | Google Maps Platform APIs بعد تفعيل الحساب | `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_MAP_ID` عند الحاجة | Restricted dev key أو mock | Restricted staging key | Restricted production key |
| Firebase | Push notifications وFCM | Required للإشعارات الأصلية | Firebase Cloud Messaging | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, platform config | Dev project | Staging project | Production project |
| Payment Gateway | نية الدفع، webhook، refund | Optional حتى اختيار مصرف/مزود ليبي | `PaymentProvider` abstraction؛ API غير محدد | `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_MERCHANT_ID` | Mock | Sandbox | حساب قانوني + settlement |
| Banking | تحويل مصرفي وتسوية | Optional، يحتاج اتفاق مصرفي | API غير محدد؛ لا نفترض Open Banking | `BANK_PROVIDER`, `BANK_API_BASE_URL`, `BANK_API_KEY`, `BANK_WEBHOOK_SECRET` | Mock/manual fixture | Sandbox إن وجد | عقد ومفاتيح رسمية |
| Storage | صور الشكاوى ومستندات السائق | Required عند تفعيل المرفقات | S3-compatible/Object Storage abstraction | `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION` | Local/minio أو mock | Staging bucket | Private production bucket + signed URLs |
| Email | تنبيهات إدارية/استرجاع | Optional | مزود Email لم يُحسم | `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | Local sink | Sandbox | Domain-authenticated sender |
| Monitoring | أخطاء، أداء، تنبيهات | Required قبل الإنتاج | مزود المراقبة لم يُحسم | `MONITORING_DSN`, `LOG_LEVEL`, `ALERT_WEBHOOK_URL` | Console/local | Staging project | Production project + alerts |

القرار المحفوظ: لا نستخدم WhatsApp شخصياً أو API غير رسمي، ولا نربط دفعاً أو مصرفاً قبل معرفة الشركة والحساب التجاري وKYC وSandbox والرسوم ودعم ليبيا.

---

## 6. INFRASTRUCTURE

| العنصر | التصميم المقترح | الحالة/القرار |
|---|---|---|
| Domain | `zak.ly` للتسويق، `api.zak.ly` للخادم، `admin.zak.ly` للإدارة | NEEDS REVIEW؛ لا نفترض شراء النطاق |
| DNS | سجلات DNS للموقع وAPI وadmin، مع بيئات منفصلة | MISSING؛ يحتاج مالك النطاق |
| SSL | شهادات TLS وإجبار HTTPS | MISSING |
| Backend | API مستقل، config لكل بيئة، connection pooling | أساس محلي موجود، إنتاج MISSING |
| Database | Development/Staging/Production منفصلة | BLOCKER: MySQL الحالي مقابل PostgreSQL المقترح |
| Storage | Private object storage وsigned URLs | MISSING إنتاجياً |
| Redis | cache/queue/rate limit عند الحاجة | Optional في البداية، MISSING |
| WebSocket | تتبع حي بعد تثبيت REST/location | MISSING |
| Monitoring | API/DB/errors/payments/OTP/CPU/memory | MISSING |
| Backup | آلي، retention، encryption، restore drill | MISSING |
| CI/CD | lint/check/test/build، migrations gated، secrets خارج Git | MISSING كخط إنتاجي موثق |

لا يجوز ربط Production حتى توجد بيئات منفصلة، أسرار منفصلة، SSL، مراقبة، نسخ احتياطي واختبار استعادة.

---

## 7. MIGRATION SAFETY

الترتيب الإلزامي قبل أي Migration:

1. تثبيت قرار محرك قاعدة البيانات والنسخة وtimezone وcharset.
2. أخذ Backup قابل للتحقق، مع توثيق وقت النسخة ونتيجة restore test.
3. إنشاء Migration additive وغير مدمرة؛ لا حذف أعمدة/جداول ولا إعادة تسمية مباشرة.
4. تشغيلها على نسخة Development نظيفة ونسخة Development تحتوي بيانات مماثلة.
5. فحص schema diff وقيود FK وUnique وIndexes وأداء الاستعلامات.
6. تشغيل اختبارات البيانات، الحالة، الصلاحيات، Ledger، idempotency، وrollback rehearsal.
7. تطبيق نفس الحزمة على Staging مع بيانات منزوعة الحساسية ومراقبة السجلات.
8. تنفيذ موافقة يدوية وتوقيت نافذة التغيير.
9. تطبيق Production بعد نجاح Staging فقط، مع خطة إيقاف آمنة.
10. التحقق بعد التنفيذ من counts، constraints، health checks، وقراءة/كتابة اختبارية آمنة.

لا ينبغي أن يكون rollback مجرد حذف Migration إذا كانت قد كتبت بيانات؛ يلزم تصميم forward-fix أو down migration آمنة مع Backup. **لا تعديل مباشر على Production Database.**

---

## 8. CURRENT PROJECT

### EXISTS

- Expo Mobile + TypeScript وواجهات ZAK الأساسية.
- هوية ZAK وRTL جزئياً.
- جداول فعلية: `users`, `driver_profiles`, `delivery_orders`.
- `users.openId` و`delivery_orders.orderNumber` و`driver_profiles.userId` كقيود Unique في Drizzle.
- طبقة خادم لحفظ المستخدمين والطلبات وملف السائق.
- أساس آلة حالات مشتركة واختبارات Vitest.
- `protectedProcedure` و`adminProcedure` خلف الخادم بمستوى أولي.
- تخزين محلي للطلبات والمحفظة للعرض التجريبي.
- واجهات العميل والسائق والتاجر والإدارة على مستوى أساس/محاكاة.

### MISSING

- جداول العملاء والتجار والمنتجات والعناوين والتاريخ والمواقع والتذاكر والرسائل والدفعات والمحافظ والقيود المالية.
- Foreign Keys وDrizzle relations فعلياً؛ ملف `drizzle/relations.ts` فارغ.
- Order status history، idempotency، optimistic version، وقيود الإسناد الذرية.
- Backend RBAC granular و`MERCHANT` و`SUPER_ADMIN` وpermission catalog.
- Ledger ومعاملات DB مالية وrefunds وcommission settlement.
- OTP/WhatsApp/SMS رسمي، FCM، Google Places/Routes/Geocoding، Storage خاص.
- GPS حي وWebSocket، مراقبة، Backup/Restore، Staging/Production.
- CI/CD gated migrations وsecurity test suite.

### CONFLICT

| الموضوع | الوضع الحالي | التصميم | الحكم |
|---|---|---|---|
| محرك DB | `mysql-core` و`mysqlEnum` | وثيقة Phase 1 تقول PostgreSQL | BLOCKER قرار معماري |
| المستخدمون | role: `user/driver/admin` | Customer/Driver/Merchant/Admin/Super Admin | NEEDS CHANGE بعد اعتماد |
| الطلبات | `delivery_orders` وحالات legacy `pending/accepted/preparing/picked_up/on_the_way/delivered/cancelled` | `orders` والحالات العشر الجديدة | NEEDS CHANGE؛ لا حذف legacy |
| العلاقات | لا توجد Drizzle relations معلنة | علاقات FK صريحة | MISSING |
| التخزين المالي | AsyncStorage balance محلي | DB Ledger وTransactions | BLOCKER للإنتاج |
| التفويض | admin/non-admin فقط | RBAC + permissions + scope | NEEDS CHANGE |
| التتبع | حقول lat/lng داخل الطلب وتحديث خفيف | order_locations + WebSocket | NEEDS CHANGE |
| الهوية | موجودة جزئياً | نظام إنتاج كامل | NEEDS REVIEW |

لا يُحذف أي جدول أو حقل موجود. أي دمج بين `delivery_orders` و`orders` يجب أن يكون additive أو عبر compatibility view/dual-read مؤقت بعد اختبار، وليس إعادة تسمية مدمرة.

---

## 9. PHASE 2 PLAN

### Step 1 — Database migrations

**Files:** `drizzle/schema.ts`, `drizzle/relations.ts`, `drizzle/migrations/*`, `drizzle/meta/*`, `docs/migrations/`.

**Changes:** حسم محرك DB أولاً، إضافة الجداول والـFK والـUnique والـIndexes تدريجياً، إضافة `service_type`, `idempotency_key`, `version` وسجل history، مع الحفاظ على الجداول الحالية.

**Dependencies:** قرار MySQL/PostgreSQL، Database Development، Backup fixture، naming/timezone policy.

**Risks:** اختلاف dialect، locks، duplicate legacy data، تغيّر enum، migration طويلة.

**Tests:** schema generation، migration up/down rehearsal، duplicate constraints، FK checks، legacy compatibility، performance smoke.

### Step 2 — Models

**Files:** `shared/types.ts`, `shared/order-state.ts`, `shared/permissions.ts`, ملفات schemas/validators المقترحة.

**Changes:** أنواع users/roles/orders/payments/ledger/support، enums موحدة، DTOs لا تكشف أسراراً، amount_minor وcurrency.

**Dependencies:** Step 1 وقرار domain vocabulary.

**Risks:** اختلاف الأسماء بين العميل والخادم، تحويل حالات legacy، nullable fields.

**Tests:** type checks، serialization، enum exhaustiveness، invalid payload fixtures.

### Step 3 — Repositories

**Files:** `server/db.ts`، مجلد `server/repositories/` المقترح، transaction helpers.

**Changes:** repositories typed لا raw updates، ownership filters، pagination، idempotent inserts، `withTransaction`، عدم تعديل balance مباشرة.

**Dependencies:** schema وconnection pool.

**Risks:** تسريب بيانات بين المستخدمين، race conditions، N+1، transaction scope غير صحيح.

**Tests:** repository integration على Development DB، ownership/IDOR، concurrent accept، pagination، rollback on error.

### Step 4 — Services

**Files:** `server/services/order-service.ts`, `pricing-service.ts`, `payment-service.ts`, `wallet-service.ts`, `notification-service.ts`, `support-service.ts` المقترحة.

**Changes:** فصل business rules عن routers، quote في Backend، Ledger postings، service abstractions للتكاملات، audit events.

**Dependencies:** repositories، config/secrets، state policy.

**Risks:** side effects خارج DB transaction، duplicate webhook، provider lock-in، secrets.

**Tests:** unit tests، idempotency، webhook signature fixtures، money invariant، service failure scenarios.

### Step 5 — Order API

**Files:** `server/routers.ts` أو routers modules، schemas، error mapping.

**Changes:** إنشاء/قراءة/إلغاء/تتبع/تقييم الطلب، quote إلزامي وإعادة حساب عند الإنشاء، pagination، normalized errors، auth + permission لكل endpoint.

**Dependencies:** services، models، rate limits.

**Risks:** العميل يرسل total مزوراً، IDOR، duplicate order، كشف مواقع.

**Tests:** contract tests، auth matrix، invalid state، idempotency، rate-limit tests.

### Step 6 — Order State Machine

**Files:** `shared/order-state.ts`, `server/services/order-state-service.ts`, history repository.

**Changes:** انتقال ذري، actor/ownership/policy، history داخل نفس transaction، assign/accept lock، cancel/fail reasons.

**Dependencies:** orders/history schema، transaction support.

**Risks:** انتقالات متزامنة، حالات legacy، override إداري غير مدقق.

**Tests:** transition matrix لكل role، illegal transitions، concurrency، replay/idempotency، audit assertions.

### Step 7 — Validation

**Files:** `shared/validators/` المقترحة، router input schemas، config validation.

**Changes:** Zod schemas للأرقام والمواقع والهاتف والعملة والـIDs، منع mass assignment، file validation لاحقاً، environment validation.

**Dependencies:** Models، chosen provider contracts.

**Risks:** قبول payload أوسع من اللازم، اختلاف client/server، رسائل خطأ تكشف معلومات.

**Tests:** property/fuzz-like fixtures، boundary values، malformed JSON، unsupported enum، secret/config failure.

### Step 8 — Tests

**Files:** `tests/`, `tests/integration/`, `tests/security/`, `docs/test-plan.md`.

**Changes:** توسيع Vitest من اختبارات محلية إلى unit/integration/contract/security، مع Development DB فقط، وfixtures بلا بيانات حقيقية.

**Dependencies:** كل الخطوات السابقة وبيئة اختبار قابلة لإعادة البناء.

**Risks:** اختبارات تعتمد على الوقت أو الشبكة، test data leaking، عدم اختبار race conditions.

**Tests:** regression suite، migration rehearsal، order matrix، money invariants، RBAC/IDOR، webhook replay، load smoke، backup restore drill.

لا تنتقل Step 2 أو ما بعدها إلى Production قبل إغلاق Blockers واعتماد نتائج الاختبار في Development ثم Staging.

---

## 10. FINAL DECISION

### 🟢 READY

- إجراء Final Review نفسه دون تعديل تنفيذي.
- الاستمرار في استخدام Expo/TypeScript مبدئياً.
- الاحتفاظ بكل الجداول والحقول الحالية وعدم حذفها.
- اعتماد مبدأ Backend authorization، state history، idempotency، وLedger كقواعد تصميم.
- بدء إعداد fixtures وخطة الاختبارات بعد حسم القرارات الحرجة.

### 🟡 NEEDS REVIEW

- أسماء النطاقات ومالك DNS.
- الفصل النهائي بين تطبيق العميل/السائق ولوحة التاجر/الإدارة.
- سياسة الإلغاء والإثبات والـETA.
- مزود OTP/SMS/WhatsApp والدفع والبنك والتخزين والبريد والمراقبة.
- اختيار Redis وWebSocket وFCM وتكلفة التشغيل.
- معنى `FAILED` وسياسة الانتقال إليه.
- سياسة العملات والرسوم والضرائب/العمولات والمبالغ المستردة.

### 🔴 BLOCKER

1. **حسم محرك قاعدة البيانات:** المخطط الحالي MySQL، بينما التصميم المقترح PostgreSQL. لا Migration قبل القرار.
2. **اعتماد نموذج المال:** لا يوجد Ledger إنتاجي ولا DB Transactions حالياً؛ يمنع الدفع أو الشحن الحقيقي.
3. **فصل البيئات:** لا Development/Staging/Production منفصلة ومثبتة مع Backup/Restore.
4. **هوية الإنتاج:** لا OTP/WhatsApp/Payment provider رسمي مع حسابات واختبارات Sandbox.
5. **تفويض الأدوار:** لا Merchant/Super Admin وpermission-scoped authorization كاملاً.

## قرار الانتقال

**لا تبدأ أي Migration حالياً.** التقرير جاهز للمراجعة، لكن وجود BLOCKER حرجة يمنع Phase 2 التنفيذية. بعد حسم محرك قاعدة البيانات ونموذج المال والبيئات والتكاملات الأساسية، يمكن اعتماد Step 1 في Development فقط، ثم Staging، ثم Production بعد موافقة مستقلة واختبار Backup/Restore.
