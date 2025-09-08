export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-12 text-center">Our Features</h1>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Easy Booking</h3>
            <p className="text-gray-600">
              Book home services with just a few clicks. Choose from a wide range of service providers and schedule appointments that work for you.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Verified Providers</h3>
            <p className="text-gray-600">
              All our service providers are thoroughly vetted and verified. You can trust that you're getting quality service from experienced professionals.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Secure Payments</h3>
            <p className="text-gray-600">
              Secure payment processing ensures your transactions are protected. Pay easily online with our trusted payment system.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Real-time Tracking</h3>
            <p className="text-gray-600">
              Track your service requests and bookings in real-time. Get notifications about status updates and completed work.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Quality Assurance</h3>
            <p className="text-gray-600">
              We maintain high standards for all services. Our review system helps ensure consistent quality and customer satisfaction.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Customer Support</h3>
            <p className="text-gray-600">
              Our dedicated support team is here to help. Whether you need help with booking or have questions about services, we're here for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
