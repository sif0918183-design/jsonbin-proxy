export default async function handler(req, res) {
  const ALLOWED_ORIGINS = [
    "https://aljazeera-sd.blogspot.com",
    "https://www.aljazeera-sd.blogspot.com",
  ];

  const origin = req.headers.origin;

  res.setHeader(
    "Access-Control-Allow-Origin",
    ALLOWED_ORIGINS.includes(origin) ? origin : "null"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ message: "Access denied: Unauthorized origin" });
  }

  const API_KEY = process.env.JSONBIN_SECRET_KEY;
  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

  // GET: قراءة البيانات
  if (req.method === "GET") {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": API_KEY },
      });
      
      if (!response.ok) {
        throw new Error(`JSONBin API returned ${response.status}`);
      }
      
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      return res.status(500).json({ message: "Error fetching data", error: error.message });
    }
  }

  // POST: إضافة بيانات جديدة بعد التحقق من reCAPTCHA
  if (req.method === "POST") {
    try {
      const { name, deviceId, token } = req.body;

      if (!name || !token || !deviceId) {
        return res.status(400).json({ message: "البيانات غير مكتملة" });
      }

      // تحقق reCAPTCHA مع Google
      const captchaRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
        }
      );
      
      const captchaData = await captchaRes.json();

      if (!captchaData.success) {
        console.error("reCAPTCHA verification failed:", captchaData);
        return res.status(403).json({ message: "فشل التحقق من reCAPTCHA" });
      }

      // قراءة البيانات الحالية من JSONBin
      const fetchRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": API_KEY },
      });
      
      if (!fetchRes.ok) {
        throw new Error(`JSONBin API returned ${fetchRes.status}`);
      }
      
      const fetchData = await fetchRes.json();
      const votes = fetchData.record?.votes || [];

      // التحقق من الحد الأقصى للتسجيلات لهذا الجهاز
      const deviceVoteCount = votes.filter(vote => vote.deviceId === deviceId).length;
      const MAX_VOTES_PER_DEVICE = 10;
      
      if (deviceVoteCount >= MAX_VOTES_PER_DEVICE) {
        return res.status(403).json({ message: "لقد بلغت الحد الأقصى لمرات التسجيل" });
      }

      // إضافة الاسم الجديد
      votes.push({ 
        name, 
        deviceId,
        time: new Date().toISOString() 
      });

      // تحديث البيانات في JSONBin
      const updateRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": API_KEY,
        },
        body: JSON.stringify({ votes }),
      });

      if (!updateRes.ok) {
        throw new Error(`JSONBin API returned ${updateRes.status}`);
      }

      const updatedData = await updateRes.json();
      return res.status(200).json(updatedData);

    } catch (error) {
      console.error("Error updating data:", error);
      return res.status(500).json({ message: "Error updating data", error: error.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}