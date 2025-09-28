@echo off
echo 🌉 SAN JOSE PROPERTY IMPORT
echo ============================
echo.
echo This will import hundreds of residential properties across San Jose
echo using OpenStreetMap data, similar to how Cupertino was populated.
echo.
echo Areas to be imported:
echo - Downtown San Jose
echo - Willow Glen  
echo - Almaden
echo - East San Jose
echo - North San Jose
echo.
pause
echo.
echo 🚀 Starting import...
npx ts-node scripts/importSanJoseArea.ts
echo.
echo ✅ Import complete! Check your app for new San Jose pins.
pause
