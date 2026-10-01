import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const TemperatureChart = ({ temperatureData }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        const ctx = chartRef.current.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: temperatureData.map(data => data.timestamp),
                datasets: [
                    {
                        label: 'Room 1 Temperature',
                        data: temperatureData.map(data => data.room1),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: true,
                    },
                    {
                        label: 'Room 2 Temperature',
                        data: temperatureData.map(data => data.room2),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Temperature (°C)',
                        },
                    },
                },
            },
        });

        return () => {
            chart.destroy();
        };
    }, [temperatureData]);

    return <canvas ref={chartRef} />;
};

export default TemperatureChart;