import Link from "next/link";
export default function SuccessPage() {
  return (
    <div>
      <h1>Payment unsuccessful</h1>
      <p>Forse kar jaake</p>
      {/* Redirect to home page */}
      <Link href="/">Home</Link>

     </div>
  );
}