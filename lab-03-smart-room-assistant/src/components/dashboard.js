import React, { useEffect, useState } from 'react';
import RoomCard from './roomCard';
import TemperatureChart from './temperatureChart';
import { fetchRoomData, toggleLight } from '../services/api';

const renderDashboard = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRoomData = async () => {
            const data = await fetchRoomData();
            setRooms(data);
            setLoading(false);
        };
        loadRoomData();
    }, []);

    const handleToggleLight = async (roomId) => {
        await toggleLight(roomId);
        const updatedRooms = rooms.map(room => 
            room.id === roomId ? { ...room, light: !room.light } : room
        );
        setRooms(updatedRooms);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard">
            <h1>Smart Room Assistant</h1>
            <div className="room-cards">
                {rooms.map(room => (
                    <RoomCard 
                        key={room.id} 
                        room={room} 
                        onToggleLight={handleToggleLight} 
                    />
                ))}
            </div>
            <TemperatureChart rooms={rooms} />
        </div>
    );
};

export default renderDashboard;