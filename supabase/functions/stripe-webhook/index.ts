import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook verified", { type: event.type });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMsg });
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Processing subscription event", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        
        if (!email) {
          logStep("No email found for customer");
          break;
        }

        // Find user by email
        const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
        if (userError) throw userError;
        
        const user = users.users.find(u => u.email === email);
        if (!user) {
          logStep("User not found", { email });
          break;
        }

        // Get Stripe product ID
        const stripeProductId = subscription.items.data[0].price.product as string;
        
        // Find matching subscription package
        const { data: packageData, error: packageError } = await supabaseClient
          .from("subscription_packages_private")
          .select("id")
          .eq("stripe_product_id", stripeProductId)
          .maybeSingle();

        const packageId = packageData?.id || null;
        
        if (!packageId) {
          logStep("Warning: No matching package found for stripe product", { stripeProductId });
        }

        // Update profile
        const isActive = subscription.status === "active";
        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

        const updateData: any = {
          subscription_active: isActive,
          subscription_end_date: isActive ? subscriptionEnd : null,
          trial_days: isActive ? 0 : undefined,
        };

        // If package found, link it to profile
        if (packageId) {
          updateData.package_id = packageId;
          updateData.package_start_date = new Date().toISOString();
        }

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update(updateData)
          .eq("id", user.id);

        if (updateError) throw updateError;
        
        logStep("Profile updated", { 
          userId: user.id, 
          active: isActive,
          stripeProductId,
          packageId
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Processing subscription deletion", { 
          subscriptionId: subscription.id 
        });

        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        
        if (!email) break;

        const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
        if (userError) throw userError;
        
        const user = users.users.find(u => u.email === email);
        if (!user) break;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_active: false,
            subscription_end_date: null,
          })
          .eq("id", user.id);

        if (updateError) throw updateError;
        
        logStep("Subscription cancelled in profile", { userId: user.id });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { 
          invoiceId: invoice.id,
          amount: invoice.amount_paid 
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { 
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count 
        });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook handler", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
});
