@echo off
netsh advfirewall firewall delete rule name="CoalERP-5000" >nul 2>&1
netsh advfirewall firewall add rule name="CoalERP-5000" dir=in action=allow protocol=TCP localport=5000
echo.
echo ============================
echo   „ › Õ «·‘»ﬂ…!
echo  «› Õ „‰ «·„Ê»«Ì·:
echo  http://192.168.1.79:5000
echo ============================
pause