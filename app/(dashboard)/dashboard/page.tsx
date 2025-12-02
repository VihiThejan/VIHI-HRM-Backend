import { BarChart3, Users, Calendar, DollarSign, Target, Clock } from "lucide-react";
import Link from "next/link";

const stats = [
  { name: "Total Employees", value: "124", icon: Users, color: "bg-blue-500" },
  { name: "Active Leaves", value: "8", icon: Calendar, color: "bg-green-500" },
  { name: "Pending Payroll", value: "3", icon: DollarSign, color: "bg-yellow-500" },
  { name: "Performance Reviews", value: "12", icon: Target, color: "bg-purple-500" },
];

const modules = [
  { name: "Employees", href: "/dashboard/employees", icon: Users, color: "bg-blue-500" },
  { name: "Recruitment", href: "/dashboard/recruitment", icon: BarChart3, color: "bg-green-500" },
  { name: "Leaves", href: "/dashboard/leaves", icon: Calendar, color: "bg-yellow-500" },
  { name: "Attendance", href: "/dashboard/attendance", icon: Clock, color: "bg-orange-500" },
  { name: "Payroll", href: "/dashboard/payroll", icon: DollarSign, color: "bg-red-500" },
  { name: "Performance", href: "/dashboard/performance", icon: Target, color: "bg-purple-500" },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Modules */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 transition-colors group"
            >
              <div className="flex items-center space-x-4">
                <div className={`${module.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{module.name}</h3>
                  <p className="text-sm text-gray-600">Manage {module.name.toLowerCase()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
