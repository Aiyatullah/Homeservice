import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  throw new Error("Missing Stripe API key");
}
export const stripe = new Stripe(key);