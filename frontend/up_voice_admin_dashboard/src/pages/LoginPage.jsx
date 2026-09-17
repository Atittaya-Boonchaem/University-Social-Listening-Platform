import React from 'react';

export default function LoginPage() {
  return (
    <div className="login-body-bg flex flex-col min-h-screen text-on-background font-body-md">
      {/* TopNavBar */}
      <nav className="sticky top-0 z-50 bg-background/80 dark:bg-background/80 backdrop-blur-xl border-b border-outline-variant/30 w-full">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
          <div className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">UP Connect</div>
          <div className="flex gap-gutter items-center">
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Support</a>
            <a className="font-body-md text-body-md text-primary font-semibold border-b-2 border-primary pb-1 active:scale-95 transition-transform" href="#">Sign Up</a>
          </div>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg relative overflow-hidden">
        {/* Background Atmospheric Element */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-fixed opacity-20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-fixed opacity-20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="w-full max-w-[480px] relative z-10">
          
          {/* Header Section */}
          <div className="text-center mb-stack-lg">
            <div className="mb-4 inline-flex items-center justify-center p-3 bg-primary-fixed rounded-xl text-primary">
              <span className="material-symbols-outlined text-[32px]">school</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary mb-2">ยินดีต้อนรับเข้าสู่ระบบ</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">สำหรับนักศึกษาใหม่และบุคลากร University Portal Connect</p>
          </div>

          {/* Login Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/50 p-8 md:p-10 rounded-xl login-card-shadow transition-all hover:border-primary/30">
            <div className="space-y-stack-md">
              {/* SSO Primary Action */}
              <button className="w-full py-4 px-6 bg-primary-container text-white rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-[0.98] shadow-lg shadow-primary/10">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                Login with SSO / Office 365
              </button>
              
              <div className="flex items-center gap-4 py-2">
                <div className="flex-grow h-[1px] bg-outline-variant/50"></div>
                <span className="font-label-sm text-label-sm text-outline">หรือเข้าใช้งานผ่านช่องทางอื่น</span>
                <div className="flex-grow h-[1px] bg-outline-variant/50"></div>
              </div>

              {/* Secondary Login Actions */}
              <div className="grid grid-cols-1 gap-stack-sm">
                <button className="w-full py-4 px-6 border border-outline-variant text-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-low transition-all active:scale-[0.98]">
                  <span className="material-symbols-outlined">person</span>
                  General Login
                </button>
                <button className="w-full py-4 px-6 bg-surface-container-low text-on-surface-variant rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-high transition-all active:scale-[0.98]">
                  <span className="material-symbols-outlined">visibility_off</span>
                  Anonymous Guest
                </button>
              </div>
            </div>

            {/* Assistance Links */}
            <div className="mt-stack-lg pt-stack-md border-t border-outline-variant/30 flex flex-col items-center gap-3">
              <p className="font-body-sm text-body-sm text-on-surface-variant">พบปัญหาในการเข้าสู่ระบบ?</p>
              <div className="flex gap-4">
                <a className="font-label-md text-label-md text-primary hover:underline" href="#">ลืมรหัสผ่าน</a>
                <span className="text-outline-variant">•</span>
                <a className="font-label-md text-label-md text-primary hover:underline" href="#">คู่มือการใช้งาน</a>
              </div>
            </div>
          </div>

          {/* Welcome Illustration/Image Placeholder */}
          <div className="mt-stack-lg overflow-hidden rounded-xl border border-outline-variant/20 h-48 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent z-10"></div>
            <img 
              className="w-full h-full object-cover" 
              data-alt="A cinematic, high-key wide shot of a modern university campus library with glass walls and students collaborating in a clean, minimalist environment. The scene is bathed in soft morning sunlight, emphasizing professional academic rigor and institutional trust. The color palette features whites, soft purples, and deep greys, matching the UP Connect design system." 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqkwj8DfUfIlW1tJ8TC2H1T0TxLo1WW_tKn5hRRJ4abvwi6xr1R9nu1Q4yhCytCDGQXBZo4AgJ-LSwMsmb2JRqnFWJwbuP0D-X_matnIw_b3e9qVszfZxUP0pgAclmG0-NDFyB711YqJrFelWAqZupDz5a3YxCsQqkBWYU4RUuzpmmDDI0UnrnPpb85sw_OcTKroHuOuTByzhnQF73HStYjmW57pA4dP5aZemzztVclr8DdERAulXaDIOudqTCujzkI4MoScY-aACJ"
              alt="Welcome Illustration"
            />
            <div className="absolute bottom-4 left-6 z-20">
              <p className="text-white font-label-md text-label-md">ก้าวสู่ความสำเร็จที่ University Portal</p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-surface-container-lowest border-t border-outline-variant w-full">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop py-stack-md max-w-container-max mx-auto gap-4">
          <div className="font-headline-md text-headline-md text-primary">UP Connect</div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Privacy Policy</a>
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Terms of Service</a>
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Help Center</a>
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Accessibility</a>
          </div>
          <div className="font-label-sm text-label-sm text-secondary dark:text-secondary-fixed-dim opacity-80">
            © 2024 University Portal Connect. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
