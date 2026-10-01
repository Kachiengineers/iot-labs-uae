# Smart Room Assistant

## Overview
The Smart Room Assistant is a web application that provides a user-friendly interface for monitoring and controlling the lighting and temperature of two rooms. The application features a dashboard that displays real-time data, allowing users to manage their smart rooms efficiently.

## Features
- **Dashboard View**: Displays the current temperature and light status for two rooms.
- **Light Control**: Buttons to toggle the lights on and off for each room.
- **Temperature Trend Visualization**: A line chart that visualizes temperature trends over time using Chart.js.
- **Responsive Design**: The interface is designed to be visually appealing and user-friendly on various devices.

## Project Structure
```
lab-03-smart-room-assistant
├── src
│   ├── components
│   │   ├── dashboard.js
│   │   ├── roomCard.js
│   │   └── temperatureChart.js
│   ├── services
│   │   └── api.js
│   ├── styles
│   │   └── main.css
│   └── main.js
├── index.html
├── package.json
└── README.md
```

## Setup Instructions
1. **Clone the Repository**: 
   ```bash
   git clone <repository-url>
   cd lab-03-smart-room-assistant
   ```

2. **Install Dependencies**: 
   Make sure you have Node.js installed. Then run:
   ```bash
   npm install
   ```

3. **Run the Application**: 
   Start the application using:
   ```bash
   npm start
   ```

4. **Open in Browser**: 
   Navigate to `http://localhost:3000` (or the specified port) to view the application.

## Usage
- Use the dashboard to monitor the temperature and light status of each room.
- Click the light control buttons to toggle the lights on or off.
- View the temperature trend chart to analyze temperature changes over time.

## Technologies Used
- **HTML/CSS**: For structuring and styling the application.
- **JavaScript**: For dynamic functionality and API interactions.
- **Chart.js**: For visualizing temperature trends.
- **Fetch API**: For making asynchronous requests to the backend.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.