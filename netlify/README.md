# פריסת המשחק ומערכת הניהול ב-Netlify

## מבנה
    public/index.html        המשחק
    public/admin/index.html  מערכת הניהול
    public/content.js        התוכן המצורף — משמש כגיבוי אם הענן לא נענה
    public/region-map.html   המפה שמוטמעת במסכי האזורים
    netlify/functions/content.mjs   ה-API: GET /api/content, PUT /api/content

## פריסה
1. גרור את התיקייה הזאת ל-app.netlify.com/drop, או חבר אותה כ-repo.
2. **סיסמת עורך:** Site configuration → Environment variables → הוסף `ADMIN_PASSWORD` עם סיסמה לבחירתך. זה מספיק כדי להיכנס ל-/admin.
3. **או** Identity: Site configuration → Identity → Enable Identity.
4. Identity → Registration → **Invite only**, ואז Invite users והזמן את העורכים במייל.

## התחברות
שתי דרכים, שתיהן מתקבלות:
- `x-admin-password` התואם למשתנה הסביבה `ADMIN_PASSWORD` (הכי פשוט).
- טוקן Netlify Identity תקף.

## איך זה מחובר
- `/api/content` שומר את כל התוכן כרשומה אחת ב-Netlify Blobs (store `trivia-content`, מפתח `content.json`).
- GET פתוח לקריאה — המשחק קורא אותו בכל טעינה.
- PUT דורש טוקן Identity תקף. בלי התחברות מוחזר 401.
- כל שמירה מעלה `revision` ב-1 ושומרת גיבוי של הגרסה הקודמת (`backup-<rev>.json`).
- שמירה עם `baseRevision` מיושן מוחזרת כ-409 כדי שלא לדרוס עריכה של עורך אחר.
- `content-live.js` טוען את התוכן מהענן לפני המשחק: עד שלושה ניסיונות, ואם אין מענה — התוכן המקומי.

## הגדרות שהמערכת שולטת בהן במשחק
`content.SETTINGS`: `questionCount`, `first`, `second`, `hintCost`, `secondTry`, `liveScore`, `praise`, `orderMode`, `bands`.

## סודות
אין שום סוד בתוך קבצי המאגר. הערכים הרגישים חיים רק במשתני הסביבה של Netlify:

| משתנה | לשם מה |
| --- | --- |
| `ADMIN_PASSWORD` | סיסמת הכניסה ל-/admin |

- `.env.example` מתעד את השמות בלבד, בלי ערכים — הוא כן נכנס לגיט.
- `.env` מוחרג ב-`.gitignore`, וכך גם `node_modules/` ו-`.netlify/`.
- טוקני Netlify Identity נוצרים בדפדפן בזמן ריצה ולא נשמרים בקבצים.
- אם סיסמה נחשפת: Netlify → Environment variables → שנה את הערך → Redeploy. אין צורך לגעת בקוד.
