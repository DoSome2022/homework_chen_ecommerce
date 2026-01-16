// src/app/api/checkout/create-session/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import Stripe from "stripe";
import { auth } from "../../../../../auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover", // 最新版本！
});

const shippingOptions = [
  { id: "sf", name: "順豐快遞", fee: 150 },
  { id: "blackcat", name: "黑貓宅急便", fee: 120 },
  { id: "711", name: "7-11 超商取貨", fee: 60 },
  { id: "family", name: "全家超商取貨", fee: 60 },
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id as string;

  const body = await req.json();
  const {
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingMethod,
    preferredTime,
  } = body;

  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return new Response("購物車為空", { status: 400 });
  }

  const shippingFee = shippingOptions.find((o) => o.id === shippingMethod)?.fee || 0;

  const line_items = cart.items.map((item) => ({
    price_data: {
      currency: "twd",
      product_data: {
        name: item.product.title || "未知商品",
        images: item.product.img ? [item.product.img] : [], // 一定有 images
      },
      unit_amount: parseInt(item.product.price || "0") * 100, // 單位：分
    },
    quantity: item.quantity,
  }));

  // 運費另外一筆（必須有 images）
  if (shippingFee > 0) {
    const shippingName = shippingOptions.find(o => o.id === shippingMethod)?.name || "運費";
    line_items.push({
      price_data: {
        currency: "twd",
        product_data: {
          name: `運費 - ${shippingName}`,
          images: [], // 必須給空陣列，不能省略！
        },
        unit_amount: shippingFee * 100,
      },
      quantity: 1,
    });
  }

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items,
    success_url: `${process.env.NEXTAUTH_URL}/user/${userId}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/user/${userId}/checkout`,
    metadata: {
      userId,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingMethod,
      preferredTime: preferredTime || "不限",
      shippingFee: shippingFee.toString(),
    },
  });

  return Response.json({ url: stripeSession.url });
}