# lib/screens/auth/login_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // ========================================
  // Form Controllers
  // ========================================
  late TextEditingController emailController;
  late TextEditingController passwordController;
  
  // ========================================
  // State Variables
  // ========================================
  String selectedRole = 'student'; // student, staff, public
  bool obscurePassword = true;
  bool isLoading = false;
  String? errorMessage;
  
  final _formKey = GlobalKey<FormState>();
  
  @override
  void initState() {
    super.initState();
    emailController = TextEditingController();
    passwordController = TextEditingController();
  }
  
  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }
  
  // ========================================
  // Validators
  // ========================================
  String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    
    // ✅ Student: must end with @up.ac.th
    if (selectedRole == 'student') {
      if (!value.endsWith('@up.ac.th')) {
        return 'Please use your @up.ac.th email';
      }
    } else if (selectedRole == 'staff') {
      if (!value.endsWith('@up.ac.th')) {
        return 'Please use your @up.ac.th email';
      }
    }
    
    if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(value)) {
      return 'Enter a valid email';
    }
    return null;
  }
  
  String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }
  
  // ========================================
  // Login Handler
  // ========================================
  Future<void> handleLogin() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      isLoading = true;
      errorMessage = null;
    });
    
    try {
      // ✅ ส่ง Request ไปยัง Backend
      // const String apiUrl = 'http://192.168.1.100:8000/api/v1/auth/login';
      
      // ฟอร์ม Request
      final loginData = {
        'email': emailController.text.trim(),
        'password': passwordController.text,
        'role': selectedRole,
      };
      
      // 🔐 เรียก API
      // final response = await http.post(
      //   Uri.parse(apiUrl),
      //   headers: {'Content-Type': 'application/json'},
      //   body: jsonEncode(loginData),
      // );
      
      // ⚠️ Demo: Simulate successful login
      await Future.delayed(Duration(seconds: 2));
      
      if (mounted) {
        // ✅ บันทึก Token ลง Local Storage
        // await storage.write(key: 'jwt_token', value: token);
        
        // 🎯 นำทางไปหน้า Home
        Navigator.of(context).pushReplacementNamed('/home');
        
        // ✅ แสดง Success Message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Welcome back!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      setState(() {
        errorMessage = 'Login failed: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    
    return Scaffold(
      backgroundColor: Color(0xFFF8F9FA),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(24),
          child: Column(
            children: [
              // ========================================
              // Header: Logo & Title
              // ========================================
              SizedBox(height: 32),
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Color(0xFF6C63FF),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    Icons.forum_outlined,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
              SizedBox(height: 20),
              Text(
                'University\nSocial Listening',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2C3E50),
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Share. Listen. Improve.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF7F8C8D),
                  fontStyle: FontStyle.italic,
                ),
              ),
              
              SizedBox(height: 40),
              
              // ========================================
              // Role Selection: Tabs (Student/Staff/Public)
              // ========================================
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Color(0xFFE0E0E0)),
                ),
                child: Row(
                  children: [
                    _buildRoleTab('Student', 'student'),
                    _buildRoleTab('Staff', 'staff'),
                    _buildRoleTab('Public', 'public'),
                  ],
                ),
              ),
              
              SizedBox(height: 32),
              
              // ========================================
              // Form: Email & Password
              // ========================================
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    // Email Field
                    TextFormField(
                      controller: emailController,
                      validator: validateEmail,
                      decoration: InputDecoration(
                        hintText: selectedRole == 'public'
                            ? 'Enter your phone number'
                            : 'your@up.ac.th',
                        labelText: selectedRole == 'public'
                            ? 'Phone Number'
                            : 'Email',
                        prefixIcon: Icon(
                          selectedRole == 'public' ? Icons.phone : Icons.email,
                          color: Color(0xFF6C63FF),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Color(0xFFE0E0E0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Color(0xFF6C63FF),
                            width: 2,
                          ),
                        ),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: EdgeInsets.all(16),
                      ),
                    ),
                    
                    SizedBox(height: 16),
                    
                    // Password Field
                    TextFormField(
                      controller: passwordController,
                      validator: validatePassword,
                      obscureText: obscurePassword,
                      decoration: InputDecoration(
                        hintText: 'Enter your password',
                        labelText: 'Password',
                        prefixIcon: Icon(
                          Icons.lock,
                          color: Color(0xFF6C63FF),
                        ),
                        suffixIcon: IconButton(
                          icon: Icon(
                            obscurePassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                            color: Color(0xFF7F8C8D),
                          ),
                          onPressed: () {
                            setState(() {
                              obscurePassword = !obscurePassword;
                            });
                          },
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Color(0xFFE0E0E0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Color(0xFF6C63FF),
                            width: 2,
                          ),
                        ),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: EdgeInsets.all(16),
                      ),
                    ),
                  ],
                ),
              ),
              
              // ========================================
              // Error Message
              // ========================================
              if (errorMessage != null) ...[
                SizedBox(height: 16),
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Color(0xFFFF4757)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Color(0xFFFF4757)),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          errorMessage!,
                          style: TextStyle(
                            color: Color(0xFFFF4757),
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              
              SizedBox(height: 24),
              
              // ========================================
              // Login Button
              // ========================================
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: isLoading ? null : handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Color(0xFF6C63FF),
                    disabledBackgroundColor: Color(0xFFBDBDBD),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: isLoading
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                            strokeWidth: 3,
                          ),
                        )
                      : Text(
                          'Login',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              
              SizedBox(height: 16),
              
              // ========================================
              // Divider with "or"
              // ========================================
              Row(
                children: [
                  Expanded(child: Divider(color: Color(0xFFE0E0E0))),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'or',
                      style: TextStyle(
                        color: Color(0xFF7F8C8D),
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: Color(0xFFE0E0E0))),
                ],
              ),
              
              SizedBox(height: 16),
              
              // ========================================
              // Register Link
              // ========================================
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Don't have an account? ",
                    style: TextStyle(color: Color(0xFF7F8C8D)),
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.of(context).pushNamed('/register/$selectedRole');
                    },
                    child: Text(
                      'Sign Up',
                      style: TextStyle(
                        color: Color(0xFF6C63FF),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  // ========================================
  // Role Tab Widget
  // ========================================
  Widget _buildRoleTab(String label, String value) {
    final isSelected = selectedRole == value;
    
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            selectedRole = value;
            errorMessage = null; // Clear error when changing role
          });
        },
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Color(0xFF6C63FF) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Color(0xFF7F8C8D),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ========================================
// Models for Type Safety
// ========================================
class LoginRequest {
  final String email;
  final String password;
  final String role;
  
  LoginRequest({
    required this.email,
    required this.password,
    required this.role,
  });
  
  Map<String, dynamic> toJson() => {
    'email': email,
    'password': password,
    'role': role,
  };
}

class LoginResponse {
  final String token;
  final String userId;
  final String role;
  final String message;
  
  LoginResponse({
    required this.token,
    required this.userId,
    required this.role,
    required this.message,
  });
  
  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['data']['token'] ?? '',
      userId: json['data']['user_id'].toString(),
      role: json['data']['role'] ?? '',
      message: json['message'] ?? 'Login successful',
    );
  }
}
