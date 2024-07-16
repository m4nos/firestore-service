# Firestore Service for Fire Alert

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-14.x-brightgreen)
![Firebase](https://img.shields.io/badge/firebase-9.x-orange)

This repository contains the Firestore service for the Fire Alert application. It includes data fetching from the MODIS/VIIRS API, filtering, and storing wildfire data in Firestore, along with a cron job to delete old data.

## Features

- Fetch wildfire data from the MODIS/VIIRS API
- Filter fetched data based on proximity to existing markers
- Store new wildfire data in Firestore
- Scheduled deletion of markers older than 3 days

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation

To get started with the Firestore service, clone the repository and install the necessary dependencies:

```bash
git clone https://github.com/yourusername/firestore-service.git
cd firestore-service
npm install
```
