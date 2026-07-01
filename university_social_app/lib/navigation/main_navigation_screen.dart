// import 'package:flutter/material.dart';
// import '../screens/home/home_screen.dart';
// import '../screens/problem_posting/create_problem_screen.dart';
// import '../screens/tracking/tracking_screen.dart';
// import '../screens/profile/profile_screen.dart';

// class MainNavigationScreen extends StatefulWidget {
//   final int? roleId; 

//   const MainNavigationScreen({super.key, this.roleId});

//   @override
//   State<MainNavigationScreen> createState() => _MainNavigationScreenState();
// }

// class _MainNavigationScreenState extends State<MainNavigationScreen> {
//   int _currentIndex = 0;
//   late final List<Widget> _pages;

//   @override
//   void initState() {
//     super.initState();
//     final int safeRoleId = widget.roleId ?? 0;

//     _pages = [
//       const HomeScreen(),
//       CreateProblemScreen(roleId: safeRoleId),
//       const TrackingScreen(),
//       ProfileScreen(roleId: safeRoleId), 
//     ];
//   }

//   void _onTapTapped(int index) {
//     setState(() {
//       _currentIndex = index;
//     });
//   }

//   @override
//   Widget build(BuildContext context) {
//     final Color upPurple = const Color(0xFF2B164D);

//     return Scaffold(
//       body: _pages[_currentIndex],
//       bottomNavigationBar: BottomNavigationBar(
//         currentIndex: _currentIndex,
//         onTap: _onTapTapped,
//         type: BottomNavigationBarType.fixed,
//         selectedItemColor: upPurple,
//         unselectedItemColor: Colors.grey,
//         selectedFontSize: 12,
//         unselectedFontSize: 12,
//         backgroundColor: Colors.white,
//         elevation: 10,
//         items: const [
//           BottomNavigationBarItem(
//             icon: Icon(Icons.home_outlined),
//             activeIcon: Icon(Icons.home),
//             label: 'หน้าแรก',
//           ),
//           BottomNavigationBarItem(
//             icon: Icon(Icons.add_circle_outline),
//             activeIcon: Icon(Icons.add_circle),
//             label: 'แจ้งปัญหา',
//           ),
//           BottomNavigationBarItem(
//             icon: Icon(Icons.notifications_outlined),
//             activeIcon: Icon(Icons.notifications),
//             label: 'ติดตามสถานะ',
//           ),
//           BottomNavigationBarItem(
//             icon: Icon(Icons.person_outline),
//             activeIcon: Icon(Icons.person),
//             label: 'ข้อมูลส่วนตัว',
//           ),
//         ],
//       ),
//     );
//   }
// }












import 'package:flutter/material.dart';
import '../screens/home/home_screen.dart';
import '../screens/problem_posting/create_problem_screen.dart';
import '../screens/tracking/tracking_screen.dart';
import '../screens/profile/profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final int? roleId; 

  const MainNavigationScreen({super.key, this.roleId});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    // 🌟 แปลงค่า roleId ให้ปลอดภัย (ถ้าไม่มีค่าจะให้เป็น 0 คือนิสิต)
    final int safeRoleId = widget.roleId ?? 0;

    _pages = [
      // 🌟 แก้ไขตรงนี้: ส่งค่า safeRoleId ไปให้หน้า HomeScreen ด้วย
      HomeScreen(roleId: safeRoleId), 
      CreateProblemScreen(roleId: safeRoleId),
      const TrackingScreen(),
      ProfileScreen(roleId: safeRoleId), 
    ];
  }

  void _onTapTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final Color upPurple = const Color(0xFF2B164D);

    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTapTapped,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: upPurple,
        unselectedItemColor: Colors.grey,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        backgroundColor: Colors.white,
        elevation: 10,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'หน้าแรก',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.add_circle_outline),
            activeIcon: Icon(Icons.add_circle),
            label: 'แจ้งปัญหา',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications_outlined),
            activeIcon: Icon(Icons.notifications),
            label: 'ติดตามสถานะ',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'ข้อมูลส่วนตัว',
          ),
        ],
      ),
    );
  }
}