# Flutter Project Structure
# University Social Listening Platform - Mobile App

## 📁 โครงสร้างโฟลเดอร์ Flutter

```
university_social_app/
│
├── android/              # Android-specific code
├── ios/                  # iOS-specific code
├── lib/
│   ├── main.dart         # Entry point
│   ├── config/
│   │   ├── theme.dart    # Theme & Colors
│   │   ├── routes.dart   # Navigation routes
│   │   └── constants.dart # Constants
│   │
│   ├── services/
│   │   ├── api_service.dart      # HTTP client & API calls
│   │   ├── auth_service.dart     # Authentication logic
│   │   ├── storage_service.dart  # Local storage (SharedPreferences)
│   │   └── location_service.dart # Location/Maps
│   │
│   ├── models/
│   │   ├── user.dart      # User model
│   │   ├── problem.dart   # Problem model
│   │   ├── category.dart  # Category model
│   │   └── response.dart  # API response model
│   │
│   ├── providers/
│   │   ├── auth_provider.dart      # Auth state management
│   │   ├── problem_provider.dart   # Problem state management
│   │   └── user_provider.dart      # User state management
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart              # Login
│   │   │   ├── student_register_screen.dart   # Student registration
│   │   │   ├── staff_register_screen.dart     # Staff registration
│   │   │   └── public_register_screen.dart    # Public registration
│   │   │
│   │   ├── home/
│   │   │   ├── home_screen.dart       # Home/Feed screen
│   │   │   ├── problem_detail_screen.dart
│   │   │   └── search_screen.dart
│   │   │
│   │   ├── problem_posting/
│   │   │   ├── create_problem_screen.dart
│   │   │   ├── select_location_screen.dart
│   │   │   └── image_upload_screen.dart
│   │   │
│   │   ├── profile/
│   │   │   └── profile_screen.dart
│   │   │
│   │   └── admin/ (ถ้ามี Admin role)
│   │       └── dashboard_screen.dart
│   │
│   ├── widgets/
│   │   ├── common/
│   │   │   ├── app_bar.dart
│   │   │   ├── loading_indicator.dart
│   │   │   ├── error_widget.dart
│   │   │   └── snackbar.dart
│   │   │
│   │   ├── auth/
│   │   │   ├── text_input_field.dart
│   │   │   ├── password_input_field.dart
│   │   │   └── login_button.dart
│   │   │
│   │   ├── problem/
│   │   │   ├── problem_card.dart
│   │   │   ├── category_chip.dart
│   │   │   └── problem_filter.dart
│   │   │
│   │   └── map/
│   │       └── simple_map_widget.dart
│   │
│   └── utils/
│       ├── validators.dart     # Email, password, phone validators
│       ├── logger.dart         # Logging
│       ├── date_formatter.dart # Date formatting
│       └── extensions.dart     # String, context extensions
│
├── test/
│   ├── unit/
│   │   ├── services_test.dart
│   │   └── validators_test.dart
│   │
│   └── widget/
│       ├── login_screen_test.dart
│       └── home_screen_test.dart
│
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── icons/
│   │   └── illustrations/
│   │
│   ├── translations/
│   │   ├── en.json
│   │   └── th.json
│   │
│   └── fonts/
│       └── NotoSansThai.ttf
│
├── pubspec.yaml          # Dependencies
├── .env.example          # Environment variables
└── README.md
```

## 📦 pubspec.yaml - Dependencies

```yaml
name: university_social_app
description: University Social Listening Platform - Mobile App
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # HTTP & API
  http: ^1.1.0
  dio: ^5.3.1

  # State Management
  provider: ^6.0.0
  riverpod: ^2.3.0
  flutter_riverpod: ^2.3.0

  # Local Storage
  shared_preferences: ^2.2.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0

  # Authentication & Security
  flutter_secure_storage: ^9.0.0
  jwt_decoder: ^2.0.1

  # UI & Design
  flutter_screenutil: ^5.8.0
  google_fonts: ^6.0.0
  intl: ^0.18.0

  # Location & Maps
  google_maps_flutter: ^2.5.0
  geolocator: ^9.0.2
  geocoding: ^2.0.5

  # Image Processing
  image_picker: ^1.0.0
  permission_handler: ^11.4.3

  # Date & Time
  intl: ^0.18.0

  # Validation
  validators: ^3.0.0

  # Logging
  logger: ^2.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter

  flutter_lints: ^2.0.0
  mockito: ^5.4.0
  build_runner: ^2.4.0

flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/icons/
    - assets/translations/

  fonts:
    - family: NotoSansThai
      fonts:
        - asset: assets/fonts/NotoSansThai.ttf
```

## 🔧 Environment Setup (.env.example)

```
# API Configuration
API_BASE_URL=http://192.168.1.100:8000/api/v1
API_TIMEOUT=30

# Firebase (optional)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_API_KEY=your_api_key

# Maps API
GOOGLE_MAPS_API_KEY=your_maps_api_key

# App Configuration
APP_NAME=University Social Listening
APP_VERSION=1.0.0
ENABLE_LOGGING=true
```

## 🎨 Design Tokens & Colors

```dart
// lib/config/theme.dart

// Primary Colors
const primaryColor = Color(0xFF6C63FF);      // Purple
const accentColor = Color(0xFFFD7B3E);      // Orange
const successColor = Color(0xFF2ED573);     // Green
const warningColor = Color(0xFFFFA500);     // Orange
const dangerColor = Color(0xFFFF4757);      // Red

// Neutral Colors
const backgroundColor = Color(0xFFF8F9FA);
const surfaceColor = Color(0xFFFFFFFF);
const textPrimary = Color(0xFF2C3E50);
const textSecondary = Color(0xFF7F8C8D);
const borderColor = Color(0xFFE0E0E0);

// Spacing
const double paddingXS = 4;
const double paddingSM = 8;
const double paddingMD = 16;
const double paddingLG = 24;
const double paddingXL = 32;

// Border Radius
const double radiusSM = 4;
const double radiusMD = 8;
const double radiusLG = 16;

// Shadow
const BoxShadow defaultShadow = BoxShadow(
  color: Colors.black12,
  blurRadius: 8,
  offset: Offset(0, 4),
);
```
