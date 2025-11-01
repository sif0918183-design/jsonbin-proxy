export default async function handler(req, res) {
  // النطاقات المصرح لها
  const ALLOWED_ORIGINS = [
    "https://aljazeera-leb.blogspot.com",
    "https://www.aljazeera-leb.blogspot.com",
  ];

  const origin = req.headers.origin;

  // إعداد ترويسات CORS
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS.includes(origin) ? origin : "null");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // معالجة طلب OPTIONS (الذي يرسله المتصفح قبل POST)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // منع الوصول من نطاقات غير مصرح بها
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ message: "Access denied: Unauthorized origin" });
  }

  // المفاتيح السرية
  const API_KEY = process.env.JSONBIN_SECRET_KEY;
  const BIN_ID = process.env.JSONBIN_BIN_ID;

  // قراءة البيانات
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

  // تحديث / كتابة البيانات
  if (req.method === "POST") {
    try {
      const newData = req.body;
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": API_KEY,
        },
        body: JSON.stringify(newData),
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: "Error updating data", error: error.message });
    }
  }

  // في حالة نوع طلب غير مدعوم
  return res.status(405).json({ message: "Method not allowed" });
}