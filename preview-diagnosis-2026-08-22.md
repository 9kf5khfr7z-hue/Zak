# تشخيص فشل معاينة ZAK — 2026-08-22

## النتيجة
الرابط `https://tawseelapp-cbwma6q7.manus.space/` يعيد `Cannot GET /` من Express بحالة HTTP 404. هذا الدومين مرتبط بخدمة الخادم/API على المنفذ 3000، وليس بواجهة Expo Web.

رابط Expo Web العامل هو رابط الخدمة على المنفذ 8081، وقد ظهر فيه مسار `/welcome` وواجهة ZAK: شاشة الترحيب، اختيار العربية/English، زر ابدأ الآن، وتسجيل الدخول.

## الأثر
فشل اختبار iPhone في الخطوة 1 لأن الرابط المرسل كان رابط API، وليس لأن تدفق Customer → Driver → Order أو كود شاشة الترحيب فشل. لا يوجد تعديل على الكود أو قاعدة البيانات بسبب هذا التشخيص.

## الإجراء التالي المقترح
إرسال رابط Expo Web الصحيح للمستخدم للاختبار على iPhone. يبقى هذا اختبار Web متجاوب، وليس نسخة iOS أصلية أو TestFlight.

## Deep READ-ONLY check — 2026-08-22

Source review confirms `app/dev/demo-flow.tsx:37-38` calls `createDemoOrder()` once then `startDemoDispatch(created.id)` once from the `createOrder` handler. `reset()` at lines 60-67 calls `resetDemoOrders()` then `refresh()`; `refresh()` only reads orders. `lib/demo-orders.ts` creates IDs as `demo-order-${Date.now()}-${++orderSequence}`, saves `[order, ...(await getDemoOrders())]`, starts dispatch with a synchronous module-level `dispatchInProgress` guard, and checks `getDemoActiveDriverOrder()` before transitions. The active predicate is `driverId === "driver-demo-001"` plus one of `DRIVER_ASSIGNED`, `DRIVER_ACCEPTED`, `DRIVER_ARRIVED`, `PICKED_UP`, `IN_DELIVERY`.

`app/_layout.tsx` contains no React.StrictMode wrapper. Web AsyncStorage implementation directly calls `window.localStorage` inside a Promise executor, so get/set/remove are immediate per tab after awaiting the returned promise.

Live sandbox Expo Web read-only inspection at `https://8081-i73i0hdtfux21kgox40ck-64b6a92a.us4.manus.computer` reported: origin present, `zak_demo_orders_v1` absent, orderCount 0, activeOrdersForDemoDriver empty, JSON parse error null. This is sandbox browser storage, not the user's iPhone Safari storage.
