import Link from "next/link";
export default function SuccessPage() {
  return (
    <div>
      <h1>Payment successful</h1>
      <p>Thank you for your payment.</p>
      {/* Redirect to home page */}
      <Link href="/">Home</Link>

     </div>
  );
}