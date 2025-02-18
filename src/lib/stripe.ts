import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * Create a standard connected account and generate an onboarding link.
 * This is configured for Direct Charges and full Stripe Dashboard access.
 */
export async function createConnectAccount(
  userId: string,
  email: string
): Promise<{ accountId: string; url: string }> {
  // Create a Standard account for the merchant
  const account = await stripe.accounts.create({
    type: "standard",
    email,
    business_type: "individual", // Replace with "company" if applicable
  });

  // (Optional) Save the account.id in your database associated with the userId here

  // Generate an onboarding link for the Standard account
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: "https://yourapp.com/stripe/refresh", // Replace with your actual refresh URL
    return_url: "https://yourapp.com/stripe/return", // Replace with your actual return URL
    type: "account_onboarding",
  });

  return { accountId: account.id, url: accountLink.url };
}
