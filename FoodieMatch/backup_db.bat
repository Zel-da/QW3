@echo off
set PGPASSWORD=soosan2025!
"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d foodiematch_db -F c -f backup_db_cloud_deploy.dump
echo Backup completed!
