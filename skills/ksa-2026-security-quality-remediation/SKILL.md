---
name: ksa-2026-security-quality-remediation
description: >
  تنفيذ تدقيق وإصلاح شامل لمشاريع React/Vite المنشورة على Vercel والمربوطة
  بمستودع GitHub، مع فحص Krom Forge وnpm audit وترقية Tailwind CSS ومعالجة
  React Hooks وتشغيل TypeScript والاختبارات والبناء وإنشاء تقرير وفرع إصلاح.
---

# KSA-2026 Security and Quality Remediation

## الهدف

تُستخدم هذه المهارة عند الحاجة إلى تدقيق مشروع React/Vite وإصلاح نتائج Krom Forge وESLint وnpm audit، أو ترقية Tailwind CSS، أو تجهيز فرع مستقل وPull Request للمراجعة.

يجب الحفاظ على السلوك الحالي، والعمل على فرع مستقل، وتشغيل بوابات التحقق بعد كل مجموعة تغييرات.

## قواعد السلامة

- لا تستخدم `npm audit fix --force` افتراضيًا.
- لا تدمج فرعًا في `main` ولا تغلق Pull Request دون طلب صريح.
- لا تحذف بيانات أو فروعًا أو أسرار بيئة.
- لا تغيّر إعدادات الحساب أو الصلاحيات.
- لا تُخفِ تحذيرات ESLint بتعطيل القواعد أو تغييرها إلى `off`.
- وثّق جميع الافتراضات والنتائج.

## 1. فحص البيئة والمستودع

اقرأ `AGENTS.md` و`README.md` وأي تعليمات أقرب إلى الملفات التي ستتغير. إذا تعذر قراءة ملف تعليمات بسبب صلاحيات الجهاز، توقف وأبلغ المستخدم قبل تعديل نطاقه.

تحقق من:

```powershell
Get-ChildItem -Force
git status --short --branch
git remote -v
git branch --show-current
Get-Content package.json -Raw
```

تأكد من وجود مستودع Git صالح و`package.json`، وافهم حالة التغييرات الحالية قبل إنشاء الفرع.

## 2. فحص الخدمات

عند توفر الموصلات، افحص:

- **Krom Forge:** جرد المشروع، التدقيق الأمني، الجاهزية الإنتاجية، الاختبارات والتهيئة.
- **Vercel:** بيانات المشروع، آخر deployments، أحداث البناء، وسجلات التشغيل الحديثة.
- **GitHub:** المستودع والفرع الأساسي وحالة الفرع البعيد.

لا تغيّر إعدادات Vercel أو الحسابات إل٧ بطلب واضح. إذا لم تكن مصادقة GitHub متاحة، جهّز رابط المقارنة بدل تنفيذ `gh auth login`.

## 3. خط أساس الجودة

شغّل واحفظ نتائج الأوامر التالية:

```powershell
npm install --ignore-scripts
npm run typecheck
npm run test
npm run lint
npm audit --json
npm run build
```

إذا كان script غير موجود، سجّل ذلك بدل اعتباره فشلًا غير مبرر.

## 4. فرع الإصلاح

أنشئ فرعًا مستقلًا بعد التأكد من حالة الشجرة:

```powershell
git switch -c chore/tailwind-v4-and-eslint-cleanup
```

استخدم اسم الفرع الذي يطلبه المستخدم عند اختلافه.

## 5. معالجة npm audit

1. ميّز بين تبعيات الإنتاج والتطوير.
2. نفّذ الإصلاح الآمن غير القسري:

```powershell
npm audit fix
```

3. أعد تشغيل `npm audit` و`typecheck` والاختبارات والبناء.
4. إذا بقيت ثغرات في تبعيات التطوير، افحص الاستخدام والإصدار البديل والتوافق.
5. لا تستخدم `npm audit fix --force` إلا بعد عرض المخاطر والحصول على موافقة صريحة.

## 6. ترقية Tailwind CSS 3 إلى 4

افحص `package.json` و`package-lock.json` و`tailwind.config.*` و`postcss.config.*` و`vite.config.ts` و`src/index.css`.

التهيئة المستهدفة:

```ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

وفي CSS الرئيسي:

```css
@config "../tailwind.config.cjs";
@import "tailwindcss";
@import "tw-animate-css";
```

استخدم `tailwindcss` و`@tailwindcss/vite` من الإصدار الرابع، واستبدل `tailwindcss-animate` بـ`tw-animate-css` عند الحاجة. أزل PostCSS و`autoprefixer` القديمين فقط إذا لم يعد المشروع يحتاجهما.

بعد الترقية اختبر:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

راجع بصريًا عند توفر التشغيل: الألوان، الحدود، animations، responsive، dark mode، RTL، والطباعة.

## 7. React Hooks

### purity

لا تستخدم `Date.now()` أو `new Date()` أو `Math.random()` المتغيرة داخل render. استخدم hook مبنيًا على `useSyncExternalStore` للقيم الزمنية المتغيرة:

```ts
import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  const timer = window.setInterval(callback, 60_000);
  return () => window.clearInterval(timer);
};

const getSnapshot = () => Date.now();

export function useCurrentTime() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

### set-state-in-effect

إذا كانت مزامنة state داخل effect ضرورية، أجّلها مع الحفاظ على cleanup:

```ts
useEffect(() => {
  queueMicrotask(() => setValue(nextValue));
}, [nextValue]);
```

### exhaustive-deps

لا تستخدم تعطيل القاعدة كحل افتراضي. ثبّت fallback collections التي تدخل في `useMemo`:

```ts
const rows = useMemo(() => query.data || [], [query.data]);
const map = useMemo(() => buildMap(rows), [rows]);
```

أضف dependencies التي يقرأها effect أو callback. عند اعتماد callback على object كامل من context أو React Query، استخدم object نفسه إذا كان ذلك يطابق استنتاج React Compiler.

استخرج القواعد المستهدفة بصيغة JSON:

```powershell
npx eslint . -f json
```

القواعد المستهدفة:

```text
react-hooks/purity
react-hooks/set-state-in-effect
react-hooks/exhaustive-deps
react-hooks/preserve-manual-memoization
```

## 8. إزالة بقية تحذيرات ESLint

لكل تحذير:

1. اقرأ الملف والسياق المحيط.
2. احذف import أو variable غير المستخدم فقط إذا لم يكن له أثر سلوكي.
3. لا تحذف state أو callback مستخدمًا في JSX.
4. أعد تشغيل typecheck بعد كل مجموعة.
5. لا تغيّر مستوى القاعدة لإخفاء التحذير.

الهدف:

```text
ESLint errors: 0
ESLint warnings: 0
```

## 9. الاختبارات النهائية

شغّل:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
git diff --check
```

واستخدم `npm run release:gate` إذا كان متاحًا. سجّل exit codes وعدد الاختبارات والتحذيرات ونتيجة البناء وحالة Git.

## 10. التقرير

أنشئ تقريرًا في:

```text
outputs/ksa-2026-comprehensive-remediation-summary.md
```

يجب أن يتضمن المشروع والفرع، أدوات الفحص، نتائج Krom Forge وnpm audit، إصلاحات الاختبارات، تفاصيل Tailwind، إصلاحات Hooks، نتائج ESLint وTypeScript والاختبارات والبناء، سجل commits، التحذيرات المتبقية، وحالة Pull Request.

## 11. commit والرفع

راجع قبل commit:

```powershell
git status --short --branch
git diff --stat
git diff --check
```

أنشئ commit واضحًا وأضف trailer واحدًا فقط:

```powershell
git add <files>
git commit -m "chore: remediate security and quality findings" `
  -m "Describe the safe changes and validation results." `
  -m "Co-authored-by: Manus <dev-agent@manus.ai>"
git push -u origin <branch-name>
```

## 12. Pull Request والدمج

عند توفر مصادقة GitHub:

```powershell
gh pr create --base main --head <branch-name> --title "<title>" --body "<summary>"
```

عند تعذر المصادقة، اعرض:

```text
https://github.com/<owner>/<repo>/compare/main...<branch-name>
```

لا تدمج أو تغلق Pull Request دون طلب صريح. عند طلب الدمج، تحقّق أولًا من نجاح checks، ثم استخدم خيار الدمج المناسب، وبعدها حدّث `main` محليًا:

```powershell
git switch main
git pull --ff-only origin main
git branch -d <branch-name>
```

## مخرجات النجاح

اعرض للمستخدم ملخصًا تنفيذيًا، عدد الإصلاحات، نتائج typecheck والاختبارات والبناء وESLint، hash الـcommit، اسم الفرع، رابط Pull Request أو المقارنة، رابط التقرير، وأي خطوات تتطلب تدخل المستخدم.

معايير النجاح:

```text
typecheck = passed
tests = all passed
lint errors = 0
lint warnings = 0
build = passed
git diff --check = passed
report = created
```
