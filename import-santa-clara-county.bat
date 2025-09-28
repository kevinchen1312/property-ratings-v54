@echo off
echo 🌟 SANTA CLARA COUNTY COMPREHENSIVE IMPORT
echo ==========================================
echo.
echo This will import properties across the ENTIRE Santa Clara County!
echo.
echo 🏙️ Cities included:
echo   • Palo Alto        • Mountain View    • Sunnyvale
echo   • Cupertino        • Santa Clara      • San Jose (all areas)
echo   • Milpitas         • Los Altos        • Saratoga  
echo   • Campbell         • Los Gatos        • Morgan Hill
echo   • Gilroy           • And more!
echo.
echo 📊 Expected results:
echo   • 50,000 - 100,000+ properties
echo   • Complete South Bay coverage
echo   • Silicon Valley-scale database
echo.
echo ⏱️ Estimated time: 2-4 hours (depends on API speed)
echo.
echo ⚠️ WARNING: This is a MASSIVE import operation!
echo   Make sure you have stable internet and time to let it complete.
echo.
pause
echo.
echo 🚀 Starting county-wide import...
echo Please be patient - this will take a while but will be amazing when done!
echo.
npx ts-node scripts/importSantaClaraCounty.ts
echo.
echo 🎉 County-wide import complete! 
echo Check your app - you should see pins EVERYWHERE across Santa Clara County!
pause
