
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Users, Bell, BarChart3, Shield, Smartphone } from "lucide-react";
import { useNavigate } from 'react-router-dom';

// Inside your component

const Landing = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const navigate = useNavigate();


  const features = [
    {
      icon: <Bell className="h-8 w-8 text-green-600" />,
      title: "Instant Notifications",
      description: "Get SMS and email alerts the moment your results are published"
    },
    {
      icon: <Smartphone className="h-8 w-8 text-blue-600" />,
      title: "Nigerian Phone Support",
      description: "Optimized for all Nigerian mobile networks and number formats"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-green-600" />,
      title: "Performance Analytics",
      description: "Track your academic progress with detailed performance charts"
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Secure & Reliable",
      description: "Your data is protected with enterprise-grade security"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Students Served" },
    { number: "500+", label: "Schools Connected" },
    { number: "99.9%", label: "Uptime Reliability" },
    { number: "24/7", label: "Support Available" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">EduNotify</span>
            </div>
            <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin/login')}
              className="text-gray-700 hover:text-green-600"
            >
              Login
            </Button>
              {/* <Link to="/register">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Register
                </Button>
              </Link> */}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Never Miss Your 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600"> Results</span> Again
                </h1>
                <p className="text-xl text-gray-600 max-w-lg">
                  Get instant SMS and email notifications when your academic results are published. 
                  Designed specifically for Nigerian students and educational institutions.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
                    Get Started Free
                  </Button>
                </Link>
                {/* <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => setIsLoginOpen(true)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 px-8 py-3"
                >
                  Check Results
                </Button> */}
              </div>
              <div className="flex items-center space-x-6 pt-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="text-lg font-semibold">Result Published!</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mathematics</span>
                      <span className="font-bold text-green-600">85%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">English</span>
                      <span className="font-bold text-green-600">92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Physics</span>
                      <span className="font-bold text-blue-600">78%</span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 text-sm">
                      📱 SMS sent to +234-XXX-XXX-XXXX<br/>
                      📧 Email sent to student@email.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Why Choose EduNotify?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built specifically for Nigerian educational institutions with features 
              that matter most to students and administrators.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-gray-50 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              Join thousands of Nigerian students who never miss their results. 
              Registration is free and takes less than 2 minutes.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3">
                Create Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">EduNotify</span>
              </div>
              <p className="text-gray-400">
                Making education more accessible through instant result notifications.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Students</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/register" className="hover:text-white">Register</Link></li>
                <li><a href="#" className="hover:text-white">Check Results</a></li>
                <li><a href="#" className="hover:text-white">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Schools</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Admin Portal</a></li>
                <li><a href="#" className="hover:text-white">Integration Guide</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>📧 support@edunotify.com</li>
                <li>📱 +234-XXX-XXX-XXXX</li>
                <li>🏢 Lagos, Nigeria</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 EduNotify. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Login to Your Account</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Student ID</Label>
                <Input id="email" type="text" placeholder="Enter your email or student ID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  Login
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsLoginOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
              <div className="text-center">
                <Link 
                  to="/register" 
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => setIsLoginOpen(false)}
                >
                  Don't have an account? Register here
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Landing;
