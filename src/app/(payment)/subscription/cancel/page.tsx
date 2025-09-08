import Link from "next/link";
export default function SuccessPage() {
  return (
    <div>
      <h1>Payment unsuccessfull</h1>
      <p>Firse kar jaake</p>
      {/* Redirect to home page */}
      <Link href="/">Home</Link>

     </div>
  );
}