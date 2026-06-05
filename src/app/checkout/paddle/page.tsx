import Link from "next/link";
import { PaddleCheckoutLauncher } from "@/features/billing/components/paddle-checkout-launcher";

export const dynamic = "force-dynamic";

export default async function PaddleCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ _ptxn?: string | string[]; transactionId?: string | string[] }>;
}) {
  const params = await searchParams;
  const transactionId = readQueryParam(params._ptxn) ?? readQueryParam(params.transactionId);
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? "";
  const environment = process.env.PADDLE_ENV === "sandbox" ? "sandbox" : "live";

  return (
    <main className="checkout-shell">
      <section className="checkout-card">
        <p className="eyebrow">Secure checkout</p>
        <h1>Finish your Dash Dental subscription</h1>
        <p className="blueprint-copy">
          Paddle opens a secure checkout and sends billing events back to Dash Dental.
          Workspace access updates after provider confirmation.
        </p>
        {transactionId && token ? (
          <PaddleCheckoutLauncher
            environment={environment}
            returnUrl="/billing?checkout=success&provider=paddle"
            transactionId={transactionId}
            token={token}
          />
        ) : (
          <div className="compact-alert warning aligned-left">
            <span>
              {transactionId
                ? "Paddle client token is missing. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN in Vercel."
                : "Checkout transaction is missing. Start checkout again from Billing."}
            </span>
          </div>
        )}
        <div className="dashboard-command-actions">
          <Link className="secondary-button" href="/billing?checkout=cancelled&provider=paddle">
            Back to billing
          </Link>
        </div>
      </section>
    </main>
  );
}

function readQueryParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
