// src/app/api/webhook/stripe/route.ts

import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  // 直接使用 req.headers（Web 標準，無需 await headers()）
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const {
      userId,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingMethod,
      preferredTime,
      shippingFee,
    } = session.metadata!;

    // 再次確認付款成功 + 金額正確（防竄改）
    if (session.payment_status !== "paid") {
      return new Response("OK", { status: 200 });
    }

    // 建立訂單
    const cart = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      return new Response("Cart not found", { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          userId,
          total: session.amount_total!, // Stripe 回傳的「分」
          status: "paid",
          shippingName,
          shippingPhone,
          shippingAddress,
          shippingMethod,
          preferredDeliveryTime: preferredTime === "不限" ? null : preferredTime,
          shippingFee: parseInt(shippingFee),
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              title: i.product.title || "",
              image: i.product.img,
              size: i.unit,
              price: parseInt(i.product.price || "0"),
              quantity: i.quantity,
            })),
          },
        },
      });

      // 清空購物車
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// 必須關閉 bodyParser，讓 Stripe 能取得 raw body 驗證簽名
export const config = {
  api: {
    bodyParser: false,
  },
};