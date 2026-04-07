<div align="center" style="margin-bottom: 16px;">
    <h2>Stundio Mobile</h2>
</div>

<p align="center">
    <a href="https://flutter.dev"><img src="https://img.shields.io/badge/Flutter-%2302569B.svg?style=for-the-badge&logo=Flutter&logoColor=white" alt="Flutter Badge"/></a>
    <a href="https://dart.dev"><img src="https://img.shields.io/badge/Dart-%230175C2.svg?style=for-the-badge&logo=dart&logoColor=white" alt="Dart Badge"/></a>
    <a href="https://developer.android.com/studio"><img src="https://img.shields.io/badge/Android%20Studio-3DDC84.svg?style=for-the-badge&logo=android-studio&logoColor=white" alt="Android Studio"/></a>
</p>

# Table of Contents

* [About](#about)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Running](#running)

# About

**Stundio Mobile** is the mobile application version of the **Stundio** project. 

It is designed to provide a _seamless_ and _fast_ experience on both Android and iOS devices, while keeping the same **minimalistic** design and offline capabilities.

# Prerequisites

To develop, build, and run the mobile application, you will need the following tools:

* **[Flutter SDK](https://docs.flutter.dev/get-started/install)**
* **[Android Studio](https://developer.android.com/studio)** 

# Installation

To set up the development environment, follow these steps:

1. **Flutter SDK**
   Visit the [Flutter installation page](https://docs.flutter.dev/get-started/install), choose your operating system, and follow the instructions to download and extract the SDK. Ensure that the `flutter/bin` directory is added to your system's PATH.

2. **Android Studio**
   Download [Android Studio](https://developer.android.com/studio) from the official website. Run the installer and complete the setup wizard. This will install the necessary Android SDK, Command-line Tools, and Build-Tools required for Android development.

3. **Verify**
   Run the following command in your terminal to see if any remaining dependencies need to be installed:
   ```bash
   flutter doctor
   ```
   Follow the provided instructions to resolve any issues.

# Running

After completing the installation, you can launch the app.

1. Start an Android emulator via **Android Studio**, or connect a physical device.
2. In the `mobile_application` directory, run the app:
   ```bash
   flutter run
   ```
