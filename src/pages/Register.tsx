
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Eye, EyeOff } from "lucide-react";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentId: "",
    phoneNumber: "",
    department: "",
    level: "",
    password: "",
    confirmPassword: "" 
  });

  const nigeriaCodes = ["+234"];
  
  const levels = ["ND1", "ND2", "HND1", "HND2"];

  const validateNigerianPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const nigerianPhoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
    return nigerianPhoneRegex.test(cleanPhone);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.studentId || !formData.phoneNumber ||
        !formData.department || !formData.level || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!validateNigerianPhone(formData.phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Nigerian phone number (e.g., +234 XXX XXX XXXX)",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Password and confirm password do not match",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    // Here you would typically call your registration API
    console.log("Registration data:", {
      ...formData,
      institution: "Moshood Abiola Polytechnic"
    });
    
    toast({
      title: "Registration Successful!",
      description: "Your account has been created. You can now login.",
    });

    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      studentId: "",
      phoneNumber: "",
      department: "",
      level: "",
      password: "",
      confirmPassword: ""
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      {/* Header */}
      <nav className="bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
              <span className="text-gray-600">Back to Home</span>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">EduNotify</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Registration Form */}
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Create Your Student Account
              </CardTitle>
              <CardDescription className="text-lg">
                Join Moshood Abiola Polytechnic students getting instant result notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="Enter your first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Enter your last name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <div className="flex">
                      <Select defaultValue="+234">
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {nigeriaCodes.map(code => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                        placeholder="801 234 5678"
                        className="flex-1 ml-2"
                        required
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Enter your Nigerian phone number for SMS notifications
                    </p>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Academic Information - Moshood Abiola Polytechnic
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID/Matric Number *</Label>
                    <Input
                      id="studentId"
                      type="text"
                      value={formData.studentId}
                      onChange={(e) => handleInputChange("studentId", e.target.value)}
                      placeholder="e.g., MAPOLY/2021/ND/CS/001"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department/Program *</Label>
                      <Input
                        id="department"
                        type="text"
                        value={formData.department}
                        onChange={(e) => handleInputChange("department", e.target.value)}
                        placeholder="e.g., Computer Science"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level">Current Level *</Label>
                      <Select onValueChange={(value) => handleInputChange("level", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map(level => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Account Security
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        placeholder="Enter a strong password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        placeholder="Confirm your password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                    size="lg"
                  >
                    Create Account
                  </Button>
                  
                  <div className="text-center">
                    <span className="text-gray-600">Already have an account? </span>
                    <Link to="/" className="text-blue-600 hover:underline font-medium">
                      Login here
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
