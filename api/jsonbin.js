export default async function handler(req, res) {
  // النطاقات المصرح لها
  const ALLOWED_ORIGINS = [
    "https://aljazeera-leb.blogspot.com",
    "https://www.aljazeera-leb.blogspot.com",
  ];

  const origin = req.headers.origin;

  // إعداد ترويسات CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    ALLOWED_ORIGINS.includes(origin) ? origin : "null"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // معالجة طلب OPTIONS
  if (req.method === "OPTIONS") return res.status(200).end();

  // منع الوصول من نطاقات غير مصرح بها
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ message: "Access denied: Unauthorized origin" });
  }

  const API_KEY = process.env.JSONBIN_SECRET_KEY;
  const BIN_ID = process.env.JSONBIN_BIN_ID;

  // GET request: قراءة البيانات
  if (req.method === "GET") {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": API_KEY },
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: "Error fetching data", error: error.message });
    }
  }

  // POST request: إضافة بيانات جديدة مع التحقق من reCAPTCHA
  if (req.method === "POST") {
    try {
      const { name, token } = req.body;

      if (!name || !token) {
        return res.status(400).json({ message: "البيانات غير مكتملة" });
      }

      // التحقق من reCAPTCHA مع Google
      const secretKey = process.env.RECAPTCHA_SECRET_KEY; // المفتاح السري
      const captchaRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${secretKey}&response=${token}`,
        }
      );
      const captchaData = await captchaRes.json();

      if (!captchaData.success) {
        return res.status(403).json({
          message: "فشل التحقق من reCAPTCHA. تأكد أنك لست روبوت.",
        });
      }

      // قراءة البيانات الحالية من JSONBin
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        headers: { "X-Master-Key": API_KEY },
      });
      const data = await response.json();
      const votes = data.record?.votes || [];

      // إضافة الاسم الجديد
      votes.push({ name, time: new Date().toISOString() });

      // تحديث البيانات في JSONBin
      const updateRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": API_KEY,
        },
        body: JSON.stringify({ votes }),
      });
      const updatedData = await updateRes.json();

      return res.status(200).json(updatedData);

    } catch (error) {
      return res.status(500).json({ message: "Error updating data", error: error.message });
    }
  }

  // إذا كان نوع الطلب غير مدعوم
  return res.status(405).json({ message: "Method not allowed" });
}