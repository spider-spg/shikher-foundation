import crypto from "crypto";
import admin from "firebase-admin";

// 🔹 Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_KEY)
    ),
  });
}

const db = admin.firestore();

// 🔹 Disable body parsing (REQUIRED for Razorpay signature)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const signature = req.headers["x-razorpay-signature"];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      // 🔒 Verify webhook authenticity
      if (signature !== expectedSignature) {
        return res.status(400).send("Invalid signature");
      }

      const payload = JSON.parse(body);

      // ✅ Handle successful payment
      if (payload.event === "payment.captured") {
        const payment = payload.payload.payment.entity;

        const snapshot = await db
          .collection("orders")
          .where("razorpay_order_id", "==", payment.order_id)
          .get();

        snapshot.forEach(doc => {
          doc.ref.update({
            status: "PAID",
            razorpay_payment_id: payment.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      }

      res.status(200).send("OK");
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Webhook error");
  }
}
