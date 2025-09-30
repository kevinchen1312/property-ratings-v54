@echo off
echo 🌉 ALAMEDA COUNTY COMPREHENSIVE IMPORT
echo ====================================
echo.
echo This will import properties across the ENTIRE Alameda County!
echo.
echo 🏙️ Cities included:
echo   • Oakland (all areas)  • Berkeley         • Fremont
echo   • Hayward             • San Leandro      • Alameda Island
echo   • Dublin              • Pleasanton       • Livermore
echo   • Castro Valley       • Union City       • Newark
echo   • Emeryville          • Piedmont         • San Lorenzo
echo   • And more East Bay areas!
echo.
echo 📊 Expected results:
echo   • 50,000 - 100,000+ properties
echo   • Complete East Bay coverage  
echo   • Bay Area-scale database expansion
echo.
echo ⏱️ Estimated time: 2-4 hours (depends on API speed)
echo.
echo ✅ PAUSE-FRIENDLY: You can safely Ctrl+C anytime without losing progress!
echo    Each completed area is permanently saved to your database.
echo.
pause
echo.
echo 🚀 Starting Alameda County import...
echo Please be patient - this will add massive East Bay coverage!
echo.
npx ts-node scripts/importAlamedaCounty.ts
echo.
echo 🎉 Alameda County import complete! 
echo Check your app - you should see pins EVERYWHERE across the East Bay!
pause
