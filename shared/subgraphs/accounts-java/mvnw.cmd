@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM

@if "%DEBUG%"=="" @echo off
@setlocal enableextensions enabledelayedexpansion

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@REM Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >nul 2>&1
if "%ERRORLEVEL%"=="0" goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%\bin\java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:execute
@REM Setup the command line

set CLASSPATH=%APP_HOME%\.mvn\wrapper\maven-wrapper.jar

@REM Provide a "standardized" way to retrieve the CLI args that will
@REM work with both Windows and non-Windows executions.
if "%OS%"=="Windows_NT" (
    for /f "tokens=*" %%a in ('findstr /b /c:"-" "%APP_HOME%\mvnw.cmd.bat"') do @set MAVEN_CONFIG=%%a
) else (
    set MAVEN_CONFIG=
)

@REM Enter a user input loop if there are no command line arguments
if "%*"=="" (
    echo Usage: %0 [^<goal^> [^<goal2^> ...]]
    goto fail
)

set WRAPPER_JAR=%APP_HOME%\.mvn\wrapper\maven-wrapper.jar
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

set DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar
if "%WRAPPER_JAR%"=="" set WRAPPER_JAR=%USERPROFILE%\.m2\repository\org\apache\maven\wrapper\maven-wrapper\3.2.0\maven-wrapper-3.2.0.jar
if not "%MAVEN_PROJECTBASEDIR%"=="" (
    set DOWNLOAD_URL=file:///%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar
    for /f "tokens=*" %%a in ("%MAVEN_PROJECTBASEDIR%") do set DOWNLOAD_URL=%%a\.mvn\wrapper\maven-wrapper.jar
)

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%DOWNLOAD_URL%', '%WRAPPER_JAR%')"
if "%ERRORLEVEL%"=="0" (
    @REM execute Maven
    "%JAVA_HOME%\bin\java.exe" -classpath "%WRAPPER_JAR%" "-Dmaven.home=%MAVEN_HOME%" "-Dclassworlds.conf=%APP_HOME%\.mvn\wrapper\m2e.properties" "-Dmaven.repo.local=%USERPROFILE%\.m2\repository" %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %%*
) else (
    echo Error downloading Maven wrapper. Please check your internet connection and try again.
    goto fail
)

:fail
exit /b 1
endlocal

:omega
