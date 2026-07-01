import 'package:flutter/material.dart';
import 'screens/auth/login_screen.dart';
// 🌟 นำเข้า MainNavigationScreen ที่เราได้สร้างตัว Footer 4 เมนูปุ่มกดไว้
import 'navigation/main_navigation_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'University Social Listening',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFF2B164D), // ปรับสีหลักให้เป็นโทนม่วง UP Purple
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
      ),
      // 🌟 ตั้งค่าให้หน้าแรกสุดวิ่งไปที่หน้า Login เสมอ
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginScreen(),
        
        // 🌟 เปลี่ยนเส้นทาง '/home' ให้วิ่งตรงไปที่ MainNavigationScreen (พร้อมส่ง Role เริ่มต้น = 0 ในฐานะนิสิต)
        // เมื่อผู้ใช้ Login ผ่าน ระบบจะส่ง Role ที่ถูกต้องมาให้อีกครั้งผ่านหน้า Login Screen ครับ
        '/home': (context) => const MainNavigationScreen(roleId: 0),
      },
    );
  }
}