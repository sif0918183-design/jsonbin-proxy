export default async function handler(req, res) {
  // النطاق المصرح له فقط
  const ALLOWED_ORIGIN = "https://aljazeera-leb.blogspot.com";

  // التحقق من مصدر الطلب
  const origin = req.headers.origin;
  if (origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ message: "Access denied: Unauthorized origin" });
  }

  // المفتاح السري محفوظ في بيئة Vercel (وليس في الكود)
  const API_KEY = process.env.JSONBIN_SECRET_KEY;
  const BIN_ID = process.env.JSONBIN_BIN_ID;

  // التعامل مع نوع الطلب
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