@echo off
echo 🌉 SAN MATEO COUNTY COMPREHENSIVE IMPORT
echo ========================================
echo.
echo This will import properties across the ENTIRE San Mateo County!
echo.
echo 🏙️ Cities included:
echo   • Redwood City      • Palo Alto         • San Mateo
echo   • Burlingame        • Foster City       • Belmont
echo   • San Carlos        • Menlo Park        • Atherton
echo   • Daly City         • South SF          • Pacifica
echo   • Half Moon Bay     • Woodside          • Portola Valley
echo   • And more Peninsula communities!
echo.
echo 📊 Expected results:
echo   • 40,000 - 80,000+ properties
echo   • Complete Peninsula coverage
echo   • Bridge between SF and Santa Clara County
echo.
echo ⏱️ Estimated time: 2-3 hours (depends on API speed)
echo.
echo ✅ PAUSE-FRIENDLY: You can safely Ctrl+C anytime without losing progress!
echo    Each completed area is permanently saved to your database.
echo.
echo 🌟 SMART RESUME: Areas with existing coverage will be automatically skipped.
echo.
pause
echo.
echo 🚀 Starting San Mateo County import...
echo Please be patient - this will complete your Bay Area coverage!
echo.
npx ts-node scripts/importSanMateoCounty.ts
echo.
echo 🎉 San Mateo County import complete! 
echo Check your app - you should see pins across the entire Peninsula!
pause
