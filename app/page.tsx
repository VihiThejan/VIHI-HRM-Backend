import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-6xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          VIHI HRM System
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Comprehensive Human Resource Management Solution
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Link 
            href="/auth/login"
            className="p-6 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
          >
            <h2 className="text-2xl font-semibold mb-2">Login →</h2>
            <p className="text-gray-600">Access your account</p>
          </Link>
          
          <Link 
            href="/dashboard"
            className="p-6 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
          >
            <h2 className="text-2xl font-semibold mb-2">Dashboard →</h2>
            <p className="text-gray-600">View your workspace</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
